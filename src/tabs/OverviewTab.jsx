import {
  ComposedChart, Line, YAxis, XAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import SignalGauge from '../components/charts/SignalGauge.jsx'
import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import HeatmapGrid from '../components/charts/HeatmapGrid.jsx'
import TradeFeed from '../components/feed/TradeFeed.jsx'
import MetricBadge from '../components/cards/MetricBadge.jsx'
import MarketPricePanel from '../components/cards/MarketPricePanel.jsx'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKETS, TREND_KEYWORD_GROUPS } from '../constants/markets.js'
import { formatPct, formatNum } from '../utils/formatters.js'

function TrendsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const mm = label?.slice(4, 6), dd = label?.slice(6, 8)
  const dateStr = mm && dd ? `${mm}/${dd}` : label
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px' }}>
      <div style={{ fontSize: 10, color: 'var(--fg2)', marginBottom: 3 }}>{dateStr}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 11, fontFamily: 'var(--mono)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : '—'}
        </div>
      ))}
    </div>
  )
}

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

  const mergedDaily = data.mergedDaily ?? []
  const keywordSeries = data.keywordSeries ?? []

  return (
    <div className="card" style={{ border: `2px solid ${groupMeta.color}30`, flex: 1, minWidth: 260 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: groupMeta.color, letterSpacing: '0.08em' }}>
          {groupMeta.label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--fg2)', fontStyle: 'italic' }}>
          avg {data.avg ?? 0} · peak {data.peak ?? 0}
        </span>
      </div>

      {/* Keyword status badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {keywordSeries.map(k => (
          <span key={k.keyword} style={{
            padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
            background: k.status === 'Rising' ? 'rgba(52,211,153,0.15)' : k.status === 'Falling' ? 'rgba(248,113,113,0.15)' : 'var(--bg3)',
            color: statusColor(k.status),
            border: `1px solid ${k.status === 'Rising' ? 'rgba(52,211,153,0.3)' : k.status === 'Falling' ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
          }}>
            {statusArrow(k.status)} {k.keyword}
          </span>
        ))}
      </div>

      {/* Recharts ComposedChart — trends (right) + wiki normalized (right) */}
      {mergedDaily.length > 1 ? (
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={mergedDaily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 9, fill: 'var(--fg2)' }}
              minTickGap={30}
            />
            {/* Left Y-axis: trends 0–100 */}
            <YAxis
              yAxisId="trends"
              orientation="left"
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'var(--fg2)' }}
              width={28}
              tickFormatter={v => v}
            />
            {/* Right Y-axis: wiki normalized 0–100 */}
            <YAxis
              yAxisId="wiki"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'var(--fg2)' }}
              width={28}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<TrendsTooltip />} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            {keywordSeries.map((k, i) => (
              <Line
                key={k.keyword}
                yAxisId="trends"
                type="monotone"
                dataKey={k.keyword}
                name={k.keyword}
                stroke={i === 0 ? groupMeta.color : `${groupMeta.color}88`}
                strokeWidth={i === 0 ? 1.5 : 1}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
            <Line
              yAxisId="wiki"
              type="monotone"
              dataKey="wikiNorm"
              name="Wikipedia"
              stroke="#888"
              strokeWidth={1}
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--fg2)', fontStyle: 'italic', height: 60, display: 'flex', alignItems: 'center' }}>
          No chart data yet
        </div>
      )}

      <div style={{ fontSize: 9, color: 'var(--fg2)', marginTop: 4, fontStyle: 'italic' }}>
        Trend data synthetic · Wikipedia real · left axis = search index (0–100) · right = wiki norm
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
