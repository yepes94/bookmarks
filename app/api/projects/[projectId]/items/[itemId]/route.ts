import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const { projectId, itemId } = await params

  const item = await prisma.projectItem.findFirst({
    where: { id: itemId, projectId },
  })
  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404 })
  }

  const body = (await req.json()) as unknown
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const update: { title?: string; subtitle?: string; description?: string; tagline?: string; extra?: string } = {}
  if (typeof b.title === "string") update.title = b.title.trim()
  if (typeof b.subtitle === "string") update.subtitle = b.subtitle
  if (typeof b.description === "string") update.description = b.description
  if (typeof b.tagline === "string") update.tagline = b.tagline
  if (typeof b.extra === "string") update.extra = b.extra

  const updated = await prisma.projectItem.update({
    where: { id: itemId },
    data: update,
  })

  return Response.json({
    id: updated.id,
    projectId: updated.projectId,
    title: updated.title,
    subtitle: updated.subtitle,
    description: updated.description,
    tagline: updated.tagline,
    extra: updated.extra,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const { projectId, itemId } = await params

  const item = await prisma.projectItem.findFirst({
    where: { id: itemId, projectId },
  })
  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404 })
  }

  await prisma.projectItem.delete({ where: { id: itemId } })
  return new Response(null, { status: 204 })
}
