"use client"

import { useState, useCallback } from "react"
import { Sparkles, Loader2, AlertCircle } from "lucide-react"

interface AIGenerateButtonProps {
  saintName: string
  saintDescription: string
  onImageGenerated: (dataUrl: string) => void
}

export function AIGenerateButton({
  saintName,
  saintDescription,
  onImageGenerated,
}: AIGenerateButtonProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch("/api/generate-saint-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saintName, saintDescription }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al generar la imagen")
      }

      if (data.image) {
        onImageGenerated(data.image)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      setError(msg)
    } finally {
      setGenerating(false)
    }
  }, [saintName, saintDescription, onImageGenerated])

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleGenerate}
        disabled={generating}
        type="button"
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2a2519] to-[#4a3f2f] text-[#faf8f4] text-xs font-semibold shadow-lg hover:from-[#3a3529] hover:to-[#5a4f3f] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando con IA...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generar con IA
          </>
        )}
      </button>

      {generating && (
        <p className="text-[10px] text-[#8a7e6b] text-center max-w-[180px]">
          Creando ilustracion en estilo linografia. Puede tardar unos segundos...
        </p>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-[10px] text-red-700 max-w-[180px]">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
