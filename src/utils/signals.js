/**
 * Signal Engineering computations (SE-1 through SE-6)
 * Ref: Group 3 notebook, spec §6.3
 */

import { mean, stddev, rollingMean, pearson, ols, bootstrap } from './statistics.js'
import { computeSIRaw } from './lmsr.js'

// ── SE-1: Six MA variants on SI series ────────────────────────────
export function computeSignalZoo(siSeries) {
  if (!siSeries.length) return {}
  const raw  = siSeries.map(s => s.siRaw)

  const ma3  = rollingMean(raw, 3)
  const ma5  = rollingMean(raw, 5)

  // Z-score (rolling window = 5)
  const zScores = raw.map((v, i) => {
    if (i < 4) return null
    const window = raw.slice(i - 4, i + 1)
    const mu  = mean(window)
    const sig = stddev(window)
    return sig > 0 ? (v - mu) / sig : 0
  })

  // Momentum (diff-1)
  const momentum = raw.map((v, i) => i === 0 ? null : v - raw[i - 1])

  // Ratio P(hike)/P(hold)
  const ratio = siSeries.map(s => {
    const hold = s.pHold ?? 0
    return hold > 0.001 ? (s.pHike ?? 0) / hold : null
  })

  return { raw, ma3, ma5, zScores, momentum, ratio }
}

// ── SE-2: Threshold crossings ─────────────────────────────────────
// Returns indices where signal crosses upperThreshold or lowerThreshold
export function thresholdCrossings(series, upper = 0.02, lower = -0.02) {
  const crossings = []
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]
    const curr = series[i]
    if (prev == null || curr == null) continue
    if (prev <= upper && curr > upper)  crossings.push({ idx: i, type: 'up_cross_upper' })
    if (prev >= upper && curr < upper)  crossings.push({ idx: i, type: 'down_cross_upper' })
    if (prev >= lower && curr < lower)  crossings.push({ idx: i, type: 'down_cross_lower' })
    if (prev <= lower && curr > lower)  crossings.push({ idx: i, type: 'up_cross_lower' })
  }
  return crossings
}

// ── SE-3: Rolling IC and Optimal Lag ──────────────────────────────
// IC(k) = Pearson(SI_{t-k}, ΔP_{t}) for k ∈ {0..12}
export function computeRollingIC(siSeries, priceSeries, maxLag = 12) {
  const siRaw  = siSeries.map(s => typeof s === 'number' ? s : s.siRaw)
  const prices = priceSeries.map(p => typeof p === 'number' ? p : p.price)

  const icByLag = []
  for (let k = 0; k <= maxLag; k++) {
    const aligned_si = siRaw.slice(0, siRaw.length - k)
    const aligned_dp = prices.slice(k).map((p, i) => p - (prices[k + i - 1] ?? p))
    const ic = pearson(aligned_si, aligned_dp)
    icByLag.push({ lag: k, ic })
  }
  const kStar = icByLag.reduce((best, curr) =>
    Math.abs(curr.ic) > Math.abs(best.ic) ? curr : best, icByLag[0])
  return { icByLag, kStar: kStar.lag, les: kStar.ic }
}

// ── SE-5: IC-Weighted Ensemble Signal ─────────────────────────────
// w_i(t) = max(0, IC_i) / Σ max(0, IC_i)
// Ensemble_t = Σ w_i · SI_{i,t}
export function computeEnsemble(zoo, ics) {
  const keys   = ['raw', 'ma3', 'ma5', 'zScores', 'momentum', 'ratio']
  const n      = (zoo.raw ?? []).length
  if (!n) return []

  // Normalise positive weights
  const posICs  = keys.map(k => Math.max(0, ics[k] ?? 0))
  const sumW    = posICs.reduce((a, b) => a + b, 0)
  const weights = sumW > 0
    ? posICs.map(w => w / sumW)
    : keys.map(() => 1 / keys.length)    // equal weights if all negative

  return Array.from({ length: n }, (_, i) => {
    let ens = 0
    for (let j = 0; j < keys.length; j++) {
      const val = (zoo[keys[j]] ?? [])[i]
      if (val != null && !isNaN(val)) ens += weights[j] * val
    }
    return ens
  })
}

// ── SE-6: Signal decomposition + SNR ─────────────────────────────
// Trend = MA-7, Cyclical = MA-3 of detrended, Residual = signal − trend − cyclical
export function decomposeSignal(series) {
  const valid  = series.filter(v => v != null && !isNaN(v))
  if (valid.length < 8) {
    return { trend: series, cyclical: series.map(() => 0), residual: series.map(() => 0), snr: null }
  }
  const trend    = rollingMean(series, 7)
  const detrend  = series.map((v, i) => (v != null && trend[i] != null) ? v - trend[i] : null)
  const cyclical = rollingMean(detrend.map(v => v ?? 0), 3)
  const residual = series.map((v, i) =>
    (v != null && trend[i] != null && cyclical[i] != null)
      ? v - trend[i] - cyclical[i]
      : null
  )
  const nonNull = arr => arr.filter(v => v != null && !isNaN(v))
  const sigCyc  = stddev(nonNull(cyclical))
  const sigRes  = stddev(nonNull(residual))
  const snr     = sigRes > 0 ? sigCyc / sigRes : null
  return { trend, cyclical, residual, snr }
}

// ── SNR (direct formula) ───────────────────────────────────────────
// SNR = μ_Signal / σ_Price
export function computeSNR(signalArr, priceArr) {
  const mu  = mean(signalArr.filter(v => v != null))
  const sig = stddev(priceArr.filter(v => v != null))
  return sig > 0 ? mu / sig : null
}

// ── Composite Signal Index I_t ─────────────────────────────────────
// I_t = w1·Z(P_t) + w2·Z(A_t)   weights from OLS on lagged prediction
export function computeCompositeIndex(zPrices, zAttention, w1 = 0.6, w2 = 0.4) {
  const n = Math.min(zPrices.length, zAttention.length)
  return Array.from({ length: n }, (_, i) => w1 * (zPrices[i] ?? 0) + w2 * (zAttention[i] ?? 0))
}

// ── Consensus Gate ─────────────────────────────────────────────────
// Returns 1 if ≥3 of 6 variants agree on direction, else 0
export function consensusGate(zoo, idx) {
  const keys = ['raw', 'ma3', 'ma5', 'zScores', 'momentum', 'ratio']
  const vals = keys.map(k => (zoo[k] ?? [])[idx]).filter(v => v != null && !isNaN(v))
  const pos  = vals.filter(v => v > 0).length
  const neg  = vals.filter(v => v < 0).length
  return (pos >= 3 || neg >= 3) ? 1 : 0
}

// ── Walk-forward accuracy ──────────────────────────────────────────
// Binary accuracy predicting direction of P_{t+1}
export function walkForwardAccuracy(signalSeries, priceSeries, trainWindow = 7) {
  const n = Math.min(signalSeries.length, priceSeries.length)
  if (n < trainWindow + 2) return null
  let correct = 0, total = 0
  for (let t = trainWindow; t < n - 1; t++) {
    const sig     = signalSeries[t]
    const dp      = priceSeries[t + 1] - priceSeries[t]
    if (sig == null || isNaN(sig)) continue
    if ((sig > 0 && dp > 0) || (sig < 0 && dp < 0)) correct++
    total++
  }
  return total > 0 ? correct / total : null
}

// ── Monte Carlo Signal Pass ────────────────────────────────────────
// % of bootstrap runs where signal direction matches baseline
export function monteCarloSignalPass(series, n = 500) {
  if (series.length < 3) return null
  const baselineDir = mean(series.filter(v => v != null)) > 0 ? 1 : -1
  const boots = bootstrap(series.filter(v => v != null), n, arr => mean(arr) > 0 ? 1 : -1)
  const passing = boots.filter(d => d === baselineDir).length
  return passing / n
}
