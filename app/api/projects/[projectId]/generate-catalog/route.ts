import { generateObject } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import { prisma } from "@/lib/db"

export const maxDuration = 120

const CatalogItemSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string(),
  tagline: z.string().optional(),
})

const CatalogSchema = z.object({
  items: z.array(CatalogItemSchema),
})

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

  const b = body as { topic?: unknown; count?: unknown; apiKey?: unknown; model?: unknown }
  const topic = typeof b.topic === "string" ? b.topic.trim() : ""
  const count = typeof b.count === "number" ? Math.min(Math.max(b.count, 1), 50) : 10

  if (!topic) {
    return Response.json({ error: "Topic is required" }, { status: 400 })
  }

  const apiKey = (typeof b.apiKey === "string" ? b.apiKey : null) ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return Response.json({ error: "API key required", missingApiKey: true }, { status: 401 })
  }

  const model =
    typeof b.model === "string" && b.model.trim()
      ? b.model.trim()
      : "gemini-3.1-flash-lite-preview"

  const google = createGoogleGenerativeAI({ apiKey })
  const typeHint = project.type ?? "general"

  const prompt = `Generate a JSON catalog of ${count} items for a bookmark collection.
Topic: ${topic}
Type hint: ${typeHint}

For each item provide:
- title: main display name (e.g. "San Francisco de Asis")
- subtitle: short secondary info (e.g. "4 DE OCTUBRE" or "Italia")
- description: 1-2 sentences for the back of the bookmark
- tagline: short phrase or quote (optional)

Return only valid JSON with an "items" array. No markdown.`

  try {
    const result = await generateObject({
      model: google(model),
      schema: CatalogSchema,
      prompt,
    })

    const items = result.object.items
    if (!items?.length) {
      return Response.json({ error: "No items generated" }, { status: 500 })
    }

    const created = await Promise.all(
      items.map((item) =>
        prisma.projectItem.create({
          data: {
            projectId,
            title: item.title,
            subtitle: item.subtitle ?? null,
            description: item.description,
            tagline: item.tagline ?? null,
          },
        })
      )
    )

    return Response.json({
      items: created.map((i) => ({
        id: i.id,
        title: i.title,
        subtitle: i.subtitle,
        description: i.description,
        tagline: i.tagline,
      })),
      count: created.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Catalog generation error:", message)
    return Response.json(
      { error: `Failed to generate catalog: ${message}` },
      { status: 500 }
    )
  }
}
