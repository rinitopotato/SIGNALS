import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import MarketPricePanel from '../components/cards/MarketPricePanel.jsx'
import { SIGNALS_MARKETS } from '../constants/markets.js'
import { lmsrPrices } from '../utils/lmsr.js'
import { toJST, truncateAddress } from '../utils/formatters.js'

function MarketPanel({ market, snapshots }) {
  const marketSnaps = snapshots
    .filter(s => s.market === market.address.toLowerCase())
    .sort((a, b) => a.timestamp - b.timestamp)

  // Group by timestamp
  const byTs = {}
  for (const s of marketSnaps) {
    if (!byTs[s.timestamp]) byTs[s.timestamp] = {}
    byTs[s.timestamp][s.outcomeIndex] = s.price
  }

  const tsEntries = Object.entries(byTs).sort(([a], [b]) => Number(a) - Number(b))

  const chartData = tsEntries.map(([ts, ot]) => {
    const row = { timestamp: Number(ts) }
    market.outcomeLabels.forEach((_, i) => { row[`o${i}`] = ot[i] ?? null })
    return row
  })

  const lines = market.outcomeLabels.map((lbl, i) => ({
    key: `o${i}`, label: lbl, color: market.colors[i],
  }))

  // Latest and previous prices
  const latestEntry = tsEntries[tsEntries.length - 1]
  const prevEntry   = tsEntries[tsEntries.length - 2]

  const toNormalised = (ot) => {
    const arr = market.outcomeLabels.map((_, i) => ot?.[i] ?? 0)
    const sum = arr.reduce((a, b) => a + b, 0)
    return sum > 0.9 ? arr : lmsrPrices(arr)
  }

  const currentPrices = latestEntry ? toNormalised(latestEntry[1]) : market.outcomeLabels.map(() => 1 / market.outcomeLabels.length)
  const prevPrices    = prevEntry   ? toNormalised(prevEntry[1])   : currentPrices
  const lastTs        = latestEntry ? Number(latestEntry[0]) : null

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <MarketPricePanel
        market={market}
        prices={currentPrices}
        prevPrices={prevPrices}
        lastTs={lastTs}
      />
      <PriceLineChart
        data={chartData}
        lines={lines}
        title={`${market.name} — Probability History`}
        height={260}
      />
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--fg2)', fontFamily: 'var(--mono)', flexWrap: 'wrap' }}>
        <span>Contract: {truncateAddress(market.address)}</span>
        <span>{marketSnaps.length} snapshots</span>
        {lastTs && <span>Latest: {toJST(lastTs)}</span>}
      </div>
    </div>
  )
}

export default function SignalsTab({ snapshots = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {SIGNALS_MARKETS.map(m => (
        <MarketPanel key={m.id} market={m} snapshots={snapshots} />
      ))}
    </div>
  )
}
