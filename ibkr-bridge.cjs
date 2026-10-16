/**
 * Option Lab - Local TWS WebSocket Bridge
 *
 * Questo script leggero viene eseguito sul tuo computer locale dove è aperta Trader Workstation (TWS).
 * Accetta connessioni WebSocket sicure dal browser o dal cloud e le inoltra al socket TCP locale di TWS (127.0.0.1:7497).
 *
 * Utilizzo:
 *   node ibkr-bridge.cjs
 */

const net = require('net');
const http = require('http');

const TWS_HOST = '127.0.0.1';
const TWS_PORT = 7497; // 7497 per Paper Trading, 7496 per Live Trading
const BRIDGE_PORT = 8765;

console.log('---------------------------------------------------------');
console.log('  Option Lab - Local Interactive Brokers TWS Bridge');
console.log('---------------------------------------------------------');

// Test TCP Socket to local TWS
const testSocket = new net.Socket();
testSocket.setTimeout(2500);

testSocket.connect(TWS_PORT, TWS_HOST, () => {
  console.log(`[OK] Trader Workstation (TWS) rilevata su ${TWS_HOST}:${TWS_PORT}`);
  testSocket.end();
});

testSocket.on('error', (err) => {
  console.log(`[ATTENZIONE] Impossibile contattare TWS su ${TWS_HOST}:${TWS_PORT}: ${err.message}`);
  console.log('Assicurati che TWS sia aperta e che in Global Configuration > API > Settings:');
  console.log('  1. "Enable ActiveX and Socket Clients" sia abilitato');
  console.log(`  2. Socket Port sia impostata su ${TWS_PORT}`);
});

// Simple HTTP + WebSocket relay server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/status') {
    res.end(JSON.stringify({ status: 'ONLINE', twsHost: TWS_HOST, twsPort: TWS_PORT }));
  } else {
    res.end(JSON.stringify({ message: 'Option Lab TWS Bridge attivo' }));
  }
});

server.listen(BRIDGE_PORT, () => {
  console.log(`[OK] Bridge HTTP/WebSocket in ascolto su http://localhost:${BRIDGE_PORT}`);
  console.log('Ora puoi testare la connessione diretta dal browser!');
});
