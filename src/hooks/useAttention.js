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

// Returns { slope, status } for a series
function trendStatus(series) {
  if (!series?.length) return 'Stable'
  const n = Math.min(5, series.length)
  const recent = series.slice(-n)
  const slope = recent[recent.length - 1] - recent[0]
  return slope > 2 ? 'Rising' : slope < -2 ? 'Falling' : 'Stable'
}

// Build per-market wiki/trend data from global fetched data
function buildPerMarketData(wikiData, trendsData) {
  const out = {}
  for (const [marketId, group] of Object.entries(TREND_KEYWORD_GROUPS)) {
    // Wikipedia series: sum pageviews across all articles in this group per date
    const articleSeries = group.wikiArticles.map(a => wikiData[a] ?? [])
    const allDates = [...new Set(articleSeries.flatMap(s => s.map(p => p.date)))].sort()
    const wikiSeries = allDates.map(date => {
      const total = articleSeries.reduce((sum, s) => {
        const pt = s.find(p => p.date === date)
        return sum + (pt?.views ?? 0)
      }, 0)
      return { date, views: total }
    })

    // Trend keyword series from synthetic trends
    const keywordSeries = group.keywords.map(kw => ({
      keyword: kw,
      values: trendsData.series?.[kw] ?? [],
      status: trendStatus(trendsData.series?.[kw] ?? []),
    }))

    // Compute avg + peak from trends values
    const allTrendVals = keywordSeries.flatMap(k => k.values)
    const avg = allTrendVals.length ? Math.round(allTrendVals.reduce((a, b) => a + b, 0) / allTrendVals.length) : 0
    const peak = allTrendVals.length ? Math.round(Math.max(...allTrendVals)) : 0

    out[marketId] = { wikiSeries, keywordSeries, avg, peak }
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
    const perMarketData = buildPerMarketData(wikiData, trendsData)
    return { wikiData, trendsData, attentionProxy, perMarketData }
  }, [])

  const { data, error, lastFetchedAt, isLoading, refetch } =
    usePolling(fetchAll, POLL_INTERVALS.attention)

  return {
    wikiData:        data?.wikiData        ?? {},
    trendsData:      data?.trendsData      ?? { isSynthetic: true, series: {} },
    attentionProxy:  data?.attentionProxy  ?? [],
    perMarketData:   data?.perMarketData   ?? {},
    lastFetchedAt,
    isLoading,
    error,
    refetch,
  }
}
