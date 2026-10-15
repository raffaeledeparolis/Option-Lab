import React, { useState, useMemo } from 'react';
import { OptionLeg, UnderlyingAsset, StrategyMetrics } from '../types/options';
import { runMonteCarloSimulation, normalCdf, dteToYears } from '../utils/blackScholes';
import { BarChart2, RefreshCw, Target, HelpCircle } from 'lucide-react';

interface ProbabilisticAnalysisProps {
  legs: OptionLeg[];
  asset: UnderlyingAsset;
  metrics: StrategyMetrics;
  ivOffset: number;
}

export const ProbabilisticAnalysis: React.FC<ProbabilisticAnalysisProps> = ({
  legs,
  asset,
  metrics,
  ivOffset,
}) => {
  const [targetProfit, setTargetProfit] = useState(250);
  const [targetLoss, setTargetLoss] = useState(250);
  const [simSeed, setSimSeed] = useState(0);

  const spot = asset.spotPrice;
  const currentIv = Math.max(0.01, asset.iv * (1 + ivOffset));
  const avgDte = legs.length > 0 ? legs.reduce((a, b) => a + b.daysToExpiry, 0) / legs.length : 30;
  const is0DTE = legs.some((l) => l.is0DTE);
  const hoursRemaining = legs[0]?.intradayHoursRemaining;

  // Run Monte Carlo
  const mcResult = useMemo(() => {
    return runMonteCarloSimulation(
      legs,
      spot,
      currentIv,
      avgDte,
      hoursRemaining,
      asset.riskFreeRate,
      asset.dividendYield,
      asset.contractMultiplier,
      2000
    );
  }, [legs, spot, currentIv, avgDte, hoursRemaining, asset.riskFreeRate, asset.dividendYield, asset.contractMultiplier, simSeed]);

  // Calculate probability of closing above/below individual strikes
  const strikeProbabilities = useMemo(() => {
    const T = dteToYears(avgDte, hoursRemaining);
    const sigmaRootT = currentIv * Math.sqrt(T);
    const mu = Math.log(spot) + (asset.riskFreeRate - asset.dividendYield - 0.5 * currentIv * currentIv) * T;

    const uniqueStrikes = Array.from(new Set(legs.map((l) => l.strike))).sort((a, b) => a - b);

    return uniqueStrikes.map((k) => {
      // P(S_T > K)
      const d2 = (Math.log(spot / k) + (asset.riskFreeRate - asset.dividendYield - 0.5 * currentIv * currentIv) * T) / sigmaRootT;
      const probAbove = normalCdf(d2);
      const probBelow = 1 - probAbove;

      return {
        strike: k,
        probAbove: Number((probAbove * 100).toFixed(1)),
        probBelow: Number((probBelow * 100).toFixed(1)),
      };
    });
  }, [legs, spot, currentIv, avgDte, hoursRemaining, asset.riskFreeRate, asset.dividendYield]);

  // Target Profit/Loss probability based on Monte Carlo results
  const probProfitTarget = useMemo(() => {
    if (!mcResult || mcResult.sampleSize === 0) return 0;
    // Count bins where avgPnl >= targetProfit
    let count = 0;
    for (const bin of mcResult.bins) {
      if (bin.avgPnl >= targetProfit) count += bin.count;
    }
    return Number(((count / mcResult.sampleSize) * 100).toFixed(1));
  }, [mcResult, targetProfit]);

  const probLossTarget = useMemo(() => {
    if (!mcResult || mcResult.sampleSize === 0) return 0;
    let count = 0;
    for (const bin of mcResult.bins) {
      if (bin.avgPnl <= -targetLoss) count += bin.count;
    }
    return Number(((count / mcResult.sampleSize) * 100).toFixed(1));
  }, [mcResult, targetLoss]);

  // Histogram SVG max count
  const maxBinCount = Math.max(1, ...mcResult.bins.map((b) => b.count));
  const svgWidth = 720;
  const svgHeight = 220;
  const chartPadding = { top: 20, right: 20, bottom: 35, left: 40 };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm mb-4">
      {/* Header */}
      <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>Analisi Probabilistica & Simulazione Monte Carlo (2.000 Percorsi)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Stima statistica della Probability of Profit (POP), Expected Value e densità dei prezzi finali tramite moto Browniano geometrico.
          </p>
        </div>

        <button
          onClick={() => setSimSeed((s) => s + 1)}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto font-mono text-[11px]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ri-esegui Simulazione</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-900/60 font-mono text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px]">Probability of Profit (POP)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                metrics.pop >= 60 ? 'text-emerald-400' : metrics.pop <= 40 ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {metrics.pop}%
            </span>
            <span className="text-[10px] text-slate-400">Teorica Black-Scholes</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Monte Carlo: <span className="text-white font-bold">{mcResult.simulatedPop}%</span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px]">Valore Atteso (Expected Value)</span>
          <div className="mt-1">
            <span
              className={`text-2xl font-bold ${
                metrics.expectedValue >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.expectedValue >= 0 ? '+' : ''}{asset.currency}{metrics.expectedValue.toFixed(2)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            EV Monte Carlo: <span className="text-white font-bold">{asset.currency}{mcResult.simulatedEv}</span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Probabilità Profitto &gt;</span>
            <div className="flex items-center gap-1">
              <span>{asset.currency}</span>
              <input
                type="number"
                value={targetProfit}
                onChange={(e) => setTargetProfit(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1 text-center font-bold text-white text-[10px]"
              />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold text-emerald-400">{probProfitTarget}%</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Prob. di superare +{asset.currency}{targetProfit} a scadenza
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Probabilità Perdita &gt;</span>
            <div className="flex items-center gap-1">
              <span>{asset.currency}</span>
              <input
                type="number"
                value={targetLoss}
                onChange={(e) => setTargetLoss(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1 text-center font-bold text-white text-[10px]"
              />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold text-rose-400">{probLossTarget}%</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Prob. di perdere più di -{asset.currency}{targetLoss}
          </div>
        </div>
      </div>

      {/* Monte Carlo Terminal Distribution Histogram */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-semibold text-slate-300">
            Distribuzione dei Prezzi Finali e Zone di Profitto / Perdita
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            Verde = Profitto (&gt; 0) | Rosso = Perdita (&lt; 0)
          </span>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none bg-slate-950/40 rounded-lg border border-slate-800">
          {mcResult.bins.map((bin, i) => {
            const innerW = svgWidth - chartPadding.left - chartPadding.right;
            const barW = innerW / mcResult.bins.length - 2;
            const x = chartPadding.left + i * (innerW / mcResult.bins.length);
            const innerH = svgHeight - chartPadding.top - chartPadding.bottom;
            const barH = (bin.count / maxBinCount) * innerH;
            const y = svgHeight - chartPadding.bottom - barH;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={Math.max(1, barW)}
                  height={barH}
                  fill={bin.isProfit ? '#10b981' : '#ef4444'}
                  opacity={0.8}
                  className="hover:opacity-100 transition-opacity"
                />
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={chartPadding.left}
            y1={svgHeight - chartPadding.bottom}
            x2={svgWidth - chartPadding.right}
            y2={svgHeight - chartPadding.bottom}
            stroke="#475569"
            strokeWidth="1"
          />

          {/* Min and Max Price Labels */}
          {mcResult.bins.length > 0 && (
            <>
              <text
                x={chartPadding.left}
                y={svgHeight - 12}
                textAnchor="start"
                className="fill-slate-400 font-mono text-[10px]"
              >
                {asset.currency}{mcResult.bins[0].binStart.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)}
              </text>
              <text
                x={svgWidth / 2}
                y={svgHeight - 12}
                textAnchor="middle"
                className="fill-amber-400 font-mono text-[10px] font-bold"
              >
                Spot {asset.currency}{spot.toFixed(2)}
              </text>
              <text
                x={svgWidth - chartPadding.right}
                y={svgHeight - 12}
                textAnchor="end"
                className="fill-slate-400 font-mono text-[10px]"
              >
                {asset.currency}{mcResult.bins[mcResult.bins.length - 1].binEnd.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Probability of Closing Above/Below Strikes */}
      {strikeProbabilities.length > 0 && (
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 mb-2 font-mono">
            Probabilità di Chiusura Sopra / Sotto gli Strike Selezionati
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            {strikeProbabilities.map((sp) => (
              <div key={sp.strike} className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-white font-bold text-[11px] mb-1">
                  Strike {asset.currency}{sp.strike}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>P(S &gt; Strike):</span>
                  <span className="text-emerald-400 font-bold">{sp.probAbove}%</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>P(S &lt; Strike):</span>
                  <span className="text-rose-400 font-bold">{sp.probBelow}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
