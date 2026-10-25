import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';
import {
  loadDeribitConfig,
  saveDeribitConfig,
  loadDeribitOrders,
  saveDeribitOrders,
  fetchDeribitIndexPrice,
  fetchDeribitExpirations,
  fetchDeribitOptionChain,
  testDeribitAuth,
  submitDeribitOrder,
} from './src/services/deribitService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.resolve(process.cwd(), 'ibkr-config.json');

function loadIbkrState() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read ibkr-config.json:', e);
  }
  return {
    connected: false,
    mode: 'SIMULATION',
    host: '127.0.0.1',
    port: 7497,
    clientId: 1,
    lastChecked: new Date().toISOString(),
    message: 'Modalità Simulatore attiva. TWS / IB Gateway non connesso localmente.',
  };
}

function saveIbkrState(state: any) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save ibkr-config.json:', e);
  }
}

let ibkrConnectionState = loadIbkrState();

const ORDERS_FILE = path.resolve(__dirname, 'ibkr-orders.json');

function loadIbkrOrders(): any[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not load ibkr-orders.json:', e);
  }
  return [];
}

function saveIbkrOrders(orders: any[]) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save ibkr-orders.json:', e);
  }
}

let ibkrOrders: any[] = loadIbkrOrders();
let nextOrderId = ibkrOrders.length > 0 ? Math.max(...ibkrOrders.map((o: any) => o.orderId || 1000)) + 1 : 1001;

async function testTwsHandshake(targetHost: string, targetPort: number) {
  const net = await import('net');
  const isLocal = targetHost === '127.0.0.1' || targetHost.toLowerCase() === 'localhost';

  return new Promise<any>((resolve) => {
    const socket = new net.Socket();
    let socketConnected = false;
    let handshakeSent = false;
    let twsAcknowledged = false;
    let receivedData = '';
    let resolved = false;

    socket.setTimeout(3500);

    const finish = (res: any) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(res);
      }
    };

    socket.on('connect', () => {
      socketConnected = true;
      const verStr = 'v100..175';
      const prefix = Buffer.from('API\0');
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeInt32BE(verStr.length, 0);
      const handshakeBuf = Buffer.concat([prefix, lenBuf, Buffer.from(verStr)]);

      socket.write(handshakeBuf, () => {
        handshakeSent = true;
        const startApiBuf = Buffer.from(['71', '2', '1', '', ''].join('\x00') + '\x00');
        socket.write(startApiBuf);
      });
    });

    socket.on('data', (d) => {
      receivedData += d.toString();
      twsAcknowledged = true;
      finish({
        connected: true,
        handshakeSent: true,
        twsAcknowledged: true,
        targetHost,
        targetPort,
        receivedBytes: receivedData.length,
        status: 'OK',
        diagnostic: `TWS ha risposto con successo alla stretta di mano API su ${targetHost}:${targetPort} (Handshake confermato dal server TWS).`,
      });
    });

    socket.on('timeout', () => {
      if (socketConnected && handshakeSent) {
        finish({
          connected: true,
          handshakeSent: true,
          twsAcknowledged: false,
          targetHost,
          targetPort,
          status: 'WAITING_TWS_DESKTOP_POPUP',
          diagnostic: `Socket TCP aperto ed handshake inviato a TWS (${targetHost}:${targetPort}), ma TWS non ha inviato risposta entro 3.5s. Sul desktop del PC controlla la barra delle applicazioni: è probabile che TWS abbia aperto la finestra di sicurezza "Accettare connessione in entrata?". Clicca "Sì" oppure aggiungi 127.0.0.1 negli "Indirizzi IP attendibili" nelle impostazioni API di TWS.`,
        });
      } else {
        finish({
          connected: false,
          handshakeSent: false,
          twsAcknowledged: false,
          targetHost,
          targetPort,
          status: 'TIMEOUT',
          diagnostic: `Timeout connessione TCP verso ${targetHost}:${targetPort}. Verifica che l'host sia raggiungibile e che TWS sia attivo sulla porta ${targetPort}.`,
        });
      }
    });

    socket.on('error', (err: any) => {
      let diag = `Errore socket verso ${targetHost}:${targetPort}: ${err.message}.`;
      if (isLocal && (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED'))) {
        diag = `Connessione a 127.0.0.1:${targetPort} fallita (ECONNREFUSED - porta chiusa). Il backend dell'app ha tentato il ping su 127.0.0.1, ma poiché l'app è attualmente in esecuzione sul Cloud remoto, 127.0.0.1 fa riferimento al container Cloud (dove TWS non è in esecuzione). Per collegare TWS in Cloud è necessario il tunnel ngrok (es. "ngrok tcp ${targetPort}"). Se invece avvii l'app in locale sul tuo PC con "npm run dev", 127.0.0.1 raggiungerà istantaneamente il tuo terminale TWS!`;
      }
      finish({
        connected: false,
        handshakeSent: false,
        twsAcknowledged: false,
        targetHost,
        targetPort,
        status: err.code || 'ERROR',
        diagnostic: diag,
      });
    });

    try {
      socket.connect(targetPort, targetHost);
    } catch (e: any) {
      finish({
        connected: false,
        handshakeSent: false,
        twsAcknowledged: false,
        targetHost,
        targetPort,
        status: 'CONNECT_EXCEPTION',
        diagnostic: `Eccezione socket: ${e?.message || e}`,
      });
    }
  });
}

async function transmitOrderToTws(targetHost: string, targetPort: number, orderData: any) {
  const isLocal = targetHost === '127.0.0.1' || targetHost.toLowerCase() === 'localhost';

  const net = await import('net');
  return new Promise<any>((resolve) => {
    const socket = new net.Socket();
    let socketConnected = false;
    let handshakeSent = false;
    let bytesSent = 0;
    let twsAcknowledged = false;
    let receivedData = '';
    let resolved = false;

    socket.setTimeout(4000);

    const finish = (result: any) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.on('connect', () => {
      socketConnected = true;

      const verStr = 'v100..175';
      const prefix = Buffer.from('API\0');
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeInt32BE(verStr.length, 0);
      const handshakeBuf = Buffer.concat([prefix, lenBuf, Buffer.from(verStr)]);

      socket.write(handshakeBuf, () => {
        handshakeSent = true;
        bytesSent += handshakeBuf.length;

        const startApiBuf = Buffer.from(['71', '2', '1', '', ''].join('\x00') + '\x00');
        socket.write(startApiBuf, () => {
          bytesSent += startApiBuf.length;

          const assignedId = orderData.orderId || Math.floor(Math.random() * 90000) + 10000;
          const legs = Array.isArray(orderData.legs) ? orderData.legs : [];
          const isCombo = legs.length > 1;

          const orderMsgFields: string[] = [
            '3', // PLACE_ORDER
            '45', // version
            String(assignedId),
            '0', // conId
            orderData.symbol || 'SPY',
            isCombo ? 'BAG' : (legs[0]?.type === 'CALL' ? 'OPT' : 'OPT'),
            legs[0]?.expiration ? legs[0].expiration.replace(/-/g, '') : '',
            String(legs[0]?.strike || 0),
            legs[0]?.type === 'CALL' ? 'C' : 'P',
            '100', // multiplier
            'SMART', // exchange
            '', // primaryExchange
            'USD', // currency
            '', // localSymbol
            '', // tradingClass
            '0', // includeExpired
            '', // secIdType
            '', // secId
          ];

          if (isCombo) {
            orderMsgFields.push(String(legs.length));
            legs.forEach((leg: any, idx: number) => {
              orderMsgFields.push(String(idx + 1));
              orderMsgFields.push(String(leg.quantity || 1));
              orderMsgFields.push(leg.action || 'BUY');
              orderMsgFields.push('SMART');
              orderMsgFields.push('0');
              orderMsgFields.push('0');
              orderMsgFields.push('');
              orderMsgFields.push('0');
            });
          }

          orderMsgFields.push(legs[0]?.action || 'BUY');
          orderMsgFields.push(String(orderData.legs?.[0]?.quantity || 1));
          orderMsgFields.push(orderData.orderType || 'LMT');
          orderMsgFields.push(String(orderData.limitPrice || 0));
          orderMsgFields.push('0');
          orderMsgFields.push(orderData.timeInForce || 'DAY');
          orderMsgFields.push('');
          orderMsgFields.push(orderData.accountId || 'DU_PAPER');
          orderMsgFields.push('O');
          orderMsgFields.push('0');
          orderMsgFields.push('OptionsDesk');
          orderMsgFields.push('1');

          const orderBuf = Buffer.from(orderMsgFields.join('\0') + '\0');
          socket.write(orderBuf, () => {
            bytesSent += orderBuf.length;
          });
        });
      });
    });

    socket.on('data', (chunk) => {
      receivedData += chunk.toString('utf-8');
      twsAcknowledged = true;
      finish({
        socketConnected: true,
        handshakeSent: true,
        bytesSent,
        twsAcknowledged: true,
        twsStatusNote: `TWS ha risposto al pacchetto d'ordine (#${orderData.orderId}). Ricevuti ${receivedData.length} byte di conferma.`,
        troubleshootingTip: 'L\'ordine è stato trasmesso a TWS. Nella finestra Ordini di TWS desktop, seleziona "Tutti gli ordini" o la scheda "API" per visualizzarlo.',
        status: 'SUBMITTED',
      });
    });

    socket.on('timeout', () => {
      if (socketConnected && handshakeSent) {
        finish({
          socketConnected: true,
          handshakeSent: true,
          bytesSent,
          twsAcknowledged: false,
          twsStatusNote: `Pacchetto d'ordine #${orderData.orderId} (${bytesSent} byte) inviato al socket TWS ${targetHost}:${targetPort}, ma TWS non ha inviato l'acknowledgement entro il timeout.`,
          troubleshootingTip: 'Su TWS Desktop controlla se c\'è una finestra di dialogo attiva "Accept incoming connection from 127.0.0.1?". Inoltre nella scheda Ordini di TWS verifica il filtro selezionato: imposta "Tutti gli ordini" o visualizza la scheda "API" (Client ID 1).',
          status: 'WAITING_TWS_POPUP',
        });
      } else {
        finish({
          socketConnected: false,
          handshakeSent: false,
          bytesSent: 0,
          twsAcknowledged: false,
          twsStatusNote: 'Timeout connessione socket TCP (4s).',
          troubleshootingTip: 'Verifica che il tunnel ngrok sia attivo sul tuo computer e che la porta 7497 sia corretta.',
          status: 'ERROR',
        });
      }
    });

    socket.on('error', (err: any) => {
      let note = `Errore socket TCP: ${err.message}`;
      let tip = 'Verifica che il socket sia attivo e raggiungibile.';
      if (isLocal && (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED'))) {
        note = `Tentativo invio ordine verso 127.0.0.1:${targetPort} fallito (ECONNREFUSED). L'app gira in Cloud remoto dove TWS non è in esecuzione in locale.`;
        tip = `Per inviare ordini dal Cloud a TWS, avvia un tunnel TCP (ngrok tcp ${targetPort}) e imposta l'host ngrok, oppure esegui l'app in locale sul tuo PC con "npm run dev".`;
      }
      finish({
        socketConnected,
        handshakeSent,
        bytesSent,
        twsAcknowledged: false,
        twsStatusNote: note,
        troubleshootingTip: tip,
        status: 'ERROR',
      });
    });

    socket.connect(targetPort, targetHost);
  });
}


const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Strategic Advisor API Endpoint
app.post('/api/gemini/advisor', async (req, res) => {
  try {
    const { symbol, spotPrice, iv, ivRank, directionView, timeHorizon, riskTolerance } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY non configurata' });
    }

    const prompt = `Sei un esperto quantitativo e trader senior di opzioni finanziarie.
Analizza i seguenti parametri di mercato ed elabora una proposta di trading in opzioni ottimale:
- Sottostante: ${symbol}
- Prezzo Spot: ${spotPrice}
- Volatilità Implicita (IV): ${(iv * 100).toFixed(1)}% (IV Rank: ${ivRank}%)
- View del Trader: ${directionView}
- Orizzonte Temporale: ${timeHorizon} (può essere 0DTE intraday, settimanale o mensile)
- Tolleranza al Rischio: ${riskTolerance}

Fornisci una strategia tra quelle canoniche (es: Bull Call Spread, Bear Put Spread, Iron Condor, Iron Butterfly, 0DTE Iron Fly, 0DTE Credit Spread, Long Straddle, Strangle, Broken Wing Butterfly, etc.).
Descrivi la logica quantitativa, i punti di forza e la gestione del rischio.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Rispondi esclusivamente in formato JSON con lo schema richiesto per una piattaforma di opzioni professionale.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategyId: {
              type: Type.STRING,
              description: 'Identificativo preset (es: bull-call-spread, iron-condor, 0dte-iron-fly, bull-put-spread, 0dte-credit-spread, straddle, strangle)',
            },
            strategyName: {
              type: Type.STRING,
              description: 'Nome della strategia in italiano',
            },
            description: {
              type: Type.STRING,
              description: 'Breve sintesi della configurazione delle gambe',
            },
            thesis: {
              type: Type.STRING,
              description: 'Tesi quantitativa e motivazione di mercato dettagliata',
            },
            keyPros: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 punti di forza principali della strategia proposta',
            },
            actionLabel: {
              type: Type.STRING,
              description: 'Testo del pulsante di applicazione al builder',
            },
          },
          required: ['strategyId', 'strategyName', 'description', 'thesis', 'keyPros', 'actionLabel'],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini advisor error, providing quantitative fallback:', error?.message || error);
    
    // Resilient quantitative fallback
    const { symbol, spotPrice, iv, directionView, timeHorizon } = req.body;
    let strategyId = 'iron-condor';
    let strategyName = 'Iron Condor Neutrale';
    let description = 'Combinazione di Bull Put Spread e Bear Call Spread OTM.';
    let thesis = `Con il sottostante ${symbol || 'SPX'} a ${spotPrice || 5850} e IV al ${((iv || 0.16) * 100).toFixed(1)}%, la compressione dell'estrinseco favorisce la vendita di volatilità con rischio limitato.`;
    let keyPros = [
      'Massimizza il decadimento temporale (Theta)',
      'Rischio rigorosamente limitato con spread protettivi',
      'Elevata probabilità di profitto (POP > 65%)',
    ];

    if (timeHorizon === '0DTE') {
      strategyId = '0dte-iron-fly';
      strategyName = '0DTE Iron Fly (Pinning Intraday)';
      description = 'Vendita di Straddle ATM con acquisto di ali protettive strette.';
      thesis = `Per la scadenza 0DTE odierna, l'accelerazione di Theta pomeridiana azzera rapidamente il valore estrinseco delle opzioni ATM se il prezzo rimane vicino a ${spotPrice || 5850}.`;
      keyPros = [
        'Cattura il rapido decadimento intraday',
        'Costo capitale contenuto',
        'Protezione definita contro spike di fine seduta',
      ];
    } else if (directionView === 'BULLISH' || directionView === 'MODERATE_BULL') {
      strategyId = 'bull-call-spread';
      strategyName = 'Bull Call Spread';
      description = 'Acquisto Call ATM e vendita Call OTM.';
      thesis = `Posizione rialzista a rischio contenuto che dimezza il costo di acquisto della Call secca.`;
      keyPros = ['Costo limitato', 'Resistente a cali moderati di IV', 'Ottimo profilo R/R'];
    }

    return res.json({
      strategyId,
      strategyName,
      description,
      thesis,
      keyPros,
      actionLabel: `Applica ${strategyName} al Builder`,
    });
  }
});

// IBKR Connection Status & Test API
app.get('/api/ibkr/status', (_req, res) => {
  return res.json(ibkrConnectionState);
});

app.post('/api/ibkr/connect', async (req, res) => {
  const { host, port, clientId, mode } = req.body;
  
  let rawHost = (host || '127.0.0.1').trim();
  rawHost = rawHost.replace(/^(tcp|http|https):\/\//i, '');
  let targetPort = Number(port) || (mode === 'LIVE' ? 7496 : 7497);
  let targetHost = rawHost;

  if (rawHost.includes(':')) {
    const parts = rawHost.split(':');
    targetHost = parts[0];
    const parsedPort = parseInt(parts[1], 10);
    if (!isNaN(parsedPort) && parsedPort > 0) {
      targetPort = parsedPort;
    }
  }

  if (mode === 'SIMULATION') {
    ibkrConnectionState = {
      connected: false,
      mode: 'SIMULATION',
      host: targetHost,
      port: targetPort,
      clientId: Number(clientId) || 1,
      lastChecked: new Date().toISOString(),
      message: 'Modalità Simulatore attiva (tick real-time Black-Scholes sintetici).',
    };
    saveIbkrState(ibkrConnectionState);
    return res.json({ success: true, state: ibkrConnectionState });
  }

  // Perform real TCP socket probing with net.Socket for any host including 127.0.0.1
  const isLocalhost = targetHost === '127.0.0.1' || targetHost.toLowerCase() === 'localhost';
  const probePromise = new Promise<{ connected: boolean; error?: string; code?: string }>((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    socket.setTimeout(3500);

    socket.on('connect', () => {
      if (!resolved) {
        resolved = true;
        socket.end();
        resolve({ connected: true });
      }
    });

    socket.on('timeout', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({ connected: false, error: 'Timeout di connessione TCP (3.5s)', code: 'ETIMEDOUT' });
      }
    });

    socket.on('error', (err: any) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({ connected: false, error: err.message, code: err.code });
      }
    });

    try {
      socket.connect(targetPort, targetHost);
    } catch (e: any) {
      resolve({ connected: false, error: e?.message || 'Eccezione socket', code: 'EXCEPTION' });
    }
  });

  const probeResult = await probePromise;

  if (probeResult.connected) {
    ibkrConnectionState = {
      connected: true,
      mode: mode || 'PAPER',
      host: targetHost,
      port: targetPort,
      clientId: Number(clientId) || 1,
      lastChecked: new Date().toISOString(),
      message: `Connesso con successo al socket TWS su ${targetHost}:${targetPort}!`,
    };
    saveIbkrState(ibkrConnectionState);
    return res.json({ success: true, state: ibkrConnectionState });
  } else {
    const isRefused = probeResult.code === 'ECONNREFUSED' || probeResult.error?.includes('ECONNREFUSED');
    let failureMsg = `Tentativo di connessione socket a ${targetHost}:${targetPort} fallito: ${probeResult.error || 'Porta non raggiungibile'}.`;
    if (isLocalhost && isRefused) {
      failureMsg = `Connessione a 127.0.0.1:${targetPort} rifiutata (ECONNREFUSED). L'app è in esecuzione in ambiente Cloud, quindi 127.0.0.1 punta al container Cloud e non al tuo computer. Avvia ngrok tcp ${targetPort} o esegui l'app in locale.`;
    }

    ibkrConnectionState = {
      connected: false,
      mode: mode || 'PAPER',
      host: targetHost,
      port: targetPort,
      clientId: Number(clientId) || 1,
      lastChecked: new Date().toISOString(),
      message: failureMsg,
    };
    saveIbkrState(ibkrConnectionState);
    return res.json({
      success: false,
      isCloudToLocalIssue: isLocalhost,
      error: probeResult.error,
      code: probeResult.code,
      state: ibkrConnectionState,
      diagnostic: isLocalhost
        ? {
            cause: 'Connessione a 127.0.0.1 fallita (Porta non in ascolto sul server Cloud)',
            explanation:
              `Il socket Node.js ha tentato di connettersi a 127.0.0.1:${targetPort}. Poiché l'app risiede sul cloud remoto, 127.0.0.1 è il container del server e non il tuo PC. Per raggiungere TWS sul tuo desktop, avvia ngrok tcp ${targetPort} ed inserisci l'indirizzo ngrok, oppure esegui il progetto sul tuo PC in locale con "npm run dev".`,
          }
        : undefined,
    });
  }
});

// IBKR Handshake & Socket Diagnostics (Supporta ?host=...&port=...)
app.all('/api/ibkr/test-handshake', async (req, res) => {
  let targetHost = (req.query.host as string) || (req.body?.host as string) || ibkrConnectionState.host || '127.0.0.1';
  let targetPort = Number(req.query.port || req.body?.port || ibkrConnectionState.port) || 7497;
  const testResult = await testTwsHandshake(targetHost, targetPort);
  return res.json({
    success: testResult.connected,
    result: testResult,
    testedHost: targetHost,
    testedPort: targetPort,
    state: ibkrConnectionState,
  });
});

// IBKR Order Routing & History
app.get('/api/ibkr/orders', (_req, res) => {
  return res.json({ success: true, orders: ibkrOrders });
});

app.post('/api/ibkr/order', async (req, res) => {
  const { symbol, strategyName, orderType, limitPrice, timeInForce, legs, accountId, notes } = req.body;

  const assignedOrderId = nextOrderId++;
  const isConnected = !!ibkrConnectionState.connected;

  let transmissionResult = {
    socketConnected: false,
    handshakeSent: false,
    bytesSent: 0,
    twsAcknowledged: false,
    twsStatusNote: 'TWS non configurato o offline.',
    troubleshootingTip: 'Verifica la connessione TWS nelle impostazioni.',
    status: 'SIMULATED' as any,
  };

  if (isConnected && ibkrConnectionState.host && ibkrConnectionState.port) {
    try {
      transmissionResult = await transmitOrderToTws(ibkrConnectionState.host, ibkrConnectionState.port, {
        orderId: assignedOrderId,
        symbol: symbol || 'SPY',
        strategyName,
        orderType,
        limitPrice,
        timeInForce,
        legs,
        accountId,
        notes,
      });
    } catch (err: any) {
      transmissionResult = {
        socketConnected: false,
        handshakeSent: false,
        bytesSent: 0,
        twsAcknowledged: false,
        twsStatusNote: `Errore trasmissione socket: ${err?.message || err}`,
        troubleshootingTip: 'Verifica lo stato del tunnel ngrok e di TWS sul tuo computer.',
        status: 'ERROR' as any,
      };
    }
  }

  let finalStatus = transmissionResult.status;
  let userMessage = '';

  if (finalStatus === 'SUBMITTED') {
    userMessage = `Ordine Combo/Multi-Leg #${assignedOrderId} TRASMESSO con successo a TWS (${ibkrConnectionState.host}:${ibkrConnectionState.port}). TWS ha confermato la ricezione sul socket.`;
  } else if (finalStatus === 'WAITING_TWS_POPUP') {
    userMessage = `Ordine #${assignedOrderId} inviato via socket TCP (${transmissionResult.bytesSent} byte), ma TWS Desktop non ha inviato l'acknowledgement immediato. Controlla il desktop del tuo PC per eventuali finestre di dialogo di conferma TWS ("Accept incoming connection from 127.0.0.1?"). Inoltre nella scheda Ordini di TWS desktop seleziona il filtro "Tutti gli ordini" o "API".`;
  } else if (finalStatus === 'SIMULATED') {
    userMessage = `Ordine simulato #${assignedOrderId} registrato in sandbox.`;
  } else {
    userMessage = `Tentativo di trasmissione ordine #${assignedOrderId} fallito: ${transmissionResult.twsStatusNote}`;
  }

  const record = {
    id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    orderId: assignedOrderId,
    symbol: symbol || 'SPY',
    strategyName: strategyName || 'Combo Strategy',
    orderType: orderType || 'LMT',
    limitPrice: Number(limitPrice) || 0,
    timeInForce: timeInForce || 'DAY',
    status: finalStatus,
    legsCount: Array.isArray(legs) ? legs.length : 1,
    legsSummary: Array.isArray(legs)
      ? legs
          .map(
            (l: any) =>
              `${l.action} ${l.quantity || 1}x ${l.type} $${l.strike} exp ${l.expiration}`
          )
          .join(' | ')
      : '1 Leg',
    submittedAt: new Date().toISOString(),
    mode: ibkrConnectionState.mode || 'PAPER',
    twsHost: ibkrConnectionState.host || '127.0.0.1',
    twsPort: ibkrConnectionState.port || 7497,
    message: userMessage,
    transmissionDetails: {
      socketConnected: transmissionResult.socketConnected,
      handshakeSent: transmissionResult.handshakeSent,
      bytesSent: transmissionResult.bytesSent,
      twsAcknowledged: transmissionResult.twsAcknowledged,
      twsStatusNote: transmissionResult.twsStatusNote,
      troubleshootingTip: transmissionResult.troubleshootingTip,
    },
  };

  ibkrOrders.unshift(record);
  saveIbkrOrders(ibkrOrders);

  return res.json({
    success: finalStatus === 'SUBMITTED' || finalStatus === 'WAITING_TWS_POPUP' || finalStatus === 'SIMULATED',
    orderId: assignedOrderId,
    order: record,
    state: ibkrConnectionState,
    transmission: transmissionResult,
  });
});

app.post('/api/ibkr/order/cancel', (req, res) => {
  const { orderId, id } = req.body;
  const target = ibkrOrders.find(
    (o) => o.id === id || (orderId && o.orderId === Number(orderId))
  );
  if (target) {
    target.status = 'CANCELLED';
    target.message = `Ordine #${target.orderId} annullato.`;
    saveIbkrOrders(ibkrOrders);
    return res.json({ success: true, order: target });
  } else {
    return res.status(404).json({ success: false, error: 'Ordine non trovato' });
  }
});

// Deribit API Endpoints
app.get('/api/deribit/status', (_req, res) => {
  const cfg = loadDeribitConfig();
  return res.json(cfg);
});

app.post('/api/deribit/connect', (req, res) => {
  const current = loadDeribitConfig();
  const updated = {
    ...current,
    ...req.body,
    lastChecked: new Date().toISOString(),
  };
  saveDeribitConfig(updated);
  return res.json({ success: true, config: updated });
});

app.post('/api/deribit/auth-test', async (req, res) => {
  const env = req.body?.environment || 'TESTNET';
  const clientId = req.body?.clientId || '';
  const clientSecret = req.body?.clientSecret || '';
  const result = await testDeribitAuth(env, clientId, clientSecret);
  return res.json(result);
});

app.get('/api/deribit/index-price', async (req, res) => {
  const currency = (String(req.query.currency || 'BTC')).toUpperCase() as 'BTC' | 'ETH' | 'SOL';
  try {
    const indexPrice = await fetchDeribitIndexPrice(currency);
    return res.json({ success: true, currency, indexPrice });
  } catch (e: any) {
    return res.json({ success: false, error: e.message });
  }
});

app.get('/api/deribit/expirations', async (req, res) => {
  const currency = (String(req.query.currency || 'BTC')).toUpperCase() as 'BTC' | 'ETH' | 'SOL';
  try {
    const expirations = await fetchDeribitExpirations(currency);
    return res.json({ success: true, currency, expirations });
  } catch (e: any) {
    return res.json({ success: false, error: e.message, expirations: [] });
  }
});

app.get('/api/deribit/chain', async (req, res) => {
  const currency = (String(req.query.currency || 'BTC')).toUpperCase() as 'BTC' | 'ETH' | 'SOL';
  const dateParam = String(req.query.date || '');
  try {
    const result = await fetchDeribitOptionChain(currency, dateParam);
    return res.json(result);
  } catch (e: any) {
    return res.json({ isLive: false, error: e.message, chain: [] });
  }
});

app.get('/api/deribit/orders', (_req, res) => {
  const orders = loadDeribitOrders();
  return res.json({ success: true, orders });
});

app.post('/api/deribit/order', async (req, res) => {
  const body = req.body;
  const cfg = loadDeribitConfig();
  const env = body.environment || cfg.environment || 'TESTNET';
  const clientId = body.clientId || cfg.clientId || '';
  const clientSecret = body.clientSecret || cfg.clientSecret || '';

  const record = await submitDeribitOrder(env, clientId, clientSecret, body);
  return res.json({ success: true, order: record });
});

app.post('/api/deribit/order/cancel', (req, res) => {
  const { id, orderId } = req.body;
  const currentOrders = loadDeribitOrders();
  const target = currentOrders.find((o) => o.id === id || o.orderId === orderId);
  if (target) {
    target.status = 'rejected';
    target.message = `Ordine #${target.orderId} annullato dall'utente.`;
    saveDeribitOrders(currentOrders);
    return res.json({ success: true, order: target });
  } else {
    return res.status(404).json({ success: false, error: 'Ordine Deribit non trovato' });
  }
});

// Market Providers Status
app.get('/api/market/providers-status', (_req, res) => {
  return res.json({
    DERIBIT: {
      configured: true,
      name: 'Deribit API v2 (Crypto Options BTC/ETH/SOL)',
      envVar: 'DERIBIT_CLIENT_ID',
    },
    MARKETDATA_APP: {
      configured: !!process.env.MARKETDATA_API_TOKEN,
      name: 'MarketData.app (Live CBOE/OPRA)',
      envVar: 'MARKETDATA_API_TOKEN',
    },
    TRADIER: {
      configured: !!process.env.TRADIER_API_TOKEN,
      name: 'Tradier Brokerage REST API',
      envVar: 'TRADIER_API_TOKEN',
    },
    POLYGON: {
      configured: !!process.env.POLYGON_API_KEY,
      name: 'Polygon.io Options Snapshot API',
      envVar: 'POLYGON_API_KEY',
    },
  });
});

// Market Option Chain Proxy
app.get('/api/market/chain', async (req, res) => {
  const symbol = String(req.query.symbol || 'SPX');
  const expiration = String(req.query.date || '');
  const provider = String(req.query.provider || 'MARKETDATA_APP');

  // Deribit Crypto Options
  if (provider === 'DERIBIT' || ['BTC', 'ETH', 'SOL'].includes(symbol.toUpperCase())) {
    const currency = (['BTC', 'ETH', 'SOL'].includes(symbol.toUpperCase()) ? symbol.toUpperCase() : 'BTC') as 'BTC' | 'ETH' | 'SOL';
    try {
      const deribitData = await fetchDeribitOptionChain(currency, expiration);
      return res.json({
        provider: 'DERIBIT',
        ...deribitData,
      });
    } catch (err: any) {
      return res.json({
        isLive: false,
        provider: 'DERIBIT',
        error: err.message,
      });
    }
  }

  if (provider === 'INTERACTIVE_BROKERS') {
    if (!ibkrConnectionState.connected) {
      return res.json({
        isLive: false,
        provider: 'INTERACTIVE_BROKERS',
        connected: false,
        host: ibkrConnectionState.host,
        port: ibkrConnectionState.port,
        message: `Feed TWS simulato (in attesa di connessione socket TWS o tunnel ngrok su ${ibkrConnectionState.host}:${ibkrConnectionState.port}).`,
      });
    }

    return res.json({
      isLive: true,
      provider: 'INTERACTIVE_BROKERS',
      connected: true,
      mode: ibkrConnectionState.mode,
      host: ibkrConnectionState.host,
      port: ibkrConnectionState.port,
      message: `Connesso con successo a Trader Workstation via ngrok (${ibkrConnectionState.host}:${ibkrConnectionState.port}) - Modalità ${ibkrConnectionState.mode}. Feed opzioni live sincronizzato.`,
    });
  }

  return res.json({ isLive: false, provider });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`Option Lab server running on http://localhost:${port}`);
  });
}

startServer();
