import type { BookmarkItem } from "@/lib/bookmark-item"
import { defaultTemplate, type BookmarkTemplate } from "@/lib/template-config"

export const LIBRARY_NAME = "Biblioteca"
export const LIBRARY_SLUG = "biblioteca"

export const DEFAULT_COLOR_FRONT = "#d4b896"
export const DEFAULT_COLOR_BACK = "#8eaa96"

export type BookmarkDraft = {
  title: string
  subtitle: string
  text: string
  colorFront: string
  colorBack: string
  image: string | null
  background: string | null
  frontGenerated: boolean
  backGenerated: boolean
}

export type StoredBookmark = BookmarkDraft & { id: string }

export type BookmarkRecord = {
  id: string
  title: string
  subtitle?: string | null
  description?: string | null
  extra?: string | null
}

export function emptyDraft(): BookmarkDraft {
  return {
    title: "",
    subtitle: "",
    text: "",
    colorFront: DEFAULT_COLOR_FRONT,
    colorBack: DEFAULT_COLOR_BACK,
    image: null,
    background: null,
    frontGenerated: false,
    backGenerated: false,
  }
}

export function previewTemplateFor(draft: BookmarkDraft): BookmarkTemplate {
  return {
    ...defaultTemplate,
    name: "Clásico",
    layout: "classic",
    showYear: false,
    showPrefix: false,
    showSubtitle: draft.subtitle.trim().length > 0,
    showTagline: false,
    showQuote: false,
    showDescription: true,
    showMetadata: false,
    showDots: true,
    showBackgroundImage: false,
    useSolidBackground: false,
  }
}

export function toPreviewItem(draft: BookmarkDraft, id = "preview"): BookmarkItem {
  const title = draft.title.trim() || "Sin título"
  return {
    id,
    name: title,
    prefix: "",
    displayName: title,
    subtitle: draft.subtitle.trim(),
    tagline: "",
    description: draft.text.trim(),
    metadata: "",
    quote: "",
    colorFront: draft.colorFront,
    colorBack: draft.colorBack,
  }
}

function readExtra(extra: string | null | undefined): Record<string, unknown> {
  if (!extra) return {}
  try {
    const parsed = JSON.parse(extra) as unknown
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function readColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value) ? value : fallback
}

function readImage(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("data:image/") ? value : null
}

export function parseStoredItem(item: BookmarkRecord): StoredBookmark {
  const extra = readExtra(item.extra)
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle ?? "",
    text: item.description ?? "",
    colorFront: readColor(extra.colorFront, DEFAULT_COLOR_FRONT),
    colorBack: readColor(extra.colorBack, DEFAULT_COLOR_BACK),
    image: readImage(extra.image),
    background: readImage(extra.background),
    frontGenerated: extra.frontGenerated === true && readImage(extra.image) !== null,
    backGenerated: extra.backGenerated === true && readImage(extra.background) !== null,
  }
}

export function draftToPayload(draft: BookmarkDraft) {
  return {
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim(),
    description: draft.text.trim(),
    extra: JSON.stringify({
      colorFront: draft.colorFront,
      colorBack: draft.colorBack,
      image: draft.image,
      background: draft.background,
      frontGenerated: draft.frontGenerated,
      backGenerated: draft.backGenerated,
    }),
  }
}

export function snapshotDraft(draft: BookmarkDraft): string {
  return JSON.stringify({
    title: draft.title,
    subtitle: draft.subtitle,
    text: draft.text,
    colorFront: draft.colorFront,
    colorBack: draft.colorBack,
    image: draft.image,
    background: draft.background,
    frontGenerated: draft.frontGenerated,
    backGenerated: draft.backGenerated,
  })
}

export function matchesQuery(bookmark: StoredBookmark, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("es")
  if (!needle) return true
  const haystack = [bookmark.title, bookmark.subtitle, bookmark.text].join(" ").toLocaleLowerCase("es")
  return haystack.includes(needle)
}
