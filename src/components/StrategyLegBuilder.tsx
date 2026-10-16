import React from 'react';
import { OptionLeg, StrategyPreset, UnderlyingAsset } from '../types/options';
import { STRATEGY_PRESETS } from '../utils/strategyPresets';
import { Trash2, Copy, ArrowUpDown, Plus, Minus, Layers, RotateCcw, Send } from 'lucide-react';

interface StrategyLegBuilderProps {
  legs: OptionLeg[];
  asset: UnderlyingAsset;
  onUpdateLeg: (legId: string, updates: Partial<OptionLeg>) => void;
  onRemoveLeg: (legId: string) => void;
  onDuplicateLeg: (legId: string) => void;
  onInvertPosition: () => void;
  onClearLegs: () => void;
  onApplyPreset: (preset: StrategyPreset) => void;
  onOpenOrderModal?: () => void;
}

export const StrategyLegBuilder: React.FC<StrategyLegBuilderProps> = ({
  legs,
  asset,
  onUpdateLeg,
  onRemoveLeg,
  onDuplicateLeg,
  onInvertPosition,
  onClearLegs,
  onApplyPreset,
  onOpenOrderModal,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'Tutti i Preset' },
    { id: '0DTE_SPECIAL', label: '0DTE Intraday' },
    { id: 'BULLISH', label: 'Rialziste' },
    { id: 'BEARISH', label: 'Ribassiste' },
    { id: 'NEUTRAL', label: 'Neutrali / Income' },
    { id: 'VOLATILITY', label: 'Volatilità' },
  ];

  const filteredPresets = selectedCategory === 'ALL'
    ? STRATEGY_PRESETS
    : STRATEGY_PRESETS.filter((p) => p.category === selectedCategory);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm mb-4">
      {/* Presets Header Bar */}
      <div className="p-3 bg-slate-950/70 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Strategie Predefinite (1-Click Builder)
            </span>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === c.id
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Buttons Grid */}
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
          {filteredPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              title={preset.description}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 border ${
                preset.category === '0DTE_SPECIAL'
                  ? 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Legs Header and Toolbar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">
            Gambe Attive nella Strategia
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono">
            {legs.length} {legs.length === 1 ? 'gamba' : 'gambe'}
          </span>
        </div>

        {legs.length > 0 && (
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {onOpenOrderModal && (
              <button
                type="button"
                onClick={onOpenOrderModal}
                title="Invia e trasmetti l'ordine combinato su Trader Workstation (IBKR)"
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-sm text-[11px]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Invia Ordine a TWS</span>
              </button>
            )}
            <button
              onClick={onInvertPosition}
              title="Inverti tutte le posizioni da Long a Short e viceversa"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors text-[11px]"
            >
              <ArrowUpDown className="w-3 h-3 text-emerald-400" />
              <span>Inverti Long/Short</span>
            </button>
            <button
              onClick={onClearLegs}
              title="Rimuovi tutte le gambe"
              className="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/40 flex items-center gap-1 transition-colors text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Svuota</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Legs Table */}
      {legs.length === 0 ? (
        <div className="py-10 px-4 text-center text-slate-500 text-xs">
          <p className="mb-2">Nessuna gamba selezionata.</p>
          <p className="text-slate-400">
            Seleziona una strategia predefinita qui sopra oppure clicca sui pulsanti <span className="text-emerald-400 font-bold">+ Buy</span> o <span className="text-rose-400 font-bold">- Sell</span> nella Option Chain sottostante.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-950/70 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Azione</th>
                <th className="py-2 px-2 text-center">Quantità</th>
                <th className="py-2 px-2">Tipo</th>
                <th className="py-2 px-3">Strike</th>
                <th className="py-2 px-3">Scadenza</th>
                <th className="py-2 px-3">Premio ({asset.currency})</th>
                <th className="py-2 px-2 text-right">Delta (Δ)</th>
                <th className="py-2 px-2 text-right">Theta (Θ)</th>
                <th className="py-2 px-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {legs.map((leg) => {
                const isBuy = leg.action === 'BUY';
                return (
                  <tr key={leg.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Action Buy / Sell toggle */}
                    <td className="py-2 px-3">
                      <button
                        onClick={() =>
                          onUpdateLeg(leg.id, {
                            action: isBuy ? 'SELL' : 'BUY',
                          })
                        }
                        className={`px-2 py-0.5 rounded font-bold text-[11px] transition-colors ${
                          isBuy
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                      >
                        {leg.action}
                      </button>
                    </td>

                    {/* Quantity controls */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() =>
                            onUpdateLeg(leg.id, {
                              quantity: Math.max(1, leg.quantity - 1),
                            })
                          }
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-slate-100">
                          {leg.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateLeg(leg.id, {
                              quantity: leg.quantity + 1,
                            })
                          }
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </td>

                    {/* Type Call / Put toggle */}
                    <td className="py-2 px-2">
                      <button
                        onClick={() =>
                          onUpdateLeg(leg.id, {
                            type: leg.type === 'CALL' ? 'PUT' : 'CALL',
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          leg.type === 'CALL'
                            ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-800/40'
                            : 'text-rose-400 bg-rose-950/50 border border-rose-800/40'
                        }`}
                      >
                        {leg.type}
                      </button>
                    </td>

                    {/* Strike with step input */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            onUpdateLeg(leg.id, {
                              strike: Number((leg.strike - asset.tickSize).toFixed(2)),
                            })
                          }
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-[10px]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step={asset.tickSize}
                          value={leg.strike}
                          onChange={(e) =>
                            onUpdateLeg(leg.id, { strike: parseFloat(e.target.value) || leg.strike })
                          }
                          className="w-16 bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-center font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() =>
                            onUpdateLeg(leg.id, {
                              strike: Number((leg.strike + asset.tickSize).toFixed(2)),
                            })
                          }
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Expiration */}
                    <td className="py-2 px-3 text-slate-300">
                      <div className="flex items-center gap-1">
                        <span>{leg.expiration}</span>
                        {leg.is0DTE && (
                          <span className="px-1 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] rounded font-bold">
                            0DTE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Premium editable */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">{asset.currency}</span>
                        <input
                          type="number"
                          step="0.05"
                          value={leg.premium}
                          onChange={(e) =>
                            onUpdateLeg(leg.id, {
                              premium: Math.max(0.01, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="w-16 bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-right font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </td>

                    {/* Delta */}
                    <td className="py-2 px-2 text-right text-slate-400">
                      {leg.delta ? (leg.delta * (isBuy ? 1 : -1)).toFixed(2) : '-'}
                    </td>

                    {/* Theta */}
                    <td className="py-2 px-2 text-right text-rose-400/90">
                      {leg.theta ? (leg.theta * (isBuy ? 1 : -1)).toFixed(2) : '-'}
                    </td>

                    {/* Actions: Duplicate, Delete */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onDuplicateLeg(leg.id)}
                          title="Duplica gamba"
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveLeg(leg.id)}
                          title="Elimina gamba"
                          className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
