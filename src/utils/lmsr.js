/**
 * LMSR (Logarithmic Market Scoring Rule) utilities
 * Ref: Hanson (2003), Kim (2026) §1.5
 */

// ── Softmax price ──────────────────────────────────────────────────
// P_i = exp(q_i / b) / Σ_j exp(q_j / b)
export function lmsrPrices(quantities, b = 100) {
  if (!quantities || !quantities.length) return []
  const scaled = quantities.map(q => q / b)
  const max    = Math.max(...scaled)                  // numerical stability
  const exps   = scaled.map(s => Math.exp(s - max))
  const sum    = exps.reduce((a, v) => a + v, 0)
  return exps.map(e => e / sum)
}

// ── Cost function ──────────────────────────────────────────────────
// C(q) = b · ln(Σ_j exp(q_j / b))
export function lmsrCost(quantities, b = 100) {
  const scaled = quantities.map(q => q / b)
  const max    = Math.max(...scaled)
  const sum    = scaled.reduce((a, s) => a + Math.exp(s - max), 0)
  return b * (max + Math.log(sum))
}

// ── Trade cost ─────────────────────────────────────────────────────
// Cost of buying Δ additional shares of outcome i
export function lmsrTradeCost(quantities, outcomeIdx, delta, b = 100) {
  const qBefore = [...quantities]
  const qAfter  = [...quantities]
  qAfter[outcomeIdx] += delta
  return lmsrCost(qAfter, b) - lmsrCost(qBefore, b)
}

// ── Worst-case platform loss ───────────────────────────────────────
// WCL = b · ln(n)
export function lmsrWorstCaseLoss(n, b) {
  return b * Math.log(n)
}

// ── b-parameter estimation from consecutive snapshots ─────────────
// From ∂P_i/∂q_i = P_i(1−P_i)/b  →  b̂ = Δamount / |ΔP_i·(1−P_i)|
export function estimateB(tradeAmount, pBefore, pAfter) {
  const deltaP = Math.abs(pAfter - pBefore)
  const pMid   = (pBefore + pAfter) / 2
  const denom  = deltaP * pMid * (1 - pMid)
  if (denom < 1e-9) return null
  return Math.abs(tradeAmount) / denom
}

// ── Back-calculate quantities from consecutive snapshots ───────────
// q_i - q_j = b · ln(P_i / P_j)
export function backCalcQuantities(prices, b = 100) {
  if (!prices.length) return []
  const logPrices = prices.map(p => Math.log(Math.max(p, 1e-10)))
  const q0        = b * logPrices[0]
  return logPrices.map(lp => q0 + b * (lp - logPrices[0]))
}

// ── Signal Index for BOJ market ────────────────────────────────────
// SI_raw = P(0.25%引上げ) − P(据置き（変化なし）)
// Index 0 = HIKE (0.25%引上げ), Index 2 = HOLD (据置き)
export function computeSIRaw(prices, hikeIdx = 0, holdIdx = 2) {
  if (!prices || prices.length < Math.max(hikeIdx, holdIdx) + 1) return 0
  return prices[hikeIdx] - prices[holdIdx]
}

export function classifySignal(siRaw) {
  if (siRaw > 0.02)  return 'HIKE'
  if (siRaw < -0.02) return 'HOLD'
  return 'NEUTRAL'
}

// ── Polymarket price mechanics ─────────────────────────────────────
// Mid-price: (bid + ask) / 2
export function polymarketMid(bid, ask) {
  return (bid + ask) / 2
}

// Micro-price (volume-weighted imbalance)
// P_micro = (V_bid·ask + V_ask·bid) / (V_bid + V_ask)
export function polymarketMicro(bidVol, askVol, bid, ask) {
  const denom = bidVol + askVol
  if (denom === 0) return polymarketMid(bid, ask)
  return (bidVol * ask + askVol * bid) / denom
}

// Order imbalance I = (V_bid - V_ask) / (V_bid + V_ask)
export function orderImbalance(bidVol, askVol) {
  const denom = bidVol + askVol
  if (denom === 0) return 0
  return (bidVol - askVol) / denom
}

// ── b regime classification ────────────────────────────────────────
export function bRegime(b) {
  if (b == null) return 'unknown'
  if (b < 10)  return 'thin'
  if (b < 40)  return 'moderate'
  return 'thick'
}

// ── Decay-adjusted signal ──────────────────────────────────────────
// I_decay(t, age) = I_t · exp(−λ · age)   where λ = ln(2)/halfLife
export function decaySignal(value, ageHours, halfLifeHours = 6) {
  const lambda = Math.LN2 / halfLifeHours
  return value * Math.exp(-lambda * ageHours)
}
