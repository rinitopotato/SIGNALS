export const SIGNALS_MARKETS = [
  {
    id: 'boj',
    name: '日銀金利',
    nameEn: 'BOJ Policy Rate',
    address: '0x7111be1721d42a704dd8004e12da7879f255a695',
    outcomeLabels: [
      '0.25%引上げ',
      '0.50%引上げ',
      '据置き（変化なし）',
      '0.25%引下げ',
      'それ以外',
    ],
    // index 0 = HIKE, index 2 = HOLD for SI_raw computation
    hikeIndex: 0,
    holdIndex: 2,
    colors: ['#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f87171'],
  },
  {
    id: 'sendai',
    name: '仙台旅行',
    nameEn: 'Sendai Travel Factor',
    address: '0xa2109bee9a89d8c68fd3483f4d1fa97c31fae7c2',
    outcomeLabels: ['食べ物・グルメ', '祭り・イベント', '季節・桜', 'ビジネス・出張', 'その他'],
    hikeIndex: null,
    holdIndex: null,
    colors: ['#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f87171'],
  },
  {
    id: 'showa',
    name: '昭和コンテンツ',
    nameEn: 'Showa Content',
    address: '0xe7eb0adca5d823aa19c73f6f619bf7f116c14fff',
    outcomeLabels: ['アニメ・漫画', '音楽・歌謡曲', '映画・ドラマ', 'スポーツ', 'その他'],
    hikeIndex: null,
    holdIndex: null,
    colors: ['#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f87171'],
  },
]

export const SIGNALS_MARKET_MAP = Object.fromEntries(
  SIGNALS_MARKETS.map(m => [m.address.toLowerCase(), m])
)

export const POLYMARKET_EVENTS = [
  {
    slug: 'top-spotify-artist-2026',
    label: 'Top Spotify Artist 2026',
  },
  {
    slug: '2026-fifa-world-cup-winner-595',
    label: 'FIFA World Cup 2026',
  },
  {
    slug: 'iran-leader-end-of-2026',
    label: 'Iran Leader End of 2026',
  },
]

// BOJ Signal Index thresholds
export const BOJ_SI_PARAMS = {
  hikeThreshold: 0.02,
  holdThreshold: -0.02,
}

// Wikipedia articles for attention proxy
export const WIKI_ARTICLES = {
  sendai: [
    '青葉まつり',
    '仙台七夕まつり',
    '牛タン',
    'ずんだもち',
    '仙台城',
  ],
  boj: [
    '日本銀行',
    '植田和男',
    '金融政策決定会合',
  ],
  showa: [
    '黒澤明',
    'ゴジラ',
    '宮崎駿',
  ],
}

// Per-market keyword groups for Google Trends display
export const TREND_KEYWORD_GROUPS = {
  boj: {
    label: 'BOJ RATE',
    color: '#6c8fff',
    keywords: ['日銀 金利', 'BOJ interest rate'],
    wikiArticles: WIKI_ARTICLES.boj,
  },
  sendai: {
    label: 'SENDAI TRAVEL',
    color: '#34d399',
    keywords: ['仙台 旅行', '牛たん 仙台'],
    wikiArticles: WIKI_ARTICLES.sendai,
  },
  showa: {
    label: 'SHOWA CONTENT',
    color: '#a78bfa',
    keywords: ['黒澤明', 'ゴジラ', '宮崎駿'],
    wikiArticles: WIKI_ARTICLES.showa,
  },
}
