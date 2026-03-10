import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { buildItemPrompt } from "@/lib/visual-details"

export const maxDuration = 60

export async function POST(req: Request) {
  const body = (await req.json()) as { itemName?: unknown; itemDescription?: unknown; apiKey?: unknown; model?: unknown; customPrompt?: unknown; prompt?: unknown; projectPromptTemplate?: unknown }
  const itemName = typeof body.itemName === "string" ? body.itemName : (body as { saintName?: unknown }).saintName
  const itemDescription = typeof body.itemDescription === "string" ? body.itemDescription : (body as { saintDescription?: unknown }).saintDescription
  const apiKey = body.apiKey
  const model = body.model
  const clientPrompt = typeof body.prompt === "string" ? body.prompt.trim() : null
  const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt.trim() : null

  if (!itemName) {
    return Response.json({ error: "Item name is required" }, { status: 400 })
  }

  const resolvedKey = (typeof apiKey === "string" ? apiKey : null) ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!resolvedKey) {
    return Response.json({ error: "API key required", missingApiKey: true }, { status: 401 })
  }

  const google = createGoogleGenerativeAI({ apiKey: resolvedKey })
  const resolvedModel = (typeof model === "string" ? model : null) ?? "gemini-2.0-flash-preview-image-generation"

  const projTemplate = typeof body.projectPromptTemplate === "string" ? body.projectPromptTemplate : undefined
  const stylePrompt = clientPrompt || customPrompt
    || buildItemPrompt(itemName, typeof itemDescription === "string" ? itemDescription : undefined, undefined, projTemplate)

  try {
    const result = await generateText({
      model: google(resolvedModel),
      prompt: stylePrompt,
      providerOptions: {
        google: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      },
    })

    const images: { base64: string; mediaType: string }[] = []
    if (result.files) {
      for (const file of result.files) {
        if (file.mediaType?.startsWith("image/")) {
          images.push({ base64: file.base64, mediaType: file.mediaType })
        }
      }
    }

    if (images.length === 0) {
      return Response.json(
        { error: "No image was generated. Try again or use a different model." },
        { status: 500 }
      )
    }

    const first = images[0]

    // Try to normalize to WebP at a friendly compression level on the client side.
    // We keep PNG only when the source is PNG (to preserve transparency perfectly)
    // and WebP is not desired.
    const dataUrl = `data:${first.mediaType};base64,${first.base64}`

    return Response.json({
      image: dataUrl,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Image generation error:", message)
    return Response.json(
      { error: `Failed to generate image: ${message}` },
      { status: 500 }
    )
  }
}
