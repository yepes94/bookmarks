import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import sharp from "sharp"

export const maxDuration = 60

const BM_WIDTH = 440
const BM_HEIGHT = 1360

export async function POST(req: Request) {
  const { apiKey, model, userStyle, complexity } = await req.json()

  const resolvedKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!resolvedKey) {
    return Response.json({ error: "API key required", missingApiKey: true }, { status: 401 })
  }

  const google = createGoogleGenerativeAI({ apiKey: resolvedKey })
  const resolvedModel = model || "gemini-2.0-flash-preview-image-generation"
  const resolvedComplexity = complexity || "simple"

  const basePrompt = `Create a decorative background image for a bookmark.

CRITICAL FORMAT REQUIREMENTS:
- The image MUST be exactly ${BM_WIDTH}px wide and ${BM_HEIGHT}px tall (aspect ratio ${BM_WIDTH}:${BM_HEIGHT}, a very tall narrow vertical strip)
- Vertical/portrait orientation — a tall, narrow bookmark shape
- The image MUST be a BACKGROUND ONLY — absolutely NO human figures, NO faces, NO people
- Perfectly SYMMETRICAL design — both horizontal and vertical symmetry
- A CLEAR FRAMED AREA for the central image:
  - Reserve a calm, less-detailed vertical band in the central area where a figure will later be placed
  - This band should read visually like a subtle frame or niche, but WITHOUT any figure inside
  - Surround this central band with more decorative elements so the composition feels intentionally framed
- Text overlay compatibility: ensure the background has varying light and dark areas so text can be read wherever placed

NEGATIVE CONSTRAINTS:
- Do NOT include any text, letters, numbers, inscriptions, banners with words, or typographic elements of any kind`

  const simpleStyle = "STYLE: Clean, minimalist, serene aesthetic. Soft pastel colors, subtle geometric patterns or gradients only."

  const detailedStyle = `STYLE: Elegant, ornate aesthetic. ${userStyle?.trim() || "Soft watercolor texture with gentle color washes, subtle symbolic motifs, decorative borders or ornamental patterns inspired by illuminated manuscripts, muted earthy color palette"}
- Semi-transparent feel — the background should not overpower foreground content
- Beautiful, reverent aesthetic suitable for a bookmark`

  const stylePrompt = basePrompt + "\n\n" + (resolvedComplexity === "simple" ? simpleStyle : detailedStyle)

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

    const rawBuffer = Buffer.from(images[0].base64, "base64")

    const resizedBuffer = await sharp(rawBuffer)
      .resize(BM_WIDTH, BM_HEIGHT, { fit: "cover" })
      .webp({
        quality: 60,
        effort: 6,
      })
      .toBuffer()

    const resizedBase64 = resizedBuffer.toString("base64")
    const sizeBytes = resizedBuffer.byteLength

    return Response.json({
      image: `data:image/webp;base64,${resizedBase64}`,
      sizeBytes,
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
