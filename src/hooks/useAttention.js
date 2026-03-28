import { useCallback } from 'react'
import usePolling from './usePolling.js'
import { fetchMultipleWikiPageviews, fetchTrendsProxy, buildAttentionProxy } from '../api/attention.js'
import { WIKI_ARTICLES } from '../constants/markets.js'
import { POLL_INTERVALS } from '../constants/endpoints.js'

const ALL_WIKI_ARTICLES = [
  ...WIKI_ARTICLES.sendai,
  ...WIKI_ARTICLES.boj,
]

const TREND_KEYWORDS = [
  '仙台 旅行', '仙台 食べ物', '仙台 祭り', '仙台 桜',
  'ドラゴンボール', 'ガンダム', '山口百恵', '松田聖子',
]

export default function useAttention() {
  const fetchAll = useCallback(async () => {
    const [wikiData, trendsData] = await Promise.all([
      fetchMultipleWikiPageviews(ALL_WIKI_ARTICLES, 30),
      Promise.resolve(fetchTrendsProxy(TREND_KEYWORDS, 30)),
    ])
    const attentionProxy = buildAttentionProxy(wikiData, trendsData)
    return { wikiData, trendsData, attentionProxy }
  }, [])

  const { data, error, lastFetchedAt, isLoading, refetch } =
    usePolling(fetchAll, POLL_INTERVALS.attention)

  return {
    wikiData:        data?.wikiData        ?? {},
    trendsData:      data?.trendsData      ?? { isSynthetic: true, series: {} },
    attentionProxy:  data?.attentionProxy  ?? [],
    lastFetchedAt,
    isLoading,
    error,
    refetch,
  }
}
