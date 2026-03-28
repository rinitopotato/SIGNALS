import { SIGNALS_MARKETS, POLYMARKET_EVENTS } from '../../constants/markets.js'

// Unified list of all selectable markets
// "all" = show everything across all markets
export const ALL_MARKETS = [
  { id: 'all',       label: 'All Markets',       type: 'all' },
  ...SIGNALS_MARKETS.map(m => ({
    id:    m.id,
    label: m.nameEn,
    nameJa: m.name,
    type:  'signals',
    address: m.address,
    meta:  m,
  })),
  ...POLYMARKET_EVENTS.map(e => ({
    id:    e.slug,
    label: e.label,
    type:  'polymarket',
    slug:  e.slug,
    meta:  e,
  })),
]

export const SIGNALS_ONLY = [
  { id: 'all', label: 'All', type: 'all' },
  ...SIGNALS_MARKETS.map(m => ({
    id:    m.id,
    label: m.nameEn,
    nameJa: m.name,
    type:  'signals',
    address: m.address,
    meta:  m,
  })),
]

export default function MarketSelector({ selected, onChange, markets = SIGNALS_ONLY }) {
  return (
    <div className="market-selector">
      {markets.map(m => (
        <button
          key={m.id}
          className={`market-selector-btn${selected === m.id ? ' active' : ''}`}
          onClick={() => onChange(m.id)}
          title={m.nameJa ?? m.label}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
