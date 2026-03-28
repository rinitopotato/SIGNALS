/**
 * Price Prediction utilities — LMSR + CLOB + Multi-Lens framework
 * Based on Python notebook PredictionMarketLenses class
 */
import { lmsrPrices, lmsrTradeCost, backCalcQuantities } from './lmsr.js'
import { pearson, stddev, mean } from './statistics.js'

// ── Lens 1: Human Capital — Response Speed ─────────────────────────
// RS = seconds between news event and first trade (lower = faster)
export function responseSpeed(traderTrades, newsTimestamp) {
  const relevant = traderTrades.filter(t => t.timestamp >= newsTimestamp)
  if (!relevant.length) return null
  const first = Math.min(...relevant.map(t => t.timestamp))
  return first - newsTimestamp
}

// ── Lens 2: Social Capital — Jaccard co-participation ─────────────
export function jaccardSimilarity(marketsA, marketsB) {
  const setA = new Set(marketsA)
  const setB = new Set(marketsB)
  const intersection = [...setA].filter(m => setB.has(m)).length
  const union = new Set([...setA, ...setB]).size
  return union > 0 ? intersection / union : 0
}

// ── Lens 3: Signal Engineering — Composite Leading Indicator ───────
// I_t = w_p * Z(price) + w_a * Z(attention)
export function compositeLeadingIndicator(priceSeries, attentionSeries, wP = 0.7, wA = 0.3) {
  const muP = mean(priceSeries), sdP = stddev(priceSeries)
  const muA = mean(attentionSeries), sdA = stddev(attentionSeries)
  const n = Math.min(priceSeries.length, attentionSeries.length)
  const result = []
  for (let i = 0; i < n; i++) {
    const zP = sdP > 0 ? (priceSeries[i] - muP) / sdP : 0
    const zA = sdA > 0 ? (attentionSeries[i] - muA) / sdA : 0
    result.push(wP * zP + wA * zA)
  }
  return result
}

// ── Lens 4: External Validity — Portability Score ──────────────────
// r = Pearson(pm_prices, signals_prices)
export function portabilityScore(pmPrices, signalsPrices) {
  if (!pmPrices.length || !signalsPrices.length) return null
  const n = Math.min(pmPrices.length, signalsPrices.length)
  return pearson(pmPrices.slice(0, n), signalsPrices.slice(0, n))
}

// ── Lens 5: Robustness — Normalisation Robustness Gate ─────────────
// Agreement between Z-score and Min-Max normalisations
export function normalisationRobustnessGate(series) {
  if (series.length < 3) return null
  const mu = mean(series), sd = stddev(series)
  const minV = Math.min(...series), maxV = Math.max(...series)
  const range = maxV - minV
  const zScore = series.map(v => sd > 0 ? (v - mu) / sd : 0)
  const minMax = series.map(v => range > 0 ? (v - minV) / range : 0)
  return pearson(zScore, minMax)  // 1.0 = perfect agreement
}

// ── LMSR Price Prediction ──────────────────────────────────────────
// Given current prices and a proposed trade, predict the new prices
export function predictLMSRAfterTrade(currentPrices, outcomeIdx, deltaShares, b = 100) {
  if (!currentPrices.length) return currentPrices
  const quantities = backCalcQuantities(currentPrices, b)
  const newQuantities = [...quantities]
  newQuantities[outcomeIdx] = (newQuantities[outcomeIdx] ?? 0) + deltaShares
  const newPrices = lmsrPrices(newQuantities, b)
  const cost = lmsrTradeCost(quantities, outcomeIdx, deltaShares, b)
  return { newPrices, cost }
}

// ── CLOB Mid-price Prediction ──────────────────────────────────────
export function predictCLOBMid(bid, ask) {
  return (bid + ask) / 2
}

// ── Overall Signal Confidence ──────────────────────────────────────
// Aggregate score across all 5 lenses (0–1)
export function overallConfidence({ ic, centrality, compositeIt, portability, robustness }) {
  const scores = [
    ic          != null ? Math.max(0, Math.min(1, (ic + 1) / 2))      : null,
    centrality  != null ? Math.max(0, Math.min(1, centrality))          : null,
    compositeIt != null ? Math.max(0, Math.min(1, (compositeIt + 3) / 6)) : null,
    portability != null ? Math.max(0, Math.min(1, (portability + 1) / 2)) : null,
    robustness  != null ? Math.max(0, Math.min(1, robustness))          : null,
  ].filter(v => v != null)

  if (!scores.length) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

// ── Per-market prediction summary ─────────────────────────────────
export function marketPredictionSummary(prices, hikeIdx = 0, holdIdx = 2) {
  if (!prices?.length) return null
  const leadingIdx = prices.indexOf(Math.max(...prices))
  const confidence = Math.max(...prices)
  const entropy = -prices.reduce((s, p) => {
    if (p <= 0) return s
    return s + p * Math.log2(p)
  }, 0)
  const maxEntropy = Math.log2(prices.length)
  const certainty = maxEntropy > 0 ? 1 - entropy / maxEntropy : 0
  return { leadingIdx, confidence, certainty, entropy }
}
