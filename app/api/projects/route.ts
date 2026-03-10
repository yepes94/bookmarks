import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
    },
  })

  return Response.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type,
      promptTemplate: p.promptTemplate,
      itemCount: p._count.items,
    })),
  })
}

export async function POST(req: Request) {
  const body = (await req.json()) as unknown
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 })
  }

  const name = (body as { name?: unknown }).name
  const type = (body as { type?: unknown }).type

  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 })
  }

  const baseSlug = slugify(name.trim())
  let slug = baseSlug
  let suffix = 0
  while (true) {
    const exists = await prisma.project.findUnique({ where: { slug } })
    if (!exists) break
    suffix++
    slug = `${baseSlug}-${suffix}`
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      slug,
      type: typeof type === "string" ? type : null,
    },
  })

  return Response.json({
    id: project.id,
    name: project.name,
    slug: project.slug,
    type: project.type,
  })
}
