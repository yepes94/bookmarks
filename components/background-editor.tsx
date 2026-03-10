"use client"

import { useState, useCallback } from "react"
import { compressBackgroundDataUrl } from "@/lib/image-compress"
import type { ItemBackground, BackgroundType, GradientDirection, OrnamentalPattern } from "@/lib/template-config"
import { OrnamentalOverlay } from "@/components/ornamental-overlay"
import { ColorPicker } from "@/components/color-picker"
import { Sparkles, Loader2, AlertCircle } from "lucide-react"

const STORAGE_KEY_API_KEY = "bookmark-ai-google-key"
const STORAGE_KEY_MODEL = "bookmark-ai-model"
const DEFAULT_MODEL = "gemini-2.0-flash-preview-image-generation"

interface BackgroundEditorProps {
  background: ItemBackground
  onChange: <K extends keyof ItemBackground>(key: K, value: ItemBackground[K]) => void
  imageSrc?: string | null
  backgroundPool?: string[]
  itemName?: string
  watercolorColor?: string
}

const BG_TYPES: [BackgroundType, string][] = [
  ["default", "Por defecto"],
  ["solid", "Color"],
  ["gradient", "Degradado"],
  ["ornamental", "Ornamental"],
  ["image", "Imagen"],
]

const GRADIENT_DIRS: [GradientDirection, string][] = [
  ["to-bottom", "↓ Vertical"],
  ["to-right", "→ Horizontal"],
  ["diagonal", "↘ Diagonal"],
]

const ORNAMENTAL_PATTERNS: [OrnamentalPattern, string][] = [
  ["lines", "Líneas"],
  ["border", "Marco"],
  ["crosses", "Cruces"],
  ["filigree", "Filigrana"],
]

function gradientCss(bg: ItemBackground) {
  const dir = bg.gradientDirection === "to-bottom" ? "to bottom" : bg.gradientDirection === "to-right" ? "to right" : "135deg"
  return `linear-gradient(${dir}, ${bg.gradientColor1}, ${bg.gradientColor2})`
}

function TypeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1.5 text-[10px] rounded border transition-colors ${
        active
          ? "bg-[#2a2519] text-[#faf8f4] border-[#2a2519]"
          : "bg-[#faf8f4] text-[#5a5040] border-[#d4cfc4] hover:border-[#8a7e6b]"
      }`}
    >
      {children}
    </button>
  )
}


export function BackgroundEditor({ background: bg, onChange, imageSrc, backgroundPool = [], itemName, watercolorColor }: BackgroundEditorProps) {
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [compressingBg, setCompressingBg] = useState(false)

  const generateItemBackground = useCallback(async () => {
    if (!itemName) return
    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY)
    if (!apiKey) {
      setGenError("Configura tu API key en la sección de imagen (botón de ajustes)")
      return
    }
    const model = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch("/api/generate-item-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, model, itemName, watercolorColor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error generating background")
      onChange("backgroundImageUrl", data.image)
      onChange("backgroundType", "image")
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setGenerating(false)
    }
  }, [itemName, watercolorColor, onChange])

  const handleCompressBackground = useCallback(async () => {
    if (!bg.backgroundImageUrl) return
    setCompressingBg(true)
    try {
      const compressed = await compressBackgroundDataUrl(bg.backgroundImageUrl)
      onChange("backgroundImageUrl", compressed)
    } finally {
      setCompressingBg(false)
    }
  }, [bg.backgroundImageUrl, onChange])

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider">
        Fondo
      </p>

      {/* Type selector */}
      <div className="grid grid-cols-2 gap-1">
        {BG_TYPES.map(([type, label]) => (
          <TypeBtn key={type} active={bg.backgroundType === type} onClick={() => onChange("backgroundType", type)}>
            {label}
          </TypeBtn>
        ))}
      </div>

      {/* Solid color */}
      {bg.backgroundType === "solid" && (
        <div className="space-y-2 pl-1">
          <ColorPicker imageSrc={imageSrc} label="Color" value={bg.manualBgColor} onChange={(v) => onChange("manualBgColor", v)} />
        </div>
      )}

      {/* Gradient */}
      {bg.backgroundType === "gradient" && (
        <div className="space-y-2 pl-1">
          <ColorPicker imageSrc={imageSrc} label="Color 1" value={bg.gradientColor1} onChange={(v) => onChange("gradientColor1", v)} />
          <ColorPicker imageSrc={imageSrc} label="Color 2" value={bg.gradientColor2} onChange={(v) => onChange("gradientColor2", v)} />
          <div className="space-y-1">
            <label className="text-[10px] text-[#8a7e6b] font-medium">Dirección</label>
            <div className="flex gap-1">
              {GRADIENT_DIRS.map(([dir, label]) => (
                <TypeBtn key={dir} active={bg.gradientDirection === dir} onClick={() => onChange("gradientDirection", dir)}>
                  {label}
                </TypeBtn>
              ))}
            </div>
          </div>
          <div className="w-full h-6 rounded border border-[#d4cfc4]" style={{ background: gradientCss(bg) }} />
        </div>
      )}

      {/* Ornamental */}
      {bg.backgroundType === "ornamental" && (
        <div className="space-y-2 pl-1">
          <ColorPicker imageSrc={imageSrc} label="Fondo" value={bg.manualBgColor} onChange={(v) => onChange("manualBgColor", v)} />
          <div className="space-y-1">
            <label className="text-[10px] text-[#8a7e6b] font-medium">Patrón</label>
            <div className="grid grid-cols-2 gap-1">
              {ORNAMENTAL_PATTERNS.map(([p, label]) => (
                <TypeBtn key={p} active={bg.ornamentalPattern === p} onClick={() => onChange("ornamentalPattern", p)}>
                  {label}
                </TypeBtn>
              ))}
            </div>
          </div>
          <ColorPicker imageSrc={imageSrc} label="Líneas" value={bg.ornamentalColor} onChange={(v) => onChange("ornamentalColor", v)} />
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-[#8a7e6b] font-medium w-16 shrink-0">Opacidad</label>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={bg.ornamentalOpacity}
              onChange={(e) => onChange("ornamentalOpacity", Number(e.target.value))}
              className="flex-1 accent-[#2a2519]"
            />
            <span className="text-[10px] text-[#8a7e6b] w-8 text-right">{Math.round(bg.ornamentalOpacity * 100)}%</span>
          </div>
          {/* Mini preview */}
          <div
            className="w-full h-14 rounded border border-[#d4cfc4] relative overflow-hidden"
            style={{ backgroundColor: bg.manualBgColor }}
          >
            <OrnamentalOverlay pattern={bg.ornamentalPattern} color={bg.ornamentalColor} opacity={bg.ornamentalOpacity} />
          </div>
        </div>
      )}

      {/* Image from pool */}
      {bg.backgroundType === "image" && (
        <div className="space-y-2 pl-1">
          {/* AI generate button for this saint */}
          {itemName && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={generateItemBackground}
                disabled={generating}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-medium rounded border border-[#2a2519] bg-[#2a2519] text-[#faf8f4] hover:bg-[#3d3526] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generando fondo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Generar fondo para {itemName.length > 15 ? itemName.slice(0, 15) + "…" : itemName}
                  </>
                )}
              </button>
              {genError && (
                <div className="flex items-start gap-1 text-[9px] text-red-600 bg-red-50 rounded px-1.5 py-1 border border-red-200">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-px" />
                  <span>{genError}</span>
                </div>
              )}
            </div>
          )}

          {backgroundPool.length === 0 && !bg.backgroundImageUrl ? (
            <p className="text-[10px] text-[#8a7e6b] italic">
              No hay fondos generados. Usa el botón de arriba o genera fondos desde la pestaña de configuración global.
            </p>
          ) : (
            <>
              {backgroundPool.length > 0 && (
                <>
                  <p className="text-[10px] text-[#8a7e6b]">
                    Selecciona un fondo generado:
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {backgroundPool.map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onChange("backgroundImageUrl", imgUrl)}
                        className={`w-full aspect-[2/5] rounded border overflow-hidden transition-all hover:scale-105 ${
                          bg.backgroundImageUrl === imgUrl
                            ? "border-[#2a2519] ring-2 ring-[#2a2519]"
                            : "border-[#d4cfc4] opacity-60 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt={`Fondo ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {bg.backgroundImageUrl && (
                <div className="space-y-2">
                  <div className="w-full h-20 rounded border border-[#d4cfc4] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bg.backgroundImageUrl} alt="Fondo seleccionado" className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={handleCompressBackground}
                    disabled={compressingBg}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded border border-[#d4cfc4] text-[#5a5040] hover:border-[#2a2519] hover:text-[#2a2519] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {compressingBg ? "Comprimiendo fondo..." : "Comprimir este fondo"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
