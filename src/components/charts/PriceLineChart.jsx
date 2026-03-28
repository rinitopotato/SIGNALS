import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { toJSTShort, toJST, formatPct } from '../../utils/formatters.js'

const COLORS = ['#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#60a5fa']

function CustomTooltip({ active, payload, label, isTimestamp }) {
  if (!active || !payload?.length) return null
  const labelStr = isTimestamp ? toJST(label) : String(label)
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--fg2)', marginBottom: 4 }}>{labelStr}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 12, fontFamily: 'var(--mono)' }}>
          {p.name}: {typeof p.value === 'number' && Math.abs(p.value) <= 1 ? `${(p.value * 100).toFixed(2)}%` : String(p.value?.toFixed?.(4) ?? p.value)}
        </div>
      ))}
    </div>
  )
}

/**
 * PriceLineChart
 * @param {Array}  data    — [{ [xKey], [seriesKey]: value, ... }]
 * @param {Array}  lines   — [{ key, label, color }] — defaults to single 'price' key
 * @param {string} title   — panel title
 * @param {number} height
 * @param {string} xKey    — data key for X axis (default: 'timestamp', formatted as JST)
 */
export default function PriceLineChart({ data = [], lines, title, height = 200, xKey = 'timestamp' }) {
  if (!data.length) {
    return (
      <div className="card">
        {title && <div className="card-title">{title}</div>}
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg2)', fontSize: 12 }}>
          No data
        </div>
      </div>
    )
  }

  const seriesLines = lines ?? [{ key: 'price', label: 'Price', color: COLORS[0] }]
  const isTimestamp = xKey === 'timestamp'

  return (
    <div className="card">
      {title && <div className="card-title">{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey={xKey}
            tickFormatter={isTimestamp ? toJSTShort : v => String(v)}
            tick={{ fontSize: 10, fill: 'var(--fg2)' }}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 10, fill: 'var(--fg2)' }}
            domain={[0, 1]}
            width={36}
          />
          <Tooltip content={<CustomTooltip isTimestamp={isTimestamp} />} />
          {seriesLines.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {seriesLines.map((l, i) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label ?? l.key}
              stroke={l.color ?? COLORS[i % COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
