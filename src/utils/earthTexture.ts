/**
 * High-precision procedural World Map Landmass data and texture generator.
 * Produces an equirectangular (2:1) canvas texture with clearly defined,
 * recognizable continents:
 * - High-definition Europe with unmistakable Italian boot, Sicily, Sardinia, Corsica,
 *   Iberian peninsula, Great Britain, Ireland, France, Germany, Scandinavia, Denmark, Greece, Balkans, and Crete
 * - High-definition North America, South America, Africa, Asia, Australia, and Antarctica.
 */

export interface PolygonFeature {
  name: string;
  points: [number, number][]; // [lat, lon]
  isEurope?: boolean;
}

export const WORLD_CONTINENTS: PolygonFeature[] = [
  // ==========================================
  // 1. NORTH AMERICA
  // ==========================================
  {
    name: 'North America',
    points: [
      [71, -156], [71, -145], [69, -137], [69, -130], [68, -120], [67, -114],
      [68, -108], [68, -96], [66, -88], [63, -83], [63, -77], [62, -73],
      [60, -68], [58, -62], [55, -60], [53, -56], [49, -58], [47, -53],
      [44, -64], [43, -70], [41, -72], [40, -74], [37, -76], [35, -76],
      [32, -80], [30, -81], [27, -80], [25, -80], [25, -81], [28, -83],
      [30, -85], [30, -88], [29, -94], [26, -97], [22, -97], [19, -96],
      [18, -92], [19, -88], [21, -87], [18, -88], [16, -88], [15, -83],
      [12, -83], [10, -83], [9, -80], [8, -78], [7, -80], [8, -83],
      [10, -85], [13, -87], [15, -93], [16, -97], [18, -103], [20, -105],
      [23, -107], [28, -111], [31, -114], [28, -113], [24, -111], [23, -110],
      [27, -114], [30, -116], [32, -117], [34, -119], [37, -122], [40, -124],
      [44, -124], [48, -125], [50, -127], [52, -128], [54, -130], [57, -135],
      [59, -138], [59, -145], [56, -154], [55, -162], [57, -158], [59, -152],
      [60, -148], [60, -161], [63, -162], [65, -168], [66, -166], [68, -163],
      [70, -162], [71, -156]
    ],
  },
  {
    name: 'Greenland',
    points: [
      [60, -44], [61, -47], [64, -51], [68, -53], [72, -56], [76, -67],
      [78, -72], [81, -66], [82, -45], [83, -30], [81, -18], [78, -19],
      [75, -20], [70, -22], [66, -34], [63, -40], [60, -44]
    ],
  },
  {
    name: 'Baffin Island',
    points: [
      [63, -65], [65, -64], [69, -68], [73, -77], [73, -85], [70, -85],
      [67, -78], [64, -75], [63, -65]
    ],
  },

  // ==========================================
  // 2. SOUTH AMERICA
  // ==========================================
  {
    name: 'South America',
    points: [
      [12, -72], [11, -74], [9, -76], [8, -77], [3, -78], [-1, -80],
      [-5, -81], [-8, -79], [-14, -76], [-18, -71], [-24, -70], [-30, -71],
      [-37, -73], [-42, -74], [-46, -75], [-50, -75], [-54, -71], [-55, -67],
      [-52, -68], [-48, -66], [-42, -63], [-38, -58], [-35, -55], [-31, -51],
      [-24, -46], [-22, -41], [-18, -39], [-13, -38], [-7, -35], [-5, -35],
      [-3, -40], [-1, -48], [2, -50], [5, -53], [7, -58], [10, -62],
      [11, -65], [12, -71], [12, -72]
    ],
  },

  // ==========================================
  // 3. EUROPE - HIGH DEFINITION & DISTINCT
  // ==========================================

  // A. CONTINENTAL EUROPE (France, Low Countries, Germany, Poland, Baltic States, Central/Eastern Europe, Balkans, Alps, French Riviera)
  {
    name: 'Europe Mainland',
    isEurope: true,
    points: [
      // Pyrenees North border (French side)
      [43.4, -1.8], [44.6, -1.2], [45.6, -1.1], [46.2, -1.2], [47.2, -2.2], // Atlantic France
      [48.0, -4.1], [48.4, -4.5], [48.7, -2.0], [49.6, -1.6], [49.5, 0.1],   // Brittany & Normandy
      [50.0, 1.1], [50.9, 1.8], [51.2, 2.9], [51.4, 4.2], [52.0, 4.1],      // Calais, Belgium, Netherlands
      [52.4, 4.9], [53.0, 4.8], [53.4, 7.0], [53.5, 8.5], [53.9, 8.7],      // Dutch/German North Sea coast
      [54.8, 8.6], [54.8, 9.5], [54.3, 10.1], [54.2, 12.1],                  // Baltic Germany
      [53.6, 14.5], [54.4, 18.6], [54.7, 20.5], [55.7, 21.1],                // Poland & Baltics (Gdańsk, Klaipeda)
      [57.0, 24.0], [59.4, 24.8], [59.9, 30.3],                              // Riga, Tallinn, St. Petersburg
      [58.0, 34.0], [55.0, 38.0], [51.0, 39.0], [47.2, 39.0],                // Eastern Europe / Russia interior
      [45.3, 36.5], [46.5, 30.7], [45.2, 29.6], [44.2, 28.6],                // Black Sea coast (Odessa, Danube delta, Romania)
      [42.5, 27.5], [41.0, 29.0], [40.5, 26.2],                              // Bulgaria & Bosphorus
      [40.8, 24.4], [40.6, 22.9], [40.0, 22.5],                              // Northern Greece & Thessaloniki
      [39.8, 20.0], [40.5, 19.5], [41.3, 19.4], [42.4, 18.8],                // Albania & Montenegro
      [42.6, 18.1], [43.5, 16.4], [44.1, 15.2], [45.3, 14.4], [45.6, 13.8], // Croatia / Dalmatia / Trieste
      // Northern Italian boundary along Alps (leaving Italy as its own boot)
      [46.4, 12.5], [46.8, 11.0], [46.5, 9.5], [45.9, 7.0], [45.0, 6.7],    // Alpine border
      [43.7, 7.3], [43.3, 5.4], [43.4, 4.6], [43.6, 3.9], [42.7, 3.0],      // French Riviera (Nice, Marseille, Montpellier)
      [42.4, 3.1], [42.6, 1.5], [42.8, -0.5], [43.4, -1.8]                   // Pyrenees ridge to Atlantic
    ],
  },

  // B. THE ITALIAN BOOT (Crisp, iconic, immediately recognizable boot shape)
  {
    name: 'Italy Peninsula',
    isEurope: true,
    points: [
      // Northern border along the Po valley / Alps
      [43.8, 7.6], [44.4, 8.9], [44.1, 9.8],                                  // Liguria / Genoa / La Spezia
      [43.5, 10.3], [42.4, 11.1], [42.1, 11.8], [41.4, 12.6],                // Livorno, Argentario, Rome, Anzio
      [40.8, 14.2], [40.6, 14.8], [40.0, 15.3],                              // Naples, Amalfi/Salerno, Palinuro
      [38.7, 15.9], [38.1, 15.6], [37.9, 15.8],                              // Calabria Toe (Tropea, Reggio, Melito)
      [37.9, 16.1], [38.2, 16.3], [39.0, 17.2], [39.6, 16.6],                // Toe to Crotone & Rossano
      [39.7, 16.5], [40.3, 16.8], [40.45, 17.2],                             // Gulf of Taranto arch
      [40.2, 17.9], [39.8, 18.3], [40.15, 18.5],                             // Salento Heel (Gallipoli, Leuca, Otranto)
      [40.6, 18.0], [41.1, 16.9], [41.3, 16.3],                              // Brindisi, Bari, Barletta
      [41.6, 15.9], [41.9, 16.2], [41.95, 16.0], [41.9, 15.4],               // Gargano Spur promontory!
      [42.0, 15.0], [42.5, 14.2], [43.6, 13.5], [44.1, 12.6], [44.5, 12.3], // Termoli, Pescara, Ancona, Rimini, Ravenna
      [45.4, 12.3], [45.7, 13.6],                                             // Venice Lagoon & Grado/Trieste
      [46.2, 12.8], [46.4, 11.2], [46.0, 9.8], [45.4, 9.2], [45.0, 7.7],    // Milan, Po Valley, Turin, Piedmont
      [43.8, 7.6]                                                             // Back to Ventimiglia/Liguria
    ],
  },

  // C. SICILY (Iconic Mediterranean Triangle)
  {
    name: 'Sicily',
    isEurope: true,
    points: [
      [38.25, 15.55], [37.8, 15.3], [37.5, 15.1], [37.0, 15.3],              // Messina, Taormina, Catania, Syracuse
      [36.65, 15.1], [37.05, 14.25], [37.3, 13.55],                          // Capo Passero, Gela, Agrigento
      [37.65, 12.6], [37.8, 12.4], [38.18, 12.73],                           // Marsala, Trapani, San Vito Lo Capo
      [38.12, 13.36], [38.04, 14.02], [38.22, 15.24], [38.25, 15.55]        // Palermo, Cefalù, Milazzo, Messina
    ],
  },

  // D. SARDINIA (Distinctive central Mediterranean jewel)
  {
    name: 'Sardinia',
    isEurope: true,
    points: [
      [41.24, 9.19], [40.92, 9.5], [40.78, 9.67], [39.93, 9.7],              // Gallura, Olbia, San Teodoro, Arbatax
      [39.14, 9.52], [39.2, 9.1], [38.87, 8.85], [39.05, 8.45],              // Villasimius, Cagliari, Capo Spartivento
      [39.9, 8.5], [40.3, 8.48], [40.56, 8.31],                               // Oristano, Bosa, Alghero
      [40.94, 8.23], [40.91, 8.7], [41.24, 9.19]                             // Stintino/Asinara, Castelsardo, Santa Teresa
    ],
  },

  // E. CORSICA
  {
    name: 'Corsica',
    isEurope: true,
    points: [
      [43.0, 9.4], [42.7, 9.45], [42.1, 9.5], [41.6, 9.3], [41.38, 9.15],   // Cap Corse, Bastia, Aleria, Bonifacio
      [41.67, 8.9], [41.92, 8.73], [42.56, 8.76], [42.68, 9.3], [43.0, 9.4] // Propriano, Ajaccio, Calvi, Saint-Florent
    ],
  },

  // F. IBERIAN PENINSULA (Spain & Portugal)
  {
    name: 'Iberia',
    isEurope: true,
    points: [
      [43.4, -1.8], [43.5, -3.8], [43.6, -5.7], [43.7, -7.7], [42.9, -9.3], // Bay of Biscay & Galicia / Finisterre
      [42.2, -8.7], [41.2, -8.6], [38.8, -9.5], [37.0, -9.0],               // Porto, Lisbon/Cabo da Roca, Sagres/Algarve
      [37.0, -7.9], [36.5, -6.3], [36.0, -5.6],                               // Faro, Cadiz, Tarifa/Gibraltar
      [36.7, -4.4], [36.7, -2.2], [37.6, -1.0], [38.3, -0.5], [39.5, -0.4], // Costa del Sol, Cabo de Gata, Alicante, Valencia
      [40.7, 0.8], [41.4, 2.2], [42.3, 3.3],                                  // Ebro Delta, Barcelona, Cap de Creus
      [42.4, 3.1], [42.6, 1.5], [42.8, -0.5], [43.4, -1.8]                   // Pyrenees back to Atlantic
    ],
  },

  // G. BALEARIC ISLANDS (Mallorca)
  {
    name: 'Mallorca',
    isEurope: true,
    points: [
      [39.7, 2.6], [39.9, 3.1], [39.7, 3.4], [39.3, 3.1], [39.5, 2.4], [39.7, 2.6]
    ],
  },

  // H. GREAT BRITAIN
  {
    name: 'Great Britain',
    isEurope: true,
    points: [
      [50.0, -5.2], [50.4, -4.1], [50.6, -1.3], [51.1, 1.3], [51.5, 0.7],    // Cornwall, Wight, Dover, Thames
      [52.5, 1.7], [53.6, 0.1], [55.0, -1.4], [56.0, -3.2], [57.2, -2.1],    // East Anglia, Newcastle, Edinburgh, Aberdeen
      [58.6, -3.0], [58.6, -5.0], [57.4, -6.0], [56.4, -5.8], [55.7, -4.9], // Highlands, Cape Wrath, Skye, Glasgow
      [54.8, -3.6], [53.3, -4.6], [51.9, -5.3], [51.5, -4.0], [51.2, -4.1], // Wales & Bristol Channel
      [50.1, -5.7], [50.0, -5.2]                                              // Land's End & Lizard Point
    ],
  },

  // I. IRELAND
  {
    name: 'Ireland',
    isEurope: true,
    points: [
      [55.4, -7.4], [54.7, -5.8], [53.3, -6.2], [52.2, -6.4],                // Malin Head, Belfast, Dublin, Rosslare
      [51.7, -8.5], [51.5, -9.8], [52.1, -10.3], [52.6, -9.9],               // Cork, Mizen Head, Dingle, Shannon
      [53.2, -9.2], [54.3, -10.0], [54.6, -8.4], [55.4, -7.4]                // Galway, Mayo, Donegal, Malin Head
    ],
  },

  // J. SCANDINAVIA & FINLAND (Norway fjords, Sweden Baltic coast, Gulf of Bothnia, Finland)
  {
    name: 'Scandinavia',
    isEurope: true,
    points: [
      [58.0, 7.5], [59.0, 10.5], [57.7, 11.9], [55.6, 12.9],                // Norway south to Oslo & Sweden Malmö
      [56.2, 15.6], [59.3, 18.0], [62.4, 17.3], [65.5, 22.1], [65.0, 25.4], // Stockholm, Bothnia, Luleå, Oulu
      [63.1, 21.6], [60.2, 24.9], [60.5, 28.0], [65.0, 34.0], [68.0, 39.0], // Helsinki, White Sea, Kola Peninsula
      [69.7, 30.0], [71.2, 25.8], [69.6, 18.9], [68.2, 14.0],                // Kirkenes, North Cape (Nordkapp), Tromsø, Lofoten
      [63.4, 10.4], [61.1, 5.0], [60.4, 5.3], [58.9, 5.6], [58.0, 7.5]      // Trondheim, Sognefjord, Bergen, Stavanger
    ],
  },

  // K. DENMARK (Jutland peninsula)
  {
    name: 'Denmark Jutland',
    isEurope: true,
    points: [
      [55.0, 8.5], [56.0, 8.2], [57.0, 8.6], [57.7, 10.6],                   // West coast to Skagen tip
      [57.0, 10.3], [56.2, 10.3], [55.5, 9.7], [55.0, 9.4], [55.0, 8.5]     // East coast back to German border
    ],
  },

  // L. GREECE & PELOPONNESE
  {
    name: 'Peloponnese',
    isEurope: true,
    points: [
      [38.0, 22.9], [37.4, 23.2], [36.4, 23.2], [36.4, 22.5],                // Corinth, Argolis, Cape Maleas, Cape Matapan
      [36.9, 21.7], [37.3, 21.7], [38.3, 21.7], [38.0, 22.9]                 // Pylos, Kyparissia, Patras, Corinth
    ],
  },

  // M. CRETE
  {
    name: 'Crete',
    isEurope: true,
    points: [
      [35.5, 23.6], [35.7, 24.2], [35.4, 25.1], [35.2, 26.3],
      [35.0, 25.8], [35.0, 24.8], [35.2, 24.0], [35.5, 23.6]
    ],
  },

  // N. CRIMEA (Black Sea peninsula)
  {
    name: 'Crimea',
    isEurope: true,
    points: [
      [46.1, 33.6], [45.7, 34.8], [45.3, 36.5], [45.0, 35.4],
      [44.5, 33.5], [45.2, 33.2], [45.8, 33.4], [46.1, 33.6]
    ],
  },

  // ==========================================
  // 4. AFRICA (With wide, clear Mediterranean basin)
  // ==========================================
  {
    name: 'Africa',
    points: [
      // North African Mediterranean coast clearly separated from Europe
      [35.8, -5.8], [35.7, -0.6], [36.8, 3.1], [36.9, 7.8], [37.1, 11.0],   // Morocco, Oran, Algiers, Annaba, Cap Bon
      [34.0, 10.1], [32.9, 13.2], [32.1, 20.0], [32.0, 24.0], [31.2, 29.9], // Gabes, Tripoli, Benghazi, Tobruk, Alexandria
      [31.3, 32.3], [28.0, 34.0], [22.0, 37.0], [16.0, 40.0], [12.0, 44.0], // Suez, Red Sea coast, Horn of Africa
      [12.0, 51.0], [9.0, 50.0], [5.0, 48.0], [1.0, 44.0], [-3.0, 40.0],     // Somalia / East Africa
      [-10.0, 40.0], [-15.0, 40.0], [-20.0, 35.0], [-26.0, 33.0],            // Mozambique / South Africa
      [-32.0, 29.0], [-34.5, 25.0], [-34.8, 20.0], [-34.0, 18.5],            // Cape of Good Hope
      [-30.0, 16.0], [-25.0, 15.0], [-18.0, 12.0], [-12.0, 13.0],            // Namibia, Angola
      [-6.0, 12.0], [-1.0, 9.0], [4.0, 7.0], [5.0, 2.0], [5.0, -3.0],        // Congo, Nigeria, Gulf of Guinea
      [4.0, -8.0], [7.0, -12.0], [10.0, -14.0], [12.0, -17.0], [15.0, -17.0], // Liberia, Sierra Leone, Senegal/Dakar
      [18.0, -16.0], [21.0, -17.0], [26.0, -15.0], [30.0, -10.0],            // Mauritania, Western Sahara
      [33.0, -8.0], [35.8, -5.8]                                              // Morocco Strait of Gibraltar
    ],
  },
  {
    name: 'Madagascar',
    points: [
      [-12, 49], [-16, 50], [-22, 48], [-25, 47], [-25, 44],
      [-20, 44], [-15, 46], [-12, 49]
    ],
  },

  // ==========================================
  // 5. ASIA & MIDDLE EAST
  // ==========================================
  {
    name: 'Asia Mainland',
    points: [
      [31.3, 34.5], [30.0, 35.0], [28.0, 35.0], [23.0, 38.0], [17.0, 43.0],   // Levant & Red Sea East
      [13.0, 45.0], [13.0, 48.0], [17.0, 54.0], [23.0, 58.0], [25.0, 62.0],   // Yemen, Oman, UAE
      [27.0, 50.0], [30.0, 48.0], [28.0, 51.0], [25.0, 57.0], [25.0, 67.0],   // Persian Gulf & Pakistan
      [24.0, 70.0], [21.0, 72.0], [16.0, 73.0], [10.0, 76.0], [8.0, 77.0],    // India West Coast
      [10.0, 79.0], [14.0, 80.0], [18.0, 84.0], [21.0, 88.0], [22.0, 91.0],   // India East Coast & Bengal
      [18.0, 94.0], [16.0, 96.0], [12.0, 99.0], [8.0, 100.0], [4.0, 102.0],   // Myanmar, Thailand, Malaysia
      [1.3, 104.0], [4.0, 103.5], [8.0, 103.0], [10.0, 105.0], [12.0, 109.0], // Singapore tip, Gulf of Thailand, Vietnam
      [16.0, 108.0], [21.0, 108.0], [22.0, 114.0], [23.0, 117.0], [25.0, 119.0], // South China / Hong Kong
      [30.0, 122.0], [34.0, 120.0], [37.0, 122.0], [40.0, 124.0], [40.0, 128.0], // Shanghai, Yellow Sea, Bohai
      [37.0, 126.0], [35.0, 129.0], [38.0, 128.0], [42.0, 131.0], [45.0, 136.0], // Korea & Vladivostok
      [48.0, 140.0], [53.0, 142.0], [58.0, 155.0], [60.0, 162.0], [62.0, 165.0], // Sea of Okhotsk
      [56.0, 162.0], [52.0, 158.0], [51.0, 156.0], [56.0, 160.0], [60.0, 165.0], // Kamchatka
      [65.0, 170.0], [67.0, 178.0], [70.0, 179.0], [71.0, 150.0], [73.0, 130.0], // Chukchi & Siberia
      [75.0, 110.0], [76.0, 90.0], [73.0, 75.0], [70.0, 60.0], [68.0, 45.0],   // Arctic Russia
      [65.0, 40.0], [60.0, 48.0], [55.0, 52.0], [50.0, 50.0], [45.0, 48.0],   // Caspian / Urals
      [40.0, 46.0], [38.0, 42.0], [37.0, 36.0], [33.0, 35.0], [31.3, 34.5]    // Anatolia South / Levant
    ],
  },
  {
    name: 'Japan Honshu & Hokkaido',
    points: [
      [31, 131], [33, 132], [35, 135], [36, 139], [39, 142], [41, 141],
      [42, 143], [44, 145], [45, 142], [43, 141], [40, 140], [37, 137],
      [35, 133], [33, 130], [31, 131]
    ],
  },

  // ==========================================
  // 6. SOUTHEAST ASIA & AUSTRALASIA
  // ==========================================
  {
    name: 'Sumatra',
    points: [
      [5, 95], [2, 98], [-3, 103], [-6, 105], [-5, 102], [-1, 100],
      [3, 97], [5, 95]
    ],
  },
  {
    name: 'Java',
    points: [
      [-6, 106], [-6, 108], [-7, 112], [-8, 114], [-8, 110], [-7, 106], [-6, 106]
    ],
  },
  {
    name: 'Borneo',
    points: [
      [7, 117], [4, 119], [1, 118], [-3, 115], [-4, 112], [-2, 110],
      [1, 109], [4, 114], [7, 117]
    ],
  },
  {
    name: 'Philippines',
    points: [
      [18, 121], [15, 120], [13, 124], [8, 126], [6, 125], [10, 122],
      [14, 121], [18, 121]
    ],
  },
  {
    name: 'Australia',
    points: [
      [-11, 142], [-14, 144], [-19, 147], [-24, 151], [-28, 153], [-32, 152],
      [-37, 150], [-39, 146], [-38, 142], [-35, 138], [-33, 135], [-32, 130],
      [-34, 125], [-35, 118], [-32, 115], [-27, 114], [-22, 114], [-18, 120],
      [-16, 124], [-14, 127], [-12, 131], [-13, 136], [-15, 137], [-15, 141],
      [-11, 142]
    ],
  },
  {
    name: 'Tasmania',
    points: [
      [-41, 145], [-41, 148], [-43, 148], [-43, 145], [-41, 145]
    ],
  },
  {
    name: 'New Zealand',
    points: [
      [-35, 173], [-38, 177], [-41, 175], [-43, 173], [-46, 169],
      [-46, 167], [-44, 170], [-41, 172], [-38, 174], [-35, 173]
    ],
  },

  // ==========================================
  // 7. ANTARCTICA
  // ==========================================
  {
    name: 'Antarctica',
    points: [
      [-63, -57], [-65, -64], [-68, -70], [-72, -90], [-73, -120], [-75, -150],
      [-78, -170], [-75, 170], [-70, 140], [-66, 120], [-66, 90], [-67, 60],
      [-69, 30], [-70, 0], [-68, -30], [-63, -57]
    ],
  },
];

/**
 * Creates an equirectangular 2D HTML Canvas with world continents,
 * graticules, landmass wireframe matrix, and bright luminous cyan glow.
 * Optimized with dedicated high-contrast delineation for Europe.
 */
export function createEquirectangularEarthCanvas(width = 2048, height = 1024): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Deep Ocean Background with subtle gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#020617');
  oceanGrad.addColorStop(0.5, '#051329');
  oceanGrad.addColorStop(1, '#020617');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Conversion from lat/lon to Canvas X/Y in equirectangular projection
  const toXY = (lat: number, lon: number): [number, number] => {
    // lon: -180 to 180 -> 0 to width
    const x = ((lon + 180) / 360) * width;
    // lat: 90 to -90 -> 0 to height
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  };

  // 2. Graticule: Parallels (Latitude lines)
  ctx.lineWidth = 1.0;
  for (let lat = -80; lat <= 80; lat += 20) {
    const [, y] = toXY(lat, 0);
    const isEquator = lat === 0;
    ctx.strokeStyle = isEquator
      ? 'rgba(34, 211, 238, 0.45)'
      : 'rgba(56, 189, 248, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Graticule: Meridians (Longitude lines)
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = toXY(0, lon);
    const isPrime = lon === 0 || lon === 180 || lon === -180;
    ctx.strokeStyle = isPrime
      ? 'rgba(34, 211, 238, 0.35)'
      : 'rgba(56, 189, 248, 0.12)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // 3. Build paths:
  // A combined path for all continents, and a dedicated path for European features
  const combinedWorldPath = new Path2D();
  const europePath = new Path2D();

  for (const feature of WORLD_CONTINENTS) {
    if (feature.points.length < 3) continue;

    const featurePath = new Path2D();
    const [startX, startY] = toXY(feature.points[0][0], feature.points[0][1]);
    featurePath.moveTo(startX, startY);

    for (let i = 1; i < feature.points.length; i++) {
      const [px, py] = toXY(feature.points[i][0], feature.points[i][1]);
      featurePath.lineTo(px, py);
    }
    featurePath.closePath();

    combinedWorldPath.addPath(featurePath);

    if (feature.isEurope) {
      europePath.addPath(featurePath);
    }
  }

  // 4. Fill Continents with Semi-Translucent Cyber-Teal
  ctx.fillStyle = 'rgba(8, 47, 73, 0.72)';
  ctx.fill(combinedWorldPath);

  // Extra rich fill for Europe for enhanced visibility
  ctx.fillStyle = 'rgba(12, 74, 110, 0.55)';
  ctx.fill(europePath);

  // 5. Draw Fine High-Tech Wireframe Grid inside Landmasses (clipped to continents)
  ctx.save();
  ctx.clip(combinedWorldPath);

  // Micro-latitude lines inside continents
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.32)';
  ctx.lineWidth = 0.8;
  for (let lat = -80; lat <= 80; lat += 3) {
    const [, y] = toXY(lat, 0);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Micro-longitude lines inside continents
  for (let lon = -180; lon <= 180; lon += 3) {
    const [x] = toXY(0, lon);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Glowing micro data nodes inside landmasses
  ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
  const step = 3;
  for (let lat = -80; lat <= 80; lat += step) {
    for (let lon = -180; lon <= 180; lon += step) {
      const [px, py] = toXY(lat, lon);
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  // 6. World Coastline Glow Outline
  ctx.shadowColor = 'rgba(6, 182, 212, 0.85)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.88)';
  ctx.lineWidth = 2.2;
  ctx.stroke(combinedWorldPath);

  // Crisp Inner White-Cyan Coastline
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.95)';
  ctx.lineWidth = 1.2;
  ctx.stroke(combinedWorldPath);

  // 7. DEDICATED EXTRA HIGHLIGHT FOR EUROPE
  // Brings out Italy, Alps, Mediterranean, Iberia, Great Britain, and Scandinavia
  ctx.shadowColor = 'rgba(34, 211, 238, 0.95)';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = 'rgba(56, 232, 255, 0.95)';
  ctx.lineWidth = 2.6;
  ctx.stroke(europePath);

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.4;
  ctx.stroke(europePath);

  // 8. Micro Financial Nodes & Circuit Traces in Key European Hubs
  // (London, Paris, Milan, Frankfurt, Rome, Madrid, Zurich)
  const euroNodes: [number, number, string][] = [
    [51.5, -0.1, 'London'],
    [48.8, 2.3, 'Paris'],
    [45.5, 9.2, 'Milan'],
    [50.1, 8.7, 'Frankfurt'],
    [41.9, 12.5, 'Rome'],
    [47.4, 8.5, 'Zurich'],
    [40.4, -3.7, 'Madrid'],
    [52.4, 4.9, 'Amsterdam'],
  ];

  ctx.shadowColor = 'rgba(34, 211, 238, 1)';
  ctx.shadowBlur = 8;
  for (const [lat, lon] of euroNodes) {
    const [nx, ny] = toXY(lat, lon);
    // Outer halo
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
    ctx.stroke();

    // Solid core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(nx, ny, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  return canvas;
}
