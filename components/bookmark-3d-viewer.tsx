"use client"

import { useRef, useCallback, useState } from "react"
import type { Saint } from "@/lib/saints-data"
import type { BookmarkTemplate, SaintBackground, SaintImageSize } from "@/lib/template-config"
import type { ExtractedColors } from "@/lib/color-utils"
import type { CustomSaintTexts } from "@/components/bookmark-front"
import { BookmarkFront } from "@/components/bookmark-front"
import { BookmarkBack } from "@/components/bookmark-back"
import { Eye, EyeOff } from "lucide-react"

interface BookmarkCard3DProps {
  saint: Saint
  isSelected: boolean
  customImage: string | null
  customColors: ExtractedColors | null
  year: number
  template: BookmarkTemplate
  backgroundImage: string | null
  customTexts?: CustomSaintTexts
  saintBackground?: SaintBackground
  saintImageSize?: SaintImageSize
  onClick: () => void
}

export function BookmarkCard3D({
  saint,
  isSelected,
  customImage,
  customColors,
  year,
  template,
  backgroundImage,
  customTexts,
  saintBackground,
  saintImageSize,
  onClick,
}: BookmarkCard3DProps) {
  const rotationRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastXRef = useRef(0)
  const hasDraggedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const autoTimeRef = useRef(0)
  const lastFrameRef = useRef(0)

  const animate = useCallback(() => {
    if (!cardRef.current) return
    const now = performance.now()
    const delta = (now - lastFrameRef.current) / 1000
    lastFrameRef.current = now

    if (!isDraggingRef.current) {
      autoTimeRef.current += delta
      rotationRef.current += (0 - rotationRef.current) * Math.min(delta * 1.5, 1)
      const angle = rotationRef.current + Math.sin(autoTimeRef.current * 0.55) * 12
      cardRef.current.style.transform = `rotateY(${angle}deg)`
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }, [])

  const startAnimation = useCallback(() => {
    lastFrameRef.current = performance.now()
    animFrameRef.current = requestAnimationFrame(animate)
  }, [animate])

  const cardRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (cardRef.current && !node) {
        cancelAnimationFrame(animFrameRef.current)
      }
      (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      if (node) startAnimation()
    },
    [startAnimation]
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true
    hasDraggedRef.current = false
    lastXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastXRef.current
    lastXRef.current = e.clientX
    if (Math.abs(dx) > 2) hasDraggedRef.current = true
    rotationRef.current = Math.max(-180, Math.min(180, rotationRef.current + dx * 0.75))
    if (cardRef.current) {
      cardRef.current.style.transform = `rotateY(${rotationRef.current}deg)`
    }
  }

  const handlePointerUp = () => {
    isDraggingRef.current = false
    if (!hasDraggedRef.current) onClick()
  }

  return (
    <div className="flex flex-col items-center gap-3 flex-shrink-0 select-none">
      <div
        className={`cursor-grab active:cursor-grabbing rounded-lg transition-shadow duration-200 ${
          isSelected
            ? "ring-2 ring-[#2a2519] ring-offset-4 ring-offset-[#f5f0e8]"
            : "opacity-75 hover:opacity-100"
        }`}
        style={{ perspective: 1200 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          ref={cardRefCallback}
          style={{
            transformStyle: "preserve-3d",
            transform: "rotateY(0deg)",
          }}
        >
          {/* Front face */}
          <div style={{ backfaceVisibility: "hidden" }}>
            <BookmarkFront
              saint={saint}
              year={year}
              customImage={customImage}
              customColors={customColors}
              template={template}
              backgroundImage={backgroundImage}
              customTexts={customTexts}
              saintBackground={saintBackground}
              saintImageSize={saintImageSize}
            />
          </div>
          {/* Back face */}
          <div
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <BookmarkBack
              saint={saint}
              customColors={customColors}
              template={template}
              backgroundImage={backgroundImage}
              saintBackground={saintBackground}
            />
          </div>
        </div>
      </div>
      <span
        className={`text-xs font-medium text-center max-w-[220px] truncate transition-colors ${
          isSelected ? "text-[#2a2519] font-semibold" : "text-[#8a7e6b]"
        }`}
      >
        {saint.name}
      </span>
    </div>
  )
}

interface BookmarkCarousel3DProps {
  saints: Saint[]
  selectedSaintId: string
  customImages: Record<string, string>
  customColors: Record<string, ExtractedColors>
  year: number
  template: BookmarkTemplate
  getBackground: (saintId: string) => string | null
  customTexts: Record<string, CustomSaintTexts>
  saintBackgrounds: Record<string, SaintBackground>
  onSelectSaint: (saint: Saint) => void
}

export function BookmarkCarousel3D({
  saints,
  selectedSaintId,
  customImages,
  customColors,
  year,
  template,
  getBackground,
  customTexts,
  saintBackgrounds,
  onSelectSaint,
}: BookmarkCarousel3DProps) {
  const [showAll, setShowAll] = useState(false)

  if (saints.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[#8a7e6b] text-sm italic">
        Selecciona santos para ver la vista previa
      </div>
    )
  }

  const activeSaint = saints.find((s) => s.id === selectedSaintId) ?? saints[0]
  const visibleSaints = showAll ? saints : [activeSaint]

  return (
    <div>
      <div
        className="overflow-x-auto pb-2"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#d4cfc4 transparent" }}
      >
        <div className="flex gap-8 px-2 w-max">
          {visibleSaints.map((saint) => (
            <BookmarkCard3D
              key={saint.id}
              saint={saint}
              isSelected={saint.id === selectedSaintId}
              customImage={customImages[saint.id] ?? null}
              customColors={customColors[saint.id] ?? null}
              year={year}
              template={template}
              backgroundImage={getBackground(saint.id)}
              customTexts={customTexts[saint.id]}
              saintBackground={saintBackgrounds[saint.id]}
              onClick={() => onSelectSaint(saint)}
            />
          ))}
        </div>
      </div>
      {saints.length > 1 && (
        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8a7e6b] hover:text-[#2a2519] border border-[#d4cfc4] hover:border-[#8a7e6b] rounded-md transition-colors"
          >
            {showAll ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showAll ? `Mostrar solo el activo` : `Ver todos (${saints.length})`}
          </button>
        </div>
      )}
    </div>
  )
}
