import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
  Terminal,
  Radio,
} from 'lucide-react';

interface IbkrConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

export const IbkrConfigModal: React.FC<IbkrConfigModalProps> = ({ isOpen, onClose, onStatusChange }) => {
  const [mode, setMode] = useState<'SIMULATION' | 'PAPER' | 'LIVE'>('SIMULATION');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(7497);
  const [clientId, setClientId] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Modalità Simulazione attiva (Feed dati sintetico Black-Scholes calibrato su CBOE/OPRA).'
  );
  const [isTesting, setIsTesting] = useState(false);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/ibkr/status')
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setMode(data.mode || 'SIMULATION');
            setHost(data.host || '127.0.0.1');
            setPort(data.port || 7497);
            setClientId(data.clientId || 1);
            setStatusMessage(data.message || '');
            setIsConnected(!!data.connected);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleHostChange = (val: string) => {
    let cleanVal = val.trim();
    // Auto-strip tcp:// or https://
    cleanVal = cleanVal.replace(/^(tcp|http|https):\/\//i, '');
    if (cleanVal.includes(':')) {
      const parts = cleanVal.split(':');
      setHost(parts[0]);
      const parsedPort = parseInt(parts[1], 10);
      if (!isNaN(parsedPort) && parsedPort > 0) {
        setPort(parsedPort);
      }
    } else {
      setHost(cleanVal);
    }
  };

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    setDiagnostic(null);
    try {
      const res = await fetch('/api/ibkr/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, clientId, mode }),
      });
      const data = await res.json();
      if (data.state) {
        setStatusMessage(data.state.message);
        setIsConnected(!!data.state.connected);
      }
      if (data.diagnostic) {
        setDiagnostic(data.diagnostic);
      }
      if (onStatusChange) {
        onStatusChange();
      }
    } catch {
      setStatusMessage('Errore di comunicazione con il backend.');
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Stato Connessione Interactive Brokers (TWS)
              </h3>
              <p className="text-[11px] text-slate-400">
                Diagnostica e Configurazione Socket Broker
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Current Status Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Stato Attuale:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  mode === 'SIMULATION'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                    : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                }`}
              >
                {mode === 'SIMULATION' ? 'Simulatore Attivo' : `Verifica TWS (${mode})`}
              </span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">{statusMessage}</p>
          </div>

          {/* Mode Switcher */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold">Modalità Operativa:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('SIMULATION');
                  setPort(7497);
                  setDiagnostic(null);
                }}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  mode === 'SIMULATION'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Simulatore (Default)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('PAPER');
                  setPort(7497);
                }}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  mode === 'PAPER'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                TWS Paper (7497)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('LIVE');
                  setPort(7496);
                }}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  mode === 'LIVE'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                TWS Reale (7496)
              </button>
            </div>
          </div>

          {/* Active Connection Success Banner */}
          {isConnected && mode !== 'SIMULATION' && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Socket Trader Workstation Connesso via ngrok!</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                La connessione con <span className="font-mono text-emerald-300 font-bold">{host}:{port}</span> ({mode}) è attiva. La Option Chain e il flusso tick in tempo reale sono ora sincronizzati con Interactive Brokers.
              </p>
            </div>
          )}

          {/* Parameters for TWS Connection */}
          {mode !== 'SIMULATION' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400 text-[10px] block mb-1">
                    Host / Indirizzo Socket (TWS o Tunnel ngrok)
                  </label>
                  <input
                    type="text"
                    value={host}
                    placeholder="es. 2.tcp.eu.ngrok.io o 127.0.0.1"
                    onChange={(e) => handleHostChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Incolla pure tcp://0.tcp.ngrok.io:12345 (porta estratta automaticamente)
                  </span>
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Porta Socket</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value) || 7497)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-center font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Client ID</label>
                <input
                  type="number"
                  value={clientId}
                  onChange={(e) => setClientId(parseInt(e.target.value) || 1)}
                  className="w-20 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-center"
                />
              </div>

              {/* TWS Config Reminder */}
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="text-slate-300 font-semibold block">Configurazione TWS necessaria per ordini e dati:</span>
                <p>1. In TWS: <span className="text-amber-300">File &gt; Global Configuration &gt; API &gt; Settings</span></p>
                <p>2. Abilita <span className="text-emerald-300">"Enable ActiveX and Socket Clients"</span></p>
                <p>3. <span className="text-amber-300 font-bold">DISABILITA</span> la spunta <span className="text-amber-300">"Allow connections from localhost only"</span></p>
                <p>4. In "Trusted IP Addresses", aggiungi <span className="text-emerald-300 font-mono">127.0.0.1</span> (evita i popup desktop bloccanti)</p>
                <p>5. In <span className="text-amber-300">API &gt; Precautions</span>: spunta <span className="text-emerald-300">"Bypass Order Precautions for API Orders"</span></p>
                <p>6. <strong className="text-white">Per vedere gli ordini in TWS:</strong> nella scheda <em>Ordini (Orders)</em> di TWS imposta il filtro su <span className="text-emerald-400 font-bold">"Tutti gli ordini" (All Orders)</span> o clicca sulla scheda <span className="text-emerald-400 font-bold">"API"</span>.</p>
              </div>
            </div>
          )}

          {/* DIAGNOSTIC CARD (Shown when 127.0.0.1 is tested from cloud) */}
          {diagnostic && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3 text-slate-300">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{diagnostic.cause}</span>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">
                {diagnostic.explanation}
              </p>

              <div className="pt-2 border-t border-amber-900/40 space-y-2.5">
                <span className="font-semibold text-amber-300 text-xs block">
                  Come collegare il tuo TWS locale:
                </span>

                {/* Option 1: Ngrok tunnel */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      Opzione 1: Tunnel TCP Ngrok (Consigliata per TWS)
                    </span>
                    <button
                      onClick={() => copyToClipboard(`ngrok tcp ${port}`, 'ngrok')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition-colors"
                    >
                      {copiedCmd === 'ngrok' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copia Comando</span>
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    1. Apri il terminale del tuo PC e digita:
                  </p>
                  <pre className="bg-slate-900 p-1.5 rounded font-mono text-[11px] text-amber-300 select-all">
                    ngrok tcp {port}
                  </pre>
                  <p className="text-slate-400 text-[11px]">
                    2. Ngrok mostrerà una riga come{' '}
                    <code className="text-emerald-300">tcp://0.tcp.ngrok.io:12345</code>. Inserisci{' '}
                    <code className="text-emerald-300">0.tcp.ngrok.io</code> nel campo Host e{' '}
                    <code className="text-emerald-300">12345</code> nel campo Porta.
                  </p>
                </div>

                {/* Option 2: Local bridge */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-white block">
                    Opzione 2: Script Bridge Node.js Incluso
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Puoi eseguire lo script bridge fornito nel repository:
                  </p>
                  <pre className="bg-slate-900 p-1.5 rounded font-mono text-[11px] text-emerald-300 select-all">
                    node ibkr-bridge.cjs
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Explanation if Simulation */}
          {mode === 'SIMULATION' && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 text-xs leading-relaxed space-y-2">
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Modalità Simulatore Attiva & Funzionante:</span>
              </p>
              <p>
                Option Lab include un motore di calcolo quantitativo Black-Scholes autonomo che riproduce fedelmente i flussi di dati dei broker con prezzi in tempo reale su SPX, SPY, QQQ, AAPL, TSLA, NVDA e scadenze 0DTE intraday.
              </p>
              <p className="text-slate-400 text-[11px]">
                Tutte le simulazioni di payoff, greche, heatmap di scenario e analisi Monte Carlo sono pienamente attive anche senza connessione a TWS.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
          >
            Chiudi
          </button>
          <button
            onClick={handleSaveAndTest}
            disabled={isTesting}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            {isTesting && <RefreshCw className="w-3 h-3 animate-spin" />}
            <span>{isTesting ? 'Verifica Socket...' : 'Applica & Verifica'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
