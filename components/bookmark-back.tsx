"use client"

import type { Saint } from "@/lib/saints-data"
import type { ExtractedColors } from "@/lib/color-utils"

interface BookmarkBackProps {
  saint: Saint
  customColors?: ExtractedColors | null
}

export function BookmarkBack({ saint, customColors }: BookmarkBackProps) {
  const watercolorBack = customColors?.watercolorBack || saint.watercolorBack

  return (
    <div className="bookmark-side bookmark-back" style={{ "--wc-back": watercolorBack } as React.CSSProperties}>
      {/* Torn edge SVG overlay */}
      <svg className="torn-edge-left" viewBox="0 0 8 600" preserveAspectRatio="none">
        <path d="M8,0 L4,10 L7,22 L3,36 L6,50 L2,64 L5,78 L1,94 L4,108 L2,122 L6,136 L3,152 L7,166 L2,180 L5,196 L1,210 L4,224 L3,240 L6,254 L2,268 L5,284 L1,298 L4,312 L2,328 L6,342 L3,358 L7,372 L2,388 L5,402 L1,418 L4,432 L3,448 L6,462 L2,478 L5,492 L1,508 L4,522 L2,538 L6,552 L3,568 L7,582 L8,600 L0,600 L0,0 Z" fill="#f5f0e8"/>
      </svg>
      <svg className="torn-edge-right" viewBox="0 0 8 600" preserveAspectRatio="none">
        <path d="M0,0 L4,16 L1,30 L5,44 L2,58 L6,74 L3,88 L7,102 L4,118 L6,132 L2,146 L5,162 L1,176 L6,190 L3,206 L7,220 L4,234 L5,250 L2,264 L6,278 L3,294 L7,308 L4,322 L6,338 L2,352 L5,368 L1,382 L6,398 L3,412 L7,426 L4,442 L5,458 L2,472 L6,488 L3,502 L7,518 L4,532 L6,548 L2,562 L5,578 L0,600 L8,600 L8,0 Z" fill="#f5f0e8"/>
      </svg>

      {/* Watercolor wash effect */}
      <div className="watercolor-wash watercolor-back" />

      {/* Content */}
      <div className="bookmark-content bookmark-content-back">
        <div className="back-description">
          <p className="description-text font-serif">{saint.description}</p>
          <p className="description-period font-sans">{saint.period}</p>
        </div>

        <div className="back-dots">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </div>
    </div>
  )
}
