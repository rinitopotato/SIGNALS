/**
 * SVG arc gauge for SI_raw → HIKE / HOLD / NEUTRAL
 * value ∈ [-1, +1]
 */
export default function SignalGauge({ value = 0, signal = 'NEUTRAL' }) {
  const cx = 90, cy = 90, r = 70
  const startAngle = 210   // degrees
  const endAngle   = 330   // sweep = 300°

  // Convert value [-1,+1] to angle
  const norm   = (value + 1) / 2           // 0..1
  const sweep  = endAngle - startAngle      // 300
  const angle  = startAngle + norm * sweep  // current needle angle

  const toRad = d => (d * Math.PI) / 180

  function arcPath(from, to, ri) {
    const x1 = cx + ri * Math.cos(toRad(from))
    const y1 = cy + ri * Math.sin(toRad(from))
    const x2 = cx + ri * Math.cos(toRad(to))
    const y2 = cy + ri * Math.sin(toRad(to))
    const large = to - from > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${ri} ${ri} 0 ${large} 1 ${x2} ${y2}`
  }

  // Needle
  const nx = cx + (r - 12) * Math.cos(toRad(angle))
  const ny = cy + (r - 12) * Math.sin(toRad(angle))

  const signalColor = signal === 'HIKE' ? 'var(--hike)' : signal === 'HOLD' ? 'var(--hold)' : 'var(--neutral)'

  // Three arc segments: HOLD (red), NEUTRAL (amber), HIKE (green)
  // HOLD: startAngle → startAngle+100 (≈ -1 to -0.33)
  // NEUTRAL: +100 → +200
  // HIKE: +200 → endAngle
  const holdEnd    = startAngle + 100
  const neutralEnd = startAngle + 200

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 180 110" width="220" height="140">
        {/* Background track */}
        <path d={arcPath(startAngle, startAngle + sweep, r)} fill="none" stroke="var(--bg3)" strokeWidth={12} strokeLinecap="round" />

        {/* HOLD segment (red) */}
        <path d={arcPath(startAngle, holdEnd, r)} fill="none" stroke="var(--hold)" strokeWidth={12} opacity={0.35} />
        {/* NEUTRAL segment (amber) */}
        <path d={arcPath(holdEnd, neutralEnd, r)} fill="none" stroke="var(--neutral)" strokeWidth={12} opacity={0.35} />
        {/* HIKE segment (green) */}
        <path d={arcPath(neutralEnd, startAngle + sweep, r)} fill="none" stroke="var(--hike)" strokeWidth={12} opacity={0.35} />

        {/* Filled arc to needle */}
        <path
          d={arcPath(startAngle, angle, r)}
          fill="none"
          stroke={signalColor}
          strokeWidth={12}
          strokeLinecap="round"
        />

        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={nx} y2={ny}
          stroke={signalColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill={signalColor} />

        {/* Threshold markers */}
        {[-0.02, 0.02].map((v, k) => {
          const n2    = (v + 1) / 2
          const deg   = startAngle + n2 * sweep
          const mx1   = cx + (r - 18) * Math.cos(toRad(deg))
          const my1   = cy + (r - 18) * Math.sin(toRad(deg))
          const mx2   = cx + (r + 6)  * Math.cos(toRad(deg))
          const my2   = cy + (r + 6)  * Math.sin(toRad(deg))
          return <line key={k} x1={mx1} y1={my1} x2={mx2} y2={my2} stroke="var(--fg2)" strokeWidth={1} />
        })}

        {/* Labels */}
        <text x={16} y={105} fontSize={9} fill="var(--hold)" textAnchor="middle">HOLD</text>
        <text x={90} y={20}  fontSize={9} fill="var(--neutral)" textAnchor="middle">NEUTRAL</text>
        <text x={162} y={105} fontSize={9} fill="var(--hike)" textAnchor="middle">HIKE</text>

        {/* Centre value */}
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={11} fill="var(--fg2)" fontFamily="var(--mono)">
          {value >= 0 ? '+' : ''}{(value * 100).toFixed(1)}%
        </text>
      </svg>
      <div className={`gauge-label signal-${signal.toLowerCase()}`}>{signal}</div>
      <div className="gauge-sub">SI_raw = P(hike) − P(hold)</div>
    </div>
  )
}
