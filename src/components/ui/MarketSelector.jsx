export default function MarketSelector({ markets, selectedId, onChange, label = 'Market' }) {
  return (
    <div className="market-selector">
      <span className="market-selector__label">{label}</span>
      <div className="market-selector__pills">
        {markets.map(m => (
          <button
            key={m.id ?? m.slug ?? m.label}
            className={`market-pill${selectedId === (m.id ?? m.slug) ? ' active' : ''}`}
            onClick={() => onChange(m.id ?? m.slug)}
          >
            {m.name && <span className="market-pill__jp">{m.name}</span>}
            <span className="market-pill__en">{m.nameEn ?? m.label ?? m.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
