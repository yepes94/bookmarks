import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import {
  normalizeRecordOfStrings,
  normalizeRecordOfStringArrays,
  normalizeStringArray,
  normalizePayload,
} from "@/lib/image-state-normalize"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const state = await prisma.projectState.findUnique({
    where: { projectId },
  })

  if (!state) {
    return Response.json({
      customImages: {},
      gallery: {},
      backgroundPool: [],
      template: {},
    })
  }

  let customImages: Record<string, string> = {}
  let gallery: Record<string, string[]> = {}
  let backgroundPool: string[] = []
  let template: Record<string, unknown> = {}

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

  try {
    const parsed = JSON.parse(state.templateJson) as unknown
    template = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    template = {}
  }

  return Response.json({
    customImages,
    gallery,
    backgroundPool,
    template,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const body = (await req.json()) as unknown
  const normalized = normalizePayload(body)

  if (!normalized) {
    return Response.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { customImages, gallery, backgroundPool } = normalized
  const template =
    body && typeof body === "object" && (body as { template?: unknown }).template
      ? JSON.stringify((body as { template: unknown }).template)
      : "{}"

  await prisma.projectState.upsert({
    where: { projectId },
    create: {
      projectId,
      customImagesJson: JSON.stringify(customImages),
      galleryJson: JSON.stringify(gallery),
      backgroundPoolJson: JSON.stringify(backgroundPool),
      templateJson: template,
    },
    update: {
      customImagesJson: JSON.stringify(customImages),
      galleryJson: JSON.stringify(gallery),
      backgroundPoolJson: JSON.stringify(backgroundPool),
      templateJson: template,
    },
  })

  return new Response(null, { status: 204 })
}
