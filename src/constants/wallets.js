export const WALLETS = [
  { name: 'Ren',   address: '0x50cce3a946cd632bf744ab8191f3adccc92a009d', group: 'original' },
  { name: 'Yuki',  address: '0x4f495441bbcce8295b8618e5fdae5601b09374fc', group: 'original' },
  { name: 'Min',   address: '0xe2f7d81d6104356ad922fefd1b890a76910fb628', group: 'original' },
  { name: 'Rin',   address: '0xa56b2cc2f98003f155a93f4445f6107e1f88d65c', group: 'original' },
  { name: 'Jimin', address: '0x06acf88a558fd583486e0dccb889ca5fc22e57e6', group: 'additional' },
  { name: 'Jo',    address: '0x16a429bf0c66ac773819fbdbafaf750a591b6731', group: 'additional' },
  { name: 'Yui',   address: '0x314c9f11219e205878ba3e5520ff4fd82f8860b9', group: 'additional' },
  { name: 'Yuri',  address: '0xdeae33acea80d75f16c8beb9e87097ee9b0782c0', group: 'additional' },
  { name: 'Yasu',  address: '0x1ff7390812a340c81d803b718a46da9a61ec3693', group: 'additional' },
]

// address (lowercase) → name
export const WALLET_MAP = Object.fromEntries(
  WALLETS.map(w => [w.address.toLowerCase(), w.name])
)

export const WALLET_ADDRESSES = WALLETS.map(w => w.address.toLowerCase())
