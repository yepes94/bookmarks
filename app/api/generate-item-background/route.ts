import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { getItemVisualDetailsWithDefault } from "@/lib/visual-details"
import sharp from "sharp"

export const maxDuration = 60

const BM_WIDTH = 440
const BM_HEIGHT = 1360

export async function POST(req: Request) {
  const body = (await req.json()) as { apiKey?: unknown; model?: unknown; saintName?: unknown; itemName?: unknown; watercolorColor?: unknown }
  const itemName = typeof body.itemName === "string" ? body.itemName : (body.saintName && typeof body.saintName === "string" ? body.saintName : "")
  const watercolorColor = body.watercolorColor
  const apiKey = body.apiKey
  const model = body.model

  if (!itemName) {
    return Response.json({ error: "Item name is required" }, { status: 400 })
  }

  const resolvedKey = (typeof apiKey === "string" ? apiKey : null) ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!resolvedKey) {
    return Response.json({ error: "API key required", missingApiKey: true }, { status: 401 })
  }

  const google = createGoogleGenerativeAI({ apiKey: resolvedKey })
  const resolvedModel = model || "gemini-2.0-flash-preview-image-generation"

  const details = getItemVisualDetailsWithDefault(itemName)

  const prompt = `Create a decorative background image for a bookmark featuring ${itemName}.

CRITICAL FORMAT REQUIREMENTS:
- The image MUST be exactly ${BM_WIDTH}px wide and ${BM_HEIGHT}px tall (aspect ratio ${BM_WIDTH}:${BM_HEIGHT}, a very tall narrow vertical strip)
- Vertical/portrait orientation — a tall, narrow bookmark shape
- The image MUST be a BACKGROUND ONLY — absolutely NO human figures, NO faces, NO people
- Perfectly SYMMETRICAL design — both horizontal and vertical symmetry
- A CLEAR FRAMED AREA for the central image:
  - Reserve a calm, less-detailed vertical band in the central area where a figure of ${itemName} will later be placed
  - This band should look like a subtle frame, niche or cartouche, but it MUST remain empty (no silhouettes, no shapes)
  - Surround this central band with more decorative elements so the composition feels cohesive

THEME:
- Color palette inspired by ${details.clothing} — use ${details.filigreeColor} tones as accent color
- The watercolor base color should be around ${watercolorColor || "#f5e6c8"}
- Incorporate subtle symbolic motifs related to ${details.identifyingSymbol} as decorative elements (NOT literal depictions, just abstract/geometric interpretations)
- The overall mood should evoke the spirit and character associated with ${itemName}

STYLE:
- Elegant, ornate aesthetic with soft watercolor texture and gentle color washes
- Subtle symbolic motifs woven into decorative borders
- Ornamental patterns inspired by illuminated manuscripts
- ${details.filigreeColor} filigree accents and decorative borders
- Semi-transparent feel — the background should not overpower foreground content
- Beautiful, reverent aesthetic suitable for a bookmark

NEGATIVE CONSTRAINTS:
- Do NOT include any human figures, faces, or body parts
- Do NOT include any text, letters, numbers, inscriptions, banners with words, or typographic elements of any kind
- Do NOT include literal depictions of the subject or their story`

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

    const rawBuffer = Buffer.from(images[0].base64, "base64")
    const resizedBuffer = await sharp(rawBuffer)
      .resize(BM_WIDTH, BM_HEIGHT, { fit: "cover" })
      .png()
      .toBuffer()

    const resizedBase64 = resizedBuffer.toString("base64")

    return Response.json({
      image: `data:image/png;base64,${resizedBase64}`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Background generation error:", message)
    return Response.json(
      { error: `Failed to generate background: ${message}` },
      { status: 500 }
    )
  }
}
