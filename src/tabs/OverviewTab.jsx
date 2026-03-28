import SignalGauge from '../components/charts/SignalGauge.jsx'
import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import HeatmapGrid from '../components/charts/HeatmapGrid.jsx'
import TradeFeed from '../components/feed/TradeFeed.jsx'
import MetricBadge from '../components/cards/MetricBadge.jsx'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKETS } from '../constants/markets.js'
import { formatPct, formatNum, toJST } from '../utils/formatters.js'

export default function OverviewTab({ trades, snapshots, metrics }) {
  const { siRaw, signal, bojSeries, bojPrices, bEstimate, bRegimeLabel, cg, wfa, les, kStar } = metrics ?? {}

  // BOJ price chart data
  const bojMarket = SIGNALS_MARKETS[0]
  const bojChartData = (bojSeries ?? []).map(s => {
    const row = { timestamp: s.timestamp }
    bojMarket.outcomeLabels.forEach((lbl, i) => {
      row[`o${i}`] = s.prices?.[i] ?? 0
    })
    return row
  })

  const bojLines = bojMarket.outcomeLabels.map((lbl, i) => ({
    key: `o${i}`,
    label: lbl,
    color: bojMarket.colors[i],
  }))

  // Participation heatmap: traders × markets, cell = trade count
  const heatmapMatrix = WALLETS.map(w =>
    SIGNALS_MARKETS.map(m =>
      (trades ?? []).filter(t =>
        t.trader === w.address.toLowerCase() &&
        t.market === m.address.toLowerCase()
      ).length
    )
  )

  const bBadgeClass = bRegimeLabel === 'thin' ? 'b-thin' : bRegimeLabel === 'moderate' ? 'b-mod' : 'b-thick'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Row 1: Gauge + BOJ chart */}
      <div className="panel-grid panel-grid-2">
        {/* SI Gauge */}
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

        {/* BOJ price history */}
        <PriceLineChart
          data={bojChartData}
          lines={bojLines}
          title="日銀金利 — Outcome Probability History"
          height={220}
        />
      </div>

      {/* Row 2: Participation heatmap + Live trade feed */}
      <div className="panel-grid panel-grid-2">
        <div className="card">
          <div className="card-title">Participation Heatmap (trades per trader × market)</div>
          <HeatmapGrid
            matrix={heatmapMatrix}
            rowLabels={WALLETS.map(w => w.name)}
            colLabels={SIGNALS_MARKETS.map(m => m.name)}
            maxColor="#6c8fff"
          />
        </div>
        <div className="card">
          <div className="card-title">Live Trade Feed</div>
          <TradeFeed trades={trades ?? []} maxRows={25} />
        </div>
      </div>

      {/* Row 3: Key KPIs */}
      <div className="card">
        <div className="card-title">Monthly KPI Summary</div>
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
