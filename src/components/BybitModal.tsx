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
  Layers,
  Lock,
  Zap,
} from 'lucide-react';
import { OptionLeg, UnderlyingAsset, BybitConfig, BybitOrderRecord, BybitOrderLeg } from '../types/options';
import {
  fetchBybitStatus,
  saveBybitConfig,
  testBybitAuth,
  submitBybitOrder,
  fetchBybitOrders,
  fetchBybitExpirations,
} from '../services/marketDataApi';

interface BybitModalProps {
  isOpen: boolean;
  onClose: () => void;
  legs: OptionLeg[];
  asset: UnderlyingAsset;
  strategyTitle?: string;
  onConfigChanged?: () => void;
}

export const BybitModal: React.FC<BybitModalProps> = ({
  isOpen,
  onClose,
  legs,
  asset,
  strategyTitle = 'Strategia Opzioni Crypto',
  onConfigChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'TICKET' | 'API_SETTINGS' | 'MARKET_STATS' | 'HISTORY'>('TICKET');

  // Bybit Config State
  const [bybitConfig, setBybitConfig] = useState<BybitConfig>({
    connected: true,
    environment: 'TESTNET',
    apiKey: '',
    apiSecret: '',
    accountType: 'UNIFIED',
    currency: (asset.cryptoCurrency as any) || 'BTC',
    settlementCoin: 'USDT',
    message: '',
  });

  // Ticket State
  const [orderType, setOrderType] = useState<'Limit' | 'Market'>('Limit');
  const [timeInForce, setTimeInForce] = useState<'GTC' | 'IOC' | 'FOK' | 'PostOnly'>('GTC');
  const [postOnly, setPostOnly] = useState<boolean>(false);
  const [amountMultiplier, setAmountMultiplier] = useState<number>(1);
  const [customPriceUsd, setCustomPriceUsd] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<BybitOrderRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // API Config State
  const [envSelection, setEnvSelection] = useState<'TESTNET' | 'MAINNET'>('TESTNET');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [apiSecretInput, setApiSecretInput] = useState<string>('');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isTestingAuth, setIsTestingAuth] = useState<boolean>(false);
  const [authTestResult, setAuthTestResult] = useState<{
    success: boolean;
    message: string;
    permissions?: string[];
    errorCode?: number;
    troubleshooting?: string[];
    detectedEnvironment?: 'TESTNET' | 'MAINNET';
    switchNeeded?: boolean;
  } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Orders History State
  const [orderHistory, setOrderHistory] = useState<BybitOrderRecord[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // Market Expirations
  const [availableBybitExps, setAvailableBybitExps] = useState<any[]>([]);

  const cryptoCurr: 'BTC' | 'ETH' | 'SOL' = (asset.cryptoCurrency as any) || (asset.symbol === 'ETH' ? 'ETH' : asset.symbol === 'SOL' ? 'SOL' : 'BTC');

  // Load status & orders
  const refreshStatusAndOrders = async () => {
    try {
      const cfg = await fetchBybitStatus();
      if (cfg) {
        setBybitConfig(cfg);
        setEnvSelection(cfg.environment || 'TESTNET');
        setApiKeyInput(cfg.apiKey || '');
        setApiSecretInput(cfg.apiSecret || '');
      }

      setIsLoadingOrders(true);
      const orders = await fetchBybitOrders();
      setOrderHistory(orders);

      const exps = await fetchBybitExpirations(cryptoCurr);
      setAvailableBybitExps(exps);
    } catch (e) {
      console.warn('Errore refresh Bybit:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatusAndOrders();
      setOrderResult(null);
      setErrorMessage(null);
    }
  }, [isOpen, asset.symbol]);

  // Compute total premium
  const netPremiumUsd = legs.reduce((acc, leg) => {
    const cost = leg.premium * leg.quantity * (asset.contractMultiplier || 1);
    return leg.action === 'BUY' ? acc + cost : acc - cost;
  }, 0);

  const netPremiumCrypto = asset.spotPrice > 0 ? netPremiumUsd / asset.spotPrice : 0;

  useEffect(() => {
    if (legs.length > 0) {
      setCustomPriceUsd(Math.abs(Math.round(netPremiumUsd * 100) / 100));
    }
  }, [legs, netPremiumUsd]);

  // Handle Order Submit
  const handleSendOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setOrderResult(null);

    try {
      const bybitLegs: BybitOrderLeg[] = legs.map((leg) => {
        const cleanExp = leg.expiration.replace(/\s*\(.*\)/, '').trim().toUpperCase();
        const sym = leg.instrumentName || `${cryptoCurr}-${cleanExp}-${leg.strike}-${leg.type === 'CALL' ? 'C' : 'P'}-USDT`;
        const premUsd = leg.premium;
        const premCrypto = asset.spotPrice > 0 ? leg.premium / asset.spotPrice : 0;

        return {
          action: leg.action,
          quantity: leg.quantity * amountMultiplier,
          strike: leg.strike,
          type: leg.type,
          expiration: leg.expiration,
          premiumUsd: premUsd,
          premiumCrypto: premCrypto,
          symbol: sym,
        };
      });

      const res = await submitBybitOrder({
        currency: cryptoCurr,
        strategyName: `${strategyTitle} (${legs.length} Leg)`,
        orderType,
        price: customPriceUsd,
        qty: amountMultiplier,
        timeInForce: postOnly ? 'PostOnly' : timeInForce,
        postOnly,
        legs: bybitLegs,
        environment: envSelection,
        apiKey: apiKeyInput.trim(),
        apiSecret: apiSecretInput.trim(),
      });

      if (res && res.order) {
        setOrderResult(res.order);
        await refreshStatusAndOrders();
      } else {
        throw new Error('Nessuna risposta valida da Bybit.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante la trasmissione dell\'ordine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Test Authentication
  const handleTestAuth = async () => {
    setIsTestingAuth(true);
    setAuthTestResult(null);
    try {
      const res = await testBybitAuth({
        environment: envSelection,
        apiKey: apiKeyInput.trim(),
        apiSecret: apiSecretInput.trim(),
      });
      setAuthTestResult(res);
      if (res.detectedEnvironment && res.switchNeeded) {
        setEnvSelection(res.detectedEnvironment);
      }
      if (res.success) {
        const finalEnv = res.detectedEnvironment || envSelection;
        setBybitConfig((prev) => ({
          ...prev,
          connected: true,
          apiKey: apiKeyInput.trim(),
          apiSecret: apiSecretInput.trim(),
          environment: finalEnv,
        }));
      }
    } catch (e: any) {
      setAuthTestResult({
        success: false,
        message: `Eccezione: ${e.message}`,
      });
    } finally {
      setIsTestingAuth(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setIsSavingConfig(true);
    try {
      const updated: BybitConfig = {
        connected: true,
        environment: envSelection,
        apiKey: apiKeyInput.trim(),
        apiSecret: apiSecretInput.trim(),
        accountType: bybitConfig.accountType || 'UNIFIED',
        currency: cryptoCurr,
        settlementCoin: 'USDT',
        lastChecked: new Date().toISOString(),
        message: `Configurazione Bybit V5 (${envSelection}) salvata con successo.`,
      };
      await saveBybitConfig(updated);
      setBybitConfig(updated);
      onConfigChanged?.();
      setActiveTab('TICKET');
    } catch (e) {
      console.warn('Errore salvataggio:', e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Cancel order in history
  const handleCancelOrder = async (id: string, orderId: string) => {
    try {
      const res = await fetch('/api/bybit/order/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, orderId }),
      });
      if (res.ok) {
        await refreshStatusAndOrders();
      }
    } catch (e) {
      console.warn('Errore cancellazione ordine Bybit:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-950/40 text-slate-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Bybit V5 Options
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    USDT Cash Settled
                  </span>
                </h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                    bybitConfig.environment === 'MAINNET'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <Radio className="w-3 h-3 mr-1 animate-pulse" />
                  {bybitConfig.environment}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Trading opzioni crypto regolamentate su BTC, ETH e SOL • Regolamento cash in USDT/USDC a scadenza
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6">
          <button
            onClick={() => setActiveTab('TICKET')}
            className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'TICKET'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Ticket Ordine Multi-Leg</span>
            {legs.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-xs rounded-full">
                {legs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('API_SETTINGS')}
            className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'API_SETTINGS'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Configurazione API & Account</span>
            {apiKeyInput ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400/60" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('MARKET_STATS')}
            className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'MARKET_STATS'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Statistiche & Scadenze Bybit</span>
            {availableBybitExps.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-slate-800 text-slate-300 text-xs rounded-full">
                {availableBybitExps.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'HISTORY'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Storico Ordini</span>
            {orderHistory.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-slate-800 text-slate-300 text-xs rounded-full">
                {orderHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          
          {/* TAB 1: TICKET ORDINI */}
          {activeTab === 'TICKET' && (
            <div className="space-y-6">
              {/* Asset & Spot Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div>
                  <div className="text-xs text-slate-400">Sottostante Bybit</div>
                  <div className="text-base font-bold text-white flex items-center gap-1.5">
                    {cryptoCurr} / USDT
                    <span className="text-xs font-normal text-amber-400">(Options)</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Spot / Index Price</div>
                  <div className="text-base font-bold text-emerald-400 font-mono">
                    ${asset.spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Modalità Regolamento</div>
                  <div className="text-sm font-semibold text-slate-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    USDT Cash Settled (08:00 UTC)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Ambiente Attivo</div>
                  <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${envSelection === 'MAINNET' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    {envSelection === 'MAINNET' ? 'Bybit Live Mainnet' : 'Bybit Testnet Sandbox'}
                  </div>
                </div>
              </div>

              {/* Legs Table / Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Gambe Strategia da Trasmettere ({legs.length})
                  </h3>
                  <span className="text-xs text-slate-400">
                    Contratto moltiplicatore: {asset.contractMultiplier || 1}
                  </span>
                </div>

                {legs.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-800/20 border border-dashed border-slate-700 text-slate-400">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-70" />
                    <p className="font-medium text-slate-300">Nessuna gamba selezionata nel Builder.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Aggiungi gambe dalla Option Chain o seleziona una strategia preimpostata prima di inviare l'ordine.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase font-mono border-b border-slate-700">
                        <tr>
                          <th className="px-3 py-2.5">Azione</th>
                          <th className="px-3 py-2.5">Qtà</th>
                          <th className="px-3 py-2.5">Tipo</th>
                          <th className="px-3 py-2.5">Strike</th>
                          <th className="px-3 py-2.5">Scadenza</th>
                          <th className="px-3 py-2.5">Simbolo Bybit</th>
                          <th className="px-3 py-2.5 text-right">Premio (USDT)</th>
                          <th className="px-3 py-2.5 text-right">Equiv. Crypto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                        {legs.map((leg, idx) => {
                          const cleanExp = leg.expiration.replace(/\s*\(.*\)/, '').trim().toUpperCase();
                          const bybitSymbol = leg.instrumentName || `${cryptoCurr}-${cleanExp}-${leg.strike}-${leg.type === 'CALL' ? 'C' : 'P'}-USDT`;
                          const cryptoPrem = asset.spotPrice > 0 ? (leg.premium / asset.spotPrice).toFixed(4) : '0';

                          return (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="px-3 py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                    leg.action === 'BUY'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {leg.action}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-bold text-white font-mono">
                                {leg.quantity * amountMultiplier}
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-slate-300">
                                {leg.type}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-bold text-amber-300">
                                ${leg.strike.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 text-slate-300 font-mono">
                                {leg.expiration}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">
                                {bybitSymbol}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-slate-200">
                                ${leg.premium.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-amber-400">
                                {cryptoPrem} {cryptoCurr}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Order Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Tipo Ordine Bybit
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('Limit')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                        orderType === 'Limit'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Limit (LMT)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('Market')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                        orderType === 'Market'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Market (MKT)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Time in Force
                  </label>
                  <select
                    value={timeInForce}
                    onChange={(e: any) => setTimeInForce(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="GTC">GTC (Good-Til-Cancelled)</option>
                    <option value="IOC">IOC (Immediate-Or-Cancel)</option>
                    <option value="FOK">FOK (Fill-Or-Kill)</option>
                    <option value="PostOnly">Post-Only (Maker Fee)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Moltiplicatore Contratto
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 5, 10].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAmountMultiplier(m)}
                        className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg border transition-colors ${
                          amountMultiplier === m
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price & Post-Only Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400">
                      Prezzo Limite Netto (USDT)
                    </label>
                    <span className="text-[11px] text-amber-400 font-mono">
                      ~{(customPriceUsd / (asset.spotPrice || 1)).toFixed(4)} {cryptoCurr}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-400">$</span>
                    <input
                      type="number"
                      step="1"
                      disabled={orderType === 'Market'}
                      value={customPriceUsd}
                      onChange={(e) => setCustomPriceUsd(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="postOnlyCheck"
                      checked={postOnly}
                      onChange={(e) => setPostOnly(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="postOnlyCheck" className="text-xs text-slate-300 cursor-pointer">
                      Flag <strong>Post-Only</strong> (Garantisce ordine Maker e rebate commissioni)
                    </label>
                  </div>
                </div>

                {/* Strategy Cost Breakdown */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950/80 to-amber-950/20 border border-amber-500/20 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Controvalore Stimato Operazione</div>
                    <div className="text-2xl font-black font-mono mt-1 text-white flex items-baseline gap-2">
                      ${(customPriceUsd * amountMultiplier).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-xs font-normal text-amber-400">USDT</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">
                      Premio Crypto:{' '}
                      <span className="text-amber-300">
                        {((customPriceUsd * amountMultiplier) / (asset.spotPrice || 1)).toFixed(4)} {cryptoCurr}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>Broker: <strong>Bybit V5 Options</strong></span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      Margine UTA Ottimizzato
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Feedback & Error Alerts */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">Errore trasmissione Bybit:</div>
                    <div className="mt-0.5">{errorMessage}</div>
                  </div>
                </div>
              )}

              {orderResult && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm">Ordine Confermato su Bybit!</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-300">
                    ID Ordine Bybit: <span className="text-amber-300">{orderResult.orderId}</span> | Stato: <span className="uppercase text-emerald-400">{orderResult.status}</span>
                  </div>
                  <div className="text-xs text-slate-300">{orderResult.message}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={handleSendOrder}
                  disabled={isSubmitting || legs.length === 0}
                  className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Trasmissione a Bybit V5...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Invia Ordine a Bybit ({envSelection})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURAZIONE API & CHIAVI */}
          {activeTab === 'API_SETTINGS' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-1">
                  <Key className="w-4 h-4 text-amber-400" />
                  Connessione Bybit V5 API & Credenziali
                </h3>
                <p className="text-xs text-slate-400">
                  I dati di mercato live e le Option Chain pubbliche funzionano <strong>senza alcuna chiave</strong>. Per inviare ordini diretti al tuo account Bybit, inserisci la tua API Key con permessi <em>Options Trading</em>.
                </p>
              </div>

              {/* Environment Choice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setEnvSelection('TESTNET')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    envSelection === 'TESTNET'
                      ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-200">Bybit Testnet</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400">
                      Sandbox Sicuro
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Ambiente di prova ufficiale su <code>api-testnet.bybit.com</code>. Permette di testare strategie e ordini senza rischiare fondi reali.
                  </p>
                </div>

                <div
                  onClick={() => setEnvSelection('MAINNET')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    envSelection === 'MAINNET'
                      ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-200">Bybit Live Mainnet</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-400">
                      Fondi Reali
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Connessione diretta a <code>api.bybit.com</code> per esecuzione reale su BTC, ETH e SOL Options.
                  </p>
                </div>
              </div>

              {/* API Inputs */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bybit API Key
                  </label>
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Es: aBcDeFgHiJkLmNoP"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Bybit API Secret (HMAC-SHA256)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-[11px] text-amber-400 hover:underline"
                    >
                      {showSecret ? 'Nascondi' : 'Mostra'}
                    </button>
                  </div>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecretInput}
                    onChange={(e) => setApiSecretInput(e.target.value)}
                    placeholder="Es: 1234567890abcdef1234567890abcdef"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Auth Test Result */}
                {authTestResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs border space-y-2.5 ${
                      authTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        {authTestResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Connessione Bybit Riuscita</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>Verifica Fallita (Codice {authTestResult.errorCode || 'Bybit'})</span>
                          </>
                        )}
                      </div>

                      {!authTestResult.success && (
                        <button
                          type="button"
                          onClick={() => {
                            const newEnv = envSelection === 'TESTNET' ? 'MAINNET' : 'TESTNET';
                            setEnvSelection(newEnv);
                            setAuthTestResult(null);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition-colors flex items-center gap-1"
                        >
                          <span>Passa a {envSelection === 'TESTNET' ? 'MAINNET (bybit.com)' : 'TESTNET (Sandbox)'}</span>
                        </button>
                      )}
                    </div>

                    <div className="text-xs leading-relaxed">{authTestResult.message}</div>

                    {authTestResult.permissions && (
                      <div className="pt-1 text-[11px] text-slate-300">
                        <strong>Permessi verificati:</strong> {authTestResult.permissions.join(', ')}
                      </div>
                    )}

                    {authTestResult.troubleshooting && (
                      <div className="mt-2 pt-2 border-t border-rose-500/20 text-slate-300">
                        <div className="font-semibold text-rose-200 mb-1.5 text-[11px] flex items-center gap-1">
                          <span>Come risolvere l'errore 10003 su Bybit:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                          {authTestResult.troubleshooting.map((tip, i) => (
                            <li key={i} className="leading-relaxed">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleTestAuth}
                    disabled={isTestingAuth}
                    className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    {isTestingAuth ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Test Autenticazione Bybit</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSavingConfig}
                    className="flex items-center space-x-2 px-5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                  >
                    {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>Salva Configurazione</span>
                  </button>
                </div>
              </div>

              {/* Bybit Options Guide Box */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  Come generare le chiavi API su Bybit:
                </h4>
                <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside pl-1">
                  <li>Accedi a <a href="https://www.bybit.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">bybit.com</a> o al Testnet <a href="https://testnet.bybit.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">testnet.bybit.com</a>.</li>
                  <li>Vai su <strong>Profilo &rarr; API Management</strong> e crea una nuova API Key.</li>
                  <li>Seleziona <strong>System-generated API Keys</strong> con permessi <strong>Contract & Options Trade</strong>.</li>
                  <li>Copia e incolla API Key e Secret in questa schermata e clicca su "Test Autenticazione".</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: STATISTICHE & SCADENZE */}
          {activeTab === 'MARKET_STATS' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="text-xs text-slate-400">Scadenze Attive Bybit ({cryptoCurr})</div>
                  <div className="text-2xl font-bold text-amber-300 font-mono mt-1">
                    {availableBybitExps.length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Da 0DTE (giornaliere) a Trimestrali
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="text-xs text-slate-400">Orario di Settlement Ufficiale</div>
                  <div className="text-2xl font-bold text-slate-100 font-mono mt-1">
                    08:00 UTC
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Prezzo medio ponderato 30 min su spot
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="text-xs text-slate-400">Margine Portafoglio (UTA)</div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                    Attivo
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Compensazione del rischio tra opzioni e future
                  </div>
                </div>
              </div>

              {/* Expirations List */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Scadenze Ufficiali Bybit Options per {cryptoCurr}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableBybitExps.map((exp, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-white">{exp.bybitDate}</div>
                        <div className="text-[10px] text-slate-400">{exp.isoDate}</div>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          exp.is0DTE
                            ? 'bg-amber-500/20 text-amber-300 font-bold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {exp.daysToExpiry.toFixed(1)}d
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STORICO ORDINI */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Registro Operazioni Bybit V5
                </h3>
                <button
                  type="button"
                  onClick={refreshStatusAndOrders}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                  <span>Aggiorna</span>
                </button>
              </div>

              {orderHistory.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-800/20 border border-dashed border-slate-700 text-slate-400">
                  <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-slate-300">Nessun ordine registrato in archivio.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Gli ordini inviati tramite il Ticket Bybit compariranno automaticamente qui con ID e stato di esecuzione.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-white">
                            #{item.orderId}
                          </span>
                          <span className="text-xs text-slate-400">• {item.strategyName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.status === 'Filled' || item.status === 'New'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : item.status === 'Simulated'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-slate-500">
                            {new Date(item.submittedAt).toLocaleTimeString()}
                          </span>
                          {(item.status === 'New' || item.status === 'Simulated') && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(item.id, String(item.orderId))}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="Cancella Ordine"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                        {item.legsSummary}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <div>
                          Prezzo: <strong>${item.price.toLocaleString()} USDT</strong> • Qtà: <strong>{item.qty}x</strong> • TIF: <strong>{item.timeInForce}</strong>
                        </div>
                        <div className="text-slate-400">
                          Ambiente: <strong>{item.environment}</strong>
                        </div>
                      </div>

                      {item.message && (
                        <div className="mt-2 text-[11px] text-slate-400 italic">
                          {item.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
