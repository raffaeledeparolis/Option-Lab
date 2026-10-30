import { UnderlyingAsset, SearchResultAsset } from '../types/options';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface BybitTickerItem {
  symbol: string;
  lastPrice: string;
  prevPrice24h: string;
  price24hPcnt: string;
  highPrice24h: string;
  lowPrice24h: string;
  volume24h: string;
}

// In-memory cache for Bybit spot tickers
let bybitTickersCache: { data: BybitTickerItem[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Curated popular assets for instant recommendations
export const POPULAR_ASSETS: SearchResultAsset[] = [
  // Crypto
  { symbol: 'BTC', name: 'Bitcoin (BTC/USDT)', category: 'CRYPTO', exchange: 'Bybit Spot', isPopular: true },
  { symbol: 'ETH', name: 'Ethereum (ETH/USDT)', category: 'CRYPTO', exchange: 'Bybit Spot', isPopular: true },
  { symbol: 'SOL', name: 'Solana (SOL/USDT)', category: 'CRYPTO', exchange: 'Bybit Spot', isPopular: true },
  { symbol: 'XRP', name: 'Ripple (XRP/USDT)', category: 'CRYPTO', exchange: 'Bybit Spot', isPopular: true },
  { symbol: 'DOGE', name: 'Dogecoin (DOGE/USDT)', category: 'CRYPTO', exchange: 'Bybit Spot', isPopular: true },
  { symbol: 'AVAX', name: 'Avalanche (AVAX/USDT)', category: 'CRYPTO', exchange: 'Bybit Spot', isPopular: true },
  { symbol: 'LINK', name: 'Chainlink (LINK/USDT)', category: 'CRYPTO', exchange: 'Bybit Spot', isPopular: true },
  // Major Indices & Tech Equities
  { symbol: 'SPX', name: 'S&P 500 Index', category: 'INDEX', exchange: 'CBOE', isPopular: true },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'ETF', exchange: 'NYSE Arca', isPopular: true },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', category: 'ETF', exchange: 'NASDAQ', isPopular: true },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'EQUITY', exchange: 'NASDAQ', isPopular: true },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'EQUITY', exchange: 'NASDAQ', isPopular: true },
  { symbol: 'TSLA', name: 'Tesla, Inc.', category: 'EQUITY', exchange: 'NASDAQ', isPopular: true },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'EQUITY', exchange: 'NASDAQ', isPopular: true },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', category: 'EQUITY', exchange: 'NASDAQ', isPopular: true },
  { symbol: 'MSTR', name: 'MicroStrategy Incorporated', category: 'EQUITY', exchange: 'NASDAQ', isPopular: true },
  { symbol: 'META', name: 'Meta Platforms, Inc.', category: 'EQUITY', exchange: 'NASDAQ', isPopular: true },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', category: 'EQUITY', exchange: 'NASDAQ', isPopular: true },
  // Commodities & FX
  { symbol: 'GLD', name: 'SPDR Gold Shares ETF', category: 'ETF', exchange: 'NYSE Arca', isPopular: true },
  { symbol: 'SLV', name: 'iShares Silver Trust', category: 'ETF', exchange: 'NYSE Arca', isPopular: true },
  { symbol: 'EURUSD', name: 'EUR / USD Spot FX', category: 'FX', exchange: 'Forex', isPopular: true },
];

/**
 * Fetch and cache all Bybit spot tickers
 */
async function getBybitSpotTickers(): Promise<BybitTickerItem[]> {
  const now = Date.now();
  if (bybitTickersCache && now - bybitTickersCache.timestamp < CACHE_TTL_MS) {
    return bybitTickersCache.data;
  }

  try {
    const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot', {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) return bybitTickersCache?.data || [];
    const json: any = await response.json();
    if (json.retCode === 0 && Array.isArray(json.result?.list)) {
      bybitTickersCache = {
        data: json.result.list,
        timestamp: now,
      };
      return json.result.list;
    }
  } catch (err) {
    console.warn('Error fetching Bybit spot tickers list:', err);
  }
  return bybitTickersCache?.data || [];
}

/**
 * Search assets dynamically across Bybit Spot API and Yahoo Finance
 */
export async function searchAssets(query: string): Promise<SearchResultAsset[]> {
  const cleanQuery = (query || '').trim().toUpperCase();

  if (!cleanQuery) {
    // Return curated popular list
    return POPULAR_ASSETS;
  }

  const results: SearchResultAsset[] = [];
  const seenSymbols = new Set<string>();

  // 1. Search Bybit Spot Cryptocurrencies
  try {
    const bybitList = await getBybitSpotTickers();
    const matchingBybit = bybitList
      .filter((item) => item.symbol.endsWith('USDT'))
      .map((item) => {
        const baseCoin = item.symbol.replace('USDT', '');
        return {
          baseCoin,
          ticker: item,
        };
      })
      .filter(({ baseCoin }) => baseCoin.includes(cleanQuery) || cleanQuery.includes(baseCoin));

    // Sort: exact matches first, then startsWith, then others
    matchingBybit.sort((a, b) => {
      if (a.baseCoin === cleanQuery) return -1;
      if (b.baseCoin === cleanQuery) return 1;
      if (a.baseCoin.startsWith(cleanQuery) && !b.baseCoin.startsWith(cleanQuery)) return -1;
      if (!a.baseCoin.startsWith(cleanQuery) && b.baseCoin.startsWith(cleanQuery)) return 1;
      return a.baseCoin.localeCompare(b.baseCoin);
    });

    for (const match of matchingBybit.slice(0, 10)) {
      if (!seenSymbols.has(match.baseCoin)) {
        seenSymbols.add(match.baseCoin);
        const price = parseFloat(match.ticker.lastPrice) || 0;
        const prev = parseFloat(match.ticker.prevPrice24h) || price;
        const changePercent = (parseFloat(match.ticker.price24hPcnt) || 0) * 100;
        results.push({
          symbol: match.baseCoin,
          name: `${match.baseCoin}/USDT`,
          category: 'CRYPTO',
          spotPrice: price,
          change24h: price - prev,
          change24hPercent: changePercent,
          exchange: 'Bybit Spot',
          currency: '$',
        });
      }
    }
  } catch (err) {
    console.warn('Error matching Bybit spot assets:', err);
  }

  // 2. Search Yahoo Finance (Equities, ETFs, Indices, Commodities, FX)
  try {
    const yfUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      cleanQuery
    )}&quotesCount=12&newsCount=0`;
    const yfRes = await fetch(yfUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (yfRes.ok) {
      const yfJson: any = await yfRes.json();
      const quotes = Array.isArray(yfJson?.quotes) ? yfJson.quotes : [];

      for (const q of quotes) {
        let sym = (q.symbol || '').toUpperCase();
        if (!sym || seenSymbols.has(sym)) continue;

        // Strip leading ^ for display if index
        const cleanDisplaySym = sym.startsWith('^') ? sym.replace('^', '') : sym;
        if (seenSymbols.has(cleanDisplaySym)) continue;

        let category: UnderlyingAsset['category'] = 'EQUITY';
        const qType = (q.quoteType || '').toUpperCase();
        if (qType === 'ETF') category = 'ETF';
        else if (qType === 'INDEX' || sym.startsWith('^')) category = 'INDEX';
        else if (qType === 'CRYPTOCURRENCY') category = 'CRYPTO';
        else if (qType === 'CURRENCY') category = 'FX';
        else if (qType === 'COMMODITY') category = 'COMMODITY';

        seenSymbols.add(cleanDisplaySym);
        results.push({
          symbol: cleanDisplaySym,
          name: q.shortname || q.longname || cleanDisplaySym,
          category,
          exchange: q.exchDisp || q.exchange || 'US Market',
          currency: '$',
        });
      }
    }
  } catch (err) {
    console.warn('Error querying Yahoo Finance search:', err);
  }

  // 3. Fallback: if query looks like a ticker and nothing found yet, add candidate
  if (results.length === 0 && cleanQuery.length >= 2 && cleanQuery.length <= 6) {
    results.push({
      symbol: cleanQuery,
      name: `${cleanQuery} (Cerca via API)`,
      category: 'EQUITY',
      exchange: 'Global Market',
      currency: '$',
    });
  }

  return results;
}

/**
 * Fetch a complete, live UnderlyingAsset quote
 */
export async function fetchAssetQuote(
  symbolInput: string,
  categoryHint?: string
): Promise<UnderlyingAsset> {
  const symbol = symbolInput.trim().toUpperCase();
  const isExplicitCrypto =
    categoryHint === 'CRYPTO' ||
    ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'AVAX', 'ADA', 'BNB', 'LINK', 'SUI', 'PEPE', 'NEAR'].includes(symbol);

  // Check Bybit first if crypto
  if (isExplicitCrypto || !symbol.includes('.')) {
    try {
      const bybitRes = await fetch(
        `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}USDT`,
        { headers: { 'User-Agent': USER_AGENT } }
      );
      if (bybitRes.ok) {
        const bybitJson: any = await bybitRes.json();
        if (bybitJson.retCode === 0 && bybitJson.result?.list?.length > 0) {
          const item = bybitJson.result.list[0];
          const spotPrice = parseFloat(item.lastPrice) || 0;
          const prevPrice = parseFloat(item.prevPrice24h) || spotPrice;
          const change24h = spotPrice - prevPrice;
          const change24hPercent = (parseFloat(item.price24hPcnt) || 0) * 100;

          // Scaled tick size
          let tickSize = 0.05;
          if (spotPrice > 10000) tickSize = 500;
          else if (spotPrice > 1000) tickSize = 25;
          else if (spotPrice > 100) tickSize = 2.5;
          else if (spotPrice > 10) tickSize = 0.5;
          else if (spotPrice > 1) tickSize = 0.05;
          else tickSize = 0.005;

          return {
            symbol,
            name: `${symbol}/USDT`,
            category: 'CRYPTO',
            spotPrice,
            change24h,
            change24hPercent,
            iv: symbol === 'BTC' ? 0.52 : symbol === 'ETH' ? 0.58 : symbol === 'SOL' ? 0.72 : 0.65,
            ivRank: 44,
            riskFreeRate: 0.045,
            dividendYield: 0.0,
            currency: '$',
            contractMultiplier: 1,
            tickSize,
            cryptoCurrency: symbol,
            exchange: 'Bybit Spot',
          };
        }
      }
    } catch (err) {
      console.warn(`Bybit spot quote check failed for ${symbol}:`, err);
    }
  }

  // Fetch from Yahoo Finance
  let yfTicker = symbol;
  if (symbol === 'SPX') yfTicker = '^GSPC';
  else if (symbol === 'NDX') yfTicker = '^NDX';
  else if (symbol === 'DJI') yfTicker = '^DJI';
  else if (symbol === 'RUT') yfTicker = '^RUT';
  else if (symbol === 'VIX') yfTicker = '^VIX';
  else if (symbol === 'EURUSD') yfTicker = 'EURUSD=X';

  try {
    const yfUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yfTicker
    )}?interval=1d&range=1d`;
    const yfRes = await fetch(yfUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (yfRes.ok) {
      const yfJson: any = await yfRes.json();
      const meta = yfJson?.chart?.result?.[0]?.meta;
      if (meta) {
        const spotPrice = Number(meta.regularMarketPrice || meta.chartPreviousClose || 0);
        const prevClose = Number(meta.chartPreviousClose || spotPrice);
        const change24h = spotPrice - prevClose;
        const change24hPercent = prevClose > 0 ? (change24h / prevClose) * 100 : 0;
        const instType = (meta.instrumentType || '').toUpperCase();

        let category: UnderlyingAsset['category'] = 'EQUITY';
        if (instType === 'ETF') category = 'ETF';
        else if (instType === 'INDEX' || yfTicker.startsWith('^')) category = 'INDEX';
        else if (instType === 'CRYPTOCURRENCY') category = 'CRYPTO';
        else if (yfTicker.includes('=X')) category = 'FX';

        let tickSize = 1.0;
        if (spotPrice > 1000) tickSize = 25.0;
        else if (spotPrice > 300) tickSize = 5.0;
        else if (spotPrice > 100) tickSize = 2.5;
        else if (spotPrice > 20) tickSize = 1.0;
        else if (spotPrice > 2) tickSize = 0.1;
        else tickSize = 0.01;

        let multiplier = 100;
        if (category === 'CRYPTO') multiplier = 1;
        else if (category === 'FX') multiplier = 10000;

        const currencySymbol = meta.currency === 'EUR' ? '€' : '$';

        return {
          symbol,
          name: meta.shortName || meta.longName || symbol,
          category,
          spotPrice: Number(spotPrice.toFixed(category === 'FX' ? 4 : 2)),
          change24h: Number(change24h.toFixed(category === 'FX' ? 4 : 2)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          iv: category === 'INDEX' ? 0.16 : category === 'ETF' ? 0.21 : 0.35,
          ivRank: 38,
          riskFreeRate: 0.045,
          dividendYield: category === 'EQUITY' ? 0.012 : category === 'INDEX' ? 0.014 : 0.0,
          currency: currencySymbol,
          contractMultiplier: multiplier,
          tickSize,
          exchange: meta.exchangeName || 'US Market',
        };
      }
    }
  } catch (err) {
    console.warn(`Yahoo Finance quote failed for ${symbol}:`, err);
  }

  // Graceful fallback if offline
  return {
    symbol,
    name: `${symbol} (Asset)`,
    category: isExplicitCrypto ? 'CRYPTO' : 'EQUITY',
    spotPrice: 100.0,
    change24h: 0.0,
    change24hPercent: 0.0,
    iv: 0.3,
    ivRank: 35,
    riskFreeRate: 0.045,
    dividendYield: 0.01,
    currency: '$',
    contractMultiplier: isExplicitCrypto ? 1 : 100,
    tickSize: 1.0,
    exchange: 'Market',
  };
}
