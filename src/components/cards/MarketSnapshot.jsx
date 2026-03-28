import ProbabilityBar from '../charts/ProbabilityBar.jsx'
import { toJST } from '../../utils/formatters.js'

export default function MarketSnapshot({ market, prices = [], lastTs }) {
  if (!market) return null

  const outcomes = market.outcomeLabels.map((label, i) => ({
    label,
    probability: prices[i] ?? 0,
    color: market.colors[i],
  }))

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontWeight: 700 }}>{market.name}</span>
        <span style={{ fontSize: 11, color: 'var(--fg2)', fontFamily: 'var(--mono)' }}>
          {toJST(lastTs)}
        </span>
      </div>
      <ProbabilityBar outcomes={outcomes} />
    </div>
  )
}
