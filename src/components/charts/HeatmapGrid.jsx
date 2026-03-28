/**
 * Generic 2D SVG heatmap
 * @param {Array}  matrix    — 2D array of numbers
 * @param {Array}  rowLabels
 * @param {Array}  colLabels
 * @param {string} minColor  — CSS colour for min value
 * @param {string} maxColor  — CSS colour for max value
 */
export default function HeatmapGrid({
  matrix,
  rowLabels,
  colLabels,
  minColor = '#1e1e22',
  maxColor = '#6c8fff',
  title,
  showValues = true,
}) {
  if (!matrix || !matrix.length) return null

  const nRows  = matrix.length
  const nCols  = matrix[0].length
  const cellSz = 32
  const labelW = 70
  const labelH = 56
  const svgW   = labelW + nCols * cellSz
  const svgH   = labelH + nRows * cellSz

  // Min/max for colour interpolation
  const flat = matrix.flat().filter(v => v != null && !isNaN(v))
  const minV = Math.min(...flat)
  const maxV = Math.max(...flat)

  function lerpColor(t) {
    // t ∈ [0,1] → interpolate between minColor and maxColor
    const [r1,g1,b1] = hexToRgb(minColor)
    const [r2,g2,b2] = hexToRgb(maxColor)
    const r = Math.round(r1 + (r2-r1)*t)
    const g = Math.round(g1 + (g2-g1)*t)
    const b = Math.round(b1 + (b2-b1)*t)
    return `rgb(${r},${g},${b})`
  }

  function cellColor(v) {
    if (v == null || isNaN(v)) return 'var(--bg3)'
    const t = maxV === minV ? 0.5 : (v - minV) / (maxV - minV)
    return lerpColor(t)
  }

  return (
    <div>
      {title && <div className="card-title">{title}</div>}
      <div className="heatmap-wrap">
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>
          {/* Column labels */}
          {colLabels?.map((lbl, j) => (
            <text
              key={j}
              x={labelW + j * cellSz + cellSz / 2}
              y={labelH - 4}
              textAnchor="middle"
              fontSize={9}
              fill="var(--fg2)"
              transform={`rotate(-40 ${labelW + j * cellSz + cellSz/2} ${labelH - 4})`}
            >
              {String(lbl).slice(0, 6)}
            </text>
          ))}

          {/* Row labels */}
          {rowLabels?.map((lbl, i) => (
            <text
              key={i}
              x={labelW - 4}
              y={labelH + i * cellSz + cellSz / 2 + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--fg2)"
            >
              {String(lbl).slice(0, 8)}
            </text>
          ))}

          {/* Cells */}
          {matrix.map((row, i) =>
            row.map((val, j) => {
              const x = labelW + j * cellSz
              const y = labelH + i * cellSz
              const textColor = val != null && (val - minV) / (maxV - minV) > 0.5 ? '#0d0d0f' : 'var(--fg)'
              return (
                <g key={`${i}-${j}`}>
                  <rect
                    x={x} y={y}
                    width={cellSz - 1} height={cellSz - 1}
                    fill={cellColor(val)}
                    rx={2}
                  />
                  {showValues && val != null && (
                    <text
                      x={x + cellSz / 2} y={y + cellSz / 2 + 4}
                      textAnchor="middle"
                      fontSize={8}
                      fill={textColor}
                    >
                      {val.toFixed(2)}
                    </text>
                  )}
                </g>
              )
            })
          )}
        </svg>
      </div>
    </div>
  )
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return [30, 30, 34]
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}
