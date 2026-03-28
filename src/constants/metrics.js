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

export const LENS_GROUPS = {
  'Human Capital':     ['RS','IC','CS','BS','SR','LR','CA','IAS','NS','ShR'],
  'Social Capital':    ['J','CI','DL','CC','BI','FM','SCS','IFE','NR','HS'],
  'Signal Engineering':['IT','KS','SNR','Z','MD','AV','DS','DF','EA','LES'],
  'External Validity': ['PS','LM','TG','IRD','GLS','CTP','DS2','DD','SHP','VD'],
  'Robustness':        ['WS','NV','OI','WFA','SR2','AS','MCP','CG','RST','RI'],
  'Demand Data':       ['DLT','HE','AT','IAV','RAW','FPC','SF','TA','AHL','VoI'],
}
