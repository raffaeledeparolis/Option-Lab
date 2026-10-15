import React, { useState, useMemo } from 'react';
import { OptionLeg, UnderlyingAsset, ComparisonStrategy } from '../types/options';
import { calculateStrategyMetrics, calculateStrategyGreeks, getStrategyProfitLoss } from '../utils/blackScholes';
import { GitCompare, BookmarkPlus, Check, Layers } from 'lucide-react';

interface StrategyComparatorProps {
  currentLegs: OptionLeg[];
  asset: UnderlyingAsset;
  onLoadStrategyToBuilder: (legs: OptionLeg[]) => void;
}

export const StrategyComparator: React.FC<StrategyComparatorProps> = ({
  currentLegs,
  asset,
  onLoadStrategyToBuilder,
}) => {
  const [strategies, setStrategies] = useState<ComparisonStrategy[]>(() => {
    // Generate initial comparison presets based on current asset
    const spot = asset.spotPrice;
    const tick = asset.tickSize;
    const atm = Math.round(spot / tick) * tick;

    // Slot 1: Bull Call Spread
    const legsA: OptionLeg[] = [
      {
        id: 'comp-1',
        action: 'BUY',
        type: 'CALL',
        strike: atm,
        expiration: '30D',
        daysToExpiry: 30,
        quantity: 1,
        premium: spot * 0.03,
        iv: asset.iv,
      },
      {
        id: 'comp-2',
        action: 'SELL',
        type: 'CALL',
        strike: atm + tick * 2,
        expiration: '30D',
        daysToExpiry: 30,
        quantity: 1,
        premium: spot * 0.015,
        iv: asset.iv,
      },
    ];

    // Slot 2: Iron Condor
    const legsB: OptionLeg[] = [
      {
        id: 'comp-3',
        action: 'BUY',
        type: 'PUT',
        strike: atm - tick * 3,
        expiration: '30D',
        daysToExpiry: 30,
        quantity: 1,
        premium: spot * 0.008,
        iv: asset.iv,
      },
      {
        id: 'comp-4',
        action: 'SELL',
        type: 'PUT',
        strike: atm - tick * 1,
        expiration: '30D',
        daysToExpiry: 30,
        quantity: 1,
        premium: spot * 0.02,
        iv: asset.iv,
      },
      {
        id: 'comp-5',
        action: 'SELL',
        type: 'CALL',
        strike: atm + tick * 1,
        expiration: '30D',
        daysToExpiry: 30,
        quantity: 1,
        premium: spot * 0.02,
        iv: asset.iv,
      },
      {
        id: 'comp-6',
        action: 'BUY',
        type: 'CALL',
        strike: atm + tick * 3,
        expiration: '30D',
        daysToExpiry: 30,
        quantity: 1,
        premium: spot * 0.008,
        iv: asset.iv,
      },
    ];

    // Slot 3: Long Call
    const legsC: OptionLeg[] = [
      {
        id: 'comp-7',
        action: 'BUY',
        type: 'CALL',
        strike: atm,
        expiration: '30D',
        daysToExpiry: 30,
        quantity: 1,
        premium: spot * 0.03,
        iv: asset.iv,
      },
    ];

    const mult = asset.contractMultiplier;
    return [
      {
        id: 'slot-A',
        name: 'Strategia A: Bull Call Spread',
        color: '#10b981', // emerald
        legs: legsA,
        metrics: calculateStrategyMetrics(legsA, spot, mult, asset.riskFreeRate, asset.dividendYield),
        greeks: calculateStrategyGreeks(legsA, spot, mult, asset.riskFreeRate, asset.dividendYield),
      },
      {
        id: 'slot-B',
        name: 'Strategia B: Iron Condor',
        color: '#38bdf8', // sky
        legs: legsB,
        metrics: calculateStrategyMetrics(legsB, spot, mult, asset.riskFreeRate, asset.dividendYield),
        greeks: calculateStrategyGreeks(legsB, spot, mult, asset.riskFreeRate, asset.dividendYield),
      },
      {
        id: 'slot-C',
        name: 'Strategia C: Long Call ATM',
        color: '#f59e0b', // amber
        legs: legsC,
        metrics: calculateStrategyMetrics(legsC, spot, mult, asset.riskFreeRate, asset.dividendYield),
        greeks: calculateStrategyGreeks(legsC, spot, mult, asset.riskFreeRate, asset.dividendYield),
      },
    ];
  });

  const [savedSlotFeedback, setSavedSlotFeedback] = useState<string | null>(null);

  // Save current strategy to a specific slot
  const handleSaveToSlot = (slotIndex: number) => {
    if (currentLegs.length === 0) return;
    const spot = asset.spotPrice;
    const mult = asset.contractMultiplier;

    const newStrategies = [...strategies];
    const targetSlot = newStrategies[slotIndex];
    const slotLetter = slotIndex === 0 ? 'A' : slotIndex === 1 ? 'B' : 'C';

    targetSlot.name = `Strategia ${slotLetter}: Custom (${currentLegs.length} gambe)`;
    targetSlot.legs = JSON.parse(JSON.stringify(currentLegs));
    targetSlot.metrics = calculateStrategyMetrics(targetSlot.legs, spot, mult, asset.riskFreeRate, asset.dividendYield);
    targetSlot.greeks = calculateStrategyGreeks(targetSlot.legs, spot, mult, asset.riskFreeRate, asset.dividendYield);

    setStrategies(newStrategies);
    setSavedSlotFeedback(`Salvata in Slot ${slotLetter}`);
    setTimeout(() => setSavedSlotFeedback(null), 2500);
  };

  // Compare chart bounds
  const spot = asset.spotPrice;
  const minPrice = spot * 0.9;
  const maxPrice = spot * 1.1;
  const priceCount = 80;
  const priceStep = (maxPrice - minPrice) / priceCount;

  // Calculate curves
  const curves = useMemo(() => {
    let minPnl = 0;
    let maxPnl = 0;

    const result = strategies.map((strat) => {
      const points: Array<{ price: number; pnl: number }> = [];
      for (let i = 0; i <= priceCount; i++) {
        const p = minPrice + i * priceStep;
        const pnl = getStrategyProfitLoss(
          strat.legs,
          p,
          1.0,
          asset.contractMultiplier,
          0,
          asset.riskFreeRate,
          asset.dividendYield
        );
        points.push({ price: p, pnl });
        minPnl = Math.min(minPnl, pnl);
        maxPnl = Math.max(maxPnl, pnl);
      }
      return {
        strategy: strat,
        points,
      };
    });

    return {
      curvesData: result,
      minPnl: minPnl - Math.abs(minPnl) * 0.15 - 50,
      maxPnl: maxPnl + Math.abs(maxPnl) * 0.15 + 50,
    };
  }, [strategies, spot, minPrice, maxPrice, priceStep, asset.contractMultiplier, asset.riskFreeRate, asset.dividendYield]);

  // Chart SVG Geometry
  const width = 760;
  const height = 280;
  const padding = { top: 25, right: 30, bottom: 35, left: 55 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const scaleX = (p: number) => padding.left + ((p - minPrice) / (maxPrice - minPrice)) * innerW;
  const scaleY = (val: number) =>
    height - padding.bottom - ((val - curves.minPnl) / (curves.maxPnl - curves.minPnl)) * innerH;

  const zeroY = scaleY(0);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm mb-4">
      {/* Header */}
      <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-emerald-400" />
            <span>Confronto Strategie Affiancate (Fino a 3 Strategie)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Analizza il tradeoff tra rischio, profitto massimo, POP e greche su tre strutture simultanee.
          </p>
        </div>

        {savedSlotFeedback && (
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 font-mono">
            <Check className="w-3.5 h-3.5" />
            {savedSlotFeedback}
          </span>
        )}
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-900/60 font-mono text-xs">
        {strategies.map((strat, idx) => (
          <div
            key={strat.id}
            className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: strat.color }}
                  />
                  <span className="font-bold text-white text-xs truncate max-w-[170px]">
                    {strat.name}
                  </span>
                </div>
                <button
                  onClick={() => onLoadStrategyToBuilder(strat.legs)}
                  title="Carica questa strategia nel builder principale"
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                >
                  Carica
                </button>
              </div>

              {/* Legs summary */}
              <div className="text-[11px] text-slate-400 mb-3 space-y-0.5">
                {strat.legs.map((l) => (
                  <div key={l.id}>
                    {l.action} {l.quantity}x {l.type} {asset.currency}{l.strike} ({l.expiration})
                  </div>
                ))}
              </div>

              {/* Metrics table */}
              <div className="space-y-1.5 pt-2 border-t border-slate-850 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Costo / Entrata:</span>
                  <span
                    className={
                      strat.metrics.netCost < 0
                        ? 'text-emerald-400 font-bold'
                        : 'text-amber-400 font-bold'
                    }
                  >
                    {strat.metrics.netCost < 0 ? 'Credito ' : 'Debito '}
                    {asset.currency}{Math.abs(strat.metrics.netCost).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Max Profitto:</span>
                  <span className="text-emerald-400 font-bold">
                    {strat.metrics.maxProfit === null ? 'Illimitato' : `+${asset.currency}${strat.metrics.maxProfit}`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Max Perdita:</span>
                  <span className="text-rose-400 font-bold">
                    {strat.metrics.maxLoss === null ? 'Illimitata' : `${asset.currency}${strat.metrics.maxLoss}`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Prob. Profitto (POP):</span>
                  <span className="text-white font-bold">{strat.metrics.pop}%</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Delta Totale (Δ):</span>
                  <span className="text-slate-200 font-bold">{strat.greeks.delta}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Theta Totale (Θ):</span>
                  <span className={strat.greeks.theta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {strat.greeks.theta >= 0 ? '+' : ''}{asset.currency}{strat.greeks.theta}/d
                  </span>
                </div>
              </div>
            </div>

            {/* Overwrite with current builder legs button */}
            <div className="mt-3 pt-2.5 border-t border-slate-850">
              <button
                onClick={() => handleSaveToSlot(idx)}
                disabled={currentLegs.length === 0}
                className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Salva Strategia Corrente Qui</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Overlaid Payoff Chart */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-semibold text-slate-300">
            Confronto Curve di Payoff Sovrapposte a Scadenza
          </span>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            {strategies.map((strat) => (
              <div key={strat.id} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: strat.color }}
                />
                <span className="text-slate-300">{strat.name.split(':')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {/* Baseline */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Spot Line */}
          <line
            x1={scaleX(spot)}
            y1={padding.top}
            x2={scaleX(spot)}
            y2={height - padding.bottom}
            stroke="#f59e0b"
            strokeWidth="1.2"
            strokeDasharray="3,3"
          />

          {/* Curves */}
          {curves.curvesData.map(({ strategy, points }) => {
            const pathStr = points
              .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.price)} ${scaleY(pt.pnl)}`)
              .join(' ');

            return (
              <path
                key={strategy.id}
                d={pathStr}
                fill="none"
                stroke={strategy.color}
                strokeWidth="2.5"
                opacity="0.95"
              />
            );
          })}

          {/* Axis Labels */}
          <text
            x={scaleX(spot)}
            y={height - 10}
            textAnchor="middle"
            className="fill-amber-400 font-mono text-[10px] font-bold"
          >
            Spot {asset.currency}{spot.toFixed(2)}
          </text>
        </svg>
      </div>
    </div>
  );
};
