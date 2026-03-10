import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { prisma } from "@/lib/db"
import { PLACEHOLDER_NAME, PLACEHOLDER_DESCRIPTION } from "@/lib/visual-details"

export const maxDuration = 30

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const body = (await req.json()) as { apiKey?: unknown }
  const apiKey = (typeof body.apiKey === "string" ? body.apiKey : null) ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return Response.json({ error: "API key required", missingApiKey: true }, { status: 401 })
  }

  const typeLabel = project.type === "animales" ? "animales/mascotas" : project.type === "ciudades" ? "ciudades/lugares" : "tema general"
  const prompt = `You are helping create a prompt template for an AI image generator. A user is making a bookmark collection.

Project name: ${project.name}
Project type: ${typeLabel}

Generate a SHORT prompt template (2-4 sentences max) that will be used to generate illustrations for bookmarks. The template MUST include exactly these placeholders where the subject goes:
- ${PLACEHOLDER_NAME} for the item name (e.g. "Golden Retriever", "Roma")
- ${PLACEHOLDER_DESCRIPTION} for optional context/description

The template should describe the desired illustration style: clean line-art, full-bleed, suitable for a bookmark. It should be generic enough to work for any item in this collection.

Respond with ONLY the template text. No explanation. No markdown. Use the placeholders exactly as shown.`

  try {
    const google = createGoogleGenerativeAI({ apiKey })
    const result = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
    })

    let template = (result.text ?? "").trim()
    if (!template.includes(PLACEHOLDER_NAME)) {
      template = `Create a high-quality line-art illustration of ${PLACEHOLDER_NAME} for a bookmark. ${template}`
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { promptTemplate: template },
    })

    return Response.json({ promptTemplate: template })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Prompt template generation error:", message)
    return Response.json(
      { error: `Failed to generate prompt template: ${message}` },
      { status: 500 }
    )
  }
}
