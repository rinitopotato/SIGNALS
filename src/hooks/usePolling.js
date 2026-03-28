import { useState, useCallback, useEffect } from 'react'

/**
 * Generic polling hook.
 * @param {Function} fetchFn  — async function that returns data
 * @param {number}   intervalMs — polling interval in milliseconds
 * @param {Array}    deps      — additional deps that trigger a refetch when changed
 */
export default function usePolling(fetchFn, intervalMs, deps = []) {
  const [data,          setData]          = useState(null)
  const [error,         setError]         = useState(null)
  const [lastFetchedAt, setLastFetchedAt] = useState(null)
  const [isLoading,     setIsLoading]     = useState(true)

  const execute = useCallback(async () => {
    try {
      const result = await fetchFn()
      setData(result)
      setLastFetchedAt(Date.now())
      setError(null)
    } catch (e) {
      console.error('usePolling error:', e)
      setError(e)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    execute()
    const id = setInterval(execute, intervalMs)
    return () => clearInterval(id)
  }, [execute, intervalMs])

  return { data, error, lastFetchedAt, isLoading, refetch: execute }
}
