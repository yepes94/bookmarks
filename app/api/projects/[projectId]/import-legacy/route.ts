import { prisma } from "@/lib/db"
import { saints } from "@/lib/saints-data"
import {
  normalizeRecordOfStrings,
  normalizeRecordOfStringArrays,
  normalizeStringArray,
} from "@/lib/image-state-normalize"

const LEGACY_USER_ID = "local"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const legacyState = await prisma.imageState.findUnique({
    where: { userId: LEGACY_USER_ID },
  })

  if (!legacyState) {
    return Response.json({ customImages: 0, gallery: 0, backgroundPool: 0, message: "No hay datos previos" })
  }

  const projectItems = await prisma.projectItem.findMany({
    where: { projectId },
  })

  type Item = { id: string; title: string }
  const itemByTitle = new Map<string, Item>(
    projectItems.map((item: Item) => [item.title.trim().toLowerCase(), item])
  )

  const saintIdToItemId = new Map<string, string>()
  for (const saint of saints) {
    const item = itemByTitle.get(saint.name.trim().toLowerCase())
    if (item) saintIdToItemId.set(saint.id, item.id)
  }

  let oldCustomImages: Record<string, string> = {}
  let oldGallery: Record<string, string[]> = {}
  let oldBackgroundPool: string[] = []

  try {
    oldCustomImages = normalizeRecordOfStrings(JSON.parse(legacyState.customImagesJson) as unknown)
  } catch {
    oldCustomImages = {}
  }
  try {
    oldGallery = normalizeRecordOfStringArrays(JSON.parse(legacyState.galleryJson) as unknown)
  } catch {
    oldGallery = {}
  }
  try {
    oldBackgroundPool = normalizeStringArray(JSON.parse(legacyState.backgroundPoolJson) as unknown)
  } catch {
    oldBackgroundPool = []
  }

  const newCustomImages: Record<string, string> = {}
  for (const [oldKey, dataUrl] of Object.entries(oldCustomImages)) {
    const itemId = saintIdToItemId.get(oldKey)
    if (itemId) newCustomImages[itemId] = dataUrl
  }

  const newGallery: Record<string, string[]> = {}
  for (const [oldKey, urls] of Object.entries(oldGallery)) {
    const itemId = saintIdToItemId.get(oldKey)
    if (itemId && Array.isArray(urls)) newGallery[itemId] = urls.filter((u): u is string => typeof u === "string")
  }

  const existingState = await prisma.projectState.findUnique({
    where: { projectId },
  })

  let mergedCustomImages = { ...newCustomImages }
  let mergedGallery = { ...newGallery }
  let mergedBackgroundPool = [...oldBackgroundPool]

  if (existingState) {
    try {
      const existingCustom = normalizeRecordOfStrings(JSON.parse(existingState.customImagesJson) as unknown)
      mergedCustomImages = { ...existingCustom, ...newCustomImages }
    } catch {
      /* keep new only */
    }
    try {
      const existingGallery = normalizeRecordOfStringArrays(JSON.parse(existingState.galleryJson) as unknown)
      mergedGallery = { ...existingGallery, ...newGallery }
    } catch {
      /* keep new only */
    }
    try {
      const existingPool = normalizeStringArray(JSON.parse(existingState.backgroundPoolJson) as unknown)
      const seen = new Set(existingPool)
      const added = oldBackgroundPool.filter((u) => {
        if (seen.has(u)) return false
        seen.add(u)
        return true
      })
      mergedBackgroundPool = [...existingPool, ...added]
    } catch {
      mergedBackgroundPool = oldBackgroundPool.length > 0 ? oldBackgroundPool : mergedBackgroundPool
    }
  }

  await prisma.projectState.upsert({
    where: { projectId },
    create: {
      projectId,
      customImagesJson: JSON.stringify(mergedCustomImages),
      galleryJson: JSON.stringify(mergedGallery),
      backgroundPoolJson: JSON.stringify(mergedBackgroundPool),
    },
    update: {
      customImagesJson: JSON.stringify(mergedCustomImages),
      galleryJson: JSON.stringify(mergedGallery),
      backgroundPoolJson: JSON.stringify(mergedBackgroundPool),
    },
  })

  return Response.json({
    customImages: Object.keys(mergedCustomImages).length,
    gallery: Object.values(mergedGallery).reduce((s, a) => s + a.length, 0),
    backgroundPool: mergedBackgroundPool.length,
    mapped: saintIdToItemId.size,
    totalItems: projectItems.length,
  })
}
