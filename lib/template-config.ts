export type BookmarkLayout = "classic" | "image-top" | "image-bottom" | "full-image"
export type ImagePosition = "top" | "center" | "bottom"
export type BackgroundComplexity = "simple" | "detailed"
export type BackgroundType = "default" | "solid" | "gradient" | "ornamental" | "image"
export type GradientDirection = "to-bottom" | "to-right" | "diagonal"
export type OrnamentalPattern = "lines" | "border" | "crosses" | "filigree"

export interface ItemImageSize {
  width: number
  height: number
}

export const defaultItemImageSize: ItemImageSize = {
  width: 180,
  height: 340,
}

export interface ItemBackground {
  backgroundType: BackgroundType
  manualBgColor: string
  gradientColor1: string
  gradientColor2: string
  gradientDirection: GradientDirection
  ornamentalPattern: OrnamentalPattern
  ornamentalColor: string
  ornamentalOpacity: number
  backgroundImageUrl?: string
}

export const defaultItemBackground: ItemBackground = {
  backgroundType: "default",
  manualBgColor: "#f5f0e8",
  gradientColor1: "#f5f0e8",
  gradientColor2: "#d4c5a9",
  gradientDirection: "to-bottom",
  ornamentalPattern: "lines",
  ornamentalColor: "#8a7e6b",
  ornamentalOpacity: 0.3,
}

export interface BookmarkTemplate {
  name: string
  layout: BookmarkLayout
  imagePosition: ImagePosition
  headerTitle: string
  showYear: boolean
  showPrefix: boolean
  showSubtitle: boolean
  showTagline: boolean
  showQuote: boolean
  showDescription: boolean
  showMetadata: boolean
  showDots: boolean
  showBackgroundImage: boolean
  backgroundStyle: string
  backgroundComplexity: BackgroundComplexity
  useSolidBackground: boolean
}

export const defaultTemplate: BookmarkTemplate = {
  name: "Clasico",
  layout: "classic",
  imagePosition: "center",
  headerTitle: "",
  showYear: true,
  showPrefix: true,
  showSubtitle: true,
  showTagline: true,
  showQuote: true,
  showDescription: true,
  showMetadata: true,
  showDots: true,
  showBackgroundImage: false,
  backgroundStyle: "",
  backgroundComplexity: "simple",
  useSolidBackground: false,
}

export const presetTemplates: BookmarkTemplate[] = [
  defaultTemplate,
  {
    name: "Imagen arriba",
    layout: "image-top",
    imagePosition: "top",
    headerTitle: "",
    showYear: true,
    showPrefix: true,
    showSubtitle: true,
    showTagline: true,
    showQuote: true,
    showDescription: true,
    showMetadata: true,
    showDots: true,
    showBackgroundImage: false,
    backgroundStyle: "",
    backgroundComplexity: "simple",
    useSolidBackground: false,
  },
  {
    name: "Imagen abajo",
    layout: "image-bottom",
    imagePosition: "bottom",
    headerTitle: "",
    showYear: false,
    showPrefix: true,
    showSubtitle: true,
    showTagline: true,
    showQuote: true,
    showDescription: true,
    showMetadata: true,
    showDots: true,
    showBackgroundImage: false,
    backgroundStyle: "",
    backgroundComplexity: "simple",
    useSolidBackground: false,
  },
  {
    name: "Imagen completa",
    layout: "full-image",
    imagePosition: "center",
    headerTitle: "",
    showYear: false,
    showPrefix: true,
    showSubtitle: false,
    showTagline: false,
    showQuote: false,
    showDescription: true,
    showMetadata: false,
    showDots: false,
    showBackgroundImage: false,
    backgroundStyle: "",
    backgroundComplexity: "simple",
    useSolidBackground: false,
  },
  {
    name: "Minimalista",
    layout: "classic",
    imagePosition: "center",
    headerTitle: "",
    showYear: false,
    showPrefix: false,
    showSubtitle: false,
    showTagline: false,
    showQuote: false,
    showDescription: true,
    showMetadata: false,
    showDots: false,
    showBackgroundImage: false,
    backgroundStyle: "",
    backgroundComplexity: "simple",
    useSolidBackground: false,
  },
]

export const layoutLabels: Record<BookmarkLayout, string> = {
  "classic": "Clasico",
  "image-top": "Imagen arriba",
  "image-bottom": "Imagen abajo",
  "full-image": "Imagen completa",
}

export const imagePositionLabels: Record<ImagePosition, string> = {
  "top": "Arriba",
  "center": "Centro",
  "bottom": "Abajo",
}

export function pickBackground(pool: string[], itemId: string): string | null {
  if (pool.length === 0) return null
  let hash = 0
  for (let i = 0; i < itemId.length; i++) {
    hash = ((hash << 5) - hash + itemId.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % pool.length
  return pool[index]
}
