const TARGET_WIDTH = 280 * 2
const TARGET_HEIGHT = 440 * 2

export async function compressImageDataUrl(dataUrl: string): Promise<string> {
  if (typeof window === "undefined") return dataUrl
  if (!dataUrl.startsWith("data:image/")) return dataUrl

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = TARGET_WIDTH
        canvas.height = TARGET_HEIGHT
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"

        // Ajustar manteniendo aspecto, imagen completa sin recortar (contain)
        const scale = Math.min(TARGET_WIDTH / img.width, TARGET_HEIGHT / img.height)
        const drawW = img.width * scale
        const drawH = img.height * scale
        const dx = (TARGET_WIDTH - drawW) / 2
        const dy = (TARGET_HEIGHT - drawH) / 2

        ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
        ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, drawW, drawH)

        // Preferir WebP con calidad bastante comprimida
        let webp: string
        try {
          webp = canvas.toDataURL("image/webp", 0.7)
        } catch {
          resolve(dataUrl)
          return
        }

        if (webp && webp.startsWith("data:image/webp")) {
          resolve(webp)
          return
        }

        const png = canvas.toDataURL("image/png")
        resolve(png || dataUrl)
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export async function compressBackgroundDataUrl(dataUrl: string): Promise<string> {
  if (typeof window === "undefined") return dataUrl
  if (!dataUrl.startsWith("data:image/")) return dataUrl

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"

        ctx.clearRect(0, 0, img.width, img.height)
        ctx.drawImage(img, 0, 0, img.width, img.height)

        let webp: string
        try {
          webp = canvas.toDataURL("image/webp", 0.7)
        } catch {
          resolve(dataUrl)
          return
        }

        if (webp && webp.startsWith("data:image/webp")) {
          resolve(webp)
          return
        }

        const png = canvas.toDataURL("image/png")
        resolve(png || dataUrl)
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

