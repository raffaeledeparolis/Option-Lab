import React, { useState, useEffect } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, ShieldAlert } from 'lucide-react';

interface IbkrConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IbkrConfigModal: React.FC<IbkrConfigModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'SIMULATION' | 'PAPER' | 'LIVE'>('SIMULATION');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(7497);
  const [clientId, setClientId] = useState(1);
  const [statusMessage, setStatusMessage] = useState('Modalità Simulazione attiva (Feed dati sintetico Black-Scholes calibrato su CBOE/OPRA).');
  const [isTesting, setIsTesting] = useState(false);
  const [guidelines, setGuidelines] = useState<any>(null);

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
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/ibkr/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, clientId, mode }),
      });
      const data = await res.json();
      if (data.state) {
        setStatusMessage(data.state.message);
        setGuidelines(data.guidelines || null);
      }
    } catch {
      setStatusMessage('Errore di comunicazione con il backend.');
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Stato Connessione Interactive Brokers (TWS)</h3>
              <p className="text-[11px] text-slate-400">Configurazione API Broker & Feed di Mercato</p>
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
        <div className="p-5 space-y-4 text-xs">
          {/* Current Status Box */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Stato Attuale:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  mode === 'SIMULATION'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                    : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                }`}
              >
                {mode === 'SIMULATION' ? 'Simulatore Attivo' : `In attesa TWS (${mode})`}
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

          {/* Parameters for TWS Connection */}
          {mode !== 'SIMULATION' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400 text-[10px] block mb-1">Host / IP Gateway</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Porta Socket</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value) || 7497)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-center font-bold"
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

              {/* Instructions checklist */}
              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] font-sans text-slate-300 space-y-1">
                <div className="font-semibold text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Istruzioni per connettere TWS locale:</span>
                </div>
                <p>1. Avvia Trader Workstation o IB Gateway sul tuo PC.</p>
                <p>2. Vai su <strong>File &gt; Global Configuration &gt; API &gt; Settings</strong>.</p>
                <p>3. Seleziona <strong>Enable ActiveX and Socket Clients</strong>.</p>
                <p>4. Verifica che la porta corrisponda a <strong>{port}</strong>.</p>
              </div>
            </div>
          )}

          {/* Explanation if Simulation */}
          {mode === 'SIMULATION' && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 text-xs leading-relaxed space-y-1.5">
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Come funziona attualmente Option Lab:</span>
              </p>
              <p>
                L'applicazione è configurata con un motore quantitativo locale che replica fedelmente l'interfaccia e i flussi di dati dei broker (Interactive Brokers, Tradier, CBOE, Polygon).
              </p>
              <p className="text-slate-400 text-[11px]">
                I prezzi spot, le greche, le chain delle opzioni e la simulazione 0DTE intraday funzionano immediatamente senza necessità di autenticazione o credenziali broker aperte.
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
            <span>Applica & Verifica</span>
          </button>
        </div>
      </div>
    </div>
  );
};
