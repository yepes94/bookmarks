import type { BookmarkItem } from "@/lib/bookmark-item"
import type { Saint } from "@/lib/saints-data"

export interface ProjectItemRecord {
  id: string
  projectId: string
  title: string
  subtitle: string | null
  description: string
  tagline: string | null
  extra: string | null
  imagePath: string | null
}

export interface ProjectItemView extends BookmarkItem {
  id: string
}

const DEFAULT_COLOR_FRONT = "#c4b8a0"
const DEFAULT_COLOR_BACK = "#b8a8a0"

export function projectItemToBookmarkItem(item: ProjectItemRecord): ProjectItemView {
  const extra = parseExtra(item.extra)
  return {
    id: item.id,
    name: item.title,
    prefix: extra.title ?? "",
    displayName: extra.displayName ?? item.title.split(" ").pop() ?? item.title,
    subtitle: item.subtitle ?? "",
    tagline: extra.virtue ?? item.tagline ?? "",
    description: item.description,
    metadata: extra.period ?? "",
    quote: item.tagline ?? "",
    image: item.imagePath ?? undefined,
    colorFront: extra.watercolorFront ?? DEFAULT_COLOR_FRONT,
    colorBack: extra.watercolorBack ?? DEFAULT_COLOR_BACK,
  }
}

function parseExtra(extra: string | null): Record<string, string> {
  if (!extra) return {}
  try {
    const parsed = JSON.parse(extra) as unknown
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function bookmarkItemToProjectItemData(item: BookmarkItem): {
  title: string
  subtitle: string
  description: string
  tagline: string
  extra: string
} {
  return {
    title: item.name,
    subtitle: item.subtitle,
    description: item.description,
    tagline: item.quote,
    extra: JSON.stringify({
      title: item.prefix,
      displayName: item.displayName,
      virtue: item.tagline,
      period: item.metadata,
      watercolorFront: item.colorFront,
      watercolorBack: item.colorBack,
    }),
  }
}

export function saintToProjectItemData(saint: Saint): {
  title: string
  subtitle: string
  description: string
  tagline: string
  extra: string
} {
  return bookmarkItemToProjectItemData({
    id: saint.id,
    name: saint.name,
    prefix: saint.title,
    displayName: saint.displayName,
    subtitle: saint.feastDay,
    tagline: saint.virtue,
    description: saint.description,
    metadata: saint.period,
    quote: saint.prayer,
    image: saint.image,
    colorFront: saint.watercolorFront,
    colorBack: saint.watercolorBack,
  })
}
