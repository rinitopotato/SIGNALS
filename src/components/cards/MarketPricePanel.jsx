import { useRef, useEffect, useState } from 'react'
import { toJSTShort } from '../../utils/formatters.js'

export default function MarketPricePanel({ market, prices = [], prevPrices = [], lastTs }) {
  const [flashMap, setFlashMap] = useState({})
  const prevRef = useRef(prevPrices)

  useEffect(() => {
    const newFlash = {}
    prices.forEach((p, i) => {
      if (prevRef.current[i] != null && Math.abs(p - prevRef.current[i]) > 0.0001) {
        newFlash[i] = true
      }
    })
    if (Object.keys(newFlash).length > 0) {
      setFlashMap(newFlash)
      const id = setTimeout(() => setFlashMap({}), 900)
      return () => clearTimeout(id)
    }
    prevRef.current = prices
  }, [prices])

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>{market.name}</div>
        {lastTs && (
          <span style={{ fontSize: 10, color: 'var(--fg2)', fontFamily: 'var(--mono)' }}>
            Updated {toJSTShort(lastTs)}
          </span>
        )}
      </div>
      <div className="market-price-grid">
        {market.outcomeLabels.map((label, i) => {
          const prob = prices[i] ?? 0
          const prev = prevPrices[i] ?? prob
          const delta = prob - prev
          const color = market.colors?.[i] ?? 'var(--accent)'
          return (
            <div key={i} className={`price-card${flashMap[i] ? ' flash' : ''}`}>
              <div className="price-value" style={{ color }}>
                {(prob * 100).toFixed(1)}%
              </div>
              <div className="price-label">{label}</div>
              {Math.abs(delta) > 0.0001 ? (
                <div className="price-delta" style={{ color: delta > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {delta > 0 ? '▲' : '▼'}{(Math.abs(delta) * 100).toFixed(2)}%
                </div>
              ) : (
                <div className="price-delta" style={{ color: 'var(--fg2)' }}>—</div>
              )}
              <div className="price-bar-track">
                <div
                  className="price-bar-fill"
                  style={{ width: `${prob * 100}%`, background: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
