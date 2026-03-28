/**
 * Monte Carlo utilities for LMSR robustness testing
 * NCM Ch.18 — Power Laws: test if signal is a true trend or statistical outlier
 */
import { lmsrPrices, lmsrTradeCost, backCalcQuantities, lmsrWorstCaseLoss } from './lmsr.js'
import { mean, stddev } from './statistics.js'

// ── b-parameter sensitivity analysis ──────────────────────────────
// Simulate buying deltaShares into outcomeIdx under different b values.
// Returns [{ b, priceBefore, priceAfter, slippagePP, cost, wcl }]
export function bSensitivityAnalysis(currentPrices, outcomeIdx = 0, deltaShares = 50, bValues = [5, 50, 80]) {
  if (!currentPrices?.length) return []
  const n = currentPrices.length
  return bValues.map(b => {
    const quantities = backCalcQuantities(currentPrices, b)
    const priceBefore = currentPrices[outcomeIdx] ?? 0
    const newQ = [...quantities]
    newQ[outcomeIdx] = (newQ[outcomeIdx] ?? 0) + deltaShares
    const newPrices = lmsrPrices(newQ, b)
    const priceAfter = newPrices[outcomeIdx] ?? 0
    const cost = lmsrTradeCost(quantities, outcomeIdx, deltaShares, b)
    const wcl  = lmsrWorstCaseLoss(n, b)
    return {
      b,
      priceBefore,
      priceAfter,
      slippagePP: (priceAfter - priceBefore) * 100,
      cost,
      wcl,
      regime: b < 10 ? 'thin' : b < 40 ? 'moderate' : 'thick',
    }
  })
}

// ── Monte Carlo LMSR path simulation ──────────────────────────────
// Simulate nPaths × nTrades of random noise trades, optionally inject one
// "informed" buy on the signal outcome at the start.
// Returns { paths, meanFinal, pctPositive, pctRobust, distribution }
export function monteCarloLMSR({
  initialPrices,
  signalOutcomeIdx = 0,
  nPaths = 200,
  nTrades = 20,
  b = 100,
  noiseSigma = 5,
  informedDelta = 10,
}) {
  if (!initialPrices?.length) return { paths: [], meanFinal: null, pctRobust: null }
  const n = initialPrices.length
  const baseQuantities = backCalcQuantities(initialPrices, b)
  const baseline = initialPrices[signalOutcomeIdx]

  const finalPrices = []
  const paths = []

  for (let p = 0; p < nPaths; p++) {
    let q = [...baseQuantities]
    // Inject one informed trade at start
    q[signalOutcomeIdx] += informedDelta

    const pathPrices = [lmsrPrices(q, b)[signalOutcomeIdx]]
    for (let t = 0; t < nTrades; t++) {
      // Random noise trade
      const outcomeIdx = Math.floor(Math.random() * n)
      const delta = (Math.random() * 2 - 1) * noiseSigma
      q[outcomeIdx] += delta
      pathPrices.push(lmsrPrices(q, b)[signalOutcomeIdx])
    }
    finalPrices.push(pathPrices[pathPrices.length - 1])
    paths.push(pathPrices)
  }

  const pctRobust = finalPrices.filter(p => p > baseline).length / nPaths

  // Build histogram buckets (10 bins from 0 to 1)
  const bins = Array.from({ length: 10 }, (_, i) => ({ lo: i/10, hi: (i+1)/10, count: 0 }))
  finalPrices.forEach(p => {
    const idx = Math.min(9, Math.floor(p * 10))
    bins[idx].count++
  })

  return {
    paths: paths.slice(0, 30),   // Return 30 sample paths for chart
    meanFinal: mean(finalPrices),
    stdFinal:  stddev(finalPrices),
    pctRobust,
    baseline,
    distribution: bins,
  }
}
