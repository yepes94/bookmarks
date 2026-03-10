import type { OrnamentalPattern } from "@/lib/template-config"

interface OrnamentalOverlayProps {
  pattern: OrnamentalPattern
  color: string
  opacity: number
}

function LinesPattern({ color }: { color: string }) {
  const lines: React.ReactNode[] = []
  for (let y = 40; y <= 640; y += 20) {
    lines.push(<line key={y} x1="16" y1={y} x2="204" y2={y} stroke={color} strokeWidth="0.5" />)
  }
  return <g>{lines}</g>
}

function BorderPattern({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color}>
      <rect x="12" y="12" width="196" height="656" strokeWidth="0.8" />
      <rect x="20" y="20" width="180" height="640" strokeWidth="0.4" />
      {/* Corner L-brackets */}
      <path d="M12,12 L32,12 M12,12 L12,32" strokeWidth="1.5" />
      <path d="M208,12 L188,12 M208,12 L208,32" strokeWidth="1.5" />
      <path d="M12,668 L32,668 M12,668 L12,648" strokeWidth="1.5" />
      <path d="M208,668 L188,668 M208,668 L208,648" strokeWidth="1.5" />
      {/* Corner diamonds */}
      <path d="M22,22 L27,17 L32,22 L27,27 Z" fill={color} strokeWidth="0" />
      <path d="M198,22 L193,17 L188,22 L193,27 Z" fill={color} strokeWidth="0" />
      <path d="M22,658 L27,663 L32,658 L27,653 Z" fill={color} strokeWidth="0" />
      <path d="M198,658 L193,663 L188,658 L193,653 Z" fill={color} strokeWidth="0" />
      {/* Center divider ornament */}
      <line x1="50" y1="334" x2="98" y2="334" strokeWidth="0.5" />
      <path d="M110,334 L105,329 L110,324 L115,329 Z" fill={color} strokeWidth="0" />
      <line x1="122" y1="334" x2="170" y2="334" strokeWidth="0.5" />
    </g>
  )
}

function CrossesPattern({ color }: { color: string }) {
  const elements: React.ReactNode[] = []
  for (let row = 0; row * 22 + 28 < 680; row++) {
    for (let col = 0; col * 22 + 18 < 220; col++) {
      const x = col * 22 + 18
      const y = row * 22 + 28
      elements.push(
        <g key={`${row}-${col}`}>
          <line x1={x - 3} y1={y} x2={x + 3} y2={y} stroke={color} strokeWidth="0.6" />
          <line x1={x} y1={y - 3} x2={x} y2={y + 3} stroke={color} strokeWidth="0.6" />
        </g>
      )
    }
  }
  return <g>{elements}</g>
}

function FiligreePattern({ color }: { color: string }) {
  const leftStem = "M24,16 C20,40 28,60 24,80 C20,100 28,120 24,140 C20,160 28,180 24,200 C20,220 28,240 24,260 C20,280 28,300 24,320 C20,340 28,360 24,380 C20,400 28,420 24,440 C20,460 28,480 24,500 C20,520 28,540 24,560 C20,580 28,600 24,620 C20,640 24,660 24,664"
  const rightStem = "M196,16 C200,40 192,60 196,80 C200,100 192,120 196,140 C200,160 192,180 196,200 C200,220 192,240 196,260 C200,280 192,300 196,320 C200,340 192,360 196,380 C200,400 192,420 196,440 C200,460 192,480 196,500 C200,520 192,540 196,560 C200,580 192,600 196,620 C200,640 196,660 196,664"

  const leafYs = [60, 120, 180, 240, 300, 360, 420, 480, 540, 600]
  const leftLeaves = leafYs.map(y =>
    `M24,${y} Q13,${y - 9} 9,${y - 18} Q15,${y - 10} 24,${y} M24,${y} Q13,${y + 9} 9,${y + 18} Q15,${y + 10} 24,${y}`
  ).join(" ")
  const rightLeaves = leafYs.map(y =>
    `M196,${y} Q207,${y - 9} 211,${y - 18} Q205,${y - 10} 196,${y} M196,${y} Q207,${y + 9} 211,${y + 18} Q205,${y + 10} 196,${y}`
  ).join(" ")

  return (
    <g fill="none" stroke={color} strokeWidth="0.8">
      <path d={leftStem} />
      <path d={leftLeaves} strokeWidth="0.5" />
      <path d={rightStem} />
      <path d={rightLeaves} strokeWidth="0.5" />
    </g>
  )
}

export function OrnamentalOverlay({ pattern, color, opacity }: OrnamentalOverlayProps) {
  return (
    <svg
      viewBox="0 0 220 680"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
        pointerEvents: "none",
        opacity,
      }}
    >
      {pattern === "lines" && <LinesPattern color={color} />}
      {pattern === "border" && <BorderPattern color={color} />}
      {pattern === "crosses" && <CrossesPattern color={color} />}
      {pattern === "filigree" && <FiligreePattern color={color} />}
    </svg>
  )
}
