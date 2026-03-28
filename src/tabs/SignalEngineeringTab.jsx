import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, YAxis, XAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import BarChartPanel from '../components/charts/BarChartPanel.jsx'
import MetricBadge from '../components/cards/MetricBadge.jsx'
import MarketSelector, { SIGNALS_ONLY } from '../components/layout/MarketSelector.jsx'
import { SIGNALS_MARKETS } from '../constants/markets.js'
import { buildCompositeSignal } from '../utils/signals.js'

const VARIANT_COLORS = {
  raw:      '#9999aa',
  ma3:      '#6c8fff',
  ma5:      '#a78bfa',
  zScores:  '#34d399',
  momentum: '#fbbf24',
  ratio:    '#f87171',
}

const VARIANT_LABELS = {
  raw:      'Raw SI',
  ma3:      'MA-3',
  ma5:      'MA-5',
  zScores:  'Z-Score (w=5)',
  momentum: 'Momentum',
  ratio:    'Hike/Hold Ratio',
}

// Build per-outcome price time series for any market from raw snapshots
function buildPriceSeries(snapshots, marketAddress) {
  const addr = marketAddress.toLowerCase()
  const mktSnaps = snapshots.filter(s => s.market === addr)
  if (!mktSnaps.length) return []

  // Group by timestamp
  const byTs = {}
  for (const s of mktSnaps) {
    if (!byTs[s.timestamp]) byTs[s.timestamp] = {}
    byTs[s.timestamp][s.outcomeIndex] = s.price
  }

  const maxOutcome = Math.max(...mktSnaps.map(s => s.outcomeIndex))

  return Object.entries(byTs)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([ts, ot]) => {
      const row = { timestamp: Number(ts) }
      for (let i = 0; i <= maxOutcome; i++) {
        row[`o${i}`] = ot[i] ?? null
      }
      return row
    })
}

// ── Composite Signal tooltip ──────────────────────────────────────
function CompositeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const mm = label?.slice(4, 6), dd = label?.slice(6, 8)
  const dateStr = mm && dd ? `${mm}/${dd}` : (label ?? '')
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px' }}>
      <div style={{ fontSize: 10, color: 'var(--fg2)', marginBottom: 3 }}>{dateStr}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 11, fontFamily: 'var(--mono)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : '—'}
        </div>
      ))}
    </div>
  )
}

// ── TrendsSignalPanel — Composite Signal Index for Sendai / Showa ─
function TrendsSignalPanel({ market, snapshots, perMarketData }) {
  const marketData = perMarketData?.[market.id]

  // Build daily price series: group snapshots by date, take last price per outcome 0
  const dailyPriceSeries = useMemo(() => {
    const mktSnaps = (snapshots ?? []).filter(
      s => s.market === market.address.toLowerCase() && s.outcomeIndex === 0
    )
    const byDate = {}
    for (const s of mktSnaps) {
      const d = new Date(s.timestamp * 1000)
      const date = d.toISOString().slice(0, 10).replace(/-/g, '')
      byDate[date] = s.price
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, price]) => ({ date, price }))
  }, [snapshots, market.address])

  // Primary keyword trendsSeries
  const trendsSeries = marketData?.keywordSeries?.[0]?.trendsSeries ?? []

  const compositeResult = useMemo(
    () => buildCompositeSignal(dailyPriceSeries, trendsSeries, 0.7, 0.3, 3, market.id),
    [dailyPriceSeries, trendsSeries, market.id]
  )

  const { aligned, leadCorr, interpretation, hasWeekendSpike, negativeHype } = compositeResult

  const primaryKw = marketData?.keywordSeries?.[0]?.keyword ?? market.id
  const marketColor = market.colors?.[0] ?? '#6c8fff'

  const interpColor = interpretation === 'BUY' ? 'var(--green)' :
                      interpretation === 'SELL' ? 'var(--red)' :
                      interpretation === 'CAUTION' ? '#fbbf24' : 'var(--fg2)'

  // Add displayDate to aligned for x-axis
  const chartData = aligned.map(p => ({
    ...p,
    displayDate: `${p.date.slice(4, 6)}/${p.date.slice(6, 8)}`,
    trendsDisplay: p.trendsRaw,  // raw 0–100 for right axis
  }))

  // Snapshot price history chart (outcome tokens)
  const snapshotSeries = useMemo(
    () => buildPriceSeries(snapshots ?? [], market.address),
    [snapshots, market.address]
  )
  const lines = market.outcomeLabels.map((lbl, i) => ({
    key: `o${i}`, label: lbl, color: market.colors[i % market.colors.length],
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Price History */}
      <div className="card">
        <div className="card-title">{market.nameEn} — Outcome Token Price History</div>
        {snapshotSeries.length > 0 ? (
          <PriceLineChart data={snapshotSeries} lines={lines} height={200} />
        ) : (
          <div style={{ color: 'var(--fg2)', fontSize: 12, padding: '16px 0' }}>No snapshot data yet.</div>
        )}
      </div>

      {/* Composite Signal Index panel */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            {market.nameEn} — Composite Signal Index
          </span>
          <span style={{ fontSize: 10, color: 'var(--fg2)', fontFamily: 'var(--mono)' }}>
            S_t = 0.7 × Price + 0.3 × Z(Trends) · 3-day MA
          </span>
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{
            padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: `${interpColor}20`, color: interpColor,
            border: `1px solid ${interpColor}40`,
          }}>
            {interpretation}
          </span>
          {leadCorr != null && (
            <span style={{
              padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: 'var(--bg3)', color: 'var(--fg2)',
              border: '1px solid var(--border)', fontFamily: 'var(--mono)',
            }}>
              CCF lag-3: {leadCorr >= 0 ? '+' : ''}{leadCorr.toFixed(3)}
            </span>
          )}
          {hasWeekendSpike && (
            <span style={{
              padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: 'rgba(52,211,153,0.15)', color: 'var(--green)',
              border: '1px solid rgba(52,211,153,0.3)',
            }}>
              Thu/Fri spike detected — 48h lag BUY
            </span>
          )}
          {negativeHype?.length > 0 && (
            <span style={{
              padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.3)',
            }}>
              Negative Hype trap — {negativeHype.length} spike(s) w/ flat price
            </span>
          )}
        </div>

        {/* Dual-axis chart */}
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 9, fill: 'var(--fg2)' }}
                minTickGap={30}
              />
              {/* Left Y-axis: price [0,1] + signalIndex [0,1] */}
              <YAxis
                yAxisId="price"
                orientation="left"
                domain={[0, 1]}
                tick={{ fontSize: 9, fill: 'var(--fg2)' }}
                width={32}
                tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              />
              {/* Right Y-axis: raw trends 0–100 */}
              <YAxis
                yAxisId="trends"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: 'var(--fg2)' }}
                width={28}
              />
              <Tooltip content={<CompositeTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line yAxisId="price"  type="monotone" dataKey="price"        name="Price"      stroke={marketColor}  strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              <Line yAxisId="price"  type="monotone" dataKey="signalIndex"  name="S_t"        stroke="#a78bfa"      strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
              <Line yAxisId="price"  type="monotone" dataKey="ma3d"         name="MA-3d"      stroke="#34d399"      strokeWidth={1} strokeDasharray="4 2" dot={false} isAnimationActive={false} connectNulls />
              <Line yAxisId="trends" type="monotone" dataKey="trendsDisplay" name="Trends"    stroke="#fbbf24"      strokeWidth={1} dot={false} isAnimationActive={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ color: 'var(--fg2)', fontSize: 12, padding: '16px 0', fontStyle: 'italic' }}>
            Insufficient data to compute composite signal — snapshots and trend data must overlap on at least 2 dates.
          </div>
        )}

        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg2)' }}>
          {interpretation === 'BUY' && (
            <span style={{ color: 'var(--green)' }}>
              Trends rising but price flat → BUY (48-hour lag play). leadCorr {leadCorr?.toFixed(3)} &gt; 0.2 at lag=3.
            </span>
          )}
          {interpretation === 'SELL' && (
            <span style={{ color: 'var(--red)' }}>
              Trends falling and price elevated → SELL signal. leadCorr {leadCorr?.toFixed(3)}.
            </span>
          )}
          {interpretation === 'CAUTION' && (
            <span style={{ color: '#fbbf24' }}>
              Negative Hype: trends spike &gt;2σ but price not responding. Caution on long positions.
            </span>
          )}
          {interpretation === 'NEUTRAL' && (
            <span>No strong directional signal. Monitor trends for divergence from price.</span>
          )}
        </div>
      </div>
    </div>
  )
}

function NonBojMarketPanel({ market, snapshots, perMarketData }) {
  const isTrendsMarket = market.id === 'sendai' || market.id === 'showa'

  if (isTrendsMarket) {
    return <TrendsSignalPanel market={market} snapshots={snapshots} perMarketData={perMarketData} />
  }

  const seriesData = useMemo(
    () => buildPriceSeries(snapshots ?? [], market.address),
    [snapshots, market.address]
  )

  const lines = market.outcomeLabels.map((lbl, i) => ({
    key:   `o${i}`,
    label: lbl,
    color: market.colors[i % market.colors.length],
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-title">{market.nameEn} — Outcome Token Price History</div>
        {seriesData.length > 0 ? (
          <PriceLineChart
            data={seriesData}
            lines={lines}
            height={260}
            title={`${market.name} · ${market.outcomeLabels.join(' / ')}`}
          />
        ) : (
          <div style={{ color: 'var(--fg2)', fontSize: 12, padding: '20px 0' }}>
            No snapshot data yet for this market.
          </div>
        )}
      </div>

      {/* Latest prices */}
      {seriesData.length > 0 && (() => {
        const last = seriesData[seriesData.length - 1]
        return (
          <div className="card">
            <div className="card-title">Latest Outcome Probabilities</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {market.outcomeLabels.map((lbl, i) => {
                const val = last?.[`o${i}`]
                return (
                  <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 14px', minWidth: 110 }}>
                    <div style={{ fontSize: 10, color: 'var(--fg2)', marginBottom: 4 }}>{lbl}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: market.colors[i % market.colors.length] }}>
                      {val != null ? `${(val * 100).toFixed(1)}%` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default function SignalEngineeringTab({ bojSeries = [], metrics = {}, snapshots = [], perMarketData = {} }) {
  const [marketId, setMarketId] = useState('boj')

  const {
    signalZoo, variantICs, ensembleSignal, decomposition,
    icByLag, kStar, les, divergenceSignal, compositeIndex,
    cg, wfa, mcp, rstResult, actionableThreshold,
  } = metrics

  const selectedMarket = SIGNALS_MARKETS.find(m => m.id === marketId)

  // ── BOJ-specific signal zoo chart data ────────────────────────────
  const zooCols = ['raw', 'ma3', 'ma5', 'zScores', 'momentum', 'ratio']
  const zooChartData = bojSeries.map((s, i) => {
    const row = { timestamp: s.timestamp }
    zooCols.forEach(k => {
      row[k] = (signalZoo?.[k] ?? [])[i] ?? null
    })
    return row
  })

  const zooLines = zooCols.map(k => ({
    key: k, label: VARIANT_LABELS[k], color: VARIANT_COLORS[k],
  }))

  const icData = Object.entries(variantICs ?? {}).map(([k, v]) => ({
    label: VARIANT_LABELS[k] ?? k,
    value: v,
  }))

  const icLagData = (icByLag ?? []).map(({ lag, ic }) => ({
    label: `k=${lag}`,
    value: ic,
  }))

  const ensembleData = bojSeries.map((s, i) => ({
    timestamp: s.timestamp,
    ensemble:  (ensembleSignal ?? [])[i] ?? null,
    siRaw:     s.siRaw,
  }))

  const decompData = bojSeries.map((s, i) => ({
    timestamp: s.timestamp,
    trend:     (decomposition?.trend     ?? [])[i] ?? null,
    cyclical:  (decomposition?.cyclical  ?? [])[i] ?? null,
    residual:  (decomposition?.residual  ?? [])[i] ?? null,
  }))

  const compositeData = bojSeries.map((s, i) => ({
    timestamp: s.timestamp,
    It:        (compositeIndex ?? [])[i] ?? null,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Market selector */}
      <div className="card" style={{ paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--fg2)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
            Market:
          </span>
          <MarketSelector
            selected={marketId}
            onChange={setMarketId}
            markets={SIGNALS_ONLY.filter(m => m.id !== 'all')}
          />
        </div>
        {marketId !== 'boj' && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg2)' }}>
            Full Signal Index analysis (BOJ SI_raw, ensemble, decomposition) is available for the BOJ market only.
            Showing price history for {selectedMarket?.nameEn}.
          </div>
        )}
      </div>

      {/* Non-BOJ markets: just show price chart */}
      {marketId !== 'boj' && selectedMarket && (
        <NonBojMarketPanel market={selectedMarket} snapshots={snapshots} perMarketData={perMarketData} />
      )}

      {/* BOJ full analysis */}
      {marketId === 'boj' && (
        <>
          {/* SE-1: Signal Zoo — 6 MA variants overlay */}
          <div className="card">
            <div className="card-title">SE-1 — Signal Zoo: 6 Moving-Average Variants (BOJ SI_raw)</div>
            <PriceLineChart
              data={zooChartData}
              lines={zooLines}
              height={220}
            />
            <div style={{ marginTop: 12 }}>
              <BarChartPanel
                data={icData}
                xKey="label"
                yKey="value"
                title="IC per variant (Pearson corr. with ΔP)"
                height={130}
                colorBySign
                referenceY={0}
              />
            </div>
          </div>

          {/* SE-3: Rolling IC and Optimal Lag */}
          <div className="panel-grid panel-grid-2">
            <BarChartPanel
              data={icLagData}
              xKey="label"
              yKey="value"
              title={`SE-3 — IC by Lag · k* = ${kStar ?? '?'} · LES = ${les?.toFixed(3) ?? '—'}`}
              height={180}
              colorBySign
              referenceY={0}
            />

            {/* SE-5: Ensemble signal */}
            <PriceLineChart
              data={ensembleData}
              lines={[
                { key: 'ensemble', label: 'Ensemble (IC-weighted)', color: '#6c8fff' },
                { key: 'siRaw',    label: 'SI raw',                 color: '#9999aa' },
              ]}
              title="SE-5 — IC-Weighted Ensemble vs Raw SI"
              height={180}
            />
          </div>

          {/* SE-6: Signal Decomposition */}
          <div className="panel-grid panel-grid-2">
            <PriceLineChart
              data={decompData}
              lines={[
                { key: 'trend',    label: 'Trend (MA-7)',    color: '#6c8fff' },
                { key: 'cyclical', label: 'Cyclical (MA-3)', color: '#34d399' },
                { key: 'residual', label: 'Residual (noise)',color: '#f87171' },
              ]}
              title={`SE-6 — Signal Decomposition · SNR = ${decomposition?.snr?.toFixed(3) ?? '—'}`}
              height={200}
            />

            {/* Composite Index I_t */}
            <PriceLineChart
              data={compositeData}
              lines={[{ key: 'It', label: 'Composite Index I_t', color: '#a78bfa' }]}
              title="Composite Signal Index I_t = w₁·Z(P) + w₂·Z(A)"
              height={200}
            />
          </div>

          {/* SE-2: Actionable Threshold */}
          <div className="card">
            <div className="card-title">SE-2 — Actionable Threshold (AT)</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>
                Upper threshold: <strong style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                  +{actionableThreshold?.upper?.toFixed(3) ?? '0.020'}
                </strong>
              </span>
              <span style={{ fontSize: 13 }}>
                Lower threshold: <strong style={{ color: 'var(--red)', fontFamily: 'var(--mono)' }}>
                  {actionableThreshold?.lower?.toFixed(3) ?? '-0.020'}
                </strong>
              </span>
              <span style={{ fontSize: 13 }}>
                Calibration accuracy: <strong style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                  {actionableThreshold?.accuracy != null ? `${(actionableThreshold.accuracy * 100).toFixed(1)}%` : '—'}
                </strong>
              </span>
            </div>
          </div>

          {/* All Lens 3 + Robustness metrics */}
          <div className="panel-grid panel-grid-2">
            <div className="card">
              <div className="card-title">Lens 3 — Signal Engineering Metrics</div>
              <div className="metric-grid">
                <MetricBadge id="IT"  value={compositeIndex?.slice(-1)[0] ?? null} fmt="signed" />
                <MetricBadge id="KS"  value={kStar ?? null} fmt="int" />
                <MetricBadge id="SNR" value={decomposition?.snr ?? null} />
                <MetricBadge id="MD"  value={(ensembleSignal?.length > 1 ? (ensembleSignal.slice(-1)[0] ?? 0) - (ensembleSignal.slice(-2)[0] ?? 0) : null)} fmt="signed" />
                <MetricBadge id="DS"  value={divergenceSignal ?? null} />
                <MetricBadge id="EA"  value={icData.length > 0 ? icData.filter(d => d.value > 0).length / icData.length : null} fmt="pct" />
                <MetricBadge id="LES" value={les ?? null} fmt="signed" />
              </div>
            </div>
            <div className="card">
              <div className="card-title">Lens 5 — Robustness Metrics</div>
              <div className="metric-grid">
                <MetricBadge id="WFA" value={wfa ?? null} fmt="pct" />
                <MetricBadge id="CG"  value={cg ?? null} fmt="bool" />
                <MetricBadge id="MCP" value={mcp ?? null} fmt="pct" />
                <MetricBadge id="RST" value={rstResult?.significant != null ? (rstResult.significant ? 1 : 0) : null} fmt="bool" />
                {rstResult && (
                  <MetricBadge id="WS" value={rstResult.d ?? null} />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
