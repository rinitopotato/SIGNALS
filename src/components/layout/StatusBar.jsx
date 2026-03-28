import { useState, useEffect } from 'react'
import { staleSeverity, severityToColor } from '../../utils/stale.js'
import { POLL_INTERVALS } from '../../constants/endpoints.js'

function FeedPill({ name, lastFetchedAt, pollInterval }) {
  const sev   = staleSeverity(lastFetchedAt, pollInterval)
  const color = severityToColor(sev)
  const timeStr = lastFetchedAt
    ? new Date(lastFetchedAt).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit'
      }) + ' JST'
    : 'loading…'
  return (
    <span className="feed-pill" title={`${name} — last updated ${timeStr}`}>
      <span className={`dot dot-${color}`} />
      <span>{name}</span>
      {sev !== 'fresh' && <span className="stale-warn">{sev.toUpperCase()}</span>}
    </span>
  )
}

function LiveClock() {
  const [tick, setTick] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const timeStr = new Date(tick).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + ' JST'
  return <span>{timeStr}</span>
}

export default function StatusBar({ goldskyTs, polymarketTs, attentionTs, theme, onToggleTheme }) {
  const feeds = [
    { name: 'SIGNALS',    lastFetchedAt: goldskyTs,    pollInterval: POLL_INTERVALS.goldsky },
    { name: 'Polymarket', lastFetchedAt: polymarketTs, pollInterval: POLL_INTERVALS.polymarket },
    { name: 'Attention',  lastFetchedAt: attentionTs,  pollInterval: POLL_INTERVALS.attention },
  ]
  const isDark = theme !== 'light'
  return (
    <div className="status-bar">
      <span className="brand">SIGNALS</span>
      {feeds.map(f => <FeedPill key={f.name} {...f} />)}
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onToggleTheme}
          className="theme-toggle"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <span style={{ color: 'var(--fg2)', fontSize: 11 }}>
          Fukuhara Seminar · Group 3 · <LiveClock />
        </span>
      </span>
    </div>
  )
}
