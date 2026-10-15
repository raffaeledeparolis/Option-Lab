import React from 'react';
import { OptionLeg, GreeksMetrics, UnderlyingAsset } from '../types/options';
import { AlertTriangle, ShieldCheck, Flame } from 'lucide-react';

interface GreeksDashboardProps {
  greeks: GreeksMetrics;
  legs: OptionLeg[];
  asset: UnderlyingAsset;
}

export const GreeksDashboard: React.FC<GreeksDashboardProps> = ({ greeks, legs, asset }) => {
  const is0DTE = legs.some((l) => l.is0DTE);

  const getGammaBadge = (level: string) => {
    switch (level) {
      case 'EXTREME':
        return (
          <span className="px-2 py-0.5 rounded bg-rose-950/70 border border-rose-500/60 text-rose-300 flex items-center gap-1 font-bold">
            <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            Rischio Pinning Gamma Estremo (0DTE)
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/60 text-amber-300 flex items-center gap-1 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Gamma Elevato (Alta accelerazione)
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded bg-blue-950/70 border border-blue-500/60 text-blue-300 flex items-center gap-1">
            Gamma Moderato
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Gamma Controllato
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm mb-4">
      {/* Header */}
      <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Dashboard Delle Greche (Portfolio & Gambe Singole)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sensibilità direzionale, convessità Gamma, decadimento temporale e reazione alla volatilità.
          </p>
        </div>
        <div className="text-xs font-mono">{getGammaBadge(greeks.gammaRiskLevel)}</div>
      </div>

      {/* Aggregate Greeks KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-900/60">
        {/* Delta */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-emerald-400">Δ Delta Totale</span>
            <span className="text-[10px] text-slate-400">Direzionalità</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono">
            <span
              className={`text-xl font-bold ${
                greeks.delta > 0
                  ? 'text-emerald-400'
                  : greeks.delta < 0
                  ? 'text-rose-400'
                  : 'text-slate-200'
              }`}
            >
              {greeks.delta > 0 ? `+${greeks.delta}` : greeks.delta}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            Esposizione: {asset.currency}{greeks.deltaDollars.toLocaleString()}
          </div>
        </div>

        {/* Gamma */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-cyan-400">Γ Gamma Totale</span>
            <span className="text-[10px] text-slate-400">dDelta/dSpot</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono">
            <span
              className={`text-xl font-bold ${
                greeks.gamma > 0 ? 'text-cyan-400' : greeks.gamma < 0 ? 'text-rose-400' : 'text-slate-200'
              }`}
            >
              {greeks.gamma > 0 ? `+${greeks.gamma}` : greeks.gamma}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            {greeks.gamma > 0 ? 'Convessità a favore' : 'Rischio convessità'}
          </div>
        </div>

        {/* Theta */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-amber-400">Θ Theta Totale</span>
            <span className="text-[10px] text-slate-400">Decadimento</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono">
            <span
              className={`text-xl font-bold ${
                greeks.theta > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {greeks.theta > 0 ? `+${asset.currency}${greeks.theta}` : `${asset.currency}${greeks.theta}`}
            </span>
            <span className="text-[10px] text-slate-400">/giorno</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            {is0DTE ? `Orario: ${asset.currency}${(greeks.theta / 6.5).toFixed(2)}/h` : 'Theta giornaliero'}
          </div>
        </div>

        {/* Vega */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-purple-400">ν Vega Totale</span>
            <span className="text-[10px] text-slate-400">Per 1% IV</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono">
            <span
              className={`text-xl font-bold ${
                greeks.vega > 0 ? 'text-purple-400' : 'text-rose-400'
              }`}
            >
              {greeks.vega > 0 ? `+${asset.currency}${greeks.vega}` : `${asset.currency}${greeks.vega}`}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            {greeks.vega > 0 ? 'Long Volatilità' : 'Short Volatilità'}
          </div>
        </div>

        {/* Rho */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-blue-400">ρ Rho Totale</span>
            <span className="text-[10px] text-slate-400">Per 1% Tassi</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono">
            <span className="text-xl font-bold text-slate-200">
              {greeks.rho > 0 ? `+${asset.currency}${greeks.rho}` : `${asset.currency}${greeks.rho}`}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            Sensibilità tassi
          </div>
        </div>
      </div>

      {/* Per-Leg Greeks Breakdown Table */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">
          Scomposizione Greche Per Singola Gamba
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead className="text-[10px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-1.5 px-3">Gamba</th>
                <th className="py-1.5 px-2 text-right">Delta (Δ)</th>
                <th className="py-1.5 px-2 text-right">Gamma (Γ)</th>
                <th className="py-1.5 px-2 text-right">Theta (Θ)</th>
                <th className="py-1.5 px-2 text-right">Vega (ν)</th>
                <th className="py-1.5 px-2 text-right">Rho (ρ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {legs.map((leg, idx) => {
                const sign = leg.action === 'BUY' ? 1 : -1;
                const qty = leg.quantity;
                const d = (leg.delta || 0) * sign * qty;
                const g = (leg.gamma || 0) * sign * qty;
                const t = (leg.theta || 0) * sign * qty * asset.contractMultiplier;
                const v = (leg.vega || 0) * sign * qty * asset.contractMultiplier;
                const r = (leg.rho || 0) * sign * qty * asset.contractMultiplier;

                return (
                  <tr key={leg.id} className="hover:bg-slate-850/50">
                    <td className="py-1.5 px-3">
                      <span className="font-semibold text-white">
                        {leg.action} {qty}x {leg.type} {asset.currency}{leg.strike}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400">({leg.expiration})</span>
                    </td>
                    <td className={`py-1.5 px-2 text-right font-semibold ${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {d.toFixed(3)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-cyan-400">
                      {g.toFixed(4)}
                    </td>
                    <td className={`py-1.5 px-2 text-right ${t > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {asset.currency}{t.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-purple-400">
                      {asset.currency}{v.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-slate-400">
                      {asset.currency}{r.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
