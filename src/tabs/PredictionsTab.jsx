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

// ── Main Predictions Tab ──────────────────────────────────────────
export default function PredictionsTab({
  metrics = {},
  trades = [],
  snapshots = [],
  pmEvents = [],
}) {
  const { bojPrices, humanCapital, compositeIndex, bojSeries, bEstimate } = metrics

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

      {/* ── Formula reference ─────────────────────────────────── */}
      <div className="card" style={{ fontSize: 11, color: 'var(--fg2)', lineHeight: 1.8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--fg)' }}>Formula Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 24px' }}>
          {[
            ['LMSR price', 'P_i = exp(q_i/b) / Σ exp(q_j/b)'],
            ['LMSR cost', 'C(q) = b · ln(Σ exp(q_j/b))'],
            ['CLOB mid-price', 'P_mid = (bid + ask) / 2'],
            ['Composite index', 'I_t = 0.7·Z(P) + 0.3·Z(A)'],
            ['Portability score', 'r = Pearson(P_PM, P_SIG)'],
            ['Robustness gate', 'r_norm = Pearson(Z-score, Min-Max)'],
            ['Brier Score', 'BS = (1/N) Σ (f_t − o_t)²'],
            ['Info Coefficient', 'IC = Pearson(signal_t, ΔP_{t+k*})'],
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
