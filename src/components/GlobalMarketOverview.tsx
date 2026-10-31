import React, { useState } from 'react';
import {
  Search,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Coins,
  ArrowRight,
  Globe,
  Radio,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { UnderlyingAsset, DataProvider } from '../types/options';
import { Planisphere2D } from './Planisphere2D';
import { WorldClock } from './WorldClock';
import { AssetSearchModal } from './AssetSearchModal';

interface GlobalMarketOverviewProps {
  assets: UnderlyingAsset[];
  selectedAsset: UnderlyingAsset;
  onSelectAsset: (asset: UnderlyingAsset) => void;
  dataProvider: DataProvider;
  onChangeDataProvider: (provider: DataProvider) => void;
  onOpenTradingDesk: () => void;
  onOpenAiAdvisor?: () => void;
  onOpenBybitModal: () => void;
  onOpenDeribitModal: () => void;
  onOpenIbkrModal: () => void;
}

interface BenchmarkItem {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
  category: UnderlyingAsset['category'];
  sparkline: number[]; // 8 points normalized
}

const BENCHMARKS: BenchmarkItem[] = [
  {
    symbol: 'SPX',
    name: 'S&P 500',
    price: '5,850.50',
    change: '+1.15%',
    isPositive: true,
    category: 'INDEX',
    sparkline: [40, 48, 45, 55, 62, 58, 68, 75],
  },
  {
    symbol: 'QQQ',
    name: 'NASDAQ 100',
    price: '17,610.90',
    change: '+1.40%',
    isPositive: true,
    category: 'ETF',
    sparkline: [35, 42, 52, 48, 60, 65, 72, 80],
  },
  {
    symbol: 'GLD',
    name: 'GOLD (XAU)',
    price: '2,735.40',
    change: '+0.80%',
    isPositive: true,
    category: 'ETF',
    sparkline: [50, 52, 48, 55, 60, 58, 64, 69],
  },
  {
    symbol: 'USO',
    name: 'CRUDE OIL',
    price: '71.85',
    change: '-0.55%',
    isPositive: false,
    category: 'ETF',
    sparkline: [70, 68, 64, 60, 62, 55, 52, 48],
  },
  {
    symbol: 'EURUSD',
    name: 'EUR / USD',
    price: '1.0845',
    change: '+0.22%',
    isPositive: true,
    category: 'FX',
    sparkline: [45, 44, 48, 46, 52, 50, 56, 58],
  },
  {
    symbol: 'BTC',
    name: 'BITCOIN',
    price: '77,285.00',
    change: '+2.45%',
    isPositive: true,
    category: 'CRYPTO',
    sparkline: [30, 38, 45, 52, 50, 62, 70, 78],
  },
];

const MARKET_NEWS = [
  {
    time: '14:32',
    text: 'US inflation data shows surprise dip, stoking rate cut expectations',
    tag: 'MACRO',
  },
  {
    time: '14:15',
    text: 'Oil prices consolidate as IEA updates global quarterly demand outlook',
    tag: 'COMMODITIES',
  },
  {
    time: '13:58',
    text: 'Mega-cap tech equities lead S&P 500 rally ahead of key earnings cycle',
    tag: 'EQUITIES',
  },
  {
    time: '13:40',
    text: 'Federal Reserve officials hint at data-dependent trajectory for benchmark rates',
    tag: 'CENTRAL BANKS',
  },
  {
    time: '13:21',
    text: 'Asian manufacturing PMI beats market consensus, boosting regional sentiment',
    tag: 'GLOBAL',
  },
  {
    time: '12:55',
    text: 'Bybit V5 Options volume surges 35% on BTC and ETH weekly contract expiration',
    tag: 'CRYPTO',
  },
  {
    time: '12:10',
    text: 'ECB comments reinforce steady disinflation narrative across Eurozone economies',
    tag: 'FOREX',
  },
];

export const GlobalMarketOverview: React.FC<GlobalMarketOverviewProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  dataProvider,
  onChangeDataProvider,
  onOpenTradingDesk,
  onOpenAiAdvisor,
  onOpenBybitModal,
  onOpenDeribitModal,
  onOpenIbkrModal,
}) => {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Render SVG Sparkline
  const renderSparkline = (data: number[], isPositive: boolean) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 110;
    const height = 30;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const strokeColor = isPositive ? '#34d399' : '#f87171';
    const fillColor = isPositive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)';

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${data[0]}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* Glow fill underneath */}
        <polygon
          fill={`url(#grad-${data[0]})`}
          points={`0,${height} ${points} ${width},${height}`}
        />
      </svg>
    );
  };

  const isCurrentCrypto = selectedAsset.category === 'CRYPTO';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. HERO SECTION: World Clocks & Rotating Animated Globe */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#091122] via-[#0b172e] to-[#070e1c] border border-cyan-950/70 p-5 sm:p-7 shadow-2xl shadow-cyan-950/30">
        {/* Subtle background starfield / grid ambiance */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_0.6px,transparent_0.6px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[340px] bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none" />

        {/* Top Header Tag */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-sm sm:text-base font-bold tracking-wide text-white uppercase flex items-center gap-2">
              <span>Financial Hubs & Global Trading Sessions</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                24/7 Live
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenAiAdvisor && (
              <button
                type="button"
                onClick={onOpenAiAdvisor}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI Strategic Advisor</span>
              </button>
            )}
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Bybit V5 & Global Feeds Sincronizzati
            </span>
          </div>
        </div>

        {/* 1. Clocks centrally aligned in top row (allineati centralmente in alto) */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-8 sm:gap-14 md:gap-20 mb-4">
          <WorldClock
            city="TOKYO"
            timeZone="Asia/Tokyo"
            tzAbbr="JST"
            marketHours={{ openHour: 9, closeHour: 15 }}
            size={105}
          />
          <WorldClock
            city="LONDON"
            timeZone="Europe/London"
            tzAbbr="GMT"
            marketHours={{ openHour: 8, closeHour: 16 }}
            size={105}
          />
          <WorldClock
            city="NEW YORK"
            timeZone="America/New_York"
            tzAbbr="EDT"
            marketHours={{ openHour: 9, closeHour: 16 }}
            size={105}
          />
        </div>

        {/* 2. Panoramic 2D Planisphere (Planisfero 2D) directly below centered clocks */}
        <div className="relative z-10 pt-1 pb-1">
          <Planisphere2D />
        </div>
      </div>

      {/* 2. COLLEGAMENTO DIRETTO AD AI ADVISOR IN HOME PAGE */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/30 p-5 shadow-lg shadow-emerald-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  Gemini 3.8 Flash • AI Quant Intelligence
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Sottostante: <strong className="text-white">{selectedAsset.symbol}</strong> ({selectedAsset.currency}{selectedAsset.spotPrice})
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                AI Strategic Advisor & Options Assistant
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
                Genera in pochi secondi strategie ottimali (Bull Call Spread, Iron Condor, 0DTE Iron Fly, Straddle) calibrate su volatilità implicita ({(selectedAsset.iv * 100).toFixed(1)}%), skew di mercato e tolleranza al rischio.
              </p>

              {/* Quick Strategy Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                <span className="text-slate-400 text-[11px]">Idee rapide:</span>
                <button
                  type="button"
                  onClick={onOpenAiAdvisor}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 text-[11px] font-mono transition-all"
                >
                  🎯 Bull Call Spread Ottimizzato
                </button>
                <button
                  type="button"
                  onClick={onOpenAiAdvisor}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-[11px] font-mono transition-all"
                >
                  ⚡ 0DTE Iron Fly Intraday
                </button>
                <button
                  type="button"
                  onClick={onOpenAiAdvisor}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-amber-500/30 hover:border-amber-400 text-amber-300 text-[11px] font-mono transition-all"
                >
                  🛡️ Delta-Neutral Iron Condor
                </button>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center md:flex-col justify-end gap-2">
            <button
              type="button"
              onClick={onOpenAiAdvisor}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Consulta AI Advisor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-slate-400 font-mono text-center">
              Analisi istantanea parametrica
            </span>
          </div>
        </div>
      </div>

      {/* 2. COMMAND BAR: SELEZIONE ASSET (API SEARCH) & SELEZIONE BROKER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Selezione Asset via API */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Asset di Riferimento per il Trading
                  </h3>
                  <p className="text-xs text-slate-400">
                    Seleziona qualsiasi crypto (Bybit Spot) o titolo azionario / ETF / Indice via API
                  </p>
                </div>
              </div>

              {/* Main API Search Trigger Button */}
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 hover:from-amber-400 to-orange-500 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-950/50 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Cerca Asset (API)</span>
              </button>
            </div>

            {/* Currently Active Asset Showcase */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-850 mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold font-mono text-base border ${
                    isCurrentCrypto
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {isCurrentCrypto ? <Coins className="w-5 h-5" /> : selectedAsset.symbol.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white font-mono">
                      {selectedAsset.symbol}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
                        isCurrentCrypto
                          ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {selectedAsset.category}
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {selectedAsset.exchange || (isCurrentCrypto ? 'Bybit Spot' : 'Global Market')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedAsset.name}</p>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-lg font-bold text-slate-100">
                  {selectedAsset.currency}
                  {selectedAsset.spotPrice.toLocaleString('en-US', {
                    minimumFractionDigits: selectedAsset.symbol === 'EURUSD' ? 4 : 2,
                    maximumFractionDigits: selectedAsset.symbol === 'EURUSD' ? 4 : 2,
                  })}
                </div>
                <div
                  className={`text-xs flex items-center justify-end gap-1 font-semibold ${
                    selectedAsset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {selectedAsset.change24h >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {selectedAsset.change24h >= 0 ? '+' : ''}
                    {selectedAsset.change24h.toFixed(selectedAsset.symbol === 'EURUSD' ? 4 : 2)} (
                    {selectedAsset.change24hPercent >= 0 ? '+' : ''}
                    {selectedAsset.change24hPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Switch Pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Asset Rapidi disponibili nel terminale:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {assets.map((asset) => {
                  const isSelected = asset.symbol === selectedAsset.symbol;
                  const isCrypto = asset.category === 'CRYPTO';
                  return (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => onSelectAsset(asset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all shrink-0 border flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
                      }`}
                    >
                      {isCrypto && <Coins className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                      <span className="font-bold">{asset.symbol}</span>
                      <span className="text-[10px] text-slate-500">
                        {asset.currency}{asset.spotPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action: Open Strategy Desk on this asset */}
          <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Parametri Black-Scholes, catena opzioni e volatilità pronti.
            </span>
            <button
              type="button"
              onClick={onOpenTradingDesk}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 shadow-md shadow-cyan-950/40"
            >
              <span>Apri Option Builder ({selectedAsset.symbol})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Selezione Broker di Riferimento */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-slate-800/80">
              <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Broker di Riferimento & API Execution
                </h3>
                <p className="text-xs text-slate-400">
                  Scegli il broker per instradamento ordini e dati opzioni
                </p>
              </div>
            </div>

            {/* Broker Cards */}
            <div className="space-y-2.5">
              {/* 1. Bybit V5 */}
              <div
                onClick={() => onChangeDataProvider('BYBIT')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  dataProvider === 'BYBIT'
                    ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs">
                    BY
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">Bybit V5 Options</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-500/40">
                        USDT Margined
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      Opzioni Crypto BTC/ETH/SOL & Spot trading API
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBybitModal();
                    }}
                    className="px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium"
                  >
                    API Key
                  </button>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      dataProvider === 'BYBIT'
                        ? 'border-amber-400 bg-amber-500'
                        : 'border-slate-600'
                    }`}
                  >
                    {dataProvider === 'BYBIT' && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                  </div>
                </div>
              </div>

              {/* 2. Deribit API v2 */}
              <div
                onClick={() => onChangeDataProvider('DERIBIT')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  dataProvider === 'DERIBIT'
                    ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    DB
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">Deribit API v2</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                        Coin Margined
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      Leader mondiale opzioni Crypto con DVOL live
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDeribitModal();
                    }}
                    className="px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium"
                  >
                    API Key
                  </button>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      dataProvider === 'DERIBIT'
                        ? 'border-cyan-400 bg-cyan-500'
                        : 'border-slate-600'
                    }`}
                  >
                    {dataProvider === 'DERIBIT' && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                  </div>
                </div>
              </div>

              {/* 3. Interactive Brokers TWS */}
              <div
                onClick={() => onChangeDataProvider('INTERACTIVE_BROKERS')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  dataProvider === 'INTERACTIVE_BROKERS'
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    IB
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">Interactive Brokers</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        TWS Socket
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      Opzioni CBOE, Azioni US, ETF e Futures
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenIbkrModal();
                    }}
                    className="px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium"
                  >
                    Socket
                  </button>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      dataProvider === 'INTERACTIVE_BROKERS'
                        ? 'border-emerald-400 bg-emerald-500'
                        : 'border-slate-600'
                    }`}
                  >
                    {dataProvider === 'INTERACTIVE_BROKERS' && (
                      <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Broker attivo: <strong className="text-slate-200">{dataProvider}</strong></span>
            <span className="text-[11px] font-mono text-emerald-400">Routing Attivo</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: MARKET WATCH & MARKET NEWS (matching screenshot layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: MARKET WATCH */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 pb-2.5 border-b border-cyan-500/30">
            <h3 className="text-sm font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
              <span>MARKET WATCH</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Clicca un benchmark per caricarlo</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BENCHMARKS.map((item) => {
              const isSelected = selectedAsset.symbol === item.symbol;
              return (
                <div
                  key={item.symbol}
                  onClick={() => {
                    const match = assets.find((a) => a.symbol === item.symbol);
                    if (match) onSelectAsset(match);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-sm ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-200 truncate">{item.name}</span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        item.isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.change}
                    </span>
                  </div>

                  <div className="text-sm font-bold font-mono text-slate-100 mb-2">
                    {item.price}
                  </div>

                  {/* Sparkline Canvas / SVG */}
                  <div className="flex justify-center">
                    {renderSparkline(item.sparkline, item.isPositive)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: MARKET NEWS */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-800">
              <h3 className="text-sm font-bold tracking-wider text-slate-300 uppercase">
                MARKET NEWS
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Wire
              </span>
            </div>

            <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
              {MARKET_NEWS.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-850 hover:border-slate-750 transition-colors flex items-start gap-3 text-xs"
                >
                  <span className="font-mono text-cyan-400/90 font-semibold shrink-0">
                    [{item.time}]
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 leading-snug">{item.text}</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-850 text-slate-400 border border-slate-750 shrink-0 hidden sm:inline">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Aggiornamento in tempo reale ogni 60s</span>
            <span className="font-mono text-slate-400">Reuters & Bloomberg Wire Feed</span>
          </div>
        </div>
      </div>

      {/* Asset Search Modal */}
      <AssetSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectAsset={onSelectAsset}
        currentSymbol={selectedAsset.symbol}
      />
    </div>
  );
};
