import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { buildItemPrompt } from "@/lib/visual-details"

export const maxDuration = 300

interface BatchItemInput {
  itemId?: string
  saintId?: string
  itemName?: string
  saintName?: string
  itemDescription?: string
  saintDescription?: string
}

export async function POST(req: Request) {
  const body = (await req.json()) as { items?: BatchItemInput[]; saints?: BatchItemInput[]; apiKey?: string; model?: string; projectPromptTemplate?: string }
  const rawItems = body.items ?? body.saints ?? []
  const items = rawItems.map((x) => ({
    itemId: x.itemId ?? x.saintId ?? "",
    itemName: x.itemName ?? x.saintName ?? "",
    itemDescription: x.itemDescription ?? x.saintDescription ?? "",
  }))

  if (!items.length || items.some((i) => !i.itemId || !i.itemName)) {
    return Response.json({ error: "At least one item with id and name is required" }, { status: 400 })
  }

  const resolvedKey = (typeof body.apiKey === "string" ? body.apiKey : null) ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!resolvedKey) {
    return Response.json({ error: "API key required", missingApiKey: true }, { status: 401 })
  }

  const google = createGoogleGenerativeAI({ apiKey: resolvedKey })
  const resolvedModel = (typeof body.model === "string" ? body.model : null) ?? "gemini-2.0-flash-preview-image-generation"

  const projTemplate = typeof body.projectPromptTemplate === "string" ? body.projectPromptTemplate : undefined
  const buildPrompt = (name: string, desc?: string) => buildItemPrompt(name, desc, undefined, projTemplate)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const concurrency = 3
      let index = 0

      async function processNext(): Promise<void> {
        const current = index++
        if (current >= items.length) return

        const it = items[current]
        const prompt = buildPrompt(it.itemName, it.itemDescription || undefined)

        try {
          const result = await generateText({
            model: google(resolvedModel),
            prompt,
            providerOptions: {
              google: {
                responseModalities: ["TEXT", "IMAGE"],
              },
            },
          })

          let imageData: string | null = null
          if (result.files) {
            for (const file of result.files) {
              if (file.mediaType?.startsWith("image/")) {
                imageData = `data:${file.mediaType};base64,${file.base64}`
                break
              }
            }
          }

          const event = JSON.stringify({
            type: "result",
            itemId: it.itemId,
            itemName: it.itemName,
            image: imageData,
            error: imageData ? null : "No image generated",
          })
          controller.enqueue(encoder.encode(`data: ${event}\n\n`))
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error"
          const event = JSON.stringify({
            type: "result",
            itemId: it.itemId,
            itemName: it.itemName,
            image: null,
            error: message,
          })
          controller.enqueue(encoder.encode(`data: ${event}\n\n`))
        }

        await processNext()
      }

      const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => processNext())
      await Promise.all(workers)

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
