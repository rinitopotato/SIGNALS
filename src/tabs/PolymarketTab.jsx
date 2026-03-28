import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import ProbabilityBar from '../components/charts/ProbabilityBar.jsx'
import LoadingSpinner from '../components/layout/LoadingSpinner.jsx'
import { POLYMARKET_EVENTS } from '../constants/markets.js'
import { formatCompact, formatPct, toJST } from '../utils/formatters.js'
import { polymarketMid } from '../utils/lmsr.js'

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

  // Build chart data from CLOB history
  const chartData = (primaryMarket?.history ?? []).map(h => ({
    timestamp: h.t,
    price: h.price,
  }))

  // Current odds from Gamma
  const outcomes = (primaryMarket?.outcomes ?? ['Yes', 'No']).map((lbl, i) => ({
    label: lbl,
    probability: primaryMarket?.outcomePrices?.[i] ?? 0,
    color: PM_COLORS[i % PM_COLORS.length],
  }))

  const mid = primaryMarket
    ? polymarketMid(primaryMarket.bestBid ?? 0, primaryMarket.bestAsk ?? 1)
    : null

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
        {mid != null && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg2)', fontFamily: 'var(--mono)' }}>
            Mid-price: {formatPct(mid)} · Liquidity: ${formatCompact(primaryMarket?.liquidity)}
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <PriceLineChart
          data={chartData}
          lines={[{ key: 'price', label: 'Yes', color: '#34d399' }]}
          title="CLOB Price History (Yes outcome)"
          height={180}
        />
      )}

      {markets.length > 1 && (
        <div className="card">
          <div className="card-title">All Outcome Markets</div>
          {markets.map((m, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 4 }}>{m.question}</div>
              <ProbabilityBar
                outcomes={(m.outcomes ?? ['Yes','No']).map((lbl, j) => ({
                  label: lbl,
                  probability: m.outcomePrices?.[j] ?? 0,
                  color: PM_COLORS[j % PM_COLORS.length],
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
        Polymarket CLOB — mid-price = (best_ask + best_bid) / 2 ·
        Micro-price = (V_bid·ask + V_ask·bid) / (V_bid + V_ask) ·
        Data sourced from gamma-api.polymarket.com + clob.polymarket.com
      </div>
    </div>
  )
}
