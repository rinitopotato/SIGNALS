import PriceLineChart from '../components/charts/PriceLineChart.jsx'
import BarChartPanel from '../components/charts/BarChartPanel.jsx'
import MetricBadge from '../components/cards/MetricBadge.jsx'

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

export default function SignalEngineeringTab({ bojSeries = [], metrics = {} }) {
  const {
    signalZoo, variantICs, ensembleSignal, decomposition,
    icByLag, kStar, les, divergenceSignal, compositeIndex,
    cg, wfa, mcp, rstResult, actionableThreshold,
  } = metrics

  // SE-1: Build overlay chart data (6 MA variants)
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

  // IC per variant bar chart
  const icData = Object.entries(variantICs ?? {}).map(([k, v]) => ({
    label: VARIANT_LABELS[k] ?? k,
    value: v,
  }))

  // Rolling IC by lag bar chart
  const icLagData = (icByLag ?? []).map(({ lag, ic }) => ({
    label: `k=${lag}`,
    value: ic,
  }))

  // Ensemble signal chart data
  const ensembleData = bojSeries.map((s, i) => ({
    timestamp: s.timestamp,
    ensemble:  (ensembleSignal ?? [])[i] ?? null,
    siRaw:     s.siRaw,
  }))

  // Decomposition chart data
  const decompData = bojSeries.map((s, i) => ({
    timestamp: s.timestamp,
    trend:     (decomposition?.trend     ?? [])[i] ?? null,
    cyclical:  (decomposition?.cyclical  ?? [])[i] ?? null,
    residual:  (decomposition?.residual  ?? [])[i] ?? null,
  }))

  // Composite index chart data
  const compositeData = bojSeries.map((s, i) => ({
    timestamp: s.timestamp,
    It:        (compositeIndex ?? [])[i] ?? null,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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
    </div>
  )
}
