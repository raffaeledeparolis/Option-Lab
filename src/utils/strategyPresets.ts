import { StrategyPreset, LegAction, OptionType } from '../types/options';

export const STRATEGY_PRESETS: StrategyPreset[] = [
  // 1. Single Legs
  {
    id: 'long-call',
    name: 'Long Call',
    category: 'BULLISH',
    description: 'Acquisto di una Call. Profitto illimitato al rialzo con rischio limitato al premio versato.',
    outlook: 'Rialzista decisa',
    complexity: 'BASIC',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: 0, quantity: 1 }
    ]
  },
  {
    id: 'long-put',
    name: 'Long Put',
    category: 'BEARISH',
    description: 'Acquisto di una Put. Profitto elevato al ribasso con rischio limitato al premio versato.',
    outlook: 'Ribassista decisa',
    complexity: 'BASIC',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'PUT', strikeOffset: 0, quantity: 1 }
    ]
  },

  // 2. Vertical Spreads
  {
    id: 'bull-call-spread',
    name: 'Bull Call Spread',
    category: 'BULLISH',
    description: 'Compra Call ITM/ATM e vende Call OTM. Riduce il costo della posizione a fronte di un profitto massimo limitato.',
    outlook: 'Rialzista moderata',
    complexity: 'INTERMEDIATE',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: 0, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 1, quantity: 1 }
    ]
  },
  {
    id: 'bear-put-spread',
    name: 'Bear Put Spread',
    category: 'BEARISH',
    description: 'Compra Put ATM e vende Put OTM. Strategia a debito per monetizzare un calo moderato del sottostante.',
    outlook: 'Ribassista moderata',
    complexity: 'INTERMEDIATE',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'PUT', strikeOffset: 0, quantity: 1 },
      { action: 'SELL', type: 'PUT', strikeOffset: -1, quantity: 1 }
    ]
  },
  {
    id: 'bull-put-spread',
    name: 'Bull Put Spread',
    category: 'BULLISH',
    description: 'Vende Put OTM e compra Put più OTM a protezione. Incassa un credito netto; vince se il titolo non scende sotto lo strike venduto.',
    outlook: 'Rialzista / Neutrale (Credit)',
    complexity: 'INTERMEDIATE',
    legsConfig: (spot, dte, iv) => [
      { action: 'SELL', type: 'PUT', strikeOffset: -1, quantity: 1 },
      { action: 'BUY', type: 'PUT', strikeOffset: -2, quantity: 1 }
    ]
  },
  {
    id: 'bear-call-spread',
    name: 'Bear Call Spread',
    category: 'BEARISH',
    description: 'Vende Call OTM e compra Call più OTM a protezione. Incassa un credito netto; vince se il titolo non supera lo strike venduto.',
    outlook: 'Ribassista / Neutrale (Credit)',
    complexity: 'INTERMEDIATE',
    legsConfig: (spot, dte, iv) => [
      { action: 'SELL', type: 'CALL', strikeOffset: 1, quantity: 1 },
      { action: 'BUY', type: 'CALL', strikeOffset: 2, quantity: 1 }
    ]
  },

  // 3. Neutral & Income Strategies
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    category: 'NEUTRAL',
    description: 'Combinazione di un Bull Put Spread e un Bear Call Spread OTM. Massimizza il profitto se il prezzo rimane nel range fino a scadenza.',
    outlook: 'Neutrale a bassa volatilità',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'PUT', strikeOffset: -3, quantity: 1 },
      { action: 'SELL', type: 'PUT', strikeOffset: -1, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 1, quantity: 1 },
      { action: 'BUY', type: 'CALL', strikeOffset: 3, quantity: 1 }
    ]
  },
  {
    id: 'iron-butterfly',
    name: 'Iron Butterfly',
    category: 'NEUTRAL',
    description: 'Vende Call ATM e Put ATM, comprando ali protettive OTM. Guadagno massimo concentrato esattamente sul prezzo ATM corrente.',
    outlook: 'Neutrale con pinpoint ATM',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'PUT', strikeOffset: -2, quantity: 1 },
      { action: 'SELL', type: 'PUT', strikeOffset: 0, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 0, quantity: 1 },
      { action: 'BUY', type: 'CALL', strikeOffset: 2, quantity: 1 }
    ]
  },
  {
    id: 'butterfly',
    name: 'Long Butterfly (Call)',
    category: 'NEUTRAL',
    description: 'Compra 1 Call ITM, vende 2 Call ATM e compra 1 Call OTM. Rischio molto basso e rendimento elevato se il titolo si ferma vicino allo strike centrale.',
    outlook: 'Neutrale / Range stretto',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: -2, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 0, quantity: 2 },
      { action: 'BUY', type: 'CALL', strikeOffset: 2, quantity: 1 }
    ]
  },
  {
    id: 'broken-wing-butterfly',
    name: 'Broken Wing Butterfly',
    category: 'NEUTRAL',
    description: 'Butterfly asimmetrica che elimina il rischio su un lato (generalmente a rialzo o ribasso), spesso strutturata a zero debito o credito.',
    outlook: 'Neutrale con bias direzionale',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: -1, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 1, quantity: 2 },
      { action: 'BUY', type: 'CALL', strikeOffset: 4, quantity: 1 }
    ]
  },

  // 4. Volatility & Breakout
  {
    id: 'straddle',
    name: 'Long Straddle',
    category: 'VOLATILITY',
    description: 'Acquisto contemporaneo di Call ATM e Put ATM stessa scadenza. Guadagna su forti movimenti esplosivi in qualsiasi direzione.',
    outlook: 'Forte volatilità attesa (Earnings / CPI)',
    complexity: 'INTERMEDIATE',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: 0, quantity: 1 },
      { action: 'BUY', type: 'PUT', strikeOffset: 0, quantity: 1 }
    ]
  },
  {
    id: 'strangle',
    name: 'Long Strangle',
    category: 'VOLATILITY',
    description: 'Acquisto di Call OTM e Put OTM. Più economico dello straddle, necessita di un movimento ancor più marcato per andare in profitto.',
    outlook: 'Volatilità esplosiva',
    complexity: 'INTERMEDIATE',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: 2, quantity: 1 },
      { action: 'BUY', type: 'PUT', strikeOffset: -2, quantity: 1 }
    ]
  },

  // 5. Stock & Hedging Combinations
  {
    id: 'covered-call',
    name: 'Covered Call',
    category: 'BULLISH',
    description: 'Simulata con Put sintetica o vendita Call OTM. Genera rendita periodica (Theta) sacrificando il rialzo oltre lo strike venduto.',
    outlook: 'Moderatamente rialzista / Income',
    complexity: 'BASIC',
    legsConfig: (spot, dte, iv) => [
      { action: 'SELL', type: 'CALL', strikeOffset: 1, quantity: 1 },
      // Sintetico o short put ITM
      { action: 'BUY', type: 'CALL', strikeOffset: -3, quantity: 1 }
    ]
  },
  {
    id: 'collar',
    name: 'Collar',
    category: 'NEUTRAL',
    description: 'Protegge il capitale acquistando Put OTM e finanziando il premio con la vendita di Call OTM.',
    outlook: 'Protezione conservativa',
    complexity: 'INTERMEDIATE',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: -3, quantity: 1 }, // proxy sottostante
      { action: 'BUY', type: 'PUT', strikeOffset: -1, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 2, quantity: 1 }
    ]
  },

  // 6. Time & Exotic Spreads
  {
    id: 'calendar',
    name: 'Calendar Spread',
    category: 'NEUTRAL',
    description: 'Vende un’opzione a breve termine e compra una a lungo termine allo stesso strike. Monetizza il decadimento temporale (Theta) asimmetrico.',
    outlook: 'Neutrale / Aumento IV a lungo termine',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'SELL', type: 'CALL', strikeOffset: 0, quantity: 1 },
      { action: 'BUY', type: 'CALL', strikeOffset: 0, quantity: 1, daysToExpiryOffset: 30 }
    ]
  },
  {
    id: 'diagonal',
    name: 'Diagonal Spread',
    category: 'BULLISH',
    description: 'Simile al calendar ma con strike differenti. Sfrutta sia la direzione del sottostante che il diverso decadimento delle scadenze.',
    outlook: 'Rialzista a medio termine',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: -1, quantity: 1, daysToExpiryOffset: 30 },
      { action: 'SELL', type: 'CALL', strikeOffset: 1, quantity: 1 }
    ]
  },
  {
    id: 'jade-lizard',
    name: 'Jade Lizard',
    category: 'NEUTRAL',
    description: 'Vende un Bear Call Spread OTM e contestualmente una Put OTM nuda. Se il credito totale incassato supera l’ampiezza della Call spread, non ha rischio a rialzo!',
    outlook: 'Neutrale / Rialzista moderata',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'SELL', type: 'PUT', strikeOffset: -2, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 1, quantity: 1 },
      { action: 'BUY', type: 'CALL', strikeOffset: 2, quantity: 1 }
    ]
  },
  {
    id: 'ratio-spread',
    name: 'Ratio Call Spread',
    category: 'BULLISH',
    description: 'Compra 1 Call ATM e vende 2 Call OTM. Generalmente strutturata a credito o debito minimo; presenta rischio non coperto sopra lo strike OTM.',
    outlook: 'Rialzista moderata con target preciso',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: 0, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 2, quantity: 2 }
    ]
  },
  {
    id: 'christmas-tree',
    name: 'Christmas Tree (Call)',
    category: 'BULLISH',
    description: 'Compra 1 Call ATM, salta uno strike e vende 3 Call più in alto, comprando 2 Call ancora più esterne. Profilo scalettato asimmetrico.',
    outlook: 'Rialzista a target mirato',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: 0, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 2, quantity: 3 },
      { action: 'BUY', type: 'CALL', strikeOffset: 3, quantity: 2 }
    ]
  },
  {
    id: 'box-spread',
    name: 'Box Spread',
    category: 'NEUTRAL',
    description: 'Combinazione di un Bull Call Spread e un Bear Put Spread agli stessi strike. Payoff sintetico privo di rischio azionario, usato come prestito sintetico.',
    outlook: 'Arbitraggio / Arbitraggio tassi',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: -1, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 1, quantity: 1 },
      { action: 'BUY', type: 'PUT', strikeOffset: 1, quantity: 1 },
      { action: 'SELL', type: 'PUT', strikeOffset: -1, quantity: 1 }
    ]
  },

  // 7. Special 0DTE Intraday Strategies
  {
    id: '0dte-iron-fly',
    name: '0DTE Iron Fly (Pinning)',
    category: '0DTE_SPECIAL',
    description: 'Specifica per scadenze intraday 0DTE. Sfrutta il rapidissimo decadimento Theta delle ultime ore vendendo lo straddle ATM con ali strette.',
    outlook: '0DTE Intraday Pinning',
    complexity: 'ADVANCED',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'PUT', strikeOffset: -1, quantity: 1 },
      { action: 'SELL', type: 'PUT', strikeOffset: 0, quantity: 1 },
      { action: 'SELL', type: 'CALL', strikeOffset: 0, quantity: 1 },
      { action: 'BUY', type: 'CALL', strikeOffset: 1, quantity: 1 }
    ]
  },
  {
    id: '0dte-credit-spread',
    name: '0DTE Credit Spread (Lotto Seller)',
    category: '0DTE_SPECIAL',
    description: 'Vendita di opzioni a bassissimo delta (10-15 Delta) a poche ore dalla chiusura per incassare il premio con probabilità di profitto >85%.',
    outlook: '0DTE Alta Probabilità',
    complexity: 'INTERMEDIATE',
    legsConfig: (spot, dte, iv) => [
      { action: 'SELL', type: 'PUT', strikeOffset: -2, quantity: 1 },
      { action: 'BUY', type: 'PUT', strikeOffset: -4, quantity: 1 }
    ]
  },
  {
    id: '0dte-momentum-strangle',
    name: '0DTE Momentum Strangle',
    category: '0DTE_SPECIAL',
    description: 'Acquisto di strangle OTM a basso costo per monetizzare violente accelerazioni di prezzo (breakout intraday pomeridiano).',
    outlook: '0DTE Breakout Intraday',
    complexity: 'INTERMEDIATE',
    legsConfig: (spot, dte, iv) => [
      { action: 'BUY', type: 'CALL', strikeOffset: 1, quantity: 1 },
      { action: 'BUY', type: 'PUT', strikeOffset: -1, quantity: 1 }
    ]
  }
];
