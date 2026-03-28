import { fetchJSON } from './utils.js'
import { GAMMA_BASE, CLOB_BASE } from '../constants/endpoints.js'

// ── Gamma — event metadata ─────────────────────────────────────────
// The /events/slug/{slug} endpoint may return either an object OR an array.
// We normalise to a single event object in both cases (same as original approach).
export async function fetchGammaEvents(slugs) {
  const results = await Promise.allSettled(
    slugs.map(slug =>
      fetchJSON(`${GAMMA_BASE}/events/slug/${encodeURIComponent(slug)}`)
    )
  )
  return results.map((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[PM] Gamma fetch failed for ${slugs[i]}:`, r.reason)
      return { slug: slugs[i], error: true, markets: [] }
    }
    // Handle both array and object responses
    const raw   = r.value ?? {}
    const event = Array.isArray(raw) ? (raw[0] ?? {}) : raw
    if (!event.title && !event.markets) {
      console.warn(`[PM] No event data for slug ${slugs[i]}:`, raw)
      return { slug: slugs[i], error: true, markets: [] }
    }
    console.log(`[PM] Got event "${event.title}" with ${event.markets?.length ?? 0} markets`)
    return normaliseGammaEvent(slugs[i], event)
  })
}

// ── Gamma — full market detail (needed for clobTokenIds) ──────────
async function fetchFullMarket(marketId) {
  return fetchJSON(`${GAMMA_BASE}/markets/${encodeURIComponent(marketId)}`)
}

function parseClobTokenIds(raw) {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try { return JSON.parse(raw).map(String) } catch {}
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

function normaliseGammaEvent(slug, event) {
  const markets = (event.markets ?? []).map(m => ({
    id:            m.id ?? '',
    question:      m.question ?? m.title ?? '',
    outcomes:      Array.isArray(m.outcomes) ? m.outcomes : ['Yes', 'No'],
    clobTokenIds:  parseClobTokenIds(m.clobTokenIds),
    outcomePrices: (m.outcomePrices ?? []).map(p => parseFloat(p) || 0),
    volume:        parseFloat(m.volume ?? 0),
    liquidity:     parseFloat(m.liquidity ?? 0),
  }))
  return {
    slug,
    title:   event.title ?? slug,
    markets,
    endDate: event.endDate ?? null,
  }
}

// ── Fetch full market detail and enrich with clobTokenIds ──────────
export async function enrichEventMarkets(gammaEvent) {
  if (gammaEvent.error) return gammaEvent

  const enriched = await Promise.allSettled(
    gammaEvent.markets.map(async m => {
      // If we already have token IDs from the event-level stub, use them
      if (m.clobTokenIds?.length) return m
      // Otherwise fetch full market data
      if (!m.id) {
        console.warn('[PM] Market stub has no id:', m)
        return m
      }
      try {
        const full = await fetchFullMarket(m.id)
        const tokenIds = parseClobTokenIds(full.clobTokenIds)
        console.log(`[PM] Market "${m.question?.slice(0,40)}": ${tokenIds.length} token IDs`)
        return {
          ...m,
          clobTokenIds:  tokenIds,
          outcomePrices: (full.outcomePrices ?? m.outcomePrices ?? []).map(p => parseFloat(p) || 0),
          volume:        parseFloat(full.volume   ?? m.volume    ?? 0),
          liquidity:     parseFloat(full.liquidity ?? m.liquidity ?? 0),
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
      r.status === 'fulfilled' ? r.value : gammaEvent.markets[i]
    ),
  }
}

// ── CLOB — price history per token ────────────────────────────────
// tokenId is a numeric string from clobTokenIds (not a condition hash).
export async function fetchCLOBHistory(tokenId, interval = '1h', fidelity = 60) {
  if (!tokenId) return []
  try {
    const url = `${CLOB_BASE}/prices-history?market=${encodeURIComponent(tokenId)}&interval=${interval}&fidelity=${fidelity}`
    const data = await fetchJSON(url)
    const history = data.history ?? []
    console.log(`[PM] CLOB token ${tokenId}: ${history.length} price points`)
    return history.map(p => ({
      t:     Number(p.t),
      price: parseFloat(p.p),
    }))
  } catch (err) {
    console.warn(`[PM] CLOB history fetch failed for token ${tokenId}:`, err)
    return []
  }
}

// ── CLOB — current order book ─────────────────────────────────────
export async function fetchCLOBBook(tokenId) {
  if (!tokenId) return null
  try {
    const data = await fetchJSON(`${CLOB_BASE}/book?token_id=${encodeURIComponent(tokenId)}`)
    const bestBid = parseFloat(data.bids?.[0]?.price ?? 0)
    const bestAsk = parseFloat(data.asks?.[0]?.price ?? 1)
    const bidVol  = parseFloat(data.bids?.[0]?.size  ?? 0)
    const askVol  = parseFloat(data.asks?.[0]?.size  ?? 0)
    const mid     = (bestBid + bestAsk) / 2
    const denom   = bidVol + askVol
    const micro   = denom > 0 ? (bidVol * bestAsk + askVol * bestBid) / denom : mid
    const imbalance = denom > 0 ? (bidVol - askVol) / denom : 0
    return { bestBid, bestAsk, bidVol, askVol, mid, micro, imbalance }
  } catch (err) {
    console.warn(`[PM] CLOB book fetch failed for token ${tokenId}:`, err)
    return null
  }
}

// ── Fetch price histories for all tokens in an event's markets ────
export async function fetchEventHistories(gammaEvent) {
  if (gammaEvent.error) return gammaEvent

  const marketsWithHistory = await Promise.allSettled(
    gammaEvent.markets.map(async m => {
      const tokenIds = m.clobTokenIds ?? []
      if (!tokenIds.length) {
        console.warn(`[PM] No token IDs for market "${m.question?.slice(0,40)}"`)
        return { ...m, tokenHistories: [] }
      }

      const histories = await Promise.allSettled(
        tokenIds.map(tid => fetchCLOBHistory(tid))
      )
      const tokenHistories = tokenIds.map((tid, i) => ({
        tokenId: tid,
        outcome: m.outcomes?.[i] ?? `Token ${i}`,
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
