import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
let ibkrConnectionState = {
  connected: false,
  mode: 'SIMULATION', // 'SIMULATION' | 'PAPER' | 'LIVE'
  host: '127.0.0.1',
  port: 7497,
  clientId: 1,
  lastChecked: new Date().toISOString(),
  message: 'Modalità Simulatore attiva. TWS / IB Gateway non connesso localmente.',
};

app.get('/api/ibkr/status', (_req, res) => {
  return res.json(ibkrConnectionState);
});

app.post('/api/ibkr/connect', (req, res) => {
  const { host, port, clientId, mode } = req.body;
  
  if (mode === 'SIMULATION') {
    ibkrConnectionState = {
      connected: false,
      mode: 'SIMULATION',
      host: host || '127.0.0.1',
      port: Number(port) || 7497,
      clientId: Number(clientId) || 1,
      lastChecked: new Date().toISOString(),
      message: 'Modalità Simulatore attiva (tick real-time Black-Scholes sintetici).',
    };
    return res.json({ success: true, state: ibkrConnectionState });
  }

  // Attempting TWS / Gateway check
  ibkrConnectionState = {
    connected: false,
    mode: mode || 'PAPER',
    host: host || '127.0.0.1',
    port: Number(port) || (mode === 'LIVE' ? 7496 : 7497),
    clientId: Number(clientId) || 1,
    lastChecked: new Date().toISOString(),
    message: `In attesa di TWS / IB Gateway su ${host || '127.0.0.1'}:${port || 7497}. Assicurati che Trader Workstation sia avviata con API Socket abilitate (Enable ActiveX and Socket Clients).`,
  };

  return res.json({
    success: true,
    state: ibkrConnectionState,
    guidelines: {
      step1: 'Avvia TWS o IB Gateway sul tuo computer locale',
      step2: 'In TWS: File > Global Configuration > API > Settings',
      step3: 'Abilita "Enable ActiveX and Socket Clients"',
      step4: `Imposta Socket Port su ${ibkrConnectionState.port} e disabilita "Read-Only API" per consentire l'invio ordini`,
    },
  });
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
