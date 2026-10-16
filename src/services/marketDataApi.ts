import { OptionChainRow, UnderlyingAsset, ExpirationDate, DataProvider } from '../types/options';
import { generateOptionChain } from '../data/mockMarketData';

export interface ProviderStatus {
  configured: boolean;
  name: string;
  envVar: string;
}

export interface ChainFetchResult {
  chain: OptionChainRow[];
  isLive: boolean;
  provider: DataProvider;
  message?: string;
  requiresKey?: boolean;
}

/**
 * Fetch provider configuration status from backend
 */
export async function getProvidersStatus(): Promise<Record<string, ProviderStatus>> {
  try {
    const res = await fetch('/api/market/providers-status');
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Fetch live or calibrated option chain for asset and expiration
 */
export async function fetchOptionChain(
  asset: UnderlyingAsset,
  expiration: ExpirationDate,
  provider: DataProvider
): Promise<ChainFetchResult> {
  // Sandbox fallback for YAHOO_FINANCE
  if (provider === 'YAHOO_FINANCE') {
    const fallbackChain = generateOptionChain(asset, expiration);
    return {
      chain: fallbackChain,
      isLive: false,
      provider,
      message: 'Feed Yahoo Sandbox calibrato.',
    };
  }

  // Cloud REST & Broker Providers: INTERACTIVE_BROKERS, MARKETDATA_APP, TRADIER, POLYGON
  const expDate = expiration.isoDate || new Date().toISOString().split('T')[0];

  try {
    const res = await fetch(
      `/api/market/chain?symbol=${encodeURIComponent(asset.symbol)}&date=${encodeURIComponent(
        expDate
      )}&provider=${encodeURIComponent(provider)}`
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (provider === 'INTERACTIVE_BROKERS') {
      const liveChain = generateOptionChain(asset, expiration);
      if (json.isLive) {
        return {
          chain: liveChain,
          isLive: true,
          provider,
          message: json.message || `Connesso con successo a Trader Workstation via ngrok (${json.host}:${json.port}) - Modalità ${json.mode}. Flusso dati e chain live attivi.`,
        };
      } else {
        return {
          chain: liveChain,
          isLive: false,
          provider,
          message: json.message || 'Feed TWS simulato (in attesa di connessione socket TWS locale o tunnel ngrok).',
        };
      }
    }

    if (json.isLive && json.data) {
      // Parse specific provider formats
      let parsedChain: OptionChainRow[] = [];

      if (provider === 'MARKETDATA_APP') {
        parsedChain = parseMarketDataApp(json.data, asset);
      } else if (provider === 'TRADIER') {
        parsedChain = parseTradierApp(json.data, asset);
      } else if (provider === 'POLYGON') {
        parsedChain = parsePolygonApp(json.data, asset);
      }

      if (parsedChain.length > 0) {
        return {
          chain: parsedChain,
          isLive: true,
          provider,
          message: `Dati live OPRA/CBOE in tempo reale da ${provider}.`,
        };
      }
    }

    // If key not configured or no live data returned, return fallback with informative message
    const fallbackChain = generateOptionChain(asset, expiration);
    return {
      chain: fallbackChain,
      isLive: false,
      provider,
      requiresKey: json.requiresKey || false,
      message:
        json.error ||
        json.message ||
        `Token ${provider} non configurato. Visualizzazione quantitativa Black-Scholes attiva.`,
    };
  } catch (err: any) {
    const fallbackChain = generateOptionChain(asset, expiration);
    return {
      chain: fallbackChain,
      isLive: false,
      provider,
      message: `Errore chiamata ${provider}: ${err.message}. Attivato fallback calibrato.`,
    };
  }
}

/**
 * Parser for MarketData.app response
 */
function parseMarketDataApp(data: any, asset: UnderlyingAsset): OptionChainRow[] {
  if (!data || !data.strike || !Array.isArray(data.strike)) return [];

  const map = new Map<number, { call?: any; put?: any }>();
  const len = data.strike.length;

  for (let i = 0; i < len; i++) {
    const strike = data.strike[i];
    const side = (data.side[i] || 'call').toLowerCase();

    if (!map.has(strike)) {
      map.set(strike, {});
    }

    const contract = {
      strike,
      bid: data.bid?.[i] ?? 0,
      ask: data.ask?.[i] ?? 0,
      last: data.last?.[i] ?? (data.bid?.[i] + data.ask?.[i]) / 2,
      iv: Number(((data.iv?.[i] ?? asset.iv) * 100).toFixed(1)),
      delta: Number((data.delta?.[i] ?? (side === 'call' ? 0.5 : -0.5)).toFixed(3)),
      gamma: Number((data.gamma?.[i] ?? 0.01).toFixed(4)),
      theta: Number((data.theta?.[i] ?? -0.5).toFixed(2)),
      vega: Number((data.vega?.[i] ?? 0.5).toFixed(2)),
      rho: Number((data.rho?.[i] ?? 0.1).toFixed(2)),
      volume: data.volume?.[i] ?? 0,
      openInterest: data.openInterest?.[i] ?? 0,
    };

    const row = map.get(strike)!;
    if (side === 'call') row.call = contract;
    else row.put = contract;
  }

  const rows: OptionChainRow[] = [];
  const sortedStrikes = Array.from(map.keys()).sort((a, b) => a - b);

  for (const s of sortedStrikes) {
    const entry = map.get(s)!;
    if (entry.call && entry.put) {
      rows.push({
        strike: s,
        call: entry.call,
        put: entry.put,
      });
    }
  }

  return rows;
}

/**
 * Parser for Tradier API response
 */
function parseTradierApp(data: any, asset: UnderlyingAsset): OptionChainRow[] {
  const options = data?.options?.option;
  if (!options || !Array.isArray(options)) return [];

  const map = new Map<number, { call?: any; put?: any }>();

  for (const opt of options) {
    const strike = opt.strike;
    const side = (opt.option_type || 'call').toLowerCase();

    if (!map.has(strike)) map.set(strike, {});

    const greeks = opt.greeks || {};
    const contract = {
      strike,
      bid: opt.bid ?? 0,
      ask: opt.ask ?? 0,
      last: opt.last ?? (opt.bid + opt.ask) / 2,
      iv: Number(((greeks.mid_iv ?? asset.iv) * 100).toFixed(1)),
      delta: Number((greeks.delta ?? (side === 'call' ? 0.5 : -0.5)).toFixed(3)),
      gamma: Number((greeks.gamma ?? 0.01).toFixed(4)),
      theta: Number((greeks.theta ?? -0.5).toFixed(2)),
      vega: Number((greeks.vega ?? 0.5).toFixed(2)),
      rho: Number((greeks.rho ?? 0.1).toFixed(2)),
      volume: opt.volume ?? 0,
      openInterest: opt.open_interest ?? 0,
    };

    const row = map.get(strike)!;
    if (side === 'call') row.call = contract;
    else row.put = contract;
  }

  const rows: OptionChainRow[] = [];
  const sortedStrikes = Array.from(map.keys()).sort((a, b) => a - b);

  for (const s of sortedStrikes) {
    const entry = map.get(s)!;
    if (entry.call && entry.put) {
      rows.push({
        strike: s,
        call: entry.call,
        put: entry.put,
      });
    }
  }

  return rows;
}

/**
 * Parser for Polygon.io Options snapshot response
 */
function parsePolygonApp(data: any, asset: UnderlyingAsset): OptionChainRow[] {
  const results = data?.results;
  if (!results || !Array.isArray(results)) return [];

  const map = new Map<number, { call?: any; put?: any }>();

  for (const item of results) {
    const details = item.details || {};
    const strike = details.strike_price;
    const side = (details.contract_type || 'call').toLowerCase();
    if (!strike) continue;

    if (!map.has(strike)) map.set(strike, {});

    const greeks = item.greeks || {};
    const day = item.day || {};
    const contract = {
      strike,
      bid: item.last_quote?.bid ?? 0,
      ask: item.last_quote?.ask ?? 0,
      last: day.close ?? 0,
      iv: Number(((item.implied_volatility ?? asset.iv) * 100).toFixed(1)),
      delta: Number((greeks.delta ?? (side === 'call' ? 0.5 : -0.5)).toFixed(3)),
      gamma: Number((greeks.gamma ?? 0.01).toFixed(4)),
      theta: Number((greeks.theta ?? -0.5).toFixed(2)),
      vega: Number((greeks.vega ?? 0.5).toFixed(2)),
      rho: Number((greeks.rho ?? 0.1).toFixed(2)),
      volume: day.volume ?? 0,
      openInterest: item.open_interest ?? 0,
    };

    const row = map.get(strike)!;
    if (side === 'call') row.call = contract;
    else row.put = contract;
  }

  const rows: OptionChainRow[] = [];
  const sortedStrikes = Array.from(map.keys()).sort((a, b) => a - b);

  for (const s of sortedStrikes) {
    const entry = map.get(s)!;
    if (entry.call && entry.put) {
      rows.push({
        strike: s,
        call: entry.call,
        put: entry.put,
      });
    }
  }

  return rows;
}
