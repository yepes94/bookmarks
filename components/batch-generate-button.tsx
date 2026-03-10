"use client"

import { useState, useCallback, useRef } from "react"
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Square,
  RefreshCw,
  Check,
  Trash2,
  Eraser,
  Eye,
} from "lucide-react"
import type { BookmarkItem } from "@/lib/bookmark-item"
import { compressImageDataUrl } from "@/lib/image-compress"

const STORAGE_KEY_API_KEY = "bookmark-ai-google-key"
const STORAGE_KEY_MODEL = "bookmark-ai-model"
const DEFAULT_MODEL = "gemini-2.0-flash-preview-image-generation"

interface ItemBatchState {
  itemId: string
  itemName: string
  status: "idle" | "generating" | "done" | "error"
  error?: string
}

interface BatchGenerateButtonProps {
  items: BookmarkItem[]
  existingImages: Record<string, string>
  gallery: Record<string, string[]>
  projectPromptTemplate?: string
  onImageSelected: (itemId: string, dataUrl: string) => void
  onAddToGallery: (itemId: string, dataUrl: string) => void
  onImageRemoved: (itemId: string) => void
  onPreviewItem?: (item: BookmarkItem) => void
}

export function BatchGenerateButton({
  items,
  existingImages,
  gallery,
  projectPromptTemplate,
  onImageSelected,
  onAddToGallery,
  onImageRemoved,
  onPreviewItem,
}: BatchGenerateButtonProps) {
  const [running, setRunning] = useState(false)
  const [itemStates, setItemStates] = useState<ItemBatchState[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set())
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  const toggleChecked = useCallback((itemId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setCheckedIds((prev) => {
      if (prev.size === items.length) return new Set()
      return new Set(items.map((s) => s.id))
    })
  }, [items])

  const itemsToGenerate = items.filter((s) => checkedIds.has(s.id))

  const getApiConfig = useCallback(() => {
    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY)
    if (!apiKey) return null
    const model = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL
    return { apiKey, model }
  }, [])

  const handleGenerateAll = useCallback(async () => {
    if (itemsToGenerate.length === 0) {
      setError("Selecciona al menos una ficha para generar")
      return
    }

    const config = getApiConfig()
    if (!config) {
      setError("Configura tu API key primero (boton de ajustes en la seccion de imagen)")
      return
    }

    setItemStates(itemsToGenerate.map((s) => ({ itemId: s.id, itemName: s.name, status: "generating" })))
    setRunning(true)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToGenerate.map((s) => ({
            itemId: s.id,
            itemName: s.name,
            itemDescription: s.description,
          })),
          apiKey: config.apiKey,
          model: config.model,
          projectPromptTemplate: projectPromptTemplate || undefined,
        }),
        signal: controller.signal,
      })

      if (res.status === 401) {
        setError("API key invalida o no configurada")
        setRunning(false)
        return
      }
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al iniciar generacion en lote")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const json = line.slice(6).trim()
          if (!json) continue

          try {
            const event = JSON.parse(json)

            if (event.type === "result") {
              const itemId = event.itemId ?? event.saintId
              setItemStates((prev) =>
                prev.map((s) =>
                  s.itemId === itemId
                    ? { ...s, status: event.image ? "done" : "error", error: event.error ?? undefined }
                    : s
                )
              )
              if (event.image && itemId) {
                const image: string = event.image
                const compressed = await compressImageDataUrl(image)
                onAddToGallery(itemId, compressed)
                onImageSelected(itemId, compressed)
              }
            }

            if (event.type === "done") {
              setRunning(false)
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        setItemStates((prev) =>
          prev.map((s) => (s.status === "generating" ? { ...s, status: "idle" } : s))
        )
        setError("Generacion cancelada")
      } else {
        setError(err instanceof Error ? err.message : "Error desconocido")
      }
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }, [itemsToGenerate, getApiConfig, onAddToGallery, onImageSelected])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleRegenerateSingle = useCallback(
    async (itemId: string) => {
      const config = getApiConfig()
      if (!config) {
        setError("Configura tu API key primero")
        return
      }

      const item = items.find((s) => s.id === itemId)
      if (!item) return

      setRegeneratingIds((prev) => new Set(prev).add(itemId))
      setItemStates((prev) => {
        const exists = prev.some((s) => s.itemId === itemId)
        if (exists) return prev.map((s) => (s.itemId === itemId ? { ...s, status: "generating", error: undefined } : s))
        return [...prev, { itemId, itemName: item.name, status: "generating" }]
      })

      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemName: item.name,
            itemDescription: item.description,
            apiKey: config.apiKey,
            model: config.model,
            projectPromptTemplate: projectPromptTemplate || undefined,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Error al generar")

        if (data.image) {
          const compressed = await compressImageDataUrl(data.image as string)
          onAddToGallery(itemId, compressed)
          setItemStates((prev) =>
            prev.map((s) => (s.itemId === itemId ? { ...s, status: "done" } : s))
          )
        }
      } catch (err: unknown) {
        setItemStates((prev) =>
          prev.map((s) =>
            s.itemId === itemId
              ? { ...s, status: "error", error: err instanceof Error ? err.message : "Error" }
              : s
          )
        )
      } finally {
        setRegeneratingIds((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [items, getApiConfig, onAddToGallery, projectPromptTemplate]
  )

  const handleSelectImage = useCallback(
    (itemId: string, dataUrl: string) => {
      onImageSelected(itemId, dataUrl)
    },
    [onImageSelected]
  )

  const handleClearItem = useCallback(
    (itemId: string) => {
      onImageRemoved(itemId)
    },
    [onImageRemoved]
  )

  // --- Batch background removal ---
  const [removingBg, setRemovingBg] = useState(false)
  const [bgRemovingIds, setBgRemovingIds] = useState<Set<string>>(new Set())
  const [bgDoneIds, setBgDoneIds] = useState<Set<string>>(new Set())
  const [bgProgress, setBgProgress] = useState({ done: 0, total: 0 })
  const bgAbortRef = useRef(false)

  const handleBatchRemoveBg = useCallback(async () => {
    const itemsWithImages = itemsToGenerate.filter((s) => existingImages[s.id])
    if (itemsWithImages.length === 0) {
      setError("Los santos seleccionados no tienen imagenes para quitar fondo")
      return
    }

    setRemovingBg(true)
    setBgDoneIds(new Set())
    setBgProgress({ done: 0, total: itemsWithImages.length })
    setError(null)
    bgAbortRef.current = false

    const { AutoModel, AutoProcessor, RawImage } = await import("@huggingface/transformers")

    const model = await AutoModel.from_pretrained("briaai/RMBG-1.4", {
      dtype: "q8",
    })
    const processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4")

    let doneCount = 0
    for (const item of itemsWithImages) {
      if (bgAbortRef.current) break

      const imageSrc = existingImages[item.id]
      if (!imageSrc) continue

      setBgRemovingIds((prev) => new Set(prev).add(item.id))

      try {
        const rawImage = await RawImage.fromURL(imageSrc)
        const { pixel_values } = await processor(rawImage)
        const { output } = await model({ input: pixel_values })

        const maskData = await RawImage.fromTensor(
          output[0].mul(255).to("uint8")
        ).resize(rawImage.width, rawImage.height)

        const canvas = document.createElement("canvas")
        canvas.width = rawImage.width
        canvas.height = rawImage.height
        const ctx = canvas.getContext("2d")!

        const img = new window.Image()
        img.crossOrigin = "anonymous"
        await new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.src = imageSrc
        })
        ctx.drawImage(img, 0, 0)

        const pixelData = ctx.getImageData(0, 0, rawImage.width, rawImage.height)
        for (let i = 0; i < maskData.data.length; i++) {
          pixelData.data[i * 4 + 3] = maskData.data[i]
        }
        ctx.putImageData(pixelData, 0, 0)

        const dataUrl = canvas.toDataURL("image/png")

        onAddToGallery(item.id, dataUrl)
        onImageSelected(item.id, dataUrl)
        setBgDoneIds((prev) => new Set(prev).add(item.id))
      } catch {
        // skip failed ones silently
      } finally {
        setBgRemovingIds((prev) => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
        doneCount++
        setBgProgress({ done: doneCount, total: itemsWithImages.length })
      }
    }

    setRemovingBg(false)
  }, [itemsToGenerate, existingImages, onAddToGallery, onImageSelected])

  const handleCancelBgRemoval = useCallback(() => {
    bgAbortRef.current = true
  }, [])

  const completed = itemStates.filter((s) => s.status === "done").length
  const total = itemStates.length

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleGenerateAll}
          disabled={running || itemsToGenerate.length === 0}
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2a2519] to-[#4a3f2f] text-[#faf8f4] text-xs font-semibold shadow-lg hover:from-[#3a3529] hover:to-[#5a4f3f] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Generando {completed}/{total}...</>
          ) : (
            <><Sparkles className="h-4 w-4" />Generar {itemsToGenerate.length} imagenes en lote</>
          )}
        </button>

        <button
          onClick={handleBatchRemoveBg}
          disabled={running || removingBg || itemsToGenerate.filter((s) => existingImages[s.id]).length === 0}
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1a2519] to-[#2f4a3f] text-[#faf8f4] text-xs font-semibold shadow-lg hover:from-[#2a3529] hover:to-[#3f5a4f] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {removingBg ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Quitando fondos {bgProgress.done}/{bgProgress.total}...</>
          ) : (
            <><Eraser className="h-4 w-4" />Quitar fondos ({itemsToGenerate.filter((s) => existingImages[s.id]).length})</>
          )}
        </button>

        {(running || removingBg) && (
          <button
            onClick={running ? handleCancel : handleCancelBgRemoval}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50 transition-colors"
          >
            <Square className="h-3.5 w-3.5" />
            Cancelar
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-[11px] text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Select all / none toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAll}
          disabled={running}
          className="text-[10px] text-[#8a7e6b] hover:text-[#2a2519] underline transition-colors disabled:opacity-50"
        >
          {checkedIds.size === items.length ? "Deseleccionar todos" : "Seleccionar todos"}
        </button>
        <span className="text-[10px] text-[#8a7e6b]">
          {checkedIds.size} de {items.length} seleccionados
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          const state = itemStates.find((s) => s.itemId === item.id)
          const galleryImages = gallery[item.id] ?? []
          const currentImage = existingImages[item.id] ?? null
          const images = currentImage && !galleryImages.includes(currentImage)
            ? [currentImage, ...galleryImages]
            : galleryImages
          const isChecked = checkedIds.has(item.id)

          return (
            <div
              key={item.id}
              className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${
                isChecked
                  ? "bg-[#faf8f4] border-[#2a2519]/40"
                  : "bg-[#f5f3ee] border-[#d4cfc4] opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleChecked(item.id)}
                    disabled={running}
                    className="h-3.5 w-3.5 rounded border-[#d4cfc4] text-[#2a2519] focus:ring-[#8a7e6b] cursor-pointer"
                  />
                  {bgRemovingIds.has(item.id) && (
                    <Eraser className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                  )}
                  {!bgRemovingIds.has(item.id) && bgDoneIds.has(item.id) && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {!bgRemovingIds.has(item.id) && state?.status === "generating" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8a7e6b]" />
                  )}
                  {!bgRemovingIds.has(item.id) && !bgDoneIds.has(item.id) && state?.status === "done" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {!bgRemovingIds.has(item.id) && state?.status === "error" && (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <button
                    type="button"
                    onClick={() => onPreviewItem?.(item)}
                    className="text-xs font-semibold text-[#2a2519] truncate max-w-[140px] hover:underline cursor-pointer"
                    title="Ver punto de libro"
                  >
                    {item.name}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onPreviewItem?.(item)}
                    className="p-1 text-[#8a7e6b] hover:text-[#2a2519] transition-colors"
                    title="Ver punto de libro"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegenerateSingle(item.id)}
                    disabled={regeneratingIds.has(item.id) || running}
                    className="p-1 text-[#8a7e6b] hover:text-[#2a2519] transition-colors disabled:opacity-40"
                    title="Generar otra imagen"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${regeneratingIds.has(item.id) ? "animate-spin" : ""}`}
                    />
                  </button>
                  {currentImage && (
                    <button
                      type="button"
                      onClick={() => handleClearItem(item.id)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                      title="Quitar imagen seleccionada"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Error */}
              {state?.error && (
                <p className="text-[9px] text-red-500 truncate">{state.error}</p>
              )}

              {/* Image gallery */}
              {images.length > 0 ? (
                <div className="flex gap-1.5 flex-wrap">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectImage(item.id, img)}
                      className={`relative w-16 h-24 rounded border-2 overflow-hidden transition-all hover:scale-105 ${
                        currentImage === img
                          ? "border-[#2a2519] ring-2 ring-[#2a2519]/30"
                          : "border-[#d4cfc4] opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`${item.name} opcion ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {currentImage === img && (
                        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#2a2519] rounded-full flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-[10px] text-[#8a7e6b] italic">
                  {state?.status === "generating"
                    ? "Generando imagen..."
                    : "Sin imagenes aun"}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
