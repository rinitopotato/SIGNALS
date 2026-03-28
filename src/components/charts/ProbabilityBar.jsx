import { formatPct } from '../../utils/formatters.js'

const DEFAULT_COLORS = ['#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f87171']

/**
 * Horizontal probability bar component
 * @param {Array} outcomes — [{ label, probability, color }]
 */
export default function ProbabilityBar({ outcomes = [] }) {
  if (!outcomes.length) return <div style={{ color: 'var(--fg2)', fontSize: 12 }}>No outcomes</div>

  return (
    <div className="prob-bar-wrap">
      {outcomes.map((o, i) => {
        const pct = Math.max(0, Math.min(1, o.probability ?? 0))
        const color = o.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
        return (
          <div key={i} className="prob-bar-row">
            <span className="prob-bar-label" title={o.label}>{o.label}</span>
            <div className="prob-bar-track">
              <div
                className="prob-bar-fill"
                style={{ width: `${pct * 100}%`, background: color }}
              />
            </div>
            <span className="prob-bar-pct" style={{ color }}>{formatPct(pct)}</span>
          </div>
        )
      })}
    </div>
  )
}
