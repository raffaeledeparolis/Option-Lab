import React, { useState, useEffect } from 'react';
import { UnderlyingAsset, DataProvider } from '../types/options';
import { Radio, Zap, Coins } from 'lucide-react';
import { IbkrConfigModal } from './IbkrConfigModal';
import { fetchDeribitStatus } from '../services/marketDataApi';

interface AssetSelectorProps {
  assets: UnderlyingAsset[];
  selectedAsset: UnderlyingAsset;
  onSelectAsset: (asset: UnderlyingAsset) => void;
  dataProvider: DataProvider;
  onChangeDataProvider: (provider: DataProvider) => void;
  isLiveStreaming: boolean;
  onToggleLiveStreaming: () => void;
  lastTickDirection?: 'UP' | 'DOWN' | null;
  onIbkrStatusChange?: () => void;
  onOpenIbkrModal?: () => void;
  onOpenDeribitModal?: () => void;
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
  onIbkrStatusChange,
  onOpenIbkrModal,
  onOpenDeribitModal,
}) => {
  const [isIbkrModalOpen, setIsIbkrModalOpen] = useState(false);
  const [ibkrInfo, setIbkrInfo] = useState<{ connected: boolean; mode: string } | null>(null);
  const [deribitInfo, setDeribitInfo] = useState<{ connected: boolean; environment: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CRYPTO' | 'EQUITY_INDEX' | 'COMM_FX'>('ALL');

  const checkIbkrStatus = () => {
    fetch('/api/ibkr/status')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setIbkrInfo({ connected: !!data.connected, mode: data.mode || 'SIMULATION' });
        }
      })
      .catch(() => {});
  };

  const checkDeribitStatus = () => {
    fetchDeribitStatus().then((d) => {
      if (d) {
        setDeribitInfo({ connected: !!d.connected, environment: d.environment || 'TESTNET' });
      }
    });
  };

  const handleOpenIbkrModal = () => {
    if (onOpenIbkrModal) {
      onOpenIbkrModal();
    } else {
      setIsIbkrModalOpen(true);
    }
  };

  useEffect(() => {
    checkIbkrStatus();
    checkDeribitStatus();
  }, []);

  const providerLabels: Record<DataProvider, string> = {
    DERIBIT: 'Deribit API v2 (Crypto Options)',
    INTERACTIVE_BROKERS: 'Interactive Brokers (TWS API)',
    TRADIER: 'Tradier API',
    POLYGON: 'Polygon.io',
    CBOE_DATASHOP: 'CBOE DataShop (Pro)',
    MARKETDATA_APP: 'MarketData.app',
    YAHOO_FINANCE: 'Yahoo Finance (Sandbox)',
  };

  // Filter assets by category if requested
  const filteredAssets = assets.filter((asset) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'CRYPTO') return asset.category === 'CRYPTO';
    if (categoryFilter === 'EQUITY_INDEX') return asset.category === 'INDEX' || asset.category === 'ETF' || asset.category === 'EQUITY';
    if (categoryFilter === 'COMM_FX') return asset.category === 'FX' || asset.category === 'COMMODITY';
    return true;
  });

  const isCurrentCrypto = selectedAsset.category === 'CRYPTO';

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 mb-4 shadow-sm">
      {/* Top Row: Category Tabs & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5 pb-2 border-b border-slate-800/60">
        {/* Category Filters */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">Mercato:</span>
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2 py-0.5 rounded transition-colors ${
              categoryFilter === 'ALL'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Tutti
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('CRYPTO')}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
              categoryFilter === 'CRYPTO'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/20'
            }`}
          >
            <Coins className="w-3 h-3 text-amber-400" />
            <span>Crypto Deribit (BTC, ETH, SOL)</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('EQUITY_INDEX')}
            className={`px-2 py-0.5 rounded transition-colors ${
              categoryFilter === 'EQUITY_INDEX'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Indici & Azioni
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('COMM_FX')}
            className={`px-2 py-0.5 rounded transition-colors ${
              categoryFilter === 'COMM_FX'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Forex & Commodity
          </button>
        </div>

        {/* Right side connection badges */}
        <div className="flex items-center gap-2">
          {/* Deribit Connection Trigger */}
          <button
            type="button"
            onClick={onOpenDeribitModal}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
              isCurrentCrypto
                ? 'border-amber-500/60 bg-amber-950/40 text-amber-300 shadow-sm ring-1 ring-amber-500/30'
                : deribitInfo?.connected
                ? 'border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-900/40'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
            title="Connessione e Trading Opzioni Crypto Deribit API v2"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="font-bold">Deribit: {deribitInfo?.environment || 'LIVE'}</span>
          </button>

          {/* IBKR Connection Modal Trigger */}
          <button
            type="button"
            onClick={handleOpenIbkrModal}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
              !isCurrentCrypto && ibkrInfo?.connected
                ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60 shadow-sm'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Stato e configurazione API Interactive Brokers"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                ibkrInfo?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>{ibkrInfo?.connected ? `TWS: ${ibkrInfo.mode}` : 'IBKR TWS'}</span>
          </button>

          {/* Live streaming feed toggle */}
          <button
            type="button"
            onClick={onToggleLiveStreaming}
            title={isLiveStreaming ? 'Disattiva streaming tick in tempo reale' : 'Attiva streaming tick in tempo reale'}
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

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Asset pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          {filteredAssets.map((asset) => {
            const isSelected = asset.symbol === selectedAsset.symbol;
            const isCrypto = asset.category === 'CRYPTO';

            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => {
                  onSelectAsset(asset);
                  if (isCrypto && dataProvider !== 'DERIBIT') {
                    onChangeDataProvider('DERIBIT');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? isCrypto
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {isCrypto && <Coins className="w-3 h-3 text-amber-400 shrink-0" />}
                <span className="font-bold">{asset.symbol}</span>
                <span className="text-[11px] font-mono text-slate-400">
                  {asset.currency}{asset.spotPrice.toLocaleString('en-US', { minimumFractionDigits: asset.symbol === 'EURUSD' ? 4 : 2, maximumFractionDigits: asset.symbol === 'EURUSD' ? 4 : 2 })}
                </span>
                {isCrypto && (
                  <span className="px-1 py-0.2 bg-amber-950 text-amber-300 border border-amber-500/40 rounded text-[9px] font-mono">
                    DERIBIT
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Data Provider select */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
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
        </div>
      </div>

      <IbkrConfigModal
        isOpen={isIbkrModalOpen}
        onClose={() => {
          setIsIbkrModalOpen(false);
          checkIbkrStatus();
          onIbkrStatusChange?.();
        }}
        onStatusChange={() => {
          checkIbkrStatus();
          onIbkrStatusChange?.();
        }}
      />

      {/* Underneath: Detailed Spot Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            {selectedAsset.name}
            {isCurrentCrypto && (
              <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                DERIBIT OPTION BOOK
              </span>
            )}
            <span
              className={`font-mono font-bold text-sm transition-colors duration-300 ${
                lastTickDirection === 'UP'
                  ? 'text-emerald-400'
                  : lastTickDirection === 'DOWN'
                  ? 'text-rose-400'
                  : 'text-slate-100'
              }`}
            >
              {selectedAsset.currency}{selectedAsset.spotPrice.toLocaleString('en-US', { minimumFractionDigits: selectedAsset.symbol === 'EURUSD' ? 4 : 2, maximumFractionDigits: selectedAsset.symbol === 'EURUSD' ? 4 : 2 })}
            </span>
          </span>

          <span
            className={`font-mono text-xs flex items-center gap-0.5 ${
              selectedAsset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {selectedAsset.change24h >= 0 ? '+' : ''}
            {selectedAsset.change24h.toFixed(selectedAsset.symbol === 'EURUSD' ? 4 : 2)} (
            {selectedAsset.change24hPercent >= 0 ? '+' : ''}
            {selectedAsset.change24hPercent.toFixed(2)}%)
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <span>
            {isCurrentCrypto ? 'DVOL / IV:' : 'IV:'}{' '}
            <strong className="text-slate-200">{(selectedAsset.iv * 100).toFixed(1)}%</strong>
          </span>
          <span>
            IV Rank: <strong className="text-slate-200">{selectedAsset.ivRank}%</strong>
          </span>
          <span>
            Moltiplicatore Contratto: <strong className="text-slate-200">{selectedAsset.contractMultiplier}x {isCurrentCrypto ? selectedAsset.symbol : ''}</strong>
          </span>
          <span>
            Tick: <strong className="text-slate-200">{selectedAsset.currency}{selectedAsset.tickSize}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
