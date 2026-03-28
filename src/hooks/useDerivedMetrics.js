import { useMemo } from 'react'
import { WALLETS } from '../constants/wallets.js'
import { SIGNALS_MARKETS } from '../constants/markets.js'
import { lmsrPrices, computeSIRaw, classifySignal, estimateB, bRegime, decaySignal } from '../utils/lmsr.js'
import {
  mean, stddev, pearson, brierScore, variance, ksStat, ksPValue, ols, bootstrap
} from '../utils/statistics.js'
import {
  computeSignalZoo, computeRollingIC, computeEnsemble, decomposeSignal,
  computeCompositeIndex, consensusGate, walkForwardAccuracy, monteCarloSignalPass
} from '../utils/signals.js'
import {
  buildJaccardMatrix, centralityScores, clusteringCoefficients,
  followerMultipliers, syncClusterStrength, homophilyScore, networkResilience
} from '../utils/social.js'

// ── Latest snapshot prices per market ─────────────────────────────
function latestPricesPerMarket(snapshots) {
  const byMarket = {}
  for (const snap of snapshots) {
    const m = snap.market
    if (!byMarket[m]) byMarket[m] = {}
    const cur = byMarket[m][snap.outcomeIndex]
    if (!cur || snap.timestamp > cur.timestamp) {
      byMarket[m][snap.outcomeIndex] = snap
    }
  }
  // Convert to array of prices per market
  const result = {}
  for (const [m, outcomeMap] of Object.entries(byMarket)) {
    const maxIdx = Math.max(...Object.keys(outcomeMap).map(Number))
    result[m] = Array.from({ length: maxIdx + 1 }, (_, i) => outcomeMap[i]?.price ?? null)
  }
  return result
}

// ── Snapshot time series per market ───────────────────────────────
function snapshotSeriesPerMarket(snapshots) {
  const byMarket = {}
  for (const snap of snapshots) {
    if (!byMarket[snap.market]) byMarket[snap.market] = []
    byMarket[snap.market].push(snap)
  }
  for (const arr of Object.values(byMarket)) {
    arr.sort((a, b) => a.timestamp - b.timestamp)
  }
  return byMarket
}

// ── Main derived metrics hook ──────────────────────────────────────
export default function useDerivedMetrics({ trades, snapshots, pmEvents, attentionProxy }) {
  // ── Market prices ─────────────────────────────────────────────
  const latestPrices = useMemo(() => latestPricesPerMarket(snapshots), [snapshots])
  const snapshotSeries = useMemo(() => snapshotSeriesPerMarket(snapshots), [snapshots])

  // ── BOJ Signal Index ──────────────────────────────────────────
  const bojMarket = SIGNALS_MARKETS.find(m => m.id === 'boj')
  const bojPrices = useMemo(() => {
    const prices = latestPrices[bojMarket.address.toLowerCase()]
    if (!prices) return null
    return lmsrPrices(prices.map(p => p ?? 0))
  }, [latestPrices])

  const siRaw = useMemo(() => {
    if (!bojPrices) return 0
    return computeSIRaw(bojPrices, bojMarket.hikeIndex, bojMarket.holdIndex)
  }, [bojPrices])

  const signal = useMemo(() => classifySignal(siRaw), [siRaw])

  // ── BOJ SI series (time series) ────────────────────────────────
  const bojSeries = useMemo(() => {
    const snaps = snapshotSeries[bojMarket.address.toLowerCase()] ?? []
    // Group by timestamp, compute prices at each snapshot
    const byTs = {}
    for (const s of snaps) {
      if (!byTs[s.timestamp]) byTs[s.timestamp] = {}
      byTs[s.timestamp][s.outcomeIndex] = s.price
    }
    const sorted = Object.entries(byTs)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([ts, ot]) => {
        const pricesArr = []
        const maxIdx = Math.max(...Object.keys(ot).map(Number), 4)
        for (let i = 0; i <= maxIdx; i++) pricesArr.push(ot[i] ?? 0)
        const p = lmsrPrices(pricesArr)
        return {
          timestamp: Number(ts),
          prices: p,
          pHike:  p[bojMarket.hikeIndex] ?? 0,
          pHold:  p[bojMarket.holdIndex] ?? 0,
          siRaw:  computeSIRaw(p, bojMarket.hikeIndex, bojMarket.holdIndex),
        }
      })
    return sorted
  }, [snapshotSeries])

  // ── Signal Zoo (SE-1) ─────────────────────────────────────────
  const signalZoo = useMemo(() => computeSignalZoo(bojSeries), [bojSeries])

  // ── Rolling IC and k* (SE-3) ──────────────────────────────────
  const { icByLag, kStar, les } = useMemo(() => {
    if (bojSeries.length < 4) return { icByLag: [], kStar: 0, les: 0 }
    const siArr    = bojSeries.map(s => s.siRaw)
    const priceArr = bojSeries.map(s => s.pHike)
    return computeRollingIC(siArr, priceArr, Math.min(12, bojSeries.length - 2))
  }, [bojSeries])

  // Per-variant ICs for ensemble weights (SE-5)
  const variantICs = useMemo(() => {
    const zoo = signalZoo
    const priceArr = bojSeries.map(s => s.pHike)
    const computeIC = series => {
      const valid = series.filter((v, i) => v != null && priceArr[i] != null)
      if (valid.length < 3) return 0
      const aligned = series.map((v, i) => ({ s: v, p: priceArr[i] })).filter(x => x.s != null && x.p != null)
      return pearson(aligned.map(x => x.s), aligned.map(x => x.p))
    }
    return {
      raw: computeIC(zoo.raw ?? []),
      ma3: computeIC(zoo.ma3 ?? []),
      ma5: computeIC(zoo.ma5 ?? []),
      zScores: computeIC(zoo.zScores ?? []),
      momentum: computeIC(zoo.momentum ?? []),
      ratio: computeIC(zoo.ratio ?? []),
    }
  }, [signalZoo, bojSeries])

  // ── Ensemble Signal (SE-5) ────────────────────────────────────
  const ensembleSignal = useMemo(() => computeEnsemble(signalZoo, variantICs), [signalZoo, variantICs])

  // ── Signal Decomposition (SE-6) ───────────────────────────────
  const decomposition = useMemo(() => {
    const raw = (signalZoo.raw ?? []).filter(v => v != null)
    if (raw.length < 8) return null
    return decomposeSignal(signalZoo.raw ?? [])
  }, [signalZoo])

  // ── b-parameter estimate ──────────────────────────────────────
  const bEstimate = useMemo(() => {
    if (trades.length < 2 || !bojPrices) return null
    const bojTrades = trades.filter(t =>
      t.market === bojMarket.address.toLowerCase()
    ).slice(0, 5)
    if (!bojTrades.length) return null
    const estimates = bojTrades.map(t => {
      const p = bojPrices[t.outcomeIndex] ?? 0.5
      return estimateB(t.amount, p - 0.01, p + 0.01)
    }).filter(v => v != null && v > 0 && v < 10000)
    return estimates.length ? mean(estimates) : null
  }, [trades, bojPrices])

  // ── Composite Signal Index I_t ────────────────────────────────
  const compositeIndex = useMemo(() => {
    const pHikes = bojSeries.map(s => s.pHike)
    const atVals = attentionProxy?.map(a => a.At) ?? []
    if (pHikes.length < 3 || atVals.length < 3) return []
    const mu_p  = mean(pHikes), sd_p = stddev(pHikes)
    const mu_a  = mean(atVals),  sd_a = stddev(atVals)
    const zP = pHikes.map(p => sd_p > 0 ? (p - mu_p) / sd_p : 0)
    const zA = atVals.map(a => sd_a > 0 ? (a - mu_a) / sd_a : 0)
    return computeCompositeIndex(zP, zA)
  }, [bojSeries, attentionProxy])

  // ── Lens 1: Human Capital per trader ─────────────────────────
  const humanCapital = useMemo(() => {
    return WALLETS.map(wallet => {
      const myTrades = trades.filter(t => t.trader === wallet.address.toLowerCase())
      const tradeCount = myTrades.length

      // Brier Score: last price before resolution vs outcome
      // We don't have resolution yet, so compute expected BS using SI_raw as calibration
      const bs = tradeCount > 0
        ? brierScore(myTrades.map(() => Math.abs(siRaw)), myTrades.map(() => siRaw > 0.02 ? 1 : 0))
        : null

      // IC: direction of trades vs ΔP_24h
      let ic = null
      if (myTrades.length >= 3) {
        const dirs = myTrades.map(t => t.type === 'buy' || t.type === 'BUY' ? 1 : -1)
        const deltas = myTrades.map(t => {
          const snap = bojSeries.find(s => Math.abs(s.timestamp - (t.timestamp + 86400)) < 3600)
          return snap ? snap.pHike - (bojPrices?.[0] ?? 0.5) : 0
        })
        ic = pearson(dirs, deltas)
      }

      // Sophistication Ratio: limit orders / market orders (if type data available)
      const limitOrders  = myTrades.filter(t => t.type === 'limit').length
      const marketOrders = myTrades.filter(t => t.type !== 'limit').length
      const sr = marketOrders > 0 ? limitOrders / marketOrders : null

      // Contrarian Alpha: profit on trades against 7-day MA
      const ma7 = rollingMean ? null : null // simplified stub

      // IAS: fraction of daily price movement from this trader
      const ias = tradeCount > 0 && trades.length > 0 ? tradeCount / trades.length : 0

      // Noise sensitivity: variance of trade sizes during high-vol periods
      const amounts = myTrades.map(t => t.amount)
      const ns = stddev(amounts)

      return {
        name:       wallet.name,
        address:    wallet.address,
        tradeCount,
        bs,
        ic,
        sr,
        ias,
        ns,
        amounts,
        lastTrade: myTrades[0]?.timestamp ?? null,
        firstTrade: myTrades[myTrades.length - 1]?.timestamp ?? null,
      }
    })
  }, [trades, siRaw, bojPrices, bojSeries])

  // ── Lens 2: Social Capital ────────────────────────────────────
  const jaccardMatrix = useMemo(() => buildJaccardMatrix(trades, WALLETS), [trades])
  const centralities  = useMemo(() => centralityScores(trades, WALLETS), [trades])
  const clusteringCCs = useMemo(() => clusteringCoefficients(jaccardMatrix, WALLETS), [jaccardMatrix])
  const followerMults = useMemo(() => followerMultipliers(trades, WALLETS), [trades])
  const scs           = useMemo(() => syncClusterStrength(trades, WALLETS), [trades])
  const resilience    = useMemo(() => networkResilience(jaccardMatrix, centralities, WALLETS), [jaccardMatrix, centralities])

  const bsScores = useMemo(() => humanCapital.map(hc => hc.bs ?? 0.25), [humanCapital])
  const hs = useMemo(() => homophilyScore(bsScores, jaccardMatrix, WALLETS), [bsScores, jaccardMatrix])

  // ── Lens 3: Signal Engineering ────────────────────────────────
  const divergenceSignal = useMemo(() => {
    // |P_PM - P_SIG| for BOJ analogues
    if (!pmEvents || !pmEvents.length || !bojPrices) return null
    const pmBoj = pmEvents.find(ev => ev?.slug?.includes('boj') || ev?.title?.toLowerCase().includes('boj') || ev?.title?.toLowerCase().includes('japan'))
    if (!pmBoj || !pmBoj.markets?.length) return null
    const pmP = pmBoj.markets[0]?.outcomePrices?.[0] ?? null
    if (pmP == null) return null
    return Math.abs(pmP - (bojPrices?.[0] ?? 0.5))
  }, [pmEvents, bojPrices])

  // ── Lens 4: External Validity ─────────────────────────────────
  const globalLocalSpread = useMemo(() => {
    if (!pmEvents || !pmEvents.length || !bojPrices) return null
    const pmBoj = pmEvents.find(ev => ev?.title?.toLowerCase().includes('boj') || ev?.title?.toLowerCase().includes('japan rate'))
    if (!pmBoj?.markets?.length) return null
    const pmHike = pmBoj.markets[0]?.outcomePrices?.[0] ?? null
    if (pmHike == null) return null
    return pmHike - (bojPrices?.[bojMarket.hikeIndex] ?? 0)
  }, [pmEvents, bojPrices])

  // ── Lens 5: Robustness ────────────────────────────────────────
  const wfa = useMemo(() => {
    const sigArr  = bojSeries.map(s => s.siRaw)
    const priceArr = bojSeries.map(s => s.pHike)
    return walkForwardAccuracy(sigArr, priceArr)
  }, [bojSeries])

  const mcp = useMemo(() => {
    const raw = signalZoo.raw ?? []
    return monteCarloSignalPass(raw.filter(v => v != null))
  }, [signalZoo])

  const cg = useMemo(() => {
    if (!signalZoo.raw?.length) return 0
    const lastIdx = (signalZoo.raw ?? []).length - 1
    return consensusGate(signalZoo, lastIdx)
  }, [signalZoo])

  // Regime Shift Test (KS test before/after March 18-19 BOJ meeting)
  const rstResult = useMemo(() => {
    const bojMeetingTs = 1742256000  // 2026-03-18 09:00 JST approx
    const before = bojSeries.filter(s => s.timestamp < bojMeetingTs).map(s => s.siRaw)
    const after  = bojSeries.filter(s => s.timestamp >= bojMeetingTs).map(s => s.siRaw)
    if (before.length < 3 || after.length < 3) return null
    const d = ksStat(before, after)
    const p = ksPValue(d, before.length, after.length)
    return { d, p, significant: p < 0.05 }
  }, [bojSeries])

  // ── Per-market data (all SIGNALS markets) ────────────────────────
  const perMarketSeries = useMemo(() => {
    const result = {}
    for (const market of SIGNALS_MARKETS) {
      const addr = market.address.toLowerCase()
      const snaps = snapshotSeries[addr] ?? []
      const byTs = {}
      for (const s of snaps) {
        if (!byTs[s.timestamp]) byTs[s.timestamp] = {}
        byTs[s.timestamp][s.outcomeIndex] = s.price
      }
      const sorted = Object.entries(byTs)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([ts, ot]) => {
          const maxIdx = Math.max(...Object.keys(ot).map(Number), market.outcomeLabels.length - 1)
          const pricesArr = []
          for (let i = 0; i <= maxIdx; i++) pricesArr.push(ot[i] ?? 0)
          const p = lmsrPrices(pricesArr)
          const siRaw = (market.hikeIndex != null && market.holdIndex != null)
            ? computeSIRaw(p, market.hikeIndex, market.holdIndex)
            : null
          return {
            timestamp: Number(ts),
            prices: p,
            siRaw,
            pHike: market.hikeIndex != null ? (p[market.hikeIndex] ?? 0) : null,
            pHold: market.holdIndex != null ? (p[market.holdIndex] ?? 0) : null,
          }
        })
      result[market.id] = sorted
    }
    return result
  }, [snapshotSeries])

  const perMarketPrices = useMemo(() => {
    const result = {}
    for (const market of SIGNALS_MARKETS) {
      const addr = market.address.toLowerCase()
      const raw = latestPrices[addr]
      result[market.id] = raw ? lmsrPrices(raw.map(p => p ?? 0)) : null
    }
    return result
  }, [latestPrices])

  const perMarketTrades = useMemo(() => {
    const result = {}
    for (const market of SIGNALS_MARKETS) {
      result[market.id] = trades.filter(t => t.market === market.address.toLowerCase())
    }
    return result
  }, [trades])

  // ── Lens 6: Demand Data ───────────────────────────────────────
  // Decision Lead Time: placeholder until official announcement available
  const dlt = null  // T_official - T_signal_threshold: computed post-resolution

  // Actionable Threshold: signal value at which action is triggered
  const actionableThreshold = useMemo(() => {
    // Calibrate: value of SI_raw where historical accuracy peaks
    if (bojSeries.length < 5) return { upper: 0.02, lower: -0.02 }
    const thresholds = [0.01, 0.02, 0.05, 0.1]
    let bestAcc = 0, bestUpper = 0.02
    for (const t of thresholds) {
      const preds = bojSeries.map(s => s.siRaw > t ? 1 : s.siRaw < -t ? -1 : 0)
      const actuals = bojSeries.map(s => s.pHike > 0.5 ? 1 : -1)
      const acc = preds.reduce((a, p, i) => a + (p === actuals[i] ? 1 : 0), 0) / preds.length
      if (acc > bestAcc) { bestAcc = acc; bestUpper = t }
    }
    return { upper: bestUpper, lower: -bestUpper, accuracy: bestAcc }
  }, [bojSeries])

  return {
    // BOJ
    bojPrices,
    siRaw,
    signal,
    bojSeries,
    bEstimate,
    bRegimeLabel: bRegime(bEstimate),

    // Signal Engineering
    signalZoo,
    variantICs,
    ensembleSignal,
    decomposition,
    compositeIndex,
    icByLag,
    kStar,
    les,
    divergenceSignal,

    // Lens 1 — Human Capital
    humanCapital,

    // Lens 2 — Social Capital
    jaccardMatrix,
    centralities,
    clusteringCCs,
    followerMults,
    scs,
    hs,
    resilience,

    // Lens 4
    globalLocalSpread,

    // Lens 5
    wfa,
    mcp,
    cg,
    rstResult,

    // Per-market
    perMarketSeries,
    perMarketPrices,
    perMarketTrades,

    // Lens 6
    dlt,
    actionableThreshold,
  }
}

// Internal helper exposed for NetworkTab
function rollingMean(arr, window) {
  const out = []
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) { out.push(null); continue }
    const slice = arr.slice(i - window + 1, i + 1)
    out.push(mean(slice))
  }
  return out
}
