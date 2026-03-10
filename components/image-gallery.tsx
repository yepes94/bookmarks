"use client"

import { useState, useMemo, useCallback } from "react"
import type { BookmarkItem } from "@/lib/bookmark-item"
import { Check, Trash2, Search, Pencil, ImagePlus } from "lucide-react"
import { extractDominantColors, type ExtractedColors } from "@/lib/color-utils"

interface ImageGalleryProps {
  items: BookmarkItem[]
  imageGallery: Record<string, string[]>
  customImages: Record<string, string>
  onSelectImage: (itemId: string, dataUrl: string, colors?: ExtractedColors) => void
  onDeleteImage: (itemId: string, imageIndex: number) => void
  onNavigateToItem: (item: BookmarkItem) => void
}

export function ImageGallery({
  items,
  imageGallery,
  customImages,
  onSelectImage,
  onDeleteImage,
  onNavigateToItem,
}: ImageGalleryProps) {
  const [filter, setFilter] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<{ itemId: string; index: number } | null>(null)

  const itemsWithImages = useMemo(() => {
    const base = filter.trim()
      ? items.filter(
          (s) =>
            s.name.toLowerCase().includes(filter.toLowerCase()) ||
            s.displayName.toLowerCase().includes(filter.toLowerCase()) ||
            s.subtitle.toLowerCase().includes(filter.toLowerCase()) ||
            s.tagline.toLowerCase().includes(filter.toLowerCase())
        )
      : items
    return base.filter((s) => {
      const galleryCount = imageGallery[s.id]?.length ?? 0
      const hasCustom = !!(customImages[s.id]?.trim())
      return galleryCount > 0 || hasCustom
    })
  }, [items, filter, imageGallery, customImages])

  const totalImages = useMemo(() => {
    let n = 0
    const seen = new Set<string>()
    for (const arr of Object.values(imageGallery)) {
      for (const url of arr ?? []) {
        const k = url?.trim() ?? ""
        if (k && !seen.has(k)) {
          seen.add(k)
          n++
        }
      }
    }
    for (const url of Object.values(customImages)) {
      const k = (url ?? "").trim()
      if (k && !seen.has(k)) {
        seen.add(k)
        n++
      }
    }
    return n
  }, [imageGallery, customImages])

  const handleSelect = useCallback(
    async (saintId: string, dataUrl: string) => {
      const colors = await extractDominantColors(dataUrl)
      onSelectImage(saintId, dataUrl, colors)
    },
    [onSelectImage]
  )

  const handleDelete = useCallback(
    (itemId: string, index: number) => {
      if (confirmDelete?.itemId === itemId && confirmDelete?.index === index) {
        onDeleteImage(itemId, index)
        setConfirmDelete(null)
      } else {
        setConfirmDelete({ itemId, index })
      }
    },
    [confirmDelete, onDeleteImage]
  )

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[#8a7e6b]">
          {totalImages} imagen{totalImages !== 1 ? "es" : ""} en {itemsWithImages.length} ficha{itemsWithImages.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8a7e6b]" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar..."
          className="w-full pl-9 pr-3 py-2 bg-[#faf8f4] border border-[#d4cfc4] rounded-lg text-xs text-[#2a2519] placeholder:text-[#8a7e6b] focus:outline-none focus:ring-1 focus:ring-[#8a7e6b]"
        />
      </div>

      {itemsWithImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <ImagePlus className="h-8 w-8 text-[#d4cfc4]" />
          <p className="text-sm text-[#8a7e6b]">
            {filter ? "Ninguna ficha con imagenes coincide con la busqueda" : "No hay imagenes generadas aun"}
          </p>
          <p className="text-xs text-[#b0a898]">
            Genera imagenes desde la pestaña de Editar o Generación IA
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {itemsWithImages.map((item) => {
            const galleryUrls = imageGallery[item.id] ?? []
            const customImg = customImages[item.id]?.trim() || null
            const images = customImg && !galleryUrls.includes(customImg)
              ? [customImg, ...galleryUrls]
              : galleryUrls
            const currentImage = customImg || (galleryUrls[0] ?? null)

            return (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-3 rounded-lg border bg-[#faf8f4] border-[#d4cfc4]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#2a2519] truncate max-w-[160px]">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-[#8a7e6b] bg-[#e8e0d0] rounded-full px-1.5 py-0.5">
                      {images.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToItem(item)}
                    className="flex items-center gap-1 text-[10px] text-[#6b5d3e] hover:text-[#2a2519] transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                </div>

                {/* Image grid */}
                <div className="flex gap-1.5 flex-wrap">
                  {images.map((img, i) => {
                    const isActive = currentImage === img
                    const isConfirming = confirmDelete?.itemId === item.id && confirmDelete?.index === i

                    return (
                      <div key={i} className="relative group">
                        <button
                          type="button"
                          onClick={() => handleSelect(item.id, img)}
                          className={`relative w-20 h-28 rounded border-2 overflow-hidden transition-all hover:scale-105 ${
                            isActive
                              ? "border-[#2a2519] ring-2 ring-[#2a2519]/30"
                              : "border-[#d4cfc4] opacity-70 hover:opacity-100"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={`${item.name} opcion ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {isActive && (
                            <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#2a2519] rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(item.id, i)
                          }}
                          className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm transition-all ${
                            isConfirming
                              ? "bg-red-500 text-white scale-110"
                              : "bg-[#faf8f4] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                          }`}
                          title={isConfirming ? "Confirmar eliminacion" : "Eliminar imagen"}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
