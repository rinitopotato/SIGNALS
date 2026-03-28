import { fetchJSON } from './utils.js'
import { GAMMA_BASE, CLOB_BASE } from '../constants/endpoints.js'

// ── Gamma — event + market metadata ───────────────────────────────
export async function fetchGammaEvents(slugs) {
  const results = await Promise.allSettled(
    slugs.map(slug =>
      fetchJSON(`${GAMMA_BASE}/events?slug=${encodeURIComponent(slug)}`)
    )
  )
  return results.map((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`Gamma fetch failed for ${slugs[i]}:`, r.reason)
      return { slug: slugs[i], error: true, markets: [] }
    }
    const events = Array.isArray(r.value) ? r.value : [r.value]
    const event = events[0] ?? {}
    return normaliseGammaEvent(slug, event)
  })
}

function normaliseGammaEvent(slug, event) {
  const markets = (event.markets ?? []).map(m => ({
    conditionId:   m.conditionId ?? m.id ?? '',
    question:      m.question ?? m.title ?? '',
    outcomes:      m.outcomes ?? ['Yes','No'],
    outcomePrices: (m.outcomePrices ?? []).map(p => parseFloat(p) || 0),
    volume:        parseFloat(m.volume ?? 0),
    liquidity:     parseFloat(m.liquidity ?? 0),
    bestBid:       parseFloat(m.bestBid ?? 0),
    bestAsk:       parseFloat(m.bestAsk ?? 1),
  }))
  return {
    slug,
    title:    event.title ?? slug,
    markets,
    endDate:  event.endDate ?? null,
  }
}

// ── CLOB — price history ───────────────────────────────────────────
// interval options: '1m','5m','1h','6h','1d'
export async function fetchCLOBHistory(conditionId, interval = '1h', fidelity = 60) {
  if (!conditionId) return []
  try {
    const url = `${CLOB_BASE}/prices-history?market=${encodeURIComponent(conditionId)}&interval=${interval}&fidelity=${fidelity}`
    const data = await fetchJSON(url)
    return (data.history ?? []).map(p => ({
      t:   Number(p.t),
      price: parseFloat(p.p),
    }))
  } catch (err) {
    console.warn(`CLOB history fetch failed for ${conditionId}:`, err)
    return []
  }
}

// ── CLOB — current order book (mid-price & micro-price) ───────────
export async function fetchCLOBBook(conditionId) {
  if (!conditionId) return null
  try {
    const data = await fetchJSON(`${CLOB_BASE}/book?token_id=${encodeURIComponent(conditionId)}`)
    const bestBid = parseFloat(data.bids?.[0]?.price ?? 0)
    const bestAsk = parseFloat(data.asks?.[0]?.price ?? 1)
    const bidVol  = parseFloat(data.bids?.[0]?.size  ?? 0)
    const askVol  = parseFloat(data.asks?.[0]?.size  ?? 0)
    const mid    = (bestBid + bestAsk) / 2
    const denom  = bidVol + askVol
    const micro  = denom > 0 ? (bidVol * bestAsk + askVol * bestBid) / denom : mid
    const imbalance = denom > 0 ? (bidVol - askVol) / denom : 0
    return { bestBid, bestAsk, bidVol, askVol, mid, micro, imbalance }
  } catch (err) {
    console.warn(`CLOB book fetch failed for ${conditionId}:`, err)
    return null
  }
}

// ── Convenience: fetch all CLOB histories for an event's markets ──
export async function fetchEventHistories(gammaEvent) {
  const histories = await Promise.allSettled(
    gammaEvent.markets.map(m => fetchCLOBHistory(m.conditionId))
  )
  return gammaEvent.markets.map((m, i) => ({
    ...m,
    history: histories[i].status === 'fulfilled' ? histories[i].value : [],
  }))
}
