export default function MarketLeaderBadge({ leader, market }) {
  if (!leader) {
    return (
      <div className="leader-badge">
        <span className="leader-badge__crown">★</span>
        <div className="leader-badge__body">
          <span className="leader-badge__name" style={{ color: 'var(--fg2)' }}>No trades yet</span>
        </div>
        <span className="leader-badge__label">Leader — {market?.nameEn ?? market?.label ?? ''}</span>
      </div>
    )
  }

  const pct = (leader.shareOfVolume * 100).toFixed(0)
  const icStr = leader.ic != null ? ` · IC ${leader.ic.toFixed(3)}` : ''

  return (
    <div className="leader-badge">
      <span className="leader-badge__crown">★</span>
      <div className="leader-badge__body">
        <span className="leader-badge__name">{leader.wallet.name}</span>
        <span className="leader-badge__stats">
          {leader.tradeCount} trades · {pct}% share{icStr}
        </span>
      </div>
      <span className="leader-badge__label">Leader — {market?.nameEn ?? market?.label ?? ''}</span>
    </div>
  )
}
