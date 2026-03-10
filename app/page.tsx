"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { saintsAsBookmarkItems } from "@/lib/saints-data"
import { projectItemToBookmarkItem, type ProjectItemRecord } from "@/lib/project-items"
import type { ExtractedColors } from "@/lib/color-utils"
import { ItemSelector } from "@/components/item-selector"
import { BookmarkFront, type CustomItemTexts } from "@/components/bookmark-front"
import { BookmarkBack } from "@/components/bookmark-back"
import { PrintView } from "@/components/print-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BackgroundPoolManager } from "@/components/background-generate-button"
import { BatchGenerateButton } from "@/components/batch-generate-button"
import { BackgroundEditor } from "@/components/background-editor"
import { ImageGallery } from "@/components/image-gallery"
import { ProjectSelector, getStoredProjectId } from "@/components/project-selector"
import { compressImageDataUrl, compressBackgroundDataUrl } from "@/lib/image-compress"
import { BookOpen, Printer, Save, Trash2, Layout, Pencil, Wand2, Images, ArrowLeft } from "lucide-react"
import { defaultTemplate, defaultItemBackground, defaultItemImageSize, presetTemplates, layoutLabels, imagePositionLabels, pickBackground, type BookmarkTemplate, type BookmarkLayout, type ImagePosition, type ItemBackground, type ItemImageSize } from "@/lib/template-config"
import { buildItemPrompt } from "@/lib/visual-details"
import "@/app/bookmark-styles.css"

const STORAGE_KEY_COLORS = "bookmark-custom-colors"
const STORAGE_KEY_BG_ASSIGNMENTS = "bookmark-bg-assignments"
const STORAGE_KEY_TEMPLATE = "bookmark-template"
const STORAGE_KEY_SAVED_DESIGNS = "bookmark-saved-designs"
const STORAGE_KEY_CUSTOM_TEXTS = "bookmark-custom-texts"
const STORAGE_KEY_ITEM_BACKGROUNDS = "bookmark-item-backgrounds"
const STORAGE_KEY_ITEM_IMAGE_SIZES = "bookmark-item-image-sizes"
const STORAGE_KEY_ITEM_PROMPTS = "bookmark-item-prompts"

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
    console.warn(`localStorage full, could not save ${key}`)
  }
}

function GeneratePromptTemplateButton({ projectId, onGenerated }: { projectId: string; onGenerated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = useCallback(async () => {
    const apiKey = typeof window !== "undefined" ? localStorage.getItem("bookmark-ai-google-key") : null
    if (!apiKey) {
      setError("Configura tu API key primero (en Editar > generar imagen)")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-prompt-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al generar")
      onGenerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [projectId, onGenerated])

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#6b5d3e]">
        Genera una plantilla de prompt con IA para las ilustraciones de este proyecto.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 border border-[#d4cfc4] text-[#2a2519] rounded-lg text-sm font-medium hover:bg-[#f0ebe0] disabled:opacity-50"
      >
        {loading ? "Generando..." : "Generar plantilla de prompt con IA"}
      </button>
    </div>
  )
}

export default function HomePage() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectType, setProjectType] = useState<string | null>(null)
  const [projectPromptTemplate, setProjectPromptTemplate] = useState<string | null>(null)

  const [projectItems, setProjectItems] = useState<ProjectItemRecord[]>([])
  const [itemsLoaded, setItemsLoaded] = useState(false)

  const items = useMemo(() => {
    if (projectItems.length > 0) {
      return projectItems.map(projectItemToBookmarkItem)
    }
    if (projectType === "santos" || projectType === null) {
      return saintsAsBookmarkItems()
    }
    return []
  }, [projectItems, projectType])

  const [selectedItems, setSelectedItems] = useState<import("@/lib/bookmark-item").BookmarkItem[]>([])
  const [editItem, setEditItem] = useState<import("@/lib/bookmark-item").BookmarkItem | null>(null)
  const [year, setYear] = useState(2026)
  const [activeTab, setActiveTab] = useState("edit")
  const [customImages, setCustomImages] = useState<Record<string, string>>({})
  const [customColors, setCustomColors] = useState<Record<string, ExtractedColors>>({})
  const [backgroundPool, setBackgroundPool] = useState<string[]>([])
  const [bgAssignments, setBgAssignments] = useState<Record<string, number>>({})
  const [imageGallery, setImageGallery] = useState<Record<string, string[]>>({})
  const [template, setTemplate] = useState<BookmarkTemplate>(defaultTemplate)
  const [savedDesigns, setSavedDesigns] = useState<BookmarkTemplate[]>([])
  const [customTexts, setCustomTexts] = useState<Record<string, CustomItemTexts>>({})
  const [itemBackgrounds, setItemBackgrounds] = useState<Record<string, ItemBackground>>({})
  const [itemImageSizes, setItemImageSizes] = useState<Record<string, ItemImageSize>>({})
  const [itemPrompts, setItemPrompts] = useState<Record<string, string>>({})
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false)

  useEffect(() => {
    const stored = getStoredProjectId()
    if (stored) setProjectId(stored)
  }, [])

  useEffect(() => {
    if (!projectId) {
      setProjectType(null)
      setProjectPromptTemplate(null)
      return
    }
    let cancelled = false
    fetch("/api/projects")
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (!data || !Array.isArray(data.projects)) return
        if (cancelled) return
        const project = data.projects.find((p: { id: string }) => p.id === projectId)
        if (project) {
          setProjectType(typeof project.type === "string" ? project.type : null)
          setProjectPromptTemplate(typeof (project as { promptTemplate?: string }).promptTemplate === "string"
            ? (project as { promptTemplate: string }).promptTemplate
            : null)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    setItemsLoaded(false)
    fetch(`/api/projects/${projectId}/items`, { method: "GET" })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        setProjectItems(items)
      })
      .catch(() => {})
      .finally(() => setItemsLoaded(true))
  }, [projectId])

  useEffect(() => {
    if (items.length > 0 && !editItem) {
      setEditItem(items[0])
      setSelectedItems([items[0]])
    } else if (items.length > 0 && editItem && !items.find((s) => s.id === editItem.id)) {
      setEditItem(items[0])
      setSelectedItems([items[0]])
    }
  }, [items, editItem])

  useEffect(() => {
    if (!projectId) return
    const prefix = `project:${projectId}:`
    const savedColorsRaw = loadFromStorage<Record<string, unknown>>(prefix + STORAGE_KEY_COLORS)
      ?? loadFromStorage<Record<string, unknown>>(prefix + "santos-custom-colors")
    const savedTemplateRaw = loadFromStorage<Record<string, unknown>>(prefix + STORAGE_KEY_TEMPLATE)
      ?? loadFromStorage<Record<string, unknown>>(prefix + "santos-template")
    const savedDesignsData = loadFromStorage<BookmarkTemplate[]>(prefix + STORAGE_KEY_SAVED_DESIGNS)
      ?? loadFromStorage<BookmarkTemplate[]>(prefix + "santos-saved-designs")
    const savedBgAssignments = loadFromStorage<Record<string, number>>(prefix + STORAGE_KEY_BG_ASSIGNMENTS)
      ?? loadFromStorage<Record<string, number>>(prefix + "santos-bg-assignments")
    const savedCustomTexts = loadFromStorage<Record<string, CustomItemTexts>>(prefix + STORAGE_KEY_CUSTOM_TEXTS)
      ?? loadFromStorage<Record<string, { displayName?: string; virtue?: string; prayer?: string }>>(prefix + "santos-custom-texts")
    const savedItemBgs = loadFromStorage<Record<string, ItemBackground>>(prefix + STORAGE_KEY_ITEM_BACKGROUNDS)
      ?? loadFromStorage<Record<string, ItemBackground>>(prefix + "santos-saint-backgrounds")
    const savedItemSizes = loadFromStorage<Record<string, ItemImageSize>>(prefix + STORAGE_KEY_ITEM_IMAGE_SIZES)
      ?? loadFromStorage<Record<string, ItemImageSize>>(prefix + "santos-saint-image-sizes")
    const savedItemPrompts = loadFromStorage<Record<string, string>>(prefix + STORAGE_KEY_ITEM_PROMPTS)
      ?? loadFromStorage<Record<string, string>>(prefix + "santos-saint-prompts")

    if (savedColorsRaw) {
      const migrated: Record<string, ExtractedColors> = {}
      for (const [k, v] of Object.entries(savedColorsRaw)) {
        if (v && typeof v === "object") {
          const o = v as Record<string, unknown>
          migrated[k] = {
            dominant: typeof o.dominant === "string" ? o.dominant : "#b8d4e3",
            secondary: typeof o.secondary === "string" ? o.secondary : "#b5c9a8",
            colorFront: typeof o.colorFront === "string" ? o.colorFront : typeof (o as { watercolorFront?: string }).watercolorFront === "string" ? (o as { watercolorFront: string }).watercolorFront : "hsl(200, 40%, 78%)",
            colorBack: typeof o.colorBack === "string" ? o.colorBack : typeof (o as { watercolorBack?: string }).watercolorBack === "string" ? (o as { watercolorBack: string }).watercolorBack : "hsl(120, 35%, 80%)",
            palette: Array.isArray(o.palette) ? (o.palette as string[]) : [],
            backgroundColor: (o.backgroundColor as string | null) ?? null,
          }
        }
      }
      setCustomColors(migrated)
    }
    if (savedTemplateRaw) {
      const t = savedTemplateRaw as Record<string, unknown>
      const b = (v: unknown) => (typeof v === "boolean" ? v : undefined)
      setTemplate({
        ...defaultTemplate,
        ...t,
        showPrefix: b(t.showPrefix) ?? b(t.showSaintTitle) ?? defaultTemplate.showPrefix,
        showSubtitle: b(t.showSubtitle) ?? b(t.showFeastDay) ?? defaultTemplate.showSubtitle,
        showTagline: b(t.showTagline) ?? b(t.showVirtue) ?? defaultTemplate.showTagline,
        showQuote: b(t.showQuote) ?? b(t.showPrayer) ?? defaultTemplate.showQuote,
        showMetadata: b(t.showMetadata) ?? b(t.showPeriod) ?? defaultTemplate.showMetadata,
      })
    }
    if (savedDesignsData) setSavedDesigns(savedDesignsData)
    if (savedBgAssignments) setBgAssignments(savedBgAssignments)
    if (savedCustomTexts) {
      const migrated: Record<string, CustomItemTexts> = {}
      for (const [k, v] of Object.entries(savedCustomTexts)) {
        if (v && typeof v === "object") {
          const o = v as Record<string, unknown>
          migrated[k] = {
            displayName: typeof o.displayName === "string" ? o.displayName : undefined,
            tagline: typeof o.tagline === "string" ? o.tagline : typeof (o as { virtue?: string }).virtue === "string" ? (o as { virtue: string }).virtue : undefined,
            quote: typeof o.quote === "string" ? o.quote : typeof (o as { prayer?: string }).prayer === "string" ? (o as { prayer: string }).prayer : undefined,
          }
        }
      }
      setCustomTexts(migrated)
    }
    if (savedItemBgs) setItemBackgrounds(savedItemBgs)
    if (savedItemSizes) setItemImageSizes(savedItemSizes)
    if (savedItemPrompts) setItemPrompts(savedItemPrompts)

    fetch(`/api/projects/${projectId}/state`, { method: "GET" })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        const customImagesData =
          data?.customImages && typeof data.customImages === "object"
            ? (data.customImages as Record<string, string>)
            : {}
        const galleryData =
          data?.gallery && typeof data.gallery === "object" ? (data.gallery as Record<string, string[]>) : {}
        const backgroundPoolData = Array.isArray(data?.backgroundPool) ? (data.backgroundPool as string[]) : []
        const templateData = data?.template && typeof data.template === "object" ? data.template : null

        setCustomImages(customImagesData)
        setBackgroundPool(backgroundPoolData)
        setImageGallery(galleryData)
        if (templateData && Object.keys(templateData).length > 0) {
          setTemplate((prev) => ({ ...defaultTemplate, ...prev, ...templateData }))
        }
        setHasLoadedStorage(true)
      })
      .catch(() => {
        setHasLoadedStorage(true)
      })
  }, [projectId])

  useEffect(() => {
    if (!hasLoadedStorage || !projectId) return
    const payload = {
      customImages,
      gallery: imageGallery,
      backgroundPool,
      template,
    }
    fetch(`/api/projects/${projectId}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {})
  }, [customImages, imageGallery, backgroundPool, template, hasLoadedStorage, projectId])

  const storagePrefix = projectId ? `project:${projectId}:` : ""

  useEffect(() => {
    if (!hasLoadedStorage || !projectId) return
    saveToStorage(storagePrefix + STORAGE_KEY_COLORS, customColors)
  }, [customColors, hasLoadedStorage, projectId, storagePrefix])


  useEffect(() => {
    if (!hasLoadedStorage || !projectId) return
    saveToStorage(storagePrefix + STORAGE_KEY_BG_ASSIGNMENTS, bgAssignments)
  }, [bgAssignments, hasLoadedStorage, projectId, storagePrefix])

  useEffect(() => {
    if (!hasLoadedStorage || !projectId) return
    saveToStorage(storagePrefix + STORAGE_KEY_TEMPLATE, template)
  }, [template, hasLoadedStorage, projectId, storagePrefix])

  useEffect(() => {
    if (!hasLoadedStorage || !projectId) return
    saveToStorage(storagePrefix + STORAGE_KEY_CUSTOM_TEXTS, customTexts)
  }, [customTexts, hasLoadedStorage, projectId, storagePrefix])

  useEffect(() => {
    if (!hasLoadedStorage || !projectId) return
    saveToStorage(storagePrefix + STORAGE_KEY_SAVED_DESIGNS, savedDesigns)
  }, [savedDesigns, hasLoadedStorage, projectId, storagePrefix])

  useEffect(() => {
    if (!hasLoadedStorage || !projectId) return
    saveToStorage(storagePrefix + STORAGE_KEY_ITEM_BACKGROUNDS, itemBackgrounds)
  }, [itemBackgrounds, hasLoadedStorage, projectId, storagePrefix])

  useEffect(() => {
    if (!hasLoadedStorage || !projectId) return
    saveToStorage(storagePrefix + STORAGE_KEY_ITEM_IMAGE_SIZES, itemImageSizes)
  }, [itemImageSizes, hasLoadedStorage, projectId, storagePrefix])

  useEffect(() => {
    if (!hasLoadedStorage || !projectId) return
    saveToStorage(storagePrefix + STORAGE_KEY_ITEM_PROMPTS, itemPrompts)
  }, [itemPrompts, hasLoadedStorage, projectId, storagePrefix])

  const handleItemPromptChange = useCallback((itemId: string, value: string) => {
    setItemPrompts((prev) => {
      if (!value.trim()) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: value.trim() }
    })
  }, [])

  const handleTemplateChange = useCallback(<K extends keyof BookmarkTemplate>(key: K, value: BookmarkTemplate[K]) => {
    setTemplate((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleItemBackgroundChange = useCallback((itemId: string, key: keyof ItemBackground, value: ItemBackground[keyof ItemBackground]) => {
    setItemBackgrounds((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? defaultItemBackground), [key]: value },
    }))
  }, [])

  const handleItemImageSizeChange = useCallback((itemId: string, key: keyof ItemImageSize, value: number) => {
    setItemImageSizes((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? defaultItemImageSize), [key]: value },
    }))
  }, [])

  const handleSaveDesign = useCallback(() => {
    const name = prompt("Nombre del diseno:")
    if (!name?.trim()) return
    const newDesign: BookmarkTemplate = { ...template, name: name.trim() }
    setSavedDesigns((prev) => [...prev, newDesign])
  }, [template])

  const handleDeleteDesign = useCallback((index: number) => {
    setSavedDesigns((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleImageChange = useCallback((itemId: string, dataUrl: string, colors?: ExtractedColors) => {
    setCustomImages((prev) => ({ ...prev, [itemId]: dataUrl }))
    if (colors) {
      setCustomColors((prev) => ({ ...prev, [itemId]: colors }))
    }
  }, [])

  const handleAddBackground = useCallback((dataUrl: string) => {
    setBackgroundPool((prev) => [...prev, dataUrl])
  }, [])

  const handleRemoveBackground = useCallback((index: number) => {
    setBackgroundPool((prev) => prev.filter((_, i) => i !== index))
    setBgAssignments((prev) => {
      const next: Record<string, number> = {}
      for (const [saintId, idx] of Object.entries(prev)) {
        if (idx === index) continue
        next[saintId] = idx > index ? idx - 1 : idx
      }
      return next
    })
  }, [])

  const handleAssignBackground = useCallback((saintId: string, poolIndex: number | null) => {
    setBgAssignments((prev) => {
      if (poolIndex === null) {
        const next = { ...prev }
        delete next[saintId]
        return next
      }
      return { ...prev, [saintId]: poolIndex }
    })
  }, [])

  const handleAddToGallery = useCallback((saintId: string, dataUrl: string) => {
    setImageGallery((prev) => {
      const existing = prev[saintId] ?? []
      return { ...prev, [saintId]: [...existing, dataUrl] }
    })
  }, [])

  const handleRemoveFromGallery = useCallback((saintId: string, index: number) => {
    setImageGallery((prev) => {
      const existing = prev[saintId] ?? []
      const removed = existing[index]
      const updated = existing.filter((_, i) => i !== index)
      if (removed) {
        setCustomImages((ci) => {
          if (ci[saintId] === removed) {
            const next = { ...ci }
            delete next[saintId]
            return next
          }
          return ci
        })
      }
      return { ...prev, [saintId]: updated }
    })
  }, [])

  const handleTextChange = useCallback((itemId: string, field: keyof CustomItemTexts, value: string) => {
    setCustomTexts((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }))
  }, [])

  const handleImageRemove = useCallback((saintId: string) => {
    setCustomImages((prev) => ({
      ...prev,
      [saintId]: "",
    }))
    setCustomColors((prev) => {
      const next = { ...prev }
      delete next[saintId]
      return next
    })
  }, [])

  const handleToggleItem = useCallback(
    (item: import("@/lib/bookmark-item").BookmarkItem) => {
      setSelectedItems((prev) => {
        const exists = prev.some((s) => s.id === item.id)
        if (exists) {
          return prev.filter((s) => s.id !== item.id)
        }
        return [...prev, item]
      })
    },
    []
  )

  const handleSelectAll = useCallback(() => {
    setSelectedItems([...items])
  }, [])

  const handleDeselectAll = useCallback(() => {
    setSelectedItems([])
  }, [])

  const getBackground = useCallback((saintId: string): string | null => {
    if (backgroundPool.length === 0) return null
    const assigned = bgAssignments[saintId]
    if (assigned !== undefined && assigned < backgroundPool.length) {
      return backgroundPool[assigned]
    }
    return pickBackground(backgroundPool, saintId)
  }, [backgroundPool, bgAssignments])

  const itemNavList = useMemo(() => items, [items])

  const handleBackToProjects = useCallback(() => {
    setProjectId(null)
    setProjectType(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem("bookmark-current-project-id")
      localStorage.removeItem("santos-current-project-id")
    }
  }, [])

  const [catalogTopic, setCatalogTopic] = useState("")
  const [catalogCount, setCatalogCount] = useState(10)
  const [catalogModel, setCatalogModel] = useState("gemini-3.1-flash-lite-preview")
  const [generatingCatalog, setGeneratingCatalog] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [manualTitle, setManualTitle] = useState("")
  const [manualDesc, setManualDesc] = useState("")
  const [addingManual, setAddingManual] = useState(false)
  const [compressingAll, setCompressingAll] = useState(false)

  const handleDedupeImages = useCallback(() => {
    setImageGallery((prev) => {
      const next: Record<string, string[]> = {}
      for (const [k, arr] of Object.entries(prev)) {
        const seen = new Set<string>()
        const deduped = arr.filter((url) => {
          const norm = url?.trim() ?? ""
          if (!norm || seen.has(norm)) return false
          seen.add(norm)
          return true
        })
        if (deduped.length > 0) next[k] = deduped
      }
      return next
    })
    setBackgroundPool((prev) => {
      const seen = new Set<string>()
      return prev.filter((url) => {
        const norm = url?.trim() ?? ""
        if (!norm || seen.has(norm)) return false
        seen.add(norm)
        return true
      })
    })
  }, [])

  const handleCompressAllImages = useCallback(async () => {
    if (!projectId) return
    if (!confirm("Comprimir todas las imagenes guardadas? Puede tardar unos segundos.")) return

    setCompressingAll(true)
    try {
      const nextCustom: Record<string, string> = {}
      for (const [k, v] of Object.entries(customImages)) {
        if (v) {
          nextCustom[k] = await compressImageDataUrl(v)
        }
      }

      const nextGallery: Record<string, string[]> = {}
      for (const [k, arr] of Object.entries(imageGallery)) {
        const out: string[] = []
        for (const url of arr) {
          if (url) out.push(await compressImageDataUrl(url))
        }
        if (out.length > 0) nextGallery[k] = out
      }

      const nextBackgrounds: string[] = []
      for (const bg of backgroundPool) {
        if (bg) nextBackgrounds.push(await compressBackgroundDataUrl(bg))
      }

      if (Object.keys(nextCustom).length > 0) {
        setCustomImages(nextCustom)
      }
      if (Object.keys(nextGallery).length > 0) {
        setImageGallery(nextGallery)
      }
      if (nextBackgrounds.length > 0) {
        setBackgroundPool(nextBackgrounds)
      }
    } finally {
      setCompressingAll(false)
    }
  }, [projectId, customImages, imageGallery, backgroundPool])

  const handleSeedSaints = useCallback(async () => {
    if (!projectId) return
    const res = await fetch(`/api/projects/${projectId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedFromSaints: true }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.items) {
        setProjectItems(data.items)
        if (data.items[0]) {
          const first = projectItemToBookmarkItem(data.items[0])
          setEditItem(first)
          setSelectedItems([first])
        }
      }
    }
  }, [projectId])

  const handleGenerateCatalog = useCallback(async () => {
    if (!projectId || !catalogTopic.trim()) return
    setGeneratingCatalog(true)
    setCatalogError(null)
    try {
      const apiKey = typeof window !== "undefined" ? localStorage.getItem("bookmark-ai-google-key") : null
      const res = await fetch(`/api/projects/${projectId}/generate-catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: catalogTopic.trim(),
          count: catalogCount,
          apiKey,
          model: catalogModel,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al generar")
      if (data.items?.length) {
        setProjectItems((prev) => [...prev, ...data.items])
        const first = projectItemToBookmarkItem(data.items[0])
        setEditItem(first)
        setSelectedItems([first])
      }
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setGeneratingCatalog(false)
    }
  }, [projectId, catalogTopic, catalogCount, catalogModel])

  const handleAddManual = useCallback(async () => {
    if (!projectId || !manualTitle.trim()) return
    setAddingManual(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: manualTitle.trim(), description: manualDesc.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al añadir")
      setProjectItems((prev) => [...prev, data])
      const view = projectItemToBookmarkItem(data)
      setEditItem(view)
      setSelectedItems([view])
      setManualTitle("")
      setManualDesc("")
    } catch {
      // ignore
    } finally {
      setAddingManual(false)
    }
  }, [projectId, manualTitle, manualDesc])

  if (!projectId) {
    return (
      <ProjectSelector
        onSelectProject={(id, type) => {
          setProjectId(id)
          setProjectType(type ?? null)
          setHasLoadedStorage(false)
        }}
      />
    )
  }

  if (itemsLoaded && items.length === 0) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] flex flex-col">
        <header className="border-b border-[#d4cfc4] bg-[#faf8f4] px-4 py-3">
          <button
            type="button"
            onClick={handleBackToProjects}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#8a7e6b] hover:text-[#2a2519] rounded"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Proyectos
          </button>
        </header>
        <div className="flex-1 max-w-xl mx-auto w-full p-8 space-y-8">
          <h2 className="text-lg font-semibold text-[#2a2519]">Proyecto sin fichas</h2>

          <div className="bg-[#faf8f4] border border-[#d4cfc4] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#2a2519]">Generar catalogo con IA</h3>
            <input
              type="text"
              value={catalogTopic}
              onChange={(e) => setCatalogTopic(e.target.value)}
              placeholder="Ej: Santos de Europa, Ciudades italianas..."
              className="w-full px-3 py-2 text-sm border border-[#d4cfc4] rounded-lg text-[#2a2519]"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#8a7e6b]">Cantidad:</label>
              <input
                type="number"
                value={catalogCount}
                onChange={(e) => setCatalogCount(Number(e.target.value))}
                min={1}
                max={50}
                className="w-20 px-2 py-1 text-sm border border-[#d4cfc4] rounded"
              />
              <label className="ml-4 text-xs text-[#8a7e6b]">Modelo:</label>
              <select
                value={catalogModel}
                onChange={(e) => setCatalogModel(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-[#d4cfc4] rounded bg-white text-[#2a2519]"
              >
                <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite (rápido, barato)</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash (equilibrado)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (mejor calidad)</option>
              </select>
            </div>
            {catalogError && <p className="text-xs text-red-600">{catalogError}</p>}
            <button
              type="button"
              onClick={handleGenerateCatalog}
              disabled={!catalogTopic.trim() || generatingCatalog}
              className="px-4 py-2 bg-[#2a2519] text-[#faf8f4] rounded-lg text-sm font-medium hover:bg-[#3d3525] disabled:opacity-50"
            >
              {generatingCatalog ? "Generando..." : "Generar con IA"}
            </button>
          </div>

          <div className="bg-[#faf8f4] border border-[#d4cfc4] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#2a2519]">Añadir ficha manual</h3>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Nombre"
              className="w-full px-3 py-2 text-sm border border-[#d4cfc4] rounded-lg text-[#2a2519]"
            />
            <textarea
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="Descripcion (opcional)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[#d4cfc4] rounded-lg text-[#2a2519] resize-none"
            />
            <button
              type="button"
              onClick={handleAddManual}
              disabled={!manualTitle.trim() || addingManual}
              className="px-4 py-2 border border-[#d4cfc4] text-[#2a2519] rounded-lg text-sm font-medium hover:bg-[#f0ebe0] disabled:opacity-50"
            >
              {addingManual ? "Añadiendo..." : "Añadir"}
            </button>
          </div>

          {projectType === "santos" && (
            <div className="border-t border-[#d4cfc4] pt-6">
              <button
                type="button"
                onClick={handleSeedSaints}
                className="px-4 py-2 bg-[#2a2519] text-[#faf8f4] rounded-lg text-sm font-medium hover:bg-[#3d3525]"
              >
                Cargar catalogo de santos (predeterminado)
              </button>
            </div>
          )}
          {projectType !== "santos" && projectType !== null && !projectPromptTemplate && (
            <div className="border-t border-[#d4cfc4] pt-6">
              <GeneratePromptTemplateButton
                projectId={projectId}
                onGenerated={() => {
                  fetch("/api/projects")
                    .then((r) => r.json())
                    .then((d) => {
                      const p = d.projects?.find((x: { id: string }) => x.id === projectId)
                      if (p?.promptTemplate) setProjectPromptTemplate(p.promptTemplate)
                    })
                    .catch(() => {})
                }}
              />
            </div>
          )}
        </div>
      </main>
    )
  }

  if (!editItem) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <p className="text-sm text-[#8a7e6b]">Cargando proyecto...</p>
      </main>
    )
  }

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
                Puntos de Libro
              </h1>
              <p className="text-xs text-[#8a7e6b]">
                Creador de puntos de libro
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToProjects}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#8a7e6b] hover:text-[#2a2519] hover:bg-[#f0ebe0] rounded transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Proyectos
            </button>
            <button
              onClick={handleDedupeImages}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#6b5d3e] hover:text-[#2a2519] hover:bg-[#f0ebe0] rounded transition-colors"
              type="button"
              title="Quitar imagenes duplicadas en galería y fondos"
            >
              Quitar duplicados
            </button>
            <button
              onClick={handleCompressAllImages}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#6b5d3e] hover:text-[#2a2519] hover:bg-[#f0ebe0] rounded transition-colors disabled:opacity-50"
              type="button"
              disabled={compressingAll}
              title="Comprimir todas las imagenes ya guardadas"
            >
              {compressingAll ? "Comprimiendo..." : "Comprimir imagenes"}
            </button>
            {Object.values(customImages).filter(Boolean).length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{Object.values(customImages).filter(Boolean).length} imagen{Object.values(customImages).filter(Boolean).length !== 1 ? "es" : ""} guardada{Object.values(customImages).filter(Boolean).length !== 1 ? "s" : ""}</span>
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
          <TabsList className="bg-[#e8e0d0]/60 border border-[#d4cfc4] p-1 h-auto gap-1">
            <TabsTrigger
              value="edit"
              className="cursor-pointer data-[state=active]:bg-[#faf8f4] data-[state=active]:text-[#2a2519] data-[state=active]:shadow-sm text-[#8a7e6b] hover:text-[#5a5243] hover:bg-[#f0ebe0] gap-2 px-4 py-2 rounded-md transition-all"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </TabsTrigger>
            <TabsTrigger
              value="batch"
              className="cursor-pointer data-[state=active]:bg-[#faf8f4] data-[state=active]:text-[#2a2519] data-[state=active]:shadow-sm text-[#8a7e6b] hover:text-[#5a5243] hover:bg-[#f0ebe0] gap-2 px-4 py-2 rounded-md transition-all"
            >
              <Wand2 className="h-4 w-4" />
              Generación IA
            </TabsTrigger>
            <TabsTrigger
              value="gallery"
              className="cursor-pointer data-[state=active]:bg-[#faf8f4] data-[state=active]:text-[#2a2519] data-[state=active]:shadow-sm text-[#8a7e6b] hover:text-[#5a5243] hover:bg-[#f0ebe0] gap-2 px-4 py-2 rounded-md transition-all"
            >
              <Images className="h-4 w-4" />
              Galería
            </TabsTrigger>
            <TabsTrigger
              value="template"
              className="cursor-pointer data-[state=active]:bg-[#faf8f4] data-[state=active]:text-[#2a2519] data-[state=active]:shadow-sm text-[#8a7e6b] hover:text-[#5a5243] hover:bg-[#f0ebe0] gap-2 px-4 py-2 rounded-md transition-all"
            >
              <Layout className="h-4 w-4" />
              Plantilla
            </TabsTrigger>
            <TabsTrigger
              value="print"
              className="cursor-pointer data-[state=active]:bg-[#faf8f4] data-[state=active]:text-[#2a2519] data-[state=active]:shadow-sm text-[#8a7e6b] hover:text-[#5a5243] hover:bg-[#f0ebe0] gap-2 px-4 py-2 rounded-md transition-all"
            >
              <Printer className="h-4 w-4" />
              Preparar impresión
            </TabsTrigger>
          </TabsList>

          {/* ===== EDIT TAB ===== */}
          <TabsContent value="edit" className="mt-6">
            <div className="flex gap-6 flex-col lg:flex-row">
              {/* Left: Item navigation list */}
              <div className="w-full lg:w-72 flex-shrink-0">
                <div className="sticky top-4">
                  <h2 className="text-sm font-semibold text-[#2a2519] mb-3 uppercase tracking-wider">
                    Santos
                  </h2>
                  <ItemNavList
                    activeItemId={editItem.id}
                    onSelectItem={setEditItem}
                    items={itemNavList}
                    customImages={customImages}
                  />
                </div>
              </div>

              {/* Right: Edit selected item */}
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-[#2a2519] mb-4 uppercase tracking-wider">
                  Editar: {editItem.name}
                </h2>

                <div className="flex gap-6 items-start justify-center flex-wrap">
                  <div className="bookmark-preview-pair">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-[#8a7e6b] font-medium uppercase tracking-wider">
                        Frontal
                      </span>
                      <BookmarkFront
                        item={editItem}
                        year={year}
                        customImage={customImages[editItem.id] ?? null}
                        customColors={customColors[editItem.id] || null}
                        onImageChange={(dataUrl, colors) =>
                          handleImageChange(editItem.id, dataUrl, colors)
                        }
                        onImageRemove={() => handleImageRemove(editItem.id)}
                        editable
                        template={template}
                        backgroundImage={getBackground(editItem.id)}
                        backgroundStyle={template.backgroundStyle}
                        gallery={imageGallery[editItem.id]}
                        onAddToGallery={(dataUrl) => handleAddToGallery(editItem.id, dataUrl)}
                        customTexts={customTexts[editItem.id]}
                        onTextChange={(field, value) => handleTextChange(editItem.id, field, value)}
                        itemBackground={itemBackgrounds[editItem.id]}
                        itemImageSize={itemImageSizes[editItem.id]}
                        aiPromptDefault={buildItemPrompt(editItem.name, editItem.description, itemPrompts[editItem.id], projectPromptTemplate ?? undefined)}
                        aiPromptCustom={itemPrompts[editItem.id] ?? ""}
                        onAiPromptChange={(prompt) => setItemPrompts((prev) => ({ ...prev, [editItem.id]: prompt }))}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-[#8a7e6b] font-medium uppercase tracking-wider">
                        Reverso
                      </span>
                      <BookmarkBack
                        item={editItem}
                        customColors={customColors[editItem.id] || null}
                        template={template}
                        backgroundImage={getBackground(editItem.id)}
                        itemBackground={itemBackgrounds[editItem.id]}
                      />
                    </div>
                  </div>

                  <div className="w-52 shrink-0 p-4 bg-[#faf8f4] rounded-lg border border-[#d4cfc4] self-start">
                    <BackgroundEditor
                      background={itemBackgrounds[editItem.id] ?? defaultItemBackground}
                      onChange={(key, value) => handleItemBackgroundChange(editItem.id, key, value)}
                      imageSrc={customImages[editItem.id] === "" ? undefined : (customImages[editItem.id] || editItem.image)}
                      backgroundPool={backgroundPool}
                      itemName={editItem.name}
                      watercolorColor={editItem.colorFront}
                    />
                    {itemBackgrounds[editItem.id]?.backgroundType && itemBackgrounds[editItem.id].backgroundType !== "default" && (
                      <button
                        type="button"
                        onClick={() => setItemBackgrounds((prev) => { const next = { ...prev }; delete next[editItem.id]; return next })}
                        className="mt-2 text-[10px] text-[#8a7e6b] hover:text-red-600 underline transition-colors"
                      >
                        Restablecer fondo
                      </button>
                    )}

                    <div className="mt-4 pt-3 border-t border-[#d4cfc4]">
                      <p className="text-[10px] font-semibold text-[#2a2519] uppercase tracking-wider mb-2">
                        Tamaño de imagen
                      </p>
                      <label className="flex items-center justify-between text-[10px] text-[#5a5040] mb-1">
                        <span>Ancho: {(itemImageSizes[editItem.id] ?? defaultItemImageSize).width}px</span>
                      </label>
                      <input
                        type="range"
                        min={60}
                        max={220}
                        value={(itemImageSizes[editItem.id] ?? defaultItemImageSize).width}
                        onChange={(e) => handleItemImageSizeChange(editItem.id, "width", Number(e.target.value))}
                        className="w-full h-1.5 accent-[#8a7e6b]"
                      />
                      <label className="flex items-center justify-between text-[10px] text-[#5a5040] mb-1 mt-2">
                        <span>Alto: {(itemImageSizes[editItem.id] ?? defaultItemImageSize).height}px</span>
                      </label>
                      <input
                        type="range"
                        min={100}
                        max={550}
                        value={(itemImageSizes[editItem.id] ?? defaultItemImageSize).height}
                        onChange={(e) => handleItemImageSizeChange(editItem.id, "height", Number(e.target.value))}
                        className="w-full h-1.5 accent-[#8a7e6b]"
                      />
                      {itemImageSizes[editItem.id] && (
                        <button
                          type="button"
                          onClick={() => setItemImageSizes((prev) => { const next = { ...prev }; delete next[editItem.id]; return next })}
                          className="mt-2 text-[10px] text-[#8a7e6b] hover:text-red-600 underline transition-colors"
                        >
                          Restablecer tamaño
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-[#8a7e6b] mt-4 italic">
                  Toca la imagen para subir, recortar y ajustar tu propia foto
                </p>

                {/* Background selector for this saint */}
                {template.showBackgroundImage && backgroundPool.length > 0 && (
                  <div className="mt-6 p-4 bg-[#faf8f4] rounded-lg border border-[#d4cfc4] max-w-lg mx-auto">
                    <h3 className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider mb-2">
                      Fondo para {editItem.name}
                    </h3>
                    <p className="text-[10px] text-[#8a7e6b] mb-2">
                      Elige un fondo o deja &quot;Auto&quot; para asignacion automatica.
                    </p>
                    <div className="flex flex-wrap gap-2 items-end">
                      <button
                        type="button"
                        onClick={() => handleAssignBackground(editItem.id, null)}
                        className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded border text-[10px] transition-colors ${
                          bgAssignments[editItem.id] === undefined
                            ? "border-[#2a2519] bg-[#2a2519] text-[#faf8f4]"
                            : "border-[#d4cfc4] text-[#8a7e6b] hover:border-[#8a7e6b]"
                        }`}
                      >
                        Auto
                      </button>
                      {backgroundPool.map((bg, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAssignBackground(editItem.id, i)}
                          className={`w-10 h-28 rounded border overflow-hidden transition-all hover:scale-105 ${
                            bgAssignments[editItem.id] === i
                              ? "border-[#2a2519] ring-2 ring-[#2a2519]"
                              : "border-[#d4cfc4] opacity-60 hover:opacity-100"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={bg} alt={`Fondo ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Item info card */}
                <div className="mt-6 p-5 bg-[#faf8f4] rounded-lg border border-[#d4cfc4] max-w-lg mx-auto">
                  <h3 className="font-bold text-[#2a2519] font-serif text-lg">
                    {editItem.name}
                  </h3>
                  <p className="text-sm text-[#6b5d3e] mt-1 font-medium">
                    {editItem.subtitle} &middot; {editItem.metadata}
                  </p>
                  <p className="text-sm text-[#5a5040] mt-3 leading-relaxed italic font-serif">
                    {editItem.description}
                  </p>
                  <p className="text-xs text-[#8a7e6b] mt-3 uppercase tracking-wider font-semibold">
                    {editItem.tagline}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ===== BATCH GENERATION TAB ===== */}
          <TabsContent value="batch" className="mt-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-sm font-semibold text-[#2a2519] mb-1 uppercase tracking-wider">
                Generacion de imagenes con IA
              </h2>
              <p className="text-xs text-[#8a7e6b] mb-6">
                Genera imagenes de IA para todas las fichas. Puedes regenerar individualmente
                y elegir entre varias opciones para cada ficha.
              </p>
              <BatchGenerateButton
                items={items}
                existingImages={customImages}
                gallery={imageGallery}
                projectPromptTemplate={projectPromptTemplate ?? undefined}
                onImageSelected={(itemId, dataUrl) => handleImageChange(itemId, dataUrl)}
                onAddToGallery={(itemId, dataUrl) => handleAddToGallery(itemId, dataUrl)}
                onImageRemoved={(itemId) => handleImageRemove(itemId)}
                onPreviewItem={(item) => {
                  setEditItem(item)
                  setActiveTab("edit")
                }}
              />
            </div>
          </TabsContent>

          {/* ===== GALLERY TAB ===== */}
          <TabsContent value="gallery" className="mt-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-sm font-semibold text-[#2a2519] mb-1 uppercase tracking-wider">
                Galería de imagenes
              </h2>
              <p className="text-xs text-[#8a7e6b] mb-6">
                Todas las imagenes generadas y subidas, organizadas por ficha.
                Selecciona una imagen para usarla o eliminala de la galería.
              </p>
              <ImageGallery
                items={items}
                imageGallery={imageGallery}
                customImages={customImages}
                onSelectImage={(itemId, dataUrl, colors) => handleImageChange(itemId, dataUrl, colors)}
                onDeleteImage={handleRemoveFromGallery}
                onNavigateToItem={(item) => {
                  setEditItem(item)
                  setActiveTab("edit")
                }}
              />
            </div>
          </TabsContent>

          {/* ===== TEMPLATE TAB ===== */}
          <TabsContent value="template" className="mt-6">
            <div className="flex gap-6 flex-col lg:flex-row">
              {/* Left: controls */}
              <div className="w-full lg:w-80 flex-shrink-0 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-[#2a2519] mb-3 uppercase tracking-wider">
                    Editar plantilla
                  </h2>
                  <p className="text-xs text-[#8a7e6b] mb-4">
                    Los cambios se aplican a todos los puntos de libro.
                  </p>
                </div>

                {/* Preset designs */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider mb-2">
                    Disenos predefinidos
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {presetTemplates.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setTemplate(preset)}
                        className={`px-3 py-2 text-xs rounded border transition-colors text-left ${
                          template.layout === preset.layout && template.name === preset.name
                            ? "bg-[#2a2519] text-[#faf8f4] border-[#2a2519]"
                            : "bg-[#faf8f4] text-[#5a5040] border-[#d4cfc4] hover:border-[#8a7e6b]"
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Saved designs */}
                {savedDesigns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider mb-2">
                      Mis disenos
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {savedDesigns.map((design, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setTemplate(design)}
                            className="flex-1 px-3 py-2 text-xs rounded border transition-colors text-left bg-[#faf8f4] text-[#5a5040] border-[#d4cfc4] hover:border-[#8a7e6b]"
                          >
                            {design.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDesign(i)}
                            className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Layout selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider">
                    Disposicion
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.entries(layoutLabels) as [BookmarkLayout, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleTemplateChange("layout", value)}
                        className={`px-3 py-2 text-xs rounded border transition-colors ${
                          template.layout === value
                            ? "bg-[#2a2519] text-[#faf8f4] border-[#2a2519]"
                            : "bg-[#faf8f4] text-[#5a5040] border-[#d4cfc4] hover:border-[#8a7e6b]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image position */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider">
                    Posicion de la imagen
                  </label>
                  <div className="flex gap-1.5">
                    {(Object.entries(imagePositionLabels) as [ImagePosition, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleTemplateChange("imagePosition", value)}
                        className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                          template.imagePosition === value
                            ? "bg-[#2a2519] text-[#faf8f4] border-[#2a2519]"
                            : "bg-[#faf8f4] text-[#5a5040] border-[#d4cfc4] hover:border-[#8a7e6b]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Header title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider">
                    Titulo del encabezado
                  </label>
                  <input
                    type="text"
                    value={template.headerTitle}
                    onChange={(e) => handleTemplateChange("headerTitle", e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#faf8f4] border border-[#d4cfc4] rounded text-[#2a2519] focus:outline-none focus:ring-1 focus:ring-[#8a7e6b]"
                    placeholder="Santos Patronos"
                  />
                </div>

                {/* Toggle fields */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider mb-2">
                    Campos visibles — Frontal
                  </p>
                  {([
                    ["showYear", "Ano"],
                    ["showPrefix", "Prefijo (SAN, SANTA...)"],
                    ["showSubtitle", "Subtitulo / Fecha"],
                    ["showTagline", "Lema / Virtud"],
                    ["showQuote", "Cita / Oracion"],
                  ] as [keyof BookmarkTemplate, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={template[key] as boolean}
                        onChange={(e) => handleTemplateChange(key, e.target.checked)}
                        className="w-4 h-4 accent-[#2a2519]"
                      />
                      <span className="text-sm text-[#5a5040] group-hover:text-[#2a2519] transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider mb-2">
                    Campos visibles — Reverso
                  </p>
                  {([
                    ["showDescription", "Descripcion"],
                    ["showMetadata", "Metadata / Periodo"],
                    ["showDots", "Puntos decorativos"],
                  ] as [keyof BookmarkTemplate, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={template[key] as boolean}
                        onChange={(e) => handleTemplateChange(key, e.target.checked)}
                        className="w-4 h-4 accent-[#2a2519]"
                      />
                      <span className="text-sm text-[#5a5040] group-hover:text-[#2a2519] transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Solid background from image */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider mb-2">
                    Fondo solido
                  </p>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={template.useSolidBackground}
                      onChange={(e) => handleTemplateChange("useSolidBackground", e.target.checked)}
                      className="w-4 h-4 accent-[#2a2519]"
                    />
                    <span className="text-sm text-[#5a5040] group-hover:text-[#2a2519] transition-colors">
                      Usar color de fondo detectado de la imagen
                    </span>
                  </label>
                  <p className="text-[9px] text-[#8a7e6b] italic pl-6">
                    Detecta el color solido del borde de cada imagen y lo usa como fondo del punto de libro.
                    El color del texto se ajusta automaticamente para mantener buen contraste.
                  </p>
                </div>

                {/* Background image settings */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#2a2519] uppercase tracking-wider mb-2">
                    Imagen de fondo
                  </p>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={template.showBackgroundImage}
                      onChange={(e) => handleTemplateChange("showBackgroundImage", e.target.checked)}
                      className="w-4 h-4 accent-[#2a2519]"
                    />
                    <span className="text-sm text-[#5a5040] group-hover:text-[#2a2519] transition-colors">
                      Activar imagen de fondo
                    </span>
                  </label>
                  {template.showBackgroundImage && (
                    <div className="space-y-1.5 pl-6">
                      <label className="text-[10px] text-[#8a7e6b] font-medium">
                        Estilo personalizado (opcional)
                      </label>
                      <div className="space-y-1.5 mb-3">
                        <label className="text-[10px] text-[#8a7e6b] font-medium">
                          Complejidad del fondo
                        </label>
                        <div className="flex gap-1.5">
                          {(["simple", "detailed"] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => handleTemplateChange("backgroundComplexity", value)}
                              className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors ${
                                template.backgroundComplexity === value
                                  ? "bg-[#2a2519] text-[#faf8f4] border-[#2a2519]"
                                  : "bg-[#faf8f4] text-[#5a5040] border-[#d4cfc4] hover:border-[#8a7e6b]"
                              }`}
                            >
                              {value === "simple" ? "Simple" : "Detallado"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {template.backgroundComplexity === "detailed" && (
                        <>
                          <label className="text-[10px] text-[#8a7e6b] font-medium block mb-1.5">
                            Estilo personalizado (opcional)
                          </label>
                          <textarea
                            value={template.backgroundStyle}
                            onChange={(e) => handleTemplateChange("backgroundStyle", e.target.value)}
                            placeholder="Ej: estilo vidriera gotica, colores azul y dorado..."
                            className="w-full px-3 py-2 text-xs bg-[#faf8f4] border border-[#d4cfc4] rounded text-[#2a2519] focus:outline-none focus:ring-1 focus:ring-[#8a7e6b] resize-none"
                            rows={2}
                          />
                          <p className="text-[9px] text-[#8a7e6b] italic">
                            Describe el estilo que deseas para el fondo.
                          </p>
                        </>
                      )}

                      <div className="mt-3">
                        <BackgroundPoolManager
                          pool={backgroundPool}
                          backgroundStyle={template.backgroundStyle}
                          backgroundComplexity={template.backgroundComplexity}
                          onAddToPool={handleAddBackground}
                          onRemoveFromPool={handleRemoveBackground}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Save / Reset buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveDesign}
                    className="px-4 py-2 text-xs font-medium bg-[#2a2519] text-[#faf8f4] rounded hover:bg-[#3d3525] transition-colors"
                  >
                    Guardar diseno
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate(defaultTemplate)}
                    className="text-xs text-[#8a7e6b] hover:text-[#2a2519] underline transition-colors"
                  >
                    Restablecer
                  </button>
                </div>
              </div>

              {/* Right: live preview */}
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-[#2a2519] mb-3 uppercase tracking-wider">
                  Vista previa de la plantilla
                </h2>
                {items.length === 0 ? (
                  <p className="text-xs text-[#8a7e6b]">
                    No hay fichas en este proyecto todavia. Crea o importa alguna para ver la vista previa.
                  </p>
                ) : (
                  <div className="flex items-start justify-center">
                    <div className="bookmark-preview-pair">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-[#8a7e6b] font-medium uppercase tracking-wider">Frontal</span>
                        <BookmarkFront
                          item={items[0]}
                          year={year}
                          customImage={customImages[items[0].id] ?? null}
                          customColors={customColors[items[0].id] || null}
                          template={template}
                          backgroundImage={getBackground(items[0].id)}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-[#8a7e6b] font-medium uppercase tracking-wider">Reverso</span>
                        <BookmarkBack
                          item={items[0]}
                          customColors={customColors[items[0].id] || null}
                          template={template}
                          backgroundImage={getBackground(items[0].id)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ===== PRINT TAB ===== */}
          <TabsContent value="print" className="mt-6">
            <div className="flex gap-6 flex-col lg:flex-row">
              {/* Left: Item selector with checkboxes */}
              <div className="w-full lg:w-72 flex-shrink-0">
                <div className="sticky top-4">
                  <h2 className="text-sm font-semibold text-[#2a2519] mb-3 uppercase tracking-wider">
                    Seleccionar fichas a imprimir
                  </h2>
                  <ItemSelector
                    items={items}
                    selectedItems={selectedItems}
                    onToggleItem={handleToggleItem}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                  />
                </div>
              </div>

              {/* Right: Print preview */}
              <div className="flex-1">
                <PrintView selectedItems={selectedItems} year={year} customImages={customImages} customColors={customColors} backgroundPool={backgroundPool} bgAssignments={bgAssignments} template={template} customTexts={customTexts} itemBackgrounds={itemBackgrounds} itemImageSizes={itemImageSizes} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Print-only content */}
      <div className="hidden print:block">
        <PrintView selectedItems={selectedItems} year={year} customImages={customImages} customColors={customColors} backgroundPool={backgroundPool} bgAssignments={bgAssignments} template={template} customTexts={customTexts} itemBackgrounds={itemBackgrounds} itemImageSizes={itemImageSizes} />
      </div>
    </main>
  )
}

/* ===== Item Navigation List (no checkboxes) ===== */

import { useState as useStateNav, useMemo as useMemoNav } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, ImageIcon } from "lucide-react"

function ItemNavList({
  activeItemId,
  onSelectItem,
  items: itemList,
  customImages,
}: {
  activeItemId: string
  onSelectItem: (item: import("@/lib/bookmark-item").BookmarkItem) => void
  items: import("@/lib/bookmark-item").BookmarkItem[]
  customImages: Record<string, string>
}) {
  const [search, setSearch] = useStateNav("")

  const filtered = useMemoNav(() => {
    if (!search.trim()) return itemList
    const q = search.toLowerCase()
    return itemList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q)
    )
  }, [search, itemList])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a7e6b]" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-[#faf8f4] border-[#d4cfc4] text-[#2a2519] placeholder:text-[#a89e8c] focus-visible:ring-[#8a7e6b]"
        />
      </div>

      <ScrollArea className="h-[520px] rounded-lg border border-[#d4cfc4] bg-[#faf8f4]">
        <div className="p-2 flex flex-col gap-1">
          {filtered.map((item) => {
            const isActive = item.id === activeItemId
            const hasCustomImage = !!customImages[item.id]
            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all ${
                  isActive
                    ? "bg-[#2a2519] text-[#faf8f4]"
                    : "bg-transparent hover:bg-[#f0ebe0]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isActive ? "text-[#faf8f4]" : "text-[#2a2519]"}`}>
                    {item.name}
                  </p>
                  <p className={`text-xs ${isActive ? "text-[#c4bca8]" : "text-[#8a7e6b]"}`}>{item.subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {hasCustomImage && (
                    <ImageIcon className={`h-3 w-3 ${isActive ? "text-[#c4bca8]" : "text-emerald-600"}`} />
                  )}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.colorFront }}
                    title={item.tagline}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
