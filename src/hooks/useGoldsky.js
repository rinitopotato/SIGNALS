import { useCallback } from 'react'
import usePolling from './usePolling.js'
import { fetchTraderActivity, fetchMarketSnapshots } from '../api/goldsky.js'
import { WALLET_ADDRESSES } from '../constants/wallets.js'
import { SIGNALS_MARKETS } from '../constants/markets.js'
import { POLL_INTERVALS } from '../constants/endpoints.js'

export default function useGoldsky() {
  const marketAddresses = SIGNALS_MARKETS.map(m => m.address.toLowerCase())

  const fetchAll = useCallback(async () => {
    const [trades, snapshots] = await Promise.all([
      fetchTraderActivity(WALLET_ADDRESSES),
      fetchMarketSnapshots(marketAddresses),
    ])
    return { trades, snapshots }
  }, [])

  const { data, error, lastFetchedAt, isLoading, refetch } =
    usePolling(fetchAll, POLL_INTERVALS.goldsky)

  return {
    trades:        data?.trades       ?? [],
    snapshots:     data?.snapshots    ?? [],
    lastFetchedAt,
    isLoading,
    error,
    refetch,
  }
}
