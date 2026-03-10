"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  Check,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Eraser,
  Loader2,
  MoveHorizontal,
  MoveVertical,
  Maximize,
  Paintbrush,
  Undo2,
  Lasso,
  Trash2,
  Magnet,
} from "lucide-react"

interface ImageEditorProps {
  imageSrc: string
  onConfirm: (croppedDataUrl: string, bgWasRemoved: boolean) => void
  onCancel: () => void
}

const CROP_W = 280
const CROP_H = 440
const CANVAS_W = 380
const CANVAS_H = 520
const CROP_X = (CANVAS_W - CROP_W) / 2
const CROP_Y = (CANVAS_H - CROP_H) / 2

interface Point {
  x: number
  y: number
}

function createCheckerPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const size = 8
  const pat = document.createElement("canvas")
  pat.width = size * 2
  pat.height = size * 2
  const pctx = pat.getContext("2d")!
  pctx.fillStyle = "#ccc"
  pctx.fillRect(0, 0, size * 2, size * 2)
  pctx.fillStyle = "#fff"
  pctx.fillRect(0, 0, size, size)
  pctx.fillRect(size, size, size, size)
  return ctx.createPattern(pat, "repeat")
}

// --- Edge detection (Sobel) for magnetic lasso ---
function computeEdgeMap(source: HTMLCanvasElement | HTMLImageElement): { edges: Float32Array; width: number; height: number } {
  const tempCanvas = document.createElement("canvas")
  const w =
    source instanceof HTMLCanvasElement
      ? source.width
      : (source as HTMLImageElement).naturalWidth || source.width
  const h =
    source instanceof HTMLCanvasElement
      ? source.height
      : (source as HTMLImageElement).naturalHeight || source.height
  tempCanvas.width = w
  tempCanvas.height = h
  const ctx = tempCanvas.getContext("2d")!
  ctx.drawImage(source, 0, 0)
  const imageData = ctx.getImageData(0, 0, w, h)
  const { data } = imageData

  // Grayscale
  const gray = new Float32Array(w * h)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }

  // Also factor in alpha edges (important after bg removal)
  const alpha = new Float32Array(w * h)
  for (let i = 0; i < alpha.length; i++) {
    alpha[i] = data[i * 4 + 3]
  }

  // Sobel on both luminance and alpha, take max
  const edges = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      // Luminance gradient
      const gxL =
        -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
        - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
        - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)]
      const gyL =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
        + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)]
      const magL = Math.sqrt(gxL * gxL + gyL * gyL)

      // Alpha gradient
      const gxA =
        -alpha[(y - 1) * w + (x - 1)] + alpha[(y - 1) * w + (x + 1)]
        - 2 * alpha[y * w + (x - 1)] + 2 * alpha[y * w + (x + 1)]
        - alpha[(y + 1) * w + (x - 1)] + alpha[(y + 1) * w + (x + 1)]
      const gyA =
        -alpha[(y - 1) * w + (x - 1)] - 2 * alpha[(y - 1) * w + x] - alpha[(y - 1) * w + (x + 1)]
        + alpha[(y + 1) * w + (x - 1)] + 2 * alpha[(y + 1) * w + x] + alpha[(y + 1) * w + (x + 1)]
      const magA = Math.sqrt(gxA * gxA + gyA * gyA)

      edges[idx] = Math.max(magL, magA)
    }
  }

  return { edges, width: w, height: h }
}

function findNearestEdge(
  edges: Float32Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): Point {
  let bestX = Math.round(cx)
  let bestY = Math.round(cy)
  let bestScore = -1

  const r = Math.ceil(radius)
  const x0 = Math.max(1, Math.round(cx) - r)
  const y0 = Math.max(1, Math.round(cy) - r)
  const x1 = Math.min(width - 2, Math.round(cx) + r)
  const y1 = Math.min(height - 2, Math.round(cy) + r)
  const r2 = radius * radius

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist2 = dx * dx + dy * dy
      if (dist2 > r2) continue

      const edgeStrength = edges[y * width + x]
      // Prefer strong edges close to cursor
      const distWeight = 1 - Math.sqrt(dist2) / radius
      const score = edgeStrength * (0.4 + 0.6 * distWeight)

      if (score > bestScore) {
        bestScore = score
        bestX = x
        bestY = y
      }
    }
  }

  return { x: bestX, y: bestY }
}

export function ImageEditor({ imageSrc, onConfirm, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [removingBg, setRemovingBg] = useState(false)
  const [bgRemoved, setBgRemoved] = useState(false)

  const [workingSrc, setWorkingSrc] = useState(imageSrc)

  const scaleRef = useRef(1)
  const offsetRef = useRef({ x: 0, y: 0 })
  const [scaleDisplay, setScaleDisplay] = useState(100)

  // Drag
  const draggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const offsetStartRef = useRef({ x: 0, y: 0 })

  // Pinch
  const lastPinchDistRef = useRef<number | null>(null)
  const pinchScaleStartRef = useRef(1)

  // Portal target
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)

  // Editable canvases
  const editCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const undoStackRef = useRef<ImageData[]>([])

  // Lasso selection state
  const [lassoActive, setLassoActive] = useState(false)
  const lassoPointsRef = useRef<Point[]>([])
  const [hasSelection, setHasSelection] = useState(false)
  const drawingLassoRef = useRef(false)

  // Magnetic lasso
  const [magnetic, setMagnetic] = useState(true)
  const [magnetRadius, setMagnetRadius] = useState(12)
  const edgeMapRef = useRef<{ edges: Float32Array; width: number; height: number } | null>(null)
  const edgeMapDirtyRef = useRef(true)

  // Marching ants animation
  const marchingAntsOffsetRef = useRef(0)
  const marchingAntsFrameRef = useRef<number>(0)

  // Brush state
  const [brushActive, setBrushActive] = useState(false)
  const [brushMode, setBrushMode] = useState<"erase" | "restore">("erase")
  const [brushSize, setBrushSize] = useState(16)
  const brushingRef = useRef(false)
  const lastBrushPointRef = useRef<Point | null>(null)
  const brushHoverRef = useRef<Point | null>(null)

  useEffect(() => {
    setPortalTarget(document.body)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  // Invalidate edge map when image changes
  const invalidateEdgeMap = useCallback(() => {
    edgeMapDirtyRef.current = true
    edgeMapRef.current = null
  }, [])

  // Compute edge map lazily
  const ensureEdgeMap = useCallback(() => {
    if (!edgeMapDirtyRef.current && edgeMapRef.current) return
    const source = editCanvasRef.current ?? imgRef.current
    if (!source) return
    edgeMapRef.current = computeEdgeMap(source)
    edgeMapDirtyRef.current = false
  }, [])

  // Snap point to nearest edge if magnetic mode is on
  const snapToEdge = useCallback((p: Point): Point => {
    if (!magnetic) return p
    const em = edgeMapRef.current
    if (!em) return p
    return findNearestEdge(em.edges, em.width, em.height, p.x, p.y, magnetRadius)
  }, [magnetic, magnetRadius])

  // --- Ensure editable canvas exists ---
  const ensureEditCanvas = useCallback(() => {
    if (editCanvasRef.current) return
    const img = imgRef.current
    if (!img) return
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0)
    editCanvasRef.current = canvas

    const origCanvas = document.createElement("canvas")
    origCanvas.width = img.width
    origCanvas.height = img.height
    const origCtx = origCanvas.getContext("2d")!
    origCtx.drawImage(img, 0, 0)
    originalCanvasRef.current = origCanvas

    undoStackRef.current = []
    invalidateEdgeMap()
  }, [invalidateEdgeMap])

  // --- Convert screen coords to image pixel coords ---
  const screenToImageCoords = useCallback((clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return null
    const rect = canvas.getBoundingClientRect()
    const cssScale = canvas.width / rect.width
    const canvasX = (clientX - rect.left) * cssScale
    const canvasY = (clientY - rect.top) * cssScale
    const s = scaleRef.current
    const imgX = (canvasX - offsetRef.current.x) / s
    const imgY = (canvasY - offsetRef.current.y) / s
    return { x: imgX, y: imgY }
  }, [])

  // --- Convert image coords to canvas coords ---
  const imageToCanvasCoords = useCallback((p: Point): Point => {
    const s = scaleRef.current
    return {
      x: p.x * s + offsetRef.current.x,
      y: p.y * s + offsetRef.current.y,
    }
  }, [])

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const img = imgRef.current
    if (!canvas || !ctx || !img) return

    const s = scaleRef.current
    const ox = offsetRef.current.x
    const oy = offsetRef.current.y

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    const editCanvas = editCanvasRef.current
    if (editCanvas) {
      const checker = createCheckerPattern(ctx)
      if (checker) {
        ctx.save()
        ctx.fillStyle = checker
        ctx.fillRect(
          Math.max(0, ox), Math.max(0, oy),
          Math.min(CANVAS_W, editCanvas.width * s),
          Math.min(CANVAS_H, editCanvas.height * s)
        )
        ctx.restore()
      }
      ctx.drawImage(editCanvas, ox, oy, editCanvas.width * s, editCanvas.height * s)
    } else {
      ctx.drawImage(img, ox, oy, img.width * s, img.height * s)
    }

    // Dark overlay outside crop
    ctx.save()
    ctx.fillStyle = "rgba(0,0,0,0.55)"
    ctx.fillRect(0, 0, CANVAS_W, CROP_Y)
    ctx.fillRect(0, CROP_Y + CROP_H, CANVAS_W, CANVAS_H - CROP_Y - CROP_H)
    ctx.fillRect(0, CROP_Y, CROP_X, CROP_H)
    ctx.fillRect(CROP_X + CROP_W, CROP_Y, CANVAS_W - CROP_X - CROP_W, CROP_H)
    ctx.restore()

    // Crop border
    ctx.strokeStyle = "rgba(250,248,244,0.9)"
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(CROP_X, CROP_Y, CROP_W, CROP_H)
    ctx.setLineDash([])

    // Corner marks
    const ml = 16
    ctx.strokeStyle = "#faf8f4"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(CROP_X, CROP_Y + ml)
    ctx.lineTo(CROP_X, CROP_Y)
    ctx.lineTo(CROP_X + ml, CROP_Y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(CROP_X + CROP_W - ml, CROP_Y)
    ctx.lineTo(CROP_X + CROP_W, CROP_Y)
    ctx.lineTo(CROP_X + CROP_W, CROP_Y + ml)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(CROP_X, CROP_Y + CROP_H - ml)
    ctx.lineTo(CROP_X, CROP_Y + CROP_H)
    ctx.lineTo(CROP_X + ml, CROP_Y + CROP_H)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(CROP_X + CROP_W - ml, CROP_Y + CROP_H)
    ctx.lineTo(CROP_X + CROP_W, CROP_Y + CROP_H)
    ctx.lineTo(CROP_X + CROP_W, CROP_Y + CROP_H - ml)
    ctx.stroke()

    // Draw lasso selection
    const pts = lassoPointsRef.current
    if (pts.length > 1) {
      ctx.save()

      // If selection is complete, draw filled overlay
      if (!drawingLassoRef.current && pts.length > 2) {
        ctx.beginPath()
        const first = imageToCanvasCoords(pts[0])
        ctx.moveTo(first.x, first.y)
        for (let i = 1; i < pts.length; i++) {
          const p = imageToCanvasCoords(pts[i])
          ctx.lineTo(p.x, p.y)
        }
        ctx.closePath()
        ctx.fillStyle = "rgba(100, 150, 255, 0.2)"
        ctx.fill()
      }

      // Draw path with marching ants
      ctx.beginPath()
      const first = imageToCanvasCoords(pts[0])
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < pts.length; i++) {
        const p = imageToCanvasCoords(pts[i])
        ctx.lineTo(p.x, p.y)
      }
      if (!drawingLassoRef.current) ctx.closePath()

      // White line below
      ctx.strokeStyle = "rgba(255,255,255,0.8)"
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.stroke()

      // Dark dashes on top (marching ants)
      ctx.strokeStyle = "rgba(0,0,0,0.9)"
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.lineDashOffset = -marchingAntsOffsetRef.current
      ctx.stroke()
      ctx.setLineDash([])

      // Draw anchor dots on snapped points (magnetic feedback)
      if (drawingLassoRef.current && magnetic) {
        // Draw small dots every N points to show snapping
        const step = Math.max(1, Math.floor(pts.length / 20))
        for (let i = 0; i < pts.length; i += step) {
          const cp = imageToCanvasCoords(pts[i])
          ctx.beginPath()
          ctx.arc(cp.x, cp.y, 2.5, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(100, 200, 255, 0.9)"
          ctx.fill()
        }
        // Always show last point
        if (pts.length > 0) {
          const last = imageToCanvasCoords(pts[pts.length - 1])
          ctx.beginPath()
          ctx.arc(last.x, last.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(100, 200, 255, 1)"
          ctx.fill()
          ctx.strokeStyle = "rgba(255,255,255,0.9)"
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      ctx.restore()
    }

    // Brush cursor preview
    if (brushActive) {
      const hover = brushHoverRef.current
      if (hover) {
        const cp = imageToCanvasCoords(hover)
        const r = (brushSize / 2) * scaleRef.current
        ctx.save()
        ctx.beginPath()
        ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2)
        ctx.strokeStyle = brushMode === "erase" ? "rgba(255,100,100,0.9)" : "rgba(100,200,255,0.9)"
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }
    }
  }, [imageToCanvasCoords, magnetic, brushActive, brushMode, brushSize])

  // Marching ants animation loop
  const startMarchingAnts = useCallback(() => {
    const animate = () => {
      marchingAntsOffsetRef.current = (marchingAntsOffsetRef.current + 0.5) % 12
      draw()
      marchingAntsFrameRef.current = requestAnimationFrame(animate)
    }
    cancelAnimationFrame(marchingAntsFrameRef.current)
    marchingAntsFrameRef.current = requestAnimationFrame(animate)
  }, [draw])

  const stopMarchingAnts = useCallback(() => {
    cancelAnimationFrame(marchingAntsFrameRef.current)
  }, [])

  useEffect(() => {
    return () => cancelAnimationFrame(marchingAntsFrameRef.current)
  }, [])

  useEffect(() => {
    if (hasSelection) {
      startMarchingAnts()
    } else {
      stopMarchingAnts()
    }
  }, [hasSelection, startMarchingAnts, stopMarchingAnts])

  // Load image (only when workingSrc changes - prevents zoom reset on tool switch)
  const loadImage = useCallback(
    (src: string) => {
      const image = new window.Image()
      image.crossOrigin = "anonymous"
      image.onload = () => {
        imgRef.current = image
        // Fit whole image inside crop area initially (no auto‑zoom that cuts head)
        const fitScale = Math.min(CROP_W / image.width, CROP_H / image.height, 1)
        scaleRef.current = fitScale
        offsetRef.current = {
          x: (CANVAS_W - image.width * fitScale) / 2,
          y: (CANVAS_H - image.height * fitScale) / 2,
        }
        setScaleDisplay(Math.round(fitScale * 100))
        setLoaded(true)
        invalidateEdgeMap()
        draw()
      }
      image.src = src
    },
    [draw, invalidateEdgeMap]
  )

  const loadImageRef = useRef(loadImage)
  loadImageRef.current = loadImage

  useEffect(() => {
    loadImageRef.current(workingSrc)
  }, [workingSrc])

  useEffect(() => {
    if (loaded) draw()
  }, [loaded, draw])

  const updateAndDraw = useCallback(
    (newScale?: number, newOx?: number, newOy?: number) => {
      if (newScale !== undefined) scaleRef.current = newScale
      if (newOx !== undefined) offsetRef.current.x = newOx
      if (newOy !== undefined) offsetRef.current.y = newOy
      setScaleDisplay(Math.round(scaleRef.current * 100))
      draw()
    },
    [draw]
  )

  // Clear selection
  const clearSelection = useCallback(() => {
    lassoPointsRef.current = []
    setHasSelection(false)
    drawingLassoRef.current = false
    draw()
  }, [draw])

  // Apply operation to selection
  const applyToSelection = useCallback((mode: "erase" | "restore") => {
    const editCanvas = editCanvasRef.current
    const origCanvas = originalCanvasRef.current
    const pts = lassoPointsRef.current
    if (!editCanvas || pts.length < 3) return

    const ectx = editCanvas.getContext("2d")!
    const data = ectx.getImageData(0, 0, editCanvas.width, editCanvas.height)
    const stack = undoStackRef.current
    stack.push(data)
    if (stack.length > 30) stack.shift()

    if (mode === "erase") {
      ectx.save()
      ectx.beginPath()
      ectx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        ectx.lineTo(pts[i].x, pts[i].y)
      }
      ectx.closePath()
      ectx.globalCompositeOperation = "destination-out"
      ectx.fill()
      ectx.restore()
    } else if (mode === "restore" && origCanvas) {
      ectx.save()
      ectx.beginPath()
      ectx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        ectx.lineTo(pts[i].x, pts[i].y)
      }
      ectx.closePath()
      ectx.clip()
      ectx.globalCompositeOperation = "source-over"
      ectx.drawImage(origCanvas, 0, 0)
      ectx.restore()
    }

    invalidateEdgeMap()
    clearSelection()
  }, [clearSelection, invalidateEdgeMap])

  // Apply brush at a point (image coords)
  const applyBrushAtPoint = useCallback(
    (p: Point, mode: "erase" | "restore") => {
      const editCanvas = editCanvasRef.current
      const origCanvas = originalCanvasRef.current
      if (!editCanvas) return
      if (mode === "restore" && !origCanvas) return

      const ectx = editCanvas.getContext("2d")!
      const origCtx = origCanvas?.getContext("2d")
      const r = brushSize / 2
      const cx = Math.round(p.x)
      const cy = Math.round(p.y)
      const x0 = Math.max(0, Math.floor(cx - r))
      const y0 = Math.max(0, Math.floor(cy - r))
      const x1 = Math.min(editCanvas.width, Math.ceil(cx + r))
      const y1 = Math.min(editCanvas.height, Math.ceil(cy + r))
      const r2 = r * r

      if (mode === "erase") {
        ectx.save()
        ectx.beginPath()
        ectx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ectx.globalCompositeOperation = "destination-out"
        ectx.fill()
        ectx.restore()
      } else if (origCtx) {
        const origData = origCtx.getImageData(x0, y0, x1 - x0, y1 - y0)
        const editData = ectx.getImageData(x0, y0, x1 - x0, y1 - y0)
        const origPix = origData.data
        const editPix = editData.data
        const w = x1 - x0
        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            const dx = px - cx
            const dy = py - cy
            if (dx * dx + dy * dy <= r2) {
              const i = ((py - y0) * w + (px - x0)) * 4
              editPix[i] = origPix[i]
              editPix[i + 1] = origPix[i + 1]
              editPix[i + 2] = origPix[i + 2]
              editPix[i + 3] = origPix[i + 3]
            }
          }
        }
        ectx.putImageData(editData, x0, y0)
      }
      invalidateEdgeMap()
    },
    [brushSize, invalidateEdgeMap]
  )

  // Undo
  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current
    const editCanvas = editCanvasRef.current
    if (stack.length === 0 || !editCanvas) return
    const data = stack.pop()!
    const ctx = editCanvas.getContext("2d")!
    ctx.putImageData(data, 0, 0)
    invalidateEdgeMap()
    clearSelection()
  }, [clearSelection, invalidateEdgeMap])

  // --- Wheel zoom ---
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const img = imgRef.current
    if (!img) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const cssScale = canvas.width / rect.width
    const cx = (e.clientX - rect.left) * cssScale
    const cy = (e.clientY - rect.top) * cssScale

    const s = scaleRef.current
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const ns = Math.max(0.1, Math.min(8, s * factor))
    const ox = cx - (cx - offsetRef.current.x) * (ns / s)
    const oy = cy - (cy - offsetRef.current.y) * (ns / s)
    updateAndDraw(ns, ox, oy)
  }, [updateAndDraw])

  // --- Pointer handlers ---
  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    // Pinch zoom (touch)
    if ("touches" in e && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy)
      pinchScaleStartRef.current = scaleRef.current
      return
    }

    // Right-click or middle-click always pans
    const isMouseEvent = !("touches" in e)
    const mouseBtn = isMouseEvent ? (e as React.MouseEvent).button : -1
    if (isMouseEvent && (mouseBtn === 1 || mouseBtn === 2)) {
      const pos = { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
      dragStartRef.current = pos
      offsetStartRef.current = { ...offsetRef.current }
      draggingRef.current = true
      return
    }

    // Brush mode (left click only)
    if (brushActive) {
      ensureEditCanvas()
      const editCanvas = editCanvasRef.current
      const pos = "touches" in e && e.touches.length > 0
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
      const imgPos = screenToImageCoords(pos.x, pos.y)
      if (imgPos && editCanvas) {
        const ectx = editCanvas.getContext("2d")!
        const data = ectx.getImageData(0, 0, editCanvas.width, editCanvas.height)
        undoStackRef.current.push(data)
        if (undoStackRef.current.length > 30) undoStackRef.current.shift()
        brushingRef.current = true
        lastBrushPointRef.current = imgPos
        applyBrushAtPoint(imgPos, brushMode)
        draw()
      }
      return
    }

    // Lasso mode (left click only)
    if (lassoActive) {
      if (hasSelection) {
        clearSelection()
        return
      }

      ensureEditCanvas()
      if (magnetic) ensureEdgeMap()

      const pos = "touches" in e && e.touches.length > 0
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
      const imgPos = screenToImageCoords(pos.x, pos.y)
      if (imgPos) {
        const snapped = snapToEdge(imgPos)
        drawingLassoRef.current = true
        lassoPointsRef.current = [snapped]
        draw()
      }
      return
    }

    // Normal drag
    const pos =
      "touches" in e && e.touches.length > 0
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
    dragStartRef.current = pos
    offsetStartRef.current = { ...offsetRef.current }
    draggingRef.current = true
  }

  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    // Pinch zoom
    if ("touches" in e && e.touches.length === 2 && lastPinchDistRef.current !== null) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / lastPinchDistRef.current
      const newScale = Math.max(0.1, Math.min(8, pinchScaleStartRef.current * ratio))
      updateAndDraw(newScale)
      return
    }

    // Pan
    if (draggingRef.current) {
      const pos =
        "touches" in e && e.touches.length > 0
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
      updateAndDraw(
        undefined,
        offsetStartRef.current.x + (pos.x - dragStartRef.current.x),
        offsetStartRef.current.y + (pos.y - dragStartRef.current.y)
      )
      return
    }

    // Brush painting
    if (brushActive && brushingRef.current) {
      const pos =
        "touches" in e && e.touches.length > 0
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
      const imgPos = screenToImageCoords(pos.x, pos.y)
      if (imgPos) {
        const last = lastBrushPointRef.current
        const step = Math.max(1, brushSize / 3)
        if (last) {
          const dx = imgPos.x - last.x
          const dy = imgPos.y - last.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const n = Math.ceil(dist / step)
          for (let i = 1; i <= n; i++) {
            const t = i / n
            const px = last.x + dx * t
            const py = last.y + dy * t
            applyBrushAtPoint({ x: px, y: py }, brushMode)
          }
        }
        lastBrushPointRef.current = imgPos
        brushHoverRef.current = imgPos
        draw()
      }
      return
    }

    // Brush hover (for cursor preview)
    if (brushActive) {
      const pos =
        "touches" in e && e.touches.length > 0
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
      const imgPos = screenToImageCoords(pos.x, pos.y)
      brushHoverRef.current = imgPos
      draw()
      return
    }

    // Lasso drawing
    if (lassoActive && drawingLassoRef.current) {
      const pos = "touches" in e && e.touches.length > 0
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
      const imgPos = screenToImageCoords(pos.x, pos.y)
      if (imgPos) {
        const pts = lassoPointsRef.current
        const last = pts[pts.length - 1]
        const dx = imgPos.x - last.x
        const dy = imgPos.y - last.y
        if (dx * dx + dy * dy > 4) {
          const snapped = snapToEdge(imgPos)
          pts.push(snapped)
          draw()
        }
      }
      return
    }
  }

  const handlePointerUp = () => {
    if (brushActive && brushingRef.current) {
      brushingRef.current = false
      lastBrushPointRef.current = null
    }

    if (lassoActive && drawingLassoRef.current) {
      drawingLassoRef.current = false
      const pts = lassoPointsRef.current
      if (pts.length >= 3) {
        setHasSelection(true)
      } else {
        lassoPointsRef.current = []
      }
      draw()
    }

    draggingRef.current = false
    lastPinchDistRef.current = null
  }

  const handlePointerLeave = useCallback(() => {
    brushHoverRef.current = null
    if (brushActive) draw()
  }, [brushActive, draw])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  // Zoom
  const zoom = useCallback(
    (factor: number) => {
      const img = imgRef.current
      if (!img) return
      const s = scaleRef.current
      const ns = Math.max(0.1, Math.min(8, s * factor))
      const cx = CANVAS_W / 2
      const cy = CANVAS_H / 2
      const ox = cx - (cx - offsetRef.current.x) * (ns / s)
      const oy = cy - (cy - offsetRef.current.y) * (ns / s)
      updateAndDraw(ns, ox, oy)
    },
    [updateAndDraw]
  )

  const handleReset = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    const fitScale = Math.max(CROP_W / img.width, CROP_H / img.height)
    updateAndDraw(
      fitScale,
      (CANVAS_W - img.width * fitScale) / 2,
      (CANVAS_H - img.height * fitScale) / 2
    )
  }, [updateAndDraw])

  const handleFitWidth = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    const fitScale = CROP_W / img.width
    updateAndDraw(
      fitScale,
      CROP_X,
      CROP_Y + (CROP_H - img.height * fitScale) / 2
    )
  }, [updateAndDraw])

  const handleFitHeight = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    const fitScale = CROP_H / img.height
    updateAndDraw(
      fitScale,
      CROP_X + (CROP_W - img.width * fitScale) / 2,
      CROP_Y
    )
  }, [updateAndDraw])

  // --- Background Removal ---
  const handleRemoveBg = useCallback(async () => {
    setRemovingBg(true)
    try {
      const { AutoModel, AutoProcessor, RawImage } = await import("@huggingface/transformers")

      const model = await AutoModel.from_pretrained("briaai/RMBG-1.4", {
        dtype: "q8",
      })
      const processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4")

      const image = await RawImage.fromURL(workingSrc)
      const { pixel_values } = await processor(image)
      const { output } = await model({ input: pixel_values })

      const maskData = await RawImage.fromTensor(
        output[0].mul(255).to("uint8")
      ).resize(image.width, image.height)

      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext("2d")!

      const img = new window.Image()
      img.crossOrigin = "anonymous"
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.src = workingSrc
      })
      ctx.drawImage(img, 0, 0)

      const origCanvas = document.createElement("canvas")
      origCanvas.width = image.width
      origCanvas.height = image.height
      const origCtx = origCanvas.getContext("2d")!
      origCtx.drawImage(img, 0, 0)
      originalCanvasRef.current = origCanvas

      const pixelData = ctx.getImageData(0, 0, image.width, image.height)
      for (let i = 0; i < maskData.data.length; i++) {
        pixelData.data[i * 4 + 3] = maskData.data[i]
      }
      ctx.putImageData(pixelData, 0, 0)

      editCanvasRef.current = canvas
      undoStackRef.current = []
      invalidateEdgeMap()

      const editImg = new window.Image()
      editImg.crossOrigin = "anonymous"
      await new Promise<void>((resolve) => {
        editImg.onload = () => resolve()
        editImg.src = canvas.toDataURL("image/png")
      })
      imgRef.current = editImg

      setBgRemoved(true)
      draw()
    } catch (err) {
      console.error("Background removal failed:", err)
    } finally {
      setRemovingBg(false)
    }
  }, [workingSrc, draw, invalidateEdgeMap])

  // --- Export ---
  const handleConfirm = useCallback(() => {
    const editCanvas = editCanvasRef.current
    const img = imgRef.current
    const source = editCanvas ?? img
    if (!source) return

    const outputScale = 2
    const targetWidth = CROP_W * outputScale
    const targetHeight = CROP_H * outputScale

    const outCanvas = document.createElement("canvas")
    outCanvas.width = targetWidth
    outCanvas.height = targetHeight
    const ctx = outCanvas.getContext("2d")
    if (!ctx) return

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    const w = editCanvas ? editCanvas.width : img!.width
    const h = editCanvas ? editCanvas.height : img!.height

    // Fit the whole edited image inside the output, centered, without auto‑cropping
    const scale = Math.min(targetWidth / w, targetHeight / h)
    const drawW = w * scale
    const drawH = h * scale
    const dx = (targetWidth - drawW) / 2
    const dy = (targetHeight - drawH) / 2

    ctx.clearRect(0, 0, targetWidth, targetHeight)
    ctx.drawImage(source, 0, 0, w, h, dx, dy, drawW, drawH)

    const webpDataUrl = outCanvas.toDataURL("image/webp", 0.7)
    const dataUrl =
      webpDataUrl.startsWith("data:image/webp") || bgRemoved
        ? webpDataUrl
        : outCanvas.toDataURL("image/png")

    onConfirm(dataUrl, bgRemoved)
  }, [onConfirm, bgRemoved])

  const canvasClassName = lassoActive || brushActive
    ? "cursor-crosshair"
    : "cursor-grab active:cursor-grabbing"

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="bg-[#faf8f4] rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
        style={{ maxWidth: 440, maxHeight: "95vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-bold text-[#2a2519] uppercase tracking-wider">
            Editar imagen
          </h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#e8e0d0] transition-colors"
            type="button"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4 text-[#6b5d3e]" />
          </button>
        </div>

        {/* Instruction */}
        <div className="px-4 pb-2 flex items-center gap-2 flex-shrink-0">
          {brushActive ? (
            <>
              <Paintbrush className="h-3.5 w-3.5 text-[#8a7e6b] flex-shrink-0" />
              <p className="text-xs text-[#8a7e6b]">
                Pinta para {brushMode === "erase" ? "borrar" : "restaurar"}. Arrastra sobre la imagen.
              </p>
            </>
          ) : lassoActive ? (
            <>
              {magnetic ? (
                <Magnet className="h-3.5 w-3.5 text-[#8a7e6b] flex-shrink-0" />
              ) : (
                <Lasso className="h-3.5 w-3.5 text-[#8a7e6b] flex-shrink-0" />
              )}
              <p className="text-xs text-[#8a7e6b]">
                {hasSelection
                  ? "Seleccion lista. Elige borrar o restaurar la zona seleccionada."
                  : magnetic
                    ? "Lazo magnetico: se ajusta a los bordes. Rueda para zoom, click derecho para mover."
                    : "Dibuja el contorno con click izq. Rueda para zoom, click derecho para mover."}
              </p>
            </>
          ) : (
            <>
              <Move className="h-3.5 w-3.5 text-[#8a7e6b] flex-shrink-0" />
              <p className="text-xs text-[#8a7e6b]">
                Arrastra para mover. Rueda o pellizca para zoom.
              </p>
            </>
          )}
        </div>

        {/* Canvas */}
        <div
          className="relative flex items-center justify-center bg-[#1a1a1a] mx-4 rounded-xl overflow-hidden select-none flex-shrink-0"
          style={{ touchAction: "none" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={(e) => {
            handlePointerUp()
            handlePointerLeave()
          }}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className={canvasClassName}
            style={{
              touchAction: "none",
              maxWidth: "100%",
              height: "auto",
            }}
          />
          {removingBg && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-[#faf8f4] animate-spin" />
              <p className="text-xs text-[#faf8f4] font-medium">
                Quitando fondo...
              </p>
              <p className="text-[10px] text-[#faf8f4]/60">
                Esto puede tardar unos segundos
              </p>
            </div>
          )}
        </div>

        {/* Selection and brush tools */}
        <div className="flex items-center gap-2 px-4 pt-3 flex-shrink-0 flex-wrap">
          <button
            onClick={() => {
              setLassoActive(!lassoActive)
              if (hasSelection) clearSelection()
              setBrushActive(false)
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              lassoActive
                ? "bg-violet-100 text-violet-800 border border-violet-300"
                : "bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8]"
            }`}
            type="button"
            title="Herramienta de seleccion lazo"
          >
            <Lasso className="h-3.5 w-3.5" />
            Seleccionar
          </button>

          <button
            onClick={() => {
              setBrushActive(!brushActive)
              setLassoActive(false)
              if (hasSelection) clearSelection()
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              brushActive
                ? "bg-violet-100 text-violet-800 border border-violet-300"
                : "bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8]"
            }`}
            type="button"
            title="Pincel para borrar o restaurar"
          >
            <Paintbrush className="h-3.5 w-3.5" />
            Pincel
          </button>

          {brushActive && (
            <>
              <div className="h-5 w-px bg-[#d4cfc4]" />
              <button
                onClick={() => setBrushMode("erase")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  brushMode === "erase"
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : "bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8]"
                }`}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Borrar
              </button>
              <button
                onClick={() => setBrushMode("restore")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  brushMode === "restore"
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : "bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8]"
                }`}
                type="button"
              >
                <Paintbrush className="h-3.5 w-3.5" />
                Restaurar
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8a7e6b] font-medium">Tam.</span>
                <input
                  type="range"
                  min={4}
                  max={48}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-16 h-1.5 accent-[#6b5d3e]"
                />
              </div>
            </>
          )}

          {lassoActive && (
            <button
              onClick={() => setMagnetic(!magnetic)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                magnetic
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8]"
              }`}
              type="button"
              title="Lazo magnetico: se ajusta automaticamente a los bordes"
            >
              <Magnet className="h-3.5 w-3.5" />
              Magnetico
            </button>
          )}

          {hasSelection && (
            <>
              <div className="h-5 w-px bg-[#d4cfc4]" />
              <button
                onClick={() => applyToSelection("erase")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 active:bg-red-300 transition-colors"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Borrar zona
              </button>
              <button
                onClick={() => applyToSelection("restore")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 active:bg-blue-300 transition-colors"
                type="button"
              >
                <Paintbrush className="h-3.5 w-3.5" />
                Restaurar zona
              </button>
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          <div className="h-5 w-px bg-[#d4cfc4]" />
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            type="button"
            title="Deshacer"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tools Row */}
        <div className="flex items-center gap-2 px-4 pt-3 flex-shrink-0 flex-wrap">
          <button
            onClick={handleRemoveBg}
            disabled={removingBg}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              bgRemoved
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            type="button"
          >
            {removingBg ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eraser className="h-3.5 w-3.5" />
            )}
            {bgRemoved ? "Fondo eliminado" : "Quitar fondo"}
          </button>

          <div className="h-5 w-px bg-[#d4cfc4]" />

          <button
            onClick={handleFitWidth}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
            type="button"
            title="Ajustar al ancho"
          >
            <MoveHorizontal className="h-3.5 w-3.5" />
            Ancho
          </button>
          <button
            onClick={handleFitHeight}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
            type="button"
            title="Ajustar al alto"
          >
            <MoveVertical className="h-3.5 w-3.5" />
            Alto
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#e8e0d0] text-[#2a2519] hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
            type="button"
            title="Rellenar recorte"
          >
            <Maximize className="h-3.5 w-3.5" />
            Rellenar
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-3 py-3 px-4 flex-shrink-0">
          <button
            onClick={() => zoom(1 / 1.2)}
            className="w-10 h-10 rounded-full bg-[#e8e0d0] flex items-center justify-center hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
            type="button"
            aria-label="Alejar"
          >
            <ZoomOut className="h-4 w-4 text-[#2a2519]" />
          </button>

          <div className="flex-1 mx-2">
            <div className="h-1.5 bg-[#e8e0d0] rounded-full relative overflow-hidden">
              <div
                className="h-full bg-[#6b5d3e] rounded-full transition-all duration-150"
                style={{
                  width: `${Math.min(100, Math.max(2, ((scaleRef.current - 0.1) / 4.9) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-[#8a7e6b] text-center mt-1">
              {scaleDisplay}%
            </p>
          </div>

          <button
            onClick={() => zoom(1.2)}
            className="w-10 h-10 rounded-full bg-[#e8e0d0] flex items-center justify-center hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
            type="button"
            aria-label="Acercar"
          >
            <ZoomIn className="h-4 w-4 text-[#2a2519]" />
          </button>

          <button
            onClick={handleReset}
            className="w-10 h-10 rounded-full bg-[#e8e0d0] flex items-center justify-center hover:bg-[#d4cfc4] active:bg-[#c4bca8] transition-colors"
            type="button"
            aria-label="Reiniciar"
          >
            <RotateCcw className="h-4 w-4 text-[#2a2519]" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-4 pb-4 flex-shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-[#d4cfc4] text-sm font-semibold text-[#6b5d3e] hover:bg-[#e8e0d0] active:bg-[#d4cfc4] transition-colors"
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-[#2a2519] text-sm font-semibold text-[#faf8f4] hover:bg-[#3a3529] active:bg-[#1a150d] transition-colors flex items-center justify-center gap-2"
            type="button"
          >
            <Check className="h-4 w-4" />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )

  if (!portalTarget) return null
  return createPortal(content, portalTarget)
}
