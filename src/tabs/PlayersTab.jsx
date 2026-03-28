import { useState, useMemo } from 'react'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKETS, SIGNALS_MARKET_MAP } from '../constants/markets.js'
import { toJST, toJSTShort, formatNum, truncateAddress } from '../utils/formatters.js'
import MarketSelector, { SIGNALS_ONLY } from '../components/layout/MarketSelector.jsx'

// ── Inline mini bar chart (SVG, buy/sell per day) ─────────────────
function DailyVolumeChart({ dailyData }) {
  if (!dailyData?.length) return <div style={{ fontSize: 11, color: 'var(--fg2)', fontStyle: 'italic' }}>No recent trades.</div>
  const maxVol = Math.max(...dailyData.map(d => d.buy + d.sell), 1)
  const W = 300, H = 80, barW = Math.max(6, Math.floor(W / dailyData.length) - 2)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', maxWidth: W }}>
      {dailyData.map((d, i) => {
        const x = i * (W / dailyData.length) + 1
        const buyH  = (d.buy  / maxVol) * (H - 16)
        const sellH = (d.sell / maxVol) * (H - 16)
        const label = d.label
        return (
          <g key={i}>
            {/* sell on top */}
            {sellH > 0 && (
              <rect x={x} y={H - 16 - buyH - sellH} width={barW} height={sellH} fill="#f87171" rx={1} />
            )}
            {/* buy at bottom */}
            {buyH > 0 && (
              <rect x={x} y={H - 16 - buyH} width={barW} height={buyH} fill="#34d399" rx={1} />
            )}
            <text x={x + barW / 2} y={H - 2} textAnchor="middle" fontSize={7} fill="var(--fg2)">{label}</text>
          </g>
        )
      })}
      {/* legend */}
      <rect x={0} y={H + 6} width={8} height={8} fill="#34d399" rx={1} />
      <text x={10} y={H + 14} fontSize={8} fill="var(--fg2)">Buy</text>
      <rect x={36} y={H + 6} width={8} height={8} fill="#f87171" rx={1} />
      <text x={46} y={H + 14} fontSize={8} fill="var(--fg2)">Sell</text>
    </svg>
  )
}

// ── Volume by Market horizontal bars ──────────────────────────────
function VolumeByMarket({ trades, walletAddr }) {
  const myTrades = trades.filter(t => t.trader === walletAddr.toLowerCase())
  const total = myTrades.length || 1
  const byMarket = SIGNALS_MARKETS.map(m => {
    const count = myTrades.filter(t => t.market === m.address.toLowerCase()).length
    return { name: m.nameEn, count, pct: count / total, color: m.colors[0] }
  }).filter(m => m.count > 0)

  if (!byMarket.length) return <div style={{ fontSize: 11, color: 'var(--fg2)', fontStyle: 'italic' }}>No trades.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {byMarket.map(m => (
        <div key={m.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--fg2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700 }}>{m.count}</span>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', height: 6 }}>
            <div style={{ height: '100%', width: `${m.pct * 100}%`, background: m.color, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg2)', textAlign: 'right' }}>{(m.pct * 100).toFixed(1)}%</div>
        </div>
      ))}
    </div>
  )
}

// ── Signal Index metrics card ──────────────────────────────────────
function SignalIndexPanel({ hc }) {
  if (!hc) return <div style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic' }}>No HC data available.</div>
  const metrics = [
    { label: 'Brier Score', value: hc.bs, fmt: v => v.toFixed(3), color: v => v < 0.2 ? 'var(--green)' : v < 0.35 ? 'var(--amber)' : 'var(--red)' },
    { label: 'IC', value: hc.ic, fmt: v => v.toFixed(3), color: v => v > 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'IAS', value: hc.ias, fmt: v => (v * 100).toFixed(1) + '%', color: () => 'var(--accent)' },
    { label: 'Noise Sensitivity', value: hc.ns, fmt: v => v.toFixed(3), color: v => v < 1 ? 'var(--green)' : 'var(--amber)' },
    { label: 'Trade Count', value: hc.tradeCount, fmt: v => String(v), color: () => 'var(--fg)' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
      {metrics.map(m => (
        <div key={m.label} style={{ background: 'var(--bg)', borderRadius: 6, padding: '8px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--fg2)', marginBottom: 2 }}>{m.label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)', color: m.value != null ? m.color(m.value) : 'var(--fg2)' }}>
            {m.value != null ? m.fmt(m.value) : '—'}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Trade history table ────────────────────────────────────────────
function TradeHistoryTable({ trades, walletAddr, marketFilter }) {
  const myTrades = trades
    .filter(t => {
      if (t.trader !== walletAddr.toLowerCase()) return false
      if (marketFilter && marketFilter !== 'all') {
        const mkt = SIGNALS_MARKETS.find(m => m.id === marketFilter)
        return mkt ? t.market === mkt.address.toLowerCase() : true
      }
      return true
    })
    .sort((a, b) => b.timestamp - a.timestamp)

  if (!myTrades.length) return <div style={{ fontSize: 12, color: 'var(--fg2)', padding: 8, fontStyle: 'italic' }}>No trades.</div>

  return (
    <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
      <thead>
        <tr>
          <th>Time (JST)</th><th>Market</th><th>Outcome</th><th>Amount</th><th>Type</th><th>Tx</th>
        </tr>
      </thead>
      <tbody>
        {myTrades.slice(0, 30).map((t, i) => {
          const market  = SIGNALS_MARKET_MAP[t.market]
          const outcome = market?.outcomeLabels?.[t.outcomeIndex] ?? `#${t.outcomeIndex}`
          const isBuy   = t.type?.toLowerCase() === 'buy'
          return (
            <tr key={t.id ?? i}>
              <td>{toJSTShort(t.timestamp)}</td>
              <td style={{ color: 'var(--fg2)' }}>{market?.name ?? t.market?.slice(0, 8) + '…'}</td>
              <td>{outcome}</td>
              <td style={{ color: isBuy ? 'var(--green)' : 'var(--red)' }}>
                {isBuy ? '+' : '-'}{formatNum(t.amount, 3)}
              </td>
              <td style={{ color: 'var(--fg2)' }}>{t.type ?? '—'}</td>
              <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg2)' }}>
                {t.txHash ? t.txHash.slice(0, 8) + '…' : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Per-trader card ───────────────────────────────────────────────
function TraderCard({ wallet, hc, trades, marketFilter }) {
  const [subTab, setSubTab] = useState('history')

  const myTrades = useMemo(
    () => trades.filter(t => t.trader === wallet.address.toLowerCase()),
    [trades, wallet.address]
  )

  const stats = useMemo(() => {
    const buyCount = myTrades.filter(t => t.type?.toLowerCase() === 'buy').length
    const buyPct   = myTrades.length ? buyCount / myTrades.length : 0
    const totalVol = myTrades.reduce((s, t) => s + (t.amount ?? 0), 0)
    const days     = new Set(myTrades.map(t => new Date(t.timestamp * 1000).toDateString())).size

    // Last 10 days of activity
    const today = new Date()
    const dailyData = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (9 - i))
      const dateStr = d.toDateString()
      const dayTrades = myTrades.filter(t => new Date(t.timestamp * 1000).toDateString() === dateStr)
      const buy  = dayTrades.filter(t => t.type?.toLowerCase() === 'buy').reduce((s, t) => s + (t.amount ?? 0), 0)
      const sell = dayTrades.filter(t => t.type?.toLowerCase() !== 'buy').reduce((s, t) => s + (t.amount ?? 0), 0)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      return { label, buy, sell }
    })

    return { buyPct, totalVol: Math.round(totalVol), days, dailyData }
  }, [myTrades])

  const SUB_TABS = ['Trade History', 'See Signal Index', 'Polymarket']

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{wallet.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg2)' }}>
            {truncateAddress(wallet.address)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
            background: stats.buyPct > 0.6 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
            color: stats.buyPct > 0.6 ? 'var(--green)' : 'var(--red)',
          }}>
            {stats.buyPct > 0.6 ? 'Buy' : 'Sell'} {(stats.buyPct * 100).toFixed(1)}%
          </span>
          <span style={{ fontSize: 12, color: 'var(--fg2)', fontWeight: 600 }}>
            {stats.days} Active Days
          </span>
        </div>
      </div>

      {/* Volume + trade count */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {[
          ['TOTAL VOLUME', `${stats.totalVol.toLocaleString()} tokens`],
          ['TRADE COUNT', `${myTrades.length} Trades`],
        ].map(([label, val]) => (
          <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--fg2)', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
        {SUB_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab === 'Trade History' ? 'history' : tab === 'See Signal Index' ? 'signal' : 'polymarket')}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderBottom: `2px solid ${subTab === (tab === 'Trade History' ? 'history' : tab === 'See Signal Index' ? 'signal' : 'polymarket') ? 'var(--accent)' : 'transparent'}`,
              background: 'transparent',
              color: subTab === (tab === 'Trade History' ? 'history' : tab === 'See Signal Index' ? 'signal' : 'polymarket') ? 'var(--fg)' : 'var(--fg2)',
              fontWeight: subTab === (tab === 'Trade History' ? 'history' : tab === 'See Signal Index' ? 'signal' : 'polymarket') ? 700 : 400,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'history' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', marginBottom: 8, textAlign: 'center' }}>Recent Trade Volume</div>
            <DailyVolumeChart dailyData={stats.dailyData} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg2)', marginBottom: 8, textAlign: 'center' }}>Volume by Market</div>
            <VolumeByMarket trades={trades} walletAddr={wallet.address} />
          </div>
        </div>
      )}

      {subTab === 'signal' && (
        <SignalIndexPanel hc={hc} />
      )}

      {subTab === 'polymarket' && (
        <div style={{ fontSize: 12, color: 'var(--fg2)', padding: '8px 0', fontStyle: 'italic' }}>
          No Polymarket data available for this trader. Polymarket trades are off-chain and not recorded in SIGNALS.
        </div>
      )}

      {/* Last few trades preview (only in history tab) */}
      {subTab === 'history' && myTrades.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <TradeHistoryTable trades={trades} walletAddr={wallet.address} marketFilter={marketFilter} />
        </div>
      )}
    </div>
  )
}

// ── Compute per-market leader ─────────────────────────────────────
function computeMarketStats(trades, marketId) {
  const mkt = SIGNALS_MARKETS.find(m => m.id === marketId)
  if (!mkt) return { counts: {}, leader: null }
  const addr = mkt.address.toLowerCase()
  const filtered = trades.filter(t => t.market === addr)
  const counts = {}
  filtered.forEach(t => { counts[t.trader] = (counts[t.trader] ?? 0) + 1 })
  const leaderAddr = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const leaderWallet = leaderAddr ? WALLETS.find(w => w.address.toLowerCase() === leaderAddr) : null
  return { counts, leader: leaderWallet ? { name: leaderWallet.name, count: counts[leaderAddr] } : null }
}

// ── Main PlayersTab ───────────────────────────────────────────────
export default function PlayersTab({ trades = [], humanCapital = [] }) {
  const [marketId, setMarketId] = useState('all')

  const hcMap = useMemo(
    () => Object.fromEntries((humanCapital ?? []).map(hc => [hc.address, hc])),
    [humanCapital]
  )

  const mktStats = marketId !== 'all' ? computeMarketStats(trades, marketId) : null
  const selectedMktMeta = SIGNALS_ONLY.find(m => m.id === marketId)

  // Sort wallets by trade count (global or per-market)
  const sortedWallets = useMemo(() => {
    return [...WALLETS]
      .map(w => ({
        ...w,
        tradeCount: mktStats
          ? (mktStats.counts[w.address.toLowerCase()] ?? 0)
          : trades.filter(t => t.trader === w.address.toLowerCase()).length,
      }))
      .sort((a, b) => b.tradeCount - a.tradeCount)
  }, [trades, mktStats])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Market selector + leader badge */}
      <div className="card" style={{ paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--fg2)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
            Filter by market:
          </span>
          <MarketSelector selected={marketId} onChange={setMarketId} />
        </div>
        {mktStats?.leader && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--fg2)' }}>Market leader:</span>
            <span className="leader-badge">
              <span className="leader-badge-crown">★</span>
              <span className="leader-badge-name">{mktStats.leader.name}</span>
              <span className="leader-badge-stat">{mktStats.leader.count} trades</span>
              {selectedMktMeta?.label && (
                <span style={{ color: 'var(--fg2)', fontSize: 10 }}>in {selectedMktMeta.label}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Trader cards */}
      {sortedWallets.map(w => (
        <TraderCard
          key={w.address}
          wallet={w}
          hc={hcMap[w.address]}
          trades={trades}
          marketFilter={marketId}
        />
      ))}
    </div>
  )
}
