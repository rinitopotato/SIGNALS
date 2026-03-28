/**
 * Core statistical utilities (pure functions, no side-effects)
 */

export function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function variance(arr) {
  if (arr.length < 2) return 0
  const mu = mean(arr)
  return arr.reduce((a, b) => a + (b - mu) ** 2, 0) / (arr.length - 1)
}

export function stddev(arr) {
  return Math.sqrt(variance(arr))
}

export function zscore(value, mu, sigma) {
  if (sigma === 0) return 0
  return (value - mu) / sigma
}

export function zscoreArr(arr) {
  const mu    = mean(arr)
  const sigma = stddev(arr)
  return arr.map(v => zscore(v, mu, sigma))
}

// ── Pearson correlation ────────────────────────────────────────────
export function pearson(arrX, arrY) {
  const n = Math.min(arrX.length, arrY.length)
  if (n < 2) return 0
  const x  = arrX.slice(0, n)
  const y  = arrY.slice(0, n)
  const mx = mean(x), my = mean(y)
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom === 0 ? 0 : num / denom
}

// ── Spearman rank correlation ──────────────────────────────────────
export function spearman(arrX, arrY) {
  const n = Math.min(arrX.length, arrY.length)
  if (n < 2) return 0
  const rank = arr => {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
    const r = new Array(arr.length)
    sorted.forEach(({ i }, rank) => { r[i] = rank + 1 })
    return r
  }
  return pearson(rank(arrX.slice(0,n)), rank(arrY.slice(0,n)))
}

// ── Information Coefficient ────────────────────────────────────────
// IC_i = Pearson(trade_direction_i, ΔP_24h)
// tradeDirections: +1 for buy, -1 for sell
// priceChanges: ΔP over next 24h at each trade time
export function informationCoefficient(tradeDirections, priceChanges) {
  return pearson(tradeDirections, priceChanges)
}

// Rolling IC over windows of size W
export function rollingIC(tradeDirections, priceChanges, windowSize = 10) {
  const n   = Math.min(tradeDirections.length, priceChanges.length)
  const out = []
  for (let i = windowSize - 1; i < n; i++) {
    const start = i - windowSize + 1
    const d = tradeDirections.slice(start, i + 1)
    const p = priceChanges.slice(start, i + 1)
    out.push({ idx: i, ic: pearson(d, p) })
  }
  return out
}

// ── Moving averages ────────────────────────────────────────────────
export function rollingMean(arr, window) {
  const out = []
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) { out.push(null); continue }
    const slice = arr.slice(i - window + 1, i + 1)
    out.push(mean(slice))
  }
  return out
}

export function rollingStd(arr, window) {
  const out = []
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) { out.push(null); continue }
    const slice = arr.slice(i - window + 1, i + 1)
    out.push(stddev(slice))
  }
  return out
}

// ── Brier Score ────────────────────────────────────────────────────
// BS = (1/N)·Σ(forecast − outcome)²
export function brierScore(forecasts, outcomes) {
  const n = Math.min(forecasts.length, outcomes.length)
  if (n === 0) return null
  const sum = forecasts.slice(0,n).reduce((acc, f, i) => acc + (f - outcomes[i]) ** 2, 0)
  return sum / n
}

// ── Kolmogorov-Smirnov test statistic ─────────────────────────────
export function ksStat(arrA, arrB) {
  const sorted = (arr) => [...arr].sort((a,b) => a-b)
  const sA = sorted(arrA), sB = sorted(arrB)
  const all = [...new Set([...sA, ...sB])].sort((a,b) => a-b)
  let maxD = 0
  for (const x of all) {
    const cdfA = sA.filter(v => v <= x).length / sA.length
    const cdfB = sB.filter(v => v <= x).length / sB.length
    maxD = Math.max(maxD, Math.abs(cdfA - cdfB))
  }
  return maxD
}

// Approximate two-sample KS p-value (Kolmogorov distribution)
export function ksPValue(d, nA, nB) {
  const ne = (nA * nB) / (nA + nB)
  const z  = d * Math.sqrt(ne)
  // Approximate via sum of alternating series (Kolmogorov distribution)
  let p = 0
  for (let k = 1; k <= 20; k++) {
    p += 2 * (k % 2 === 0 ? -1 : 1) * Math.exp(-2 * k * k * z * z)
  }
  return Math.max(0, Math.min(1, p))
}

// ── Sharpe ratio ───────────────────────────────────────────────────
export function sharpe(returns, riskFree = 0) {
  const excess = returns.map(r => r - riskFree)
  const mu     = mean(excess)
  const sigma  = stddev(excess)
  return sigma === 0 ? 0 : mu / sigma
}

// ── Linear regression (OLS) ───────────────────────────────────────
// Returns { slope, intercept, r2 }
export function ols(x, y) {
  const n = Math.min(x.length, y.length)
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }
  const mx = mean(x.slice(0,n)), my = mean(y.slice(0,n))
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my)
    den += (x[i] - mx) ** 2
  }
  const slope     = den === 0 ? 0 : num / den
  const intercept = my - slope * mx
  const yHat      = x.slice(0,n).map(xi => slope * xi + intercept)
  const ssTot     = y.slice(0,n).reduce((a, yi) => a + (yi - my) ** 2, 0)
  const ssRes     = y.slice(0,n).reduce((a, yi, i) => a + (yi - yHat[i]) ** 2, 0)
  const r2        = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  return { slope, intercept, r2 }
}

// ── Bootstrap resampling ───────────────────────────────────────────
export function bootstrap(arr, n = 500, statFn = mean) {
  const results = []
  for (let i = 0; i < n; i++) {
    const sample = Array.from({ length: arr.length }, () => arr[Math.floor(Math.random() * arr.length)])
    results.push(statFn(sample))
  }
  return results
}

// ── Rank normalisation ────────────────────────────────────────────
// Returns ranks as fractions ∈ (0,1] — ties get average rank
export function rankNormalize(arr) {
  if (!arr.length) return []
  const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const ranks = new Array(arr.length)
  sorted.forEach(({ i }, r) => { ranks[i] = (r + 1) / arr.length })
  return ranks
}

// ── Cross-Correlation Function (CCF) ─────────────────────────────
// Returns [{ lag, r }] where r = Pearson(A[t], B[t+lag])
// Positive lag: B leads A; negative lag: A leads B
export function ccf(seriesA, seriesB, lags = [1, 3, 7]) {
  return lags.map(lag => {
    const absLag = Math.abs(lag)
    const n = Math.min(seriesA.length, seriesB.length) - absLag
    if (n < 2) return { lag, r: 0 }
    const a = lag >= 0 ? seriesA.slice(0, n) : seriesA.slice(absLag, n + absLag)
    const b = lag >= 0 ? seriesB.slice(absLag, n + absLag) : seriesB.slice(0, n)
    return { lag, r: pearson(a, b) }
  })
}

// ── GARCH(1,1) volatility model ───────────────────────────────────
// h_t = ω + α·ε²_{t-1} + β·h_{t-1}
// Returns { volatilities[], longRunVar, halfLife }
export function garch11(returns, omega = 0.00001, alpha = 0.1, beta = 0.85) {
  if (returns.length < 3) return { volatilities: [], longRunVar: null, halfLife: null }
  const h = []
  h[0] = variance(returns) || 0.0001
  for (let t = 1; t < returns.length; t++) {
    const eps2 = returns[t - 1] ** 2
    h[t] = omega + alpha * eps2 + beta * h[t - 1]
  }
  const longRunVar = omega / (1 - alpha - beta)
  const halfLife   = alpha + beta < 1 ? -Math.log(2) / Math.log(alpha + beta) : null
  return { volatilities: h.map(v => Math.sqrt(v)), longRunVar: Math.sqrt(longRunVar), halfLife }
}
