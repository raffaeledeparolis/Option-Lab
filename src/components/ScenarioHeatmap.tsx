import React, { useState, useMemo } from 'react';
import { OptionLeg, UnderlyingAsset } from '../types/options';
import { getStrategyProfitLoss } from '../utils/blackScholes';
import { Grid3X3, Table } from 'lucide-react';

interface ScenarioHeatmapProps {
  legs: OptionLeg[];
  asset: UnderlyingAsset;
  ivOffset: number;
}

export const ScenarioHeatmap: React.FC<ScenarioHeatmapProps> = ({ legs, asset, ivOffset }) => {
  const [viewMode, setViewMode] = useState<'HEATMAP' | 'TABLE'>('HEATMAP');
  const [displayUnit, setDisplayUnit] = useState<'CURRENCY' | 'PERCENT'>('CURRENCY');
  const [hoveredCell, setHoveredCell] = useState<{
    price: number;
    timeLabel: string;
    pnl: number;
  } | null>(null);

  const spot = asset.spotPrice;
  const is0DTE = legs.some((l) => l.is0DTE);

  // Price points for X axis (11 steps centered around spot)
  const priceSteps = useMemo(() => {
    const rangePct = is0DTE ? 0.03 : 0.08; // tighter range for 0DTE
    const minP = spot * (1 - rangePct);
    const maxP = spot * (1 + rangePct);
    const stepCount = 11;
    const step = (maxP - minP) / (stepCount - 1);

    const arr: number[] = [];
    for (let i = 0; i < stepCount; i++) {
      const p = minP + i * step;
      arr.push(Number(p.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)));
    }
    return arr;
  }, [spot, is0DTE, asset.symbol]);

  // Time steps for Y axis
  const timeSteps = useMemo(() => {
    if (is0DTE) {
      // 0DTE Intraday hours from 09:30 to 16:00
      return [
        { label: '09:30 Open', ratio: 0.0 },
        { label: '11:00 AM', ratio: 0.23 },
        { label: '12:30 PM', ratio: 0.46 },
        { label: '14:00 PM', ratio: 0.69 },
        { label: '15:15 PM', ratio: 0.88 },
        { label: '15:50 PM', ratio: 0.97 },
        { label: '16:00 Scad.', ratio: 1.0 },
      ];
    } else {
      // Standard days
      return [
        { label: 'Oggi (T+0)', ratio: 0.0 },
        { label: '25% Tempo', ratio: 0.25 },
        { label: '50% Tempo', ratio: 0.50 },
        { label: '75% Tempo', ratio: 0.75 },
        { label: '90% Tempo', ratio: 0.90 },
        { label: 'Scadenza', ratio: 1.0 },
      ];
    }
  }, [is0DTE]);

  // Compute Heatmap Matrix cells
  const heatmapMatrix = useMemo(() => {
    return timeSteps.map((timeStep) => {
      const row = priceSteps.map((price) => {
        const pnl = getStrategyProfitLoss(
          legs,
          price,
          timeStep.ratio,
          asset.contractMultiplier,
          ivOffset,
          asset.riskFreeRate,
          asset.dividendYield
        );
        return {
          price,
          timeLabel: timeStep.label,
          pnl,
        };
      });
      return {
        timeStep,
        row,
      };
    });
  }, [legs, timeSteps, priceSteps, asset.contractMultiplier, ivOffset, asset.riskFreeRate, asset.dividendYield]);

  // Find max absolute PnL for color normalization
  const maxAbsPnl = useMemo(() => {
    let max = 50;
    for (const rowObj of heatmapMatrix) {
      for (const cell of rowObj.row) {
        if (Math.abs(cell.pnl) > max) max = Math.abs(cell.pnl);
      }
    }
    return max;
  }, [heatmapMatrix]);

  // Color generator for heatmap cell
  const getCellBgColor = (pnl: number) => {
    const intensity = Math.min(1, Math.abs(pnl) / maxAbsPnl);
    if (pnl > 0) {
      // Green gradient
      const alpha = Math.max(0.12, intensity * 0.85);
      return `rgba(16, 185, 129, ${alpha})`;
    } else if (pnl < 0) {
      // Red gradient
      const alpha = Math.max(0.12, intensity * 0.85);
      return `rgba(239, 68, 68, ${alpha})`;
    }
    return 'rgba(30, 41, 59, 0.5)';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm mb-4">
      {/* Header and Controls */}
      <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-emerald-400" />
            <span>Scenario Analyzer & Heatmap (Prezzo vs Tempo)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Matrice bidimensionale stile OptionStrat / OptionNet che illustra l'evoluzione del profitto/perdita.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Unit Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 font-mono">
            <button
              onClick={() => setDisplayUnit('CURRENCY')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                displayUnit === 'CURRENCY' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
              }`}
            >
              Valuta ({asset.currency})
            </button>
            <button
              onClick={() => setDisplayUnit('PERCENT')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                displayUnit === 'PERCENT' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
              }`}
            >
              % Rend.
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('HEATMAP')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                viewMode === 'HEATMAP' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Grid3X3 className="w-3 h-3" />
              <span>Heatmap</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                viewMode === 'TABLE' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Table className="w-3 h-3" />
              <span>Tabella Scenari</span>
            </button>
          </div>
        </div>
      </div>

      {/* HEATMAP VIEW */}
      {viewMode === 'HEATMAP' ? (
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse font-mono select-none">
            <thead>
              <tr>
                <th className="p-2 text-left text-slate-400 bg-slate-950 border border-slate-800 text-[11px]">
                  {is0DTE ? 'Ora (0DTE)' : 'Data / Tempo'}
                </th>
                {priceSteps.map((p) => {
                  const isAtm = Math.abs(p - spot) <= asset.tickSize;
                  return (
                    <th
                      key={p}
                      className={`p-2 text-center border border-slate-800 text-[10px] ${
                        isAtm ? 'bg-amber-950/40 text-amber-300 font-bold' : 'bg-slate-950 text-slate-300'
                      }`}
                    >
                      {asset.currency}{p.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {heatmapMatrix.map((item, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="p-2 whitespace-nowrap bg-slate-950 border border-slate-800 text-slate-300 font-medium text-[11px]">
                    {item.timeStep.label}
                  </td>
                  {item.row.map((cell, colIdx) => {
                    const isProfit = cell.pnl > 0;
                    return (
                      <td
                        key={colIdx}
                        style={{ backgroundColor: getCellBgColor(cell.pnl) }}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`p-2 text-center border border-slate-800/80 font-bold text-[11px] transition-all hover:ring-2 hover:ring-white/80 cursor-pointer ${
                          isProfit ? 'text-white' : cell.pnl < 0 ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {displayUnit === 'CURRENCY' ? (
                          <span>
                            {cell.pnl > 0 ? '+' : ''}{Math.round(cell.pnl)}
                          </span>
                        ) : (
                          <span>
                            {cell.pnl > 0 ? '+' : ''}{((cell.pnl / Math.max(1, spot * 10)) * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Hovered cell info badge */}
          {hoveredCell && (
            <div className="mt-3 text-xs flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono">
              <span className="text-slate-400">
                Prezzo Sottostante: <strong className="text-white">{asset.currency}{hoveredCell.price.toFixed(2)}</strong> | Tempo:{' '}
                <strong className="text-white">{hoveredCell.timeLabel}</strong>
              </span>
              <span
                className={`font-bold text-sm ${
                  hoveredCell.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                P&L: {hoveredCell.pnl >= 0 ? '+' : ''}{asset.currency}{hoveredCell.pnl.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW (Price vs Final Profit & Today Profit) */
        <div className="p-4 overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Prezzo Finale</th>
                <th className="py-2 px-3">% Variazione Spot</th>
                <th className="py-2 px-3 text-right">Profitto a Scadenza</th>
                <th className="py-2 px-3 text-right">Profitto Oggi</th>
                <th className="py-2 px-3 text-right">Differenziale Theta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {priceSteps.map((price) => {
                const diffPct = ((price - spot) / spot) * 100;
                const pnlExpiry = getStrategyProfitLoss(
                  legs,
                  price,
                  1.0,
                  asset.contractMultiplier,
                  ivOffset,
                  asset.riskFreeRate,
                  asset.dividendYield
                );
                const pnlToday = getStrategyProfitLoss(
                  legs,
                  price,
                  0.0,
                  asset.contractMultiplier,
                  ivOffset,
                  asset.riskFreeRate,
                  asset.dividendYield
                );
                const thetaDiff = pnlExpiry - pnlToday;

                return (
                  <tr key={price} className="hover:bg-slate-850/50">
                    <td className="py-2 px-3 font-bold text-white">
                      {asset.currency}{price.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {diffPct >= 0 ? `+${diffPct.toFixed(2)}%` : `${diffPct.toFixed(2)}%`}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        pnlExpiry >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {pnlExpiry >= 0 ? '+' : ''}{asset.currency}{pnlExpiry.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-semibold ${
                        pnlToday >= 0 ? 'text-cyan-400' : 'text-rose-400'
                      }`}
                    >
                      {pnlToday >= 0 ? '+' : ''}{asset.currency}{pnlToday.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right ${
                        thetaDiff >= 0 ? 'text-emerald-400/90' : 'text-amber-400/90'
                      }`}
                    >
                      {thetaDiff >= 0 ? '+' : ''}{asset.currency}{thetaDiff.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
