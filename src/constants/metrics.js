// Metric identifiers, labels, and lens groupings for all 60 KPIs

export const METRIC_LABELS = {
  // Lens 1 — Human Capital
  RS:   'Response Speed',
  IC:   'Information Coefficient',
  CS:   'Correction Speed',
  BS:   'Brier Score',
  SR:   'Sophistication Ratio',
  LR:   'Learning Rate α',
  CA:   'Contrarian Alpha',
  IAS:  'Info Aggregation Share',
  NS:   'Noise Sensitivity',
  ShR:  'Shock Recovery',

  // Lens 2 — Social Capital
  J:    'Jaccard Similarity',
  CI:   'Centrality Score',
  DL:   'Diffusion Lead',
  CC:   'Clustering Coefficient',
  BI:   'Bridging Index',
  FM:   'Follower Multiplier',
  SCS:  'Sync Cluster Strength',
  IFE:  'Info Flow Efficiency',
  NR:   'Network Resilience',
  HS:   'Homophily Score',

  // Lens 3 — Signal Engineering
  IT:   'Composite Signal I_t',
  KS:   'Optimal Lag k*',
  SNR:  'Signal-to-Noise Ratio',
  Z:    'Z-Score',
  MD:   'Momentum Delta',
  AV:   'Attention Velocity',
  DS:   'Divergence Signal',
  DF:   'Decay Function',
  EA:   'Ensemble Agreement',
  LES:  'Leading Edge Strength',

  // Lens 4 — External Validity
  PS:   'Portability Score',
  LM:   'Liquidity Mismatch',
  TG:   'Translation Gap',
  IRD:  'Incentive ROI Delta',
  GLS:  'Global-Local Spread',
  CTP:  'Cascade Transfer Prob.',
  DS2:  'Depth Sensitivity',
  DD:   'Demographic Drift',
  SHP:  'Structure Hole Profit',
  VD:   'Validity Decay',

  // Lens 5 — Robustness
  WS:   'Window Sensitivity',
  NV:   'Normalisation Variance',
  OI:   'Outlier Impact',
  WFA:  'Walk-Forward Accuracy',
  SR2:  'Smoothing Robustness',
  AS:   'Assumption Stability',
  MCP:  'Monte Carlo Signal Pass',
  CG:   'Consensus Gate',
  RST:  'Regime Shift Test',
  RI:   'Reproducibility Index',

  // Lens 6 — Demand Data
  DLT:  'Decision Lead Time',
  HE:   'Hedging Efficiency',
  AT:   'Actionable Threshold',
  IAV:  'Info Asymmetry Value',
  RAW:  'Resource Alloc. Weight',
  FPC:  'False Positive Cost',
  SF:   'Signal Frequency',
  TA:   'Truth Alignment',
  AHL:  'Agent-Human Latency',
  VoI:  'Value of Information',
}

// Formulas, descriptions, and sources for info buttons
export const METRIC_INFO = {
  // Lens 1 — Human Capital
  RS:  { formula: 'RS = t_first_trade - t_announcement', description: 'Response Speed measures how quickly a trader places their first trade after a new policy signal. Faster responses suggest better information access or processing ability.', source: 'Cowgill & Zitzewitz (2015)' },
  IC:  { formula: 'IC = Pearson(signal_t, ΔP_{t+k*})', description: 'Information Coefficient is the Pearson correlation between a trader\'s signal (or position) and the subsequent price change at the optimal lag k*. IC > 0.05 is considered economically significant. NCM Ch.22 — Information Aggregation: IC measures each trader\'s contribution to the collective forecast.', source: 'Cowgill & Zitzewitz (2015); NCM Ch.22' },
  CS:  { formula: 'CS = Δposition after adverse move / time', description: 'Correction Speed measures how quickly a trader revises their position after an unfavorable market move, indicating adaptive learning behavior.', source: 'Kim (2012)' },
  BS:  { formula: 'BS = (1/N) Σ(fᵢ − oᵢ)²', description: 'Brier Score measures probabilistic forecast accuracy. Lower is better. BS < 0.20 = skilled, 0.20–0.35 = moderate, > 0.35 = poor. Penalizes overconfident wrong forecasts heavily. NCM Ch.15 — Strategic Behavior: BS calibrates when agents should reveal vs conceal private information.', source: 'Brier (1950); NCM Ch.15' },
  SR:  { formula: 'SR = P(trade in top quartile of price impact)', description: 'Sophistication Ratio measures how often a trader\'s trades are in the top quartile of price-moving trades, indicating informed trading behavior.', source: 'NCM (2009)' },
  LR:  { formula: 'LR = α in BS_{t+1} = α·BS_t + ε', description: 'Learning Rate is the coefficient from an AR(1) regression of Brier Scores over time. LR near 0 indicates rapid improvement; LR near 1 indicates static performance.', source: 'Kim (2012)' },
  CA:  { formula: 'CA = IC | trade against consensus', description: 'Contrarian Alpha measures IC computed only on trades that go against the prevailing market direction, capturing value from independent thinking.', source: 'Cowgill & Zitzewitz (2015)' },
  IAS: { formula: 'IAS_i = |Δprice_i| / Σ_j|Δprice_j|', description: 'Info Aggregation Share is the fraction of total market price movement attributable to trader i\'s trades, measuring their contribution to price discovery.', source: 'NCM (2009)' },
  NS:  { formula: 'NS = σ(positions) / σ(market price)', description: 'Noise Sensitivity is the ratio of a trader\'s position volatility to market price volatility. NS < 1 means the trader is less reactive than the market; NS > 1 suggests noise-driven behavior.', source: 'Kim (2012)' },
  ShR: { formula: 'ShR = recovery time after 2σ price shock', description: 'Shock Recovery measures how quickly (in trades) a trader returns to their pre-shock strategy after a 2-standard-deviation price event.', source: 'NCM (2009)' },

  // Lens 2 — Social Capital
  J:   { formula: 'J(i,j) = |M_i ∩ M_j| / |M_i ∪ M_j|', description: 'Jaccard Similarity measures co-participation overlap between two traders across all markets. J = 1 means they trade in exactly the same markets; J = 0 means no overlap. NCM Ch.3 — Strong/Weak Ties: high-J pairs form strong ties.', source: 'Jaccard (1901); NCM Ch.3' },
  CI:  { formula: 'CI = Σ_j J(i,j) · IAS_j', description: 'Centrality Score is the IAS-weighted sum of Jaccard similarities, measuring a trader\'s influence hub position in the trading network.', source: 'Borgatti (2005)' },
  DL:  { formula: 'DL = median(t_i_trade - t_lead_trade)', description: 'Diffusion Lead measures the median time difference between a trader\'s trades and those of higher-IC traders in their cluster, capturing information diffusion speed.', source: 'Golub & Jackson (2010)' },
  CC:  { formula: 'CC_i = (triangles_i) / (k_i(k_i-1)/2)', description: 'Clustering Coefficient measures the fraction of a trader\'s co-participants who also co-participate with each other, indicating tight subgroup formation.', source: 'Watts & Strogatz (1998)' },
  BI:  { formula: 'BI = 1 - CC_i (normalized)', description: 'Bridging Index identifies traders who connect otherwise disconnected clusters. High BI = bridges between groups; Low BI = embedded in a clique.', source: 'Burt (2004)' },
  FM:  { formula: 'FM_i = ΔParticipation after i\'s trade / baseline', description: 'Follower Multiplier measures how many additional trades from other wallets follow within 30 minutes of trader i\'s trade, indicating influence or information leadership. NCM Ch.17 — Network Effects: FM > 1 means the trader has positive externalities on market participation.', source: 'Golub & Jackson (2010); NCM Ch.17' },
  SCS: { formula: 'SCS = mean(IC_i) for i in top cluster', description: 'Sync Cluster Strength is the average IC of traders in the highest-Jaccard cluster, measuring collective predictive power of the tightest trading group.', source: 'NCM (2009)' },
  IFE: { formula: 'IFE = ΔPrice before vs after cluster trade', description: 'Info Flow Efficiency measures price improvement (price move in correct direction) for trades originating from high-centrality nodes vs low-centrality nodes.', source: 'Kim (2012)' },
  NR:  { formula: 'NR = 1 - (components after removing top node)', description: 'Network Resilience measures the fraction of network connectivity preserved after removing the most central trader, capturing dependency concentration risk.', source: 'Barabási (2016)' },
  HS:  { formula: 'HS = |J(same-group pairs) - J(cross-group pairs)|', description: 'Homophily Score measures the excess co-participation between traders in the same group (HC vs SC vs PM) relative to cross-group co-participation.', source: 'McPherson et al. (2001)' },

  // Lens 3 — Signal Engineering
  IT:  { formula: 'I_t = w₁·Z(P_{BOJ}) + w₂·Z(A_t)', description: 'Composite Signal Index combines the z-scored BOJ prediction market price and attention proxy with weights optimized by IC. I_t > 0 signals HIKE regime. NCM Ch.16 — Information Cascades: I_t spikes preceding SMA crossovers identify cascade onset.', source: 'NCM Ch.16' },
  KS:  { formula: 'k* = argmax_k IC(signal_t, ΔP_{t+k})', description: 'Optimal Lag k* is the lead time (in periods) that maximizes the Information Coefficient between the signal and future price changes. Tells you how many periods ahead the signal predicts.', source: 'Cowgill & Zitzewitz (2015)' },
  SNR: { formula: 'SNR = Var(trend) / Var(residual)', description: 'Signal-to-Noise Ratio is the ratio of systematic trend variance to residual noise variance in the decomposed signal. SNR > 1 means the signal has exploitable structure.', source: 'Kim (2012)' },
  Z:   { formula: 'Z_t = (x_t - μ_w) / σ_w  (rolling window w)', description: 'Z-Score standardizes the raw signal using a rolling mean and standard deviation, making it comparable across different time periods and scales.', source: 'Standard statistics' },
  MD:  { formula: 'MD_t = Ensemble_t - Ensemble_{t-1}', description: 'Momentum Delta is the first difference of the IC-weighted ensemble signal, measuring the velocity of signal change. Positive MD suggests building HIKE momentum.', source: 'NCM (2009)' },
  AV:  { formula: 'AV_t = ΔAttention_t / Δt', description: 'Attention Velocity measures the rate of change in the Wikipedia/Google Trends attention proxy, used as an exogenous signal for information demand.', source: 'Da et al. (2011)' },
  DS:  { formula: 'DS = P_BOJ(HIKE) - P_PM(HIKE)', description: 'Divergence Signal measures the gap between the internal SIGNALS market probability and the external Polymarket probability for the same event. Non-zero DS indicates potential arbitrage.', source: 'Cowgill & Zitzewitz (2015)' },
  DF:  { formula: 'DF(t) = exp(-λ·(T-t))', description: 'Decay Function weights recent signal observations more heavily as the event date approaches. λ is calibrated to the event\'s typical information arrival rate.', source: 'NCM (2009)' },
  EA:  { formula: 'EA = |{variants: IC > 0}| / |variants|', description: 'Ensemble Agreement is the fraction of the 6 signal variants (raw, MA-3, MA-5, Z-score, momentum, ratio) that have positive IC. EA = 1 means all variants agree on direction.', source: 'NCM (2009)' },
  LES: { formula: 'LES = IC_ensemble - max(IC_individual)', description: 'Leading Edge Strength measures the IC gain from combining signals via IC-weighted ensemble vs the single best individual variant. Positive LES validates diversification benefit.', source: 'Cowgill & Zitzewitz (2015)' },

  // Lens 4 — External Validity
  PS:  { formula: 'PS = IC_SIGNALS / IC_Polymarket', description: 'Portability Score measures whether the predictive relationship found in SIGNALS generalizes to Polymarket, testing external validity of the signal.', source: 'Cowgill & Zitzewitz (2015)' },
  LM:  { formula: 'LM = |b̂_SIGNALS - b̂_PM| / b̂_PM', description: 'Liquidity Mismatch measures the relative difference in LMSR market-maker cost parameters between SIGNALS and Polymarket, indicating structural differences.', source: 'Hanson (2003)' },
  TG:  { formula: 'TG = |P_JP_market - P_global_market|', description: 'Translation Gap measures how much the Japan-specific prediction market price diverges from globally-accessible prediction markets for the same underlying event.', source: 'Kim (2012)' },
  IRD: { formula: 'IRD = ROI_informed / ROI_uninformed - 1', description: 'Incentive ROI Delta measures the additional return to informed trading vs random trading, validating whether the market incentivizes information revelation.', source: 'Hanson (2003)' },
  GLS: { formula: 'GLS = P_SIGNALS - P_Polymarket (BOJ event)', description: 'Global-Local Spread is the signed difference between the SIGNALS internal probability and Polymarket probability for the BOJ rate decision, measuring information localization.', source: 'Cowgill & Zitzewitz (2015)' },
  CTP: { formula: 'CTP = P(Polymarket moves | SIGNALS moves first)', description: 'Cascade Transfer Probability estimates the conditional probability that a significant price move in SIGNALS is followed by a corresponding move in Polymarket within 24h.', source: 'Golub & Jackson (2010)' },
  DS2: { formula: 'DS2 = ∂P/∂b̂ evaluated at current b̂', description: 'Depth Sensitivity measures how sensitive the market price is to changes in the LMSR market depth parameter, identifying regimes where liquidity matters most.', source: 'Hanson (2003)' },
  DD:  { formula: 'DD = divergence(trader_demographics, market_demographics)', description: 'Demographic Drift measures mismatch between the demographic composition of SIGNALS traders vs the broader population likely affected by the policy decision.', source: 'NCM (2009)' },
  SHP: { formula: 'SHP = IC_bridge_trader - mean(IC_cluster)', description: 'Structure Hole Profit measures whether traders who bridge disconnected network clusters (high Bridging Index) earn above-average IC, validating Burt\'s structural holes theory.', source: 'Burt (2004)' },
  VD:  { formula: 'VD = IC_early_window / IC_full_window', description: 'Validity Decay measures whether the signal\'s predictive power decreases as the event approaches, indicating whether early information advantages dissipate.', source: 'Kim (2012)' },

  // Lens 5 — Robustness
  WS:  { formula: 'WS = std(IC) across window sizes {3,5,7,10}', description: 'Window Sensitivity measures how much the IC changes as the rolling window length varies. Low WS means the signal is robust to this parameter choice.', source: 'Lopez de Prado (2018)' },
  NV:  { formula: 'NV = std(IC) across normalization methods', description: 'Normalisation Variance measures IC stability across min-max, z-score, and rank normalizations. Low NV means results don\'t depend on pre-processing choices.', source: 'Lopez de Prado (2018)' },
  OI:  { formula: 'OI = |IC_full - IC_trimmed| / IC_full', description: 'Outlier Impact measures the relative change in IC when the top/bottom 5% of observations are removed, testing whether results are driven by extreme data points.', source: 'Lopez de Prado (2018)' },
  WFA: { formula: 'WFA = mean(accuracy on out-of-sample folds)', description: 'Walk-Forward Accuracy averages the directional accuracy of the signal on 5 rolling out-of-sample test windows. WFA > 0.55 suggests genuine predictive power. NCM Ch.18 — Power Laws: WFA tests whether signal strength follows a power-law vs noise floor.', source: 'Lopez de Prado (2018); NCM Ch.18' },
  SR2: { formula: 'SR2 = std(IC) across MA windows {3,5,7}', description: 'Smoothing Robustness (SR2) measures IC stability across different moving-average smoothing windows, testing whether the optimal MA-3 or MA-5 choice is sensitive.', source: 'NCM (2009)' },
  AS:  { formula: 'AS = P(signal direction consistent | random perturbation)', description: 'Assumption Stability measures the fraction of 100 small random perturbations to input data that preserve the same directional signal, testing local robustness.', source: 'Lopez de Prado (2018)' },
  MCP: { formula: 'MCP = P(IC > 0 | Monte Carlo resample)', description: 'Monte Carlo Signal Pass is the fraction of 500 bootstrap resamples in which the ensemble signal achieves positive IC. MCP > 0.90 means the signal is statistically robust. NCM Ch.18 — Power Laws: distinguishes genuine signal trends from statistical outliers.', source: 'Lopez de Prado (2018); NCM Ch.18' },
  CG:  { formula: 'CG = 1 if WFA > 0.55 AND MCP > 0.85 AND SNR > 1', description: 'Consensus Gate is a binary indicator that opens (= 1) only when three independent robustness checks all pass simultaneously, providing a conservative go/no-go signal.', source: 'NCM (2009)' },
  RST: { formula: 'KS-test: P(H₀: same distribution pre/post midpoint)', description: 'Regime Shift Test applies the Kolmogorov-Smirnov test to detect whether the signal distribution has changed significantly (p < 0.05) between the first and second half of the sample.', source: 'Kolmogorov (1933); Smirnov (1948)' },
  RI:  { formula: 'RI = P(same conclusion | different analyst)', description: 'Reproducibility Index estimates the probability that an independent analyst using the same methodology on the same data would reach the same qualitative conclusion.', source: 'Lopez de Prado (2018)' },

  // Lens 6 — Demand Data
  DLT: { formula: 'DLT = t_decision - t_signal_first_cross_AT', description: 'Decision Lead Time measures the median time between when the signal first crosses the Actionable Threshold and when a corresponding policy decision or market move occurs.', source: 'NCM (2009)' },
  HE:  { formula: 'HE = |ΔP_hedged| / cost_of_hedge', description: 'Hedging Efficiency measures the price protection per unit cost achieved by using prediction market positions as a hedge against real-world policy exposure.', source: 'Hanson (2003)' },
  AT:  { formula: 'AT±: percentile that maximizes classification accuracy', description: 'Actionable Threshold calibrates the upper/lower signal boundaries that optimally separate HIKE/HOLD outcomes, maximizing forecast accuracy while minimizing false positives.', source: 'NCM (2009)' },
  IAV: { formula: 'IAV = (WTP_informed - WTP_uninformed) / WTP_uninformed', description: 'Info Asymmetry Value measures the willingness-to-pay premium for informed vs uninformed positions, capturing the economic value of private information in this market.', source: 'Grossman & Stiglitz (1980)' },
  RAW: { formula: 'RAW = IC_i / Σ_j IC_j (softmax)', description: 'Resource Allocation Weight is the softmax-normalized IC score, providing optimal portfolio weights for combining signals from multiple traders or variants.', source: 'Cowgill & Zitzewitz (2015)' },
  FPC: { formula: 'FPC = P(HIKE predicted | HOLD actual) × cost_HIKE_error', description: 'False Positive Cost estimates the expected loss from acting on a false HIKE signal, helping calibrate the Actionable Threshold asymmetrically when costs differ.', source: 'NCM (2009)' },
  SF:  { formula: 'SF = |{t: |signal_t| > AT}| / T', description: 'Signal Frequency is the fraction of time periods in which the signal exceeds the Actionable Threshold, measuring how often the model generates tradeable signals.', source: 'NCM (2009)' },
  TA:  { formula: 'TA = P(signal direction = realized outcome)', description: 'Truth Alignment is the simple directional accuracy of the final signal prediction vs the realized BOJ decision outcome, measuring end-to-end forecasting correctness.', source: 'Brier (1950)' },
  AHL: { formula: 'AHL = t_human_response - t_signal_cross_AT', description: 'Agent-Human Latency measures the delay between when the signal crosses the Actionable Threshold and when a human trader actually places a corresponding trade, identifying response bottlenecks.', source: 'Kim (2012)' },
  VoI: { formula: 'VoI = E[payoff|signal] - E[payoff|no signal]', description: 'Value of Information quantifies the expected improvement in decision payoff from having access to the SIGNALS prediction market vs making uninformed decisions, measured in basis points.', source: 'Grossman & Stiglitz (1980); Hanson (2003)' },
}

export const LENS_GROUPS = {
  'Human Capital':     ['RS','IC','CS','BS','SR','LR','CA','IAS','NS','ShR'],
  'Social Capital':    ['J','CI','DL','CC','BI','FM','SCS','IFE','NR','HS'],
  'Signal Engineering':['IT','KS','SNR','Z','MD','AV','DS','DF','EA','LES'],
  'External Validity': ['PS','LM','TG','IRD','GLS','CTP','DS2','DD','SHP','VD'],
  'Robustness':        ['WS','NV','OI','WFA','SR2','AS','MCP','CG','RST','RI'],
  'Demand Data':       ['DLT','HE','AT','IAV','RAW','FPC','SF','TA','AHL','VoI'],
}
