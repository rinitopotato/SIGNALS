import { useCallback } from 'react'
import usePolling from './usePolling.js'
import { fetchMultipleWikiPageviews, fetchTrendsProxy, buildAttentionProxy } from '../api/attention.js'
import { WIKI_ARTICLES, TREND_KEYWORD_GROUPS } from '../constants/markets.js'
import { POLL_INTERVALS } from '../constants/endpoints.js'

const ALL_WIKI_ARTICLES = [
  ...WIKI_ARTICLES.sendai,
  ...WIKI_ARTICLES.boj,
  ...(WIKI_ARTICLES.showa ?? []),
]

const ALL_TREND_KEYWORDS = Object.values(TREND_KEYWORD_GROUPS).flatMap(g => g.keywords)

// Infer the last N calendar dates (YYYYMMDD) ending today
function inferDates(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10).replace(/-/g, '')
  })
}

// Returns { slope, status } for a values array
function trendStatus(values) {
  if (!values?.length) return 'Stable'
  const n = Math.min(5, values.length)
  const recent = values.slice(-n)
  const slope = recent[recent.length - 1] - recent[0]
  return slope > 2 ? 'Rising' : slope < -2 ? 'Falling' : 'Stable'
}

// Build per-market data with date-indexed series for charting
function buildPerMarketData(wikiData, trendsData) {
  const out = {}

  for (const [marketId, group] of Object.entries(TREND_KEYWORD_GROUPS)) {
    // -- Wikipedia series: sum pageviews across all articles per date --
    const articleSeries = group.wikiArticles.map(a => wikiData[a] ?? [])
    const allDates = [...new Set(articleSeries.flatMap(s => s.map(p => p.date)))].sort()
    const wikiByDate = {}
    for (const a of articleSeries) {
      for (const { date, views } of a) {
        wikiByDate[date] = (wikiByDate[date] ?? 0) + views
      }
    }
    const wikiSeries = allDates.map(date => ({ date, views: wikiByDate[date] ?? 0 }))

    // -- Keyword series with date-indexed trend values --
    const keywordSeries = group.keywords.map(kw => {
      const vals = trendsData.series?.[kw] ?? []
      const dates = inferDates(vals.length)
      const trendsSeries = vals.map((v, i) => ({ date: dates[i], value: v }))
      return {
        keyword: kw,
        values: vals,           // flat array (legacy / for avg/peak)
        trendsSeries,           // [{ date, value }] for charting
        status: trendStatus(vals),
      }
    })

    // -- Avg + peak from all keyword values --
    const allVals = keywordSeries.flatMap(k => k.values)
    const avg  = allVals.length ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length) : 0
    const peak = allVals.length ? Math.round(Math.max(...allVals)) : 0

    // -- Merged daily series for composite chart --
    // Use the primary keyword's (first) dates as the canonical date range
    const primaryDates = keywordSeries[0]?.trendsSeries.map(p => p.date) ?? []
    const maxWikiViews = Math.max(...Object.values(wikiByDate), 1)
    const mergedDaily = primaryDates.map(date => {
      const row = { date, displayDate: `${date.slice(4, 6)}/${date.slice(6, 8)}` }
      for (const k of keywordSeries) {
        const pt = k.trendsSeries.find(p => p.date === date)
        row[k.keyword] = pt?.value ?? null
      }
      row.wikiViews    = wikiByDate[date] ?? 0
      row.wikiNorm     = (row.wikiViews / maxWikiViews) * 100  // normalize wiki to 0–100 for dual-axis
      return row
    })

    out[marketId] = { wikiSeries, keywordSeries, avg, peak, mergedDaily }
  }

  return out
}

export default function useAttention() {
  const fetchAll = useCallback(async () => {
    const [wikiData, trendsData] = await Promise.all([
      fetchMultipleWikiPageviews(ALL_WIKI_ARTICLES, 30),
      Promise.resolve(fetchTrendsProxy(ALL_TREND_KEYWORDS, 30)),
    ])
    const attentionProxy = buildAttentionProxy(wikiData, trendsData)
    const perMarketData  = buildPerMarketData(wikiData, trendsData)
    return { wikiData, trendsData, attentionProxy, perMarketData }
  }, [])

  const { data, error, lastFetchedAt, isLoading, refetch } =
    usePolling(fetchAll, POLL_INTERVALS.attention)

  return {
    wikiData:       data?.wikiData       ?? {},
    trendsData:     data?.trendsData     ?? { isSynthetic: true, series: {} },
    attentionProxy: data?.attentionProxy ?? [],
    perMarketData:  data?.perMarketData  ?? {},
    lastFetchedAt,
    isLoading,
    error,
    refetch,
  }
}
