import { useState } from 'react'
import TraderCard from '../components/cards/TraderCard.jsx'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKET_MAP } from '../constants/markets.js'
import { toJST, toJSTShort, formatNum, truncateAddress } from '../utils/formatters.js'

function TraderDetail({ trader, trades }) {
  const myTrades = trades
    .filter(t => t.trader === trader.address.toLowerCase())
    .sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div style={{ marginTop: 12 }}>
      <table className="data-table">
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
            const market   = SIGNALS_MARKET_MAP[t.market]
            const outcome  = market?.outcomeLabels?.[t.outcomeIndex] ?? `#${t.outcomeIndex}`
            const isBuy    = t.type === 'buy' || t.type === 'BUY'
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
        </tbody>
      </table>
      {myTrades.length === 0 && (
        <div style={{ color: 'var(--fg2)', fontSize: 12, padding: 12 }}>No trades recorded for this wallet.</div>
      )}
    </div>
  )
}

export default function PlayersTab({ trades = [], humanCapital = [] }) {
  const [expanded, setExpanded] = useState(null)

  const hcMap = Object.fromEntries((humanCapital ?? []).map(hc => [hc.address, hc]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Player cards grid */}
      <div className="panel-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {WALLETS.map(w => {
          const hc = hcMap[w.address] ?? { ...w, tradeCount: 0, bs: null, ic: null, sr: null, ias: null, ns: null }
          return (
            <div key={w.address}>
              <TraderCard trader={hc} />
              <button
                onClick={() => setExpanded(expanded === w.address ? null : w.address)}
                style={{
                  width: '100%', marginTop: 4,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  color: 'var(--fg2)', borderRadius: 4, padding: '4px 0', cursor: 'pointer', fontSize: 11,
                }}
              >
                {expanded === w.address ? '▲ Hide trades' : '▼ Show trades'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Expanded trade history */}
      {expanded && (
        <div className="card">
          <div className="card-title">
            Trade History — {WALLETS.find(w => w.address === expanded)?.name ?? expanded}
            <span style={{ marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg2)' }}>
              {truncateAddress(expanded)}
            </span>
          </div>
          <TraderDetail
            trader={WALLETS.find(w => w.address === expanded)}
            trades={trades}
          />
        </div>
      )}

      {/* Full 6-lens KPI table */}
      <div className="card">
        <div className="card-title">Human Capital KPI Table — All Traders</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Trader</th>
              <th>Group</th>
              <th>Trades</th>
              <th>Brier Score</th>
              <th>IC</th>
              <th>IAS</th>
              <th>Noise Sens.</th>
              <th>Last Trade (JST)</th>
            </tr>
          </thead>
          <tbody>
            {WALLETS.map(w => {
              const hc = hcMap[w.address] ?? {}
              return (
                <tr key={w.address}>
                  <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{w.name}</td>
                  <td style={{ color: 'var(--fg2)' }}>{w.group}</td>
                  <td>{hc.tradeCount ?? 0}</td>
                  <td style={{ color: hc.bs != null ? (hc.bs < 0.2 ? 'var(--green)' : hc.bs < 0.35 ? 'var(--amber)' : 'var(--red)') : 'var(--fg2)' }}>
                    {hc.bs != null ? hc.bs.toFixed(3) : '—'}
                  </td>
                  <td style={{ color: hc.ic != null ? (hc.ic > 0 ? 'var(--green)' : 'var(--red)') : 'var(--fg2)' }}>
                    {hc.ic != null ? hc.ic.toFixed(3) : '—'}
                  </td>
                  <td>{hc.ias != null ? `${(hc.ias*100).toFixed(1)}%` : '—'}</td>
                  <td>{hc.ns != null ? hc.ns.toFixed(3) : '—'}</td>
                  <td style={{ color: 'var(--fg2)' }}>{hc.lastTrade ? toJSTShort(hc.lastTrade) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
