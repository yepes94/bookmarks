"use client"

import { useRef, useState, useCallback } from "react"
import { Camera, Upload, X, Trash2 } from "lucide-react"

interface ImageUploadOverlayProps {
  currentImage?: string | null
  onImageChange: (imageUrl: string | null) => void
  saintName: string
}

export function ImageUploadOverlay({
  currentImage,
  onImageChange,
  saintName,
}: ImageUploadOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageChange(e.target.result as string)
          setShowMenu(false)
        }
      }
      reader.readAsDataURL(file)
    },
    [onImageChange]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
      // Reset value so same file can be re-selected
      e.target.value = ""
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        aria-label={`Subir imagen para ${saintName}`}
      />

      {/* Clickable overlay on the image area */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Cambiar imagen de ${saintName}`}
        className="image-upload-trigger"
        onClick={() => setShowMenu((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setShowMenu((prev) => !prev)
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hover hint */}
        <div
          className={`image-upload-hint ${isDragging ? "image-upload-hint--active" : ""}`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wide uppercase">
            {isDragging ? "Soltar aqui" : "Cambiar foto"}
          </span>
        </div>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="image-upload-menu">
            <button
              className="image-upload-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir imagen</span>
            </button>
            {currentImage && (
              <button
                className="image-upload-menu-item image-upload-menu-item--danger"
                onClick={(e) => {
                  e.stopPropagation()
                  onImageChange(null)
                  setShowMenu(false)
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar imagen</span>
              </button>
            )}
            <button
              className="image-upload-menu-item image-upload-menu-item--close"
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
              }}
            >
              <X className="w-3.5 h-3.5" />
              <span>Cerrar</span>
            </button>
          </div>
        </>
      )}
    </>
  )
}
