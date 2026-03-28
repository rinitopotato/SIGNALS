import { useState, useMemo } from 'react'
import { SIGNALS_MARKETS, POLYMARKET_EVENTS } from '../constants/markets.js'
import { WALLETS } from '../constants/wallets.js'
import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import ProbabilityBar from '../components/charts/ProbabilityBar.jsx'
import {
  predictLMSRAfterTrade,
  marketPredictionSummary,
  portabilityScore,
  normalisationRobustnessGate,
  overallConfidence,
} from '../utils/predictions.js'
import { lmsrPrices, backCalcQuantities, computeSIRaw, classifySignal } from '../utils/lmsr.js'
import { formatNum, formatPct } from '../utils/formatters.js'
import { bSensitivityAnalysis, monteCarloLMSR } from '../utils/montecarlo.js'
import { forecastAR, arForecastAccuracy } from '../utils/forecast.js'
import { runABM, abmChartData } from '../utils/abm.js'
import { favoriteLongshotBias, detectNegativeHypeTrap } from '../utils/signals.js'

const PM_COLORS = ['#34d399', '#f87171', '#6c8fff', '#fbbf24', '#a78bfa']

// ── Confidence ring (circle gauge) ───────────────────────────────
function ConfidenceRing({ value, label, sub, color = 'var(--accent)' }) {
  const pct = value != null ? Math.round(value * 100) : null
  const r = 28, circ = 2 * Math.PI * r
  const dash = pct != null ? (pct / 100) * circ : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="var(--bg3)" strokeWidth={6} />
        {pct != null && (
          <circle
            cx={36} cy={36} r={r} fill="none"
            stroke={color} strokeWidth={6}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        )}
        <text
          x={36} y={40}
          textAnchor="middle" fontSize={14} fontWeight={700}
          fill="var(--fg)" fontFamily="var(--mono)"
          style={{ transform: 'rotate(90deg)', transformOrigin: '36px 36px' }}
        >
          {pct != null ? `${pct}%` : '—'}
        </text>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--fg)', fontWeight: 600, textAlign: 'center' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--fg2)', textAlign: 'center' }}>{sub}</div>}
    </div>
  )
}

// ── LMSR trade simulator ──────────────────────────────────────────
function LMSRSimulator({ market, prices, bEstimate }) {
  const [outcomeIdx, setOutcomeIdx] = useState(0)
  const [deltaShares, setDeltaShares] = useState(10)

  const b = bEstimate ?? 100
  const result = useMemo(
    () => prices?.length
      ? predictLMSRAfterTrade(prices, outcomeIdx, deltaShares, b)
      : null,
    [prices, outcomeIdx, deltaShares, b]
  )

  if (!prices?.length) {
    return <div style={{ color: 'var(--fg2)', fontSize: 12 }}>No snapshot data yet.</div>
  }

  const currentPrediction = marketPredictionSummary(prices, market.hikeIndex, market.holdIndex)

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {prices.map((p, i) => (
          <div key={i} style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '8px 14px', minWidth: 100,
          }}>
            <div style={{ fontSize: 10, color: 'var(--fg2)', marginBottom: 3 }}>
              {market.outcomeLabels?.[i] ?? `Outcome ${i}`}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: market.colors[i % market.colors.length] }}>
              {formatPct(p)}
            </div>
          </div>
        ))}
      </div>

      {/* Signal summary for BOJ */}
      {market.hikeIndex != null && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6, display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--fg2)' }}>SI_raw:</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
            {formatNum(computeSIRaw(prices, market.hikeIndex, market.holdIndex), 4)}
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
            background: classifySignal(computeSIRaw(prices, market.hikeIndex, market.holdIndex)) === 'HIKE'
              ? 'rgba(52,211,153,0.15)' : classifySignal(computeSIRaw(prices, market.hikeIndex, market.holdIndex)) === 'HOLD'
              ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
            color: classifySignal(computeSIRaw(prices, market.hikeIndex, market.holdIndex)) === 'HIKE'
              ? 'var(--green)' : classifySignal(computeSIRaw(prices, market.hikeIndex, market.holdIndex)) === 'HOLD'
              ? 'var(--red)' : 'var(--amber)',
          }}>
            {classifySignal(computeSIRaw(prices, market.hikeIndex, market.holdIndex))}
          </span>
          <span style={{ fontSize: 11, color: 'var(--fg2)' }}>
            Certainty: <strong style={{ color: 'var(--fg)', fontFamily: 'var(--mono)' }}>
              {currentPrediction ? formatPct(currentPrediction.certainty) : '—'}
            </strong>
          </span>
        </div>
      )}

      {/* Trade simulator */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--fg2)', fontFamily: 'var(--mono)', marginBottom: 10 }}>
          LMSR Trade Simulator  ·  b = {formatNum(b, 1)}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg2)', display: 'block', marginBottom: 4 }}>Outcome</label>
            <select
              value={outcomeIdx}
              onChange={e => setOutcomeIdx(Number(e.target.value))}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)',
                padding: '4px 8px', borderRadius: 4, fontSize: 12,
              }}
            >
              {market.outcomeLabels.map((lbl, i) => (
                <option key={i} value={i}>{lbl}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg2)', display: 'block', marginBottom: 4 }}>
              Buy Δ shares (negative = sell)
            </label>
            <input
              type="number"
              value={deltaShares}
              onChange={e => setDeltaShares(Number(e.target.value))}
              style={{
                width: 100, background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--fg)', padding: '4px 8px', borderRadius: 4, fontSize: 12,
              }}
            />
          </div>
          {result && (
            <div style={{ fontSize: 12, color: 'var(--fg2)' }}>
              Cost: <span style={{ color: deltaShares > 0 ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                {deltaShares > 0 ? '+' : ''}{formatNum(result.cost, 4)} USDC
              </span>
            </div>
          )}
        </div>

        {result && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 6 }}>Predicted prices after trade:</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {result.newPrices.map((p, i) => {
                const delta = p - (prices[i] ?? 0)
                return (
                  <div key={i} style={{
                    background: 'var(--bg)', border: `1px solid ${delta > 0.001 ? 'var(--green)' : delta < -0.001 ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 6, padding: '6px 10px', minWidth: 90,
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--fg2)', marginBottom: 2 }}>
                      {market.outcomeLabels?.[i] ?? `O${i}`}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700 }}>
                      {formatPct(p)}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: delta > 0.001 ? 'var(--green)' : delta < -0.001 ? 'var(--red)' : 'var(--fg2)' }}>
                      {delta >= 0 ? '+' : ''}{(delta * 100).toFixed(2)}pp
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Polymarket event panel (price history chart + current odds) ─────
function PolymarketPredictionPanel({ event, pmMeta }) {
  if (!event || event.error) {
    return (
      <div className="card">
        <div className="card-title">{pmMeta.label}</div>
        <div style={{ fontSize: 12, color: 'var(--fg2)' }}>
          {!event ? 'Loading…' : 'Failed to fetch'}
        </div>
      </div>
    )
  }

  const primaryMarket = event.markets?.[0]
  const tokenHistories = primaryMarket?.tokenHistories ?? []

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
    key: `token${i}`, label: th.outcome, color: PM_COLORS[i % PM_COLORS.length],
  }))

  const outcomes = (primaryMarket?.outcomes ?? ['Yes', 'No']).map((lbl, i) => ({
    label:       lbl,
    probability: primaryMarket?.outcomePrices?.[i] ?? 0,
    color:       PM_COLORS[i % PM_COLORS.length],
  }))

  const prediction = marketPredictionSummary(
    primaryMarket?.outcomePrices ?? [],
  )

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{event.title}</div>
        {primaryMarket?.volume > 0 && (
          <span className="badge badge-grey">
            Vol ${primaryMarket.volume >= 1e6
              ? `${(primaryMarket.volume / 1e6).toFixed(1)}M`
              : primaryMarket.volume >= 1e3
                ? `${(primaryMarket.volume / 1e3).toFixed(0)}K`
                : primaryMarket.volume.toFixed(0)}
          </span>
        )}
      </div>

      <ProbabilityBar outcomes={outcomes} />

      {prediction && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg2)', display: 'flex', gap: 12 }}>
          <span>Certainty: <strong style={{ color: 'var(--fg)', fontFamily: 'var(--mono)' }}>{formatPct(prediction.certainty)}</strong></span>
          <span>Entropy: <strong style={{ fontFamily: 'var(--mono)' }}>{formatNum(prediction.entropy, 3)} bits</strong></span>
        </div>
      )}

      {chartData.length > 1 && chartLines.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <PriceLineChart
            data={chartData}
            lines={chartLines}
            title="CLOB Price History — Yes / No tokens"
            height={160}
          />
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg2)', fontStyle: 'italic' }}>
          Price history unavailable (CLOB data pending)
        </div>
      )}
    </div>
  )
}

// ── Section A: b-Sensitivity table ───────────────────────────────
function BSensitivitySection({ bojPrices, hikeIdx = 0 }) {
  const rows = useMemo(() => {
    if (!bojPrices?.length) return []
    return bSensitivityAnalysis(bojPrices, hikeIdx, 50, [5, 50, 80])
  }, [bojPrices, hikeIdx])

  if (!rows.length) return <div style={{ color: 'var(--fg2)', fontSize: 12 }}>No price data yet.</div>

  const regimeColor = r => r === 'thin' ? 'var(--red)' : r === 'moderate' ? 'var(--amber)' : 'var(--green)'

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 8 }}>
        Simulates buying 50 shares into the HIKE outcome at different liquidity parameters.
        WCL = b·ln(n) = platform worst-case loss. <em>NCM Ch.14 — Market Design</em>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['b param', 'Price before', 'Price after', 'Slippage (pp)', 'Cost (USDC)', 'WCL', 'Regime'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--fg2)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.b} style={{ borderBottom: '1px solid var(--border)', background: row.regime === 'thin' ? 'rgba(248,113,113,0.05)' : row.regime === 'thick' ? 'rgba(52,211,153,0.05)' : 'transparent' }}>
                <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)', fontWeight: 700 }}>{row.b}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)' }}>{formatPct(row.priceBefore)}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)' }}>{formatPct(row.priceAfter)}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)', color: row.slippagePP > 5 ? 'var(--red)' : 'var(--green)' }}>
                  {row.slippagePP > 0 ? '+' : ''}{formatNum(row.slippagePP, 2)}pp
                </td>
                <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)' }}>{formatNum(row.cost, 2)}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)' }}>{formatNum(row.wcl, 1)}</td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ color: regimeColor(row.regime), fontWeight: 600, fontSize: 11 }}>
                    {row.regime.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Section B: GARCH + SMA crossover ─────────────────────────────
function GARCHSMASection({ garchResult, smaCrossoverResult, bojSeries }) {
  const smaSeries = useMemo(() => {
    if (!smaCrossoverResult || !bojSeries?.length) return []
    const { ma7, ma21 } = smaCrossoverResult
    return bojSeries.map((s, i) => ({
      timestamp: s.timestamp,
      siRaw: s.siRaw,
      ma7: ma7?.[i] ?? null,
      ma21: ma21?.[i] ?? null,
    }))
  }, [smaCrossoverResult, bojSeries])

  const garchSeries = useMemo(() => {
    if (!garchResult?.volatilities?.length || !bojSeries?.length) return []
    return garchResult.volatilities.map((v, i) => ({
      timestamp: bojSeries[i + 1]?.timestamp ?? i,
      garchVol: v,
    }))
  }, [garchResult, bojSeries])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', marginBottom: 6 }}>
          GARCH(1,1) Conditional Volatility  ·  <em>h_t = ω + α·ε²_{t-1} + β·h_{t-1}</em>
        </div>
        {garchResult ? (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
            {[
              ['ω (base vol)', formatNum(garchResult.omega, 6)],
              ['α (shock)', formatNum(garchResult.alpha, 3)],
              ['β (persist)', formatNum(garchResult.beta, 3)],
              ['Long-run σ', formatNum(Math.sqrt(Math.max(0, garchResult.longRunVar)), 4)],
              ['Half-life', garchResult.halfLife ? `${formatNum(garchResult.halfLife, 1)} steps` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '6px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--fg2)' }}>{k}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic' }}>Insufficient data for GARCH (need ≥5 returns).</div>
        )}
        {garchSeries.length > 1 && (
          <PriceLineChart
            data={garchSeries}
            lines={[{ key: 'garchVol', label: 'Conditional σ²', color: 'var(--amber)' }]}
            title="GARCH Conditional Variance over time"
            height={100}
          />
        )}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', marginBottom: 6 }}>
          SMA 7/21 Crossover  ·  <em>NCM Ch.16 — Information Cascades</em>
        </div>
        {smaCrossoverResult ? (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              {smaCrossoverResult.crossovers?.length > 0 && smaCrossoverResult.crossovers.slice(-3).map((c, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                  background: c.type === 'golden' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                  color: c.type === 'golden' ? 'var(--green)' : 'var(--red)',
                }}>
                  {c.type === 'golden' ? 'Golden Cross' : 'Death Cross'} @ idx {c.idx}
                </span>
              ))}
              {smaCrossoverResult.cascadeDetected && (
                <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'rgba(251,191,36,0.2)', color: 'var(--amber)' }}>
                  Information Cascade Detected
                </span>
              )}
              {!smaCrossoverResult.crossovers?.length && <span style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic' }}>No crossovers yet.</span>}
            </div>
            {smaSeries.length > 2 && (
              <PriceLineChart
                data={smaSeries}
                lines={[
                  { key: 'siRaw', label: 'SI_raw', color: 'var(--accent)' },
                  { key: 'ma7', label: 'SMA-7', color: 'var(--green)' },
                  { key: 'ma21', label: 'SMA-21', color: 'var(--red)' },
                ]}
                title="BOJ SI_raw with SMA crossovers"
                height={120}
              />
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic' }}>Need ≥21 data points for SMA crossover.</div>
        )}
      </div>
    </div>
  )
}

// ── Section C: Monte Carlo LMSR ───────────────────────────────────
function MonteCarloSection({ bojPrices, bEstimate, siRaw }) {
  const hikeIdx = SIGNALS_MARKETS.find(m => m.id === 'boj')?.hikeIndex ?? 0
  const b = bEstimate ?? 100

  const result = useMemo(() => {
    if (!bojPrices?.length) return null
    return monteCarloLMSR({
      initialPrices: bojPrices,
      signalOutcomeIdx: hikeIdx,
      nPaths: 200,
      nTrades: 20,
      b,
      noiseSigma: 5,
      informedDelta: 10,
    })
  }, [bojPrices, b, hikeIdx])

  if (!result) return <div style={{ fontSize: 12, color: 'var(--fg2)' }}>No data yet.</div>

  const maxCount = Math.max(...result.distribution.map(d => d.count), 1)

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 10 }}>
        200 Monte Carlo paths of 20 random noise trades. One informed buy (Δ=10) injected at start.
        <em> NCM Ch.18 — Power Laws: is the signal a true trend or statistical outlier?</em>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          ['Baseline', formatPct(result.baseline)],
          ['Mean Final', result.meanFinal != null ? formatPct(result.meanFinal) : '—'],
          ['Std Dev', result.stdFinal != null ? formatNum(result.stdFinal * 100, 2) + 'pp' : '—'],
          ['% Paths Robust', result.pctRobust != null ? formatPct(result.pctRobust) : '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '6px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--fg2)' }}>{k}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
        <div style={{ background: result.pctRobust > 0.5 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${result.pctRobust > 0.5 ? 'var(--green)' : 'var(--red)'}`, borderRadius: 6, padding: '6px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--fg2)' }}>Signal Verdict</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: result.pctRobust > 0.5 ? 'var(--green)' : 'var(--red)' }}>
            {result.pctRobust > 0.5 ? 'TRUE TREND' : 'STATISTICAL NOISE'}
          </div>
        </div>
      </div>

      {/* Histogram */}
      <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 6 }}>Distribution of final HIKE price across 200 paths:</div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80, padding: '0 4px' }}>
        {result.distribution.map((bin, i) => (
          <div
            key={i}
            title={`[${formatPct(bin.lo)}–${formatPct(bin.hi)}]: ${bin.count} paths`}
            style={{
              flex: 1,
              height: `${Math.max(2, (bin.count / maxCount) * 72)}px`,
              background: bin.lo >= (result.baseline ?? 0) ? 'var(--green)' : 'var(--red)',
              opacity: 0.7,
              borderRadius: '2px 2px 0 0',
              cursor: 'default',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg2)', paddingTop: 2 }}>
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--fg2)', marginTop: 4 }}>
        Green bars = final price above baseline ({formatPct(result.baseline)}). Red = below.
      </div>
    </div>
  )
}

// ── Section D: ABM Silicon Trader ────────────────────────────────
function ABMSection({ bojPrices, siRaw, bEstimate }) {
  const bojMarket = SIGNALS_MARKETS.find(m => m.id === 'boj')
  const b = bEstimate ?? 100

  const abmResult = useMemo(() => {
    if (!bojPrices?.length) return null
    return runABM({
      initialPrices: bojPrices,
      siRaw: siRaw ?? 0,
      hikeIdx: bojMarket?.hikeIndex ?? 0,
      holdIdx: bojMarket?.holdIndex ?? 2,
      nInformed: 3,
      nNoise: 6,
      nRounds: 50,
      b,
      tradeSize: 10,
    })
  }, [bojPrices, siRaw, b])

  const chartData = useMemo(() => {
    if (!abmResult) return []
    return abmChartData(abmResult, bojMarket?.hikeIndex ?? 0)
  }, [abmResult])

  if (!abmResult) return <div style={{ fontSize: 12, color: 'var(--fg2)' }}>No data yet.</div>

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 10 }}>
        3 InformedTraders (follow SI_raw signal) vs 6 NoiseTraders (random). 50 rounds.
        Each trade updates LMSR prices. <em>NCM Ch.15 — Strategic Behavior: when should an agent reveal private information?</em>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          ['Informed PnL', formatNum(abmResult.informedPnL, 2), abmResult.informedPnL > 0 ? 'var(--green)' : 'var(--red)'],
          ['Noise PnL', formatNum(abmResult.noisePnL, 2), abmResult.noisePnL > 0 ? 'var(--green)' : 'var(--red)'],
          ['Final HIKE Price', formatPct(abmResult.finalPrices[bojMarket?.hikeIndex ?? 0]), 'var(--accent)'],
          ['Rounds', String(abmResult.nRounds), 'var(--fg)'],
        ].map(([k, v, color]) => (
          <div key={k} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '6px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--fg2)' }}>{k}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color }}>{v}</div>
          </div>
        ))}
      </div>

      {chartData.length > 1 && (
        <PriceLineChart
          data={chartData.map(d => ({ round: d.round, price: d.price, siRaw: d.siRaw }))}
          lines={[
            { key: 'price', label: 'HIKE Price (LMSR)', color: 'var(--accent)' },
            { key: 'siRaw', label: 'SI_raw', color: 'var(--amber)' },
          ]}
          title="ABM: HIKE price trajectory over 50 trading rounds"
          height={150}
          xKey="round"
        />
      )}

      {/* PnL comparison bars */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--fg2)', width: 80 }}>Informed:</div>
        <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', height: 14 }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, Math.abs(abmResult.informedPnL) / (Math.abs(abmResult.informedPnL) + Math.abs(abmResult.noisePnL) + 0.001) * 100)}%`,
            background: abmResult.informedPnL > 0 ? 'var(--green)' : 'var(--red)',
          }} />
        </div>
        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', width: 60, textAlign: 'right', color: abmResult.informedPnL > 0 ? 'var(--green)' : 'var(--red)' }}>
          {formatNum(abmResult.informedPnL, 1)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
        <div style={{ fontSize: 11, color: 'var(--fg2)', width: 80 }}>Noise:</div>
        <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', height: 14 }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, Math.abs(abmResult.noisePnL) / (Math.abs(abmResult.informedPnL) + Math.abs(abmResult.noisePnL) + 0.001) * 100)}%`,
            background: abmResult.noisePnL > 0 ? 'var(--green)' : 'var(--red)',
          }} />
        </div>
        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', width: 60, textAlign: 'right', color: abmResult.noisePnL > 0 ? 'var(--green)' : 'var(--red)' }}>
          {formatNum(abmResult.noisePnL, 1)}
        </div>
      </div>
    </div>
  )
}

// ── Section E: AR(7) Forecast ─────────────────────────────────────
function ARForecastSection({ bojSeries }) {
  const siSeries = useMemo(() => bojSeries?.map(s => s.siRaw).filter(v => v != null) ?? [], [bojSeries])

  const forecast = useMemo(() => {
    if (siSeries.length < 10) return []
    return forecastAR(siSeries, 7, 24)
  }, [siSeries])

  const accuracy = useMemo(() => {
    if (siSeries.length < 12) return null
    return arForecastAccuracy(siSeries, 7, 0.2)
  }, [siSeries])

  const chartData = useMemo(() => {
    const hist = (bojSeries ?? []).map((s, i) => ({ idx: i, siRaw: s.siRaw, forecast: null, lower: null, upper: null }))
    const n = hist.length
    const fc = forecast.map((f, i) => ({
      idx: n + i,
      siRaw: null,
      forecast: f.forecast,
      lower: f.lower,
      upper: f.upper,
    }))
    return [...hist, ...fc]
  }, [bojSeries, forecast])

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 10 }}>
        AR(7) model: P(t) = c + Σ φ_k·P(t-k) fit via OLS. Browser-native LSTM equivalent.
        Forecasts next 24 steps. <em>NCM Ch.16 — Information Cascades: detect cascade onset before price reflects it.</em>
      </div>

      {siSeries.length < 10 ? (
        <div style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic' }}>
          Need ≥10 data points (currently {siSeries.length}).
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              ['Training pts', String(siSeries.length)],
              ['Forecast steps', String(forecast.length)],
              ['Directional Acc', accuracy != null ? formatPct(accuracy) : '—'],
              ['24h HIKE forecast', forecast[23] ? formatNum(forecast[23].forecast, 4) : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '6px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--fg2)' }}>{k}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          {chartData.length > 2 && (
            <PriceLineChart
              data={chartData}
              lines={[
                { key: 'siRaw', label: 'SI_raw (historical)', color: 'var(--accent)' },
                { key: 'forecast', label: 'AR(7) forecast', color: 'var(--amber)' },
                { key: 'upper', label: '+95% CI', color: 'rgba(251,191,36,0.3)' },
                { key: 'lower', label: '−95% CI', color: 'rgba(251,191,36,0.3)' },
              ]}
              title="AR(7) SI_raw forecast [LSTM-equivalent for browser]"
              height={140}
              xKey="idx"
            />
          )}

          {forecast.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg2)' }}>
              Final forecast at step 24: <strong style={{ fontFamily: 'var(--mono)', color: 'var(--fg)' }}>{formatNum(forecast[forecast.length - 1]?.forecast, 4)}</strong>
              {' '}[{formatNum(forecast[forecast.length - 1]?.lower, 4)}, {formatNum(forecast[forecast.length - 1]?.upper, 4)}]
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Section F: Favorite-Longshot Bias + OBI ───────────────────────
function FLBSection({ pmEvents }) {
  if (!pmEvents?.length) return <div style={{ fontSize: 12, color: 'var(--fg2)' }}>Loading Polymarket data…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {pmEvents.filter(ev => ev && !ev.error).slice(0, 4).map((ev, ei) => {
        const m = ev.markets?.[0]
        if (!m?.outcomePrices?.length) return null

        const bias = favoriteLongshotBias(m.outcomePrices)
        const ob = m.orderBook
        const obi = ob?.imbalance

        return (
          <div key={ev.slug ?? ei} style={{ background: 'var(--bg3)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>{ev.title}</div>

            {/* Favorite-Longshot Bias */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 6 }}>
                Favorite-Longshot Bias  ·  <em>Thaler &amp; Ziemba (1988); NCM Ch.22</em>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {bias.map((b, i) => (
                  <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', minWidth: 90 }}>
                    <div style={{ fontSize: 10, color: 'var(--fg2)', marginBottom: 2 }}>
                      {m.outcomes?.[i] ?? `O${i}`}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>{formatPct(b.marketProb)}</div>
                    <div style={{
                      fontSize: 10, fontFamily: 'var(--mono)',
                      color: Math.abs(b.bias) < 0.05 ? 'var(--fg2)' : b.bias > 0 ? 'var(--amber)' : 'var(--accent)',
                    }}>
                      bias: {b.bias > 0 ? '+' : ''}{formatNum(b.bias * 100, 1)}pp
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg2)', marginTop: 4 }}>
                Positive bias = market overprices underdog (longshot bias). Negative = overprices favourite.
              </div>
            </div>

            {/* Order Book Imbalance */}
            {ob ? (
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 6 }}>
                  Order Book (CLOB)  ·  OBI = (V_bid − V_ask) / (V_bid + V_ask)
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    ['Best Bid', formatPct(ob.bestBid), 'var(--green)'],
                    ['Best Ask', formatPct(ob.bestAsk), 'var(--red)'],
                    ['Mid', formatPct(ob.mid), 'var(--fg)'],
                    ['Micro-price', formatPct(ob.micro), 'var(--accent)'],
                    ['OBI', formatNum(obi, 3), obi > 0.1 ? 'var(--green)' : obi < -0.1 ? 'var(--red)' : 'var(--fg2)'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, padding: '5px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--fg2)' }}>{k}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* OBI gauge */}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--fg2)', width: 30 }}>SELL</div>
                  <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 10, height: 10, position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: '50%', width: `${Math.abs((obi ?? 0)) * 50}%`,
                      marginLeft: obi > 0 ? 0 : `-${Math.abs((obi ?? 0)) * 50}%`,
                      background: obi > 0 ? 'var(--green)' : 'var(--red)',
                      transition: 'width 0.3s',
                    }} />
                    <div style={{ position: 'absolute', top: 0, left: '50%', bottom: 0, width: 1, background: 'var(--border)' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--fg2)', width: 28 }}>BUY</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--fg2)', fontStyle: 'italic' }}>Order book data unavailable.</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Section G: Negative Hype Trap ────────────────────────────────
function NegativeHypeTrapSection({ bojSeries, trades }) {
  const result = useMemo(() => {
    if (!bojSeries?.length || !trades?.length) return null
    // Volume series: count of trades per snapshot window
    const volumes = bojSeries.map((s, i) => {
      const prevTs = bojSeries[i - 1]?.timestamp ?? s.timestamp - 3600
      return trades.filter(t => t.timestamp >= prevTs && t.timestamp < s.timestamp).length
    })
    const siSeries = bojSeries.map(s => s.siRaw)
    return detectNegativeHypeTrap(volumes, siSeries, 3)
  }, [bojSeries, trades])

  if (!result) return <div style={{ fontSize: 12, color: 'var(--fg2)' }}>Insufficient data.</div>

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 10 }}>
        Detects volume spikes (&gt;3σ above median) coinciding with falling SI_raw — potential hype-driven manipulation.
      </div>
      {result.trapped ? (
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: 'rgba(248,113,113,0.15)',
          border: '1px solid var(--red)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 13 }}>Negative Hype Trap Detected</div>
            <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 2 }}>
              {result.traps.length} trap event(s). Latest at index {result.latestTrap?.idx} with
              {' '}<strong style={{ fontFamily: 'var(--mono)' }}>{formatNum(result.latestTrap?.volumeRatio, 1)}×</strong> volume spike.
              High trading volume while SI_raw was falling — signals may be unreliable.
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '10px 16px', borderRadius: 8,
          background: 'rgba(52,211,153,0.1)', border: '1px solid var(--green)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>✓</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 13 }}>No Hype Trap Detected</div>
            <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 2 }}>
              Volume and signal direction are consistent. Signal integrity appears intact.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Predictions Tab ──────────────────────────────────────────
export default function PredictionsTab({
  metrics = {},
  trades = [],
  snapshots = [],
  pmEvents = [],
}) {
  const {
    bojPrices, humanCapital, compositeIndex, bojSeries, bEstimate,
    garchResult, smaCrossoverResult, ccfResult, dlt, actionableThreshold,
    bridgingAgents,
  } = metrics

  // Build per-market latest prices from snapshots
  const latestPrices = useMemo(() => {
    const byMarket = {}
    for (const snap of snapshots) {
      const m = snap.market
      if (!byMarket[m]) byMarket[m] = {}
      const cur = byMarket[m][snap.outcomeIndex]
      if (!cur || snap.timestamp > cur.timestamp) byMarket[m][snap.outcomeIndex] = snap
    }
    const out = {}
    for (const [m, ot] of Object.entries(byMarket)) {
      const maxIdx = Math.max(...Object.keys(ot).map(Number))
      const arr = Array.from({ length: maxIdx + 1 }, (_, i) => ot[i]?.price ?? 0)
      out[m] = lmsrPrices(arr)
    }
    return out
  }, [snapshots])

  // Multi-lens confidence inputs
  const avgIC = useMemo(() => {
    const ics = (humanCapital ?? []).map(hc => hc.ic).filter(v => v != null)
    return ics.length ? ics.reduce((a, b) => a + b, 0) / ics.length : null
  }, [humanCapital])

  const lastCompositeIt = compositeIndex?.slice(-1)[0] ?? null

  const portability = useMemo(() => {
    if (!pmEvents?.length || !bojSeries?.length) return null
    const pmBoj = pmEvents.find(ev => ev?.title?.toLowerCase().includes('boj') || ev?.title?.toLowerCase().includes('japan'))
    if (!pmBoj?.markets?.[0]?.tokenHistories?.[0]?.history?.length) return null
    const pmPrices   = pmBoj.markets[0].tokenHistories[0].history.map(h => h.price)
    const sigPrices  = bojSeries.map(s => s.pHike)
    return portabilityScore(pmPrices, sigPrices)
  }, [pmEvents, bojSeries])

  const robustness = useMemo(() => {
    const raw = bojSeries?.map(s => s.siRaw).filter(v => v != null) ?? []
    return raw.length >= 3 ? normalisationRobustnessGate(raw) : null
  }, [bojSeries])

  const avgCentrality = useMemo(() => {
    const cs = (metrics.centralities ?? []).map(c => typeof c === 'object' ? c.centrality : c).filter(v => v != null)
    return cs.length ? Math.max(...cs) / (WALLETS.length - 1) : null
  }, [metrics.centralities])

  const confidence = useMemo(() => overallConfidence({
    ic:          avgIC,
    centrality:  avgCentrality,
    compositeIt: lastCompositeIt,
    portability,
    robustness,
  }), [avgIC, avgCentrality, lastCompositeIt, portability, robustness])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Overall signal confidence (5-lens summary) ─────── */}
      <div className="card">
        <div className="card-title">Multi-Lens Signal Confidence — Combined Prediction Score</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
          <ConfidenceRing
            value={confidence}
            label="Overall"
            sub="All 5 lenses"
            color={confidence != null
              ? confidence > 0.6 ? 'var(--green)' : confidence > 0.4 ? 'var(--amber)' : 'var(--red)'
              : 'var(--fg2)'}
          />
          <ConfidenceRing
            value={avgIC != null ? (avgIC + 1) / 2 : null}
            label="L1 HC"
            sub="Avg IC"
            color="var(--accent)"
          />
          <ConfidenceRing
            value={avgCentrality}
            label="L2 SC"
            sub="Hub score"
            color="var(--accent2)"
          />
          <ConfidenceRing
            value={lastCompositeIt != null ? Math.max(0, Math.min(1, (lastCompositeIt + 3) / 6)) : null}
            label="L3 SE"
            sub="Composite I_t"
            color="var(--purple)"
          />
          <ConfidenceRing
            value={portability != null ? (portability + 1) / 2 : null}
            label="L4 EV"
            sub="PM alignment"
            color="var(--amber)"
          />
          <ConfidenceRing
            value={robustness}
            label="L5 Rob"
            sub="Normalisation gate"
            color="var(--green)"
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg2)', lineHeight: 1.7 }}>
          <strong>L1 HC</strong> — Human Capital: avg IC across 9 traders ·
          <strong> L2 SC</strong> — Social Capital: hub centrality score ·
          <strong> L3 SE</strong> — Signal Engineering: composite index I_t ·
          <strong> L4 EV</strong> — External Validity: Pearson(PM, SIGNALS) ·
          <strong> L5 Rob</strong> — Robustness: Z-score / Min-Max agreement (Pearson)
        </div>
      </div>

      {/* ── SIGNALS markets — LMSR simulator ─────────────────── */}
      <div className="card">
        <div className="card-title">LMSR Price Prediction — SIGNALS Internal Markets</div>
        <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 16 }}>
          Formula: P_i = exp(q_i / b) / Σ exp(q_j / b) · Trade cost = C(q_after) − C(q_before)
        </div>
        {SIGNALS_MARKETS.map(mkt => {
          const prices = latestPrices[mkt.address.toLowerCase()] ?? null
          return (
            <div key={mkt.id} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{mkt.nameEn}</span>
                <span style={{ fontSize: 11, color: 'var(--fg2)', fontFamily: 'var(--mono)' }}>{mkt.name}</span>
              </div>
              <LMSRSimulator market={mkt} prices={prices} bEstimate={mkt.id === 'boj' ? bEstimate : null} />
            </div>
          )
        })}
      </div>

      {/* ── Polymarket — CLOB prediction ──────────────────────── */}
      <div className="card">
        <div className="card-title">CLOB Price Prediction — Polymarket External Markets</div>
        <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 16 }}>
          Mid-price = (bid + ask) / 2 · Current consensus from Gamma outcomePrices · CLOB price history (1d interval)
        </div>
        <div className="panel-grid panel-grid-3">
          {POLYMARKET_EVENTS.map((pmMeta, i) => (
            <PolymarketPredictionPanel key={pmMeta.slug} event={pmEvents[i]} pmMeta={pmMeta} />
          ))}
        </div>
      </div>

      {/* ── Section A: b-Sensitivity & Platform Loss ──────────── */}
      <div className="card">
        <div className="card-title">
          b-Sensitivity & Platform Loss  ·  <span style={{ fontWeight: 400, color: 'var(--fg2)' }}>50-token slippage at b=5/50/80</span>
        </div>
        <BSensitivitySection bojPrices={bojPrices} hikeIdx={SIGNALS_MARKETS.find(m => m.id === 'boj')?.hikeIndex ?? 0} />
      </div>

      {/* ── Section B: GARCH + SMA Crossover ─────────────────── */}
      <div className="card">
        <div className="card-title">GARCH(1,1) Volatility + SMA 7/21 Crossover</div>
        <GARCHSMASection garchResult={garchResult} smaCrossoverResult={smaCrossoverResult} bojSeries={bojSeries ?? []} />
      </div>

      {/* ── Section C: Monte Carlo LMSR ───────────────────────── */}
      <div className="card">
        <div className="card-title">
          Monte Carlo LMSR Simulation  ·  <span style={{ fontWeight: 400, color: 'var(--fg2)' }}>200 paths, 20 noise trades each</span>
        </div>
        <MonteCarloSection bojPrices={bojPrices} bEstimate={bEstimate} siRaw={metrics.siRaw} />
      </div>

      {/* ── Section D: ABM Silicon Trader ─────────────────────── */}
      <div className="card">
        <div className="card-title">
          ABM — Silicon Trader Simulation  ·  <span style={{ fontWeight: 400, color: 'var(--fg2)' }}>3 informed + 6 noise, 50 rounds</span>
        </div>
        <ABMSection bojPrices={bojPrices} siRaw={metrics.siRaw} bEstimate={bEstimate} />
      </div>

      {/* ── Section E: AR(7) Forecast ─────────────────────────── */}
      <div className="card">
        <div className="card-title">
          AR(7) Price Forecast  ·  <span style={{ fontWeight: 400, color: 'var(--fg2)' }}>24-step SI_raw forecast with 95% CI</span>
        </div>
        <ARForecastSection bojSeries={bojSeries ?? []} />
      </div>

      {/* ── Section F: Favorite-Longshot Bias + OBI ───────────── */}
      <div className="card">
        <div className="card-title">Favorite-Longshot Bias + Order Book Imbalance (OBI)</div>
        <FLBSection pmEvents={pmEvents} />
      </div>

      {/* ── Section G: Negative Hype Trap ─────────────────────── */}
      <div className="card">
        <div className="card-title">Negative Hype Trap Detection</div>
        <NegativeHypeTrapSection bojSeries={bojSeries ?? []} trades={trades} />
      </div>

      {/* ── CCF at lags 1,3,7 ─────────────────────────────────── */}
      {ccfResult?.length > 0 && (
        <div className="card">
          <div className="card-title">Cross-Correlation Function (CCF) — SI_raw vs P_HIKE</div>
          <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 10 }}>
            Pearson correlation between SI_raw[t] and P_HIKE[t+lag]. Positive = signal leads price.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {ccfResult.map(({ lag, r }) => (
              <div key={lag} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 14px', minWidth: 80 }}>
                <div style={{ fontSize: 10, color: 'var(--fg2)' }}>Lag {lag}</div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700,
                  color: r > 0.3 ? 'var(--green)' : r < -0.3 ? 'var(--red)' : 'var(--fg2)',
                }}>
                  {formatNum(r, 3)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Decision Lead Time ─────────────────────────────────── */}
      {dlt != null && (
        <div className="card">
          <div className="card-title">Decision Lead Time (DLT)</div>
          <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 8 }}>
            Time since first SI_raw &gt; 0.02 threshold crossing (actionable HIKE signal).
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
              {dlt}h
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg2)' }}>
              = {Math.floor(dlt / 24)} days {dlt % 24} hrs since first actionable HIKE signal
            </div>
          </div>
        </div>
      )}

      {/* ── Formula reference ─────────────────────────────────── */}
      <div className="card" style={{ fontSize: 11, color: 'var(--fg2)', lineHeight: 1.8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--fg)' }}>Formula Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 24px' }}>
          {[
            ['LMSR price', 'P_i = exp(q_i/b) / Σ exp(q_j/b)'],
            ['LMSR cost', 'C(q) = b · ln(Σ exp(q_j/b))'],
            ['CLOB mid-price', 'P_mid = (bid + ask) / 2'],
            ['Micro-price', 'P_micro = (V_b·ask + V_a·bid) / (V_b+V_a)'],
            ['OBI', 'OBI = (V_bid − V_ask) / (V_bid + V_ask)'],
            ['Composite index', 'I_t = 0.7·Z(P) + 0.3·Z(A)'],
            ['Portability score', 'r = Pearson(P_PM, P_SIG)'],
            ['Robustness gate', 'r_norm = Pearson(Z-score, Min-Max)'],
            ['Brier Score', 'BS = (1/N) Σ (f_t − o_t)²'],
            ['Info Coefficient', 'IC = Pearson(signal_t, ΔP_{t+k*})'],
            ['GARCH(1,1)', 'h_t = ω + α·ε²_{t-1} + β·h_{t-1}'],
            ['AR(p) forecast', 'P(t) = c + Σ φ_k·P(t-k) + ε'],
            ['Platform WCL', 'WCL = b · ln(n)'],
            ['CCF(lag)', 'r_lag = Pearson(SI[t], P[t+lag])'],
          ].map(([name, formula]) => (
            <div key={name}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{name}:</span>{' '}
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg)' }}>{formula}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
