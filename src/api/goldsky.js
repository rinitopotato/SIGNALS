import { postGraphQL } from './utils.js'
import { GOLDSKY_URL } from '../constants/endpoints.js'

// ── Schema introspection (run once to discover field names) ────────
const INTROSPECT_QUERY = `
  query {
    __schema {
      queryType { fields { name } }
    }
  }
`

export async function introspectSchema() {
  return postGraphQL(GOLDSKY_URL, INTROSPECT_QUERY)
}

// ── Trader activity ────────────────────────────────────────────────
// Fetches the most recent 500 trades across all tracked wallets.
// Field names are based on common SIGNALS subgraph conventions;
// adjust if the live schema differs.
const TRADES_QUERY = `
  query TraderActivity($wallets: [String!]!, $first: Int!) {
    trades(
      where: { trader_in: $wallets }
      orderBy: timestamp
      orderDirection: desc
      first: $first
    ) {
      id
      trader
      market
      outcomeIndex
      collateralAmount
      timestamp
      transactionHash
      type
    }
  }
`

// Fallback query using alternative field names sometimes seen in SIGNALS subgraphs
const TRADES_QUERY_ALT = `
  query TraderActivityAlt($wallets: [String!]!, $first: Int!) {
    trades(
      where: { user_in: $wallets }
      orderBy: timestamp
      orderDirection: desc
      first: $first
    ) {
      id
      user
      market
      outcomeIndex
      amount
      timestamp
      transactionHash
    }
  }
`

export async function fetchTraderActivity(walletAddresses, limit = 500) {
  try {
    const data = await postGraphQL(GOLDSKY_URL, TRADES_QUERY, {
      wallets: walletAddresses,
      first: limit,
    })
    if (data.trades) return normaliseTrades(data.trades)

    // try alternate field names
    const data2 = await postGraphQL(GOLDSKY_URL, TRADES_QUERY_ALT, {
      wallets: walletAddresses,
      first: limit,
    })
    if (data2.trades) return normaliseTrades(data2.trades, true)
    return []
  } catch (err) {
    console.warn('fetchTraderActivity error:', err)
    return []
  }
}

function normaliseTrades(raw, altSchema = false) {
  return raw.map(t => ({
    id:             t.id,
    trader:        (t.trader ?? t.user ?? '').toLowerCase(),
    market:        (t.market ?? '').toLowerCase(),
    outcomeIndex:   Number(t.outcomeIndex ?? 0),
    amount:         parseInt(t.collateralAmount ?? t.amount ?? '0') / 1e18,
    timestamp:      Number(t.timestamp),
    txHash:         t.transactionHash ?? '',
    type:           t.type ?? 'buy',
  }))
}

// ── Market snapshots ───────────────────────────────────────────────
// Fetches price snapshots for outcome tokens in the given markets.
const SNAPSHOTS_QUERY = `
  query MarketSnapshots($markets: [String!]!, $first: Int!) {
    priceSnapshots(
      where: { market_in: $markets }
      orderBy: timestamp
      orderDirection: desc
      first: $first
    ) {
      id
      market
      outcomeIndex
      price
      timestamp
    }
  }
`

const SNAPSHOTS_QUERY_ALT = `
  query MarketSnapshotsAlt($markets: [String!]!, $first: Int!) {
    marketSnapshots(
      where: { market_in: $markets }
      orderBy: timestamp
      orderDirection: desc
      first: $first
    ) {
      id
      market
      prices
      timestamp
    }
  }
`

const OUTCOME_TOKENS_QUERY = `
  query OutcomeTokens($markets: [String!]!) {
    markets(where: { id_in: $markets }) {
      id
      outcomeTokens {
        id
        outcomeIndex
        priceSnapshots(orderBy: timestamp, orderDirection: desc, first: 100) {
          id
          price
          timestamp
        }
      }
    }
  }
`

export async function fetchMarketSnapshots(marketAddresses, limit = 300) {
  try {
    // Try primary snapshot entity
    const data = await postGraphQL(GOLDSKY_URL, SNAPSHOTS_QUERY, {
      markets: marketAddresses,
      first: limit,
    })
    if (data.priceSnapshots?.length) return normaliseSnapshots(data.priceSnapshots)

    // Try alternate entity name
    const data2 = await postGraphQL(GOLDSKY_URL, SNAPSHOTS_QUERY_ALT, {
      markets: marketAddresses,
      first: limit,
    })
    if (data2.marketSnapshots?.length) return normaliseSnapshotsAlt(data2.marketSnapshots)

    // Try nested outcomeTokens structure
    const data3 = await postGraphQL(GOLDSKY_URL, OUTCOME_TOKENS_QUERY, {
      markets: marketAddresses,
    })
    if (data3.markets?.length) return normaliseFromOutcomeTokens(data3.markets)

    return []
  } catch (err) {
    console.warn('fetchMarketSnapshots error:', err)
    return []
  }
}

// Returns: [{ market, outcomeIndex, price, timestamp }]
function normaliseSnapshots(raw) {
  return raw.map(s => ({
    market:       (s.market ?? '').toLowerCase(),
    outcomeIndex:  Number(s.outcomeIndex ?? 0),
    price:         parseInt(s.price ?? '0') / 1e18,
    timestamp:     Number(s.timestamp),
  }))
}

function normaliseSnapshotsAlt(raw) {
  const out = []
  for (const snap of raw) {
    const prices = Array.isArray(snap.prices) ? snap.prices : JSON.parse(snap.prices ?? '[]')
    prices.forEach((p, i) => {
      out.push({
        market:       (snap.market ?? '').toLowerCase(),
        outcomeIndex:  i,
        price:         parseInt(p) / 1e18,
        timestamp:     Number(snap.timestamp),
      })
    })
  }
  return out
}

function normaliseFromOutcomeTokens(markets) {
  const out = []
  for (const m of markets) {
    for (const ot of (m.outcomeTokens ?? [])) {
      for (const snap of (ot.priceSnapshots ?? [])) {
        out.push({
          market:       m.id.toLowerCase(),
          outcomeIndex:  Number(ot.outcomeIndex ?? 0),
          price:         parseInt(snap.price ?? '0') / 1e18,
          timestamp:     Number(snap.timestamp),
        })
      }
    }
  }
  return out
}
