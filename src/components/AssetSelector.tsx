import React, { useState } from 'react';
import { UnderlyingAsset, DataProvider } from '../types/options';
import { Radio, RefreshCw, Zap } from 'lucide-react';
import { IbkrConfigModal } from './IbkrConfigModal';

interface AssetSelectorProps {
  assets: UnderlyingAsset[];
  selectedAsset: UnderlyingAsset;
  onSelectAsset: (asset: UnderlyingAsset) => void;
  dataProvider: DataProvider;
  onChangeDataProvider: (provider: DataProvider) => void;
  isLiveStreaming: boolean;
  onToggleLiveStreaming: () => void;
  lastTickDirection?: 'UP' | 'DOWN' | null;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  dataProvider,
  onChangeDataProvider,
  isLiveStreaming,
  onToggleLiveStreaming,
  lastTickDirection,
}) => {
  const [isIbkrModalOpen, setIsIbkrModalOpen] = useState(false);

  const providerLabels: Record<DataProvider, string> = {
    INTERACTIVE_BROKERS: 'Interactive Brokers (TWS API)',
    TRADIER: 'Tradier API',
    POLYGON: 'Polygon.io',
    CBOE_DATASHOP: 'CBOE DataShop (Pro)',
    MARKETDATA_APP: 'MarketData.app',
    YAHOO_FINANCE: 'Yahoo Finance (Sandbox)',
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 mb-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Asset pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          {assets.map((asset) => {
            const isSelected = asset.symbol === selectedAsset.symbol;
            return (
              <button
                key={asset.symbol}
                onClick={() => onSelectAsset(asset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span className="font-bold">{asset.symbol}</span>
                <span className="text-[11px] font-mono text-slate-400">
                  {asset.currency}{asset.spotPrice.toFixed(asset.symbol === 'EURUSD' ? 4 : 2)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Data Provider & Live Stream simulation */}
        <div className="flex items-center gap-2.5 shrink-0 text-xs">
          {/* Provider selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
            <Radio className="w-3 h-3 text-slate-400" />
            <select
              value={dataProvider}
              onChange={(e) => onChangeDataProvider(e.target.value as DataProvider)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              {Object.entries(providerLabels).map(([key, label]) => (
                <option key={key} value={key} className="bg-slate-900 text-slate-200">
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* IBKR Connection Modal Trigger */}
          <button
            onClick={() => setIsIbkrModalOpen(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Stato e configurazione API Interactive Brokers"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Stato IBKR</span>
          </button>

          {/* Live streaming feed toggle */}
          <button
            onClick={onToggleLiveStreaming}
            title={isLiveStreaming ? "Disattiva streaming tick in tempo reale" : "Attiva streaming tick in tempo reale"}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
              isLiveStreaming
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Zap className={`w-3 h-3 ${isLiveStreaming ? 'text-emerald-400 fill-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{isLiveStreaming ? 'Live Tick' : 'Pausa Tick'}</span>
          </button>
        </div>
      </div>

      <IbkrConfigModal isOpen={isIbkrModalOpen} onClose={() => setIsIbkrModalOpen(false)} />

      {/* Underneath: Detailed Spot Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            {selectedAsset.name}
            <span
              className={`font-mono font-bold text-sm transition-colors duration-300 ${
                lastTickDirection === 'UP'
                  ? 'text-emerald-400'
                  : lastTickDirection === 'DOWN'
                  ? 'text-rose-400'
                  : 'text-slate-100'
              }`}
            >
              {selectedAsset.currency}{selectedAsset.spotPrice.toFixed(selectedAsset.symbol === 'EURUSD' ? 4 : 2)}
            </span>
          </span>

          <span
            className={`font-mono text-xs flex items-center gap-0.5 ${
              selectedAsset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {selectedAsset.change24h >= 0 ? '+' : ''}
            {selectedAsset.change24h.toFixed(selectedAsset.symbol === 'EURUSD' ? 4 : 2)} ({selectedAsset.change24hPercent >= 0 ? '+' : ''}
            {selectedAsset.change24hPercent.toFixed(2)}%)
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400 text-xs">
          <div>
            <span>IV: </span>
            <span className="font-mono text-slate-200">{(selectedAsset.iv * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span>IV Rank: </span>
            <span className="font-mono text-slate-200">{selectedAsset.ivRank}%</span>
          </div>
          <div>
            <span>Risk-Free: </span>
            <span className="font-mono text-slate-200">{(selectedAsset.riskFreeRate * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span>Div: </span>
            <span className="font-mono text-slate-200">{(selectedAsset.dividendYield * 100).toFixed(2)}%</span>
          </div>
          <div>
            <span>Moltiplicatore: </span>
            <span className="font-mono text-slate-200">x{selectedAsset.contractMultiplier}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
