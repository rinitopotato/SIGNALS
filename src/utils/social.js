/**
 * Social Capital (Lens 2) — network analysis utilities
 * Ref: NCM Ch. 3, 4, 16
 */

import { pearson, mean, stddev } from './statistics.js'

// ── Jaccard similarity ─────────────────────────────────────────────
// J(A,B) = |A∩B| / |A∪B|  on sets of (date, market) participation pairs
export function jaccardSimilarity(setA, setB) {
  if (!setA.size && !setB.size) return 1
  const intersection = [...setA].filter(x => setB.has(x)).length
  const union        = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

// Build 9×9 Jaccard matrix from trade logs
// Returns: [[j00, j01, ...], [j10, ...], ...]
export function buildJaccardMatrix(trades, wallets) {
  // For each trader, collect set of 'date|market' participation keys
  const traderSets = wallets.map(w => {
    const s = new Set()
    trades
      .filter(t => t.trader === w.address.toLowerCase())
      .forEach(t => {
        const dateKey = new Date(t.timestamp * 1000).toISOString().slice(0, 10)
        s.add(`${dateKey}|${t.market}`)
      })
    return s
  })

  return wallets.map((_, i) =>
    wallets.map((_, j) => jaccardSimilarity(traderSets[i], traderSets[j]))
  )
}

// ── Centrality Score ──────────────────────────────────────────────
// C_i = count of j where Corr(daily_activity_i, daily_activity_j) > 0.7
export function centralityScores(trades, wallets, threshold = 0.7) {
  const allDates = [...new Set(trades.map(t =>
    new Date(t.timestamp * 1000).toISOString().slice(0, 10)
  ))].sort()

  const actVectors = wallets.map(w => {
    return allDates.map(d =>
      trades.filter(t =>
        t.trader === w.address.toLowerCase() &&
        new Date(t.timestamp * 1000).toISOString().slice(0, 10) === d
      ).length
    )
  })

  return wallets.map((_, i) => {
    const count = wallets.reduce((acc, _, j) => {
      if (i === j) return acc
      const corr = pearson(actVectors[i], actVectors[j])
      return corr > threshold ? acc + 1 : acc
    }, 0)
    return { name: wallets[i].name, centrality: count }
  })
}

// ── Clustering Coefficient ─────────────────────────────────────────
// CC = P(j and k both trade given i→j, i→k) in co-participation graph
export function clusteringCoefficients(jaccardMatrix, wallets, threshold = 0.3) {
  const n = wallets.length
  return wallets.map((_, i) => {
    const neighbours = []
    for (let j = 0; j < n; j++) {
      if (j !== i && jaccardMatrix[i][j] > threshold) neighbours.push(j)
    }
    if (neighbours.length < 2) return { name: wallets[i].name, cc: 0 }
    let links = 0
    for (let a = 0; a < neighbours.length; a++) {
      for (let b = a + 1; b < neighbours.length; b++) {
        if (jaccardMatrix[neighbours[a]][neighbours[b]] > threshold) links++
      }
    }
    const possible = (neighbours.length * (neighbours.length - 1)) / 2
    return { name: wallets[i].name, cc: possible > 0 ? links / possible : 0 }
  })
}

// ── Follower Multiplier ────────────────────────────────────────────
// FM = ΔVol_{t+1h} / TradeSize_i
// Returns per-trader map of average FM
export function followerMultipliers(trades, wallets) {
  return wallets.map(w => {
    const myTrades = trades.filter(t => t.trader === w.address.toLowerCase())
    if (!myTrades.length) return { name: w.name, fm: null }

    const fms = myTrades.map(myTrade => {
      const t0 = myTrade.timestamp
      const t1 = t0 + 3600  // +1 hour
      // Volume by others in the same market in the next hour
      const followVol = trades
        .filter(t =>
          t.trader !== w.address.toLowerCase() &&
          t.market === myTrade.market &&
          t.timestamp >= t0 && t.timestamp <= t1
        )
        .reduce((sum, t) => sum + (t.amount ?? 0), 0)
      return myTrade.amount > 0 ? followVol / myTrade.amount : null
    }).filter(v => v != null)

    return { name: w.name, fm: fms.length ? mean(fms) : null }
  })
}

// ── Sync Cluster Strength ─────────────────────────────────────────
// SCS = max pairwise Pearson correlation of hourly volume time-series
export function syncClusterStrength(trades, wallets) {
  const allHours = [...new Set(trades.map(t => Math.floor(t.timestamp / 3600)))].sort()
  if (allHours.length < 3) return null

  const volSeries = wallets.map(w =>
    allHours.map(h =>
      trades.filter(t =>
        t.trader === w.address.toLowerCase() &&
        Math.floor(t.timestamp / 3600) === h
      ).reduce((sum, t) => sum + (t.amount ?? 0), 0)
    )
  )

  let maxCorr = -Infinity
  for (let i = 0; i < wallets.length; i++) {
    for (let j = i + 1; j < wallets.length; j++) {
      const c = pearson(volSeries[i], volSeries[j])
      if (c > maxCorr) maxCorr = c
    }
  }
  return maxCorr === -Infinity ? null : maxCorr
}

// ── Homophily Score ───────────────────────────────────────────────
// Spearman correlation between HC (Brier) scores of traders in same market
export function homophilyScore(brierScores, jaccardMatrix, wallets, threshold = 0.3) {
  const pairs = []
  for (let i = 0; i < wallets.length; i++) {
    for (let j = i + 1; j < wallets.length; j++) {
      if (jaccardMatrix[i][j] > threshold) {
        const bsI = brierScores[i] ?? 0.25
        const bsJ = brierScores[j] ?? 0.25
        pairs.push({ i, j, bsI, bsJ })
      }
    }
  }
  if (pairs.length < 3) return null
  const xs = pairs.map(p => p.bsI)
  const ys = pairs.map(p => p.bsJ)
  return pearson(xs, ys)
}

// ── Network Resilience ────────────────────────────────────────────
// % drop in degree if top-3 centrality nodes removed
export function networkResilience(jaccardMatrix, centralities, wallets, threshold = 0.3) {
  const n     = wallets.length
  const totalEdges = countEdges(jaccardMatrix, threshold)
  if (totalEdges === 0) return 0

  // Sort by centrality descending, take top 3
  const sorted   = [...centralities].sort((a, b) => b.centrality - a.centrality)
  const top3     = sorted.slice(0, Math.min(3, n)).map(c => wallets.findIndex(w => w.name === c.name))
  const reduced  = jaccardMatrix.filter((_, i) => !top3.includes(i))
    .map(row => row.filter((_, j) => !top3.includes(j)))
  const remainEdges = countEdges(reduced, threshold)
  const fullEdgesWithoutTop3 = countEdges(
    jaccardMatrix.filter((_, i) => !top3.includes(i))
      .map(row => row.filter((_, j) => !top3.includes(j))),
    threshold
  )
  return totalEdges > 0 ? (totalEdges - remainEdges) / totalEdges : 0
}

function countEdges(matrix, threshold) {
  let count = 0
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < (matrix[i] ?? []).length; j++) {
      if ((matrix[i][j] ?? 0) > threshold) count++
    }
  }
  return count
}
