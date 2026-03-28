import { useState } from 'react'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKET_MAP } from '../constants/markets.js'
import { toJST, toJSTShort, formatNum, truncateAddress } from '../utils/formatters.js'

function TraderDetail({ trader, trades }) {
  const myTrades = trades
    .filter(t => t.trader === trader.address.toLowerCase())
    .sort((a, b) => b.timestamp - a.timestamp)

  return (
    <tr>
      <td colSpan={9} style={{ padding: '0 0 0 24px', background: 'var(--bg3)' }}>
        <div style={{ padding: '12px 0' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Time (JST)</th>
                <th>Market</th>
                <th>Outcome</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {myTrades.slice(0, 30).map((t, i) => {
                const market  = SIGNALS_MARKET_MAP[t.market]
                const outcome = market?.outcomeLabels?.[t.outcomeIndex] ?? `#${t.outcomeIndex}`
                const isBuy   = t.type === 'buy' || t.type === 'BUY'
                return (
                  <tr key={t.id ?? i}>
                    <td>{toJSTShort(t.timestamp)}</td>
                    <td style={{ color: 'var(--fg2)' }}>{market?.name ?? t.market.slice(0, 8) + '…'}</td>
                    <td>{outcome}</td>
                    <td style={{ color: isBuy ? 'var(--green)' : 'var(--red)' }}>
                      {isBuy ? '+' : '-'}{formatNum(t.amount, 3)}
                    </td>
                    <td style={{ color: 'var(--fg2)' }}>{t.type ?? '—'}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg2)' }}>
                        {t.txHash ? t.txHash.slice(0, 8) + '…' : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {myTrades.length === 0 && (
                <tr><td colSpan={6} style={{ color: 'var(--fg2)', padding: 12 }}>No trades recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}

const SORT_KEYS = {
  name:       w => w.name,
  tradeCount: w => w.tradeCount ?? 0,
  bs:         w => w.bs ?? 9999,
  ic:         w => w.ic ?? -9999,
  ias:        w => w.ias ?? -9999,
  ns:         w => w.ns ?? 9999,
}

export default function PlayersTab({ trades = [], humanCapital = [] }) {
  const [sortKey, setSortKey]   = useState('tradeCount')
  const [sortDir, setSortDir]   = useState('desc')
  const [expanded, setExpanded] = useState(null)

  const hcMap = Object.fromEntries((humanCapital ?? []).map(hc => [hc.address, hc]))

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'bs' || key === 'ns' ? 'asc' : 'desc')
    }
  }

  const sortedWallets = [...WALLETS]
    .map(w => ({ ...w, ...(hcMap[w.address] ?? {}) }))
    .sort((a, b) => {
      const fn = SORT_KEYS[sortKey] ?? (x => x.name)
      const va = fn(a)
      const vb = fn(b)
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

  function SortTh({ label, k }) {
    const active = sortKey === k
    return (
      <th
        className="sortable-th"
        onClick={() => handleSort(k)}
        style={{ color: active ? 'var(--accent)' : undefined }}
      >
        {label} {active ? (sortDir === 'asc' ? '▲' : '▼') : ''}
      </th>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-title">Trader Performance — Click row to expand trade history</div>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <SortTh label="Trader"       k="name" />
              <th>Group</th>
              <th style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>Address</th>
              <SortTh label="Trades"       k="tradeCount" />
              <SortTh label="Brier Score"  k="bs" />
              <SortTh label="IC"           k="ic" />
              <SortTh label="IAS"          k="ias" />
              <SortTh label="Noise Sens."  k="ns" />
              <th>Last Trade (JST)</th>
            </tr>
          </thead>
          <tbody>
            {sortedWallets.map(w => {
              const isOpen = expanded === w.address
              return (
                <>
                  <tr
                    key={w.address}
                    onClick={() => setExpanded(isOpen ? null : w.address)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>
                      {isOpen ? '▼ ' : '▶ '}{w.name}
                    </td>
                    <td style={{ color: 'var(--fg2)' }}>{w.group}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg2)' }}>
                      {truncateAddress(w.address)}
                    </td>
                    <td>{w.tradeCount ?? 0}</td>
                    <td style={{ color: w.bs != null ? (w.bs < 0.2 ? 'var(--green)' : w.bs < 0.35 ? 'var(--amber)' : 'var(--red)') : 'var(--fg2)' }}>
                      {w.bs != null ? w.bs.toFixed(3) : '—'}
                    </td>
                    <td style={{ color: w.ic != null ? (w.ic > 0 ? 'var(--green)' : 'var(--red)') : 'var(--fg2)' }}>
                      {w.ic != null ? w.ic.toFixed(3) : '—'}
                    </td>
                    <td>{w.ias != null ? `${(w.ias * 100).toFixed(1)}%` : '—'}</td>
                    <td style={{ color: w.ns != null ? (w.ns < 1 ? 'var(--green)' : 'var(--amber)') : 'var(--fg2)' }}>
                      {w.ns != null ? w.ns.toFixed(3) : '—'}
                    </td>
                    <td style={{ color: 'var(--fg2)' }}>{w.lastTrade ? toJSTShort(w.lastTrade) : '—'}</td>
                  </tr>
                  {isOpen && (
                    <TraderDetail
                      key={`${w.address}-detail`}
                      trader={w}
                      trades={trades}
                    />
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
