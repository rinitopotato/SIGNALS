export const GOLDSKY_URL =
  'https://api.goldsky.com/api/public/project_cmiy1lygiilhr01t0fjo6erf5/subgraphs/signals-market-prod/v1.0.0/gn'

// In dev (localhost) use Vite proxy to avoid CORS; in production use corsproxy.io
const isDev = import.meta.env.DEV
const CORS = 'https://corsproxy.io/?url='
export const GAMMA_BASE = isDev ? '/api/gamma' : `${CORS}https://gamma-api.polymarket.com`
export const CLOB_BASE  = isDev ? '/api/clob'  : `${CORS}https://clob.polymarket.com`
export const WIKI_BASE  = 'https://wikimedia.org/api/rest_v1/metrics/pageviews'

export const POLL_INTERVALS = {
  goldsky:     120_000,  // 2 minutes
  polymarket:  300_000,  // 5 minutes
  attention: 3_600_000,  // 1 hour
}

// stale warning triggers at 2× poll interval
export const STALE_MULTIPLIER = 2
