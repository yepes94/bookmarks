"use client"

import { useState } from "react"
import type { BookmarkItem } from "@/lib/bookmark-item"
import type { ExtractedColors } from "@/lib/color-utils"
import { getContrastTextColor, getContrastSecondaryColor } from "@/lib/color-utils"
import type { BookmarkTemplate, ItemBackground, ItemImageSize } from "@/lib/template-config"
import { defaultTemplate, defaultItemBackground, defaultItemImageSize } from "@/lib/template-config"
import Image from "next/image"
import { ImageUpload } from "@/components/image-upload"
import { OrnamentalOverlay } from "@/components/ornamental-overlay"

export type CustomItemTexts = Partial<{
  displayName: string
  tagline: string
  quote: string
}>

interface BookmarkFrontProps {
  item: BookmarkItem
  year?: number
  customImage?: string | null
  customColors?: ExtractedColors | null
  onImageChange?: (dataUrl: string, colors?: ExtractedColors) => void
  onImageRemove?: () => void
  editable?: boolean
  template?: BookmarkTemplate
  backgroundImage?: string | null
  backgroundStyle?: string
  gallery?: string[]
  onAddToGallery?: (dataUrl: string) => void
  customTexts?: CustomItemTexts
  onTextChange?: (field: keyof CustomItemTexts, value: string) => void
  itemBackground?: ItemBackground | null
  itemImageSize?: ItemImageSize | null
  aiPromptDefault?: string
  aiPromptCustom?: string
  onAiPromptChange?: (prompt: string) => void
}

function EditableText({
  value,
  onSave,
  editable,
  multiline,
}: {
  value: string
  onSave?: (v: string) => void
  editable: boolean
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editable || !onSave) return <>{value}</>

  if (editing) {
    const sharedStyle: React.CSSProperties = {
      font: "inherit",
      color: "inherit",
      background: "rgba(255,255,255,0.85)",
      border: "1px solid rgba(0,0,0,0.3)",
      borderRadius: 2,
      padding: "0 2px",
      width: "100%",
      resize: "none",
      textAlign: "inherit" as React.CSSProperties["textAlign"],
    }
    const handleBlur = () => { onSave(draft); setEditing(false) }
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") setEditing(false)
      if (!multiline && e.key === "Enter") { onSave(draft); setEditing(false) }
    }
    return multiline ? (
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        rows={3}
        style={sharedStyle}
      />
    ) : (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        style={sharedStyle}
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Haz clic para editar"
      className="cursor-text hover:bg-black/10 rounded transition-colors px-0.5"
    >
      {value}
    </span>
  )
}

function ItemImage({
  item,
  customImage,
  displayImage,
  editable,
  onImageChange,
  onImageRemove,
  backgroundStyle,
  gallery,
  onAddToGallery,
  imageSize,
  aiPromptDefault,
  aiPromptCustom,
  onAiPromptChange,
}: {
  item: BookmarkItem
  customImage?: string | null
  displayImage: string | null | undefined
  editable: boolean
  onImageChange?: (dataUrl: string, colors?: ExtractedColors) => void
  onImageRemove?: () => void
  backgroundStyle?: string
  gallery?: string[]
  onAddToGallery?: (dataUrl: string) => void
  imageSize?: ItemImageSize | null
  aiPromptDefault?: string
  aiPromptCustom?: string
  onAiPromptChange?: (prompt: string) => void
}) {
  const sz = imageSize ?? defaultItemImageSize
  if (editable && onImageChange && onImageRemove) {
    return (
      <ImageUpload
        currentImage={displayImage || null}
        onImageSelect={onImageChange}
        onImageRemove={onImageRemove}
        itemName={item.name}
        itemDescription={item.description}
        backgroundStyle={backgroundStyle}
        gallery={gallery}
        onAddToGallery={onAddToGallery}
        imageMaxWidth={sz.width}
        imageMaxHeight={sz.height}
        defaultPrompt={aiPromptDefault}
        customPrompt={aiPromptCustom}
        onPromptChange={onAiPromptChange}
      />
    )
  }
  if (displayImage) {
    return customImage ? (
      <img
        src={customImage}
        alt={item.name}
        className="item-image"
        style={{ objectFit: "contain", maxWidth: sz.width, maxHeight: sz.height }}
      />
    ) : (
      <Image
        src={item.image!}
        alt={item.name}
        width={200}
        height={320}
        className="item-image"
        style={{ objectFit: "contain", maxWidth: sz.width, maxHeight: sz.height }}
      />
    )
  }
  return (
    <div className="item-placeholder">
      <svg viewBox="0 0 100 160" className="placeholder-icon">
        <circle cx="50" cy="35" r="20" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <path d="M50 15 L50 12 M50 58 L50 61" stroke="#d4a017" strokeWidth="1" fill="none" />
        <ellipse cx="50" cy="35" rx="25" ry="28" fill="none" stroke="#d4a017" strokeWidth="0.8" opacity="0.5" />
        <path d="M30 65 Q50 55 70 65 L75 140 Q50 145 25 140 Z" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

function ClassicLayout({
  item,
  year,
  customImage,
  displayImage,
  editable,
  onImageChange,
  onImageRemove,
  template,
  backgroundStyle,
  gallery,
  onAddToGallery,
  customTexts,
  onTextChange,
  itemImageSize,
  aiPromptDefault,
  aiPromptCustom,
  onAiPromptChange,
}: BookmarkFrontProps & { displayImage: string | null | undefined }) {
  const t = template ?? defaultTemplate
  const displayName = customTexts?.displayName ?? item.displayName
  const tagline = customTexts?.tagline ?? item.tagline
  const quote = customTexts?.quote ?? item.quote
  return (
    <div className="bookmark-content">
      <div className="bookmark-header">
        {t.headerTitle && <p className="header-title font-serif">{t.headerTitle}</p>}
        {t.showYear && <p className="header-year font-sans">{year}</p>}
      </div>

      <div className="item-name-block">
        {t.showPrefix && <p className="item-prefix font-sans">{item.prefix}</p>}
        <h2 className="item-display-name font-serif">
          <EditableText value={displayName} onSave={(v) => onTextChange?.("displayName", v)} editable={editable ?? false} />
        </h2>
        {t.showSubtitle && <p className="item-subtitle font-sans">{item.subtitle}</p>}
      </div>

      <div className={`item-image-wrapper item-image-${t.imagePosition}`}>
        <ItemImage
          item={item}
          customImage={customImage}
          displayImage={displayImage}
          editable={editable ?? false}
          onImageChange={onImageChange}
          onImageRemove={onImageRemove}
          backgroundStyle={backgroundStyle}
          gallery={gallery}
          onAddToGallery={onAddToGallery}
          imageSize={itemImageSize}
          aiPromptDefault={aiPromptDefault}
          aiPromptCustom={aiPromptCustom}
          onAiPromptChange={onAiPromptChange}
        />
      </div>

      {t.showTagline && <p className="item-tagline font-sans"><EditableText value={tagline} onSave={(v) => onTextChange?.("tagline", v)} editable={editable ?? false} /></p>}
      {t.showQuote && <p className="item-quote font-serif"><EditableText value={quote} onSave={(v) => onTextChange?.("quote", v)} editable={editable ?? false} multiline /></p>}
    </div>
  )
}

function ImageTopLayout({
  item,
  year,
  customImage,
  displayImage,
  editable,
  onImageChange,
  onImageRemove,
  template,
  backgroundStyle,
  gallery,
  onAddToGallery,
  customTexts,
  onTextChange,
  itemImageSize,
  aiPromptDefault,
  aiPromptCustom,
  onAiPromptChange,
}: BookmarkFrontProps & { displayImage: string | null | undefined }) {
  const t = template ?? defaultTemplate
  const displayName = customTexts?.displayName ?? item.displayName
  const tagline = customTexts?.tagline ?? item.tagline
  const quote = customTexts?.quote ?? item.quote
  return (
    <div className="bookmark-content layout-image-top">
      <div className={`item-image-wrapper item-image-${t.imagePosition}`}>
        <ItemImage
          item={item}
          customImage={customImage}
          displayImage={displayImage}
          editable={editable ?? false}
          onImageChange={onImageChange}
          onImageRemove={onImageRemove}
          backgroundStyle={backgroundStyle}
          gallery={gallery}
          onAddToGallery={onAddToGallery}
          imageSize={itemImageSize}
          aiPromptDefault={aiPromptDefault}
          aiPromptCustom={aiPromptCustom}
          onAiPromptChange={onAiPromptChange}
        />
      </div>

      <div className="layout-bottom-info">
        <div className="bookmark-header">
          {t.headerTitle && <p className="header-title font-serif">{t.headerTitle}</p>}
          {t.showYear && <p className="header-year font-sans">{year}</p>}
        </div>

        <div className="item-name-block">
          {t.showPrefix && <p className="item-prefix font-sans">{item.prefix}</p>}
          <h2 className="item-display-name font-serif">
            <EditableText value={displayName} onSave={(v) => onTextChange?.("displayName", v)} editable={editable ?? false} />
          </h2>
          {t.showSubtitle && <p className="item-subtitle font-sans">{item.subtitle}</p>}
        </div>

        {t.showTagline && <p className="item-tagline font-sans"><EditableText value={tagline} onSave={(v) => onTextChange?.("tagline", v)} editable={editable ?? false} /></p>}
        {t.showQuote && <p className="item-quote font-serif"><EditableText value={quote} onSave={(v) => onTextChange?.("quote", v)} editable={editable ?? false} multiline /></p>}
      </div>
    </div>
  )
}

function ImageBottomLayout({
  item,
  year,
  customImage,
  displayImage,
  editable,
  onImageChange,
  onImageRemove,
  template,
  backgroundStyle,
  gallery,
  onAddToGallery,
  customTexts,
  onTextChange,
  itemImageSize,
  aiPromptDefault,
  aiPromptCustom,
  onAiPromptChange,
}: BookmarkFrontProps & { displayImage: string | null | undefined }) {
  const t = template ?? defaultTemplate
  const displayName = customTexts?.displayName ?? item.displayName
  const tagline = customTexts?.tagline ?? item.tagline
  const quote = customTexts?.quote ?? item.quote
  return (
    <div className="bookmark-content layout-image-bottom">
      <div className="layout-top-info">
        <div className="bookmark-header">
          {t.headerTitle && <p className="header-title font-serif">{t.headerTitle}</p>}
          {t.showYear && <p className="header-year font-sans">{year}</p>}
        </div>

        <div className="item-name-block">
          {t.showPrefix && <p className="item-prefix font-sans">{item.prefix}</p>}
          <h2 className="item-display-name font-serif">
            <EditableText value={displayName} onSave={(v) => onTextChange?.("displayName", v)} editable={editable ?? false} />
          </h2>
          {t.showSubtitle && <p className="item-subtitle font-sans">{item.subtitle}</p>}
        </div>

        {t.showTagline && <p className="item-tagline font-sans"><EditableText value={tagline} onSave={(v) => onTextChange?.("tagline", v)} editable={editable ?? false} /></p>}
        {t.showQuote && <p className="item-quote font-serif"><EditableText value={quote} onSave={(v) => onTextChange?.("quote", v)} editable={editable ?? false} multiline /></p>}
      </div>

      <div className={`item-image-wrapper item-image-${t.imagePosition}`}>
        <ItemImage
          item={item}
          customImage={customImage}
          displayImage={displayImage}
          editable={editable ?? false}
          onImageChange={onImageChange}
          onImageRemove={onImageRemove}
          backgroundStyle={backgroundStyle}
          gallery={gallery}
          onAddToGallery={onAddToGallery}
          imageSize={itemImageSize}
          aiPromptDefault={aiPromptDefault}
          aiPromptCustom={aiPromptCustom}
          onAiPromptChange={onAiPromptChange}
        />
      </div>
    </div>
  )
}

function FullImageLayout({
  item,
  customImage,
  displayImage,
  editable,
  onImageChange,
  onImageRemove,
  template,
  backgroundStyle,
  gallery,
  onAddToGallery,
  customTexts,
  onTextChange,
  itemImageSize,
  aiPromptDefault,
  aiPromptCustom,
  onAiPromptChange,
}: BookmarkFrontProps & { displayImage: string | null | undefined }) {
  const t = template ?? defaultTemplate
  const displayName = customTexts?.displayName ?? item.displayName
  const quote = customTexts?.quote ?? item.quote
  return (
    <div className="bookmark-content layout-full-image">
      <div className={`full-image-bg item-image-${t.imagePosition}`}>
        <ItemImage
          item={item}
          customImage={customImage}
          displayImage={displayImage}
          editable={editable ?? false}
          onImageChange={onImageChange}
          onImageRemove={onImageRemove}
          backgroundStyle={backgroundStyle}
          gallery={gallery}
          onAddToGallery={onAddToGallery}
          imageSize={itemImageSize}
          aiPromptDefault={aiPromptDefault}
          aiPromptCustom={aiPromptCustom}
          onAiPromptChange={onAiPromptChange}
        />
      </div>

      <div className="full-image-overlay">
        <div className="full-image-top">
          {t.headerTitle && <p className="header-title font-serif">{t.headerTitle}</p>}
        </div>
        <div className="full-image-bottom">
          {t.showPrefix && <p className="item-prefix font-sans">{item.prefix}</p>}
          <h2 className="item-display-name font-serif">
            <EditableText value={displayName} onSave={(v) => onTextChange?.("displayName", v)} editable={editable ?? false} />
          </h2>
          {t.showSubtitle && <p className="item-subtitle font-sans">{item.subtitle}</p>}
          {t.showQuote && <p className="item-quote font-serif"><EditableText value={quote} onSave={(v) => onTextChange?.("quote", v)} editable={editable ?? false} multiline /></p>}
        </div>
      </div>
    </div>
  )
}

export function BookmarkFront({
  item,
  year = 2026,
  customImage,
  customColors,
  onImageChange,
  onImageRemove,
  editable = false,
  template = defaultTemplate,
  backgroundImage,
  backgroundStyle,
  gallery,
  onAddToGallery,
  customTexts,
  onTextChange,
  itemBackground,
  itemImageSize,
  aiPromptDefault,
  aiPromptCustom,
  onAiPromptChange,
}: BookmarkFrontProps) {
  const bg = itemBackground ?? defaultItemBackground
  const imageRemoved = customImage === ""
  const displayImage = imageRemoved ? null : (customImage || item.image)
  const colorFront = customColors?.colorFront || item.colorFront
  const layoutClass = `layout-${template.layout}`
  const showBg = template.showBackgroundImage && backgroundImage
  const showItemBgImage = bg.backgroundType === "image" && bg.backgroundImageUrl

  // Image-extracted solid background (existing feature)
  const solidBg = template.useSolidBackground ? customColors?.backgroundColor ?? null : null

  // Manual background — only active when no extracted solid bg
  const manualActive = !solidBg && bg.backgroundType !== "default" && bg.backgroundType !== "image"
  const manualDominantColor = bg.backgroundType === "gradient" ? bg.gradientColor1 : bg.manualBgColor
  const manualBgStyle: React.CSSProperties = manualActive
    ? bg.backgroundType === "gradient"
      ? { background: `linear-gradient(${bg.gradientDirection === "to-bottom" ? "to bottom" : bg.gradientDirection === "to-right" ? "to right" : "135deg"}, ${bg.gradientColor1}, ${bg.gradientColor2})` }
      : { backgroundColor: bg.manualBgColor }
    : {}

  const effectiveContrastBase = solidBg ?? (manualActive ? manualDominantColor : null)
  const textColor = effectiveContrastBase ? getContrastTextColor(effectiveContrastBase) : undefined
  const secondaryColor = effectiveContrastBase ? getContrastSecondaryColor(effectiveContrastBase) : undefined

  const hasSolidClass = !!(solidBg || manualActive)

  const sharedProps = {
    item,
    year,
    customImage,
    customColors,
    onImageChange,
    onImageRemove,
    editable,
    template,
    displayImage,
    backgroundStyle,
    gallery,
    onAddToGallery,
    customTexts,
    onTextChange,
    itemImageSize,
    aiPromptDefault,
    aiPromptCustom,
    onAiPromptChange,
  }

  const styleVars: React.CSSProperties = {
    "--wc-front": colorFront,
    ...(solidBg ? { backgroundColor: solidBg } : {}),
    ...(hasSolidClass ? { "--text-primary": textColor, "--text-secondary": secondaryColor } : {}),
  } as React.CSSProperties

  return (
    <div className={`bookmark-side bookmark-front ${layoutClass}${hasSolidClass ? " solid-bg" : ""}`} style={styleVars}>
      {/* AI-generated background image (global pool) */}
      {showBg && !showItemBgImage && (
        <div className="bookmark-bg-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backgroundImage} alt="" className="bookmark-bg-img" />
        </div>
      )}

      {/* Per-saint selected background image */}
      {showItemBgImage && (
        <div className="bookmark-bg-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bg.backgroundImageUrl} alt="" className="bookmark-bg-img" />
        </div>
      )}

      {/* Manual background (solid / gradient / ornamental base) */}
      {manualActive && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, ...manualBgStyle }} />
      )}

      {/* Torn edge SVG overlay */}
      <svg className="torn-edge-left" viewBox="0 0 8 600" preserveAspectRatio="none">
        <path d="M8,0 L3,12 L6,24 L2,38 L5,52 L1,68 L4,82 L2,96 L6,110 L3,126 L7,140 L2,156 L5,170 L1,186 L4,200 L3,216 L6,230 L2,246 L5,260 L1,276 L4,290 L2,306 L6,320 L3,336 L7,350 L2,366 L5,380 L1,396 L4,410 L3,426 L6,440 L2,456 L5,470 L1,486 L4,500 L2,516 L6,530 L3,546 L7,560 L2,576 L5,590 L8,600 L0,600 L0,0 Z" fill="#f5f0e8"/>
      </svg>
      <svg className="torn-edge-right" viewBox="0 0 8 600" preserveAspectRatio="none">
        <path d="M0,0 L5,14 L2,28 L6,42 L3,56 L7,72 L4,86 L6,100 L2,114 L5,130 L1,144 L6,158 L3,172 L7,188 L4,200 L5,216 L2,230 L6,246 L3,260 L7,276 L4,290 L6,306 L2,320 L5,336 L1,350 L6,366 L3,380 L7,396 L4,410 L5,426 L2,440 L6,456 L3,470 L7,486 L4,500 L6,516 L2,530 L5,546 L1,560 L6,576 L3,590 L0,600 L8,600 L8,0 Z" fill="#f5f0e8"/>
      </svg>

      {/* Watercolor wash — hidden when bg image or manual bg is active */}
      {!showBg && !manualActive && !showItemBgImage && <div className="watercolor-wash watercolor-front" />}

      {/* Ornamental overlay */}
      {manualActive && bg.backgroundType === "ornamental" && (
        <OrnamentalOverlay
          pattern={bg.ornamentalPattern}
          color={bg.ornamentalColor}
          opacity={bg.ornamentalOpacity}
        />
      )}

      {template.layout === "classic" && <ClassicLayout {...sharedProps} />}
      {template.layout === "image-top" && <ImageTopLayout {...sharedProps} />}
      {template.layout === "image-bottom" && <ImageBottomLayout {...sharedProps} />}
      {template.layout === "full-image" && <FullImageLayout {...sharedProps} />}
    </div>
  )
}
