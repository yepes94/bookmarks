/**
 * Extract dominant colors from an image using canvas pixel sampling + k-means clustering.
 * Returns an array of hex colors sorted by prominence.
 */

type RGB = [number, number, number]

function samplePixels(imageData: ImageData, sampleSize: number): RGB[] {
  const { data, width, height } = imageData
  const pixels: RGB[] = []
  const step = Math.max(1, Math.floor((width * height) / sampleSize))

  for (let i = 0; i < width * height; i += step) {
    const offset = i * 4
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    const a = data[offset + 3]

    // Skip transparent / nearly white / nearly black pixels
    if (a < 128) continue
    if (r > 240 && g > 240 && b > 240) continue
    if (r < 15 && g < 15 && b < 15) continue

    pixels.push([r, g, b])
  }

  return pixels
}

function distance(a: RGB, b: RGB): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  )
}

function kMeans(pixels: RGB[], k: number, maxIter = 20): RGB[] {
  if (pixels.length === 0) return []
  if (pixels.length <= k) return pixels

  // Initialize centroids by picking spaced-out samples
  const centroids: RGB[] = []
  const step = Math.floor(pixels.length / k)
  for (let i = 0; i < k; i++) {
    centroids.push([...pixels[i * step]])
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const clusters: RGB[][] = Array.from({ length: k }, () => [])

    // Assign
    for (const px of pixels) {
      let minDist = Infinity
      let minIdx = 0
      for (let c = 0; c < k; c++) {
        const d = distance(px, centroids[c])
        if (d < minDist) {
          minDist = d
          minIdx = c
        }
      }
      clusters[minIdx].push(px)
    }

    // Update
    let converged = true
    for (let c = 0; c < k; c++) {
      if (clusters[c].length === 0) continue
      const avg: RGB = [0, 0, 0]
      for (const px of clusters[c]) {
        avg[0] += px[0]
        avg[1] += px[1]
        avg[2] += px[2]
      }
      const newCentroid: RGB = [
        Math.round(avg[0] / clusters[c].length),
        Math.round(avg[1] / clusters[c].length),
        Math.round(avg[2] / clusters[c].length),
      ]
      if (distance(centroids[c], newCentroid) > 2) converged = false
      centroids[c] = newCentroid
    }

    if (converged) break
  }

  return centroids
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return [h * 360, s * 100, l * 100]
}

/**
 * Creates a soft watercolor-appropriate version of a color.
 * Desaturates slightly and raises lightness for that translucent wash feel.
 */
function toWatercolor(r: number, g: number, b: number, lightness = 75, saturation = 45): string {
  const [h] = rgbToHsl(r, g, b)
  return `hsl(${Math.round(h)}, ${saturation}%, ${lightness}%)`
}

export interface ExtractedColors {
  dominant: string
  secondary: string
  colorFront: string
  colorBack: string
  palette: string[]
  backgroundColor: string | null
}

export function extractDominantColors(imageSrc: string): Promise<ExtractedColors> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      // Use a small size for performance
      const scale = Math.min(1, 150 / Math.max(img.width, img.height))
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(defaultColors())
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const pixels = samplePixels(imageData, 2000)
      if (pixels.length < 5) {
        resolve(defaultColors())
        return
      }

      const centroids = kMeans(pixels, 4)

      // Count pixels closest to each centroid
      const counts = centroids.map(() => 0)
      for (const px of pixels) {
        let minDist = Infinity
        let minIdx = 0
        for (let c = 0; c < centroids.length; c++) {
          const d = distance(px, centroids[c])
          if (d < minDist) { minDist = d; minIdx = c }
        }
        counts[minIdx]++
      }

      // Sort by count descending
      const ranked = centroids
        .map((c, i) => ({ color: c, count: counts[i] }))
        .sort((a, b) => b.count - a.count)

      const primary = ranked[0]?.color || [180, 200, 220]
      const secondary = ranked[1]?.color || [180, 200, 180]

      const bgColor = detectEdgeBackground(imageData)

      resolve({
        dominant: rgbToHex(primary[0], primary[1], primary[2]),
        secondary: rgbToHex(secondary[0], secondary[1], secondary[2]),
        colorFront: toWatercolor(primary[0], primary[1], primary[2], 78, 40),
        colorBack: toWatercolor(secondary[0], secondary[1], secondary[2], 80, 35),
        palette: ranked.map((r) => rgbToHex(r.color[0], r.color[1], r.color[2])),
        backgroundColor: bgColor,
      })
    }
    img.onerror = () => resolve(defaultColors())
    img.src = imageSrc
  })
}

/**
 * Sample pixels from the edges of an image to detect a solid background color.
 * Returns the hex color if a dominant edge color is found, null otherwise.
 */
function detectEdgeBackground(imageData: ImageData): string | null {
  const { data, width, height } = imageData
  const edgePixels: RGB[] = []
  const edgeDepth = Math.max(2, Math.round(Math.min(width, height) * 0.05))

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x < edgeDepth || x >= width - edgeDepth || y < edgeDepth || y >= height - edgeDepth
      if (!isEdge) continue

      const offset = (y * width + x) * 4
      const a = data[offset + 3]
      if (a < 128) continue
      edgePixels.push([data[offset], data[offset + 1], data[offset + 2]])
    }
  }

  if (edgePixels.length < 10) return null

  // Cluster edge pixels into 3 groups
  const centroids = kMeans(edgePixels, 3, 15)
  if (centroids.length === 0) return null

  // Count how many edge pixels belong to each cluster
  const counts = centroids.map(() => 0)
  for (const px of edgePixels) {
    let minDist = Infinity
    let minIdx = 0
    for (let c = 0; c < centroids.length; c++) {
      const d = distance(px, centroids[c])
      if (d < minDist) { minDist = d; minIdx = c }
    }
    counts[minIdx]++
  }

  // The dominant edge color must represent at least 50% of edge pixels
  const maxIdx = counts.indexOf(Math.max(...counts))
  const ratio = counts[maxIdx] / edgePixels.length
  if (ratio < 0.5) return null

  const bg = centroids[maxIdx]
  return rgbToHex(bg[0], bg[1], bg[2])
}

/**
 * Relative luminance per WCAG 2.0
 */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * WCAG contrast ratio between two hex colors.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Returns a text color (dark or light) that contrasts well with the given background.
 */
export function getContrastTextColor(bgHex: string): string {
  const lum = relativeLuminance(bgHex)
  return lum > 0.4 ? "#1a1a1a" : "#f5f0e8"
}

/**
 * Returns a secondary text color that contrasts with the given background.
 */
export function getContrastSecondaryColor(bgHex: string): string {
  const lum = relativeLuminance(bgHex)
  return lum > 0.4 ? "#3a3a3a" : "#d4cfc4"
}

function defaultColors(): ExtractedColors {
  return {
    dominant: "#b8d4e3",
    secondary: "#b5c9a8",
    colorFront: "hsl(200, 40%, 78%)",
    colorBack: "hsl(120, 35%, 80%)",
    palette: ["#b8d4e3", "#b5c9a8"],
    backgroundColor: null,
  }
}
