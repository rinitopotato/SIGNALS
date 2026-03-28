import SignalGauge from '../components/charts/SignalGauge.jsx'
import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import HeatmapGrid from '../components/charts/HeatmapGrid.jsx'
import TradeFeed from '../components/feed/TradeFeed.jsx'
import MetricBadge from '../components/cards/MetricBadge.jsx'
import MarketPricePanel from '../components/cards/MarketPricePanel.jsx'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKETS, TREND_KEYWORD_GROUPS } from '../constants/markets.js'
import { formatPct, formatNum } from '../utils/formatters.js'

// ── Google Trends card per market ─────────────────────────────────
function TrendsMarketCard({ marketId, groupMeta, data }) {
  if (!data) return (
    <div className="card" style={{ border: `2px solid ${groupMeta.color}20` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: groupMeta.color, letterSpacing: '0.08em', marginBottom: 8 }}>
        {groupMeta.label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg2)', fontStyle: 'italic' }}>Loading attention data…</div>
    </div>
  )

  const statusColor = s => s === 'Rising' ? 'var(--green)' : s === 'Falling' ? 'var(--red)' : 'var(--fg2)'
  const statusArrow = s => s === 'Rising' ? '↑' : s === 'Falling' ? '↓' : '→'

  // Inline sparkline from wiki series
  const wikiVals = data.wikiSeries?.map(p => p.views) ?? []
  const maxW = Math.max(...wikiVals, 1)
  const sparkW = 220, sparkH = 40
  const sparkPts = wikiVals.length > 1
    ? wikiVals.map((v, i) => `${(i / (wikiVals.length - 1)) * sparkW},${sparkH - (v / maxW) * (sparkH - 4) - 2}`).join(' ')
    : null

  return (
    <div className="card" style={{ border: `2px solid ${groupMeta.color}30`, flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: groupMeta.color, letterSpacing: '0.08em', marginBottom: 8 }}>
        {groupMeta.label}
      </div>

      {/* Keyword status badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {data.keywordSeries?.map(k => (
          <div key={k.keyword} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: k.status === 'Rising' ? 'rgba(52,211,153,0.15)' : k.status === 'Falling' ? 'rgba(248,113,113,0.15)' : 'var(--bg3)',
              color: statusColor(k.status),
            }}>
              {statusArrow(k.status)} {k.status}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg2)' }}>{k.keyword}</span>
          </div>
        ))}
      </div>

      {/* Avg + Peak stats from keyword series */}
      {data.keywordSeries?.map(k => {
        const vals = k.values ?? []
        const avg  = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
        const peak = vals.length ? Math.round(Math.max(...vals)) : 0
        return (
          <div key={k.keyword} style={{
            background: 'var(--bg3)', borderRadius: 6, padding: '6px 10px', marginBottom: 6,
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{ fontSize: 11, color: 'var(--fg2)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {k.keyword}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: groupMeta.color }}>
              {avg}
            </span>
            <span style={{ fontSize: 10, color: 'var(--fg2)' }}>avg · peak {peak}</span>
          </div>
        )
      })}

      {/* Wikipedia sparkline */}
      {sparkPts && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--fg2)', marginBottom: 4 }}>Wikipedia attention (last 30d)</div>
          <svg width="100%" viewBox={`0 0 ${sparkW} ${sparkH}`} style={{ maxWidth: sparkW }}>
            <polyline
              points={sparkPts}
              fill="none"
              stroke={groupMeta.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Synthetic trends note */}
      <div style={{ fontSize: 9, color: 'var(--fg2)', marginTop: 6, fontStyle: 'italic' }}>
        Trend data is synthetic (Google Trends API unavailable) · Wikipedia data is real
      </div>
    </div>
  )
}

export default function OverviewTab({ trades, snapshots, metrics, perMarketData = {} }) {
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

      {/* Google Trends per-market section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Google Trends</span>
          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'var(--bg3)', color: 'var(--fg2)', border: '1px solid var(--border)' }}>
            SEARCH INTEREST
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(TREND_KEYWORD_GROUPS).map(([marketId, groupMeta]) => (
            <TrendsMarketCard
              key={marketId}
              marketId={marketId}
              groupMeta={groupMeta}
              data={perMarketData[marketId]}
            />
          ))}
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
