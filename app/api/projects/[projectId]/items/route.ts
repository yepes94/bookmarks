import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { saintsAsBookmarkItems } from "@/lib/saints-data"
import { bookmarkItemToProjectItemData } from "@/lib/project-items"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const items = await prisma.projectItem.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  })

  return Response.json({
    items: items.map((i) => ({
      id: i.id,
      projectId: i.projectId,
      title: i.title,
      subtitle: i.subtitle,
      description: i.description,
      tagline: i.tagline,
      extra: i.extra,
      imagePath: i.imagePath,
    })),
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
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 })
  }

  const b = body as {
    title?: unknown
    subtitle?: unknown
    description?: unknown
    tagline?: unknown
    extra?: unknown
    seedFromSaints?: unknown
  }

  if (b.seedFromSaints === true && project.type === "santos") {
    const bookmarkItems = saintsAsBookmarkItems()
    const created = await Promise.all(
      bookmarkItems.map((item) => {
        const data = bookmarkItemToProjectItemData(item)
        return prisma.projectItem.create({
          data: {
            projectId,
            title: data.title,
            subtitle: data.subtitle,
            description: data.description,
            tagline: data.tagline,
            extra: data.extra,
          },
        })
      })
    )
    return Response.json({ items: created, seeded: true })
  }

  const title = typeof b.title === "string" ? b.title.trim() : ""
  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 })
  }

  const item = await prisma.projectItem.create({
    data: {
      projectId,
      title,
      subtitle: typeof b.subtitle === "string" ? b.subtitle : null,
      description: typeof b.description === "string" ? b.description : "",
      tagline: typeof b.tagline === "string" ? b.tagline : null,
      extra: typeof b.extra === "string" ? b.extra : null,
    },
  })

  return Response.json({
    id: item.id,
    projectId: item.projectId,
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    tagline: item.tagline,
    extra: item.extra,
  })
}
