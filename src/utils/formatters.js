// ── Timestamp formatters (JST = UTC+9) ────────────────────────────
export function toJST(unixTs) {
  if (!unixTs) return '—'
  return new Date(unixTs * 1000).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + ' JST'
}

export function toJSTShort(unixTs) {
  if (!unixTs) return '—'
  return new Date(unixTs * 1000).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function toJSTDate(unixTs) {
  if (!unixTs) return '—'
  return new Date(unixTs * 1000).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

export function nowJST() {
  return new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + ' JST'
}

// ── Number formatters ──────────────────────────────────────────────
export function formatPct(value, decimals = 1) {
  if (value == null || isNaN(value)) return '—'
  return (value * 100).toFixed(decimals) + '%'
}

export function formatNum(value, decimals = 3) {
  if (value == null || isNaN(value)) return '—'
  return Number(value).toFixed(decimals)
}

export function formatCompact(value) {
  if (value == null || isNaN(value)) return '—'
  if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(1) + 'B'
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(1) + 'M'
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(1) + 'K'
  return String(Number(value).toFixed(2))
}

export function truncateAddress(addr) {
  if (!addr || addr.length < 10) return addr ?? '—'
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export function signedNum(value, decimals = 3) {
  if (value == null || isNaN(value)) return '—'
  const s = Number(value).toFixed(decimals)
  return value >= 0 ? '+' + s : s
}
