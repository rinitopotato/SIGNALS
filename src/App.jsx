import { useState, useEffect } from 'react'
import TabBar from './components/layout/TabBar.jsx'
import StatusBar from './components/layout/StatusBar.jsx'
import LoadingSpinner from './components/layout/LoadingSpinner.jsx'
import OverviewTab from './tabs/OverviewTab.jsx'
import SignalsTab from './tabs/SignalsTab.jsx'
import PolymarketTab from './tabs/PolymarketTab.jsx'
import SignalEngineeringTab from './tabs/SignalEngineeringTab.jsx'
import NetworkTab from './tabs/NetworkTab.jsx'
import PlayersTab from './tabs/PlayersTab.jsx'
import AnalyticsTab from './tabs/AnalyticsTab.jsx'
import PredictionsTab from './tabs/PredictionsTab.jsx'
import useGoldsky from './hooks/useGoldsky.js'
import usePolymarket from './hooks/usePolymarket.js'
import useAttention from './hooks/useAttention.js'
import useDerivedMetrics from './hooks/useDerivedMetrics.js'

const TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'signals',      label: 'SIGNALS (3 Markets)' },
  { id: 'polymarket',   label: 'Polymarket' },
  { id: 'predictions',  label: 'Predictions' },
  { id: 'signal-eng',   label: 'Signal Engineering' },
  { id: 'network',      label: 'Network + HC/SC' },
  { id: 'players',      label: 'Players' },
  { id: 'analytics',    label: 'Analytics' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')

  // ── Theme (dark / light) ────────────────────────────────────────
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('signals-theme') ?? 'dark'
  )
  useEffect(() => {
    document.body.classList.toggle('light-mode', theme === 'light')
    localStorage.setItem('signals-theme', theme)
  }, [theme])
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const goldsky    = useGoldsky()
  const polymarket = usePolymarket()
  const attention  = useAttention()

  const metrics = useDerivedMetrics({
    trades:         goldsky.trades,
    snapshots:      goldsky.snapshots,
    pmEvents:       polymarket.events,
    attentionProxy: attention.attentionProxy,
  })

  const isInitialLoading = goldsky.isLoading && !goldsky.trades.length

  function renderTab() {
    if (isInitialLoading) return <LoadingSpinner message="Fetching SIGNALS blockchain data…" />

    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            trades={goldsky.trades}
            snapshots={goldsky.snapshots}
            metrics={metrics}
            perMarketData={attention.perMarketData}
          />
        )
      case 'signals':
        return <SignalsTab snapshots={goldsky.snapshots} />
      case 'polymarket':
        return (
          <PolymarketTab
            events={polymarket.events}
            isLoading={polymarket.isLoading}
          />
        )
      case 'predictions':
        return (
          <PredictionsTab
            metrics={metrics}
            trades={goldsky.trades}
            snapshots={goldsky.snapshots}
            pmEvents={polymarket.events}
          />
        )
      case 'signal-eng':
        return (
          <SignalEngineeringTab
            bojSeries={metrics.bojSeries ?? []}
            metrics={metrics}
            snapshots={goldsky.snapshots}
            perMarketData={attention.perMarketData}
          />
        )
      case 'network':
        return <NetworkTab metrics={metrics} trades={goldsky.trades} snapshots={goldsky.snapshots} />
      case 'players':
        return (
          <PlayersTab
            trades={goldsky.trades}
            humanCapital={metrics.humanCapital ?? []}
          />
        )
      case 'analytics':
        return (
          <AnalyticsTab
            metrics={metrics}
            bojSeries={metrics.bojSeries ?? []}
            humanCapital={metrics.humanCapital ?? []}
            trades={goldsky.trades}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="app-shell">
      <StatusBar
        goldskyTs={goldsky.lastFetchedAt}
        polymarketTs={polymarket.lastFetchedAt}
        attentionTs={attention.lastFetchedAt}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="app-main">
        {renderTab()}
      </main>
    </div>
  )
}
