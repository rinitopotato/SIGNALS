/**
 * Agent-Based Model (ABM) — Silicon Trader simulation
 * NCM Ch.15 — Strategic Behavior: when should an agent reveal private information?
 *
 * Two agent types:
 *  - InformedTrader: buys/sells based on SI_raw signal (has "private information")
 *  - NoiseTrader: random direction and outcome (mimics uninformed volume)
 *
 * Market mechanism: LMSR — each trade updates prices via softmax.
 */
import { lmsrPrices, lmsrTradeCost, backCalcQuantities, computeSIRaw } from './lmsr.js'

function randomOutcome(n) {
  return Math.floor(Math.random() * n)
}

// ── Single ABM run ─────────────────────────────────────────────────
export function runABM({
  initialPrices,
  siRaw          = 0,
  hikeIdx        = 0,
  holdIdx        = 2,
  nInformed      = 3,
  nNoise         = 6,
  nRounds        = 50,
  b              = 100,
  tradeSize      = 10,
  atUpper        = 0.02,
  atLower        = -0.02,
}) {
  if (!initialPrices?.length) return null
  const n = initialPrices.length
  let quantities = backCalcQuantities(initialPrices, b)

  // Track cumulative PnL for each agent pool
  let informedPnL = 0
  let noisePnL    = 0

  const priceHistory   = [{ round: 0, prices: lmsrPrices(quantities, b) }]
  const tradeLog       = []

  for (let round = 1; round <= nRounds; round++) {
    const currentPrices = lmsrPrices(quantities, b)
    const currentSI = computeSIRaw(currentPrices, hikeIdx, holdIdx)

    // ── Informed traders ──────────────────────────────────────────
    for (let a = 0; a < nInformed; a++) {
      let outcome, delta
      if (currentSI > atUpper) {
        outcome = hikeIdx  // signal says HIKE → buy HIKE outcome
        delta = tradeSize
      } else if (currentSI < atLower) {
        outcome = holdIdx  // signal says HOLD → buy HOLD outcome
        delta = tradeSize
      } else {
        // NEUTRAL: informed trader sits out (strategic patience)
        continue
      }
      const cost = lmsrTradeCost(quantities, outcome, delta, b)
      quantities[outcome] += delta
      // PnL approximation: buy at current price, "sell" at next price
      const newP = lmsrPrices(quantities, b)[outcome]
      informedPnL += delta * (newP - currentPrices[outcome]) - cost
      tradeLog.push({ round, agent: 'informed', outcome, delta, cost })
    }

    // ── Noise traders ─────────────────────────────────────────────
    for (let a = 0; a < nNoise; a++) {
      const outcome = randomOutcome(n)
      const delta   = (Math.random() > 0.5 ? 1 : -1) * tradeSize * (0.5 + Math.random())
      const cost    = lmsrTradeCost(quantities, outcome, delta, b)
      quantities[outcome] += delta
      const newP = lmsrPrices(quantities, b)[outcome]
      noisePnL += delta * (newP - currentPrices[outcome]) - cost
      tradeLog.push({ round, agent: 'noise', outcome, delta, cost })
    }

    priceHistory.push({ round, prices: lmsrPrices(quantities, b) })
  }

  return {
    priceHistory,           // [{ round, prices[n] }]
    tradeLog,               // full trade log
    informedPnL,
    noisePnL,
    finalPrices: lmsrPrices(quantities, b),
    nRounds,
    nInformed,
    nNoise,
  }
}

// ── Summarise per-round for charting ───────────────────────────────
export function abmChartData(result, outcomeIdx = 0) {
  if (!result) return []
  return result.priceHistory.map(({ round, prices }) => ({
    round,
    price: prices[outcomeIdx],
    siRaw: computeSIRaw(prices, 0, 2),
  }))
}
