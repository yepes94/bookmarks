"use client"

import { useRef, useCallback, useState } from "react"
import { Camera, Crop, ImagePlus, X } from "lucide-react"
import { ImageEditor } from "@/components/image-editor"
import { AIGenerateButton } from "@/components/ai-generate-button"
import { extractDominantColors, type ExtractedColors } from "@/lib/color-utils"

interface ImageUploadProps {
  currentImage?: string | null
  onImageSelect: (dataUrl: string, colors?: ExtractedColors) => void
  onImageRemove: () => void
  itemName: string
  itemDescription?: string
  backgroundStyle?: string
  gallery?: string[]
  onAddToGallery?: (dataUrl: string) => void
  imageMaxWidth?: number
  imageMaxHeight?: number
  defaultPrompt?: string
  customPrompt?: string
  onPromptChange?: (prompt: string) => void
}

export function ImageUpload({
  currentImage,
  onImageSelect,
  onImageRemove,
  itemName,
  itemDescription = "",
  backgroundStyle = "",
  gallery = [],
  onAddToGallery,
  imageMaxWidth = 180,
  imageMaxHeight = 340,
  defaultPrompt = "",
  customPrompt = "",
  onPromptChange,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editorSrc, setEditorSrc] = useState<string | null>(null)

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !file.type.startsWith("image/")) return

      const reader = new FileReader()
      reader.onload = (evt) => {
        const result = evt.target?.result as string
        if (result) {
          setEditorSrc(result)
        }
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    },
    []
  )

  const handleEditorConfirm = useCallback(
    async (croppedDataUrl: string, bgWasRemoved: boolean) => {
      setEditorSrc(null)
      if (bgWasRemoved) {
        onAddToGallery?.(croppedDataUrl)
      }
      const colors = await extractDominantColors(croppedDataUrl)
      onImageSelect(croppedDataUrl, colors)
    },
    [onImageSelect, onAddToGallery]
  )

  const handleEditorCancel = useCallback(() => {
    setEditorSrc(null)
  }, [])

  const handleEditCurrent = useCallback(() => {
    if (currentImage) {
      setEditorSrc(currentImage)
    }
  }, [currentImage])

  const handleAIGenerated = useCallback((dataUrl: string) => {
    onAddToGallery?.(dataUrl)
    setEditorSrc(dataUrl)
  }, [onAddToGallery])

  const handleGalleryPick = useCallback((dataUrl: string) => {
    setEditorSrc(dataUrl)
  }, [])

  return (
    <div className="relative w-full h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label={`Subir imagen para ${itemName}`}
      />

      {currentImage ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage}
              alt={itemName}
              className="saint-image cursor-pointer"
              style={{ objectFit: "contain", maxWidth: imageMaxWidth, maxHeight: imageMaxHeight }}
              onClick={handleEditCurrent}
            />

            {/* Overlay on hover (desktop) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg pointer-events-none group-hover:pointer-events-auto">
              <button
                onClick={handleEditCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#faf8f4]/95 text-[#2a2519] rounded-full text-xs font-semibold shadow-md"
                type="button"
              >
                <Crop className="h-3.5 w-3.5" />
                Recortar / Zoom
              </button>
              <button
                onClick={openFilePicker}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#faf8f4]/95 text-[#2a2519] rounded-full text-xs font-semibold shadow-md"
                type="button"
              >
                <Camera className="h-3.5 w-3.5" />
                Cambiar foto
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onImageRemove()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#faf8f4]/95 text-red-700 rounded-full text-xs font-semibold shadow-md"
                type="button"
              >
                <X className="h-3.5 w-3.5" />
                Quitar
              </button>
            </div>

            {/* Mobile floating action buttons */}
            <div className="absolute top-1 right-1 flex gap-1 md:hidden">
              <button
                onClick={handleEditCurrent}
                className="w-7 h-7 bg-[#faf8f4]/90 rounded-full flex items-center justify-center shadow-md"
                type="button"
                aria-label="Editar imagen"
              >
                <Crop className="h-3.5 w-3.5 text-[#6b5d3e]" />
              </button>
              <button
                onClick={openFilePicker}
                className="w-7 h-7 bg-[#faf8f4]/90 rounded-full flex items-center justify-center shadow-md"
                type="button"
                aria-label="Cambiar foto"
              >
                <Camera className="h-3 w-3 text-[#6b5d3e]" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onImageRemove()
                }}
                className="w-7 h-7 bg-[#faf8f4]/90 rounded-full flex items-center justify-center shadow-md"
                type="button"
                aria-label="Quitar imagen"
              >
                <X className="h-3 w-3 text-red-700" />
              </button>
            </div>
          </div>

          {/* Gallery thumbnails */}
          {gallery.length > 1 && (
            <div className="flex gap-1.5 mt-2 flex-wrap justify-center max-w-[190px]">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleGalleryPick(img)}
                  className={`w-8 h-12 rounded border overflow-hidden transition-all hover:scale-105 ${
                    img === currentImage
                      ? "border-[#2a2519] ring-1 ring-[#2a2519]"
                      : "border-[#d4cfc4] opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Opcion ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 min-h-[200px] py-3">
          <button
            onClick={openFilePicker}
            type="button"
            className="flex flex-col items-center gap-2 cursor-pointer hover:bg-black/5 active:bg-black/10 transition-colors rounded-lg px-6 py-3"
            aria-label={`Subir imagen para ${itemName}`}
          >
            <div className="w-12 h-12 rounded-full bg-[#e8e0d0] flex items-center justify-center">
              <ImagePlus className="h-5 w-5 text-[#6b5d3e]" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-[#6b5d3e]">Subir imagen</p>
              <p className="text-[10px] text-[#8a7e6b] mt-0.5">Desde galeria o camara</p>
            </div>
          </button>

          <div className="flex items-center gap-2 w-32">
            <div className="flex-1 h-px bg-[#d4cfc4]" />
            <span className="text-[10px] text-[#8a7e6b]">o</span>
            <div className="flex-1 h-px bg-[#d4cfc4]" />
          </div>

          <AIGenerateButton
            itemName={itemName}
            itemDescription={itemDescription}
            backgroundStyle={backgroundStyle}
            defaultPrompt={defaultPrompt}
            customPrompt={customPrompt}
            onPromptChange={onPromptChange}
            onImageGenerated={handleAIGenerated}
          />

          {/* Gallery thumbnails when no image selected yet */}
          {gallery.length > 0 && (
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[10px] text-[#8a7e6b]">Imagenes anteriores:</p>
              <div className="flex gap-1.5 flex-wrap justify-center max-w-[190px]">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleGalleryPick(img)}
                    className="w-8 h-12 rounded border border-[#d4cfc4] overflow-hidden opacity-60 hover:opacity-100 hover:scale-105 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Opcion ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor modal */}
      {editorSrc && (
        <ImageEditor
          imageSrc={editorSrc}
          onConfirm={handleEditorConfirm}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  )
}
