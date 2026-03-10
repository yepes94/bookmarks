export async function POST(req: Request) {
  const { apiKey } = await req.json()
  const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!key) {
    return Response.json({ error: "API key required" }, { status: 401 })
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`
    )

    if (!res.ok) {
      const err = await res.json()
      return Response.json({ error: err.error?.message || "Error fetching models" }, { status: res.status })
    }

    const data = await res.json()

    // Filter to models that support generateContent (image generation capable ones)
    const models: { id: string; displayName: string; supportedMethods: string[] }[] =
      (data.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes("generateContent")
        )
        .map((m: { name: string; displayName: string; supportedGenerationMethods: string[] }) => ({
          id: m.name.replace("models/", ""),
          displayName: m.displayName,
          supportedMethods: m.supportedGenerationMethods,
        }))

    return Response.json({ models })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
