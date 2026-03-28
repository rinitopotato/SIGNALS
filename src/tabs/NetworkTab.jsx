import { useState, useMemo } from 'react'
import HeatmapGrid from '../components/charts/HeatmapGrid.jsx'
import BarChartPanel from '../components/charts/BarChartPanel.jsx'
import NetworkGraph from '../components/network/NetworkGraph.jsx'
import MetricBadge from '../components/cards/MetricBadge.jsx'
import MarketSelector, { SIGNALS_ONLY } from '../components/layout/MarketSelector.jsx'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKETS } from '../constants/markets.js'
import { formatNum } from '../utils/formatters.js'
import { buildJaccardMatrix, centralityScores, clusteringCoefficients } from '../utils/social.js'

// Compute per-market leader (most trades in market)
function marketLeader(trades, marketId) {
  if (!marketId || marketId === 'all') return null
  const mkt = SIGNALS_MARKETS.find(m => m.id === marketId)
  if (!mkt) return null
  const addr = mkt.address.toLowerCase()
  const counts = {}
  trades.filter(t => t.market === addr).forEach(t => {
    counts[t.trader] = (counts[t.trader] ?? 0) + 1
  })
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  const wallet = WALLETS.find(w => w.address.toLowerCase() === top[0])
  return wallet ? { name: wallet.name, count: top[1] } : null
}

export default function NetworkTab({ metrics = {}, trades = [], snapshots = [] }) {
  const [marketId, setMarketId] = useState('all')

  const {
    jaccardMatrix: globalJaccard,
    centralities: globalCentralities,
    clusteringCCs: globalCCs,
    followerMults,
    scs, hs, resilience, humanCapital,
    bridgingAgents,
  } = metrics

  // Filter trades by selected market for per-market matrix
  const filteredTrades = useMemo(() => {
    if (marketId === 'all') return trades
    const mkt = SIGNALS_MARKETS.find(m => m.id === marketId)
    if (!mkt) return trades
    const addr = mkt.address.toLowerCase()
    return trades.filter(t => t.market === addr)
  }, [trades, marketId])

  // Recompute Jaccard + centrality for filtered trades
  const jaccardMatrix = useMemo(
    () => filteredTrades.length ? buildJaccardMatrix(filteredTrades, WALLETS) : (globalJaccard ?? []),
    [filteredTrades, globalJaccard]
  )
  const centralities = useMemo(
    () => filteredTrades.length ? centralityScores(filteredTrades, WALLETS) : (globalCentralities ?? []),
    [filteredTrades, globalCentralities]
  )
  const clusteringCCs = useMemo(
    () => jaccardMatrix.length ? clusteringCoefficients(jaccardMatrix, WALLETS) : (globalCCs ?? []),
    [jaccardMatrix, globalCCs]
  )

  const walletNames = WALLETS.map(w => w.name)

  const hcData = (humanCapital ?? []).map(h => ({
    label: h.name,
    bs:    h.bs ?? 0,
    ic:    h.ic ?? 0,
    ias:   h.ias ?? 0,
  }))

  const centralityData = (centralities ?? []).map((c, i) => ({
    label: WALLETS[i]?.name ?? `T${i}`,
    value: typeof c === 'object' ? c.centrality : (c ?? 0),
  }))

  const ccData = (clusteringCCs ?? []).map((c, i) => ({
    label: WALLETS[i]?.name ?? `T${i}`,
    value: typeof c === 'object' ? c.cc : (c ?? 0),
  }))

  const fmData = (followerMults ?? []).map(f => ({
    label: f.name,
    value: f.fm ?? 0,
  }))

  const leader = useMemo(() => marketLeader(trades, marketId), [trades, marketId])
  const selectedMktMeta = SIGNALS_ONLY.find(m => m.id === marketId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Market selector */}
      <div className="card" style={{ paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--fg2)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
            Filter network by market:
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
        {marketId !== 'all' && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--fg2)' }}>
            Jaccard matrix and centrality computed from {filteredTrades.length} trades in {selectedMktMeta?.label ?? marketId}.
          </div>
        )}
        {bridgingAgents?.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--fg2)' }}>Bridging Agents (≥2 markets):</span>
            {bridgingAgents.map(name => (
              <span key={name} style={{
                padding: '2px 8px', borderRadius: 4,
                background: 'rgba(108,143,255,0.15)', border: '1px solid var(--accent)',
                fontSize: 11, fontWeight: 600, color: 'var(--accent)',
              }}>
                {name}
              </span>
            ))}
            <span style={{ fontSize: 10, color: 'var(--fg2)', fontStyle: 'italic' }}>NCM Ch.3 — bridge across strong-tie clusters</span>
          </div>
        )}
      </div>

      {/* Row 1: Jaccard matrix + Network graph */}
      <div className="panel-grid panel-grid-2">
        <div className="card">
          <div className="card-title">
            Jaccard Co-Participation Matrix (9×9)
            {marketId !== 'all' && <span style={{ color: 'var(--fg2)', fontWeight: 400 }}> — {selectedMktMeta?.label}</span>}
          </div>
          <HeatmapGrid
            matrix={jaccardMatrix ?? WALLETS.map(() => WALLETS.map(() => 0))}
            rowLabels={walletNames}
            colLabels={walletNames}
            minColor="#1e1e22"
            maxColor="#6c8fff"
          />
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg2)' }}>
            J(A,B) = |A∩B| / |A∪B| on (date, market) participation pairs · NCM Ch. 3
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Force-Directed Network Graph (Jaccard &gt; 0.2)
            {marketId !== 'all' && <span style={{ color: 'var(--fg2)', fontWeight: 400 }}> — {selectedMktMeta?.label}</span>}
          </div>
          <NetworkGraph
            wallets={WALLETS}
            jaccardMatrix={jaccardMatrix ?? []}
            centralities={centralities ?? []}
          />
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg2)' }}>
            Node size ∝ centrality · Edge width ∝ Jaccard similarity
          </div>
        </div>
      </div>

      {/* Row 2: Centrality + Clustering Coefficient bars */}
      <div className="panel-grid panel-grid-2">
        <BarChartPanel
          data={centralityData}
          xKey="label"
          yKey="value"
          title="Centrality Score C_i (# traders with corr > 0.7)"
          color="var(--accent)"
          height={180}
        />
        <BarChartPanel
          data={ccData}
          xKey="label"
          yKey="value"
          title="Clustering Coefficient CC"
          color="var(--accent2)"
          height={180}
        />
      </div>

      {/* Row 3: HC bars */}
      <div className="panel-grid panel-grid-2">
        <BarChartPanel
          data={hcData}
          xKey="label"
          yKey="ic"
          title="Information Coefficient IC_i per Trader (Lens 1)"
          height={180}
          colorBySign
          referenceY={0}
        />
        <BarChartPanel
          data={fmData}
          xKey="label"
          yKey="value"
          title="Follower Multiplier FM (ΔVol +1h / TradeSize)"
          color="var(--amber)"
          height={180}
          referenceY={1}
        />
      </div>

      {/* Network summary metrics */}
      <div className="panel-grid panel-grid-2">
        <div className="card">
          <div className="card-title">Social Capital Metrics (Lens 2)</div>
          <div className="metric-grid">
            <MetricBadge id="SCS" value={scs ?? null} />
            <MetricBadge id="HS"  value={hs ?? null} fmt="signed" />
            <MetricBadge id="NR"  value={resilience ?? null} fmt="pct" />
            <MetricBadge id="BI"  value={null} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Human Capital Metrics (Lens 1) — Averages</div>
          <div className="metric-grid">
            {(humanCapital ?? []).slice(0, 4).map((hc, i) => (
              <MetricBadge key={i} id="BS" value={hc.bs ?? null} />
            ))}
          </div>
          {hcData.length > 0 && (
            <table className="data-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Trader</th>
                  <th>Trades</th>
                  <th>IC</th>
                  <th>IAS</th>
                </tr>
              </thead>
              <tbody>
                {(humanCapital ?? []).map((hc, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--accent)' }}>{hc.name}</td>
                    <td>{hc.tradeCount}</td>
                    <td style={{ color: hc.ic > 0 ? 'var(--green)' : 'var(--red)' }}>
                      {hc.ic != null ? hc.ic.toFixed(3) : '—'}
                    </td>
                    <td>{hc.ias != null ? `${(hc.ias * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
