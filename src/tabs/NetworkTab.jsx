import HeatmapGrid from '../components/charts/HeatmapGrid.jsx'
import BarChartPanel from '../components/charts/BarChartPanel.jsx'
import NetworkGraph from '../components/network/NetworkGraph.jsx'
import MetricBadge from '../components/cards/MetricBadge.jsx'
import { WALLETS } from '../constants/wallets.js'
import { formatNum } from '../utils/formatters.js'

export default function NetworkTab({ metrics = {} }) {
  const {
    jaccardMatrix, centralities, clusteringCCs, followerMults,
    scs, hs, resilience, humanCapital,
  } = metrics

  const walletNames = WALLETS.map(w => w.name)

  // HC bar chart data
  const hcData = (humanCapital ?? []).map(h => ({
    label: h.name,
    bs:    h.bs ?? 0,
    ic:    h.ic ?? 0,
    ias:   h.ias ?? 0,
  }))

  const centralityData = (centralities ?? []).map(c => ({
    label: c.name,
    value: c.centrality,
  }))

  const ccData = (clusteringCCs ?? []).map(c => ({
    label: c.name,
    value: c.cc,
  }))

  const fmData = (followerMults ?? []).map(f => ({
    label: f.name,
    value: f.fm ?? 0,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Row 1: Jaccard matrix + Network graph */}
      <div className="panel-grid panel-grid-2">
        <div className="card">
          <div className="card-title">Jaccard Co-Participation Matrix (9×9)</div>
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
          <div className="card-title">Force-Directed Network Graph (Jaccard &gt; 0.2)</div>
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
