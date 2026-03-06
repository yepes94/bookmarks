import { generateText } from "ai"

export const maxDuration = 60

export async function POST(req: Request) {
  const { saintName, saintDescription } = await req.json()

  if (!saintName) {
    return Response.json({ error: "Saint name is required" }, { status: 400 })
  }

  const stylePrompt = `Create a linocut woodblock print style illustration of ${saintName}. ${saintDescription || ""}

IMPORTANT STYLE REQUIREMENTS:
- Linocut / woodblock print style with precise black outlines
- Flat watercolor color washes in muted, earthy tones
- Golden halo behind the saint's head
- Full body standing figure, centered composition
- Clean white/transparent background with NO background elements
- Religious Catholic holy card art style
- Simple, iconic composition suitable for a bookmark
- The figure should be the ONLY element, no scenery or decorative borders
- Vertical portrait orientation, tall and narrow (suitable for a bookmark)
- Muted color palette: earth tones, deep blues, soft golds, warm browns`

  try {
    const result = await generateText({
      model: "google/gemini-3.1-flash-image-preview",
      prompt: stylePrompt,
    })

    const images: { base64: string; mediaType: string }[] = []
    if (result.files) {
      for (const file of result.files) {
        if (file.mediaType?.startsWith("image/")) {
          images.push({
            base64: file.base64,
            mediaType: file.mediaType,
          })
        }
      }
    }

    if (images.length === 0) {
      return Response.json(
        { error: "No image was generated. Try again." },
        { status: 500 }
      )
    }

    return Response.json({
      image: `data:${images[0].mediaType};base64,${images[0].base64}`,
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
