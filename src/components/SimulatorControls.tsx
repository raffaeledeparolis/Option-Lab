import React from 'react';
import { UnderlyingAsset } from '../types/options';
import { RotateCcw, Sliders } from 'lucide-react';

interface SimulatorControlsProps {
  asset: UnderlyingAsset;
  spotOffset: number;
  setSpotOffset: (val: number) => void;
  ivOffsetPct: number; // e.g. 0%
  setIvOffsetPct: (val: number) => void;
  timeDecayDays: number; // days advanced, e.g. 0
  setTimeDecayDays: (val: number) => void;
  customRate: number; // e.g. 0.046
  setCustomRate: (val: number) => void;
  customDiv: number; // e.g. 0.015
  setCustomDiv: (val: number) => void;
  is0DTE?: boolean;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  asset,
  spotOffset,
  setSpotOffset,
  ivOffsetPct,
  setIvOffsetPct,
  timeDecayDays,
  setTimeDecayDays,
  customRate,
  setCustomRate,
  customDiv,
  setCustomDiv,
  is0DTE,
}) => {
  const currentSpot = asset.spotPrice + spotOffset;
  const currentIv = asset.iv * (1 + ivOffsetPct / 100);

  const resetAll = () => {
    setSpotOffset(0);
    setIvOffsetPct(0);
    setTimeDecayDays(0);
    setCustomRate(asset.riskFreeRate);
    setCustomDiv(asset.dividendYield);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 mb-4 shadow-sm">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-100 uppercase tracking-wider">
            Simulatore 'What-If' Parametri di Mercato in Tempo Reale
          </span>
        </div>
        <button
          onClick={resetAll}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
        >
          <RotateCcw className="w-3 h-3 text-emerald-400" />
          <span>Reset Parametri</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-mono">
        {/* 1. Prezzo Sottostante */}
        <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Prezzo Spot:</span>
            <span className="text-white font-bold">
              {asset.currency}{currentSpot.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)}
            </span>
          </div>
          <input
            type="range"
            min={-asset.spotPrice * 0.15}
            max={asset.spotPrice * 0.15}
            step={asset.tickSize}
            value={spotOffset}
            onChange={(e) => setSpotOffset(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>-15%</span>
            <span className={spotOffset === 0 ? 'text-slate-400' : spotOffset > 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {spotOffset > 0 ? `+${asset.currency}${spotOffset.toFixed(2)}` : `${asset.currency}${spotOffset.toFixed(2)}`}
            </span>
            <span>+15%</span>
          </div>
        </div>

        {/* 2. Volatilità Implicita (IV) */}
        <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Volatilità (IV):</span>
            <span className="text-white font-bold">{(currentIv * 100).toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min={-50}
            max={100}
            step={1}
            value={ivOffsetPct}
            onChange={(e) => setIvOffsetPct(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>-50% IV</span>
            <span className={ivOffsetPct === 0 ? 'text-slate-400' : ivOffsetPct > 0 ? 'text-cyan-400' : 'text-rose-400'}>
              {ivOffsetPct > 0 ? `+${ivOffsetPct}%` : `${ivOffsetPct}%`}
            </span>
            <span>+100% IV</span>
          </div>
        </div>

        {/* 3. Decadimento Temporale */}
        <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{is0DTE ? 'Ore Trascorse:' : 'Giorni Passati:'}</span>
            <span className="text-white font-bold">
              {is0DTE ? `${(timeDecayDays * 6.5).toFixed(1)}h` : `${timeDecayDays.toFixed(1)}d`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={is0DTE ? 1 : 45}
            step={is0DTE ? 0.05 : 0.5}
            value={timeDecayDays}
            onChange={(e) => setTimeDecayDays(parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Oggi (T+0)</span>
            <span>{is0DTE ? 'Chiusura 16:00' : '+45 Giorni'}</span>
          </div>
        </div>

        {/* 4. Tasso Risk-Free */}
        <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Tasso Risk-Free:</span>
            <span className="text-white font-bold">{(customRate * 100).toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.10}
            step={0.0025}
            value={customRate}
            onChange={(e) => setCustomRate(parseFloat(e.target.value))}
            className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0%</span>
            <span>5%</span>
            <span>10%</span>
          </div>
        </div>

        {/* 5. Dividendi */}
        <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Rendimento Dividendi:</span>
            <span className="text-white font-bold">{(customDiv * 100).toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.06}
            step={0.001}
            value={customDiv}
            onChange={(e) => setCustomDiv(parseFloat(e.target.value))}
            className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0%</span>
            <span>3%</span>
            <span>6%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
