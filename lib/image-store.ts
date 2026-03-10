export async function saveImages(key: string, data: Record<string, string>): Promise<void> {
  if (typeof window === "undefined") return

  const saintId = key

  const entries = Object.values(data)

  await Promise.all(
    entries.map((dataUrl) =>
      fetch("/api/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ saintId, dataUrl }),
        credentials: "include",
      })
    )
  )
}

export async function loadImages(_key: string): Promise<Record<string, string> | null> {
  if (typeof window === "undefined") return null

  const res = await fetch("/api/images", {
    method: "GET",
    credentials: "include",
  })

  if (!res.ok) {
    return null
  }

  const json = (await res.json()) as unknown

  if (!json || typeof json !== "object" || !Array.isArray((json as { images?: unknown }).images)) {
    return null
  }

  const images = (json as { images: { saintId: string; dataUrl: string }[] }).images
  const bySaint: Record<string, string> = {}

  for (const img of images) {
    if (typeof img.saintId === "string" && typeof img.dataUrl === "string") {
      bySaint[img.saintId] = img.dataUrl
    }
  }

  return bySaint
}

export async function deleteImages(_key: string): Promise<void> {
  if (typeof window === "undefined") return
}

