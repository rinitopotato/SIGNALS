import { useState } from 'react'
import { METRIC_LABELS, METRIC_INFO } from '../../constants/metrics.js'
import { formatNum, formatPct, signedNum } from '../../utils/formatters.js'
import InfoModal from './InfoModal.jsx'

function formatValue(value, fmt) {
  if (value == null || (typeof value === 'number' && isNaN(value))) return '—'
  switch (fmt) {
    case 'pct':    return formatPct(value)
    case 'signed': return signedNum(value)
    case 'int':    return String(Math.round(value))
    case 'bool':   return value ? 'YES' : 'NO'
    default:       return formatNum(value, 3)
  }
}

export default function MetricBadge({ id, value, fmt = 'num', color }) {
  const [showInfo, setShowInfo] = useState(false)
  const label    = METRIC_LABELS[id] ?? id
  const display  = formatValue(value, fmt)
  const isPos    = typeof value === 'number' && value > 0
  const isNeg    = typeof value === 'number' && value < 0
  const varColor = color ?? (isPos ? 'var(--green)' : isNeg ? 'var(--red)' : 'var(--fg)')
  const hasInfo  = Boolean(METRIC_INFO[id])

  return (
    <div className="metric-item">
      {hasInfo && (
        <button className="info-btn" onClick={() => setShowInfo(true)} title="Show formula & methodology">ⓘ</button>
      )}
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: varColor }}>
        {display}
      </div>
      {showInfo && (
        <InfoModal id={id} onClose={() => setShowInfo(false)} />
      )}
    </div>
  )
}
