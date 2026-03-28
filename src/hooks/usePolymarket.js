import { useCallback } from 'react'
import usePolling from './usePolling.js'
import { fetchGammaEvents, fetchEventHistories } from '../api/polymarket.js'
import { POLYMARKET_EVENTS } from '../constants/markets.js'
import { POLL_INTERVALS } from '../constants/endpoints.js'

export default function usePolymarket() {
  const slugs = POLYMARKET_EVENTS.map(e => e.slug)

  const fetchAll = useCallback(async () => {
    // 1. Fetch Gamma event metadata (incl. conditionIds)
    const events = await fetchGammaEvents(slugs)

    // 2. For each event, fetch CLOB price histories for all outcome markets
    const eventsWithHistory = await Promise.allSettled(
      events.map(ev => (ev.error ? Promise.resolve(ev) : fetchEventHistories(ev)))
    )

    return eventsWithHistory.map(r => r.status === 'fulfilled' ? r.value : null)
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
