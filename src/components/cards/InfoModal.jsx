import { METRIC_INFO } from '../../constants/metrics.js'
import { METRIC_LABELS } from '../../constants/metrics.js'

export default function InfoModal({ id, onClose }) {
  const info  = METRIC_INFO[id]
  const label = METRIC_LABELS[id] ?? id
  if (!info) return null

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal" onClick={e => e.stopPropagation()}>
        <div className="info-modal-header">
          <div className="info-modal-title">{label} <span style={{ color: 'var(--fg2)', fontFamily: 'var(--mono)', fontSize: 12 }}>({id})</span></div>
          <button className="info-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="info-formula">{info.formula}</div>
        <p className="info-description">{info.description}</p>
        <div className="info-source">Source: {info.source}</div>
      </div>
    </div>
  )
}
