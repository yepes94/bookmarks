"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  Check,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Eraser,
  Loader2,
} from "lucide-react"

interface ImageEditorProps {
  imageSrc: string
  onConfirm: (croppedDataUrl: string) => void
  onCancel: () => void
}

// Bookmark proportions
const CROP_W = 220
const CROP_H = 440
const CANVAS_W = 320
const CANVAS_H = 520
const CROP_X = (CANVAS_W - CROP_W) / 2
const CROP_Y = (CANVAS_H - CROP_H) / 2

export function ImageEditor({ imageSrc, onConfirm, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [removingBg, setRemovingBg] = useState(false)
  const [bgRemoved, setBgRemoved] = useState(false)

  // We keep the "working" image src separate so bg-removal replaces it
  const [workingSrc, setWorkingSrc] = useState(imageSrc)

  const scaleRef = useRef(1)
  const offsetRef = useRef({ x: 0, y: 0 })
  const [scaleDisplay, setScaleDisplay] = useState(100)

  // Drag
  const draggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const offsetStartRef = useRef({ x: 0, y: 0 })

  // Pinch
  const lastPinchDistRef = useRef<number | null>(null)
  const pinchScaleStartRef = useRef(1)

  // Portal target
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)

  useEffect(() => {
    setPortalTarget(document.body)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const img = imgRef.current
    if (!canvas || !ctx || !img) return

    const s = scaleRef.current
    const ox = offsetRef.current.x
    const oy = offsetRef.current.y

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // 1) Draw image
    ctx.drawImage(img, ox, oy, img.width * s, img.height * s)

    // 2) Dark overlay outside crop
    ctx.save()
    ctx.fillStyle = "rgba(0,0,0,0.55)"
    ctx.fillRect(0, 0, CANVAS_W, CROP_Y)
    ctx.fillRect(0, CROP_Y + CROP_H, CANVAS_W, CANVAS_H - CROP_Y - CROP_H)
    ctx.fillRect(0, CROP_Y, CROP_X, CROP_H)
    ctx.fillRect(CROP_X + CROP_W, CROP_Y, CANVAS_W - CROP_X - CROP_W, CROP_H)
    ctx.restore()

    // 3) Crop border
    ctx.strokeStyle = "rgba(250,248,244,0.9)"
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(CROP_X, CROP_Y, CROP_W, CROP_H)
    ctx.setLineDash([])

    // Corner marks
    const ml = 16
    ctx.strokeStyle = "#faf8f4"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(CROP_X, CROP_Y + ml)
    ctx.lineTo(CROP_X, CROP_Y)
    ctx.lineTo(CROP_X + ml, CROP_Y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(CROP_X + CROP_W - ml, CROP_Y)
    ctx.lineTo(CROP_X + CROP_W, CROP_Y)
    ctx.lineTo(CROP_X + CROP_W, CROP_Y + ml)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(CROP_X, CROP_Y + CROP_H - ml)
    ctx.lineTo(CROP_X, CROP_Y + CROP_H)
    ctx.lineTo(CROP_X + ml, CROP_Y + CROP_H)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(CROP_X + CROP_W - ml, CROP_Y + CROP_H)
    ctx.lineTo(CROP_X + CROP_W, CROP_Y + CROP_H)
    ctx.lineTo(CROP_X + CROP_W, CROP_Y + CROP_H - ml)
    ctx.stroke()
  }, [])

  // Load (or reload after bg removal) the image
  const loadImage = useCallback(
    (src: string) => {
      const image = new window.Image()
      image.crossOrigin = "anonymous"
      image.onload = () => {
        imgRef.current = image
        const fitScale = Math.max(CROP_W / image.width, CROP_H / image.height)
        scaleRef.current = fitScale
        offsetRef.current = {
          x: (CANVAS_W - image.width * fitScale) / 2,
          y: (CANVAS_H - image.height * fitScale) / 2,
        }
        setScaleDisplay(Math.round(fitScale * 100))
        setLoaded(true)
        draw()
      }
      image.src = src
    },
    [draw]
  )

  useEffect(() => {
    loadImage(workingSrc)
  }, [workingSrc, loadImage])

  useEffect(() => {
    if (loaded) draw()
  }, [loaded, draw])

  // Unified update + redraw
  const updateAndDraw = useCallback(
    (newScale?: number, newOx?: number, newOy?: number) => {
      if (newScale !== undefined) scaleRef.current = newScale
      if (newOx !== undefined) offsetRef.current.x = newOx
      if (newOy !== undefined) offsetRef.current.y = newOy
      setScaleDisplay(Math.round(scaleRef.current * 100))
      draw()
    },
    [draw]
  )

  // --- Pointer handlers ---
  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    if ("touches" in e && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy)
      pinchScaleStartRef.current = scaleRef.current
      return
    }
    const pos =
      "touches" in e && e.touches.length > 0
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
    dragStartRef.current = pos
    offsetStartRef.current = { ...offsetRef.current }
    draggingRef.current = true
  }

  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    if ("touches" in e && e.touches.length === 2 && lastPinchDistRef.current !== null) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / lastPinchDistRef.current
      const newScale = Math.max(0.1, Math.min(8, pinchScaleStartRef.current * ratio))
      updateAndDraw(newScale)
      return
    }
    if (!draggingRef.current) return
    const pos =
      "touches" in e && e.touches.length > 0
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
    updateAndDraw(
      undefined,
      offsetStartRef.current.x + (pos.x - dragStartRef.current.x),
      offsetStartRef.current.y + (pos.y - dragStartRef.current.y)
    )
  }

  const handlePointerUp = () => {
    draggingRef.current = false
    lastPinchDistRef.current = null
  }

  // Zoom
  const zoom = useCallback(
    (factor: number) => {
      const img = imgRef.current
      if (!img) return
      const s = scaleRef.current
      const ns = Math.max(0.1, Math.min(8, s * factor))
      const cx = CANVAS_W / 2
      const cy = CANVAS_H / 2
      const ox = cx - (cx - offsetRef.current.x) * (ns / s)
      const oy = cy - (cy - offsetRef.current.y) * (ns / s)
      updateAndDraw(ns, ox, oy)
    },
    [updateAndDraw]
  )

  const handleReset = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    const fitScale = Math.max(CROP_W / img.width, CROP_H / img.height)
    updateAndDraw(
      fitScale,
      (CANVAS_W - img.width * fitScale) / 2,
      (CANVAS_H - img.height * fitScale) / 2
    )
  }, [updateAndDraw])

  // --- Background Removal ---
  const handleRemoveBg = useCallback(async () => {
    setRemovingBg(true)
    try {
      const { removeBackground } = await import("@imgly/background-removal")
      const response = await fetch(workingSrc)
      const blob = await response.blob()
      const resultBlob = await removeBackground(blob, {
        output: { format: "image/png", quality: 0.9 },
      })
      const url = URL.createObjectURL(resultBlob)
      setWorkingSrc(url)
      setBgRemoved(true)
    } catch (err) {
      console.error("Background removal failed:", err)
    } finally {
      setRemovingBg(false)
    }
  }, [workingSrc])

  // --- Export ---
  const handleConfirm = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    const outputScale = 2
    const outCanvas = document.createElement("canvas")
    outCanvas.width = CROP_W * outputScale
    outCanvas.height = CROP_H * outputScale
    const ctx = outCanvas.getContext("2d")
    if (!ctx) return
    ctx.scale(outputScale, outputScale)
    const s = scaleRef.current
    ctx.drawImage(
      img,
      offsetRef.current.x - CROP_X,
      offsetRef.current.y - CROP_Y,
      img.width * s,
      img.height * s
    )
    onConfirm(outCanvas.toDataURL("image/png", 0.92))
  }, [onConfirm])

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="bg-[#faf8f4] rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
        style={{ maxWidth: 380, maxHeight: "95vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-bold text-[#2a2519] uppercase tracking-wider">
            Editar imagen
          </h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#e8e0d0] transition-colors"
            type="button"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4 text-[#6b5d3e]" />
          </button>
        </div>

        {/* Instruction */}
        <div className="px-4 pb-2 flex items-center gap-2 flex-shrink-0">
          <Move className="h-3.5 w-3.5 text-[#8a7e6b] flex-shrink-0" />
          <p className="text-xs text-[#8a7e6b]">
            Arrastra para mover. Pellizca o usa los botones para zoom.
          </p>
        </div>

        {/* Canvas */}
        <div
          className="relative flex items-center justify-center bg-[#1a1a1a] mx-4 rounded-xl overflow-hidden select-none flex-shrink-0"
          style={{ touchAction: "none" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="cursor-grab active:cursor-grabbing"
            style={{
              touchAction: "none",
              maxWidth: "100%",
              height: "auto",
            }}
          />
          {removingBg && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-[#faf8f4] animate-spin" />
              <p className="text-xs text-[#faf8f4] font-medium">
                Quitando fondo...
              </p>
              <p className="text-[10px] text-[#faf8f4]/60">
                Esto puede tardar unos segundos
              </p>
            </div>
          )}
        </div>

        {/* Tools Row: Bg removal */}
        <div className="flex items-center gap-2 px-4 pt-3 flex-shrink-0">
          <button
            onClick={handleRemoveBg}
            disabled={removingBg}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              bgRemoved
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            type="button"
          >
            {removingBg ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eraser className="h-3.5 w-3.5" />
            )}
            {bgRemoved ? "Fondo eliminado" : "Quitar fondo"}
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-3 py-3 px-4 flex-shrink-0">
          <button
            onClick={() => zoom(1 / 1.2)}
            className="w-10 h-10 rounded-full bg-[#e8e0d0] flex items-center justify-center hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
            type="button"
            aria-label="Alejar"
          >
            <ZoomOut className="h-4 w-4 text-[#2a2519]" />
          </button>

          <div className="flex-1 mx-2">
            <div className="h-1.5 bg-[#e8e0d0] rounded-full relative overflow-hidden">
              <div
                className="h-full bg-[#6b5d3e] rounded-full transition-all duration-150"
                style={{
                  width: `${Math.min(100, Math.max(2, ((scaleRef.current - 0.1) / 4.9) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-[#8a7e6b] text-center mt-1">
              {scaleDisplay}%
            </p>
          </div>

          <button
            onClick={() => zoom(1.2)}
            className="w-10 h-10 rounded-full bg-[#e8e0d0] flex items-center justify-center hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
            type="button"
            aria-label="Acercar"
          >
            <ZoomIn className="h-4 w-4 text-[#2a2519]" />
          </button>

          <button
            onClick={handleReset}
            className="w-10 h-10 rounded-full bg-[#e8e0d0] flex items-center justify-center hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
            type="button"
            aria-label="Reiniciar"
          >
            <RotateCcw className="h-4 w-4 text-[#2a2519]" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-4 pb-4 flex-shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-[#d4cfc4] text-sm font-semibold text-[#6b5d3e] hover:bg-[#e8e0d0] active:bg-[#d4cfc4] transition-colors"
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-[#2a2519] text-sm font-semibold text-[#faf8f4] hover:bg-[#3a3529] active:bg-[#1a150d] transition-colors flex items-center justify-center gap-2"
            type="button"
          >
            <Check className="h-4 w-4" />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )

  if (!portalTarget) return null
  return createPortal(content, portalTarget)
}
