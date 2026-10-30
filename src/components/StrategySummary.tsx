import React from 'react';
import { OptionLeg, StrategyMetrics, GreeksMetrics, UnderlyingAsset } from '../types/options';
import { FileText, Compass, TrendingUp, AlertCircle, CheckCircle2, Send, Coins } from 'lucide-react';

interface StrategySummaryProps {
  legs: OptionLeg[];
  metrics: StrategyMetrics;
  greeks: GreeksMetrics;
  asset: UnderlyingAsset;
  onOpenOrderModal?: () => void;
  onOpenDeribitModal?: () => void;
  onOpenBybitModal?: () => void;
}

export const StrategySummary: React.FC<StrategySummaryProps> = ({
  legs,
  metrics,
  greeks,
  asset,
  onOpenOrderModal,
  onOpenDeribitModal,
  onOpenBybitModal,
}) => {
  if (legs.length === 0) return null;

  // Synthesize Strategy Name and Bias
  const is0DTE = legs.some((l) => l.is0DTE);
  let strategyTitle = 'Strategia Personalizzata Multi-Leg';
  let marketBias = 'Neutrale / Asimmetrica';
  let operationalAdvice = '';
  let volatilityInsight = '';

  const calls = legs.filter((l) => l.type === 'CALL');
  const puts = legs.filter((l) => l.type === 'PUT');

  if (legs.length === 1) {
    const l = legs[0];
    if (l.type === 'CALL') {
      if (l.action === 'BUY') {
        strategyTitle = is0DTE ? '0DTE Long Call (Intraday Momentum)' : 'Long Call';
        marketBias = 'Rialzista Decisa';
        operationalAdvice = `Conviene se il sottostante ${asset.symbol} accelera decisamente al rialzo oltre lo strike ${asset.currency}${l.strike}. Il rischio è rigorosamente limitato al premio pagato.`;
      } else {
        strategyTitle = 'Short Call (Naked/Covered)';
        marketBias = 'Moderatamente Ribassista / Neutrale';
        operationalAdvice = `Incassa il premio a condizione che ${asset.symbol} rimanga al di sotto dello strike ${asset.currency}${l.strike}. Attenzione al rischio illimitato in caso di forte rally rialzista.`;
      }
    } else {
      if (l.action === 'BUY') {
        strategyTitle = is0DTE ? '0DTE Long Put (Intraday Panic Hedge)' : 'Long Put';
        marketBias = 'Ribassista Decisa';
        operationalAdvice = `Conviene se il titolo subisce un rapido storno al di sotto di ${asset.currency}${l.strike}. Ottima protezione contro ribassi violenti.`;
      } else {
        strategyTitle = 'Short Put (Cash Secured / Credit)';
        marketBias = 'Rialzista Moderata / Neutrale';
        operationalAdvice = `Strategia ad alto rateo di successo se ${asset.symbol} non rompe al ribasso lo strike ${asset.currency}${l.strike}. Esposizione al rischio di assegnazione delle azioni.`;
      }
    }
  } else if (legs.length === 2) {
    if (calls.length === 2) {
      const buyCall = calls.find((c) => c.action === 'BUY');
      const sellCall = calls.find((c) => c.action === 'SELL');
      if (buyCall && sellCall) {
        if (buyCall.strike < sellCall.strike) {
          strategyTitle = 'Bull Call Spread';
          marketBias = 'Rialzista Moderata';
          operationalAdvice = `Conviene se ${asset.symbol} sale moderatamente fino allo strike venduto (${asset.currency}${sellCall.strike}) senza richiedere un'esplosione di volatilità. Abbassa il costo d'ingresso rispetto a una Call secca.`;
        } else {
          strategyTitle = 'Bear Call Spread (Credit)';
          marketBias = 'Ribassista / Neutrale ad Alta Probabilità';
          operationalAdvice = `Guadagna se ${asset.symbol} rimane al di sotto dello strike ${asset.currency}${sellCall.strike}. Rischio limitato dall'acquisto della Call ${asset.currency}${buyCall.strike}.`;
        }
      }
    } else if (puts.length === 2) {
      const buyPut = puts.find((p) => p.action === 'BUY');
      const sellPut = puts.find((p) => p.action === 'SELL');
      if (buyPut && sellPut) {
        if (buyPut.strike > sellPut.strike) {
          strategyTitle = 'Bear Put Spread';
          marketBias = 'Ribassista Moderata';
          operationalAdvice = `Conviene se ${asset.symbol} scende verso ${asset.currency}${sellPut.strike}. Taglia il costo di acquisto della Put grazie alla vendita della gamba inferiore.`;
        } else {
          strategyTitle = 'Bull Put Spread (Credit)';
          marketBias = 'Rialzista / Neutrale ad Alta Probabilità';
          operationalAdvice = `Incassa il premio netto se ${asset.symbol} si mantiene sopra lo strike ${asset.currency}${sellPut.strike}. Massima perdita limitata alla differenza tra gli strike meno il credito incassato.`;
        }
      }
    } else if (calls.length === 1 && puts.length === 1) {
      const c = calls[0];
      const p = puts[0];
      if (c.action === 'BUY' && p.action === 'BUY') {
        strategyTitle = c.strike === p.strike ? 'Long Straddle' : 'Long Strangle';
        marketBias = 'Esplosione di Volatilità (Non direzionale)';
        operationalAdvice = `Guadagna su forti movimenti improvvisi in qualsiasi direzione (sopra ${metrics.breakEvens[1] || ''} o sotto ${metrics.breakEvens[0] || ''}). Tipica per eventi macro o trimestrali.`;
      } else if (c.action === 'SELL' && p.action === 'SELL') {
        strategyTitle = c.strike === p.strike ? 'Short Straddle' : 'Short Strangle';
        marketBias = 'Neutrale / Compressione di Volatilità';
        operationalAdvice = `Incassa il massimo se il mercato dorme o comprime la volatilità fra i due strike venduti. Attenzione al rischio su code estreme.`;
      }
    }
  } else if (legs.length === 4) {
    strategyTitle = is0DTE ? '0DTE Iron Condor / Iron Butterfly' : 'Iron Condor';
    marketBias = 'Neutrale a Bassa Volatilità';
    const sortedStrikes = legs.map((l) => l.strike).sort((a, b) => a - b);
    operationalAdvice = `Guadagna se il sottostante rimane compreso fra ${asset.currency}${sortedStrikes[1]} e ${asset.currency}${sortedStrikes[2]} fino a scadenza. Massima perdita rigorosamente limitata agli strike esterni.`;
  }

  // Volatility insight
  if (greeks.vega > 5) {
    volatilityInsight = 'Posizione Long Vega: beneficia di un aumento della volatilità implicita (IV Expansion).';
  } else if (greeks.vega < -5) {
    volatilityInsight = 'Posizione Short Vega: beneficia della compressione o del crollo della volatilità implicita (IV Crush).';
  } else {
    volatilityInsight = 'Posizione neutrale rispetto alla volatilità implicita (Vega quasi nullo).';
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-800 text-xs">
        <FileText className="w-4 h-4 text-emerald-400" />
        <span className="font-bold text-white uppercase tracking-wider">
          Sintesi Strategica & Analisi di Scenario Automatica
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Col 1: Identification */}
        <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
          <div>
            <span className="text-[11px] text-slate-400">Strategia Riconosciuta:</span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{strategyTitle}</div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">View di Mercato:</span>
            <div className="font-medium text-slate-200 mt-0.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>{marketBias}</span>
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Break-Even Point(s):</span>
            <div className="font-mono text-slate-200 font-semibold mt-0.5">
              {metrics.breakEvens.length > 0
                ? metrics.breakEvens.map((b) => `${asset.currency}${b}`).join('  e  ')
                : 'Nessun punto di pareggio'}
            </div>
          </div>
        </div>

        {/* Col 2: Payoff Highlights */}
        <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-850 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Profitto Massimo:</span>
            <span className="text-emerald-400 font-bold">
              {metrics.maxProfit === null ? 'Illimitato' : `+${asset.currency}${metrics.maxProfit}`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Perdita Massima:</span>
            <span className="text-rose-400 font-bold">
              {metrics.maxLoss === null ? 'Illimitata' : `${asset.currency}${metrics.maxLoss}`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Rapporto R/R:</span>
            <span className="text-slate-200 font-bold">
              {metrics.maxProfit && metrics.maxLoss && metrics.maxLoss !== 0
                ? `1 : ${(Math.abs(metrics.maxProfit) / Math.abs(metrics.maxLoss)).toFixed(2)}`
                : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Decadimento Theta:</span>
            <span className={greeks.theta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {greeks.theta >= 0 ? '+' : ''}{asset.currency}{greeks.theta}/giorno
            </span>
          </div>
        </div>

        {/* Col 3: Practical Trading Advice */}
        <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Linee Guida Operative:
            </span>
            <p className="text-slate-300 mt-1 leading-relaxed text-[11px]">
              {operationalAdvice || `Configurazione multi-gamba attiva su ${asset.symbol}. Controlla la tenuta dei livelli di break-even e monitora il decadimento temporale.`}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>{volatilityInsight}</span>
          </div>
        </div>
      </div>

      {/* Quick Execution Toolbar */}
      {(onOpenBybitModal || onOpenDeribitModal || onOpenOrderModal) && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${asset.category === 'CRYPTO' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span>
              {asset.category === 'CRYPTO'
                ? `Pronto per l'esecuzione su Bybit V5 o Deribit (${asset.cryptoCurrency || asset.symbol} European Cash-Settled).`
                : "Pronto per l'esecuzione del trade multi-gamba su Trader Workstation (IBKR)."}
            </span>
          </div>
          {asset.category === 'CRYPTO' ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onOpenBybitModal && (
                <button
                  type="button"
                  onClick={onOpenBybitModal}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-amber-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-950/40 ring-1 ring-amber-400/40"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-200" />
                  <span>Invia a Bybit</span>
                </button>
              )}
              {onOpenDeribitModal && (
                <button
                  type="button"
                  onClick={onOpenDeribitModal}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-cyan-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/40"
                >
                  <Coins className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Invia a Deribit</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenOrderModal}
              className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40 hover:shadow-emerald-900/60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Invia Ordine {strategyTitle} a IBKR</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
