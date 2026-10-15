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
}

export interface UnderlyingAsset {
  symbol: string;
  name: string;
  category: 'INDEX' | 'ETF' | 'EQUITY' | 'FX' | 'COMMODITY';
  spotPrice: number;
  change24h: number;
  change24hPercent: number;
  iv: number; // annualized IV
  ivRank: number; // 0-100%
  riskFreeRate: number; // e.g. 0.045
  dividendYield: number; // e.g. 0.015
  currency: string;
  contractMultiplier: number; // default 100
  tickSize: number;
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
