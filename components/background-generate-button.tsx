"use client"

import { useState, useCallback } from "react"
import { Sparkles, Loader2, AlertCircle, ImagePlus, Trash2 } from "lucide-react"

const STORAGE_KEY_API_KEY = "santos-ai-google-key"
const STORAGE_KEY_MODEL = "santos-ai-model"
const DEFAULT_MODEL = "gemini-2.0-flash-preview-image-generation"

interface BackgroundPoolManagerProps {
  pool: string[]
  backgroundStyle: string
  backgroundComplexity: "simple" | "detailed"
  onAddToPool: (dataUrl: string) => void
  onRemoveFromPool: (index: number) => void
}

export function BackgroundPoolManager({
  pool,
  backgroundStyle,
  backgroundComplexity,
  onAddToPool,
  onRemoveFromPool,
}: BackgroundPoolManagerProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY)
    if (!apiKey) {
      setError("Configura tu API key en la seccion de imagen del santo (boton de ajustes)")
      return
    }
    const model = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL

    setGenerating(true)
    setError(null)

    try {
      const res = await fetch("/api/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model,
          userStyle: backgroundStyle,
          complexity: backgroundComplexity,
        }),
      })

      const data = await res.json()

      if (res.status === 401 && data.missingApiKey) {
        setError("Configura tu API key en la seccion de imagen del santo")
        return
      }

      if (!res.ok) throw new Error(data.error || "Error al generar el fondo")

      if (data.image) onAddToPool(data.image)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setGenerating(false)
    }
  }, [backgroundStyle, backgroundComplexity, onAddToPool])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !file.type.startsWith("image/")) return

      const reader = new FileReader()
      reader.onload = (evt) => {
        const result = evt.target?.result as string
        if (result) onAddToPool(result)
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    },
    [onAddToPool]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={generate}
          disabled={generating}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#2a2519] to-[#4a3f2f] text-[#faf8f4] text-[11px] font-semibold shadow hover:from-[#3a3529] hover:to-[#5a4f3f] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {generating ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generando...</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" />Generar fondo con IA</>
          )}
        </button>

        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d4cfc4] text-[#5a5040] text-[11px] font-medium cursor-pointer hover:border-[#8a7e6b] transition-colors">
          <ImagePlus className="h-3.5 w-3.5" />
          Subir imagen
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {generating && (
        <p className="text-[10px] text-[#8a7e6b] italic">
          Creando un fondo decorativo con un marco central pensado para la imagen del santo. Puede tardar unos segundos...
        </p>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-[10px] text-red-700">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {pool.length > 0 && (
        <div>
          <p className="text-[10px] text-[#8a7e6b] mb-2">
            {pool.length} fondo{pool.length !== 1 ? "s" : ""} — se asignan aleatoriamente a cada punto de libro, con un marco pensado para la imagen central.
          </p>
          <div className="flex flex-wrap gap-2">
            {pool.map((bg, i) => (
              <div key={i} className="relative group">
                <div className="w-14 h-40 rounded border border-[#d4cfc4] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bg}
                    alt={`Fondo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFromPool(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
                <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/50 text-white px-1 rounded">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
