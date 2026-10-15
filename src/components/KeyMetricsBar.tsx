import React from 'react';
import { StrategyMetrics } from '../types/options';

interface KeyMetricsBarProps {
  metrics: StrategyMetrics;
  currency: string;
}

export const KeyMetricsBar: React.FC<KeyMetricsBarProps> = ({ metrics, currency }) => {
  const formatMoney = (val: number | null) => {
    if (val === null) return 'Illimitato';
    const sign = val > 0 ? '+' : '';
    return `${sign}${currency}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
      {/* 1. Costo Totale (Credito / Debito) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-slate-400">Costo Totale</span>
        <div className="mt-1 flex items-baseline justify-between">
          <span
            className={`text-sm font-bold font-mono ${
              metrics.netCost < 0
                ? 'text-emerald-400'
                : metrics.netCost > 0
                ? 'text-amber-400'
                : 'text-slate-300'
            }`}
          >
            {metrics.netCost === 0
              ? '0.00'
              : `${currency}${Math.abs(metrics.netCost).toFixed(2)}`}
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            {metrics.isCredit ? 'Credito' : metrics.netCost > 0 ? 'Debito' : 'Even'}
          </span>
        </div>
      </div>

      {/* 2. Profitto Massimo */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-slate-400">Max Profitto</span>
        <div className="mt-1">
          <span className="text-sm font-bold font-mono text-emerald-400">
            {formatMoney(metrics.maxProfit)}
          </span>
        </div>
      </div>

      {/* 3. Perdita Massima */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-slate-400">Max Perdita</span>
        <div className="mt-1">
          <span className="text-sm font-bold font-mono text-rose-400">
            {metrics.maxLoss === null ? 'Illimitata' : formatMoney(metrics.maxLoss)}
          </span>
        </div>
      </div>

      {/* 4. Break Even */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-slate-400">Break Even</span>
        <div className="mt-1 truncate">
          <span className="text-xs font-bold font-mono text-slate-200">
            {metrics.breakEvens.length > 0
              ? metrics.breakEvens.map((b) => `${currency}${b}`).join(' | ')
              : 'Nessuno'}
          </span>
        </div>
      </div>

      {/* 5. ROI % */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-slate-400">Max ROI</span>
        <div className="mt-1">
          <span
            className={`text-sm font-bold font-mono ${
              metrics.roi && metrics.roi > 0 ? 'text-emerald-400' : 'text-slate-300'
            }`}
          >
            {metrics.roi !== null ? `${metrics.roi}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* 6. Margine Richiesto */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-slate-400">Margine</span>
        <div className="mt-1">
          <span className="text-sm font-bold font-mono text-slate-200">
            {currency}{metrics.requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 7. Probabilità di Profitto (POP) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-slate-400">POP (Prob. Profit)</span>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            className={`text-sm font-bold font-mono ${
              metrics.pop >= 60
                ? 'text-emerald-400'
                : metrics.pop <= 40
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {metrics.pop}%
          </span>
        </div>
      </div>

      {/* 8. Expected Value (EV) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-slate-400">Expected Value</span>
        <div className="mt-1">
          <span
            className={`text-sm font-bold font-mono ${
              metrics.expectedValue >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(metrics.expectedValue)}
          </span>
        </div>
      </div>
    </div>
  );
};
