import { fetchJSON } from './utils.js'
import { GAMMA_BASE, CLOB_BASE } from '../constants/endpoints.js'

// ── JSON-array parsers ─────────────────────────────────────────────
// The Gamma API sometimes returns arrays as JSON-encoded strings.
// e.g. clobTokenIds = '["123","456"]'  outcomePrices = '["0.7","0.3"]'
function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return JSON.parse(raw) } catch {}
  }
  return []
}

function parseClobTokenIds(raw) {
  return parseJsonArray(raw).map(String)
}

function parseOutcomePrices(raw) {
  return parseJsonArray(raw).map(p => parseFloat(p) || 0)
}

function parseOutcomes(raw) {
  const arr = parseJsonArray(raw)
  return arr.length ? arr : null  // null = use fallback
}

// ── Gamma — full market by id ──────────────────────────────────────
async function fetchFullMarket(marketId) {
  return fetchJSON(`${GAMMA_BASE}/markets/${marketId}`)
}

// ── Normalise a single stub (from event endpoint) ──────────────────
function normaliseStub(m) {
  return {
    id:            m.id          ?? '',
    question:      m.question    ?? m.title ?? '',
    outcomes:      parseOutcomes(m.outcomes) ?? ['Yes', 'No'],
    clobTokenIds:  parseClobTokenIds(m.clobTokenIds),
    outcomePrices: parseOutcomePrices(m.outcomePrices),
    volume:        parseFloat(m.volume    ?? 0) || 0,
    liquidity:     parseFloat(m.liquidity ?? 0) || 0,
  }
}

// ── Gamma — fetch event list ───────────────────────────────────────
// GET /events/slug/{slug}  — may return an object OR an array[0]
export async function fetchGammaEvents(slugs) {
  const results = await Promise.allSettled(
    slugs.map(slug =>
      fetchJSON(`${GAMMA_BASE}/events/slug/${encodeURIComponent(slug)}`)
    )
  )

  return results.map((r, i) => {
    const slug = slugs[i]

    if (r.status === 'rejected') {
      console.warn(`[PM] Gamma event fetch failed for "${slug}":`, r.reason)
      return { slug, error: true, markets: [] }
    }

    // Some slugs return an array, some return an object
    const raw   = r.value ?? {}
    const event = Array.isArray(raw) ? (raw[0] ?? {}) : raw

    if (!event.title && !Array.isArray(event.markets)) {
      console.warn(`[PM] Empty event response for "${slug}":`, raw)
      return { slug, error: true, markets: [] }
    }

    const markets = (event.markets ?? []).map(normaliseStub)
    console.log(`[PM] "${event.title}" — ${markets.length} markets`)

    return {
      slug,
      title:   event.title ?? slug,
      markets,
      endDate: event.endDate ?? null,
    }
  })
}

// ── Enrich event: fetch full market data for top N by volume ────────
// The full market object is authoritative for clobTokenIds and prices.
// Python counterpart: for stub in event['markets']: full = GET /markets/{id}
export async function enrichEventMarkets(gammaEvent, maxMarkets = 5) {
  if (gammaEvent.error) return gammaEvent

  // Sort by volume descending, keep top N
  const topMarkets = [...gammaEvent.markets]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, maxMarkets)

  console.log(`[PM] Enriching ${topMarkets.length}/${gammaEvent.markets.length} markets for "${gammaEvent.title}"`)

  const enriched = await Promise.allSettled(
    topMarkets.map(async m => {
      if (!m.id) return m
      try {
        const full = await fetchFullMarket(m.id)
        const tokenIds = parseClobTokenIds(full.clobTokenIds)
        console.log(`[PM]   "${m.question?.slice(0, 45)}" → ${tokenIds.length} token IDs`)
        return {
          ...m,
          clobTokenIds:  tokenIds.length ? tokenIds : m.clobTokenIds,
          outcomePrices: parseOutcomePrices(full.outcomePrices).length
            ? parseOutcomePrices(full.outcomePrices)
            : m.outcomePrices,
          outcomes:      parseOutcomes(full.outcomes) ?? m.outcomes,
          volume:        parseFloat(full.volume    ?? m.volume    ?? 0) || 0,
          liquidity:     parseFloat(full.liquidity ?? m.liquidity ?? 0) || 0,
        }
      } catch (err) {
        console.warn(`[PM] fetchFullMarket failed for id ${m.id}:`, err)
        return m
      }
    })
  )

  return {
    ...gammaEvent,
    markets: enriched.map((r, i) =>
      r.status === 'fulfilled' ? r.value : topMarkets[i]
    ),
  }
}

// ── CLOB — price history for one token ────────────────────────────
// Matches Python: GET /prices-history?market={tokenId}&interval=1d&fidelity=60
export async function fetchCLOBHistory(tokenId, interval = '1d', fidelity = 60) {
  if (!tokenId) return []
  try {
    const url = `${CLOB_BASE}/prices-history?market=${encodeURIComponent(tokenId)}&interval=${interval}&fidelity=${fidelity}`
    const data = await fetchJSON(url)
    const history = data.history ?? []
    console.log(`[PM] CLOB ${tokenId.slice(0, 8)}…: ${history.length} pts`)
    return history.map(p => ({
      t:     Number(p.t),
      price: parseFloat(p.p),
    }))
  } catch (err) {
    console.warn(`[PM] CLOB history failed for token ${String(tokenId).slice(0, 8)}…:`, err)
    return []
  }
}

// ── Fetch price histories for top 2 tokens per market ─────────────
// Matches Python _market_to_df: token_ids[0]=Yes, token_ids[1]=No
export async function fetchEventHistories(gammaEvent) {
  if (gammaEvent.error) return gammaEvent

  const marketsWithHistory = await Promise.allSettled(
    gammaEvent.markets.map(async m => {
      const tokenIds = m.clobTokenIds.slice(0, 2)  // Yes + No only

      if (tokenIds.length < 1) {
        console.warn(`[PM] No token IDs for "${m.question?.slice(0, 45)}"`)
        return { ...m, tokenHistories: [] }
      }

      const histories = await Promise.allSettled(
        tokenIds.map(tid => fetchCLOBHistory(tid, '1d', 60))
      )

      const tokenHistories = tokenIds.map((tid, i) => ({
        tokenId: tid,
        outcome: m.outcomes?.[i] ?? (i === 0 ? 'Yes' : 'No'),
        history: histories[i].status === 'fulfilled' ? histories[i].value : [],
      }))

      return { ...m, tokenHistories }
    })
  )

  return {
    ...gammaEvent,
    markets: marketsWithHistory.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { ...gammaEvent.markets[i], tokenHistories: [] }
    ),
  }
}

// ── Fetch order book for primary market tokens (OBI, micro-price) ──
// Attaches .orderBook = { bestBid, bestAsk, mid, micro, imbalance } per market
export async function fetchEventOrderBooks(gammaEvent) {
  if (gammaEvent.error) return gammaEvent
  const updated = await Promise.allSettled(
    gammaEvent.markets.map(async m => {
      const tokenId = m.clobTokenIds?.[0]  // Yes-outcome token
      if (!tokenId) return { ...m, orderBook: null }
      try {
        const data = await fetchJSON(`${CLOB_BASE}/book?token_id=${encodeURIComponent(tokenId)}`)
        const bestBid = parseFloat(data.bids?.[0]?.price ?? 0)
        const bestAsk = parseFloat(data.asks?.[0]?.price ?? 1)
        const bidVol  = parseFloat(data.bids?.[0]?.size  ?? 0)
        const askVol  = parseFloat(data.asks?.[0]?.size  ?? 0)
        const denom   = bidVol + askVol
        const mid     = (bestBid + bestAsk) / 2
        const micro   = denom > 0 ? (bidVol * bestAsk + askVol * bestBid) / denom : mid
        const imbalance = denom > 0 ? (bidVol - askVol) / denom : 0
        console.log(`[PM] OB "${m.question?.slice(0,30)}": bid=${bestBid.toFixed(3)} ask=${bestAsk.toFixed(3)} OBI=${imbalance.toFixed(3)}`)
        return { ...m, orderBook: { bestBid, bestAsk, bidVol, askVol, mid, micro, imbalance } }
      } catch (err) {
        console.warn(`[PM] Order book failed for ${m.id}:`, err)
        return { ...m, orderBook: null }
      }
    })
  )
  return {
    ...gammaEvent,
    markets: updated.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { ...gammaEvent.markets[i], orderBook: null }
    ),
  }
}
