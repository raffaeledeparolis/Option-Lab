# Option Lab - Options Strategy Builder & 0DTE Simulator

Piattaforma professionale per la costruzione, simulazione e trasmissione ordini di strategie in opzioni (0DTE, Iron Condor, Vertical Spread, ecc.) con integrazione Interactive Brokers (TWS / Gateway).

---

## 🚀 Come Eseguire l'Applicazione in Locale sul Tuo PC

Eseguire l'app sul proprio computer offre il grande vantaggio di connettersi direttamente al proprio **Interactive Brokers TWS** su `127.0.0.1:7497` senza dover ricorrere a tunnel esterni come ngrok.

### Requisiti
- **Node.js** versione 18 o superiore (scaricabile da [nodejs.org](https://nodejs.org))
- **Interactive Brokers TWS** o IB Gateway installato e aperto sul computer

### Passaggi di Installazione

1. **Estrai o clona la cartella** sul tuo computer:
   - Se hai scaricato il file ZIP da Google AI Studio, decomprimilo in una cartella a scelta (es. `C:\OptionLab` o `~/OptionLab`).

2. **Apri il terminale** (Prompt dei comandi / PowerShell su Windows, o Terminal su Mac/Linux) all'interno della cartella:
   ```bash
   cd percorso/della/cartella
   ```

3. **Installa le dipendenze:**
   ```bash
   npm install
   ```

4. **Avvia il server di sviluppo:**
   ```bash
   npm run dev
   ```

5. **Apri il browser:**
   Vai all'indirizzo:
   ```
   http://localhost:3000
   ```

---

## ⚙️ Configurazione di Interactive Brokers TWS

Per consentire all'applicazione di trasmettere ordini e ricevere tick:

1. Apri **Trader Workstation (TWS)**.
2. Vai nel menu: **File > Configurazione Globale > API > Impostazioni** (Settings).
3. Spunta la casella:
   - ✅ **Abilita client ActiveX e Socket** (Enable ActiveX and Socket Clients)
4. Assicurati che la porta socket sia corretta:
   - **7497** per Paper Trading (conto simulato)
   - **7496** per Live Trading (conto reale)
5. Negli **Indirizzi IP attendibili** (Trusted IP Addresses):
   - Clicca *Crea* e inserisci: `127.0.0.1` (questo evita qualsiasi finestra di dialogo o popup bloccante).
6. Nel menu **API > Precauzioni** (Precautions):
   - Spunta: ✅ **Bypassare le precauzioni per gli ordini API** (Bypass Order Precautions for API Orders).
7. Nella scheda **Ordini (Activity / Orders)** di TWS:
   - Imposta il filtro a tendina su **"Tutti gli ordini"** (All Orders) oppure seleziona la sotto-scheda **"API"** per visualizzare gli ordini inoltrati dall'applicazione.
