import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import ProbabilityBar from '../components/charts/ProbabilityBar.jsx'
import LoadingSpinner from '../components/layout/LoadingSpinner.jsx'
import { POLYMARKET_EVENTS } from '../constants/markets.js'
import { formatCompact, formatPct } from '../utils/formatters.js'

const PM_COLORS = ['#34d399', '#f87171', '#6c8fff', '#fbbf24', '#a78bfa']

function EventPanel({ event, pmMeta }) {
  if (!event) {
    return (
      <div className="card">
        <div className="card-title">{pmMeta.label}</div>
        <div style={{ color: 'var(--fg2)', fontSize: 12 }}>Loading…</div>
      </div>
    )
  }

  if (event.error) {
    return (
      <div className="card">
        <div className="card-title">{pmMeta.label}</div>
        <div style={{ color: 'var(--red)', fontSize: 12 }}>Failed to fetch</div>
      </div>
    )
  }

  const markets = event.markets ?? []
  const primaryMarket = markets[0]

  // tokenHistories: [{ tokenId, outcome, history: [{t, price}] }]
  const tokenHistories = primaryMarket?.tokenHistories ?? []

  // Build multi-line chart: one line per outcome token
  const allTs = [...new Set(
    tokenHistories.flatMap(th => th.history.map(h => h.t))
  )].sort((a, b) => a - b)

  const chartData = allTs.map(t => {
    const row = { timestamp: t }
    tokenHistories.forEach((th, i) => {
      const pt = th.history.find(h => h.t === t)
      row[`token${i}`] = pt ? pt.price : null
    })
    return row
  })

  const chartLines = tokenHistories.map((th, i) => ({
    key:   `token${i}`,
    label: th.outcome,
    color: PM_COLORS[i % PM_COLORS.length],
  }))

  // Current odds from Gamma outcomePrices
  const outcomes = (primaryMarket?.outcomes ?? ['Yes', 'No']).map((lbl, i) => ({
    label:       lbl,
    probability: primaryMarket?.outcomePrices?.[i] ?? 0,
    color:       PM_COLORS[i % PM_COLORS.length],
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{event.title ?? pmMeta.label}</span>
          {primaryMarket?.volume != null && (
            <span className="badge badge-grey">Vol ${formatCompact(primaryMarket.volume)}</span>
          )}
        </div>
        <ProbabilityBar outcomes={outcomes} />
        {primaryMarket?.liquidity != null && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg2)', fontFamily: 'var(--mono)' }}>
            Liquidity: ${formatCompact(primaryMarket.liquidity)}
          </div>
        )}
      </div>

      {chartData.length > 0 && chartLines.length > 0 && (
        <PriceLineChart
          data={chartData}
          lines={chartLines}
          title="CLOB Price History (per outcome token)"
          height={180}
        />
      )}

      {markets.length > 1 && (
        <div className="card">
          <div className="card-title">All Outcome Markets ({markets.length})</div>
          {markets.map((m, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 4 }}>{m.question}</div>
              <ProbabilityBar
                outcomes={(m.outcomes ?? ['Yes','No']).map((lbl, j) => ({
                  label:       lbl,
                  probability: m.outcomePrices?.[j] ?? 0,
                  color:       PM_COLORS[j % PM_COLORS.length],
                }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PolymarketTab({ events = [], isLoading }) {
  if (isLoading && !events.length) {
    return <LoadingSpinner message="Fetching Polymarket data…" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel-grid panel-grid-3">
        {POLYMARKET_EVENTS.map((pmMeta, i) => (
          <EventPanel key={pmMeta.slug} event={events[i]} pmMeta={pmMeta} />
        ))}
      </div>
      <div className="card" style={{ fontSize: 11, color: 'var(--fg2)' }}>
        Polymarket CLOB — price history per token ID ·
        Data sourced from gamma-api.polymarket.com + clob.polymarket.com
      </div>
    </div>
  )
}
