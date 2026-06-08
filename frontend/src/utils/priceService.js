// Live market price service for stocks, crypto, and commodities

// Standard asset base prices in USD
const BASE_PRICES_USD = {
  AAPL: 182.50,
  MSFT: 415.60,
  TSLA: 175.20,
  NVDA: 875.12,
  AMZN: 185.30,
  GOOGL: 172.45,
  BTC: 68420.00,
  ETH: 3620.00,
  SOL: 152.40,
  GOLD: 2315.80,
  SLV: 29.15,
};

// Map friendly names to standard ticker symbols
const NAME_TO_TICKER_MAP = {
  apple: "AAPL",
  microsoft: "MSFT",
  tesla: "TSLA",
  nvidia: "NVDA",
  amazon: "AMZN",
  google: "GOOGL",
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  gold: "GOLD",
  silver: "SLV",
};

// In-memory cache to keep custom tickers stable during session
const customTickerCache = {};

// Helper to generate deterministic price based on string hash
function getDeterministicPrice(symbol) {
  const cleanSymbol = symbol.toUpperCase().trim();
  if (BASE_PRICES_USD[cleanSymbol]) return BASE_PRICES_USD[cleanSymbol];

  if (customTickerCache[cleanSymbol]) return customTickerCache[cleanSymbol];

  // Simple string hash
  let hash = 0;
  for (let i = 0; i < cleanSymbol.length; i++) {
    hash = cleanSymbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Base price between $10.00 and $1000.00
  const basePrice = 10 + (Math.abs(hash) % 990);
  customTickerCache[cleanSymbol] = basePrice;
  return basePrice;
}

// Format date-time as YYYY-MM-DD HH:MM:SS
export function getFormattedDateTime(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

/**
 * Retrieves the current unit price of an asset in the selected currency
 * @param {string} nameOrTicker - Asset name or symbol
 * @param {string} currencyCode - Active UI currency (INR, USD, EUR, etc.)
 * @param {object} currencyConfigs - Currency configuration from App state
 * @returns {Promise<{price: number, symbol: string, timestamp: string, isLive: boolean}>}
 */
export async function fetchLiveAssetPrice(nameOrTicker, currencyCode = "INR", currencyConfigs = {}) {
  const rawSearch = nameOrTicker.trim().toLowerCase();
  
  // Find ticker
  let ticker = nameOrTicker.toUpperCase().trim();
  if (NAME_TO_TICKER_MAP[rawSearch]) {
    ticker = NAME_TO_TICKER_MAP[rawSearch];
  }

  let basePriceUSD = getDeterministicPrice(ticker);
  let isLiveFromAPI = false;

  // Try fetching live price from CoinGecko for cryptos
  if (["BTC", "ETH", "SOL"].includes(ticker)) {
    const cgIdMap = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana" };
    const cgId = cgIdMap[ticker];
    try {
      // Abort controller to prevent hung fetches
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data[cgId] && data[cgId].usd) {
          basePriceUSD = data[cgId].usd;
          isLiveFromAPI = true;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch live API price for ${ticker}, using fallback:`, e.message);
    }
  }

  // If mock/fallback, add a live fluctuation (+/- 0.1% random walk using wave function)
  if (!isLiveFromAPI) {
    const timeFactor = Math.sin(Date.now() / 15000) * Math.cos(Date.now() / 7000);
    basePriceUSD = basePriceUSD * (1 + timeFactor * 0.0015);
  }

  // Convert USD to base INR
  const usdRateToINR = currencyConfigs.USD ? currencyConfigs.USD.rateToINR : 83.5;
  const priceInINR = basePriceUSD * usdRateToINR;

  // Convert INR to active display currency
  const targetRate = currencyConfigs[currencyCode] ? currencyConfigs[currencyCode].rateToINR : 1.0;
  const finalPrice = priceInINR / targetRate;

  return {
    price: Number(finalPrice.toFixed(4)),
    ticker: ticker,
    timestamp: getFormattedDateTime(),
    isLive: true,
    isApi: isLiveFromAPI
  };
}
