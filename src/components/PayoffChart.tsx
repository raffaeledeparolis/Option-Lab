import React, { useState, useMemo, useRef } from 'react';
import { OptionLeg, UnderlyingAsset, StrategyMetrics } from '../types/options';
import { getStrategyProfitLoss, calculateBlackScholes, dteToYears } from '../utils/blackScholes';
import { Eye, Info, Clock, TrendingUp, Sliders } from 'lucide-react';

interface PayoffChartProps {
  legs: OptionLeg[];
  asset: UnderlyingAsset;
  metrics: StrategyMetrics;
  ivOffset: number; // e.g. 0
  spotOffset: number; // e.g. 0
}

export const PayoffChart: React.FC<PayoffChartProps> = ({
  legs,
  asset,
  metrics,
  ivOffset,
  spotOffset,
}) => {
  // Chart view controls
  const [showExpirationPayoff, setShowExpirationPayoff] = useState(true);
  const [showTodayPayoff, setShowTodayPayoff] = useState(true);
  const [showFuturePayoff, setShowFuturePayoff] = useState(true);
  const [futureTimeRatio, setFutureTimeRatio] = useState(0.5); // 0 = now, 1 = expiry

  // Greeks overlays
  const [activeGreek, setActiveGreek] = useState<'NONE' | 'DELTA' | 'GAMMA' | 'THETA' | 'VEGA'>('NONE');

  // Mouse hover state
  const [hoveredX, setHoveredX] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement | null>(null);

  const spot = asset.spotPrice + spotOffset;
  const is0DTE = legs.some((l) => l.is0DTE);

  // Determine chart price domain
  const { minPrice, maxPrice, priceStep, pointsCount } = useMemo(() => {
    if (legs.length === 0) {
      return {
        minPrice: spot * 0.9,
        maxPrice: spot * 1.1,
        priceStep: (spot * 0.2) / 100,
        pointsCount: 100,
      };
    }

    const strikes = legs.map((l) => l.strike);
    const lowestStrike = Math.min(spot, ...strikes);
    const highestStrike = Math.max(spot, ...strikes);
    const spread = Math.max(spot * 0.08, highestStrike - lowestStrike);

    const min = Math.max(asset.tickSize, lowestStrike - spread * 0.8);
    const max = highestStrike + spread * 0.8;
    const count = 120;
    const step = (max - min) / count;

    return {
      minPrice: min,
      maxPrice: max,
      priceStep: step,
      pointsCount: count,
    };
  }, [legs, spot, asset.tickSize]);

  // Compute curve points
  const { dataPoints, minPnl, maxPnl, maxGreekVal, minGreekVal } = useMemo(() => {
    const points: Array<{
      price: number;
      pnlExpiry: number;
      pnlToday: number;
      pnlFuture: number;
      greekVal?: number;
    }> = [];

    let minPnLVal = 0;
    let maxPnLVal = 0;
    let minG = 0;
    let maxG = 0;

    for (let i = 0; i <= pointsCount; i++) {
      const price = minPrice + i * priceStep;

      // PnL at expiry (ratio = 1.0)
      const pnlExpiry = getStrategyProfitLoss(
        legs,
        price,
        1.0,
        asset.contractMultiplier,
        ivOffset,
        asset.riskFreeRate,
        asset.dividendYield
      );

      // PnL today (ratio = 0.0)
      const pnlToday = getStrategyProfitLoss(
        legs,
        price,
        0.0,
        asset.contractMultiplier,
        ivOffset,
        asset.riskFreeRate,
        asset.dividendYield
      );

      // PnL at future time
      const pnlFuture = getStrategyProfitLoss(
        legs,
        price,
        futureTimeRatio,
        asset.contractMultiplier,
        ivOffset,
        asset.riskFreeRate,
        asset.dividendYield
      );

      // Calculate Greek if selected
      let greekVal = 0;
      if (activeGreek !== 'NONE') {
        for (const leg of legs) {
          const T = dteToYears(leg.daysToExpiry, leg.intradayHoursRemaining);
          const bs = calculateBlackScholes(
            leg.type,
            price,
            leg.strike,
            T,
            asset.riskFreeRate,
            Math.max(0.01, leg.iv + ivOffset),
            asset.dividendYield
          );
          const sign = (leg.action === 'BUY' ? 1 : -1) * leg.quantity * asset.contractMultiplier;
          if (activeGreek === 'DELTA') greekVal += bs.delta * sign;
          if (activeGreek === 'GAMMA') greekVal += bs.gamma * sign;
          if (activeGreek === 'THETA') greekVal += (leg.is0DTE ? bs.thetaHourly : bs.theta) * sign;
          if (activeGreek === 'VEGA') greekVal += bs.vega * sign;
        }
      }

      minPnLVal = Math.min(minPnLVal, pnlExpiry, pnlToday, pnlFuture);
      maxPnLVal = Math.max(maxPnLVal, pnlExpiry, pnlToday, pnlFuture);
      minG = Math.min(minG, greekVal);
      maxG = Math.max(maxG, greekVal);

      points.push({
        price,
        pnlExpiry,
        pnlToday,
        pnlFuture,
        greekVal,
      });
    }

    // Add padding to Y bounds
    const pnlRange = Math.max(50, maxPnLVal - minPnLVal);
    const safeMinPnl = minPnLVal - pnlRange * 0.15;
    const safeMaxPnl = maxPnLVal + pnlRange * 0.15;

    return {
      dataPoints: points,
      minPnl: safeMinPnl,
      maxPnl: safeMaxPnl,
      maxGreekVal: maxG === 0 ? 1 : maxG * 1.2,
      minGreekVal: minG === 0 ? -1 : minG * 1.2,
    };
  }, [
    legs,
    minPrice,
    maxPrice,
    priceStep,
    pointsCount,
    asset.contractMultiplier,
    asset.riskFreeRate,
    asset.dividendYield,
    ivOffset,
    futureTimeRatio,
    activeGreek,
  ]);

  // SVG Geometry
  const width = 800;
  const height = 360;
  const padding = { top: 30, right: 40, bottom: 40, left: 60 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const scaleX = (p: number) => {
    return padding.left + ((p - minPrice) / (maxPrice - minPrice)) * innerWidth;
  };

  const scaleY = (val: number) => {
    return height - padding.bottom - ((val - minPnl) / (maxPnl - minPnl)) * innerHeight;
  };

  const scaleGreekY = (val: number) => {
    const range = Math.max(0.001, maxGreekVal - minGreekVal);
    return height - padding.bottom - ((val - minGreekVal) / range) * innerHeight;
  };

  const zeroY = scaleY(0);

  // Generate SVG paths
  const expiryPath = useMemo(() => {
    return dataPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.price)} ${scaleY(pt.pnlExpiry)}`)
      .join(' ');
  }, [dataPoints, minPrice, maxPrice, minPnl, maxPnl]);

  const todayPath = useMemo(() => {
    return dataPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.price)} ${scaleY(pt.pnlToday)}`)
      .join(' ');
  }, [dataPoints, minPrice, maxPrice, minPnl, maxPnl]);

  const futurePath = useMemo(() => {
    return dataPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.price)} ${scaleY(pt.pnlFuture)}`)
      .join(' ');
  }, [dataPoints, minPrice, maxPrice, minPnl, maxPnl]);

  const greekPath = useMemo(() => {
    if (activeGreek === 'NONE') return '';
    return dataPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.price)} ${scaleGreekY(pt.greekVal || 0)}`)
      .join(' ');
  }, [dataPoints, activeGreek, minGreekVal, maxGreekVal]);

  // Shaded profit/loss areas for Expiry
  const profitAreaPath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    const startX = scaleX(dataPoints[0].price);
    const endX = scaleX(dataPoints[dataPoints.length - 1].price);

    let d = `M ${startX} ${zeroY}`;
    for (const pt of dataPoints) {
      const yVal = Math.min(zeroY, scaleY(Math.max(0, pt.pnlExpiry)));
      d += ` L ${scaleX(pt.price)} ${yVal}`;
    }
    d += ` L ${endX} ${zeroY} Z`;
    return d;
  }, [dataPoints, zeroY, minPnl, maxPnl]);

  const lossAreaPath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    const startX = scaleX(dataPoints[0].price);
    const endX = scaleX(dataPoints[dataPoints.length - 1].price);

    let d = `M ${startX} ${zeroY}`;
    for (const pt of dataPoints) {
      const yVal = Math.max(zeroY, scaleY(Math.min(0, pt.pnlExpiry)));
      d += ` L ${scaleX(pt.price)} ${yVal}`;
    }
    d += ` L ${endX} ${zeroY} Z`;
    return d;
  }, [dataPoints, zeroY, minPnl, maxPnl]);

  // Hover crosshair calculation
  const hoveredPoint = useMemo(() => {
    if (hoveredX === null) return null;
    const targetPrice = minPrice + ((hoveredX - padding.left) / innerWidth) * (maxPrice - minPrice);
    if (targetPrice < minPrice || targetPrice > maxPrice) return null;

    // Find closest point
    let closest = dataPoints[0];
    let minDiff = Math.abs(dataPoints[0].price - targetPrice);
    for (const pt of dataPoints) {
      const diff = Math.abs(pt.price - targetPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    return closest;
  }, [hoveredX, dataPoints, minPrice, maxPrice]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    if (x >= padding.left && x <= width - padding.right) {
      setHoveredX(x);
    } else {
      setHoveredX(null);
    }
  };

  // Label for future time slider
  const getFutureTimeLabel = () => {
    if (!is0DTE) {
      const pct = Math.round(futureTimeRatio * 100);
      return `${pct}% del tempo trascorso`;
    }
    // 0DTE intraday session (09:30 to 16:00 = 6.5h)
    const totalMinutes = 390;
    const passedMinutes = Math.round(futureTimeRatio * totalMinutes);
    const sessionHour = 9 + Math.floor((30 + passedMinutes) / 60);
    const sessionMinute = (30 + passedMinutes) % 60;
    const timeStr = `${sessionHour.toString().padStart(2, '0')}:${sessionMinute.toString().padStart(2, '0')}`;
    return `Intraday 0DTE: ore ${timeStr} EST`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm mb-4">
      {/* Chart Top Controls Toolbar */}
      <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Payoff Curve Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExpirationPayoff(!showExpirationPayoff)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all border ${
              showExpirationPayoff
                ? 'bg-slate-800 border-slate-700 text-white font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>A Scadenza (T+End)</span>
          </button>

          <button
            onClick={() => setShowTodayPayoff(!showTodayPayoff)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all border ${
              showTodayPayoff
                ? 'bg-slate-800 border-slate-700 text-white font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Oggi (T+0)</span>
          </button>

          <button
            onClick={() => setShowFuturePayoff(!showFuturePayoff)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all border ${
              showFuturePayoff
                ? 'bg-slate-800 border-slate-700 text-white font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Data Futura / Intraday</span>
          </button>
        </div>

        {/* Greeks Overlay Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px] font-medium mr-1">Overlay Greca:</span>
          {(['NONE', 'DELTA', 'GAMMA', 'THETA', 'VEGA'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setActiveGreek(g)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                activeGreek === g
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {g === 'NONE'
                ? 'Off'
                : g === 'DELTA'
                ? 'Δ Delta'
                : g === 'GAMMA'
                ? 'Γ Gamma'
                : g === 'THETA'
                ? 'Θ Theta'
                : 'ν Vega'}
            </button>
          ))}
        </div>
      </div>

      {/* Intraday 0DTE & Future Time Slider */}
      {showFuturePayoff && (
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{getFutureTimeLabel()}</span>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="text-[11px] text-slate-400">Adesso</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={futureTimeRatio}
              onChange={(e) => setFutureTimeRatio(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="text-[11px] text-slate-400">Scadenza</span>
          </div>
        </div>
      )}

      {/* SVG Payoff Graphic */}
      <div className="relative p-2 bg-slate-950/50">
        <svg
          ref={chartRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredX(null)}
        >
          <defs>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75].map((ratio) => {
            const pnlVal = minPnl + (maxPnl - minPnl) * (ratio + 0.5);
            const y = scaleY(pnlVal);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[9px]"
                >
                  {asset.currency}{Math.round(pnlVal)}
                </text>
              </g>
            );
          })}

          {/* Zero PnL Baseline */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Profit & Loss shaded fill regions */}
          <path d={profitAreaPath} fill="url(#profitGrad)" />
          <path d={lossAreaPath} fill="url(#lossGrad)" />

          {/* Spot price vertical line */}
          <line
            x1={scaleX(spot)}
            y1={padding.top}
            x2={scaleX(spot)}
            y2={height - padding.bottom}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
          <text
            x={scaleX(spot)}
            y={padding.top - 8}
            textAnchor="middle"
            className="fill-amber-400 font-mono text-[10px] font-bold"
          >
            Spot {asset.currency}{spot.toFixed(2)}
          </text>

          {/* Break-Even Points */}
          {metrics.breakEvens.map((bep) => {
            const x = scaleX(bep);
            if (x < padding.left || x > width - padding.right) return null;
            return (
              <g key={bep}>
                <line
                  x1={x}
                  y1={padding.top + 15}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                  strokeDasharray="3,3"
                />
                <circle cx={x} cy={zeroY} r="3" fill="#ffffff" />
                <text
                  x={x}
                  y={height - padding.bottom + 15}
                  textAnchor="middle"
                  className="fill-slate-300 font-mono text-[9px] font-semibold"
                >
                  BE {bep}
                </text>
              </g>
            );
          })}

          {/* Greek overlay curve */}
          {activeGreek !== 'NONE' && (
            <path
              d={greekPath}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
          )}

          {/* Payoff at Future Date curve */}
          {showFuturePayoff && (
            <path
              d={futurePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeOpacity="0.9"
            />
          )}

          {/* Payoff Today curve */}
          {showTodayPayoff && (
            <path
              d={todayPath}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeOpacity="0.95"
            />
          )}

          {/* Payoff at Expiration curve */}
          {showExpirationPayoff && (
            <path
              d={expiryPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
            />
          )}

          {/* Crosshair cursor when hovered */}
          {hoveredPoint && (
            <g>
              <line
                x1={scaleX(hoveredPoint.price)}
                y1={padding.top}
                x2={scaleX(hoveredPoint.price)}
                y2={height - padding.bottom}
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle
                cx={scaleX(hoveredPoint.price)}
                cy={scaleY(hoveredPoint.pnlExpiry)}
                r="4"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={scaleX(hoveredPoint.price)}
                cy={scaleY(hoveredPoint.pnlToday)}
                r="4"
                fill="#22d3ee"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* X-axis tick labels */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((fraction) => {
            const p = minPrice + (maxPrice - minPrice) * fraction;
            const x = scaleX(p);
            return (
              <text
                key={fraction}
                x={x}
                y={height - padding.bottom + 28}
                textAnchor="middle"
                className="fill-slate-500 font-mono text-[10px]"
              >
                {asset.currency}{p.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)}
              </text>
            );
          })}
        </svg>

        {/* Hover Crosshair Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs font-mono backdrop-blur-md pointer-events-none">
            <div className="text-slate-300 font-bold mb-1 border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
              <span>Prezzo Sottostante:</span>
              <span className="text-white text-sm">
                {asset.currency}{hoveredPoint.price.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)}
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-emerald-400">P&L a Scadenza:</span>
                <span className={`font-bold ${hoveredPoint.pnlExpiry >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hoveredPoint.pnlExpiry >= 0 ? '+' : ''}{asset.currency}{hoveredPoint.pnlExpiry.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-cyan-400">P&L Oggi:</span>
                <span className={`font-bold ${hoveredPoint.pnlToday >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {hoveredPoint.pnlToday >= 0 ? '+' : ''}{asset.currency}{hoveredPoint.pnlToday.toFixed(2)}
                </span>
              </div>
              {showFuturePayoff && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-amber-400">P&L Data Futura:</span>
                  <span className={`font-bold ${hoveredPoint.pnlFuture >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {hoveredPoint.pnlFuture >= 0 ? '+' : ''}{asset.currency}{hoveredPoint.pnlFuture.toFixed(2)}
                  </span>
                </div>
              )}
              {activeGreek !== 'NONE' && hoveredPoint.greekVal !== undefined && (
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                  <span className="text-indigo-400">{activeGreek}:</span>
                  <span className="text-indigo-300 font-bold">
                    {hoveredPoint.greekVal.toFixed(3)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
