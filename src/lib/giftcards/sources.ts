import type { GiftCardSource } from './types.ts'

/**
 * Curated registry of places that hand out gift cards without you paying for them.
 *
 * Everything here is a first-party program or a mainstream aggregator. Nothing in
 * this file promises free codes, "generators", or unlimited balances — those are
 * always scams, and `scam-filter.ts` exists to keep them out of the results.
 *
 * Monthly value ranges are deliberately unglamorous. They reflect what a regular
 * person actually clears, not the numbers on referral blogs.
 */
export const SOURCES: GiftCardSource[] = [
  // ---------------------------------------------------------------- rewards
  {
    id: 'microsoft-rewards',
    name: 'Microsoft Rewards',
    kind: 'program',
    category: 'rewards-program',
    url: 'https://rewards.bing.com/',
    brands: ['Amazon', 'Starbucks', 'Xbox', 'Walmart', 'Target'],
    regions: ['US', 'GB', 'CA', 'AU', 'DE', 'FR'],
    effort: 'passive',
    monthlyValueUsd: [3, 8],
    payoutThresholdUsd: 5,
    requiresPurchase: false,
    notes:
      'Points for Bing searches, daily quizzes and Xbox activity. The daily set takes about three minutes. Highest effort-to-value ratio on this list, but capped low by daily point limits.',
  },
  {
    id: 'google-opinion-rewards',
    name: 'Google Opinion Rewards',
    kind: 'program',
    category: 'survey-gpt',
    url: 'https://play.google.com/store/apps/details?id=com.google.android.apps.paidtasks',
    brands: ['Google Play'],
    regions: ['US', 'GB', 'CA', 'AU', 'IN'],
    effort: 'passive',
    monthlyValueUsd: [1, 5],
    requiresPurchase: false,
    notes:
      'Short surveys triggered by places you visit. Pays Google Play credit on Android and PayPal cash on iOS. Survey frequency is out of your control.',
  },

  // --------------------------------------------------------------- surveys
  {
    id: 'swagbucks',
    name: 'Swagbucks',
    kind: 'program',
    category: 'survey-gpt',
    url: 'https://www.swagbucks.com/',
    brands: ['Amazon', 'Walmart', 'Target', 'Starbucks', 'PayPal'],
    regions: ['US', 'GB', 'CA', 'AU', 'IE'],
    effort: 'medium',
    monthlyValueUsd: [10, 40],
    payoutThresholdUsd: 3,
    requiresPurchase: false,
    notes:
      'Surveys, offers and cashback in one account. Pays reliably, but the effective hourly rate on surveys is low and you will get screened out of many of them after answering several minutes of questions.',
  },
  {
    id: 'inboxdollars',
    name: 'InboxDollars',
    kind: 'program',
    category: 'survey-gpt',
    url: 'https://www.inboxdollars.com/',
    brands: ['Amazon', 'Walmart', 'Target', 'PayPal'],
    regions: ['US'],
    effort: 'medium',
    monthlyValueUsd: [5, 25],
    payoutThresholdUsd: 15,
    requiresPurchase: false,
    notes:
      'Surveys, paid emails and games. Balances are shown in dollars rather than points, which makes the low rates obvious. Note the higher cash-out threshold.',
  },
  {
    id: 'mypoints',
    name: 'MyPoints',
    kind: 'program',
    category: 'survey-gpt',
    url: 'https://www.mypoints.com/',
    brands: ['Amazon', 'Walmart', 'Target', 'Home Depot'],
    regions: ['US', 'CA'],
    effort: 'medium',
    monthlyValueUsd: [5, 25],
    payoutThresholdUsd: 3,
    requiresPurchase: false,
    notes:
      'Same operator as Swagbucks. Best used for its shopping portal rather than its surveys — the portal stacks with card rewards.',
  },
  {
    id: 'prizerebel',
    name: 'PrizeRebel',
    kind: 'program',
    category: 'survey-gpt',
    url: 'https://www.prizerebel.com/',
    brands: ['Amazon', 'Visa', 'Steam', 'PayPal'],
    regions: ['WW'],
    effort: 'medium',
    monthlyValueUsd: [10, 50],
    payoutThresholdUsd: 2,
    requiresPurchase: false,
    notes:
      'Long-running survey router with fast redemptions and a low threshold. Available in most countries, though survey supply outside the US and UK is thin.',
  },
  {
    id: 'freecash',
    name: 'Freecash',
    kind: 'program',
    category: 'survey-gpt',
    url: 'https://freecash.com/',
    brands: ['Amazon', 'Visa', 'Steam', 'PayPal'],
    regions: ['WW'],
    effort: 'medium',
    monthlyValueUsd: [10, 60],
    payoutThresholdUsd: 5,
    requiresPurchase: false,
    notes:
      'Mostly game and app offers rather than surveys. The high-paying offers expect days of play or in-app spending — read each offer\'s completion terms before starting one.',
  },

  // ------------------------------------------------------ receipts/cashback
  {
    id: 'fetch',
    name: 'Fetch',
    kind: 'program',
    category: 'receipt-scanning',
    url: 'https://fetch.com/',
    brands: ['Amazon', 'Walmart', 'Target', 'Starbucks', 'Visa'],
    regions: ['US'],
    effort: 'passive',
    monthlyValueUsd: [2, 8],
    payoutThresholdUsd: 3,
    requiresPurchase: false,
    notes:
      'Photograph any receipt you already have. No purchase is required beyond shopping you would do anyway, though bonus points target specific brands. Points per receipt are small; the value comes from never skipping one.',
  },
  {
    id: 'ibotta',
    name: 'Ibotta',
    kind: 'program',
    category: 'cashback',
    url: 'https://ibotta.com/',
    brands: ['Amazon', 'Walmart', 'Target', 'Visa'],
    regions: ['US'],
    effort: 'low',
    monthlyValueUsd: [5, 25],
    payoutThresholdUsd: 20,
    requiresPurchase: true,
    notes:
      'Grocery rebates you activate before shopping. Only pays on specific products, so it nudges you toward brands you would not otherwise buy — a real cost that offsets the rebate.',
  },
  {
    id: 'receipt-hog',
    name: 'Receipt Hog',
    kind: 'program',
    category: 'receipt-scanning',
    url: 'https://www.receipthog.com/',
    brands: ['Amazon', 'Visa', 'PayPal'],
    regions: ['US'],
    effort: 'passive',
    monthlyValueUsd: [2, 5],
    payoutThresholdUsd: 5,
    requiresPurchase: false,
    notes:
      'Sells your anonymised shopping data back to market researchers. Slow to accumulate, but genuinely passive if you are already scanning receipts for Fetch.',
  },
  {
    id: 'rakuten',
    name: 'Rakuten',
    kind: 'program',
    category: 'cashback',
    url: 'https://www.rakuten.com/',
    brands: ['Amazon', 'Visa', 'PayPal'],
    regions: ['US', 'CA', 'GB'],
    effort: 'low',
    monthlyValueUsd: [5, 50],
    requiresPurchase: true,
    notes:
      'Cashback for clicking through before an online purchase. Pays quarterly. Worth it only for purchases you had already decided on — treat the percentage as a discount, never as a reason to buy.',
  },
  {
    id: 'shopkick',
    name: 'Shopkick',
    kind: 'program',
    category: 'loyalty',
    url: 'https://www.shopkick.com/',
    brands: ['Amazon', 'Walmart', 'Target', 'Starbucks'],
    regions: ['US'],
    effort: 'low',
    monthlyValueUsd: [2, 10],
    payoutThresholdUsd: 2,
    requiresPurchase: false,
    notes:
      'Points for walking into partner stores and scanning barcodes on the shelf. No purchase needed, which makes it unusual, but it only pays if those stores are already on your route.',
  },

  // --------------------------------------------------------- store loyalty
  {
    id: 'best-buy-my-best-buy',
    name: 'My Best Buy (Best Buy)',
    kind: 'program',
    category: 'loyalty',
    url: 'https://www.bestbuy.com/',
    brands: ['Best Buy'],
    regions: ['US'],
    effort: 'passive',
    monthlyValueUsd: [0, 15],
    requiresPurchase: true,
    notes:
      'Points convert to Best Buy reward certificates, which spend like store gift cards. Free to join, but it only pays out against electronics you were buying anyway.',
  },
  {
    id: 'starbucks-rewards',
    name: 'Starbucks Rewards',
    kind: 'program',
    category: 'loyalty',
    url: 'https://www.starbucks.com/rewards',
    brands: ['Starbucks'],
    regions: ['US', 'CA', 'GB'],
    effort: 'passive',
    monthlyValueUsd: [0, 20],
    requiresPurchase: true,
    notes:
      'Stars convert to free drinks and food rather than a transferable card. Games and bonus-star challenges are where most of the value sits, and they need opting in each time.',
  },
  {
    id: 'target-circle',
    name: 'Target Circle',
    kind: 'program',
    category: 'loyalty',
    url: 'https://www.target.com/circle',
    brands: ['Target'],
    regions: ['US'],
    effort: 'passive',
    monthlyValueUsd: [0, 15],
    requiresPurchase: true,
    notes:
      'Free tier gives 1% back as Target credit plus frequent gift-card-with-purchase promotions, which are the actual prize here — Target runs "spend $50, get a $10 gift card" deals most weeks.',
  },

  // ---------------------------------------------------------- card rewards
  {
    id: 'issuer-rewards-portals',
    name: 'Credit card reward portals',
    kind: 'program',
    category: 'bank-credit',
    url: 'https://www.chase.com/',
    discoveryUrls: ['https://www.americanexpress.com/'],
    brands: ['Amazon', 'Walmart', 'Target', 'Starbucks', 'Home Depot', 'Airlines'],
    regions: ['US'],
    effort: 'passive',
    monthlyValueUsd: [10, 100],
    requiresPurchase: true,
    notes:
      'Points you have already earned redeem for gift cards inside your issuer\'s rewards portal, sometimes above 1 cent per point. The largest number on this list, and the most conditional — it is only free if you carry no balance, since interest dwarfs any rewards.',
  },

  // ------------------------------------------------------- overlooked money
  {
    id: 'unclaimed-property',
    name: 'State unclaimed property',
    kind: 'program',
    category: 'rewards-program',
    url: 'https://www.unclaimed.org/',
    discoveryUrls: ['https://www.missingmoney.com/'],
    brands: ['Cash', 'Store credit'],
    regions: ['US'],
    effort: 'low',
    monthlyValueUsd: [0, 0],
    // Most searches return nothing; a minority return hundreds. Ranking hint only.
    oneTimeUpsideUsd: 75,
    requiresPurchase: false,
    notes:
      'Not recurring, but the highest-value single search here. States hold dormant balances including forgotten store credit and unredeemed gift certificates. Official state sites never charge a fee — anyone asking for one is a middleman.',
  },

  // -------------------------------------------------------------- feeds
  {
    id: 'slickdeals-gift-cards',
    name: 'Slickdeals — gift cards',
    kind: 'feed',
    category: 'deal-feed',
    url: 'https://slickdeals.net/',
    discoveryUrls: ['https://slickdeals.net/deals/gift-cards/'],
    brands: [],
    regions: ['US'],
    effort: 'low',
    monthlyValueUsd: [0, 30],
    requiresPurchase: false,
    notes:
      'Community-vetted feed. Catches gift-card-with-purchase promotions and discounted denominations. Front-page votes are a decent proxy for whether an offer actually works.',
  },
  {
    id: 'dealnews-gift-cards',
    name: 'DealNews — gift cards',
    kind: 'feed',
    category: 'deal-feed',
    url: 'https://www.dealnews.com/',
    discoveryUrls: ['https://www.dealnews.com/c142/Gift-Cards/'],
    brands: [],
    regions: ['US'],
    effort: 'low',
    monthlyValueUsd: [0, 20],
    requiresPurchase: false,
    notes:
      'Editorially filtered, so less noise than a community feed, and it flags the free-gift-card-with-purchase promotions that retailers run on a weekly cycle.',
  },
  {
    id: 'reddit-freebies',
    name: 'r/freebies',
    kind: 'feed',
    category: 'deal-feed',
    url: 'https://www.reddit.com/r/freebies/',
    discoveryUrls: ['https://www.reddit.com/r/freebies/new.json?limit=50'],
    parser: 'reddit-json',
    brands: [],
    regions: ['WW'],
    effort: 'low',
    monthlyValueUsd: [0, 15],
    requiresPurchase: false,
    notes:
      'Genuinely free promotions, mixed with referral spam. Reddit rate-limits anonymous traffic, so this source will intermittently come back unreachable.',
  },
  {
    id: 'reddit-beermoney',
    name: 'r/beermoney',
    kind: 'feed',
    category: 'deal-feed',
    url: 'https://www.reddit.com/r/beermoney/',
    discoveryUrls: ['https://www.reddit.com/r/beermoney/new.json?limit=50'],
    parser: 'reddit-json',
    brands: [],
    regions: ['WW'],
    effort: 'medium',
    monthlyValueUsd: [0, 40],
    requiresPurchase: false,
    notes:
      'Where new earning programs surface first, along with the reports of which ones stopped paying. Assume every link is a referral link.',
  },
]

export function getSource(id: string): GiftCardSource | undefined {
  return SOURCES.find((source) => source.id === id)
}
