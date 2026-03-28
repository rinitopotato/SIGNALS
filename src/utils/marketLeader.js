import { pearson } from './statistics.js'

/**
 * Compute the market leader (top trader) for a given SIGNALS market.
 *
 * Ranking: primary = tradeCount desc, secondary = IC desc (BOJ only).
 *
 * @param {Array} trades - all trades from Goldsky (already market-filtered by caller, or unfiltered)
 * @param {Object} market - SIGNALS_MARKETS entry
 * @param {Array} wallets - WALLETS constant
 * @param {Array} [bojSeries] - optional, used to compute IC for BOJ markets
 * @returns {{ wallet, tradeCount, ic, shareOfVolume } | null}
 */
export function computeMarketLeader(trades, market, wallets, bojSeries) {
  const marketTrades = trades.filter(t => t.market === market.address.toLowerCase())
  if (!marketTrades.length) return null

  const totalTrades = marketTrades.length

  const grouped = wallets.map(wallet => {
    const myTrades = marketTrades.filter(t => t.trader === wallet.address.toLowerCase())
    const tradeCount = myTrades.length

    let ic = null
    if (
      tradeCount >= 3 &&
      market.hikeIndex != null &&
      bojSeries && bojSeries.length > 0
    ) {
      const dirs = myTrades.map(t => (t.type === 'buy' || t.type === 'BUY') ? 1 : -1)
      const deltas = myTrades.map(t => {
        const snap = bojSeries.find(s => Math.abs(s.timestamp - (t.timestamp + 86400)) < 3600)
        return snap ? snap.pHike - (bojSeries[0]?.pHike ?? 0.5) : 0
      })
      const valid = dirs.map((d, i) => ({ d, p: deltas[i] })).filter(x => x.p !== 0)
      if (valid.length >= 3) {
        ic = pearson(valid.map(x => x.d), valid.map(x => x.p))
      }
    }

    return {
      wallet,
      tradeCount,
      ic,
      shareOfVolume: totalTrades > 0 ? tradeCount / totalTrades : 0,
    }
  })

  const ranked = grouped
    .filter(e => e.tradeCount > 0)
    .sort((a, b) => {
      if (b.tradeCount !== a.tradeCount) return b.tradeCount - a.tradeCount
      const aIC = a.ic ?? -Infinity
      const bIC = b.ic ?? -Infinity
      return bIC - aIC
    })

  return ranked[0] ?? null
}
