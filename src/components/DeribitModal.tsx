import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
  ExternalLink,
  Coins,
  TrendingUp,
  SlidersHorizontal,
  Key,
  Globe,
  Radio,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { OptionLeg, UnderlyingAsset, DeribitConfig, DeribitOrderRecord, DeribitOrderLeg } from '../types/options';
import {
  fetchDeribitStatus,
  saveDeribitConfig,
  testDeribitAuth,
  submitDeribitOrder,
  fetchDeribitOrders,
  fetchDeribitExpirations,
} from '../services/marketDataApi';

interface DeribitModalProps {
  isOpen: boolean;
  onClose: () => void;
  legs: OptionLeg[];
  asset: UnderlyingAsset;
  strategyTitle?: string;
  onConfigChanged?: () => void;
}

export const DeribitModal: React.FC<DeribitModalProps> = ({
  isOpen,
  onClose,
  legs,
  asset,
  strategyTitle = 'Strategia Opzioni Crypto',
  onConfigChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'TICKET' | 'API_SETTINGS' | 'MARKET_STATS' | 'HISTORY'>('TICKET');

  // Deribit State
  const [deribitConfig, setDeribitConfig] = useState<DeribitConfig>({
    connected: true,
    environment: 'TESTNET',
    clientId: '',
    clientSecret: '',
    currency: (asset.cryptoCurrency as any) || 'BTC',
    message: '',
  });

  // Ticket State
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [timeInForce, setTimeInForce] = useState<'good_til_cancelled' | 'immediate_or_cancel' | 'fill_or_kill'>('good_til_cancelled');
  const [postOnly, setPostOnly] = useState<boolean>(false);
  const [amountMultiplier, setAmountMultiplier] = useState<number>(1);
  const [customPriceCrypto, setCustomPriceCrypto] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<DeribitOrderRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // API Config State
  const [envSelection, setEnvSelection] = useState<'TESTNET' | 'MAINNET'>('TESTNET');
  const [clientIdInput, setClientIdInput] = useState<string>('');
  const [clientSecretInput, setClientSecretInput] = useState<string>('');
  const [isTestingAuth, setIsTestingAuth] = useState<boolean>(false);
  const [authTestResult, setAuthTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Orders History State
  const [orderHistory, setOrderHistory] = useState<DeribitOrderRecord[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // Market Expirations
  const [availableDeribitExps, setAvailableDeribitExps] = useState<any[]>([]);

  const cryptoCurr: 'BTC' | 'ETH' | 'SOL' = (asset.cryptoCurrency as any) || (asset.symbol === 'ETH' ? 'ETH' : asset.symbol === 'SOL' ? 'SOL' : 'BTC');

  // Load status & orders
  const refreshStatusAndOrders = async () => {
    try {
      const cfg = await fetchDeribitStatus();
      if (cfg) {
        setDeribitConfig(cfg);
        setEnvSelection(cfg.environment || 'TESTNET');
        setClientIdInput(cfg.clientId || '');
        setClientSecretInput(cfg.clientSecret || '');
      }

      setIsLoadingOrders(true);
      const orders = await fetchDeribitOrders();
      setOrderHistory(orders);

      const exps = await fetchDeribitExpirations(cryptoCurr);
      setAvailableDeribitExps(exps);
    } catch (e) {
      console.warn('Errore refresh Deribit:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatusAndOrders();
      setOrderResult(null);
      setErrorMessage(null);
      setAuthTestResult(null);
    }
  }, [isOpen, asset.symbol]);

  // Calculate default price in crypto
  useEffect(() => {
    if (legs.length === 0) return;
    const spot = asset.spotPrice || 80000;
    let netUsd = 0;
    legs.forEach((l) => {
      const p = l.premium || 0;
      if (l.action === 'BUY') netUsd += p * (l.quantity || 1);
      else netUsd -= p * (l.quantity || 1);
    });
    const netCrypto = Number((Math.abs(netUsd) / spot).toFixed(4));
    setCustomPriceCrypto(netCrypto);
  }, [legs, asset.spotPrice]);

  if (!isOpen) return null;

  // Handle Order Submit
  const handleSendOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setOrderResult(null);

    const spot = asset.spotPrice || 80000;
    const priceUsd = Number((customPriceCrypto * spot).toFixed(2));

    const deribitLegs: DeribitOrderLeg[] = legs.map((leg) => {
      // Instrument name format: BTC-27NOV26-80000-C
      const expCode = (leg.expiration || '27NOV26').replace(/\s*\(.*?\)/, '').replace(/-/g, '').toUpperCase();
      const instName = `${cryptoCurr}-${expCode}-${leg.strike}-${leg.type === 'CALL' ? 'C' : 'P'}`;
      const legPremCrypto = Number(((leg.premium || 0) / spot).toFixed(4));

      return {
        action: leg.action,
        quantity: (leg.quantity || 1) * amountMultiplier,
        strike: leg.strike,
        type: leg.type,
        expiration: leg.expiration,
        premiumCrypto: legPremCrypto,
        premiumUsd: leg.premium || 0,
        instrumentName: instName,
      };
    });

    try {
      const res = await submitDeribitOrder({
        symbol: `${cryptoCurr}-OPTIONS`,
        currency: cryptoCurr,
        strategyName: strategyTitle,
        orderType,
        priceCrypto: customPriceCrypto,
        priceUsd,
        timeInForce,
        postOnly,
        legs: deribitLegs,
      });

      if (res) {
        setOrderResult(res);
        refreshStatusAndOrders();
      } else {
        setErrorMessage('Nessuna risposta dal server durante la trasmissione dell\'ordine.');
      }
    } catch (err: any) {
      setErrorMessage(`Errore inoltro ordine Deribit: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle API Save
  const handleSaveApi = async () => {
    setIsSavingConfig(true);
    try {
      const updated = await saveDeribitConfig({
        environment: envSelection,
        clientId: clientIdInput.trim(),
        clientSecret: clientSecretInput.trim(),
        currency: cryptoCurr,
      });
      if (updated && updated.config) {
        setDeribitConfig(updated.config);
      }
      onConfigChanged?.();
      setAuthTestResult({
        success: true,
        message: 'Configurazione Deribit salvata con successo!',
      });
    } catch (err: any) {
      setAuthTestResult({
        success: false,
        message: `Errore salvataggio: ${err.message}`,
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle Auth Test
  const handleTestAuth = async () => {
    setIsTestingAuth(true);
    setAuthTestResult(null);
    try {
      const res = await testDeribitAuth({
        environment: envSelection,
        clientId: clientIdInput.trim(),
        clientSecret: clientSecretInput.trim(),
      });
      setAuthTestResult(res);
    } catch (err: any) {
      setAuthTestResult({
        success: false,
        message: `Errore chiamata di autenticazione: ${err.message}`,
      });
    } finally {
      setIsTestingAuth(false);
    }
  };

  const totalUsdEst = Number((customPriceCrypto * (asset.spotPrice || 80000) * amountMultiplier).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Deribit Crypto Options Engine</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    deribitConfig.environment === 'MAINNET'
                      ? 'bg-rose-950 border border-rose-500/40 text-rose-300'
                      : 'bg-amber-950 border border-amber-500/40 text-amber-300'
                  }`}
                >
                  {deribitConfig.environment} API v2
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Trading, Book Summary e routing API opzioni {cryptoCurr} (Settlement in {cryptoCurr})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={deribitConfig.environment === 'MAINNET' ? 'https://www.deribit.com' : 'https://test.deribit.com'}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Apri Deribit nel browser"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-semibold px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('TICKET')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'TICKET'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ticket Ordine {cryptoCurr}</span>
          </button>

          <button
            onClick={() => setActiveTab('API_SETTINGS')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'API_SETTINGS'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Configurazione API</span>
          </button>

          <button
            onClick={() => setActiveTab('MARKET_STATS')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'MARKET_STATS'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Statistiche & Scadenze</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Storico Ordini ({orderHistory.length})</span>
          </button>
        </div>

        {/* Content Tabs */}

        {/* 1. TICKET TAB */}
        {activeTab === 'TICKET' && (
          <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Index price status bar */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-slate-400">Deribit Index:</span>
                <span className="text-amber-400 font-bold text-sm">
                  ${(asset.spotPrice || 80250).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-slate-400">({cryptoCurr}/USD)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Contratti Gambe:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold">{legs.length}</span>
              </div>
            </div>

            {/* Strategy Legs Table */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Contratti inclusi nell'ordine Deribit:
              </span>

              {legs.length === 0 ? (
                <div className="p-6 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  Nessuna gamba selezionata nel Builder. Aggiungi contratti dalla Option Chain per comporre la strategia.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {legs.map((leg, idx) => {
                    const expCode = (leg.expiration || '27NOV26').replace(/\s*\(.*?\)/, '').replace(/-/g, '').toUpperCase();
                    const instName = `${cryptoCurr}-${expCode}-${leg.strike}-${leg.type === 'CALL' ? 'C' : 'P'}`;
                    const legCryptoPrem = Number(((leg.premium || 0) / (asset.spotPrice || 80000)).toFixed(4));

                    return (
                      <div
                        key={leg.id || idx}
                        className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              leg.action === 'BUY'
                                ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                                : 'bg-rose-950 border border-rose-500/40 text-rose-300'
                            }`}
                          >
                            {leg.action}
                          </span>
                          <span className="text-white font-bold">{instName}</span>
                          <span className="text-[10px] text-slate-400">({leg.type})</span>
                        </div>

                        <div className="text-right">
                          <span className="text-amber-400 font-bold block">{legCryptoPrem} {cryptoCurr}</span>
                          <span className="text-[10px] text-slate-500">(${leg.premium.toFixed(2)})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Quantità ({cryptoCurr})</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={amountMultiplier}
                  onChange={(e) => setAmountMultiplier(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-amber-400 text-center"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Tipo Ordine</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono focus:outline-none focus:border-amber-400"
                >
                  <option value="limit">Limit (LMT)</option>
                  <option value="market">Market (MKT)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Prezzo Combo ({cryptoCurr})</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={customPriceCrypto}
                  onChange={(e) => setCustomPriceCrypto(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400 text-center"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Time In Force</label>
                <select
                  value={timeInForce}
                  onChange={(e) => setTimeInForce(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-amber-400"
                >
                  <option value="good_til_cancelled">GTC (Valido fino a revoca)</option>
                  <option value="immediate_or_cancel">IOC (Immediato o cancella)</option>
                  <option value="fill_or_kill">FOK (Esegui o cancella)</option>
                </select>
              </div>
            </div>

            {/* Post Only and summary */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postOnly}
                  onChange={(e) => setPostOnly(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Post-Only (Garantisce fee Maker da fornitore di liquidità su Deribit)</span>
              </label>

              <div className="text-right font-mono">
                <span className="text-slate-400">Controvalore Stimato: </span>
                <span className="text-white font-bold">${totalUsdEst.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Order Feedback Alert */}
            {orderResult && (
              <div
                className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
                  orderResult.status === 'open' || orderResult.status === 'filled'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ordine Deribit #{orderResult.orderId} - Stato: {orderResult.status.toUpperCase()}</span>
                </div>
                <p className="leading-relaxed text-[11px] font-sans">{orderResult.message}</p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting || legs.length === 0}
                onClick={handleSendOrder}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Trasmissione in corso a Deribit...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Invia Ordine a Deribit ({deribitConfig.environment})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 2. API SETTINGS TAB */}
        {activeTab === 'API_SETTINGS' && (
          <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            {/* Environment selection */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Ambiente di Esecuzione Deribit:
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEnvSelection('TESTNET')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    envSelection === 'TESTNET'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-amber-400 mb-1">
                    <Globe className="w-4 h-4" />
                    <span>Deribit Testnet</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Ambiente di prova con fondi demo gratuiti. Ideale per testare bot e strategie senza alcun rischio. (test.deribit.com)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEnvSelection('MAINNET')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    envSelection === 'MAINNET'
                      ? 'bg-rose-500/10 border-rose-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-rose-400 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Deribit Mainnet Live</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Esecuzione reale sul book ufficiale Deribit con liquidità istituzionale in BTC/ETH. (deribit.com)
                  </p>
                </button>
              </div>
            </div>

            {/* API Credentials Input */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block font-sans">
                Credenziali API Deribit (JSON-RPC v2):
              </span>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Client ID / API Key</label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="es. 4fG8xK91"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Client Secret</label>
                <input
                  type="password"
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  placeholder="es. J2h8m_xK89..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isTestingAuth}
                  onClick={handleTestAuth}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 transition-colors font-sans text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingAuth ? 'animate-spin' : ''}`} />
                  <span>{isTestingAuth ? 'Verifica in corso...' : 'Test Autenticazione'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingConfig}
                  onClick={handleSaveApi}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-colors font-sans text-xs"
                >
                  <span>{isSavingConfig ? 'Salvataggio...' : 'Salva Configurazione'}</span>
                </button>
              </div>

              {/* Test result message */}
              {authTestResult && (
                <div
                  className={`p-3 rounded-lg border text-xs font-sans mt-2 ${
                    authTestResult.success
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {authTestResult.message}
                </div>
              )}
            </div>

            {/* How to guide */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-slate-400 text-[11px] leading-relaxed">
              <span className="text-slate-300 font-bold block">Come generare le chiavi API su Deribit:</span>
              <p>1. Accedi al tuo account su <strong className="text-amber-400">test.deribit.com</strong> (o deribit.com).</p>
              <p>2. Vai su <strong className="text-white">Account &gt; API</strong> e clicca su <em>"Add New Key"</em>.</p>
              <p>3. Assegna i permessi: <span className="text-emerald-400 font-mono">trade:read_write</span> (oppure solo <span className="text-slate-200 font-mono">read</span> per sola visualizzazione portafoglio).</p>
              <p>4. Incolla il <strong>Client ID</strong> e il <strong>Client Secret</strong> qui sopra e clicca <em>Test Autenticazione</em>.</p>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono mt-1">
                💡 <em>Nota:</em> I dati di mercato live, gli indici spot e l'intera Option Chain sono pubblici e gratuiti, attivi anche senza inserire credenziali API!
              </div>
            </div>
          </div>
        )}

        {/* 3. MARKET STATS TAB */}
        {activeTab === 'MARKET_STATS' && (
          <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono">
                <span className="text-slate-400 text-[10px] block">Deribit Index {cryptoCurr}</span>
                <span className="text-amber-400 font-bold text-base block mt-1">
                  ${(asset.spotPrice || 80250).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-emerald-400 text-[10px]">Prezzo di riferimento CBOE/Deribit</span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono">
                <span className="text-slate-400 text-[10px] block">DVOL (Crypto Volatility)</span>
                <span className="text-white font-bold text-base block mt-1">
                  {((asset.iv || 0.485) * 100).toFixed(1)}%
                </span>
                <span className="text-slate-400 text-[10px]">Indice di Volatilità Implicita Deribit</span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono">
                <span className="text-slate-400 text-[10px] block">Tipo Opzione</span>
                <span className="text-white font-bold text-base block mt-1">European</span>
                <span className="text-slate-400 text-[10px]">Regolamento in {cryptoCurr}</span>
              </div>
            </div>

            {/* Deribit Expirations list */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Scadenze Deribit Ufficiali Attive ({cryptoCurr}):
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableDeribitExps.map((exp) => (
                  <div
                    key={exp.deribitDate}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between font-mono"
                  >
                    <div>
                      <span className="text-white font-bold block">{exp.deribitDate}</span>
                      <span className="text-[10px] text-slate-400">{exp.isoDate}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        exp.is0DTE
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {exp.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. HISTORY TAB */}
        {activeTab === 'HISTORY' && (
          <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Ordini Trasmessi su Deribit API</span>
              <button
                type="button"
                onClick={refreshStatusAndOrders}
                className="flex items-center gap-1 text-slate-300 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                <span>Aggiorna</span>
              </button>
            </div>

            {orderHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Nessun ordine Deribit registrato in questa sessione.
              </div>
            ) : (
              <div className="space-y-2">
                {orderHistory.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{ord.strategyName}</span>
                        <span className="text-slate-500 text-[10px]">#{ord.orderId}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.status === 'open' || ord.status === 'filled'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : ord.status === 'simulated'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-sans">{ord.legsSummary}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                      <span>Prezzo: <strong className="text-amber-400">{ord.priceCrypto} {ord.currency}</strong> (${ord.priceUsd})</span>
                      <span>{new Date(ord.submittedAt).toLocaleTimeString()} · {ord.environment}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
