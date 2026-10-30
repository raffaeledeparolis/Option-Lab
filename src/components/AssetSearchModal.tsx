import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Coins, TrendingUp, TrendingDown, ArrowRight, Sparkles, Globe, DollarSign } from 'lucide-react';
import { UnderlyingAsset, SearchResultAsset } from '../types/options';
import { searchAssetsApi, fetchAssetQuoteApi } from '../services/marketDataApi';

interface AssetSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: UnderlyingAsset) => void;
  currentSymbol: string;
}

export const AssetSearchModal: React.FC<AssetSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAsset,
  currentSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'CRYPTO' | 'EQUITY' | 'ETF' | 'INDEX'>('ALL');
  const [results, setResults] = useState<SearchResultAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSymbol, setLoadingSymbol] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setErrorMessage(null);
      // Load popular defaults
      setIsLoading(true);
      searchAssetsApi('').then((res) => {
        setResults(res);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  // Handle keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const fetched = await searchAssetsApi(query);
        setResults(fetched);
      } catch (err) {
        setErrorMessage('Errore durante la ricerca API degli asset.');
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, isOpen]);

  // Filter results by category
  const filteredResults = results.filter((item) => {
    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'CRYPTO') return item.category === 'CRYPTO';
    if (activeCategory === 'EQUITY') return item.category === 'EQUITY';
    if (activeCategory === 'ETF') return item.category === 'ETF';
    if (activeCategory === 'INDEX') return item.category === 'INDEX';
    return true;
  });

  // Handle selecting an asset: fetch full live quote and return
  const handleChooseAsset = async (item: SearchResultAsset) => {
    setLoadingSymbol(item.symbol);
    setErrorMessage(null);
    try {
      const fullAsset = await fetchAssetQuoteApi(item.symbol, item.category);
      if (fullAsset) {
        onSelectAsset(fullAsset);
        onClose();
      } else {
        setErrorMessage(`Impossibile recuperare quotazione live per ${item.symbol}.`);
      }
    } catch (err: any) {
      setErrorMessage(`Errore caricamento quote: ${err.message || 'Errore di rete'}`);
    } finally {
      setLoadingSymbol(null);
    }
  };

  // Direct enter submit
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toUpperCase();
    if (!clean) return;

    // If there is an exact match in results, use it
    const exact = results.find((r) => r.symbol.toUpperCase() === clean);
    if (exact) {
      handleChooseAsset(exact);
      return;
    }

    setLoadingSymbol(clean);
    setErrorMessage(null);
    try {
      const fullAsset = await fetchAssetQuoteApi(clean);
      if (fullAsset) {
        onSelectAsset(fullAsset);
        onClose();
      } else {
        setErrorMessage(`Nessun asset trovato via API per "${clean}".`);
      }
    } catch (err: any) {
      setErrorMessage(`Errore ricerca ticker: ${err.message || 'Errore API'}`);
    } finally {
      setLoadingSymbol(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-indigo-950/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Seleziona Asset via Integrazione API
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Bybit & Yahoo Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cerca qualsiasi Crypto (Bybit Spot), Azione US, ETF o Indice con quotazioni in tempo reale
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Form */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/60">
          <form onSubmit={handleDirectSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca ticker o nome (es. XRP, NVDA, TSLA, BTC, ETH, SPY, AAPL, MSTR)..."
              className="w-full pl-10 pr-24 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-all font-mono"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              Invio
            </button>
          </form>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeCategory === 'ALL'
                  ? 'bg-slate-800 text-white font-bold border border-slate-650'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Tutti gli Asset
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('CRYPTO')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeCategory === 'CRYPTO'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/20'
              }`}
            >
              <Coins className="w-3 h-3 text-amber-400" />
              <span>Crypto (Bybit Spot)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('EQUITY')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeCategory === 'EQUITY'
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Azioni US
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('ETF')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeCategory === 'ETF'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              ETF (SPY, QQQ...)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('INDEX')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeCategory === 'INDEX'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Indici (SPX, NDX)
            </button>
          </div>
        </div>

        {/* Quick Popular Recommendations if no search query */}
        {!query && (
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Popolari:
            </span>
            {['BTC', 'ETH', 'SOL', 'XRP', 'NVDA', 'AAPL', 'TSLA', 'MSTR', 'SPY', 'QQQ', 'SPX'].map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  const target = results.find((r) => r.symbol === sym) || {
                    symbol: sym,
                    name: sym,
                    category: ['BTC', 'ETH', 'SOL', 'XRP'].includes(sym) ? 'CRYPTO' : sym === 'SPX' ? 'INDEX' : ['SPY', 'QQQ'].includes(sym) ? 'ETF' : 'EQUITY',
                  };
                  handleChooseAsset(target as SearchResultAsset);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all shrink-0 border ${
                  sym === currentSymbol
                    ? 'bg-amber-500/30 text-amber-200 border-amber-500/60'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[420px]">
          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              <span>Interrogazione API Bybit & Mercati in corso...</span>
            </div>
          )}

          {!isLoading && filteredResults.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-xs space-y-2">
              <p>Nessun asset corrispondente a "{query}".</p>
              <button
                type="button"
                onClick={() => query && handleDirectSubmit({ preventDefault: () => {} } as any)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-medium inline-flex items-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Forza caricamento API per "{query.toUpperCase()}"</span>
              </button>
            </div>
          )}

          {!isLoading &&
            filteredResults.map((item) => {
              const isSelected = item.symbol === currentSymbol;
              const isItemLoading = loadingSymbol === item.symbol;
              const isCrypto = item.category === 'CRYPTO';

              return (
                <div
                  key={`${item.symbol}-${item.exchange || ''}`}
                  onClick={() => !isItemLoading && handleChooseAsset(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/50 shadow-sm ring-1 ring-amber-500/20'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  {/* Left: Ticker & Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 border ${
                        isCrypto
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : item.category === 'ETF'
                          ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                          : item.category === 'INDEX'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                      }`}
                    >
                      {isCrypto ? <Coins className="w-4 h-4" /> : item.symbol.slice(0, 3)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100 font-mono">{item.symbol}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${
                            isCrypto
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                              : item.category === 'ETF'
                              ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                              : item.category === 'INDEX'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                              : 'bg-sky-950/80 text-sky-300 border-sky-500/40'
                          }`}
                        >
                          {item.category}
                        </span>
                        {item.exchange && (
                          <span className="text-[10px] text-slate-400 font-mono truncate hidden sm:inline">
                            {item.exchange}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{item.name}</p>
                    </div>
                  </div>

                  {/* Right: Spot price and Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    {item.spotPrice !== undefined && (
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-slate-100">
                          {item.currency || '$'}
                          {item.spotPrice.toLocaleString('en-US', {
                            minimumFractionDigits: item.spotPrice < 2 ? 4 : 2,
                            maximumFractionDigits: item.spotPrice < 2 ? 4 : 2,
                          })}
                        </div>
                        {item.change24hPercent !== undefined && (
                          <div
                            className={`text-[11px] flex items-center justify-end gap-0.5 ${
                              item.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.change24hPercent >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>
                              {item.change24hPercent >= 0 ? '+' : ''}
                              {item.change24hPercent.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isItemLoading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChooseAsset(item);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50'
                          : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isItemLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Caricamento...</span>
                        </>
                      ) : isSelected ? (
                        <span>Attivo</span>
                      ) : (
                        <>
                          <span>Seleziona</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>Feed Bybit V5 Spot & Yahoo Finance REST API attivi</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Esc per chiudere</span>
        </div>
      </div>
    </div>
  );
};
