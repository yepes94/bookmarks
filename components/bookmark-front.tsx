"use client"

import type { Saint } from "@/lib/saints-data"
import type { ExtractedColors } from "@/lib/color-utils"
import Image from "next/image"
import { ImageUpload } from "@/components/image-upload"

interface BookmarkFrontProps {
  saint: Saint
  year?: number
  customImage?: string | null
  customColors?: ExtractedColors | null
  onImageChange?: (dataUrl: string, colors?: ExtractedColors) => void
  onImageRemove?: () => void
  editable?: boolean
}

export function BookmarkFront({
  saint,
  year = 2026,
  customImage,
  customColors,
  onImageChange,
  onImageRemove,
  editable = false,
}: BookmarkFrontProps) {
  const displayImage = customImage || saint.image
  const watercolorFront = customColors?.watercolorFront || saint.watercolorFront

  return (
    <div className="bookmark-side bookmark-front" style={{ "--wc-front": watercolorFront } as React.CSSProperties}>
      {/* Torn edge SVG overlay */}
      <svg className="torn-edge-left" viewBox="0 0 8 600" preserveAspectRatio="none">
        <path d="M8,0 L3,12 L6,24 L2,38 L5,52 L1,68 L4,82 L2,96 L6,110 L3,126 L7,140 L2,156 L5,170 L1,186 L4,200 L3,216 L6,230 L2,246 L5,260 L1,276 L4,290 L2,306 L6,320 L3,336 L7,350 L2,366 L5,380 L1,396 L4,410 L3,426 L6,440 L2,456 L5,470 L1,486 L4,500 L2,516 L6,530 L3,546 L7,560 L2,576 L5,590 L8,600 L0,600 L0,0 Z" fill="#f5f0e8"/>
      </svg>
      <svg className="torn-edge-right" viewBox="0 0 8 600" preserveAspectRatio="none">
        <path d="M0,0 L5,14 L2,28 L6,42 L3,56 L7,72 L4,86 L6,100 L2,114 L5,130 L1,144 L6,158 L3,172 L7,188 L4,200 L5,216 L2,230 L6,246 L3,260 L7,276 L4,290 L6,306 L2,320 L5,336 L1,350 L6,366 L3,380 L7,396 L4,410 L5,426 L2,440 L6,456 L3,470 L7,486 L4,500 L6,516 L2,530 L5,546 L1,560 L6,576 L3,590 L0,600 L8,600 L8,0 Z" fill="#f5f0e8"/>
      </svg>

      {/* Watercolor wash effect */}
      <div className="watercolor-wash watercolor-front" />

      {/* Content */}
      <div className="bookmark-content">
        <div className="bookmark-header">
          <p className="header-title font-serif">Santos Patronos</p>
          <p className="header-year font-sans">{year}</p>
        </div>

        <div className="saint-name-block">
          <p className="saint-title font-sans">{saint.title}</p>
          <h2 className="saint-display-name font-serif">{saint.displayName}</h2>
          <p className="saint-feast font-sans">{saint.feastDay}</p>
        </div>

        <div className="saint-image-wrapper">
          {editable && onImageChange && onImageRemove ? (
            <ImageUpload
              currentImage={displayImage || null}
              onImageSelect={onImageChange}
              onImageRemove={onImageRemove}
              saintName={saint.name}
              saintDescription={saint.description}
            />
          ) : displayImage ? (
            customImage ? (
              <img
                src={customImage}
                alt={saint.name}
                className="saint-image"
                style={{ objectFit: "contain", maxWidth: 180, maxHeight: 340 }}
              />
            ) : (
              <Image
                src={saint.image!}
                alt={saint.name}
                width={200}
                height={320}
                className="saint-image"
                style={{ objectFit: "contain" }}
              />
            )
          ) : (
            <div className="saint-placeholder">
              <svg viewBox="0 0 100 160" className="placeholder-icon">
                <circle cx="50" cy="35" r="20" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
                <path d="M50 15 L50 12 M50 58 L50 61" stroke="#d4a017" strokeWidth="1" fill="none" />
                <ellipse cx="50" cy="35" rx="25" ry="28" fill="none" stroke="#d4a017" strokeWidth="0.8" opacity="0.5" />
                <path d="M30 65 Q50 55 70 65 L75 140 Q50 145 25 140 Z" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </div>

        <p className="saint-virtue font-sans">{saint.virtue}</p>
      </div>
    </div>
  )
}
