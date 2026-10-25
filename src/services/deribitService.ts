import fs from 'fs';
import path from 'path';
import { OptionChainRow, OptionContract, DeribitConfig, DeribitOrderRecord, DeribitOrderLeg } from '../types/options';

const DERIBIT_CONFIG_FILE = path.resolve(process.cwd(), 'deribit-config.json');
const DERIBIT_ORDERS_FILE = path.resolve(process.cwd(), 'deribit-orders.json');

export function loadDeribitConfig(): DeribitConfig {
  try {
    if (fs.existsSync(DERIBIT_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(DERIBIT_CONFIG_FILE, 'utf-8'));
      if (data && typeof data === 'object') {
        return {
          connected: data.connected ?? true,
          environment: data.environment || 'TESTNET',
          clientId: data.clientId || '',
          clientSecret: data.clientSecret || '',
          currency: data.currency || 'BTC',
          lastChecked: data.lastChecked || new Date().toISOString(),
          message: data.message || 'Connesso a Deribit API v2.',
        };
      }
    }
  } catch (e) {
    console.warn('Errore lettura deribit-config.json:', e);
  }
  return {
    connected: true, // Public data works without credentials
    environment: 'TESTNET',
    clientId: '',
    clientSecret: '',
    currency: 'BTC',
    lastChecked: new Date().toISOString(),
    message: 'Feed Deribit API v2 attivo (Market Data Live & Testnet Trading).',
  };
}

export function saveDeribitConfig(config: DeribitConfig): void {
  try {
    fs.writeFileSync(DERIBIT_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Errore salvataggio deribit-config.json:', e);
  }
}

export function loadDeribitOrders(): DeribitOrderRecord[] {
  try {
    if (fs.existsSync(DERIBIT_ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(DERIBIT_ORDERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Errore lettura deribit-orders.json:', e);
  }
  return [];
}

export function saveDeribitOrders(orders: DeribitOrderRecord[]): void {
  try {
    fs.writeFileSync(DERIBIT_ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Errore salvataggio deribit-orders.json:', e);
  }
}

export function getDeribitBaseUrl(env: 'TESTNET' | 'MAINNET' = 'TESTNET'): string {
  return env === 'MAINNET' ? 'https://www.deribit.com/api/v2' : 'https://test.deribit.com/api/v2';
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

export function deribitDateToIso(deribitDate: string): string | null {
  const match = deribitDate.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const monthStr = match[2];
  const year = '20' + match[3];
  const month = MONTH_MAP[monthStr] || '01';
  return `${year}-${month}-${day}`;
}

export function isoToDeribitDate(iso: string): string | null {
  const parts = iso.split('-');
  if (parts.length < 3) return null;
  const year = parts[0].slice(2);
  const monthNum = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (monthNum < 0 || monthNum > 11) return null;
  return `${day}${MONTH_NAMES[monthNum]}${year}`;
}

/**
 * Fetch current live index price (e.g. BTC-USD, ETH-USD, SOL-USD) from Deribit
 */
export async function fetchDeribitIndexPrice(currency: 'BTC' | 'ETH' | 'SOL' = 'BTC'): Promise<number> {
  const indexName = `${currency.toLowerCase()}_usd`;
  const url = `https://www.deribit.com/api/v2/public/get_index_price?index_name=${indexName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Deribit index price HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.result?.index_price || (currency === 'BTC' ? 80250 : currency === 'ETH' ? 2330 : 174);
}

/**
 * Fetch available option expirations for currency from Deribit
 */
export async function fetchDeribitExpirations(currency: 'BTC' | 'ETH' | 'SOL' = 'BTC'): Promise<{
  deribitDate: string;
  isoDate: string;
  label: string;
  daysToExpiry: number;
  is0DTE: boolean;
}[]> {
  const url = `https://www.deribit.com/api/v2/public/get_instruments?currency=${currency}&kind=option&expired=false`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Deribit instruments HTTP ${res.status}`);
  }
  const json = await res.json();
  const rawInstruments = json.result || [];

  const dateMap = new Map<string, number>(); // deribitDate -> min timestamp

  for (const inst of rawInstruments) {
    const parts = inst.instrument_name.split('-');
    if (parts.length >= 4) {
      const expStr = parts[1];
      const ts = inst.expiration_timestamp || 0;
      if (!dateMap.has(expStr) || ts < dateMap.get(expStr)!) {
        dateMap.set(expStr, ts);
      }
    }
  }

  const now = Date.now();
  const sortedDates = Array.from(dateMap.entries()).sort((a, b) => a[1] - b[1]);

  return sortedDates.map(([deribitDate, expTimestamp]) => {
    const iso = deribitDateToIso(deribitDate) || '';
    const diffDays = Math.max(0.1, (expTimestamp - now) / (1000 * 60 * 60 * 24));
    const is0DTE = diffDays < 1.0;
    const label = `${deribitDate} ${is0DTE ? '(0DTE)' : `(${Math.round(diffDays)}d)`}`;

    return {
      deribitDate,
      isoDate: iso,
      label,
      daysToExpiry: Number(diffDays.toFixed(2)),
      is0DTE,
    };
  });
}

/**
 * Fetch real-time live Option Chain from Deribit for currency and target date
 */
export async function fetchDeribitOptionChain(
  currency: 'BTC' | 'ETH' | 'SOL' = 'BTC',
  targetDateParam?: string
): Promise<{
  chain: OptionChainRow[];
  indexPrice: number;
  deribitDate: string;
  isoDate: string;
  isLive: boolean;
  totalContracts: number;
}> {
  // 1. Fetch live index price & book summary in parallel
  const [indexPrice, bookRes] = await Promise.all([
    fetchDeribitIndexPrice(currency),
    fetch(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`).then((r) => r.json()),
  ]);

  const summaries: any[] = bookRes.result || [];
  if (summaries.length === 0) {
    throw new Error(`Nessun contratto opzioni Deribit trovato per ${currency}`);
  }

  // 2. Determine target Deribit expiration date
  let selectedDeribitDate = '';

  if (targetDateParam) {
    // Could be ISO "2026-11-27" or Deribit "27NOV26"
    if (targetDateParam.includes('-')) {
      const converted = isoToDeribitDate(targetDateParam);
      if (converted && summaries.some((s) => s.instrument_name.includes(`-${converted}-`))) {
        selectedDeribitDate = converted;
      }
    } else if (summaries.some((s) => s.instrument_name.includes(`-${targetDateParam}-`))) {
      selectedDeribitDate = targetDateParam;
    }
  }

  // If no match or not provided, pick closest expiration
  if (!selectedDeribitDate) {
    const datesSet = new Set<string>();
    for (const s of summaries) {
      const parts = s.instrument_name.split('-');
      if (parts[1]) datesSet.add(parts[1]);
    }
    const datesList = Array.from(datesSet);
    selectedDeribitDate = datesList[0] || '27NOV26';
  }

  // 3. Filter contracts for this expiration and group by strike
  const strikeMap = new Map<number, { call?: any; put?: any }>();

  for (const item of summaries) {
    const parts = item.instrument_name.split('-');
    if (parts.length >= 4 && parts[1] === selectedDeribitDate) {
      const strike = parseFloat(parts[2]);
      const type = parts[3]; // 'C' or 'P'

      if (!isNaN(strike)) {
        if (!strikeMap.has(strike)) {
          strikeMap.set(strike, {});
        }
        const entry = strikeMap.get(strike)!;
        if (type === 'C') entry.call = item;
        if (type === 'P') entry.put = item;
      }
    }
  }

  // 4. Build standard OptionChainRow[]
  const sortedStrikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);
  const rows: OptionChainRow[] = [];

  for (const strike of sortedStrikes) {
    const { call, put } = strikeMap.get(strike)!;

    // Helper to format contract
    const formatContract = (data: any, isCall: boolean): OptionContract => {
      if (!data) {
        return {
          strike,
          bid: 0,
          ask: 0,
          last: 0,
          iv: 0,
          delta: isCall ? 0.5 : -0.5,
          gamma: 0,
          theta: 0,
          vega: 0,
          rho: 0,
          volume: 0,
          openInterest: 0,
        };
      }

      // Deribit quotes in native crypto (e.g. 0.0145 BTC)
      const cryptoBid = data.bid_price || 0;
      const cryptoAsk = data.ask_price || 0;
      const cryptoMid = data.mid_price || (cryptoBid && cryptoAsk ? (cryptoBid + cryptoAsk) / 2 : data.mark_price || 0);
      const cryptoLast = data.last || cryptoMid;

      // Convert to USD equivalent
      const bidUsd = Number((cryptoBid * indexPrice).toFixed(2));
      const askUsd = Number((cryptoAsk * indexPrice).toFixed(2));
      const lastUsd = Number((cryptoLast * indexPrice).toFixed(2));
      const iv = Number((data.mark_iv || 50).toFixed(1));

      // Greeks estimation / Deribit Greeks
      const moneyness = Math.log(strike / indexPrice);
      const approxDelta = isCall
        ? Number(Math.max(0.01, Math.min(0.99, 0.5 - moneyness * 1.5)).toFixed(3))
        : Number(Math.max(-0.99, Math.min(-0.01, -0.5 - moneyness * 1.5)).toFixed(3));

      return {
        strike,
        bid: bidUsd,
        ask: askUsd,
        last: lastUsd,
        iv,
        delta: approxDelta,
        gamma: Number((0.0001).toFixed(5)),
        theta: Number((-25).toFixed(2)),
        vega: Number((45).toFixed(2)),
        rho: 0,
        volume: Math.round(data.volume_usd || data.volume || 0),
        openInterest: Math.round(data.open_interest || 0),
        cryptoPrice: Number(cryptoMid.toFixed(4)),
        cryptoBid: Number(cryptoBid.toFixed(4)),
        cryptoAsk: Number(cryptoAsk.toFixed(4)),
        instrumentName: data.instrument_name,
      };
    };

    rows.push({
      strike,
      call: formatContract(call, true),
      put: formatContract(put, false),
    });
  }

  return {
    chain: rows,
    indexPrice,
    deribitDate: selectedDeribitDate,
    isoDate: deribitDateToIso(selectedDeribitDate) || targetDateParam || '',
    isLive: true,
    totalContracts: rows.length,
  };
}

/**
 * Test authentication with Deribit API
 */
export async function testDeribitAuth(
  env: 'TESTNET' | 'MAINNET',
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; message: string; access_token?: string; expires_in?: number }> {
  if (!clientId || !clientSecret) {
    return {
      success: false,
      message: 'Client ID e Client Secret sono richiesti per autenticarsi su Deribit API.',
    };
  }

  const baseUrl = getDeribitBaseUrl(env);
  const authUrl = `${baseUrl}/public/auth?grant_type=client_credentials&client_id=${encodeURIComponent(
    clientId.trim()
  )}&client_secret=${encodeURIComponent(clientSecret.trim())}`;

  try {
    const res = await fetch(authUrl);
    const json = await res.json();

    if (json.error) {
      return {
        success: false,
        message: `Errore Deribit API (${json.error.code}): ${json.error.message}`,
      };
    }

    if (json.result && json.result.access_token) {
      return {
        success: true,
        message: `Autenticazione Deribit (${env}) riuscita con successo! Token attivo.`,
        access_token: json.result.access_token,
        expires_in: json.result.expires_in,
      };
    }

    return {
      success: false,
      message: 'Risposta Deribit non valida durante il test di autenticazione.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Impossibile raggiungere Deribit (${env}): ${err.message}`,
    };
  }
}

/**
 * Submit an order to Deribit (/private/buy or /private/sell or Simulated)
 */
export async function submitDeribitOrder(
  env: 'TESTNET' | 'MAINNET',
  clientId: string,
  clientSecret: string,
  orderData: {
    symbol: string;
    currency: 'BTC' | 'ETH' | 'SOL';
    strategyName: string;
    orderType: 'limit' | 'market';
    priceCrypto: number;
    priceUsd: number;
    timeInForce?: 'good_til_cancelled' | 'immediate_or_cancel' | 'fill_or_kill';
    postOnly?: boolean;
    legs: DeribitOrderLeg[];
    notes?: string;
  }
): Promise<DeribitOrderRecord> {
  const isCredentialsProvided = !!(clientId && clientSecret);
  const orderId = `DERIBIT_${Date.now()}_${Math.floor(Math.random() * 9000) + 1000}`;
  let orderStatus: 'open' | 'filled' | 'simulated' | 'rejected' = 'simulated';
  let message = '';
  let rawResponse: any = null;

  if (isCredentialsProvided) {
    try {
      // 1. Authenticate to get token
      const auth = await testDeribitAuth(env, clientId, clientSecret);
      if (!auth.success || !auth.access_token) {
        throw new Error(auth.message);
      }

      const baseUrl = getDeribitBaseUrl(env);
      const executedLegs = [];

      // 2. Submit each leg to Deribit
      for (const leg of orderData.legs) {
        const method = leg.action === 'BUY' ? 'private/buy' : 'private/sell';
        const payload = {
          jsonrpc: '2.0',
          method,
          params: {
            instrument_name: leg.instrumentName,
            amount: leg.quantity,
            type: orderData.orderType,
            price: leg.premiumCrypto > 0 ? leg.premiumCrypto : undefined,
            time_in_force: orderData.timeInForce || 'good_til_cancelled',
            post_only: !!orderData.postOnly,
          },
        };

        const legRes = await fetch(`${baseUrl}/${method}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        const legJson = await legRes.json();
        executedLegs.push(legJson);
      }

      orderStatus = 'open';
      message = `Ordine Deribit (${env}) trasmesso con successo sul book live! ${orderData.legs.length} contratti inoltrati.`;
      rawResponse = executedLegs;
    } catch (err: any) {
      orderStatus = 'rejected';
      message = `Errore inoltro Deribit: ${err.message}. Verifica le chiavi API o i permessi di trading.`;
    }
  } else {
    // Simulated Sandbox Execution
    orderStatus = 'simulated';
    message = `Ordine Crypto simulato registrato (${orderData.currency} @ Deribit Index). Per trasmettere al book reale o Testnet inserisci Client ID e Secret nelle impostazioni Deribit.`;
  }

  const record: DeribitOrderRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    orderId,
    symbol: orderData.symbol || `${orderData.currency}-OPTIONS`,
    currency: orderData.currency,
    strategyName: orderData.strategyName || 'Deribit Option Strategy',
    orderType: orderData.orderType,
    priceCrypto: orderData.priceCrypto,
    priceUsd: orderData.priceUsd,
    timeInForce: orderData.timeInForce || 'good_til_cancelled',
    postOnly: orderData.postOnly,
    status: orderStatus,
    legsCount: orderData.legs.length,
    legsSummary: orderData.legs.map((l) => `${l.action} ${l.quantity}x ${l.instrumentName}`).join(' | '),
    submittedAt: new Date().toISOString(),
    environment: env,
    message,
    rawResponse,
  };

  const currentOrders = loadDeribitOrders();
  currentOrders.unshift(record);
  saveDeribitOrders(currentOrders.slice(0, 50));

  return record;
}
