import SignalGauge from '../components/charts/SignalGauge.jsx'
import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import HeatmapGrid from '../components/charts/HeatmapGrid.jsx'
import TradeFeed from '../components/feed/TradeFeed.jsx'
import MetricBadge from '../components/cards/MetricBadge.jsx'
import MarketPricePanel from '../components/cards/MarketPricePanel.jsx'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKETS } from '../constants/markets.js'
import { formatPct, formatNum } from '../utils/formatters.js'

export default function OverviewTab({ trades, snapshots, metrics }) {
  const { siRaw, signal, bojSeries, bEstimate, bRegimeLabel, cg, wfa, les, kStar } = metrics ?? {}

  const bojMarket = SIGNALS_MARKETS[0]

  // BOJ price chart data
  const bojChartData = (bojSeries ?? []).map(s => {
    const row = { timestamp: s.timestamp }
    bojMarket.outcomeLabels.forEach((_, i) => { row[`o${i}`] = s.prices?.[i] ?? 0 })
    return row
  })
  const bojLines = bojMarket.outcomeLabels.map((lbl, i) => ({
    key: `o${i}`, label: lbl, color: bojMarket.colors[i],
  }))

  // Current BOJ prices
  const currentPrices = bojSeries?.length
    ? bojSeries[bojSeries.length - 1].prices ?? []
    : bojMarket.outcomeLabels.map(() => 1 / bojMarket.outcomeLabels.length)
  const prevPrices = bojSeries?.length > 1
    ? bojSeries[bojSeries.length - 2].prices ?? []
    : currentPrices
  const lastBojTs = bojSeries?.length ? bojSeries[bojSeries.length - 1].timestamp : null

  // Participation heatmap
  const heatmapMatrix = WALLETS.map(w =>
    SIGNALS_MARKETS.map(m =>
      (trades ?? []).filter(t =>
        t.trader === w.address.toLowerCase() && t.market === m.address.toLowerCase()
      ).length
    )
  )

  const bBadgeClass = bRegimeLabel === 'thin' ? 'b-thin' : bRegimeLabel === 'moderate' ? 'b-mod' : 'b-thick'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Row 1: SI Gauge + BOJ live price panel */}
      <div className="overview-row-1">
        <div className="card">
          <div className="card-title">BOJ Signal Index (SI_raw)</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SignalGauge value={siRaw ?? 0} signal={signal ?? 'NEUTRAL'} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, justifyContent: 'center' }}>
            <span className={`b-badge ${bBadgeClass}`}>
              b̂ {bEstimate != null ? formatNum(bEstimate, 1) : '?'} ({bRegimeLabel ?? 'unknown'})
            </span>
            <span className={`badge ${cg ? 'badge-green' : 'badge-grey'}`}>
              Gate {cg ? 'OPEN' : 'CLOSED'}
            </span>
            <span className={`badge ${wfa > 0.55 ? 'badge-green' : 'badge-amber'}`}>
              WFA {wfa != null ? formatPct(wfa) : '—'}
            </span>
            <span className="badge badge-blue">
              k* {kStar ?? 0} · LES {les != null ? formatNum(les, 3) : '—'}
            </span>
          </div>
        </div>

        <MarketPricePanel
          market={bojMarket}
          prices={currentPrices}
          prevPrices={prevPrices}
          lastTs={lastBojTs}
        />
      </div>

      {/* Row 2: BOJ price chart full width */}
      <div className="card">
        <div className="card-title">日銀金利 — Outcome Probability History</div>
        <PriceLineChart data={bojChartData} lines={bojLines} height={260} />
      </div>

      {/* Row 3: Trade feed + Heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">Live Trade Feed</div>
          <TradeFeed trades={trades ?? []} maxRows={30} />
        </div>
        <div className="card">
          <div className="card-title">Participation Heatmap</div>
          <HeatmapGrid
            matrix={heatmapMatrix}
            rowLabels={WALLETS.map(w => w.name)}
            colLabels={SIGNALS_MARKETS.map(m => m.name)}
            maxColor="#6c8fff"
          />
        </div>
      </div>

      {/* KPI Summary */}
      <div className="card">
        <div className="card-title">Key Performance Indicators</div>
        <div className="metric-grid">
          <MetricBadge id="IT"  value={metrics?.compositeIndex?.slice(-1)[0] ?? null} fmt="signed" />
          <MetricBadge id="KS"  value={kStar ?? null} fmt="int" />
          <MetricBadge id="LES" value={les ?? null} fmt="signed" />
          <MetricBadge id="WFA" value={wfa ?? null} fmt="pct" />
          <MetricBadge id="CG"  value={cg ?? null} fmt="bool" />
          <MetricBadge id="SNR" value={metrics?.decomposition?.snr ?? null} />
          <MetricBadge id="GLS" value={metrics?.globalLocalSpread ?? null} fmt="signed" />
          <MetricBadge id="DS"  value={metrics?.divergenceSignal ?? null} />
          <MetricBadge id="MCP" value={metrics?.mcp ?? null} fmt="pct" />
          <MetricBadge id="SCS" value={metrics?.scs ?? null} />
        </div>
      </div>
    </div>
  )
}
