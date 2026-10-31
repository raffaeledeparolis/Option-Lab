import React, { useState, useEffect } from 'react';
import { WORLD_CONTINENTS } from '../utils/earthTexture';
import { Clock, TrendingUp, Radio, Activity, ExternalLink } from 'lucide-react';

interface FinancialHub {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  timeZone: string;
  tzAbbr: string;
  exchange: string;
  benchmark: string;
  benchmarkChange: string;
  isPositive: boolean;
  openUtcHour: number;
  closeUtcHour: number;
  color: string;
}

const FINANCIAL_HUBS: FinancialHub[] = [
  {
    id: 'tokyo',
    name: 'Tokyo Stock Exchange',
    city: 'TOKYO',
    country: 'Giappone',
    lat: 35.6762,
    lon: 139.6503,
    timeZone: 'Asia/Tokyo',
    tzAbbr: 'JST',
    exchange: 'TSE / JPX',
    benchmark: 'Nikkei 225',
    benchmarkChange: '+0.88%',
    isPositive: true,
    openUtcHour: 0,
    closeUtcHour: 6,
    color: '#38bdf8',
  },
  {
    id: 'hongkong',
    name: 'Hong Kong Exchanges',
    city: 'HONG KONG',
    country: 'Hong Kong',
    lat: 22.3193,
    lon: 114.1694,
    timeZone: 'Asia/Hong_Kong',
    tzAbbr: 'HKT',
    exchange: 'HKEX',
    benchmark: 'Hang Seng',
    benchmarkChange: '+1.05%',
    isPositive: true,
    openUtcHour: 1.5,
    closeUtcHour: 8,
    color: '#38bdf8',
  },
  {
    id: 'singapore',
    name: 'Singapore Exchange',
    city: 'SINGAPORE',
    country: 'Singapore',
    lat: 1.3521,
    lon: 103.8198,
    timeZone: 'Asia/Singapore',
    tzAbbr: 'SGT',
    exchange: 'SGX Derivatives',
    benchmark: 'STI Index',
    benchmarkChange: '+0.42%',
    isPositive: true,
    openUtcHour: 1,
    closeUtcHour: 9,
    color: '#22d3ee',
  },
  {
    id: 'dubai',
    name: 'Dubai Financial Market',
    city: 'DUBAI',
    country: 'EAU',
    lat: 25.2048,
    lon: 55.2708,
    timeZone: 'Asia/Dubai',
    tzAbbr: 'GST',
    exchange: 'DFM / DIFC',
    benchmark: 'DFMGI',
    benchmarkChange: '+0.15%',
    isPositive: true,
    openUtcHour: 6,
    closeUtcHour: 11,
    color: '#fbbf24',
  },
  {
    id: 'milan',
    name: 'Borsa Italiana',
    city: 'MILANO',
    country: 'Italia',
    lat: 45.4642,
    lon: 9.19,
    timeZone: 'Europe/Rome',
    tzAbbr: 'CET',
    exchange: 'Piazza Affari (IDEM)',
    benchmark: 'FTSE MIB',
    benchmarkChange: '+0.74%',
    isPositive: true,
    openUtcHour: 7.5,
    closeUtcHour: 16.5,
    color: '#34d399',
  },
  {
    id: 'frankfurt',
    name: 'Deutsche Börse & Eurex',
    city: 'FRANKFURT',
    country: 'Germania',
    lat: 50.1109,
    lon: 8.6821,
    timeZone: 'Europe/Berlin',
    tzAbbr: 'CET',
    exchange: 'XETRA / Eurex Options',
    benchmark: 'DAX 40',
    benchmarkChange: '+0.65%',
    isPositive: true,
    openUtcHour: 7,
    closeUtcHour: 16.5,
    color: '#38bdf8',
  },
  {
    id: 'london',
    name: 'London Stock Exchange',
    city: 'LONDON',
    country: 'Regno Unito',
    lat: 51.5074,
    lon: -0.1278,
    timeZone: 'Europe/London',
    tzAbbr: 'GMT',
    exchange: 'LSE / ICE Europe',
    benchmark: 'FTSE 100',
    benchmarkChange: '+0.38%',
    isPositive: true,
    openUtcHour: 8,
    closeUtcHour: 16.5,
    color: '#22d3ee',
  },
  {
    id: 'newyork',
    name: 'New York (NYSE / CBOE / NASDAQ)',
    city: 'NEW YORK',
    country: 'USA',
    lat: 40.7128,
    lon: -74.006,
    timeZone: 'America/New_York',
    tzAbbr: 'EDT',
    exchange: 'CBOE / NYSE / OPRA',
    benchmark: 'S&P 500',
    benchmarkChange: '+1.15%',
    isPositive: true,
    openUtcHour: 13.5,
    closeUtcHour: 20,
    color: '#34d399',
  },
  {
    id: 'saopaulo',
    name: 'B3 Brasil Bolsa Balcão',
    city: 'SAO PAULO',
    country: 'Brasile',
    lat: -23.5505,
    lon: -46.6333,
    timeZone: 'America/Sao_Paulo',
    tzAbbr: 'BRT',
    exchange: 'B3 Derivatives',
    benchmark: 'Ibovespa',
    benchmarkChange: '-0.32%',
    isPositive: false,
    openUtcHour: 13,
    closeUtcHour: 20,
    color: '#38bdf8',
  },
  {
    id: 'sydney',
    name: 'Australian Securities Exchange',
    city: 'SYDNEY',
    country: 'Australia',
    lat: -33.8688,
    lon: 151.2093,
    timeZone: 'Australia/Sydney',
    tzAbbr: 'AEST',
    exchange: 'ASX Derivatives',
    benchmark: 'S&P/ASX 200',
    benchmarkChange: '+0.52%',
    isPositive: true,
    openUtcHour: 23,
    closeUtcHour: 5,
    color: '#38bdf8',
  },
];

// Major global financial transmission corridors
const LIQUIDITY_CORRIDORS: [string, string][] = [
  ['newyork', 'london'],
  ['london', 'frankfurt'],
  ['frankfurt', 'milan'],
  ['london', 'milan'],
  ['london', 'dubai'],
  ['dubai', 'singapore'],
  ['singapore', 'hongkong'],
  ['hongkong', 'tokyo'],
  ['tokyo', 'sydney'],
  ['newyork', 'tokyo'],
  ['newyork', 'saopaulo'],
];

export const Planisphere2D: React.FC = () => {
  const [selectedHub, setSelectedHub] = useState<FinancialHub | null>(null);
  const [currentUtcHour, setCurrentUtcHour] = useState<number>(() => {
    const d = new Date();
    return d.getUTCHours() + d.getUTCMinutes() / 60;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentUtcHour(d.getUTCHours() + d.getUTCMinutes() / 60);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Map dimensions (SVG coordinate system 960 x 480)
  const W = 960;
  const H = 480;

  // Convert lat/lon to X/Y in Equirectangular projection
  const toXY = (lat: number, lon: number): [number, number] => {
    const x = ((lon + 180) / 360) * W;
    const y = ((90 - lat) / 180) * H;
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  };

  // Convert continent points to SVG path string
  const continentPaths = WORLD_CONTINENTS.map((feature) => {
    if (feature.points.length < 3) return { name: feature.name, d: '' };
    const [startX, startY] = toXY(feature.points[0][0], feature.points[0][1]);
    let d = `M ${startX} ${startY}`;
    for (let i = 1; i < feature.points.length; i++) {
      const [px, py] = toXY(feature.points[i][0], feature.points[i][1]);
      d += ` L ${px} ${py}`;
    }
    d += ' Z';
    return { name: feature.name, d };
  });

  // Calculate market status
  const isMarketOpen = (hub: FinancialHub): boolean => {
    if (hub.openUtcHour <= hub.closeUtcHour) {
      return currentUtcHour >= hub.openUtcHour && currentUtcHour < hub.closeUtcHour;
    }
    // Wraps over midnight UTC (e.g. Sydney)
    return currentUtcHour >= hub.openUtcHour || currentUtcHour < hub.closeUtcHour;
  };

  // Parallels (Latitudes)
  const parallels = [-60, -40, -20, 0, 20, 40, 60, 80];
  // Meridians (Longitudes)
  const meridians = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#040816] via-[#061026] to-[#040816] border border-cyan-500/30 p-3 sm:p-5 shadow-2xl shadow-cyan-950/40">
      {/* Top Bar HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
          </span>
          <span className="font-bold uppercase tracking-wider text-white flex items-center gap-2 font-mono text-[11px] sm:text-xs">
            <span>PLANISFERO FINANZIARIO 2D • GLOBAL TRADING DESK</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              UTC {Math.floor(currentUtcHour).toString().padStart(2, '0')}:
              {Math.floor((currentUtcHour % 1) * 60)
                .toString()
                .padStart(2, '0')}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Mercati Aperti</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500/50" />
            <span className="text-slate-400">After-Hours</span>
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-cyan-400">Rotte Liquidità CBOE/Bybit/Deribit</span>
        </div>
      </div>

      {/* Main 2D Planisphere SVG Viewport */}
      <div className="relative w-full aspect-[2/1] max-h-[380px] min-h-[220px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full select-none"
          style={{ filter: 'drop-shadow(0 0 16px rgba(6, 182, 212, 0.15))' }}
        >
          <defs>
            {/* Cyan Glow Filter */}
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pulsing Beacon Glow */}
            <filter id="beaconGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear gradient for liquidity corridors */}
            <linearGradient id="corridorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
            </linearGradient>

            {/* Pattern for high-tech micro dot matrix */}
            <pattern id="dotGrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="8" cy="8" r="0.8" fill="#38bdf8" fillOpacity="0.18" />
            </pattern>
          </defs>

          {/* 1. Deep Ocean Background Rect */}
          <rect width={W} height={H} fill="#030712" />
          <rect width={W} height={H} fill="url(#dotGrid)" />

          {/* 2. Graticule: Parallels (Latitudes) */}
          {parallels.map((lat) => {
            const [, y] = toXY(lat, 0);
            const isEquator = lat === 0;
            return (
              <g key={`lat-${lat}`}>
                <line
                  x1={0}
                  y1={y}
                  x2={W}
                  y2={y}
                  stroke={isEquator ? 'rgba(34, 211, 238, 0.45)' : 'rgba(56, 189, 248, 0.12)'}
                  strokeWidth={isEquator ? 1.4 : 0.75}
                  strokeDasharray={isEquator ? 'none' : '4 4'}
                />
                <text
                  x={8}
                  y={y - 3}
                  fill="rgba(56, 189, 248, 0.35)"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {lat > 0 ? `+${lat}°N` : lat < 0 ? `${lat}°S` : 'EQ 0°'}
                </text>
              </g>
            );
          })}

          {/* Graticule: Meridians (Longitudes) */}
          {meridians.map((lon) => {
            const [x] = toXY(0, lon);
            const isPrime = lon === 0;
            return (
              <g key={`lon-${lon}`}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={H}
                  stroke={isPrime ? 'rgba(34, 211, 238, 0.45)' : 'rgba(56, 189, 248, 0.12)'}
                  strokeWidth={isPrime ? 1.4 : 0.75}
                  strokeDasharray={isPrime ? 'none' : '4 4'}
                />
                <text
                  x={x + 3}
                  y={H - 6}
                  fill="rgba(56, 189, 248, 0.35)"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {lon > 0 ? `+${lon}°E` : lon < 0 ? `${lon}°W` : 'GMT 0°'}
                </text>
              </g>
            );
          })}

          {/* 3. Recognizable Continents with Glowing Cyan Coastlines */}
          {continentPaths.map((c, i) => (
            <g key={i}>
              {/* Semi-translucent dark cyber-teal continent fill */}
              <path
                d={c.d}
                fill="rgba(8, 47, 73, 0.58)"
                stroke="none"
              />

              {/* Luminous Neon Cyan Coastline Glow */}
              <path
                d={c.d}
                fill="none"
                stroke="rgba(6, 182, 212, 0.85)"
                strokeWidth="2.2"
                strokeLinejoin="round"
                filter="url(#cyanGlow)"
              />

              {/* Razor-sharp inner coastline line */}
              <path
                d={c.d}
                fill="none"
                stroke="rgba(224, 242, 254, 0.95)"
                strokeWidth="0.9"
                strokeLinejoin="round"
              />
            </g>
          ))}

          {/* 4. Global Liquidity Corridors (Curved Trading Flow Routes) */}
          {LIQUIDITY_CORRIDORS.map(([srcId, dstId], idx) => {
            const h1 = FINANCIAL_HUBS.find((h) => h.id === srcId);
            const h2 = FINANCIAL_HUBS.find((h) => h.id === dstId);
            if (!h1 || !h2) return null;

            const [x1, y1] = toXY(h1.lat, h1.lon);
            const [x2, y2] = toXY(h2.lat, h2.lon);

            // Handle international date line wrap if distance is too wide
            if (Math.abs(x2 - x1) > W * 0.6) {
              return null; // keep visual corridors clean on 2D map
            }

            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Curve upward or downward based on latitude
            const curvature = Math.min(65, dist * 0.22);
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2 - curvature;

            const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

            return (
              <g key={`corridor-${idx}`}>
                {/* Static Faint Corridor Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.25)"
                  strokeWidth="1.2"
                />

                {/* Animated Glowing Pulse Corridor */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#corridorGrad)"
                  strokeWidth="1.8"
                  strokeDasharray="6 14"
                  className="animate-[dash_12s_linear_infinite]"
                />
              </g>
            );
          })}

          {/* 5. Financial Hub Markers & Radar Beacons */}
          {FINANCIAL_HUBS.map((hub) => {
            const [x, y] = toXY(hub.lat, hub.lon);
            const isOpen = isMarketOpen(hub);
            const isSelected = selectedHub?.id === hub.id;

            return (
              <g
                key={hub.id}
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setSelectedHub(hub)}
                onMouseEnter={() => setSelectedHub(hub)}
              >
                {/* Radar pulse wave for active hubs */}
                {isOpen && (
                  <circle
                    cx={x}
                    cy={y}
                    r="9"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="1"
                    opacity="0.6"
                    className="animate-ping origin-center"
                    style={{ transformOrigin: `${x}px ${y}px` }}
                  />
                )}

                {/* Outer halo */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 6 : 4}
                  fill={isOpen ? '#34d399' : '#38bdf8'}
                  fillOpacity={isSelected ? 0.9 : 0.65}
                  filter="url(#beaconGlow)"
                />

                {/* Inner Core Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill="#ffffff"
                />

                {/* City Label Badge */}
                <rect
                  x={x + 7}
                  y={y - 12}
                  width={hub.city.length * 6.6 + 18}
                  height="16"
                  rx="4"
                  fill="rgba(3, 8, 22, 0.85)"
                  stroke={isSelected ? '#34d399' : isOpen ? 'rgba(52, 211, 153, 0.45)' : 'rgba(56, 189, 248, 0.35)'}
                  strokeWidth="0.8"
                />
                <circle
                  cx={x + 13}
                  cy={y - 4}
                  r="2"
                  fill={isOpen ? '#34d399' : '#64748b'}
                />
                <text
                  x={x + 19}
                  y={y - 1}
                  fill={isOpen ? '#f0fdf4' : '#cbd5e1'}
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {hub.city}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Hub Interactive Floating Card Overlay */}
        {selectedHub && (
          <div className="absolute top-3 right-3 z-30 w-72 rounded-xl bg-slate-950/95 border border-cyan-500/50 p-3 shadow-2xl backdrop-blur-md animate-fade-in text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isMarketOpen(selectedHub) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <h4 className="font-bold text-white font-mono text-sm">{selectedHub.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHub(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Piazza / Exchange:</span>
                <span className="font-bold text-cyan-300">{selectedHub.exchange}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Fuso & Orario Locale:</span>
                <span className="text-slate-200">
                  {new Date().toLocaleTimeString('it-IT', {
                    timeZone: selectedHub.timeZone,
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  ({selectedHub.tzAbbr})
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Indice Benchmark:</span>
                <span className="font-bold text-slate-100 flex items-center gap-1">
                  <span>{selectedHub.benchmark}</span>
                  <span className={selectedHub.isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                    {selectedHub.benchmarkChange}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Stato Sessione:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isMarketOpen(selectedHub)
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isMarketOpen(selectedHub) ? 'SESSIONE LIVE APERTA' : 'AFTER-HOURS / CHIUSO'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Session Legend & Statistics */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-300 font-semibold flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Sessioni Finanziarie:
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2 h-2 rounded bg-sky-500/70" />
            Asia (Tokyo/HK/SG)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2 h-2 rounded bg-emerald-500/70" />
            Europa (Milano/Londra/Francoforte)
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2 h-2 rounded bg-amber-500/70" />
            Americhe (New York/Chicago)
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span>Rotte Opzioni & Volatilità Sincronizzate:</span>
          <span className="text-emerald-400 font-bold">11 Hub Connessi</span>
        </div>
      </div>
    </div>
  );
};
