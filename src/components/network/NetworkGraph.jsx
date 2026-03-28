import { useRef, useEffect, useState } from 'react'

const COLORS = ['#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#fb923c', '#34d399', '#e879f9']
const EDGE_THRESHOLD = 0.2   // min Jaccard to draw an edge

/**
 * SVG force-directed network graph
 * @param {Array}   wallets       — [{ name, address }]
 * @param {Array}   jaccardMatrix — n×n matrix
 * @param {Array}   centralities  — [{ name, centrality }]
 */
export default function NetworkGraph({ wallets = [], jaccardMatrix = [], centralities = [] }) {
  const svgRef     = useRef(null)
  const [positions, setPositions] = useState(null)

  // Run force simulation synchronously on data change
  useEffect(() => {
    if (!wallets.length || !jaccardMatrix.length) return

    const n   = wallets.length
    const W   = 460, H = 320
    const cx  = W / 2, cy = H / 2

    // Initialise positions on a circle
    const pos = wallets.map((_, i) => {
      const angle = (2 * Math.PI * i) / n
      return { x: cx + 130 * Math.cos(angle), y: cy + 110 * Math.sin(angle), vx: 0, vy: 0 }
    })

    // Simple spring-repulsion force layout
    const K_REPEL  = 3500
    const K_SPRING = 0.04
    const K_GRAVITY = 0.008
    const DAMPING  = 0.85
    const ITERS    = 120

    for (let iter = 0; iter < ITERS; iter++) {
      // Repulsion between all pairs
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = pos[i].x - pos[j].x
          const dy = pos[i].y - pos[j].y
          const dist2 = Math.max(dx*dx + dy*dy, 1)
          const force  = K_REPEL / dist2
          const dist   = Math.sqrt(dist2)
          pos[i].vx += force * dx / dist
          pos[i].vy += force * dy / dist
          pos[j].vx -= force * dx / dist
          pos[j].vy -= force * dy / dist
        }
      }

      // Spring attraction along edges (Jaccard > threshold)
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const j_val = jaccardMatrix[i]?.[j] ?? 0
          if (j_val <= EDGE_THRESHOLD) continue
          const dx   = pos[j].x - pos[i].x
          const dy   = pos[j].y - pos[i].y
          const dist = Math.sqrt(dx*dx + dy*dy) || 1
          const force = K_SPRING * j_val * dist
          pos[i].vx += force * dx / dist
          pos[i].vy += force * dy / dist
          pos[j].vx -= force * dx / dist
          pos[j].vy -= force * dy / dist
        }
      }

      // Gravity toward centre
      for (let i = 0; i < n; i++) {
        pos[i].vx += K_GRAVITY * (cx - pos[i].x)
        pos[i].vy += K_GRAVITY * (cy - pos[i].y)
      }

      // Integrate + dampen + clamp
      for (let i = 0; i < n; i++) {
        pos[i].vx *= DAMPING
        pos[i].vy *= DAMPING
        pos[i].x   = Math.max(24, Math.min(W - 24, pos[i].x + pos[i].vx))
        pos[i].y   = Math.max(24, Math.min(H - 24, pos[i].y + pos[i].vy))
      }
    }

    setPositions(pos.map(p => ({ x: p.x, y: p.y })))
  }, [wallets.length, JSON.stringify(jaccardMatrix)])  // re-run on data change

  if (!positions) {
    return (
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg2)', fontSize: 12 }}>
        Computing layout…
      </div>
    )
  }

  const n = wallets.length
  const maxCentrality = Math.max(...centralities.map(c => c.centrality), 1)

  return (
    <svg className="network-svg" viewBox="0 0 460 320">
      {/* Edges */}
      {wallets.map((_, i) =>
        wallets.map((_, j) => {
          if (j <= i) return null
          const w = jaccardMatrix[i]?.[j] ?? 0
          if (w <= EDGE_THRESHOLD) return null
          return (
            <line
              key={`e-${i}-${j}`}
              x1={positions[i].x} y1={positions[i].y}
              x2={positions[j].x} y2={positions[j].y}
              stroke="var(--border)"
              strokeWidth={Math.max(0.5, w * 4)}
              strokeOpacity={0.4 + w * 0.4}
            />
          )
        })
      )}

      {/* Nodes */}
      {wallets.map((w, i) => {
        const cent = centralities.find(c => c.name === w.name)?.centrality ?? 0
        const r    = 10 + (cent / maxCentrality) * 10
        const pos  = positions[i]
        const color = COLORS[i % COLORS.length]
        return (
          <g key={i}>
            <circle
              cx={pos.x} cy={pos.y} r={r}
              fill={color}
              fillOpacity={0.85}
              stroke="var(--bg)"
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y + r + 11}
              textAnchor="middle"
              fontSize={10}
              fill="var(--fg)"
              fontFamily="var(--font)"
            >
              {w.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
