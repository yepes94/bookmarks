import fs from "node:fs"
import path from "node:path"

export async function POST(req: Request) {
  const { apiKey, model } = await req.json()

  const envPath = path.join(process.cwd(), ".env.local")

  try {
    // Read existing .env.local if it exists
    let content = ""
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf8")
    }

    // Update or add GOOGLE_GENERATIVE_AI_API_KEY
    if (apiKey) {
      if (content.includes("GOOGLE_GENERATIVE_AI_API_KEY=")) {
        content = content.replace(
          /GOOGLE_GENERATIVE_AI_API_KEY=.*/,
          `GOOGLE_GENERATIVE_AI_API_KEY=${apiKey}`
        )
      } else {
        content += `${content && !content.endsWith("\n") ? "\n" : ""}GOOGLE_GENERATIVE_AI_API_KEY=${apiKey}\n`
      }
    }

    // Update or add AI_DEFAULT_MODEL
    if (model) {
      if (content.includes("AI_DEFAULT_MODEL=")) {
        content = content.replace(/AI_DEFAULT_MODEL=.*/, `AI_DEFAULT_MODEL=${model}`)
      } else {
        content += `AI_DEFAULT_MODEL=${model}\n`
      }
    }

    fs.writeFileSync(envPath, content, "utf8")

    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
