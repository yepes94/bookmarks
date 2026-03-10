import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import {
  normalizeRecordOfStrings,
  normalizeRecordOfStringArrays,
  normalizeStringArray,
  normalizePayload,
} from "@/lib/image-state-normalize"

const LOCAL_USER_ID = "local"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const projectId = searchParams.get("projectId") ?? LOCAL_USER_ID

  const state = await prisma.imageState.findUnique({
    where: { userId: projectId },
  })

  if (!state) {
    return Response.json({
      customImages: {},
      gallery: {},
      backgroundPool: [],
    })
  }

  let customImages: Record<string, string> = {}
  let gallery: Record<string, string[]> = {}
  let backgroundPool: string[] = []

  try {
    const parsed = JSON.parse(state.customImagesJson) as unknown
    customImages = normalizeRecordOfStrings(parsed)
  } catch {
    customImages = {}
  }

  try {
    const parsed = JSON.parse(state.galleryJson) as unknown
    gallery = normalizeRecordOfStringArrays(parsed)
  } catch {
    gallery = {}
  }

  try {
    const parsed = JSON.parse(state.backgroundPoolJson) as unknown
    backgroundPool = normalizeStringArray(parsed)
  } catch {
    backgroundPool = []
  }

  return Response.json({
    customImages,
    gallery,
    backgroundPool,
  })
}

export async function POST(req: Request) {
  const body = (await req.json()) as unknown
  const normalized = normalizePayload(body)

  const projectId =
    (body && typeof body === "object" && typeof (body as { projectId?: unknown }).projectId === "string")
      ? (body as { projectId: string }).projectId
      : LOCAL_USER_ID

  if (!normalized) {
    return Response.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { customImages, gallery, backgroundPool } = normalized

  await prisma.imageState.upsert({
    where: { userId: projectId },
    create: {
      userId: projectId,
      customImagesJson: JSON.stringify(customImages),
      galleryJson: JSON.stringify(gallery),
      backgroundPoolJson: JSON.stringify(backgroundPool),
    },
    update: {
      customImagesJson: JSON.stringify(customImages),
      galleryJson: JSON.stringify(gallery),
      backgroundPoolJson: JSON.stringify(backgroundPool),
    },
  })

  return new Response(null, { status: 204 })
}

