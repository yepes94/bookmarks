"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Sparkles, Loader2, AlertCircle, Key, X, Settings, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { compressImageDataUrl } from "@/lib/image-compress"

const STORAGE_KEY_API_KEY = "bookmark-ai-google-key"
const STORAGE_KEY_MODEL = "bookmark-ai-model"
const DEFAULT_MODEL = "gemini-2.0-flash-preview-image-generation"

interface ModelOption {
  id: string
  displayName: string
}

interface AIGenerateButtonProps {
  itemName: string
  itemDescription: string
  backgroundStyle?: string
  defaultPrompt?: string
  customPrompt?: string
  onPromptChange?: (prompt: string) => void
  onImageGenerated: (dataUrl: string) => void
}

export function AIGenerateButton({
  itemName,
  itemDescription,
  backgroundStyle = "",
  defaultPrompt = "",
  customPrompt = "",
  onPromptChange,
  onImageGenerated,
}: AIGenerateButtonProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [keyDraft, setKeyDraft] = useState("")
  const [modelDraft, setModelDraft] = useState(DEFAULT_MODEL)
  const [models, setModels] = useState<ModelOption[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const effectivePrompt = customPrompt.trim() || defaultPrompt || ""

  useEffect(() => {
    const savedModel = localStorage.getItem(STORAGE_KEY_MODEL)
    if (savedModel) setModelDraft(savedModel)
  }, [])

  useEffect(() => {
    if (showSettings) inputRef.current?.focus()
  }, [showSettings])

  const fetchModels = useCallback(async (key: string) => {
    setLoadingModels(true)
    setModelsError(null)
    try {
      const res = await fetch("/api/list-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error fetching models")
      setModels(data.models ?? [])
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : "Error al cargar modelos")
    } finally {
      setLoadingModels(false)
    }
  }, [])

  const generate = useCallback(
    async (apiKey: string, model: string) => {
      setGenerating(true)
      setError(null)

      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemName,
            itemDescription,
            apiKey,
            model,
            backgroundStyle,
            prompt: effectivePrompt || undefined,
            customPrompt: customPrompt.trim() || undefined,
          }),
        })

        const data = await res.json()

        if (res.status === 401 && data.missingApiKey) {
          setShowSettings(true)
          return
        }

        if (!res.ok) throw new Error(data.error || "Error al generar la imagen")

        if (data.image) {
          const compressed = await compressImageDataUrl(data.image as string)
          onImageGenerated(compressed)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setGenerating(false)
      }
    },
    [itemName, itemDescription, backgroundStyle, customPrompt, effectivePrompt, onImageGenerated]
  )

  const handleGenerate = useCallback(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY_API_KEY)
    if (!savedKey) { setShowSettings(true); return }
    const savedModel = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL
    generate(savedKey, savedModel)
  }, [generate])

  const handleSubmitSettings = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const key = keyDraft.trim()
    if (!key) return

    localStorage.setItem(STORAGE_KEY_API_KEY, key)
    localStorage.setItem(STORAGE_KEY_MODEL, modelDraft)

    // Save to .env.local on disk
    await fetch("/api/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key, model: modelDraft }),
    })

    setShowSettings(false)
    setKeyDraft("")
    await generate(key, modelDraft)
  }, [keyDraft, modelDraft, generate])

  const handleOpenSettings = useCallback(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY_API_KEY) || ""
    setKeyDraft(savedKey)
    setShowSettings(true)
    if (savedKey) fetchModels(savedKey)
  }, [fetchModels])

  const handleKeyBlur = useCallback(() => {
    const key = keyDraft.trim()
    if (key) fetchModels(key)
  }, [keyDraft, fetchModels])

  if (showSettings) {
    return (
      <div className="flex flex-col gap-2.5 w-full max-w-[230px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-[#2a2519] font-semibold uppercase tracking-wider">
            <Key className="h-3 w-3" />
            Configurar IA
          </div>
          <button type="button" onClick={() => { setShowSettings(false); setKeyDraft("") }}
            className="text-[#8a7e6b] hover:text-[#2a2519] transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmitSettings} className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#8a7e6b] font-medium">Google AI Studio API Key</label>
            <input
              ref={inputRef}
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onBlur={handleKeyBlur}
              placeholder="AIza..."
              className="w-full px-2.5 py-1.5 text-xs bg-[#faf8f4] border border-[#d4cfc4] rounded text-[#2a2519] focus:outline-none focus:ring-1 focus:ring-[#8a7e6b] font-mono"
            />
            <p className="text-[9px] text-[#8a7e6b]">
              Obtén tu key gratis en aistudio.google.com · Se guardará en <code>.env.local</code>
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[#8a7e6b] font-medium">Modelo</label>
              {keyDraft.trim() && (
                <button type="button" onClick={() => fetchModels(keyDraft.trim())}
                  disabled={loadingModels}
                  className="flex items-center gap-1 text-[9px] text-[#8a7e6b] hover:text-[#2a2519] transition-colors disabled:opacity-50">
                  <RefreshCw className={`h-2.5 w-2.5 ${loadingModels ? "animate-spin" : ""}`} />
                  {loadingModels ? "Cargando..." : "Actualizar lista"}
                </button>
              )}
            </div>

            {models.length > 0 ? (
              <select
                value={modelDraft}
                onChange={(e) => setModelDraft(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#faf8f4] border border-[#d4cfc4] rounded text-[#2a2519] focus:outline-none focus:ring-1 focus:ring-[#8a7e6b]"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.displayName || m.id}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={modelDraft}
                onChange={(e) => setModelDraft(e.target.value)}
                placeholder="gemini-..."
                className="w-full px-2.5 py-1.5 text-xs bg-[#faf8f4] border border-[#d4cfc4] rounded text-[#2a2519] focus:outline-none focus:ring-1 focus:ring-[#8a7e6b] font-mono"
              />
            )}

            {modelsError && (
              <p className="text-[9px] text-red-600">{modelsError}</p>
            )}
            {!loadingModels && models.length === 0 && !modelsError && (
              <p className="text-[9px] text-[#8a7e6b]">
                Escribe la key y pulsa fuera para cargar los modelos disponibles
              </p>
            )}
          </div>

          <button type="submit" disabled={!keyDraft.trim()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2519] text-[#faf8f4] text-xs font-semibold hover:bg-[#3a3529] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Sparkles className="h-3 w-3" />
            Guardar y generar
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[280px]">
      <div className="flex items-center gap-1.5">
        <button onClick={handleGenerate} disabled={generating} type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2a2519] to-[#4a3f2f] text-[#faf8f4] text-xs font-semibold shadow-lg hover:from-[#3a3529] hover:to-[#5a4f3f] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100">
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Generando...</>
          ) : (
            <><Sparkles className="h-4 w-4" />Generar con IA</>
          )}
        </button>
        <button type="button" onClick={handleOpenSettings} title="Configurar API key y modelo"
          className="p-1.5 text-[#8a7e6b] hover:text-[#2a2519] transition-colors">
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {defaultPrompt && (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setShowPrompt((p) => !p)}
          className="flex items-center gap-1.5 text-[10px] text-[#8a7e6b] hover:text-[#2a2519] transition-colors"
        >
          {showPrompt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showPrompt ? "Ocultar prompt" : "Ver y personalizar prompt"}
        </button>
        {showPrompt && (
          <div className="mt-1.5 flex flex-col gap-1">
            <label className="text-[10px] text-[#8a7e6b] font-medium">
              Prompt para la IA {customPrompt.trim() ? "(personalizado)" : "(por defecto)"}
            </label>
            <textarea
              value={customPrompt.trim() || defaultPrompt}
              onChange={(e) => onPromptChange?.(e.target.value)}
              placeholder={defaultPrompt}
              rows={8}
              className="w-full px-2.5 py-1.5 text-[11px] bg-[#faf8f4] border border-[#d4cfc4] rounded text-[#2a2519] focus:outline-none focus:ring-1 focus:ring-[#8a7e6b] font-mono resize-y min-h-[120px]"
              disabled={!onPromptChange}
            />
            {onPromptChange && (
              <p className="text-[9px] text-[#8a7e6b]">
                Edita el texto para personalizar la imagen. Dejar vacio restaura el prompt por defecto.
              </p>
            )}
          </div>
        )}
      </div>
      )}

      {generating && (
        <p className="text-[10px] text-[#8a7e6b] text-center max-w-[180px]">
          Creando ilustración en estilo linografía. Puede tardar unos segundos...
        </p>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-[10px] text-red-700 max-w-[200px]">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
