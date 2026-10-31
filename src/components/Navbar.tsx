import React from 'react';
import { Layers, Activity, Sparkles, SlidersHorizontal, Grid3X3, BarChart2, GitCompare, Send, Coins, Globe } from 'lucide-react';

interface NavbarProps {
  activeTab: 'overview' | 'builder' | 'payoff' | 'scenario' | 'greeks' | 'monte-carlo' | 'comparator' | 'ai-advisor';
  setActiveTab: (tab: 'overview' | 'builder' | 'payoff' | 'scenario' | 'greeks' | 'monte-carlo' | 'comparator' | 'ai-advisor') => void;
  legsCount: number;
  onResetStrategy: () => void;
  onOpenOrderModal?: () => void;
  isCrypto?: boolean;
  onOpenDeribitModal?: () => void;
  onOpenBybitModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  legsCount,
  onResetStrategy,
  onOpenOrderModal,
  isCrypto,
  onOpenDeribitModal,
  onOpenBybitModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              Option Lab
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-cyan-950/80 text-cyan-300 shadow-sm ring-1 ring-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mercati Globali</span>
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'builder'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Chain & Builder</span>
            {legsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-mono">
                {legsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payoff')}
            className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'payoff'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Payoff & 0DTE</span>
          </button>

          <button
            onClick={() => setActiveTab('scenario')}
            className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'scenario'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Heatmap Scenari</span>
          </button>

          <button
            onClick={() => setActiveTab('greeks')}
            className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'greeks'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Greche</span>
          </button>

          <button
            onClick={() => setActiveTab('monte-carlo')}
            className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'monte-carlo'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Monte Carlo</span>
          </button>

          <button
            onClick={() => setActiveTab('comparator')}
            className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'comparator'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Confronto (3x)</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-advisor')}
            className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ai-advisor'
                ? 'bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500/40'
                : 'text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-950/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Advisor</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          {isCrypto ? (
            <div className="flex items-center gap-1.5">
              {onOpenBybitModal && (
                <button
                  onClick={onOpenBybitModal}
                  className="px-2.5 py-1.5 text-xs font-bold text-amber-200 bg-amber-600/90 hover:bg-amber-500 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 shadow-sm ring-1 ring-amber-400/50"
                  title="Apri Terminale Bybit V5 Options (Ordini USDT, Testnet/Mainnet & Margine UTA)"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                  <span>Bybit V5</span>
                </button>
              )}
              {onOpenDeribitModal && (
                <button
                  onClick={onOpenDeribitModal}
                  className="px-2.5 py-1.5 text-xs font-bold text-cyan-200 bg-cyan-700/80 hover:bg-cyan-600 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 shadow-sm ring-1 ring-cyan-400/50"
                  title="Apri Terminale Deribit API v2 (Book Live, Testnet/Mainnet & Gestione Ordini Crypto)"
                >
                  <Coins className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Deribit</span>
                </button>
              )}
            </div>
          ) : (
            onOpenOrderModal && legsCount > 0 && (
              <button
                onClick={onOpenOrderModal}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                title="Invia la strategia combinata come ordine a Trader Workstation (IBKR)"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Invia Ordine TWS</span>
              </button>
            )
          )}
          <button
            onClick={onResetStrategy}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap"
          >
            Reset Gambe
          </button>
        </div>
      </div>

      {/* Mobile Nav row */}
      <div className="flex lg:hidden overflow-x-auto gap-1 pt-2.5 mt-2 border-t border-slate-900 text-xs no-scrollbar">
        {[
          { id: 'overview', label: 'Mercati Globali' },
          { id: 'builder', label: 'Builder' },
          { id: 'payoff', label: 'Payoff & 0DTE' },
          { id: 'scenario', label: 'Heatmap' },
          { id: 'greeks', label: 'Greche' },
          { id: 'monte-carlo', label: 'Monte Carlo' },
          { id: 'comparator', label: 'Confronto' },
          { id: 'ai-advisor', label: 'AI Advisor' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`px-2.5 py-1 rounded text-xs whitespace-nowrap ${
              activeTab === item.id
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
