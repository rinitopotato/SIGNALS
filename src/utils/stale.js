// Staleness detection helpers

export function isStale(lastFetchedAt, pollIntervalMs, multiplier = 2) {
  if (!lastFetchedAt) return true
  return Date.now() - lastFetchedAt > pollIntervalMs * multiplier
}

// 'fresh' | 'warning' | 'stale' | 'dead'
export function staleSeverity(lastFetchedAt, pollIntervalMs) {
  if (!lastFetchedAt) return 'dead'
  const age = Date.now() - lastFetchedAt
  if (age < pollIntervalMs)              return 'fresh'
  if (age < pollIntervalMs * 2)         return 'warning'
  if (age < pollIntervalMs * 5)         return 'stale'
  return 'dead'
}

export function severityToColor(severity) {
  switch (severity) {
    case 'fresh':   return 'green'
    case 'warning': return 'amber'
    case 'stale':   return 'red'
    case 'dead':    return 'grey'
    default:        return 'grey'
  }
}
