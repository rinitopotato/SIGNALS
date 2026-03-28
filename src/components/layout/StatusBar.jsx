import { staleSeverity, severityToColor } from '../../utils/stale.js'
import { POLL_INTERVALS } from '../../constants/endpoints.js'
import { nowJST } from '../../utils/formatters.js'

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

export default function StatusBar({ goldskyTs, polymarketTs, attentionTs }) {
  const feeds = [
    { name: 'SIGNALS',    lastFetchedAt: goldskyTs,    pollInterval: POLL_INTERVALS.goldsky },
    { name: 'Polymarket', lastFetchedAt: polymarketTs, pollInterval: POLL_INTERVALS.polymarket },
    { name: 'Attention',  lastFetchedAt: attentionTs,  pollInterval: POLL_INTERVALS.attention },
  ]
  return (
    <div className="status-bar">
      <span className="brand">SIGNALS</span>
      {feeds.map(f => <FeedPill key={f.name} {...f} />)}
      <span style={{ marginLeft: 'auto', color: 'var(--fg2)', fontSize: 11 }}>
        Fukuhara Seminar · Group 3 · {nowJST()}
      </span>
    </div>
  )
}
