"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { HexColorPicker } from "react-colorful"

declare global {
  interface Window {
    EyeDropper?: new () => { open: (opts?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }> }
  }
}

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  /** Optional image source for the cross-browser canvas color sampler */
  imageSrc?: string | null
}

function isValidHex(hex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

function pixelToHex(r: number, g: number, b: number) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

const EyeDropperIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5">
    <path d="M13.5 1.5a1.5 1.5 0 0 1 0 2.12L6 11.12 4 12l.88-2L12.38 2.5a1.5 1.5 0 0 1 1.12-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.88 10L6 11.12M2.5 13.5l1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="2.5" cy="13.5" r="1" fill="currentColor"/>
  </svg>
)

function CanvasSampler({ imageSrc, onPick }: { imageSrc: string; onPick: (hex: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverColor, setHoverColor] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const maxW = 160
      const scale = maxW / img.naturalWidth
      canvas.width = maxW
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      setLoaded(true)
    }
    img.onerror = () => {
      // Retry without crossOrigin for same-origin images
      const img2 = new Image()
      img2.onload = () => {
        const maxW = 160
        const scale = maxW / img2.naturalWidth
        canvas.width = maxW
        canvas.height = Math.round(img2.naturalHeight * scale)
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img2, 0, 0, canvas.width, canvas.height)
        setLoaded(true)
      }
      img2.src = imageSrc
    }
    img.src = imageSrc
  }, [imageSrc])

  const getColorAt = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width))
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data
    if (a === 0) return null
    return pixelToHex(r, g, b)
  }, [])

  return (
    <div className="space-y-1">
      <p className="text-[9px] text-[#8a7e6b] uppercase tracking-wider font-medium">Tomar color de la imagen</p>
      <div className="relative">
        <canvas
          ref={canvasRef}
          onMouseMove={(e) => setHoverColor(getColorAt(e))}
          onMouseLeave={() => setHoverColor(null)}
          onClick={(e) => { const c = getColorAt(e); if (c) onPick(c) }}
          className={`rounded border border-[#d4cfc4] w-full ${loaded ? "cursor-crosshair" : "opacity-40"}`}
        />
        {hoverColor && (
          <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-white/95 rounded px-1.5 py-0.5 border border-[#d4cfc4] shadow-sm pointer-events-none">
            <div className="w-3 h-3 rounded-sm border border-[#d4cfc4]" style={{ backgroundColor: hoverColor }} />
            <span className="text-[9px] font-mono text-[#2a2519]">{hoverColor}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ColorPicker({ value, onChange, label, imageSrc }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false)
  const [picking, setPicking] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setEyeDropperSupported(typeof window !== "undefined" && !!window.EyeDropper)
  }, [])

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`
    setInputValue(raw)
    if (isValidHex(raw)) onChange(raw)
  }, [onChange])

  const handleInputBlur = useCallback(() => {
    if (!isValidHex(inputValue)) setInputValue(value)
  }, [inputValue, value])

  const handleEyeDropper = useCallback(async () => {
    if (!window.EyeDropper) return
    setOpen(false)
    setPicking(true)
    abortRef.current = new AbortController()
    try {
      const dropper = new window.EyeDropper()
      const result = await dropper.open({ signal: abortRef.current.signal })
      onChange(result.sRGBHex)
    } catch {
      // cancelled — ignore
    } finally {
      setPicking(false)
      abortRef.current = null
    }
  }, [onChange])

  const handleCanvasPick = useCallback((hex: string) => {
    onChange(hex)
    setOpen(false)
  }, [onChange])

  return (
    <div className="flex items-center gap-2" ref={containerRef}>
      {label && (
        <label className="text-[10px] text-[#8a7e6b] font-medium w-16 shrink-0">{label}</label>
      )}
      <div className="relative">
        {/* Swatch button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-8 h-8 rounded border-2 border-[#d4cfc4] hover:border-[#8a7e6b] transition-colors shadow-sm shrink-0"
          style={{ backgroundColor: isValidHex(value) ? value : "#f5f0e8" }}
          aria-label="Abrir selector de color"
        />

        {/* Popover */}
        {open && (
          <div className="absolute z-50 top-10 left-0 bg-white rounded-lg shadow-xl border border-[#d4cfc4] p-3 flex flex-col gap-2.5 w-44">
            <HexColorPicker color={value} onChange={onChange} style={{ width: "100%" }} />

            {/* Hex input + eyedropper */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                maxLength={7}
                spellCheck={false}
                className="flex-1 min-w-0 px-2 py-1 text-xs font-mono border border-[#d4cfc4] rounded text-[#2a2519] focus:outline-none focus:ring-1 focus:ring-[#8a7e6b] uppercase"
                placeholder="#f5f0e8"
              />
              {eyeDropperSupported && (
                <button
                  type="button"
                  onClick={handleEyeDropper}
                  title="Seleccionar color de la pantalla"
                  className="px-2 py-1 rounded border border-[#d4cfc4] text-[#8a7e6b] hover:border-[#8a7e6b] hover:text-[#2a2519] hover:bg-[#f5f0e8] transition-colors flex items-center shrink-0"
                >
                  <EyeDropperIcon />
                </button>
              )}
            </div>

            {/* Canvas sampler from image */}
            {imageSrc && (
              <CanvasSampler imageSrc={imageSrc} onPick={handleCanvasPick} />
            )}
          </div>
        )}
      </div>

      {/* Eyedropper shortcut (outside popover, EyeDropper API only) */}
      {eyeDropperSupported && !open && (
        <button
          type="button"
          onClick={handleEyeDropper}
          title="Seleccionar color de la pantalla"
          className={`p-1 rounded border transition-colors flex items-center ${
            picking
              ? "border-[#2a2519] bg-[#2a2519] text-[#faf8f4]"
              : "border-[#d4cfc4] text-[#8a7e6b] hover:border-[#8a7e6b] hover:text-[#2a2519]"
          }`}
        >
          <EyeDropperIcon />
        </button>
      )}

      <span className="text-[10px] text-[#8a7e6b] font-mono">{value}</span>
    </div>
  )
}
