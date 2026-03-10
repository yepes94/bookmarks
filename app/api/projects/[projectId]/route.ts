import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  await prisma.project.delete({ where: { id: projectId } })
  return new Response(null, { status: 204 })
}
