export type NormalizedImageState = {
  customImages: Record<string, string>
  gallery: Record<string, string[]>
  backgroundPool: string[]
}

type ImageStatePayload = {
  customImages?: unknown
  gallery?: unknown
  backgroundPool?: unknown
}

export function normalizeRecordOfStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {}
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof k === "string" && typeof v === "string") {
      result[k] = v
    }
  }
  return result
}

export function normalizeRecordOfStringArrays(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {}
  const result: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue
    const arr: string[] = []
    for (const item of v) {
      if (typeof item === "string") arr.push(item)
    }
    if (arr.length > 0) {
      result[k] = arr
    }
  }
  return result
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const result: string[] = []
  for (const item of value) {
    if (typeof item === "string") {
      result.push(item)
    }
  }
  return result
}

export function normalizePayload(body: unknown): NormalizedImageState | null {
  if (!body || typeof body !== "object") return null
  const { customImages, gallery, backgroundPool } = body as ImageStatePayload

  const normalized: NormalizedImageState = {
    customImages: normalizeRecordOfStrings(customImages),
    gallery: normalizeRecordOfStringArrays(gallery),
    backgroundPool: normalizeStringArray(backgroundPool),
  }

  return normalized
}

