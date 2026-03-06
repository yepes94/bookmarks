"use client"

import { useState, useCallback, useEffect } from "react"
import { saints, type Saint } from "@/lib/saints-data"
import type { ExtractedColors } from "@/lib/color-utils"

const STORAGE_KEY_IMAGES = "santos-custom-images"
const STORAGE_KEY_COLORS = "santos-custom-colors"

function loadFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function saveToStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Storage full or unavailable - silently fail
  }
}
import { SaintSelector } from "@/components/saint-selector"
import { BookmarkFront } from "@/components/bookmark-front"
import { BookmarkBack } from "@/components/bookmark-back"
import { PrintView } from "@/components/print-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Printer, Eye, Save, Trash2 } from "lucide-react"
import "@/app/bookmark-styles.css"

export default function HomePage() {
  const [selectedSaints, setSelectedSaints] = useState<Saint[]>([saints[0]])
  const [previewSaint, setPreviewSaint] = useState<Saint>(saints[0])
  const [year, setYear] = useState(2026)
  const [activeTab, setActiveTab] = useState("preview")
  const [customImages, setCustomImages] = useState<Record<string, string>>({})
  const [customColors, setCustomColors] = useState<Record<string, ExtractedColors>>({})
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const savedImages = loadFromStorage<Record<string, string>>(STORAGE_KEY_IMAGES)
    const savedColors = loadFromStorage<Record<string, ExtractedColors>>(STORAGE_KEY_COLORS)
    if (savedImages) setCustomImages(savedImages)
    if (savedColors) setCustomColors(savedColors)
    setHasLoadedStorage(true)
  }, [])

  // Save to localStorage on changes
  useEffect(() => {
    if (!hasLoadedStorage) return
    saveToStorage(STORAGE_KEY_IMAGES, customImages)
  }, [customImages, hasLoadedStorage])

  useEffect(() => {
    if (!hasLoadedStorage) return
    saveToStorage(STORAGE_KEY_COLORS, customColors)
  }, [customColors, hasLoadedStorage])

  const handleImageChange = useCallback((saintId: string, dataUrl: string, colors?: ExtractedColors) => {
    setCustomImages((prev) => ({ ...prev, [saintId]: dataUrl }))
    if (colors) {
      setCustomColors((prev) => ({ ...prev, [saintId]: colors }))
    }
  }, [])

  const handleImageRemove = useCallback((saintId: string) => {
    setCustomImages((prev) => {
      const next = { ...prev }
      delete next[saintId]
      return next
    })
    setCustomColors((prev) => {
      const next = { ...prev }
      delete next[saintId]
      return next
    })
  }, [])

  const handleToggleSaint = useCallback(
    (saint: Saint) => {
      setSelectedSaints((prev) => {
        const exists = prev.some((s) => s.id === saint.id)
        if (exists) {
          return prev.filter((s) => s.id !== saint.id)
        }
        return [...prev, saint]
      })
      setPreviewSaint(saint)
    },
    []
  )

  const handleSelectAll = useCallback(() => {
    setSelectedSaints([...saints])
  }, [])

  const handleDeselectAll = useCallback(() => {
    setSelectedSaints([])
  }, [])

  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      {/* Header */}
      <header className="no-print border-b border-[#d4cfc4] bg-[#faf8f4]">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2a2519] flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-[#f5f0e8]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#2a2519] font-serif leading-tight">
                Santos Patronos
              </h1>
              <p className="text-xs text-[#8a7e6b]">
                Creador de puntos de libro
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {Object.keys(customImages).length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{Object.keys(customImages).length} imagen{Object.keys(customImages).length !== 1 ? "es" : ""} guardada{Object.keys(customImages).length !== 1 ? "s" : ""}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Eliminar todas las imagenes personalizadas guardadas?")) {
                      setCustomImages({})
                      setCustomColors({})
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-700 hover:bg-red-50 rounded transition-colors"
                  type="button"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              </>
            )}
            <label className="text-xs text-[#8a7e6b] font-medium">Ano:</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-20 px-2 py-1.5 text-sm bg-[#faf8f4] border border-[#d4cfc4] rounded text-[#2a2519] focus:outline-none focus:ring-1 focus:ring-[#8a7e6b]"
              min={2020}
              max={2050}
            />
          </div>
        </div>
      </header>

      <div className="no-print max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#e8e0d0] border border-[#d4cfc4]">
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-[#faf8f4] data-[state=active]:text-[#2a2519] text-[#8a7e6b] gap-2"
            >
              <Eye className="h-4 w-4" />
              Vista previa
            </TabsTrigger>
            <TabsTrigger
              value="print"
              className="data-[state=active]:bg-[#faf8f4] data-[state=active]:text-[#2a2519] text-[#8a7e6b] gap-2"
            >
              <Printer className="h-4 w-4" />
              Preparar impresion
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-6">
            <div className="flex gap-6 flex-col lg:flex-row">
              {/* Left: Saint Selector */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="sticky top-4">
                  <h2 className="text-sm font-semibold text-[#2a2519] mb-3 uppercase tracking-wider">
                    Seleccionar santos
                  </h2>
                  <SaintSelector
                    selectedSaints={selectedSaints}
                    onToggleSaint={handleToggleSaint}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                  />
                </div>
              </div>

              {/* Right: Bookmark Preview */}
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-[#2a2519] mb-3 uppercase tracking-wider">
                  Vista previa del punto de libro
                </h2>

                {/* Quick saint navigation for preview */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedSaints.map((saint) => (
                    <button
                      key={saint.id}
                      onClick={() => setPreviewSaint(saint)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        previewSaint.id === saint.id
                          ? "bg-[#2a2519] text-[#faf8f4]"
                          : "bg-[#e8e0d0] text-[#6b5d3e] hover:bg-[#d4cfc4]"
                      }`}
                    >
                      {saint.name}
                    </button>
                  ))}
                </div>

                {/* Bookmark display */}
                <div className="flex items-start justify-center">
                  <div className="bookmark-preview-pair">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-[#8a7e6b] font-medium uppercase tracking-wider">
                        Frontal
                      </span>
                      <BookmarkFront
                        saint={previewSaint}
                        year={year}
                        customImage={customImages[previewSaint.id] || null}
                        customColors={customColors[previewSaint.id] || null}
                        onImageChange={(dataUrl, colors) =>
                          handleImageChange(previewSaint.id, dataUrl, colors)
                        }
                        onImageRemove={() =>
                          handleImageRemove(previewSaint.id)
                        }
                        editable
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-[#8a7e6b] font-medium uppercase tracking-wider">
                        Reverso
                      </span>
                      <BookmarkBack saint={previewSaint} customColors={customColors[previewSaint.id] || null} />
                    </div>
                  </div>
                </div>

                {/* Upload hint */}
                <p className="text-center text-xs text-[#8a7e6b] mt-4 italic">
                  Toca la imagen para subir, recortar y ajustar tu propia foto
                </p>

                {/* Extracted color palette */}
                {customColors[previewSaint.id] && (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <span className="text-[10px] text-[#8a7e6b] uppercase tracking-wider font-semibold">
                      Colores detectados:
                    </span>
                    <div className="flex gap-1.5">
                      {customColors[previewSaint.id].palette.map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-[#faf8f4] shadow-sm"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Saint info card */}
                <div className="mt-6 p-5 bg-[#faf8f4] rounded-lg border border-[#d4cfc4] max-w-lg mx-auto">
                  <h3 className="font-bold text-[#2a2519] font-serif text-lg">
                    {previewSaint.name}
                  </h3>
                  <p className="text-sm text-[#6b5d3e] mt-1 font-medium">
                    {previewSaint.feastDay} &middot; {previewSaint.period}
                  </p>
                  <p className="text-sm text-[#5a5040] mt-3 leading-relaxed italic font-serif">
                    {previewSaint.description}
                  </p>
                  <p className="text-xs text-[#8a7e6b] mt-3 uppercase tracking-wider font-semibold">
                    {previewSaint.virtue}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="print" className="mt-6">
            <PrintView selectedSaints={selectedSaints} year={year} customImages={customImages} customColors={customColors} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Print-only content */}
      <div className="hidden print:block">
        <PrintView selectedSaints={selectedSaints} year={year} customImages={customImages} customColors={customColors} />
      </div>
    </main>
  )
}
