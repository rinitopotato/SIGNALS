import { postGraphQL } from './utils.js'
import { GOLDSKY_URL } from '../constants/endpoints.js'

// ── Per-trader query (notebook-confirmed schema) ───────────────────
// Uses singular `trader(id: ...)` — the plural `trades(where:...)` entity doesn't exist.
const TRADER_QUERY = `
  query TraderTrades($id: String!, $first: Int!) {
    trader(id: $id) {
      trades(
        first: $first
        orderBy: timestamp
        orderDirection: desc
      ) {
        type
        amount
        timestamp
        market {
          id
          title
        }
      }
    }
  }
`

// ── Per-market snapshot query (notebook-confirmed schema) ──────────
// Uses singular `market(id: ...)` — the plural `markets(where:...)` entity doesn't exist.
// priceSnapshots live under outcomeTokens, field is `unweightedPrice` (not `price`).
const MARKET_QUERY = `
  query MarketSnapshots($id: String!, $first: Int!) {
    market(id: $id) {
      title
      outcomeTokens(first: 10) {
        label
        priceSnapshots(
          first: $first
          orderBy: timestamp
          orderDirection: desc
        ) {
          timestamp
          unweightedPrice
        }
      }
    }
  }
`

// ── Trader activity ────────────────────────────────────────────────
// Queries each wallet individually and merges results.
export async function fetchTraderActivity(walletAddresses, limit = 100) {
  const results = await Promise.allSettled(
    walletAddresses.map(addr =>
      postGraphQL(GOLDSKY_URL, TRADER_QUERY, { id: addr.toLowerCase(), first: limit })
    )
  )

  const trades = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`fetchTraderActivity failed for ${walletAddresses[i]}:`, r.reason)
      return
    }
    const raw = r.value?.trader?.trades
    if (!Array.isArray(raw)) return
    const addr = walletAddresses[i].toLowerCase()
    raw.forEach((t, j) => {
      trades.push({
        id:           `${addr}-${j}`,
        trader:       addr,
        market:       (t.market?.id ?? '').toLowerCase(),
        marketTitle:  t.market?.title ?? '',
        outcomeIndex: 0,  // not returned by subgraph — use 0 as default
        amount:       parseFloat(t.amount ?? '0') / 1e18,
        timestamp:    Number(t.timestamp),
        type:         (t.type ?? 'Buy').toLowerCase(),
        txHash:       '',
      })
    })
  })

  return trades
}

// ── Market snapshots ───────────────────────────────────────────────
// Queries each market individually and merges into flat snapshot array.
export async function fetchMarketSnapshots(marketAddresses, limit = 100) {
  const results = await Promise.allSettled(
    marketAddresses.map(addr =>
      postGraphQL(GOLDSKY_URL, MARKET_QUERY, { id: addr.toLowerCase(), first: limit })
    )
  )

  const snapshots = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`fetchMarketSnapshots failed for ${marketAddresses[i]}:`, r.reason)
      return
    }
    const market = r.value?.market
    if (!market) return
    const marketAddr = marketAddresses[i].toLowerCase()
    ;(market.outcomeTokens ?? []).forEach((ot, outcomeIdx) => {
      ;(ot.priceSnapshots ?? []).forEach(snap => {
        snapshots.push({
          market:       marketAddr,
          outcomeIndex: outcomeIdx,
          label:        ot.label ?? `Outcome ${outcomeIdx}`,
          price:        parseFloat(snap.unweightedPrice ?? '0') / 1e18,
          timestamp:    Number(snap.timestamp),
        })
      })
    })
  })

  return snapshots
}
