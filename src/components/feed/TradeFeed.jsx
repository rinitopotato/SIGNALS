import { useRef, useEffect, useState } from 'react'
import { WALLET_MAP } from '../../constants/wallets.js'
import { SIGNALS_MARKET_MAP } from '../../constants/markets.js'
import { toJSTShort, formatNum, truncateAddress } from '../../utils/formatters.js'

export default function TradeFeed({ trades = [], maxRows = 30 }) {
  const [flashSet, setFlashSet] = useState(new Set())
  const prevLenRef = useRef(0)

  useEffect(() => {
    const prevLen = prevLenRef.current
    if (trades.length > prevLen) {
      const newIds = trades.slice(0, trades.length - prevLen).map(t => t.id)
      setFlashSet(new Set(newIds))
      const timer = setTimeout(() => setFlashSet(new Set()), 800)
      prevLenRef.current = trades.length
      return () => clearTimeout(timer)
    }
    prevLenRef.current = trades.length
  }, [trades.length])

  const visible = trades.slice(0, maxRows)

  if (!visible.length) {
    return (
      <div className="trade-feed" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--fg2)', fontSize: 12, padding: 20 }}>Waiting for trades…</span>
      </div>
    )
  }

  return (
    <div className="trade-feed">
      {visible.map((t, i) => {
        const traderName = WALLET_MAP[t.trader] ?? truncateAddress(t.trader)
        const market     = SIGNALS_MARKET_MAP[t.market]
        const marketName = market?.name ?? t.market.slice(0, 8) + '…'
        const outcome    = market?.outcomeLabels?.[t.outcomeIndex] ?? `#${t.outcomeIndex}`
        const isBuy      = t.type === 'buy' || t.type === 'BUY'
        const flash      = flashSet.has(t.id)

        return (
          <div key={t.id ?? i} className={`trade-row${flash ? ' flash' : ''}`}>
            <span className="trade-time">{toJSTShort(t.timestamp)}</span>
            <span className="trade-name">{traderName}</span>
            <span className="trade-mkt">{marketName}</span>
            <span className="trade-outcome">{outcome}</span>
            <span className="trade-amt" style={{ color: isBuy ? 'var(--green)' : 'var(--red)' }}>
              {isBuy ? '+' : '-'}{formatNum(t.amount, 2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
