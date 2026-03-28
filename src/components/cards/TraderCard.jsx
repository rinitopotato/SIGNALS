import { truncateAddress, formatNum, formatPct, toJSTShort } from '../../utils/formatters.js'

export default function TraderCard({ trader }) {
  const { name, address, tradeCount, bs, ic, sr, ias, ns, lastTrade, firstTrade } = trader

  const StatBox = ({ label, value, color }) => (
    <div className="stat-box">
      <div className="stat-key">{label}</div>
      <div className="stat-val" style={{ color: color ?? 'var(--fg)' }}>
        {value ?? '—'}
      </div>
    </div>
  )

  return (
    <div className="trader-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="trader-name">{name}</span>
        <span className="badge badge-grey">{tradeCount} trades</span>
      </div>
      <div className="trader-addr">{truncateAddress(address)}</div>
      <div className="trader-stats">
        <StatBox
          label="Brier Score"
          value={bs != null ? formatNum(bs, 3) : '—'}
          color={bs != null ? (bs < 0.2 ? 'var(--green)' : bs < 0.35 ? 'var(--amber)' : 'var(--red)') : null}
        />
        <StatBox
          label="IC"
          value={ic != null ? formatNum(ic, 3) : '—'}
          color={ic != null ? (ic > 0 ? 'var(--green)' : 'var(--red)') : null}
        />
        <StatBox
          label="IAS"
          value={ias != null ? formatPct(ias) : '—'}
          color="var(--accent)"
        />
        <StatBox
          label="Noise Sens."
          value={ns != null ? formatNum(ns, 3) : '—'}
          color={ns != null ? (ns < 1 ? 'var(--green)' : 'var(--amber)') : null}
        />
      </div>
      {(lastTrade || firstTrade) && (
        <div style={{ fontSize: 10, color: 'var(--fg2)', fontFamily: 'var(--mono)' }}>
          {firstTrade && <span>First: {toJSTShort(firstTrade)}</span>}
          {lastTrade  && <span style={{ marginLeft: 8 }}>Last: {toJSTShort(lastTrade)}</span>}
        </div>
      )}
    </div>
  )
}
