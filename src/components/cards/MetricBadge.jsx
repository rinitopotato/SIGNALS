import { METRIC_LABELS } from '../../constants/metrics.js'
import { formatNum, formatPct, signedNum } from '../../utils/formatters.js'

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

/**
 * @param {string} id     — metric ID (key in METRIC_LABELS)
 * @param {*}      value
 * @param {string} fmt    — 'pct' | 'signed' | 'int' | 'bool' | 'num'
 */
export default function MetricBadge({ id, value, fmt = 'num', color }) {
  const label = METRIC_LABELS[id] ?? id
  const display = formatValue(value, fmt)
  const isPos   = typeof value === 'number' && value > 0
  const isNeg   = typeof value === 'number' && value < 0
  const varColor = color ?? (isPos ? 'var(--green)' : isNeg ? 'var(--red)' : 'var(--fg)')

  return (
    <div className="metric-item">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: varColor }}>
        {display}
      </div>
    </div>
  )
}
