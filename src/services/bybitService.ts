import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OptionChainRow, OptionContract, BybitConfig, BybitOrderRecord, BybitOrderLeg } from '../types/options';

const BYBIT_CONFIG_FILE = path.resolve(process.cwd(), 'bybit-config.json');
const BYBIT_ORDERS_FILE = path.resolve(process.cwd(), 'bybit-orders.json');

export function loadBybitConfig(): BybitConfig {
  try {
    if (fs.existsSync(BYBIT_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(BYBIT_CONFIG_FILE, 'utf-8'));
      if (data && typeof data === 'object') {
        return {
          connected: data.connected ?? true,
          environment: data.environment || 'TESTNET',
          apiKey: data.apiKey || '',
          apiSecret: data.apiSecret || '',
          accountType: data.accountType || 'UNIFIED',
          currency: data.currency || 'BTC',
          settlementCoin: data.settlementCoin || 'USDT',
          lastChecked: data.lastChecked || new Date().toISOString(),
          message: data.message || 'Connesso a Bybit V5 API (Market Data Live & Testnet Trading).',
        };
      }
    }
  } catch (e) {
    console.warn('Errore lettura bybit-config.json:', e);
  }
  return {
    connected: true, // Live public market data works directly without credentials
    environment: 'TESTNET',
    apiKey: '',
    apiSecret: '',
    accountType: 'UNIFIED',
    currency: 'BTC',
    settlementCoin: 'USDT',
    lastChecked: new Date().toISOString(),
    message: 'Feed Bybit V5 API attivo (Market Data Live & Testnet Trading).',
  };
}

export function saveBybitConfig(config: BybitConfig): void {
  try {
    fs.writeFileSync(BYBIT_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Errore salvataggio bybit-config.json:', e);
  }
}

export function loadBybitOrders(): BybitOrderRecord[] {
  try {
    if (fs.existsSync(BYBIT_ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(BYBIT_ORDERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Errore lettura bybit-orders.json:', e);
  }
  return [];
}

export function saveBybitOrders(orders: BybitOrderRecord[]): void {
  try {
    fs.writeFileSync(BYBIT_ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Errore salvataggio bybit-orders.json:', e);
  }
}

export function getBybitBaseUrl(env: 'TESTNET' | 'MAINNET' = 'TESTNET'): string {
  return env === 'MAINNET' ? 'https://api.bybit.com' : 'https://api-testnet.bybit.com';
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

export function bybitDateToIso(bybitDate: string): string | null {
  const match = bybitDate.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const monthStr = match[2];
  const year = '20' + match[3];
  const month = MONTH_MAP[monthStr] || '01';
  return `${year}-${month}-${day}`;
}

export function isoToBybitDate(iso: string): string | null {
  const parts = iso.split('-');
  if (parts.length < 3) return null;
  const year = parts[0].slice(2);
  const monthNum = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (monthNum < 0 || monthNum > 11) return null;
  return `${day}${MONTH_NAMES[monthNum]}${year}`;
}

/**
 * Generates Bybit V5 HMAC-SHA256 signature
 */
export function generateBybitSignature(
  timestamp: string,
  apiKey: string,
  recvWindow: string,
  queryStringOrBody: string,
  apiSecret: string
): string {
  const raw = timestamp + apiKey + recvWindow + queryStringOrBody;
  return crypto.createHmac('sha256', apiSecret).update(raw).digest('hex');
}

/**
 * Fetch current live spot price and 24h ticker info from Bybit V5 Spot
 */
export async function fetchBybitSpotPrice(currency: string = 'BTC'): Promise<{
  spotPrice: number;
  change24h: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}> {
  const symbol = `${currency.toUpperCase()}USDT`;
  const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'OptionLab/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Bybit spot API HTTP ${response.status}`);
  }

  const json: any = await response.json();
  if (json.retCode !== 0 || !json.result?.list?.length) {
    throw new Error(`Bybit spot error: ${json.retMsg || 'Simbolo non trovato'}`);
  }

  const item = json.result.list[0];
  const spotPrice = parseFloat(item.lastPrice) || 0;
  const prevPrice = parseFloat(item.prevPrice24h) || spotPrice;
  const change24h = spotPrice - prevPrice;
  const change24hPercent = (parseFloat(item.price24hPcnt) || 0) * 100;
  const high24h = parseFloat(item.highPrice24h) || spotPrice;
  const low24h = parseFloat(item.lowPrice24h) || spotPrice;
  const volume24h = parseFloat(item.volume24h) || 0;

  return {
    spotPrice,
    change24h,
    change24hPercent,
    high24h,
    low24h,
    volume24h,
  };
}

/**
 * Fetch all available active option expirations for a given currency on Bybit
 */
export async function fetchBybitExpirations(currency: string = 'BTC'): Promise<Array<{
  bybitDate: string;
  isoDate: string;
  label: string;
  daysToExpiry: number;
  is0DTE: boolean;
}>> {
  const url = `https://api.bybit.com/v5/market/tickers?category=option&baseCoin=${currency.toUpperCase()}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'OptionLab/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Bybit option tickers HTTP ${response.status}`);
  }

  const json: any = await response.json();
  if (json.retCode !== 0 || !json.result?.list) {
    throw new Error(`Bybit options error: ${json.retMsg || 'Nessun contratto'}`);
  }

  const dateSet = new Set<string>();
  for (const item of json.result.list) {
    // Symbol format: BTC-26OCT26-80750-C-USDT
    const parts = (item.symbol || '').split('-');
    if (parts.length >= 2 && parts[1]) {
      dateSet.add(parts[1]);
    }
  }

  const now = new Date();
  const results: Array<{
    bybitDate: string;
    isoDate: string;
    label: string;
    daysToExpiry: number;
    is0DTE: boolean;
  }> = [];

  for (const bDate of dateSet) {
    const iso = bybitDateToIso(bDate);
    if (!iso) continue;

    const expiryTime = new Date(`${iso}T08:00:00Z`); // Bybit options expire at 08:00 UTC
    const diffMs = expiryTime.getTime() - now.getTime();
    const days = Math.max(0.05, Number((diffMs / (1000 * 60 * 60 * 24)).toFixed(2)));
    const is0DTE = days <= 1.0;

    let label = `${bDate}`;
    if (is0DTE) {
      label += ' (0DTE)';
    } else {
      label += ` (${Math.round(days)}d)`;
    }

    results.push({
      bybitDate: bDate,
      isoDate: iso,
      label,
      daysToExpiry: days,
      is0DTE,
    });
  }

  // Sort chronologically
  results.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  return results;
}

/**
 * Fetch live Bybit V5 Option Chain for a currency and specific expiration date
 */
export async function fetchBybitOptionChain(
  currency: 'BTC' | 'ETH' | 'SOL' = 'BTC',
  requestedDate?: string
): Promise<{
  isLive: boolean;
  provider: string;
  chain: OptionChainRow[];
  spotPrice: number;
  underlyingPrice: number;
  indexPrice: number;
  expirationUsed: string;
  totalContracts: number;
  settlementType: string;
}> {
  // 1. Fetch all options tickers for this baseCoin
  const url = `https://api.bybit.com/v5/market/tickers?category=option&baseCoin=${currency.toUpperCase()}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'OptionLab/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Bybit tickers HTTP ${response.status}`);
  }

  const json: any = await response.json();
  if (json.retCode !== 0 || !json.result?.list?.length) {
    throw new Error(`Bybit options: ${json.retMsg || 'Nessun dato ticker disponibile'}`);
  }

  const tickers: any[] = json.result.list;

  // 2. Identify available expirations from tickers
  const availableDates = Array.from(
    new Set(
      tickers
        .map((t) => (t.symbol || '').split('-')[1])
        .filter(Boolean)
    )
  );

  let targetDate = availableDates[0] || '';
  if (requestedDate) {
    const cleanRequested = requestedDate.toUpperCase().replace(/\s*\(.*\)/, '').trim();
    if (availableDates.includes(cleanRequested)) {
      targetDate = cleanRequested;
    } else {
      const converted = isoToBybitDate(requestedDate);
      if (converted && availableDates.includes(converted)) {
        targetDate = converted;
      } else {
        const found = availableDates.find((d) => d.includes(cleanRequested) || cleanRequested.includes(d));
        if (found) targetDate = found;
      }
    }
  }

  // Filter tickers for target expiration
  const filteredTickers = tickers.filter((t) => {
    const parts = (t.symbol || '').split('-');
    return parts.length >= 4 && parts[1] === targetDate;
  });

  // Extract reference index price from the first ticker or spot
  let refIndexPrice = 0;
  let refUnderlyingPrice = 0;
  for (const t of filteredTickers) {
    if (parseFloat(t.indexPrice) > 0) refIndexPrice = parseFloat(t.indexPrice);
    if (parseFloat(t.underlyingPrice) > 0) refUnderlyingPrice = parseFloat(t.underlyingPrice);
    if (refIndexPrice > 0) break;
  }

  if (refIndexPrice <= 0) {
    const spotInfo = await fetchBybitSpotPrice(currency).catch(() => ({ spotPrice: 80000 }));
    refIndexPrice = spotInfo.spotPrice;
  }
  if (refUnderlyingPrice <= 0) {
    refUnderlyingPrice = refIndexPrice;
  }

  // Group tickers by strike
  const strikeMap = new Map<number, { call?: any; put?: any }>();

  for (const t of filteredTickers) {
    const parts = t.symbol.split('-'); // e.g. ["BTC", "27NOV26", "80000", "C", "USDT"]
    const strike = parseFloat(parts[2]);
    const type = parts[3]; // 'C' or 'P'

    if (isNaN(strike)) continue;

    if (!strikeMap.has(strike)) {
      strikeMap.set(strike, {});
    }

    const group = strikeMap.get(strike)!;
    if (type === 'C') {
      group.call = t;
    } else if (type === 'P') {
      group.put = t;
    }
  }

  const sortedStrikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);
  const chain: OptionChainRow[] = [];

  for (const strike of sortedStrikes) {
    const { call, put } = strikeMap.get(strike)!;

    const buildContract = (raw: any, isCall: boolean): OptionContract => {
      if (!raw) {
        // Fallback default
        return {
          strike,
          bid: 0,
          ask: 0,
          last: 0,
          iv: 50,
          delta: isCall ? 0.5 : -0.5,
          gamma: 0.0001,
          theta: -10,
          vega: 20,
          rho: 0,
          volume: 0,
          openInterest: 0,
        };
      }

      // Bybit options prices are directly in USDT (USD)
      const bidUsd = parseFloat(raw.bid1Price) || 0;
      const askUsd = parseFloat(raw.ask1Price) || 0;
      const lastUsd = parseFloat(raw.lastPrice) || parseFloat(raw.markPrice) || 0;
      const markIv = (parseFloat(raw.markIv) || parseFloat(raw.bid1Iv) || 0.5) * 100;
      const delta = parseFloat(raw.delta) || (isCall ? 0.5 : -0.5);
      const gamma = parseFloat(raw.gamma) || 0;
      const theta = parseFloat(raw.theta) || 0;
      const vega = parseFloat(raw.vega) || 0;
      const volume = parseFloat(raw.volume24h) || 0;
      const openInterest = parseFloat(raw.openInterest) || 0;

      // Calculate equivalent crypto premium (e.g. price in BTC / ETH)
      const cryptoPrice = refIndexPrice > 0 ? Number((lastUsd / refIndexPrice).toFixed(6)) : 0;
      const cryptoBid = refIndexPrice > 0 ? Number((bidUsd / refIndexPrice).toFixed(6)) : 0;
      const cryptoAsk = refIndexPrice > 0 ? Number((askUsd / refIndexPrice).toFixed(6)) : 0;

      return {
        strike,
        bid: bidUsd,
        ask: askUsd,
        last: lastUsd,
        iv: Number(markIv.toFixed(1)),
        delta: Number(delta.toFixed(3)),
        gamma: Number(gamma.toFixed(5)),
        theta: Number(theta.toFixed(2)),
        vega: Number(vega.toFixed(2)),
        rho: 0,
        volume: Math.round(volume),
        openInterest: Math.round(openInterest),
        cryptoPrice,
        cryptoBid,
        cryptoAsk,
        instrumentName: raw.symbol,
      };
    };

    chain.push({
      strike,
      call: buildContract(call, true),
      put: buildContract(put, false),
    });
  }

  return {
    isLive: true,
    provider: 'BYBIT',
    chain,
    spotPrice: refIndexPrice,
    underlyingPrice: refUnderlyingPrice,
    indexPrice: refIndexPrice,
    expirationUsed: targetDate,
    totalContracts: filteredTickers.length,
    settlementType: 'USDT/USDC Cash Settled (European, 08:00 UTC)',
  };
}

/**
 * Fetches the official server timestamp from Bybit to prevent time synchronization drift
 */
export async function getBybitServerTimestamp(baseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/v5/market/time`, {
      headers: { 'User-Agent': 'OptionLab/1.0' },
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data.time) return String(data.time);
      if (data.result?.timeNano) return String(data.result.timeNano).slice(0, 13);
    }
  } catch {}
  return Date.now().toString();
}

async function queryBybitApi(
  baseUrl: string,
  apiKey: string,
  apiSecret: string
): Promise<{ ok: boolean; status: number; json: any }> {
  const timestamp = await getBybitServerTimestamp(baseUrl);
  const recvWindow = '20000';
  const queryString = '';
  const signature = generateBybitSignature(timestamp, apiKey, recvWindow, queryString, apiSecret);

  const res = await fetch(`${baseUrl}/v5/user/query-api`, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'Content-Type': 'application/json',
      'User-Agent': 'OptionLab/1.0',
    },
  });

  const json: any = await res.json();
  return { ok: res.ok, status: res.status, json };
}

/**
 * Test authentication with Bybit V5 Private API with dual-environment auto-detection
 */
export async function testBybitAuth(
  env: 'TESTNET' | 'MAINNET',
  apiKey: string,
  apiSecret: string
): Promise<{
  success: boolean;
  message: string;
  environment: string;
  detectedEnvironment?: 'TESTNET' | 'MAINNET';
  switchNeeded?: boolean;
  userProfile?: any;
  permissions?: string[];
  errorCode?: number;
  troubleshooting?: string[];
}> {
  const cleanKey = (apiKey || '').trim();
  const cleanSecret = (apiSecret || '').trim();

  if (!cleanKey || !cleanSecret) {
    return {
      success: true,
      environment: env,
      message: 'Feed dati pubblici Bybit V5 100% funzionante in tempo reale senza chiavi API. Per inserire ordini reali, inserisci API Key & Secret abilitate per Options.',
    };
  }

  const primaryBaseUrl = getBybitBaseUrl(env);
  let primaryRes: any;
  try {
    primaryRes = await queryBybitApi(primaryBaseUrl, cleanKey, cleanSecret);
  } catch (err: any) {
    return {
      success: false,
      environment: env,
      message: `Errore di connessione a Bybit V5 (${primaryBaseUrl}): ${err.message}`,
    };
  }

  const primaryJson = primaryRes.json;

  // 1. Success on selected environment
  if (primaryJson.retCode === 0 && primaryJson.result) {
    const perms = primaryJson.result.permissions
      ? Object.keys(primaryJson.result.permissions).filter((k) => primaryJson.result.permissions[k]?.length > 0)
      : ['Options', 'Spot'];
    return {
      success: true,
      environment: env,
      message: `Autenticazione Bybit V5 riuscita con successo su ${env}! UID: ${primaryJson.result.userID || 'N/A'}, Tipo: ${primaryJson.result.vipLevel || 'Standard'}.`,
      userProfile: {
        userID: primaryJson.result.userID,
        vipLevel: primaryJson.result.vipLevel,
        readOnly: primaryJson.result.readOnly,
      },
      permissions: perms,
    };
  }

  // 2. If primary gave 10003 ("API key is invalid"), probe the other environment automatically!
  if (primaryJson.retCode === 10003) {
    const altEnv: 'TESTNET' | 'MAINNET' = env === 'TESTNET' ? 'MAINNET' : 'TESTNET';
    const altBaseUrl = getBybitBaseUrl(altEnv);

    try {
      const altRes = await queryBybitApi(altBaseUrl, cleanKey, cleanSecret);
      if (altRes.json.retCode === 0 && altRes.json.result) {
        const perms = altRes.json.result.permissions
          ? Object.keys(altRes.json.result.permissions).filter((k) => altRes.json.result.permissions[k]?.length > 0)
          : ['Options', 'Spot'];
        return {
          success: true,
          environment: altEnv,
          detectedEnvironment: altEnv,
          switchNeeded: true,
          message: `Chiave Bybit verificata con successo su ${altEnv}! La tua chiave è stata creata su Bybit ${altEnv} (su ${env} restituiva 10003). Ambiente aggiornato automaticamente a ${altEnv}.`,
          userProfile: {
            userID: altRes.json.result.userID,
            vipLevel: altRes.json.result.vipLevel,
            readOnly: altRes.json.result.readOnly,
          },
          permissions: perms,
        };
      }
    } catch {}

    // If both failed with 10003:
    return {
      success: false,
      environment: env,
      errorCode: 10003,
      message: `Errore Bybit (10003): API key is invalid. La chiave non è stata riconosciuta dai server Bybit (${env}).`,
      troubleshooting: [
        `Ambiente Corretto: Le chiavi create su bybit.com (Mainnet) non funzionano su Testnet e viceversa. Seleziona l'ambiente corrispondente.`,
        `Restrizione IP: Su Bybit (API Management), se l'app gira in Cloud remoto, seleziona l'opzione "No IP restriction" (Senza restrizioni IP - validità 90 giorni). Se hai impostato 'Solo IP specificati' (Bind IP), Bybit rifiuterà le connessioni.`,
        `Tipo di Chiave: Assicurati di aver generato una "System-generated API Key" (HMAC-SHA256) e non "Self-generated" (RSA/Ed25519).`,
        `Permessi: Spunta i permessi "Contract & Options Trade" per poter operare in opzioni.`,
        `Nessuno Spazio Bianco: Assicurati di non aver incollato spazi all'inizio o alla fine di API Key o Secret.`
      ],
    };
  }

  // 3. Other Bybit errors (e.g. 10002 timestamp, 10004 signature)
  return {
    success: false,
    environment: env,
    errorCode: primaryJson.retCode,
    message: `Errore Bybit (${primaryJson.retCode}): ${primaryJson.retMsg || 'Chiavi API o firma non valide'}`,
  };
}

/**
 * Submit or simulate an option order on Bybit V5
 */
export async function submitBybitOrder(
  env: 'TESTNET' | 'MAINNET',
  apiKey: string,
  apiSecret: string,
  orderData: {
    symbol?: string;
    currency?: 'BTC' | 'ETH' | 'SOL';
    strategyName?: string;
    orderType?: 'Limit' | 'Market';
    price?: number;
    qty?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PostOnly';
    side?: 'Buy' | 'Sell';
    postOnly?: boolean;
    legs?: BybitOrderLeg[];
  }
): Promise<BybitOrderRecord> {
  const currency = orderData.currency || 'BTC';
  const assignedId = `bybit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orderLinkId = `optlab_${Date.now().toString().slice(-8)}`;

  const symbol = orderData.symbol || (orderData.legs?.[0]?.symbol) || `${currency}-27NOV26-80000-C-USDT`;
  const side = orderData.side || (orderData.legs?.[0]?.action === 'SELL' ? 'Sell' : 'Buy');
  const qty = orderData.qty || orderData.legs?.[0]?.quantity || 1;
  const price = Number(orderData.price || orderData.legs?.[0]?.premiumUsd || 100);
  const timeInForce = orderData.timeInForce || (orderData.postOnly ? 'PostOnly' : 'GTC');
  const orderType = orderData.orderType || 'Limit';

  const cleanKey = (apiKey || '').trim();
  const cleanSecret = (apiSecret || '').trim();

  // If valid credentials provided, attempt real execution
  if (cleanKey && cleanSecret) {
    const baseUrl = getBybitBaseUrl(env);
    const endpoint = '/v5/order/create';
    const timestamp = await getBybitServerTimestamp(baseUrl);
    const recvWindow = '20000';

    const reqBody = {
      category: 'option',
      symbol,
      side,
      orderType,
      qty: String(qty),
      price: orderType === 'Limit' ? String(price) : undefined,
      timeInForce,
      orderLinkId,
    };

    const bodyStr = JSON.stringify(reqBody);
    const signature = generateBybitSignature(timestamp, cleanKey, recvWindow, bodyStr, cleanSecret);

    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'X-BAPI-API-KEY': cleanKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'Content-Type': 'application/json',
          'User-Agent': 'OptionLab/1.0',
        },
        body: bodyStr,
      });

      const json: any = await res.json();
      if (json.retCode === 0 && json.result?.orderId) {
        const record: BybitOrderRecord = {
          id: assignedId,
          orderId: json.result.orderId,
          orderLinkId,
          symbol,
          currency,
          strategyName: orderData.strategyName || 'Opzione Singola Bybit',
          orderType,
          price,
          qty,
          timeInForce,
          status: 'New',
          legsCount: orderData.legs?.length || 1,
          legsSummary: orderData.legs
            ? orderData.legs.map((l) => `${l.action} ${l.quantity}x ${l.symbol || `${l.strike} ${l.type}`} @ $${l.premiumUsd}`).join(' | ')
            : `${side} ${qty}x ${symbol} @ $${price}`,
          submittedAt: new Date().toISOString(),
          environment: env,
          message: `Ordine Bybit V5 #${json.result.orderId} inviato con successo a ${env}!`,
          rawResponse: json,
        };

        const existing = loadBybitOrders();
        existing.unshift(record);
        saveBybitOrders(existing);
        return record;
      } else {
        const errRecord: BybitOrderRecord = {
          id: assignedId,
          orderId: orderLinkId,
          symbol,
          currency,
          strategyName: orderData.strategyName || 'Opzione Bybit',
          orderType,
          price,
          qty,
          timeInForce,
          status: 'Rejected',
          legsCount: 1,
          legsSummary: `${side} ${qty}x ${symbol}`,
          submittedAt: new Date().toISOString(),
          environment: env,
          message: `Rifiutato da Bybit (${json.retCode}): ${json.retMsg || 'Errore ordine'}`,
          rawResponse: json,
        };
        const existing = loadBybitOrders();
        existing.unshift(errRecord);
        saveBybitOrders(existing);
        return errRecord;
      }
    } catch (err: any) {
      console.warn('Errore chiamata Bybit createOrder:', err);
    }
  }

  // Simulated execution (Sandbox / Paper)
  const simOrderId = `BYBIT-SIM-${Math.floor(100000 + Math.random() * 900000)}`;
  const simRecord: BybitOrderRecord = {
    id: assignedId,
    orderId: simOrderId,
    orderLinkId,
    symbol,
    currency,
    strategyName: orderData.strategyName || 'Strategia Opzioni Bybit (Simulata)',
    orderType,
    price,
    qty,
    timeInForce,
    status: 'Simulated',
    legsCount: orderData.legs?.length || 1,
    legsSummary: orderData.legs
      ? orderData.legs.map((l) => `${l.action} ${l.quantity}x ${l.symbol || `${l.strike} ${l.type}`} @ $${l.premiumUsd}`).join(' | ')
      : `${side} ${qty}x ${symbol} @ $${price}`,
    submittedAt: new Date().toISOString(),
    environment: env,
    message: `Ordine simulato #${simOrderId} registrato in Bybit Sandbox (${env}).`,
  };

  const existing = loadBybitOrders();
  existing.unshift(simRecord);
  saveBybitOrders(existing);
  return simRecord;
}
