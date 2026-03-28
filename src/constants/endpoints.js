export const GOLDSKY_URL =
  'https://api.goldsky.com/api/public/project_cmiy1lygiilhr01t0fjo6erf5/subgraphs/signals-market-prod/v1.0.0/gn'

export const GAMMA_BASE = 'https://gamma-api.polymarket.com'
export const CLOB_BASE  = 'https://clob.polymarket.com'
export const WIKI_BASE  = 'https://wikimedia.org/api/rest_v1/metrics/pageviews'

export const POLL_INTERVALS = {
  goldsky:     120_000,  // 2 minutes
  polymarket:  300_000,  // 5 minutes
  attention: 3_600_000,  // 1 hour
}

// stale warning triggers at 2× poll interval
export const STALE_MULTIPLIER = 2
