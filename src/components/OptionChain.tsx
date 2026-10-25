import React, { useState } from 'react';
import { OptionChainRow, ExpirationDate, OptionLeg, UnderlyingAsset } from '../types/options';
import { Plus, Minus, Clock, Eye, Layers, Coins } from 'lucide-react';

interface OptionChainProps {
  chain: OptionChainRow[];
  asset: UnderlyingAsset;
  expirations: ExpirationDate[];
  selectedExpiration: ExpirationDate;
  onSelectExpiration: (exp: ExpirationDate) => void;
  onAddLeg: (
    action: 'BUY' | 'SELL',
    type: 'CALL' | 'PUT',
    strike: number,
    premium: number,
    iv: number,
    dte: number,
    is0DTE: boolean,
    hoursRemaining?: number
  ) => void;
  activeLegs: OptionLeg[];
  chainSourceInfo?: {
    isLive: boolean;
    provider: string;
    message?: string;
    requiresKey?: boolean;
  };
  isChainLoading?: boolean;
  onOpenIbkrModal?: () => void;
  onOpenDeribitModal?: () => void;
}

export const OptionChain: React.FC<OptionChainProps> = ({
  chain,
  asset,
  expirations,
  selectedExpiration,
  onSelectExpiration,
  onAddLeg,
  activeLegs,
  chainSourceInfo,
  isChainLoading,
  onOpenIbkrModal,
  onOpenDeribitModal,
}) => {
  const [filterView, setFilterView] = useState<'ALL' | 'NEAR_ATM' | 'DELTA_15_30'>('NEAR_ATM');
  const [showGreeksInChain, setShowGreeksInChain] = useState(true);

  // Filter strikes
  const spot = asset.spotPrice;
  const filteredChain = chain.filter((row) => {
    if (filterView === 'NEAR_ATM') {
      const distPct = Math.abs(row.strike - spot) / spot;
      return distPct <= (asset.symbol === 'SPX' ? 0.04 : 0.07);
    }
    if (filterView === 'DELTA_15_30') {
      const callDelta = Math.abs(row.call.delta);
      const putDelta = Math.abs(row.put.delta);
      return (callDelta >= 0.12 && callDelta <= 0.35) || (putDelta >= 0.12 && putDelta <= 0.35);
    }
    return true;
  });

  // Check if strike is in active legs
  const getLegCountForStrike = (strike: number, type: 'CALL' | 'PUT', action: 'BUY' | 'SELL') => {
    return activeLegs.filter(
      (l) => l.strike === strike && l.type === type && l.action === action
    ).length;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Expirations Bar */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Scadenza:
          </span>
          {expirations.map((exp) => {
            const isSelected = exp.date === selectedExpiration.date;
            return (
              <button
                key={exp.date}
                onClick={() => onSelectExpiration(exp)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? exp.is0DTE
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{exp.label}</span>
                {exp.is0DTE && (
                  <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1 rounded font-bold">
                    0DTE
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setFilterView('NEAR_ATM')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filterView === 'NEAR_ATM' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              ATM ±5%
            </button>
            <button
              onClick={() => setFilterView('DELTA_15_30')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filterView === 'DELTA_15_30' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Delta 15-30
            </button>
            <button
              onClick={() => setFilterView('ALL')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filterView === 'ALL' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Tutti
            </button>
          </div>

          <button
            onClick={() => setShowGreeksInChain(!showGreeksInChain)}
            className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              showGreeksInChain
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Greche</span>
          </button>
        </div>
      </div>

      {/* 0DTE Warning Banner if active */}
      {selectedExpiration.is0DTE && (
        <div className="bg-amber-950/30 border-b border-amber-900/50 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold">0DTE Sessione Attiva:</span>
            <span>
              Opzioni con scadenza odierna. Decadimento temporale (Theta) estremo e massima sensibilità Gamma attorno allo strike ATM ({asset.currency}{asset.spotPrice.toFixed(2)}).
            </span>
          </div>
          <span className="font-mono text-amber-200">
            {selectedExpiration.hoursRemaining}h alla chiusura di mercato
          </span>
        </div>
      )}

      {/* Provider Data Source Banner */}
      {chainSourceInfo && (
        <div
          className={`px-4 py-2 border-b text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            chainSourceInfo.isLive
              ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'
              : chainSourceInfo.message?.includes('403')
              ? 'bg-amber-950/50 border-amber-800/60 text-amber-300'
              : chainSourceInfo.requiresKey
              ? 'bg-blue-950/30 border-blue-900/40 text-blue-300'
              : 'bg-slate-950/60 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                chainSourceInfo.isLive
                  ? 'bg-emerald-400 animate-pulse'
                  : chainSourceInfo.message?.includes('403')
                  ? 'bg-amber-400'
                  : 'bg-blue-400'
              }`}
            />
            <span className="font-semibold">
              {chainSourceInfo.provider === 'INTERACTIVE_BROKERS'
                ? 'Interactive Brokers (TWS):'
                : `${chainSourceInfo.provider}:`}
            </span>
            <span className="text-slate-300">{chainSourceInfo.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isChainLoading && (
              <span className="text-[11px] font-mono text-amber-300 animate-pulse">
                Caricamento chain...
              </span>
            )}

            {(chainSourceInfo.provider === 'DERIBIT' || asset.category === 'CRYPTO') && onOpenDeribitModal && (
              <button
                type="button"
                onClick={onOpenDeribitModal}
                className="px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-colors bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 flex items-center gap-1"
              >
                <Coins className="w-3 h-3 text-amber-300" />
                <span>Terminale & API Deribit</span>
              </button>
            )}

            {chainSourceInfo.provider === 'INTERACTIVE_BROKERS' && onOpenIbkrModal && (
              <button
                type="button"
                onClick={onOpenIbkrModal}
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                  chainSourceInfo.isLive
                    ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-800/50'
                    : 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
                }`}
              >
                {chainSourceInfo.isLive ? 'Dettagli Socket TWS' : 'Configura Tunnel ngrok / TWS'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chain Table */}
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
            <tr>
              {/* CALL Headers */}
              <th className="py-2.5 px-3 text-emerald-400 font-semibold" colSpan={showGreeksInChain ? 5 : 3}>
                CALLS
              </th>
              {/* STRIKE Header */}
              <th className="py-2.5 px-4 text-center text-white font-bold bg-slate-900 border-x border-slate-800">
                STRIKE
              </th>
              {/* PUT Headers */}
              <th className="py-2.5 px-3 text-rose-400 font-semibold text-right" colSpan={showGreeksInChain ? 5 : 3}>
                PUTS
              </th>
            </tr>
            <tr className="text-[10px] text-slate-400 border-b border-slate-800 bg-slate-950/80 font-mono">
              <th className="py-1.5 px-2 text-left">Azioni Call</th>
              {showGreeksInChain && <th className="py-1.5 px-2 text-right">Delta</th>}
              {showGreeksInChain && <th className="py-1.5 px-2 text-right">Theta</th>}
              <th className="py-1.5 px-2 text-right text-emerald-300">Bid</th>
              <th className="py-1.5 px-2 text-right text-emerald-300">Ask</th>

              <th className="py-1.5 px-3 text-center bg-slate-900 text-slate-300 border-x border-slate-800">
                Strike
              </th>

              <th className="py-1.5 px-2 text-left text-rose-300">Bid</th>
              <th className="py-1.5 px-2 text-left text-rose-300">Ask</th>
              {showGreeksInChain && <th className="py-1.5 px-2 text-left">Theta</th>}
              {showGreeksInChain && <th className="py-1.5 px-2 text-left">Delta</th>}
              <th className="py-1.5 px-2 text-right">Azioni Put</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {filteredChain.map((row) => {
              const isAtm = Math.abs(row.strike - spot) <= asset.tickSize / 1.5;
              const isCallItm = row.strike < spot;
              const isPutItm = row.strike > spot;

              const buyCallCount = getLegCountForStrike(row.strike, 'CALL', 'BUY');
              const sellCallCount = getLegCountForStrike(row.strike, 'CALL', 'SELL');
              const buyPutCount = getLegCountForStrike(row.strike, 'PUT', 'BUY');
              const sellPutCount = getLegCountForStrike(row.strike, 'PUT', 'SELL');

              return (
                <tr
                  key={row.strike}
                  className={`hover:bg-slate-800/60 transition-colors ${
                    isAtm ? 'bg-slate-800/40 ring-1 ring-inset ring-slate-700' : ''
                  }`}
                >
                  {/* CALL ACTIONS */}
                  <td className="py-1 px-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          onAddLeg(
                            'BUY',
                            'CALL',
                            row.strike,
                            row.call.ask,
                            row.call.iv / 100,
                            selectedExpiration.daysToExpiry,
                            selectedExpiration.is0DTE,
                            selectedExpiration.hoursRemaining
                          )
                        }
                        title="Acquista Call (+1)"
                        className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-0.5 transition-colors ${
                          buyCallCount > 0
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>C</span>
                        {buyCallCount > 0 && <span className="text-[9px]">({buyCallCount})</span>}
                      </button>

                      <button
                        onClick={() =>
                          onAddLeg(
                            'SELL',
                            'CALL',
                            row.strike,
                            row.call.bid,
                            row.call.iv / 100,
                            selectedExpiration.daysToExpiry,
                            selectedExpiration.is0DTE,
                            selectedExpiration.hoursRemaining
                          )
                        }
                        title="Vendi Call (-1)"
                        className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-0.5 transition-colors ${
                          sellCallCount > 0
                            ? 'bg-rose-500 text-slate-950 font-bold'
                            : 'bg-slate-850 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                        <span>C</span>
                        {sellCallCount > 0 && <span className="text-[9px]">({sellCallCount})</span>}
                      </button>
                    </div>
                  </td>

                  {/* CALL GREEKS & PRICES */}
                  {showGreeksInChain && (
                    <td className="py-1 px-2 text-right font-mono text-[11px] text-slate-400">
                      {row.call.delta.toFixed(2)}
                    </td>
                  )}
                  {showGreeksInChain && (
                    <td className="py-1 px-2 text-right font-mono text-[11px] text-rose-400/90">
                      {row.call.theta.toFixed(2)}
                    </td>
                  )}
                  <td className={`py-1 px-2 text-right font-mono text-xs font-semibold ${isCallItm ? 'text-emerald-400' : 'text-slate-300'}`}>
                    <div>{row.call.bid.toFixed(2)}</div>
                    {asset.category === 'CRYPTO' && (
                      <div className="text-[9px] text-amber-400/80 font-normal">
                        {(row.call.cryptoBid ?? (row.call.bid / spot)).toFixed(4)} {asset.cryptoCurrency || 'BTC'}
                      </div>
                    )}
                  </td>
                  <td className={`py-1 px-2 text-right font-mono text-xs font-semibold ${isCallItm ? 'text-emerald-400' : 'text-slate-300'}`}>
                    <div>{row.call.ask.toFixed(2)}</div>
                    {asset.category === 'CRYPTO' && (
                      <div className="text-[9px] text-amber-400/80 font-normal">
                        {(row.call.cryptoAsk ?? (row.call.ask / spot)).toFixed(4)} {asset.cryptoCurrency || 'BTC'}
                      </div>
                    )}
                  </td>

                  {/* STRIKE CENTER COLUMN */}
                  <td className="py-1.5 px-3 text-center bg-slate-900 border-x border-slate-800 font-mono font-bold text-xs">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded ${
                        isAtm
                          ? 'bg-amber-400 text-slate-950 font-extrabold shadow-sm'
                          : 'text-white'
                      }`}
                      title={row.call.instrumentName ? `Deribit Call: ${row.call.instrumentName} | Put: ${row.put.instrumentName}` : undefined}
                    >
                      {row.strike.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)}
                    </span>
                    {asset.category === 'CRYPTO' && (
                      <div className="text-[8px] text-slate-500 font-sans tracking-tight">
                        Deribit Cash-S.
                      </div>
                    )}
                  </td>

                  {/* PUT PRICES & GREEKS */}
                  <td className={`py-1 px-2 text-left font-mono text-xs font-semibold ${isPutItm ? 'text-rose-400' : 'text-slate-300'}`}>
                    <div>{row.put.bid.toFixed(2)}</div>
                    {asset.category === 'CRYPTO' && (
                      <div className="text-[9px] text-amber-400/80 font-normal">
                        {(row.put.cryptoBid ?? (row.put.bid / spot)).toFixed(4)} {asset.cryptoCurrency || 'BTC'}
                      </div>
                    )}
                  </td>
                  <td className={`py-1 px-2 text-left font-mono text-xs font-semibold ${isPutItm ? 'text-rose-400' : 'text-slate-300'}`}>
                    <div>{row.put.ask.toFixed(2)}</div>
                    {asset.category === 'CRYPTO' && (
                      <div className="text-[9px] text-amber-400/80 font-normal">
                        {(row.put.cryptoAsk ?? (row.put.ask / spot)).toFixed(4)} {asset.cryptoCurrency || 'BTC'}
                      </div>
                    )}
                  </td>
                  {showGreeksInChain && (
                    <td className="py-1 px-2 text-left font-mono text-[11px] text-rose-400/90">
                      {row.put.theta.toFixed(2)}
                    </td>
                  )}
                  {showGreeksInChain && (
                    <td className="py-1 px-2 text-left font-mono text-[11px] text-slate-400">
                      {row.put.delta.toFixed(2)}
                    </td>
                  )}

                  {/* PUT ACTIONS */}
                  <td className="py-1 px-2 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          onAddLeg(
                            'SELL',
                            'PUT',
                            row.strike,
                            row.put.bid,
                            row.put.iv / 100,
                            selectedExpiration.daysToExpiry,
                            selectedExpiration.is0DTE,
                            selectedExpiration.hoursRemaining
                          )
                        }
                        title="Vendi Put (-1)"
                        className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-0.5 transition-colors ${
                          sellPutCount > 0
                            ? 'bg-rose-500 text-slate-950 font-bold'
                            : 'bg-slate-850 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                        <span>P</span>
                        {sellPutCount > 0 && <span className="text-[9px]">({sellPutCount})</span>}
                      </button>

                      <button
                        onClick={() =>
                          onAddLeg(
                            'BUY',
                            'PUT',
                            row.strike,
                            row.put.ask,
                            row.put.iv / 100,
                            selectedExpiration.daysToExpiry,
                            selectedExpiration.is0DTE,
                            selectedExpiration.hoursRemaining
                          )
                        }
                        title="Acquista Put (+1)"
                        className={`px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-0.5 transition-colors ${
                          buyPutCount > 0
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>P</span>
                        {buyPutCount > 0 && <span className="text-[9px]">({buyPutCount})</span>}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
