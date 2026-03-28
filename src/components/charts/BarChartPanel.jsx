import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill ?? 'var(--accent)', fontSize: 12, fontFamily: 'var(--mono)' }}>
          {p.name ?? p.dataKey}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}
        </div>
      ))}
    </div>
  )
}

/**
 * @param {Array}  data    — [{ label, value, ... }]
 * @param {string} xKey   — key for x-axis
 * @param {string} yKey   — key for bar values
 * @param {string} color  — bar fill
 * @param {string} title
 * @param {number} height
 * @param {boolean} colorBySign — green for positive, red for negative
 */
export default function BarChartPanel({
  data = [],
  xKey = 'label',
  yKey = 'value',
  color = 'var(--accent)',
  title,
  height = 180,
  colorBySign = false,
  referenceY,
}) {
  if (!data.length) {
    return (
      <div className="card">
        {title && <div className="card-title">{title}</div>}
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg2)', fontSize: 12 }}>No data</div>
      </div>
    )
  }

  return (
    <div className="card">
      {title && <div className="card-title">{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--fg2)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--fg2)' }} width={40} />
          <Tooltip content={<CustomTooltip />} />
          {referenceY !== undefined && (
            <ReferenceLine y={referenceY} stroke="var(--fg2)" strokeDasharray="3 3" />
          )}
          <Bar dataKey={yKey} radius={[3, 3, 0, 0]}>
            {colorBySign
              ? data.map((entry, i) => (
                  <Cell key={i} fill={(entry[yKey] ?? 0) >= 0 ? 'var(--green)' : 'var(--red)'} />
                ))
              : <Cell fill={color} />
            }
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
