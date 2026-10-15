import { OptionLeg, GreeksMetrics, StrategyMetrics } from '../types/options';

// Constants
const SQRT_2PI = Math.sqrt(2 * Math.PI);
const TRADING_DAYS_PER_YEAR = 252;
const TRADING_HOURS_PER_DAY = 6.5;

/**
 * Standard Normal Probability Density Function
 */
export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/**
 * Standard Normal Cumulative Distribution Function (Abramowitz and Stegun approximation)
 * Precision ~ 7.5e-8
 */
export function normalCdf(x: number): number {
  if (isNaN(x)) return 0.5;
  if (x > 8.0) return 1.0;
  if (x < -8.0) return 0.0;

  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  if (x >= 0.0) {
    const k = 1.0 / (1.0 + p * x);
    return 1.0 - c * Math.exp(-x * x / 2.0) * k *
      (b1 + k * (b2 + k * (b3 + k * (b4 + k * b5))));
  } else {
    const k = 1.0 / (1.0 - p * x);
    return c * Math.exp(-x * x / 2.0) * k *
      (b1 + k * (b2 + k * (b3 + k * (b4 + k * b5))));
  }
}

/**
 * Convert days to expiry (which can be fractional for 0DTE intraday) to years T
 * For 0DTE: intraday hours remaining can be e.g. 2.5 hours -> (2.5 / 6.5) / 252
 */
export function dteToYears(days: number, intradayHoursRemaining?: number): number {
  if (intradayHoursRemaining !== undefined && intradayHoursRemaining >= 0) {
    const fractionalDay = Math.max(0.001, intradayHoursRemaining / TRADING_HOURS_PER_DAY);
    return fractionalDay / TRADING_DAYS_PER_YEAR;
  }
  return Math.max(0.00001, days / 365.25);
}

export interface BSResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // daily theta in $
  thetaHourly: number; // hourly theta for 0DTE intraday
  vega: number;  // per 1% move in IV
  rho: number;   // per 1% move in rates
}

/**
 * Black-Scholes Pricing and Greeks Engine
 * @param type 'CALL' | 'PUT'
 * @param S Current Spot Price
 * @param K Strike Price
 * @param T Time to expiration in years
 * @param r Risk-free rate (e.g. 0.045 for 4.5%)
 * @param sigma Implied volatility (e.g. 0.20 for 20%)
 * @param q Dividend yield (e.g. 0.015 for 1.5%)
 */
export function calculateBlackScholes(
  type: 'CALL' | 'PUT',
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  q: number = 0
): BSResult {
  if (T <= 0.000001) {
    // Intrinsic value at expiration
    const intrinsic = type === 'CALL' ? Math.max(0, S - K) : Math.max(0, K - S);
    const itmDelta = type === 'CALL' ? (S > K ? 1 : 0) : (S < K ? -1 : 0);
    return {
      price: intrinsic,
      delta: itmDelta,
      gamma: 0,
      theta: 0,
      thetaHourly: 0,
      vega: 0,
      rho: 0,
    };
  }

  const safeSigma = Math.max(0.001, sigma);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * safeSigma * safeSigma) * T) / (safeSigma * sqrtT);
  const d2 = d1 - safeSigma * sqrtT;

  const expNegQT = Math.exp(-q * T);
  const expNegRT = Math.exp(-r * T);
  const nd1 = normalCdf(d1);
  const nd2 = normalCdf(d2);
  const nPrimeD1 = normalPdf(d1);

  let price = 0;
  let delta = 0;
  let thetaYearly = 0;

  if (type === 'CALL') {
    price = S * expNegQT * nd1 - K * expNegRT * nd2;
    delta = expNegQT * nd1;
    thetaYearly = -(S * safeSigma * expNegQT * nPrimeD1) / (2 * sqrtT)
                  - r * K * expNegRT * nd2
                  + q * S * expNegQT * nd1;
  } else {
    const nNegD1 = normalCdf(-d1);
    const nNegD2 = normalCdf(-d2);
    price = K * expNegRT * nNegD2 - S * expNegQT * nNegD1;
    delta = expNegQT * (nd1 - 1.0);
    thetaYearly = -(S * safeSigma * expNegQT * nPrimeD1) / (2 * sqrtT)
                  + r * K * expNegRT * nNegD2
                  - q * S * expNegQT * nNegD1;
  }

  // Gamma is identical for call & put
  const gamma = (expNegQT * nPrimeD1) / (S * safeSigma * sqrtT);

  // Vega per 1% IV change
  const vega = (S * expNegQT * sqrtT * nPrimeD1) / 100;

  // Rho per 1% interest rate change
  const rho = type === 'CALL' 
    ? (K * T * expNegRT * nd2) / 100 
    : (-K * T * expNegRT * normalCdf(-d2)) / 100;

  // Theta per calendar/trading day & per intraday trading hour
  const thetaDaily = thetaYearly / 365.25;
  const thetaHourly = thetaYearly / (TRADING_DAYS_PER_YEAR * TRADING_HOURS_PER_DAY);

  return {
    price: Math.max(0, price),
    delta,
    gamma,
    theta: thetaDaily,
    thetaHourly,
    vega,
    rho,
  };
}

/**
 * Calculate single leg value at current spot and evaluation time
 */
export function getLegValue(
  leg: OptionLeg,
  spot: number,
  timePassedRatio: number = 0, // 0 = now, 1 = at expiry
  currentIV: number = leg.iv,
  riskFreeRate: number = 0.045,
  dividendYield: number = 0.015
): number {
  const originalT = dteToYears(leg.daysToExpiry, leg.intradayHoursRemaining);
  const remainingT = Math.max(0, originalT * (1 - timePassedRatio));

  if (remainingT <= 0.000001 || timePassedRatio >= 0.9999) {
    // Intrinsic value at expiration
    return leg.type === 'CALL' ? Math.max(0, spot - leg.strike) : Math.max(0, leg.strike - spot);
  }

  const bs = calculateBlackScholes(
    leg.type,
    spot,
    leg.strike,
    remainingT,
    riskFreeRate,
    currentIV,
    dividendYield
  );

  return bs.price;
}

/**
 * Calculate entire strategy P&L at given underlying price and time fraction
 */
export function getStrategyProfitLoss(
  legs: OptionLeg[],
  underlyingPrice: number,
  timePassedRatio: number = 0, // 0 = today, 1 = at expiry
  contractMultiplier: number = 100,
  ivOffset: number = 0, // e.g. +0.02 for +2% IV
  riskFreeRate: number = 0.045,
  dividendYield: number = 0.015
): number {
  if (legs.length === 0) return 0;

  let totalPnL = 0;

  for (const leg of legs) {
    const legCurrentValue = getLegValue(
      leg,
      underlyingPrice,
      timePassedRatio,
      Math.max(0.01, leg.iv + ivOffset),
      riskFreeRate,
      dividendYield
    );

    // Initial cashflow:
    // BUY: paid premium (outflow)
    // SELL: received premium (inflow)
    const legSign = leg.action === 'BUY' ? 1 : -1;
    const pnlPerUnit = legSign * (legCurrentValue - leg.premium);
    totalPnL += pnlPerUnit * leg.quantity * contractMultiplier;
  }

  return totalPnL;
}

/**
 * Calculate portfolio aggregate Greeks
 */
export function calculateStrategyGreeks(
  legs: OptionLeg[],
  spot: number,
  contractMultiplier: number = 100,
  riskFreeRate: number = 0.045,
  dividendYield: number = 0.015
): GreeksMetrics {
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;
  let totalRho = 0;

  for (const leg of legs) {
    const T = dteToYears(leg.daysToExpiry, leg.intradayHoursRemaining);
    const bs = calculateBlackScholes(
      leg.type,
      spot,
      leg.strike,
      T,
      riskFreeRate,
      leg.iv,
      dividendYield
    );

    const sign = (leg.action === 'BUY' ? 1 : -1) * leg.quantity * contractMultiplier;
    totalDelta += bs.delta * sign;
    totalGamma += bs.gamma * sign;
    totalTheta += bs.theta * sign;
    totalVega += bs.vega * sign;
    totalRho += bs.rho * sign;
  }

  const deltaDollars = totalDelta * spot;

  // Determine gamma risk level (critical for 0DTE pin risk!)
  const absGammaScaled = Math.abs(totalGamma) * spot;
  let gammaRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'LOW';
  if (absGammaScaled > 15) gammaRiskLevel = 'EXTREME';
  else if (absGammaScaled > 7) gammaRiskLevel = 'HIGH';
  else if (absGammaScaled > 2) gammaRiskLevel = 'MEDIUM';

  return {
    delta: Number(totalDelta.toFixed(3)),
    gamma: Number(totalGamma.toFixed(4)),
    theta: Number(totalTheta.toFixed(2)),
    vega: Number(totalVega.toFixed(2)),
    rho: Number(totalRho.toFixed(2)),
    deltaDollars: Number(deltaDollars.toFixed(2)),
    gammaRiskLevel,
  };
}

/**
 * Calculate Strategy Metrics: Net cost, Break-even, Max Profit, Max Loss, POP, EV, Margin
 */
export function calculateStrategyMetrics(
  legs: OptionLeg[],
  spot: number,
  contractMultiplier: number = 100,
  riskFreeRate: number = 0.045,
  dividendYield: number = 0.015,
  targetProfitAmount?: number,
  targetLossAmount?: number
): StrategyMetrics {
  if (legs.length === 0) {
    return {
      netCost: 0,
      isCredit: false,
      maxProfit: 0,
      maxLoss: 0,
      breakEvens: [],
      roi: 0,
      requiredMargin: 0,
      pop: 50,
      expectedValue: 0,
    };
  }

  // Net cost: positive = debit (paid), negative = credit (received)
  let netCost = 0;
  for (const leg of legs) {
    const cost = leg.premium * leg.quantity * contractMultiplier;
    netCost += leg.action === 'BUY' ? cost : -cost;
  }
  const isCredit = netCost < 0;

  // Scan range of underlying price to find profile extrema & break evens
  const strikes = legs.map(l => l.strike);
  const minStrike = Math.min(spot * 0.7, ...strikes);
  const maxStrike = Math.max(spot * 1.3, ...strikes);
  const stepCount = 500;
  const step = (maxStrike - minStrike) / stepCount;

  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  const breakEvens: number[] = [];

  let prevPnl: number | null = null;
  let prevPrice: number = minStrike;

  for (let i = 0; i <= stepCount; i++) {
    const price = minStrike + i * step;
    const pnl = getStrategyProfitLoss(legs, price, 1.0, contractMultiplier, 0, riskFreeRate, dividendYield);

    if (pnl > maxProfit) maxProfit = pnl;
    if (pnl < maxLoss) maxLoss = pnl;

    // Check zero crossing for break evens
    if (prevPnl !== null) {
      if ((prevPnl < 0 && pnl >= 0) || (prevPnl >= 0 && pnl < 0)) {
        // Linear interpolation for exact strike
        const bep = prevPrice + ((0 - prevPnl) / (pnl - prevPnl)) * (price - prevPrice);
        // Avoid duplicate close points
        if (!breakEvens.some(b => Math.abs(b - bep) < 0.5)) {
          breakEvens.push(Number(bep.toFixed(2)));
        }
      }
    }
    prevPnl = pnl;
    prevPrice = price;
  }

  // Check tail behavior (infinity / unlimited check)
  const farLeftPrice = minStrike * 0.1;
  const farRightPrice = maxStrike * 2.0;
  const farLeftPnl = getStrategyProfitLoss(legs, farLeftPrice, 1.0, contractMultiplier, 0, riskFreeRate, dividendYield);
  const farRightPnl = getStrategyProfitLoss(legs, farRightPrice, 1.0, contractMultiplier, 0, riskFreeRate, dividendYield);

  let finalMaxProfit: number | null = maxProfit;
  let finalMaxLoss: number | null = maxLoss;

  if (farLeftPnl > maxProfit * 1.5 || farRightPnl > maxProfit * 1.5) {
    finalMaxProfit = null; // Unlimited profit
  }
  if (farLeftPnl < maxLoss * 1.5 || farRightPnl < maxLoss * 1.5) {
    finalMaxLoss = null; // Unlimited loss
  }

  // Margin calculation
  // Simplified standard broker margin rules for defined risk & undefined risk
  let requiredMargin = Math.abs(netCost);
  if (isCredit) {
    if (finalMaxLoss !== null && finalMaxLoss < 0) {
      requiredMargin = Math.abs(finalMaxLoss);
    } else {
      // Naked short option margin estimate: 20% underlying value
      requiredMargin = Math.max(requiredMargin, spot * contractMultiplier * 0.20);
    }
  } else {
    // For net debit, margin is net debit paid
    requiredMargin = Math.max(0, netCost);
  }

  // Max ROI %
  let roi: number | null = null;
  if (finalMaxProfit !== null && requiredMargin > 0) {
    roi = Number(((finalMaxProfit / requiredMargin) * 100).toFixed(1));
  }

  // Probability of Profit (POP) and Expected Value using lognormal distribution
  // We compute average DTE and weighted IV from legs
  const avgDteDays = legs.reduce((acc, l) => acc + l.daysToExpiry, 0) / legs.length;
  const avgIv = legs.reduce((acc, l) => acc + l.iv, 0) / legs.length;
  const avgT = dteToYears(avgDteDays, legs[0]?.intradayHoursRemaining);

  const sigmaRootT = Math.max(0.001, avgIv * Math.sqrt(avgT));
  const mu = Math.log(spot) + (riskFreeRate - dividendYield - 0.5 * avgIv * avgIv) * avgT;

  let popSum = 0;
  let evSum = 0;
  let probProfitAboveTarget = 0;
  let probLossAboveTarget = 0;

  const targetProfit = targetProfitAmount ?? 100;
  const targetLoss = targetLossAmount ?? 100;

  // Numerical integration over log-normal density
  const intSteps = 300;
  const minP = Math.max(1, spot * Math.exp(-3.5 * sigmaRootT));
  const maxP = spot * Math.exp(3.5 * sigmaRootT);
  const pStep = (maxP - minP) / intSteps;

  for (let i = 0; i < intSteps; i++) {
    const pMid = minP + (i + 0.5) * pStep;
    // Log-normal PDF
    const logPMid = Math.log(pMid);
    const z = (logPMid - mu) / sigmaRootT;
    const pdf = normalPdf(z) / (pMid * sigmaRootT);
    const prob = pdf * pStep;

    const pnlAtExpiry = getStrategyProfitLoss(legs, pMid, 1.0, contractMultiplier, 0, riskFreeRate, dividendYield);

    if (pnlAtExpiry > 0) {
      popSum += prob;
    }
    if (pnlAtExpiry >= targetProfit) {
      probProfitAboveTarget += prob;
    }
    if (pnlAtExpiry <= -targetLoss) {
      probLossAboveTarget += prob;
    }

    evSum += pnlAtExpiry * prob;
  }

  const finalPop = Math.min(99.9, Math.max(0.1, Number((popSum * 100).toFixed(1))));

  return {
    netCost: Number(netCost.toFixed(2)),
    isCredit,
    maxProfit: finalMaxProfit !== null ? Number(finalMaxProfit.toFixed(2)) : null,
    maxLoss: finalMaxLoss !== null ? Number(finalMaxLoss.toFixed(2)) : null,
    breakEvens,
    roi,
    requiredMargin: Number(requiredMargin.toFixed(2)),
    pop: finalPop,
    expectedValue: Number(evSum.toFixed(2)),
    probProfitAboveTarget: Number((probProfitAboveTarget * 100).toFixed(1)),
    probLossAboveTarget: Number((probLossAboveTarget * 100).toFixed(1)),
  };
}

/**
 * Monte Carlo Terminal Price & P&L distribution simulation
 * Simulates N paths of geometric Brownian motion S_T = S_0 * exp((r - q - 0.5*sigma^2)*T + sigma*sqrt(T)*Z)
 */
export function runMonteCarloSimulation(
  legs: OptionLeg[],
  spot: number,
  iv: number,
  daysToExpiry: number,
  intradayHours?: number,
  riskFreeRate: number = 0.045,
  dividendYield: number = 0.015,
  contractMultiplier: number = 100,
  numSimulations: number = 2000
) {
  const T = dteToYears(daysToExpiry, intradayHours);
  const drift = (riskFreeRate - dividendYield - 0.5 * iv * iv) * T;
  const vol = iv * Math.sqrt(T);

  const results: Array<{ terminalPrice: number; pnl: number }> = [];
  let winCount = 0;
  let totalPnl = 0;

  // Box-Muller transform for standard normal random variables
  for (let i = 0; i < numSimulations; i++) {
    const u1 = Math.max(1e-10, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const terminalPrice = spot * Math.exp(drift + vol * z);
    const pnl = getStrategyProfitLoss(legs, terminalPrice, 1.0, contractMultiplier, 0, riskFreeRate, dividendYield);

    results.push({ terminalPrice, pnl });
    if (pnl > 0) winCount++;
    totalPnl += pnl;
  }

  // Create histogram bins for plotting
  const prices = results.map(r => r.terminalPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const binCount = 30;
  const binWidth = (maxPrice - minPrice) / binCount;

  const bins: Array<{
    binStart: number;
    binEnd: number;
    binMid: number;
    count: number;
    avgPnl: number;
    isProfit: boolean;
  }> = [];

  for (let b = 0; b < binCount; b++) {
    const start = minPrice + b * binWidth;
    const end = start + binWidth;
    const mid = (start + end) / 2;

    const itemsInBin = results.filter(r => r.terminalPrice >= start && r.terminalPrice < end);
    const avgPnl = itemsInBin.length > 0 
      ? itemsInBin.reduce((s, item) => s + item.pnl, 0) / itemsInBin.length 
      : 0;

    bins.push({
      binStart: start,
      binEnd: end,
      binMid: mid,
      count: itemsInBin.length,
      avgPnl,
      isProfit: avgPnl >= 0,
    });
  }

  return {
    simulatedPop: Number(((winCount / numSimulations) * 100).toFixed(1)),
    simulatedEv: Number((totalPnl / numSimulations).toFixed(2)),
    bins,
    sampleSize: numSimulations,
  };
}
