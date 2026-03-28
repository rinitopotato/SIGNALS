import { fetchJSON } from './utils.js'
import { WIKI_BASE } from '../constants/endpoints.js'

// ── Wikipedia pageviews ────────────────────────────────────────────
// Returns daily view counts for a given article over the past N days.
export async function fetchWikiPageviews(article, daysBack = 30) {
  const end   = new Date()
  const start = new Date(Date.now() - daysBack * 86400_000)
  const fmt   = d => d.toISOString().slice(0,10).replace(/-/g,'')
  const url   = `${WIKI_BASE}/pageviews/per-article/ja.wikipedia/all-access/all-agents/${encodeURIComponent(article)}/daily/${fmt(start)}/${fmt(end)}`
  try {
    const data = await fetchJSON(url)
    return (data.items ?? []).map(item => ({
      date:  item.timestamp?.slice(0,8) ?? '',
      views: Number(item.views ?? 0),
    }))
  } catch (err) {
    console.warn(`Wiki pageview fetch failed for "${article}":`, err)
    return []
  }
}

export async function fetchMultipleWikiPageviews(articles, daysBack = 30) {
  const results = await Promise.allSettled(
    articles.map(a => fetchWikiPageviews(a, daysBack))
  )
  return Object.fromEntries(
    articles.map((a, i) => [
      a,
      results[i].status === 'fulfilled' ? results[i].value : [],
    ])
  )
}

// ── Synthetic Google Trends proxy ──────────────────────────────────
// Google Trends has no public browser-accessible API.
// We return a synthetic smooth random walk seeded by day + keyword.
// The `isSynthetic: true` flag must be displayed in the UI.
export function fetchTrendsProxy(keywords, daysBack = 30) {
  const series = {}
  for (const kw of keywords) {
    const seed   = cyrb53(kw + new Date().toISOString().slice(0,10))
    const values = syntheticTrends(seed, daysBack)
    series[kw]   = values
  }
  return { isSynthetic: true, series }
}

// ── Composite attention proxy A_t ─────────────────────────────────
// Returns z-score normalised average of wiki views + synthetic trends,
// producing a series of { date, At } values.
export function buildAttentionProxy(wikiData, trendsData) {
  // Collect all unique dates
  const allDates = new Set()
  for (const items of Object.values(wikiData)) {
    items.forEach(d => allDates.add(d.date))
  }
  const dates = [...allDates].sort()
  if (!dates.length) return []

  // Average daily wiki views across articles
  const wikiByDate = {}
  for (const items of Object.values(wikiData)) {
    for (const { date, views } of items) {
      wikiByDate[date] = (wikiByDate[date] ?? 0) + views
    }
  }

  // Average synthetic trends
  const trendsArr = Object.values(trendsData?.series ?? {})
  const trendByIdx = {}
  for (const series of trendsArr) {
    series.forEach((v, i) => {
      trendByIdx[i] = (trendByIdx[i] ?? 0) + v / trendsArr.length
    })
  }

  const wikiRaw  = dates.map(d => wikiByDate[d] ?? 0)
  const trendsRaw = dates.map((_, i) => trendByIdx[i] ?? 50)

  const wikiZ   = zscore(wikiRaw)
  const trendsZ = zscore(trendsRaw)

  return dates.map((date, i) => ({
    date,
    At: (wikiZ[i] + trendsZ[i]) / 2,
    wikiViews: wikiRaw[i],
    trendsVal: trendsRaw[i],
  }))
}

// ── Helpers ────────────────────────────────────────────────────────
function zscore(arr) {
  const mu  = arr.reduce((a,b) => a+b, 0) / (arr.length || 1)
  const std = Math.sqrt(arr.reduce((a,b) => a + (b-mu)**2, 0) / (arr.length || 1))
  return arr.map(v => std > 0 ? (v - mu) / std : 0)
}

// Seeded pseudo-random smooth walk (no external lib needed)
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

function syntheticTrends(seed, n) {
  let s = seed % 1000
  const out = []
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const noise = ((s >>> 0) / 0xffffffff - 0.5) * 20
    const prev  = out[i - 1] ?? 50
    out.push(Math.min(100, Math.max(0, prev + noise)))
  }
  return out
}
