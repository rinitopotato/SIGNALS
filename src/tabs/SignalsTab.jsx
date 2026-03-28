import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import MarketSnapshot from '../components/cards/MarketSnapshot.jsx'
import { SIGNALS_MARKETS } from '../constants/markets.js'
import { lmsrPrices } from '../utils/lmsr.js'
import { toJST } from '../utils/formatters.js'

function MarketPanel({ market, snapshots }) {
  // Build price time series for this market
  const marketSnaps = snapshots
    .filter(s => s.market === market.address.toLowerCase())
    .sort((a, b) => a.timestamp - b.timestamp)

  // Group by timestamp → compute prices
  const byTs = {}
  for (const s of marketSnaps) {
    if (!byTs[s.timestamp]) byTs[s.timestamp] = {}
    byTs[s.timestamp][s.outcomeIndex] = s.price
  }

  const chartData = Object.entries(byTs)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([ts, ot]) => {
      const row = { timestamp: Number(ts) }
      market.outcomeLabels.forEach((_, i) => {
        row[`o${i}`] = ot[i] ?? null
      })
      return row
    })

  const lines = market.outcomeLabels.map((lbl, i) => ({
    key: `o${i}`, label: lbl, color: market.colors[i],
  }))

  // Latest prices
  const latestTs   = marketSnaps[marketSnaps.length - 1]
  const latestPrices = latestTs ? (() => {
    const ot = byTs[latestTs.timestamp]
    const arr = market.outcomeLabels.map((_, i) => ot[i] ?? 0)
    // normalise via lmsr if sums don't add up
    const sum = arr.reduce((a, b) => a + b, 0)
    return sum > 0.9 ? arr : lmsrPrices(arr)
  })() : market.outcomeLabels.map(() => 1 / market.outcomeLabels.length)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <MarketSnapshot market={market} prices={latestPrices} lastTs={latestTs?.timestamp} />
      <PriceLineChart
        data={chartData}
        lines={lines}
        title={`${market.name} — Probability History`}
        height={200}
      />
      <div className="card" style={{ fontSize: 11, color: 'var(--fg2)' }}>
        <div className="card-title">Market Info</div>
        <div style={{ fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{market.address}</div>
        <div style={{ marginTop: 4 }}>{marketSnaps.length} snapshots · Latest: {toJST(latestTs?.timestamp)}</div>
      </div>
    </div>
  )
}

export default function SignalsTab({ snapshots = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel-grid panel-grid-3">
        {SIGNALS_MARKETS.map(m => (
          <MarketPanel key={m.id} market={m} snapshots={snapshots} />
        ))}
      </div>
    </div>
  )
}
