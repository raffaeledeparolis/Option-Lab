import { UnderlyingAsset, ExpirationDate, OptionChainRow } from '../types/options';
import { calculateBlackScholes, dteToYears } from '../utils/blackScholes';

export const UNDERLYING_ASSETS: UnderlyingAsset[] = [
  {
    symbol: 'SPX',
    name: 'S&P 500 Index',
    category: 'INDEX',
    spotPrice: 5850.50,
    change24h: 18.20,
    change24hPercent: 0.31,
    iv: 0.158, // 15.8%
    ivRank: 42,
    riskFreeRate: 0.046,
    dividendYield: 0.0135,
    currency: '$',
    contractMultiplier: 100,
    tickSize: 5.0,
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    category: 'ETF',
    spotPrice: 584.90,
    change24h: 1.85,
    change24hPercent: 0.32,
    iv: 0.156,
    ivRank: 40,
    riskFreeRate: 0.046,
    dividendYield: 0.013,
    currency: '$',
    contractMultiplier: 100,
    tickSize: 1.0,
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    category: 'ETF',
    spotPrice: 496.40,
    change24h: -1.45,
    change24hPercent: -0.29,
    iv: 0.198,
    ivRank: 48,
    riskFreeRate: 0.046,
    dividendYield: 0.006,
    currency: '$',
    contractMultiplier: 100,
    tickSize: 1.0,
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    category: 'EQUITY',
    spotPrice: 138.75,
    change24h: 4.10,
    change24hPercent: 3.05,
    iv: 0.445,
    ivRank: 68,
    riskFreeRate: 0.046,
    dividendYield: 0.0003,
    currency: '$',
    contractMultiplier: 100,
    tickSize: 1.0,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    category: 'EQUITY',
    spotPrice: 221.60,
    change24h: -3.20,
    change24hPercent: -1.42,
    iv: 0.525,
    ivRank: 74,
    riskFreeRate: 0.046,
    dividendYield: 0.0,
    currency: '$',
    contractMultiplier: 100,
    tickSize: 2.5,
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    category: 'EQUITY',
    spotPrice: 234.80,
    change24h: 0.95,
    change24hPercent: 0.41,
    iv: 0.224,
    ivRank: 34,
    riskFreeRate: 0.046,
    dividendYield: 0.005,
    currency: '$',
    contractMultiplier: 100,
    tickSize: 1.0,
  },
  {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    category: 'FX',
    spotPrice: 1.0865,
    change24h: -0.0018,
    change24hPercent: -0.17,
    iv: 0.068,
    ivRank: 25,
    riskFreeRate: 0.046,
    dividendYield: 0.035, // foreign interest rate differential
    currency: '$',
    contractMultiplier: 10000,
    tickSize: 0.005,
  },
  {
    symbol: 'XAUUSD',
    name: 'Gold Spot',
    category: 'COMMODITY',
    spotPrice: 2665.40,
    change24h: 14.80,
    change24hPercent: 0.56,
    iv: 0.175,
    ivRank: 59,
    riskFreeRate: 0.046,
    dividendYield: 0.0,
    currency: '$',
    contractMultiplier: 10,
    tickSize: 10.0,
  },
  {
    symbol: 'CL_OIL',
    name: 'WTI Crude Oil',
    category: 'COMMODITY',
    spotPrice: 71.90,
    change24h: -0.85,
    change24hPercent: -1.17,
    iv: 0.320,
    ivRank: 62,
    riskFreeRate: 0.046,
    dividendYield: 0.0,
    currency: '$',
    contractMultiplier: 100,
    tickSize: 0.5,
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin (Deribit Options)',
    category: 'CRYPTO',
    spotPrice: 80250.00,
    change24h: 1420.00,
    change24hPercent: 1.80,
    iv: 0.485, // 48.5% DVOL
    ivRank: 56,
    riskFreeRate: 0.045,
    dividendYield: 0.0,
    currency: '$',
    contractMultiplier: 1, // Deribit standard contract
    tickSize: 1000.0,
    cryptoCurrency: 'BTC',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum (Deribit Options)',
    category: 'CRYPTO',
    spotPrice: 2330.00,
    change24h: 38.50,
    change24hPercent: 1.68,
    iv: 0.540,
    ivRank: 60,
    riskFreeRate: 0.045,
    dividendYield: 0.032, // Staking yield
    currency: '$',
    contractMultiplier: 1,
    tickSize: 50.0,
    cryptoCurrency: 'ETH',
  },
  {
    symbol: 'SOL',
    name: 'Solana (Deribit Options)',
    category: 'CRYPTO',
    spotPrice: 174.50,
    change24h: 5.20,
    change24hPercent: 3.07,
    iv: 0.720,
    ivRank: 66,
    riskFreeRate: 0.045,
    dividendYield: 0.0,
    currency: '$',
    contractMultiplier: 1,
    tickSize: 5.0,
    cryptoCurrency: 'SOL',
  },
];

/**
 * Generate standard and 0DTE expirations
 */
export function getAvailableExpirations(): ExpirationDate[] {
  const today = new Date();
  
  const formatDate = (d: Date) => {
    const day = d.getDate();
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return `${day} ${months[d.getMonth()]}`;
  };

  const addDays = (d: Date, count: number) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + count);
    return copy;
  };

  const toIso = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  return [
    {
      date: '0DTE',
      label: `${formatDate(today)} (0DTE Intraday)`,
      daysToExpiry: 0.15, // ~3.5 hours of session
      is0DTE: true,
      hoursRemaining: 3.5,
      isoDate: toIso(today),
    },
    {
      date: '1DTE',
      label: `${formatDate(addDays(today, 1))} (1DTE)`,
      daysToExpiry: 1,
      is0DTE: false,
      isoDate: toIso(addDays(today, 1)),
    },
    {
      date: '2DTE',
      label: `${formatDate(addDays(today, 2))} (2DTE)`,
      daysToExpiry: 2,
      is0DTE: false,
      isoDate: toIso(addDays(today, 2)),
    },
    {
      date: '7DTE',
      label: `${formatDate(addDays(today, 7))} (1W)`,
      daysToExpiry: 7,
      is0DTE: false,
      isoDate: toIso(addDays(today, 7)),
    },
    {
      date: '14DTE',
      label: `${formatDate(addDays(today, 14))} (2W)`,
      daysToExpiry: 14,
      is0DTE: false,
      isoDate: toIso(addDays(today, 14)),
    },
    {
      date: '30DTE',
      label: `${formatDate(addDays(today, 30))} (30D Mensile)`,
      daysToExpiry: 30,
      is0DTE: false,
      isoDate: toIso(addDays(today, 30)),
    },
    {
      date: '45DTE',
      label: `${formatDate(addDays(today, 45))} (45D Standard)`,
      daysToExpiry: 45,
      is0DTE: false,
      isoDate: toIso(addDays(today, 45)),
    },
    {
      date: '60DTE',
      label: `${formatDate(addDays(today, 60))} (60D)`,
      daysToExpiry: 60,
      is0DTE: false,
      isoDate: toIso(addDays(today, 60)),
    },
    {
      date: '90DTE',
      label: `${formatDate(addDays(today, 90))} (90D Trimestrale)`,
      daysToExpiry: 90,
      is0DTE: false,
      isoDate: toIso(addDays(today, 90)),
    },
  ];
}

/**
 * Generate full option chain for given asset and expiration
 */
export function generateOptionChain(
  asset: UnderlyingAsset,
  expiration: ExpirationDate
): OptionChainRow[] {
  const spot = asset.spotPrice;
  const tick = asset.tickSize;
  const atmBase = Math.round(spot / tick) * tick;

  // Number of strikes above and below ATM
  const numStrikes = asset.symbol === 'SPX' ? 24 : 16;
  const strikes: number[] = [];

  for (let i = -numStrikes; i <= numStrikes; i++) {
    const s = Number((atmBase + i * tick).toFixed(asset.symbol === 'EURUSD' ? 4 : 2));
    if (s > 0) strikes.push(s);
  }

  const T = dteToYears(expiration.daysToExpiry, expiration.hoursRemaining);

  return strikes.map(strike => {
    // Volatility skew calculation (put skew is higher for downside strikes)
    const moneyness = Math.log(strike / spot);
    // Skew formula: higher IV for OTM puts (strike < spot), slightly flat or upturned for far OTM calls
    const skewFactor = moneyness < 0 ? -0.28 * moneyness : 0.08 * moneyness;
    // For 0DTE, IV is often slightly elevated due to gamma premium
    const baseIv = expiration.is0DTE ? asset.iv * 1.08 : asset.iv;
    const strikeIv = Math.max(0.04, baseIv * (1 + skewFactor));

    const callBS = calculateBlackScholes(
      'CALL',
      spot,
      strike,
      T,
      asset.riskFreeRate,
      strikeIv,
      asset.dividendYield
    );

    const putBS = calculateBlackScholes(
      'PUT',
      spot,
      strike,
      T,
      asset.riskFreeRate,
      strikeIv,
      asset.dividendYield
    );

    // Realistic Bid/Ask Spread calculation
    const isSPX = asset.symbol === 'SPX';
    const isFx = asset.symbol === 'EURUSD';
    const spreadPct = isSPX ? 0.02 : (isFx ? 0.05 : 0.03);
    const minSpread = isFx ? 0.0004 : (isSPX ? 0.40 : 0.05);

    const callSpread = Math.max(minSpread, callBS.price * spreadPct);
    const putSpread = Math.max(minSpread, putBS.price * spreadPct);

    const callBid = Math.max(0.01, Number((callBS.price - callSpread / 2).toFixed(isFx ? 4 : 2)));
    const callAsk = Number((callBS.price + callSpread / 2).toFixed(isFx ? 4 : 2));
    const putBid = Math.max(0.01, Number((putBS.price - putSpread / 2).toFixed(isFx ? 4 : 2)));
    const putAsk = Number((putBS.price + putSpread / 2).toFixed(isFx ? 4 : 2));

    // Volume & Open Interest estimation based on proximity to ATM
    const distAtm = Math.abs(strike - spot) / spot;
    const baseVol = Math.max(12, Math.round(5000 * Math.exp(-distAtm * 15)));
    const baseOi = Math.max(50, Math.round(18000 * Math.exp(-distAtm * 10)));

    const isCrypto = asset.category === 'CRYPTO';
    const expCode = (expiration.isoDate || '2026-10-25').replace(/-/g, '').slice(2);

    return {
      strike,
      call: {
        strike,
        bid: callBid,
        ask: callAsk,
        last: Number(((callBid + callAsk) / 2).toFixed(isFx ? 4 : 2)),
        iv: Number((strikeIv * 100).toFixed(1)),
        delta: Number(callBS.delta.toFixed(3)),
        gamma: Number(callBS.gamma.toFixed(4)),
        theta: Number((expiration.is0DTE ? callBS.thetaHourly : callBS.theta).toFixed(2)),
        vega: Number(callBS.vega.toFixed(2)),
        rho: Number(callBS.rho.toFixed(2)),
        volume: baseVol + Math.floor(Math.random() * 200),
        openInterest: baseOi + Math.floor(Math.random() * 500),
        cryptoPrice: isCrypto ? Number((callBS.price / spot).toFixed(4)) : undefined,
        cryptoBid: isCrypto ? Number((callBid / spot).toFixed(4)) : undefined,
        cryptoAsk: isCrypto ? Number((callAsk / spot).toFixed(4)) : undefined,
        instrumentName: isCrypto ? `${asset.symbol}-${expCode}-${strike}-C` : undefined,
      },
      put: {
        strike,
        bid: putBid,
        ask: putAsk,
        last: Number(((putBid + putAsk) / 2).toFixed(isFx ? 4 : 2)),
        iv: Number((strikeIv * 100).toFixed(1)),
        delta: Number(putBS.delta.toFixed(3)),
        gamma: Number(putBS.gamma.toFixed(4)),
        theta: Number((expiration.is0DTE ? putBS.thetaHourly : putBS.theta).toFixed(2)),
        vega: Number(putBS.vega.toFixed(2)),
        rho: Number(putBS.rho.toFixed(2)),
        volume: Math.round(baseVol * 1.2) + Math.floor(Math.random() * 200),
        openInterest: Math.round(baseOi * 1.3) + Math.floor(Math.random() * 600),
        cryptoPrice: isCrypto ? Number((putBS.price / spot).toFixed(4)) : undefined,
        cryptoBid: isCrypto ? Number((putBid / spot).toFixed(4)) : undefined,
        cryptoAsk: isCrypto ? Number((putAsk / spot).toFixed(4)) : undefined,
        instrumentName: isCrypto ? `${asset.symbol}-${expCode}-${strike}-P` : undefined,
      },
    };
  });
}
