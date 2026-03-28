import { useState, useMemo } from 'react'
import BarChartPanel from '../components/charts/BarChartPanel.jsx'
import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import MetricBadge from '../components/cards/MetricBadge.jsx'
import MarketSelector, { SIGNALS_ONLY } from '../components/layout/MarketSelector.jsx'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKETS } from '../constants/markets.js'
import { toJSTShort, formatNum, formatPct } from '../utils/formatters.js'

function SectionTitle({ children }) {
  return <div className="analytics-section-title">{children}</div>
}

function MiniStat({ label, value, color }) {
  return (
    <div className="analytics-stat">
      <div className="analytics-stat-label">{label}</div>
      <div className="analytics-stat-value" style={{ color: color ?? 'var(--fg)' }}>{value ?? '—'}</div>
    </div>
  )
}

export default function AnalyticsTab({ metrics, bojSeries = [], humanCapital = [], trades = [] }) {
  const [marketId, setMarketId] = useState('all')

  // Filter trades by selected market for per-market HC stats
  const filteredTrades = useMemo(() => {
    if (marketId === 'all') return trades
    const mkt = SIGNALS_MARKETS.find(m => m.id === marketId)
    if (!mkt) return trades
    const addr = mkt.address.toLowerCase()
    return trades.filter(t => t.market === addr)
  }, [trades, marketId])

  // Per-market trade count for leaderboard
  const perMarketCounts = useMemo(() => {
    const counts = {}
    filteredTrades.forEach(t => {
      counts[t.trader] = (counts[t.trader] ?? 0) + 1
    })
    return counts
  }, [filteredTrades])

  const leader = useMemo(() => {
    if (marketId === 'all') return null
    const top = Object.entries(perMarketCounts).sort((a, b) => b[1] - a[1])[0]
    if (!top) return null
    const wallet = WALLETS.find(w => w.address.toLowerCase() === top[0])
    return wallet ? { name: wallet.name, count: top[1] } : null
  }, [perMarketCounts, marketId])

  const selectedMktMeta = SIGNALS_ONLY.find(m => m.id === marketId)

  const {
    signalZoo, variantICs, ensembleSignal, decomposition, icByLag, kStar, les,
    divergenceSignal, compositeIndex, cg, wfa, mcp, rstResult, actionableThreshold,
    jaccardMatrix, centralities, clusteringCoeffs, followerMults, scs, hs, nr,
    globalLocalSpread,
  } = metrics ?? {}

  // ── Lens 1: Human Capital ──────────────────────────────────────
  const hcMap = Object.fromEntries((humanCapital ?? []).map(hc => [hc.address, hc]))

  const icBarData = WALLETS.map(w => ({
    label: w.name,
    value: hcMap[w.address]?.ic ?? null,
  })).filter(d => d.value != null)

  const bsBarData = WALLETS.map(w => ({
    label: w.name,
    value: hcMap[w.address]?.bs ?? null,
  })).filter(d => d.value != null)

  // ── Lens 2: Social Capital ────────────────────────────────────
  const centralityBar = WALLETS.map((w, i) => ({
    label: w.name,
    value: centralities?.[i] ?? null,
  })).filter(d => d.value != null)

  const fmBar = WALLETS.map((w, i) => ({
    label: w.name,
    value: followerMults?.[i] ?? null,
  })).filter(d => d.value != null)

  const avgClustering = clusteringCoeffs?.length
    ? clusteringCoeffs.reduce((a, b) => a + b, 0) / clusteringCoeffs.length
    : null

  const avgCentrality = centralities?.length
    ? centralities.reduce((a, b) => a + b, 0) / centralities.length
    : null

  // ── Lens 3: Signal Engineering ───────────────────────────────
  const itData = bojSeries.map((s, i) => ({
    timestamp: s.timestamp,
    It: (compositeIndex ?? [])[i] ?? null,
  }))

  const ensembleData = bojSeries.map((s, i) => ({
    timestamp: s.timestamp,
    ensemble: (ensembleSignal ?? [])[i] ?? null,
    siRaw: s.siRaw,
  }))

  const icLagData = (icByLag ?? []).map(({ lag, ic }) => ({
    label: `k=${lag}`, value: ic,
  }))

  // ── Lens 4: External Validity ─────────────────────────────────
  const divData = bojSeries.map((s, i) => ({
    timestamp: s.timestamp,
    siRaw: s.siRaw,
    divergence: (divergenceSignal != null && i === bojSeries.length - 1) ? divergenceSignal : null,
  }))

  // ── Lens 6: Demand Data ──────────────────────────────────────
  const atUpper = actionableThreshold?.upper
  const atLower = actionableThreshold?.lower
  const atAccuracy = actionableThreshold?.accuracy

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Market selector ──────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--fg2)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
            Analyze market:
          </span>
          <MarketSelector selected={marketId} onChange={setMarketId} />
        </div>
        {leader && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--fg2)' }}>Market leader:</span>
            <span className="leader-badge">
              <span className="leader-badge-crown">★</span>
              <span className="leader-badge-name">{leader.name}</span>
              <span className="leader-badge-stat">{leader.count} trades</span>
              {selectedMktMeta?.label && (
                <span style={{ color: 'var(--fg2)', fontSize: 10 }}>in {selectedMktMeta.label}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── Lens 1: Human Capital ────────────────────────────── */}
      <div className="analytics-section card">
        <SectionTitle>Lens 1 — Human Capital Analytics</SectionTitle>
        <div className="panel-grid panel-grid-2">
          <BarChartPanel
            data={icBarData}
            xKey="label" yKey="value"
            title="Information Coefficient per Trader (IC = Pearson(signal, ΔP))"
            height={180} colorBySign referenceY={0}
          />
          <BarChartPanel
            data={bsBarData}
            xKey="label" yKey="value"
            title="Brier Score per Trader (lower = better)"
            height={180}
          />
        </div>
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Trader</th><th>Group</th>
                <th>{marketId !== 'all' ? `Trades (${selectedMktMeta?.label ?? marketId})` : 'Trades'}</th>
                <th>Brier Score</th><th>IC</th><th>IAS</th>
                <th>Noise Sens.</th><th>Last Trade</th>
              </tr>
            </thead>
            <tbody>
              {WALLETS
                .map(w => ({ w, hc: hcMap[w.address] ?? {}, mktCount: perMarketCounts[w.address.toLowerCase()] ?? 0 }))
                .sort((a, b) => marketId !== 'all' ? b.mktCount - a.mktCount : (b.hc.tradeCount ?? 0) - (a.hc.tradeCount ?? 0))
                .map(({ w, hc, mktCount }) => {
                return (
                  <tr key={w.address}>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{w.name}</td>
                    <td style={{ color: 'var(--fg2)' }}>{w.group}</td>
                    <td>{marketId !== 'all' ? mktCount : (hc.tradeCount ?? 0)}</td>
                    <td style={{ color: hc.bs != null ? (hc.bs < 0.2 ? 'var(--green)' : hc.bs < 0.35 ? 'var(--amber)' : 'var(--red)') : 'var(--fg2)' }}>
                      {hc.bs != null ? hc.bs.toFixed(3) : '—'}
                    </td>
                    <td style={{ color: hc.ic != null ? (hc.ic > 0 ? 'var(--green)' : 'var(--red)') : 'var(--fg2)' }}>
                      {hc.ic != null ? hc.ic.toFixed(3) : '—'}
                    </td>
                    <td>{hc.ias != null ? `${(hc.ias * 100).toFixed(1)}%` : '—'}</td>
                    <td style={{ color: hc.ns != null ? (hc.ns < 1 ? 'var(--green)' : 'var(--amber)') : 'var(--fg2)' }}>
                      {hc.ns != null ? hc.ns.toFixed(3) : '—'}
                    </td>
                    <td style={{ color: 'var(--fg2)' }}>{hc.lastTrade ? toJSTShort(hc.lastTrade) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Lens 2: Social Capital ──────────────────────────── */}
      <div className="analytics-section card" style={{ marginTop: 16 }}>
        <SectionTitle>Lens 2 — Social Capital Analytics</SectionTitle>
        <div className="analytics-mini-stats">
          <MiniStat label="Avg Clustering" value={avgClustering != null ? formatNum(avgClustering, 3) : '—'} />
          <MiniStat label="Avg Centrality" value={avgCentrality != null ? formatNum(avgCentrality, 3) : '—'} />
          <MiniStat label="Homophily" value={hs != null ? formatNum(hs, 3) : '—'} color={hs > 0.2 ? 'var(--amber)' : 'var(--green)'} />
          <MiniStat label="Net. Resilience" value={nr != null ? formatPct(nr) : '—'} color={nr > 0.7 ? 'var(--green)' : 'var(--red)'} />
          <MiniStat label="Sync Cluster" value={scs != null ? formatNum(scs, 3) : '—'} />
        </div>
        <div className="panel-grid panel-grid-2">
          <BarChartPanel
            data={centralityBar}
            xKey="label" yKey="value"
            title="Centrality Score per Trader (IC-weighted Jaccard sum)"
            height={180}
          />
          <BarChartPanel
            data={fmBar}
            xKey="label" yKey="value"
            title="Follower Multiplier (trades triggered within 30m)"
            height={180}
          />
        </div>
      </div>

      {/* ── Lens 3: Signal Engineering ─────────────────────── */}
      <div className="analytics-section card" style={{ marginTop: 16 }}>
        <SectionTitle>Lens 3 — Signal Engineering Analytics</SectionTitle>
        <div className="panel-grid panel-grid-2">
          <PriceLineChart
            data={itData}
            lines={[{ key: 'It', label: 'Composite Index I_t', color: '#a78bfa' }]}
            title="Composite Signal Index I_t = w₁·Z(P) + w₂·Z(A)"
            height={200}
          />
          <BarChartPanel
            data={icLagData}
            xKey="label" yKey="value"
            title={`IC by Lag · Optimal k* = ${kStar ?? '?'} · LES = ${les?.toFixed(3) ?? '—'}`}
            height={200} colorBySign referenceY={0}
          />
        </div>
        <div className="panel-grid panel-grid-2" style={{ marginTop: 12 }}>
          <PriceLineChart
            data={ensembleData}
            lines={[
              { key: 'ensemble', label: 'IC-Weighted Ensemble', color: '#6c8fff' },
              { key: 'siRaw',    label: 'Raw SI',               color: '#9999aa' },
            ]}
            title="SE-5 — Ensemble Signal vs Raw SI"
            height={200}
          />
          <div className="card" style={{ background: 'var(--bg3)' }}>
            <div className="card-title">Signal Decomposition Stats</div>
            <div className="metric-grid">
              <MetricBadge id="SNR" value={decomposition?.snr ?? null} />
              <MetricBadge id="EA"  value={variantICs ? (Object.values(variantICs).filter(v => v > 0).length / Math.max(Object.values(variantICs).length, 1)) : null} fmt="pct" />
              <MetricBadge id="LES" value={les ?? null} fmt="signed" />
              <MetricBadge id="KS"  value={kStar ?? null} fmt="int" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Lens 4: External Validity ───────────────────────── */}
      <div className="analytics-section card" style={{ marginTop: 16 }}>
        <SectionTitle>Lens 4 — External Validity</SectionTitle>
        <div className="analytics-mini-stats">
          <MiniStat
            label="Global-Local Spread"
            value={globalLocalSpread != null ? (globalLocalSpread >= 0 ? '+' : '') + globalLocalSpread.toFixed(4) : '—'}
            color={globalLocalSpread != null ? (Math.abs(globalLocalSpread) > 0.05 ? 'var(--amber)' : 'var(--green)') : undefined}
          />
          <MiniStat
            label="Divergence Signal"
            value={divergenceSignal != null ? (divergenceSignal >= 0 ? '+' : '') + divergenceSignal.toFixed(4) : '—'}
            color={divergenceSignal != null ? (Math.abs(divergenceSignal) > 0.02 ? 'var(--amber)' : 'var(--green)') : undefined}
          />
        </div>
        <PriceLineChart
          data={bojSeries.map(s => ({ timestamp: s.timestamp, siRaw: s.siRaw }))}
          lines={[{ key: 'siRaw', label: 'BOJ SI_raw (SIGNALS internal)', color: '#6c8fff' }]}
          title="BOJ Signal Index — SIGNALS Internal vs External Markets"
          height={200}
        />
      </div>

      {/* ── Lens 5: Robustness ──────────────────────────────── */}
      <div className="analytics-section card" style={{ marginTop: 16 }}>
        <SectionTitle>Lens 5 — Robustness Dashboard</SectionTitle>
        <div className="analytics-mini-stats">
          <MiniStat
            label="Walk-Forward Acc."
            value={wfa != null ? formatPct(wfa) : '—'}
            color={wfa != null ? (wfa > 0.55 ? 'var(--green)' : 'var(--red)') : undefined}
          />
          <MiniStat
            label="Monte Carlo Pass"
            value={mcp != null ? formatPct(mcp) : '—'}
            color={mcp != null ? (mcp > 0.85 ? 'var(--green)' : 'var(--amber)') : undefined}
          />
          <MiniStat
            label="Consensus Gate"
            value={cg != null ? (cg ? 'OPEN' : 'CLOSED') : '—'}
            color={cg ? 'var(--green)' : 'var(--red)'}
          />
          <MiniStat
            label="Regime Shift"
            value={rstResult?.significant != null ? (rstResult.significant ? 'DETECTED' : 'STABLE') : '—'}
            color={rstResult?.significant ? 'var(--amber)' : 'var(--green)'}
          />
          {rstResult?.d != null && (
            <MiniStat label="KS statistic" value={rstResult.d.toFixed(4)} />
          )}
        </div>
        <div className="metric-grid" style={{ marginTop: 12 }}>
          <MetricBadge id="WFA" value={wfa ?? null} fmt="pct" />
          <MetricBadge id="MCP" value={mcp ?? null} fmt="pct" />
          <MetricBadge id="CG"  value={cg ?? null} fmt="bool" />
          <MetricBadge id="RST" value={rstResult?.significant != null ? (rstResult.significant ? 1 : 0) : null} fmt="bool" />
          <MetricBadge id="WS"  value={rstResult?.d ?? null} />
        </div>
      </div>

      {/* ── Lens 6: Demand Data ──────────────────────────────── */}
      <div className="analytics-section card" style={{ marginTop: 16 }}>
        <SectionTitle>Lens 6 — Demand Data &amp; Actionable Threshold</SectionTitle>
        <div className="analytics-mini-stats">
          <MiniStat
            label="AT Upper (HIKE)"
            value={atUpper != null ? `+${atUpper.toFixed(4)}` : '—'}
            color="var(--green)"
          />
          <MiniStat
            label="AT Lower (HOLD)"
            value={atLower != null ? atLower.toFixed(4) : '—'}
            color="var(--red)"
          />
          <MiniStat
            label="Calibration Accuracy"
            value={atAccuracy != null ? `${(atAccuracy * 100).toFixed(1)}%` : '—'}
            color={atAccuracy != null ? (atAccuracy > 0.7 ? 'var(--green)' : 'var(--amber)') : undefined}
          />
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.7, marginTop: 8 }}>
          <p>
            The Actionable Threshold (AT) is calibrated to maximize classification accuracy between HIKE and HOLD regimes.
            When <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>SI_raw &gt; AT_upper</span>, the model signals <strong style={{ color: 'var(--green)' }}>HIKE</strong>.
            When <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)' }}>SI_raw &lt; AT_lower</span>, the model signals <strong style={{ color: 'var(--red)' }}>HOLD</strong>.
            Between the thresholds, the signal is <span style={{ color: 'var(--amber)' }}>NEUTRAL</span>.
          </p>
        </div>
        <div className="metric-grid" style={{ marginTop: 12 }}>
          <MetricBadge id="AT"  value={atAccuracy ?? null} fmt="pct" />
          <MetricBadge id="DLT" value={null} />
          <MetricBadge id="VoI" value={null} />
          <MetricBadge id="SF"  value={null} />
        </div>
      </div>

    </div>
  )
}
