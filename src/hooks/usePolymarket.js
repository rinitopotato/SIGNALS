import { useCallback } from 'react'
import usePolling from './usePolling.js'
import { fetchGammaEvents, enrichEventMarkets, fetchEventHistories } from '../api/polymarket.js'
import { POLYMARKET_EVENTS } from '../constants/markets.js'
import { POLL_INTERVALS } from '../constants/endpoints.js'

export default function usePolymarket() {
  const slugs = POLYMARKET_EVENTS.map(e => e.slug)

  const fetchAll = useCallback(async () => {
    // 1. Fetch Gamma event metadata (returns markets with id + stub fields)
    const events = await fetchGammaEvents(slugs)

    // 2. Enrich each event's markets with full data including clobTokenIds
    const enriched = await Promise.allSettled(
      events.map(ev => enrichEventMarkets(ev))
    )
    const enrichedEvents = enriched.map((r, i) =>
      r.status === 'fulfilled' ? r.value : events[i]
    )

    // 3. Fetch CLOB price histories per token for each market
    const withHistory = await Promise.allSettled(
      enrichedEvents.map(ev => (ev.error ? Promise.resolve(ev) : fetchEventHistories(ev)))
    )

    return withHistory.map(r => r.status === 'fulfilled' ? r.value : null)
  }, [])

  const { data, error, lastFetchedAt, isLoading, refetch } =
    usePolling(fetchAll, POLL_INTERVALS.polymarket)

  return {
    events:        data ?? [],
    lastFetchedAt,
    isLoading,
    error,
    refetch,
  }
}
