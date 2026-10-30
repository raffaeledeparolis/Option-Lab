export type OptionType = 'CALL' | 'PUT';
export type LegAction = 'BUY' | 'SELL';

export interface OptionLeg {
  id: string;
  action: LegAction;
  type: OptionType;
  strike: number;
  expiration: string; // e.g. "2026-10-15 (0DTE)" or "2026-10-22"
  daysToExpiry: number; // in days, can be fractional (e.g. 0.15 for 3.5 hours in 0DTE)
  is0DTE?: boolean;
  intradayHoursRemaining?: number; // for 0DTE, 0 to 6.5 hours
  quantity: number;
  premium: number; // bid/ask mid or entered price
  iv: number; // Implied volatility, e.g. 0.18 for 18%
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  premiumCrypto?: number;
  instrumentName?: string;
}

export interface UnderlyingAsset {
  symbol: string;
  name: string;
  category: 'INDEX' | 'ETF' | 'EQUITY' | 'FX' | 'COMMODITY' | 'CRYPTO';
  spotPrice: number;
  change24h: number;
  change24hPercent: number;
  iv: number; // annualized IV
  ivRank: number; // 0-100%
  riskFreeRate: number; // e.g. 0.045
  dividendYield: number; // e.g. 0.015
  currency: string;
  contractMultiplier: number; // default 100 (or 1 for crypto)
  tickSize: number;
  cryptoCurrency?: string;
  exchange?: string;
}

export interface SearchResultAsset {
  symbol: string;
  name: string;
  category: 'INDEX' | 'ETF' | 'EQUITY' | 'FX' | 'COMMODITY' | 'CRYPTO';
  spotPrice?: number;
  change24h?: number;
  change24hPercent?: number;
  exchange?: string;
  currency?: string;
  isPopular?: boolean;
}

export interface OptionContract {
  strike: number;
  bid: number;
  ask: number;
  last: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  volume: number;
  openInterest: number;
  cryptoPrice?: number; // Price in BTC/ETH
  cryptoBid?: number;
  cryptoAsk?: number;
  instrumentName?: string;
}

export interface OptionChainRow {
  strike: number;
  call: OptionContract;
  put: OptionContract;
}

export interface ExpirationDate {
  date: string;
  label: string;
  daysToExpiry: number;
  is0DTE: boolean;
  hoursRemaining?: number;
  isoDate?: string;
}

export interface GreeksMetrics {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  deltaDollars: number; // Delta * Spot * multiplier
  gammaRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface StrategyMetrics {
  netCost: number; // positive = debit, negative = credit
  isCredit: boolean;
  maxProfit: number | null; // null for unlimited
  maxLoss: number | null; // null for unlimited
  breakEvens: number[];
  roi: number | null; // percentage
  requiredMargin: number;
  pop: number; // Probability of Profit 0-100%
  expectedValue: number; // EV
  probProfitAboveTarget?: number;
  probLossAboveTarget?: number;
}

export interface StrategyPreset {
  id: string;
  name: string;
  category: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILITY' | '0DTE_SPECIAL';
  description: string;
  outlook: string;
  complexity: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  legsConfig: (spot: number, dte: number, iv: number) => Array<{
    action: LegAction;
    type: OptionType;
    strikeOffset: number; // e.g. -20, 0, +20
    quantity: number;
    daysToExpiryOffset?: number;
  }>;
}

export type DataProvider = 
  | 'INTERACTIVE_BROKERS'
  | 'DERIBIT'
  | 'BYBIT'
  | 'TRADIER'
  | 'POLYGON'
  | 'CBOE_DATASHOP'
  | 'MARKETDATA_APP'
  | 'YAHOO_FINANCE';

export interface ComparisonStrategy {
  id: string;
  name: string;
  color: string;
  legs: OptionLeg[];
  metrics: StrategyMetrics;
  greeks: GreeksMetrics;
}

export type OrderType = 'LMT' | 'MKT' | 'STP' | 'STP_LMT';
export type TimeInForce = 'DAY' | 'GTC' | 'IOC';

export interface IbkrOrderLeg {
  action: LegAction;
  quantity: number;
  strike: number;
  type: OptionType;
  expiration: string;
  premium: number;
}

export interface IbkrOrderTicket {
  orderId?: number;
  symbol: string;
  orderType: OrderType;
  limitPrice: number;
  timeInForce: TimeInForce;
  legs: IbkrOrderLeg[];
  accountId?: string;
  notes?: string;
  strategyName?: string;
}

export interface IbkrOrderRecord {
  id: string;
  orderId: number;
  symbol: string;
  strategyName: string;
  orderType: OrderType;
  limitPrice: number;
  timeInForce: TimeInForce;
  status: 'SUBMITTED' | 'PRESUBMITTED' | 'WAITING_TWS_POPUP' | 'FILLED' | 'CANCELLED' | 'SIMULATED' | 'ERROR';
  legsCount: number;
  legsSummary: string;
  submittedAt: string;
  mode: 'PAPER' | 'LIVE' | 'SIMULATION';
  twsHost: string;
  twsPort: number;
  message: string;
  transmissionDetails?: {
    socketConnected: boolean;
    handshakeSent: boolean;
    bytesSent: number;
    twsAcknowledged: boolean;
    twsStatusNote: string;
    troubleshootingTip?: string;
  };
}

export interface DeribitConfig {
  connected: boolean;
  environment: 'TESTNET' | 'MAINNET';
  clientId?: string;
  clientSecret?: string;
  currency: 'BTC' | 'ETH' | 'SOL';
  lastChecked?: string;
  message?: string;
}

export interface DeribitOrderLeg {
  action: LegAction;
  quantity: number;
  strike: number;
  type: OptionType;
  expiration: string;
  premiumCrypto: number;
  premiumUsd: number;
  instrumentName: string;
}

export interface DeribitOrderRecord {
  id: string;
  orderId: string | number;
  symbol: string;
  currency: 'BTC' | 'ETH' | 'SOL';
  strategyName: string;
  orderType: 'limit' | 'market';
  priceCrypto: number;
  priceUsd: number;
  timeInForce: 'good_til_cancelled' | 'immediate_or_cancel' | 'fill_or_kill';
  postOnly?: boolean;
  status: 'open' | 'filled' | 'cancelled' | 'rejected' | 'simulated';
  legsCount: number;
  legsSummary: string;
  submittedAt: string;
  environment: 'TESTNET' | 'MAINNET';
  message: string;
  rawResponse?: any;
}

export interface BybitConfig {
  connected: boolean;
  environment: 'TESTNET' | 'MAINNET';
  apiKey?: string;
  apiSecret?: string;
  accountType?: 'UNIFIED' | 'CONTRACT';
  currency: 'BTC' | 'ETH' | 'SOL';
  settlementCoin?: 'USDT' | 'USDC';
  lastChecked?: string;
  message?: string;
}

export interface BybitOrderLeg {
  action: LegAction;
  quantity: number;
  strike: number;
  type: OptionType;
  expiration: string;
  premiumUsd: number;
  premiumCrypto?: number;
  symbol: string;
}

export interface BybitOrderRecord {
  id: string;
  orderId: string;
  orderLinkId?: string;
  symbol: string;
  currency: 'BTC' | 'ETH' | 'SOL';
  strategyName: string;
  orderType: 'Limit' | 'Market';
  price: number;
  qty: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'PostOnly';
  status: 'New' | 'PartiallyFilled' | 'Filled' | 'Cancelled' | 'Rejected' | 'Simulated';
  legsCount: number;
  legsSummary: string;
  submittedAt: string;
  environment: 'TESTNET' | 'MAINNET';
  message: string;
  rawResponse?: any;
}

