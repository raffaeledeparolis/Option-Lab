import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  HelpCircle,
  Terminal,
  Info,
  Monitor,
  Check,
  Copy,
} from 'lucide-react';
import { OptionLeg, UnderlyingAsset, OrderType, TimeInForce, IbkrOrderRecord } from '../types/options';

interface IbkrOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  legs: OptionLeg[];
  asset: UnderlyingAsset;
  strategyTitle?: string;
  onOpenIbkrConfig?: () => void;
}

export const IbkrOrderModal: React.FC<IbkrOrderModalProps> = ({
  isOpen,
  onClose,
  legs,
  asset,
  strategyTitle = 'Strategia Opzioni',
  onOpenIbkrConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'TICKET' | 'TROUBLESHOOTING' | 'HISTORY'>('TICKET');
  const [orderType, setOrderType] = useState<OrderType>('LMT');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('DAY');
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [quantityMultiplier, setQuantityMultiplier] = useState<number>(1);
  const [accountId, setAccountId] = useState<string>('DU_PAPER');
  const [notes, setNotes] = useState<string>('');

  // Status & Orders
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<IbkrOrderRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderHistory, setOrderHistory] = useState<IbkrOrderRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Live Handshake Diagnostic State
  const [isTestingHandshake, setIsTestingHandshake] = useState<boolean>(false);
  const [handshakeResult, setHandshakeResult] = useState<any>(null);
  const [pingTarget, setPingTarget] = useState<'CURRENT' | 'LOCAL' | 'CUSTOM'>('CURRENT');
  const [customPingHost, setCustomPingHost] = useState<string>('127.0.0.1');
  const [customPingPort, setCustomPingPort] = useState<number>(7497);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // IBKR Connection State
  const [ibkrState, setIbkrState] = useState<{
    connected: boolean;
    mode: string;
    host: string;
    port: number;
    clientId?: number;
    message: string;
  }>({
    connected: false,
    mode: 'PAPER',
    host: '127.0.0.1',
    port: 7497,
    clientId: 1,
    message: '',
  });

  // Calculate Net Debit / Credit from legs
  useEffect(() => {
    let net = 0;
    legs.forEach((leg) => {
      const prem = leg.premium || 0;
      const qty = leg.quantity || 1;
      if (leg.action === 'BUY') {
        net += prem * qty;
      } else {
        net -= prem * qty;
      }
    });
    setLimitPrice(Math.round(Math.abs(net) * 100) / 100);
  }, [legs]);

  // Fetch IBKR status & order history
  const fetchIbkrStatus = async () => {
    try {
      const res = await fetch('/api/ibkr/status');
      if (res.ok) {
        const data = await res.json();
        setIbkrState(data);
      }
    } catch (e) {
      console.warn('Errore lettura status IBKR:', e);
    }
  };

  const fetchOrders = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/ibkr/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          setOrderHistory(data.orders);
        }
      }
    } catch (e) {
      console.warn('Errore recupero ordini:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleTestHandshake = async (overrideHost?: string, overridePort?: number) => {
    setIsTestingHandshake(true);
    setHandshakeResult(null);
    try {
      let targetH = ibkrState.host || '127.0.0.1';
      let targetP = Number(ibkrState.port) || 7497;

      if (overrideHost) {
        targetH = overrideHost;
        targetP = overridePort || 7497;
      } else if (pingTarget === 'LOCAL') {
        targetH = '127.0.0.1';
        targetP = 7497;
      } else if (pingTarget === 'CUSTOM') {
        targetH = customPingHost.trim() || '127.0.0.1';
        targetP = customPingPort || 7497;
      }

      const res = await fetch(`/api/ibkr/test-handshake?host=${encodeURIComponent(targetH)}&port=${targetP}`);
      const data = await res.json();
      setHandshakeResult(data.result || data);
    } catch (e: any) {
      setHandshakeResult({
        connected: false,
        status: 'ERROR',
        diagnostic: `Errore di rete durante il test di handshake: ${e?.message || e}`,
      });
    } finally {
      setIsTestingHandshake(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIbkrStatus();
      fetchOrders();
      setOrderSuccess(null);
      setErrorMessage(null);
      setHandshakeResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate total net cost for the ticket
  let initialNet = 0;
  legs.forEach((leg) => {
    const prem = leg.premium || 0;
    const qty = (leg.quantity || 1) * quantityMultiplier;
    if (leg.action === 'BUY') {
      initialNet += prem * qty;
    } else {
      initialNet -= prem * qty;
    }
  });

  const isNetDebit = initialNet >= 0;
  const totalCashValue = limitPrice * 100 * quantityMultiplier;

  // Submit Order to backend
  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setOrderSuccess(null);

    const payload = {
      symbol: asset.symbol,
      strategyName: strategyTitle,
      orderType,
      limitPrice,
      timeInForce,
      accountId,
      notes,
      legs: legs.map((leg) => ({
        action: leg.action,
        quantity: (leg.quantity || 1) * quantityMultiplier,
        strike: leg.strike,
        type: leg.type,
        expiration: leg.expiration,
        premium: leg.premium,
      })),
    };

    try {
      const res = await fetch('/api/ibkr/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.order) {
        setOrderSuccess(data.order);
        setOrderHistory((prev) => [data.order, ...prev]);
      } else {
        setErrorMessage(data.error || 'Impossibile completare la trasmissione verso TWS.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore di rete durante la trasmissione verso TWS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: number, id: string) => {
    try {
      const res = await fetch('/api/ibkr/order/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, id }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.warn('Errore cancellazione ordine:', e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Ticket Ordine Interactive Brokers (TWS)
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    ibkrState.mode === 'LIVE'
                      ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                      : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  }`}
                >
                  {ibkrState.mode || 'PAPER'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inoltro ordini combo multi-leg direttamente al socket Trader Workstation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('TICKET')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'TICKET'
                  ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ticket</span>
            </button>
            <button
              onClick={() => setActiveTab('TROUBLESHOOTING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'TROUBLESHOOTING'
                  ? 'bg-amber-950 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Guida TWS Desktop</span>
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-purple-950 border-purple-500/50 text-purple-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Storico ({orderHistory.length})</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* IBKR Connection Status Bar */}
        <div
          className={`px-4 py-2 border-b text-xs flex items-center justify-between gap-3 ${
            ibkrState.connected
              ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'
              : 'bg-amber-950/40 border-amber-900/50 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                ibkrState.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold">
              {ibkrState.connected
                ? `Socket TWS Attivo: ${ibkrState.host}:${ibkrState.port}`
                : 'TWS non connesso al socket'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('TROUBLESHOOTING')}
              className="text-[11px] text-amber-300 underline hover:text-amber-200 transition-colors flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Non vedi l'ordine in TWS?</span>
            </button>
            {onOpenIbkrConfig && (
              <button
                type="button"
                onClick={onOpenIbkrConfig}
                className="text-[11px] underline hover:text-white transition-colors"
              >
                Impostazioni Socket
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Ticket Execution */}
        {activeTab === 'TICKET' && (
          <div className="p-4 space-y-4">
            {/* Strategy Banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Strategia Selezionata
                </span>
                <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                  <span className="text-emerald-400">{strategyTitle}</span>
                  <span className="text-xs text-slate-400">su</span>
                  <span className="text-white font-mono font-bold">
                    {asset.symbol} ({asset.currency}{asset.spotPrice.toFixed(2)})
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400">Gambe Ordine</span>
                <div className="text-sm font-mono font-bold text-slate-200">
                  {legs.length} {legs.length === 1 ? 'Contratto' : 'Combo Leg'}
                </div>
              </div>
            </div>

            {/* Legs Breakdown Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-2.5 bg-slate-950 text-xs font-semibold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                <span>Composizione Ordine (BAG / Combo Contract)</span>
                <span className="font-mono text-[11px] text-slate-500">Routing: SMART</span>
              </div>
              <div className="divide-y divide-slate-800/60 font-mono text-xs max-h-40 overflow-y-auto">
                {legs.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    Nessuna gamba selezionata nel builder. Aggiungi opzioni prima di inoltrare l'ordine.
                  </div>
                ) : (
                  legs.map((leg, idx) => (
                    <div
                      key={leg.id || idx}
                      className="p-2.5 flex items-center justify-between hover:bg-slate-850/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            leg.action === 'BUY'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          }`}
                        >
                          {leg.action}
                        </span>
                        <span className="text-slate-300 font-bold">
                          {(leg.quantity || 1) * quantityMultiplier}x
                        </span>
                        <span
                          className={`font-semibold ${
                            leg.type === 'CALL' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {leg.type}
                        </span>
                        <span className="text-white font-bold">${leg.strike}</span>
                        <span className="text-slate-400 text-[11px]">{leg.expiration}</span>
                      </div>
                      <div className="text-slate-300 font-semibold">
                        {asset.currency}{leg.premium.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Execution Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Order Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Tipo Ordine</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="LMT">LMT (Limit - Consigliato)</option>
                  <option value="MKT">MKT (Market)</option>
                  <option value="STP">STP (Stop)</option>
                </select>
              </div>

              {/* Time In Force */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Validità (TIF)</label>
                <select
                  value={timeInForce}
                  onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="DAY">DAY (Fine seduta odierna)</option>
                  <option value="GTC">GTC (Good 'Til Canceled)</option>
                  <option value="IOC">IOC (Immediate or Cancel)</option>
                </select>
              </div>

              {/* Multiplier / Lots */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Quantità / Lotti</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantityMultiplier(Math.max(1, quantityMultiplier - 1))}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-xs font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantityMultiplier}
                    onChange={(e) => setQuantityMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-white font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantityMultiplier(quantityMultiplier + 1)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Limit Price Row */}
            {orderType === 'LMT' && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    Prezzo Limite Netto ({isNetDebit ? 'Net Debit' : 'Net Credit'})
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    Controvalore Stimato: ~{asset.currency}{totalCashValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">{asset.currency}</span>
                  <input
                    type="number"
                    step="0.05"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setLimitPrice(Math.max(0.01, Math.round((limitPrice - 0.05) * 100) / 100))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold"
                  >
                    -0.05
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimitPrice(Math.round((limitPrice + 0.05) * 100) / 100)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold"
                  >
                    +0.05
                  </button>
                </div>
              </div>
            )}

            {/* Waiting TWS Desktop Approval or Filter Notice */}
            {orderSuccess && orderSuccess.status === 'WAITING_TWS_POPUP' && (
              <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/60 space-y-2.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Pacchetto Ordine #{orderSuccess.orderId} Inviato via Socket TCP a TWS!
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Il server ha inviato i frame d'ordine al socket di Trader Workstation. Per visualizzarlo nel tuo terminale TWS Desktop esegui questi 2 controlli immediati:
                </p>
                <div className="bg-slate-900/90 rounded-lg p-2.5 space-y-1.5 border border-amber-900/50 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Popup desktop TWS:</strong> Controlla se sul tuo computer c'è una finestra modale di TWS: <em className="text-amber-300">"Accept incoming connection from 127.0.0.1?"</em>. Clicca <strong className="text-emerald-400">"Sì"</strong> per completare la ricezione.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Filtro Scheda Ordini TWS:</strong> Nella scheda "Ordini" (Orders) di TWS Desktop, clicca sul filtro in alto e imposta <strong className="text-emerald-400">"Tutti gli ordini" (All Orders)</strong> o la scheda <strong className="text-emerald-400">"API"</strong>. Di default TWS mostra solo gli ordini manuali!
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('TROUBLESHOOTING')}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
                  >
                    <span>Apri Guida Risoluzione Dettagliata & Test Handshake</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-slate-400">
                    Byte inviati: {orderSuccess.transmissionDetails?.bytesSent || 'OK'}
                  </span>
                </div>
              </div>
            )}

            {/* Standard Submitted Success */}
            {orderSuccess && orderSuccess.status === 'SUBMITTED' && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/60 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Ordine #{orderSuccess.orderId} Confermato da TWS!</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  {orderSuccess.message}
                </p>
                <div className="pt-1.5 border-t border-emerald-900/50 flex items-center justify-between text-[11px] font-mono text-emerald-300/80">
                  <span>Stato TWS: Ricevuto/Confermato</span>
                  <span>Destinazione: {orderSuccess.twsHost}:{orderSuccess.twsPort}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 flex items-center gap-2 text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {ibkrState.mode === 'LIVE'
                    ? 'Attenzione: Conto REALE attivo in TWS'
                    : 'Conto simulato PAPER Trading: Nessun rischio di capitale'}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={legs.length === 0 || isSubmitting}
                  onClick={handleSubmitOrder}
                  className={`w-1/2 sm:w-auto px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                    ibkrState.mode === 'LIVE'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Trasmissione Socket TWS...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Invia Ordine a TWS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Troubleshooting Guide & Live Test */}
        {activeTab === 'TROUBLESHOOTING' && (
          <div className="p-4 space-y-4 max-h-[480px] overflow-y-auto">
            {/* Live Interactive Ping Tool with Multi-Target Selection */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    Test Handshake Socket TWS & Diagnostica Connessione
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isTestingHandshake}
                    onClick={() => handleTestHandshake()}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingHandshake ? 'animate-spin' : ''}`} />
                    <span>{isTestingHandshake ? 'Ping in corso...' : 'Esegui Ping TWS'}</span>
                  </button>
                </div>
              </div>

              {/* Target Selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Seleziona Destinazione del Ping:
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPingTarget('CURRENT')}
                    className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                      pingTarget === 'CURRENT'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold text-[11px] flex items-center gap-1">
                      🌐 Tunnel Configurato
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 truncate">
                      {ibkrState.host}:{ibkrState.port}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPingTarget('LOCAL')}
                    className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                      pingTarget === 'LOCAL'
                        ? 'bg-blue-500/10 border-blue-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold text-[11px] flex items-center gap-1">
                      💻 Localhost Diretto
                    </span>
                    <span className="font-mono text-[10px] text-blue-400">
                      127.0.0.1:7497
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPingTarget('CUSTOM')}
                    className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                      pingTarget === 'CUSTOM'
                        ? 'bg-amber-500/10 border-amber-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold text-[11px] flex items-center gap-1">
                      ⚙️ Personalizzato
                    </span>
                    <span className="font-mono text-[10px] text-amber-400">
                      Inserisci Host:Port
                    </span>
                  </button>
                </div>
              </div>

              {/* Custom Target Input */}
              {pingTarget === 'CUSTOM' && (
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400 text-[11px]">Host:</span>
                  <input
                    type="text"
                    value={customPingHost}
                    onChange={(e) => setCustomPingHost(e.target.value)}
                    placeholder="es. 127.0.0.1 o tunnel ngrok"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-slate-400 text-[11px]">Port:</span>
                  <input
                    type="number"
                    value={customPingPort}
                    onChange={(e) => setCustomPingPort(parseInt(e.target.value) || 7497)}
                    className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Trajectory / Architecture Path */}
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Origine Pacchetto:</span>
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-slate-300">
                    Backend Node.js (Server Cloud)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Destinazione:</span>
                  <span className="px-1.5 py-0.5 bg-emerald-950 border border-emerald-500/40 rounded font-mono text-[10px] text-emerald-300 font-bold">
                    {pingTarget === 'LOCAL'
                      ? '127.0.0.1:7497'
                      : pingTarget === 'CUSTOM'
                      ? `${customPingHost}:${customPingPort}`
                      : `${ibkrState.host}:${ibkrState.port}`}
                  </span>
                </div>
              </div>

              {/* Ping Result Display */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Esito Ultimo Test Socket:</span>
                  <span className="text-slate-200">
                    {handshakeResult ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            handshakeResult.status === 'OK'
                              ? 'bg-emerald-400'
                              : handshakeResult.status === 'WAITING_TWS_DESKTOP_POPUP'
                              ? 'bg-amber-400 animate-ping'
                              : 'bg-rose-400'
                          }`}
                        />
                        <span className="font-bold text-white">
                          {handshakeResult.status}
                        </span>
                      </span>
                    ) : (
                      'In attesa di esecuzione'
                    )}
                  </span>
                </div>
                {handshakeResult && (
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Target verificato:</span>
                      <span className="text-slate-200 font-mono">
                        {handshakeResult.targetHost || (pingTarget === 'LOCAL' ? '127.0.0.1' : ibkrState.host)}:
                        {handshakeResult.targetPort || (pingTarget === 'LOCAL' ? 7497 : ibkrState.port)}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans text-xs pt-1">
                      {handshakeResult.diagnostic}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick direct ping buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTestingHandshake}
                  onClick={() => handleTestHandshake('127.0.0.1', 7497)}
                  className="flex-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                >
                  <span>⚡ Testa Ping Diretto verso 127.0.0.1:7497</span>
                </button>
                <button
                  type="button"
                  disabled={isTestingHandshake}
                  onClick={() => handleTestHandshake(ibkrState.host, ibkrState.port)}
                  className="flex-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 transition-colors"
                >
                  <span>⚡ Testa Ping su Tunnel ngrok</span>
                </button>
              </div>
            </div>

            {/* Why order is not visible guide */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-amber-400" />
                <span>Guida Connessione & Diagnostica TWS Desktop</span>
              </h4>

              {/* Point 0: 127.0.0.1 vs Cloud */}
              <div className="p-3 bg-slate-950 border border-blue-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center">
                      ℹ️
                    </span>
                    <span className="text-xs font-bold text-white">
                      Perché il Ping verso TWS non parte da 127.0.0.1? (Cloud vs Locale)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 border border-blue-500/40 text-blue-300">
                    Architettura di Rete
                  </span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed pl-7 space-y-2">
                  <p>
                    <strong className="text-white">1. Ambiente Cloud (Anteprima Web):</strong> I comandi e i socket TCP partono dal server di backend Node.js. Nell'anteprima web in esecuzione su Google Cloud, <code className="text-blue-300 font-mono">127.0.0.1</code> fa riferimento al container Cloud stesso (dove TWS non è installato), dando porta chiusa (<code className="text-amber-300 font-mono">ECONNREFUSED</code>).
                  </p>
                  <p>
                    <strong className="text-white">2. Ruolo del Tunnel ngrok:</strong> Quando imposti il tunnel <code className="text-emerald-300 font-mono">ngrok tcp 7497</code>, il server Cloud manda i pacchetti a <code className="text-emerald-300 font-mono">{ibkrState.host}:{ibkrState.port}</code>. Sul tuo PC di casa, il client ngrok locale li riceve e li trasmette <strong className="text-emerald-300">localmente a 127.0.0.1:7497</strong>. Quindi per TWS Desktop la connessione finale arriva esattamente da 127.0.0.1!
                  </p>
                  <p>
                    <strong className="text-white">3. Esecuzione 100% Locale:</strong> Se scarichi il codice ed avvii il progetto sul tuo PC con <code className="text-white bg-slate-900 px-1 py-0.5 rounded font-mono">npm run dev</code>, sia il backend che TWS saranno sulla tua stessa macchina: a quel punto il ping e gli ordini partiranno al 100% da <code className="text-blue-300 font-mono">127.0.0.1</code> direttamente senza bisogno di tunnel.
                  </p>
                </div>
              </div>

              {/* Point 1: Orders Tab Filter */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <span className="text-xs font-bold text-white">
                      Filtro Scheda Ordini in TWS Desktop (Causa Principale #1)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                    Verifica Subito
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-7">
                  Nel terminale TWS Desktop (sia Classic TWS che Mosaic), la scheda <strong className="text-white">"Ordini" (Orders / Activity)</strong> ha un filtro a tendina in alto. Di default TWS mostra spesso solo gli <em className="text-amber-300">"Ordini Manuali"</em> inseriti direttamente con il mouse dal terminale.
                </p>
                <div className="ml-7 p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-200 space-y-1">
                  <div>
                    👉 <strong>In Classic TWS:</strong> Clicca sulla scheda <em>Ordini</em> e seleziona il menu a discesa impostandolo su <strong className="text-emerald-400">"Tutti gli ordini" (All Orders)</strong> oppure clicca sulla sotto-scheda <strong className="text-emerald-400">"API"</strong>.
                  </div>
                  <div>
                    👉 <strong>In Mosaic TWS:</strong> Nella finestra <em>Monitor Attività (Activity)</em>, seleziona <strong>"Tutti"</strong> (All) anziché "Sessione corrente manuale".
                  </div>
                </div>
              </div>

              {/* Point 2: Desktop Authorization Popup */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <span className="text-xs font-bold text-white">
                      Finestra di Autorizzazione Desktop TWS ("Accept incoming connection?")
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-500/40 text-amber-300">
                    Popup TWS
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-7">
                  Quando un client API invia dati per la prima volta, TWS apre una finestra modale sul monitor del computer:
                  <span className="block my-1 font-mono text-[11px] text-amber-300 bg-black/40 p-1.5 rounded">
                    "Accept incoming connection from 127.0.0.1?" [Yes] [No]
                  </span>
                  Se non si clicca <strong>"Sì"</strong> su TWS, Interactive Brokers congela il socket in attesa e l'ordine non entra a mercato!
                </p>
                <div className="ml-7 p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                  💡 <strong>Come risolvere definitivamente:</strong> In TWS vai in <em>File &gt; Configurazione Globale &gt; API &gt; Impostazioni</em>. Nella casella <strong>"Indirizzi IP attendibili"</strong> (Trusted IP Addresses) clicca <em>Crea</em> e inserisci <code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded">127.0.0.1</code>. TWS non chiederà mai più conferme!
                </div>
              </div>

              {/* Point 3: Bypass Order Precautions */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-bold text-white">
                    Bypass Precauzioni Ordini API (Bypass Order Precautions)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-7">
                  In TWS <em>Configurazione Globale &gt; API &gt; Precauzioni</em>: assicurati di spuntare la casella <strong className="text-white">"Bypassare le precauzioni per gli ordini API"</strong> (Bypass Order Precautions for API Orders). Altrimenti TWS blocca gli ordini combo con spread chiedendo una conferma manuale sul terminale.
                </p>
              </div>

              {/* Point 4: Port & Mode */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <span className="text-xs font-bold text-white">
                    Corrispondenza Porta (Paper: 7497 vs Live: 7496)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-7">
                  Se TWS è avviato in modalità <strong>Paper Trading</strong> (banner giallo e conto <code className="text-amber-300">DU...</code>), la porta di default è <strong>7497</strong>. Se hai avviato ngrok con un'altra porta, il tunnel non inoltrerà i dati a TWS.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Order History */}
        {activeTab === 'HISTORY' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Ordini Trasmessi verso TWS nella Sessione</span>
              <button
                onClick={fetchOrders}
                className="flex items-center gap-1 text-slate-300 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span>Aggiorna</span>
              </button>
            </div>

            {orderHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Nessun ordine inviato in questa sessione.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {orderHistory.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">
                          #{ord.orderId}
                        </span>
                        <span className="font-semibold text-emerald-400">
                          {ord.strategyName}
                        </span>
                        <span className="font-mono text-slate-300 font-bold">
                          {ord.symbol}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          ord.status === 'SUBMITTED'
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                            : ord.status === 'WAITING_TWS_POPUP'
                            ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                            : ord.status === 'PRESUBMITTED'
                            ? 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                            : ord.status === 'CANCELLED'
                            ? 'bg-slate-900 border-slate-800 text-slate-400'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {ord.status === 'WAITING_TWS_POPUP' ? 'ATTESA POPUP TWS' : ord.status}
                      </span>
                    </div>

                    <p className="font-mono text-slate-300 truncate text-[11px]">
                      {ord.legsSummary}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <span>
                        {ord.orderType} @ {ord.limitPrice > 0 ? `$${ord.limitPrice.toFixed(2)}` : 'MKT'} • {ord.timeInForce}
                      </span>
                      <span>{new Date(ord.submittedAt).toLocaleTimeString()}</span>
                    </div>

                    {ord.message && (
                      <p className="text-[11px] text-slate-400 bg-slate-900/60 p-1.5 rounded">
                        {ord.message}
                      </p>
                    )}

                    {ord.status !== 'CANCELLED' && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(ord.orderId, ord.id)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Annulla Ordine</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Interactive Brokers TWS Socket API Client ID: {ibkrState.clientId || 1}</span>
          <span className="font-mono">{ibkrState.host}:{ibkrState.port}</span>
        </div>
      </div>
    </div>
  );
};
