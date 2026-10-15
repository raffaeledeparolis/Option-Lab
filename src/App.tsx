import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UnderlyingAsset,
  OptionLeg,
  ExpirationDate,
  DataProvider,
  StrategyPreset,
} from './types/options';
import {
  UNDERLYING_ASSETS,
  getAvailableExpirations,
  generateOptionChain,
} from './data/mockMarketData';
import {
  calculateStrategyMetrics,
  calculateStrategyGreeks,
  calculateBlackScholes,
  dteToYears,
} from './utils/blackScholes';
import { STRATEGY_PRESETS } from './utils/strategyPresets';
import { Navbar } from './components/Navbar';
import { AssetSelector } from './components/AssetSelector';
import { KeyMetricsBar } from './components/KeyMetricsBar';
import { OptionChain } from './components/OptionChain';
import { StrategyLegBuilder } from './components/StrategyLegBuilder';
import { PayoffChart } from './components/PayoffChart';
import { SimulatorControls } from './components/SimulatorControls';
import { GreeksDashboard } from './components/GreeksDashboard';
import { ScenarioHeatmap } from './components/ScenarioHeatmap';
import { ProbabilisticAnalysis } from './components/ProbabilisticAnalysis';
import { StrategySummary } from './components/StrategySummary';
import { StrategyComparator } from './components/StrategyComparator';
import { AiStrategicAssistant } from './components/AiStrategicAssistant';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    'builder' | 'payoff' | 'scenario' | 'greeks' | 'monte-carlo' | 'comparator' | 'ai-advisor'
  >('builder');

  // Asset & Market Data
  const [assets, setAssets] = useState<UnderlyingAsset[]>(UNDERLYING_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<UnderlyingAsset>(UNDERLYING_ASSETS[0]); // SPX
  const [dataProvider, setDataProvider] = useState<DataProvider>('INTERACTIVE_BROKERS');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [lastTickDirection, setLastTickDirection] = useState<'UP' | 'DOWN' | null>(null);

  // Expiration
  const expirations = useMemo(() => getAvailableExpirations(), []);
  const [selectedExpiration, setSelectedExpiration] = useState<ExpirationDate>(expirations[0]); // 0DTE

  // Simulator 'What-If' parameters
  const [spotOffset, setSpotOffset] = useState<number>(0);
  const [ivOffsetPct, setIvOffsetPct] = useState<number>(0);
  const [timeDecayDays, setTimeDecayDays] = useState<number>(0);
  const [customRate, setCustomRate] = useState<number>(selectedAsset.riskFreeRate);
  const [customDiv, setCustomDiv] = useState<number>(selectedAsset.dividendYield);

  // When asset changes, reset custom rates/dividends
  const handleSelectAsset = (asset: UnderlyingAsset) => {
    setSelectedAsset(asset);
    setCustomRate(asset.riskFreeRate);
    setCustomDiv(asset.dividendYield);
    setSpotOffset(0);
    setIvOffsetPct(0);
    setTimeDecayDays(0);
  };

  // Option Chain generation for currently selected asset and expiration
  const currentChain = useMemo(() => {
    return generateOptionChain(selectedAsset, selectedExpiration);
  }, [selectedAsset, selectedExpiration]);

  // Strategy Legs: Start with an initial 0DTE Iron Condor on SPX
  const [legs, setLegs] = useState<OptionLeg[]>(() => {
    const spot = UNDERLYING_ASSETS[0].spotPrice;
    const tick = UNDERLYING_ASSETS[0].tickSize;
    const atm = Math.round(spot / tick) * tick;
    const iv = UNDERLYING_ASSETS[0].iv;
    const dte = 0.15; // 0DTE

    return [
      {
        id: 'init-1',
        action: 'BUY',
        type: 'PUT',
        strike: atm - tick * 3,
        expiration: '0DTE Intraday',
        daysToExpiry: dte,
        is0DTE: true,
        intradayHoursRemaining: 3.5,
        quantity: 1,
        premium: 2.10,
        iv,
      },
      {
        id: 'init-2',
        action: 'SELL',
        type: 'PUT',
        strike: atm - tick * 1,
        expiration: '0DTE Intraday',
        daysToExpiry: dte,
        is0DTE: true,
        intradayHoursRemaining: 3.5,
        quantity: 1,
        premium: 5.40,
        iv,
      },
      {
        id: 'init-3',
        action: 'SELL',
        type: 'CALL',
        strike: atm + tick * 1,
        expiration: '0DTE Intraday',
        daysToExpiry: dte,
        is0DTE: true,
        intradayHoursRemaining: 3.5,
        quantity: 1,
        premium: 5.60,
        iv,
      },
      {
        id: 'init-4',
        action: 'BUY',
        type: 'CALL',
        strike: atm + tick * 3,
        expiration: '0DTE Intraday',
        daysToExpiry: dte,
        is0DTE: true,
        intradayHoursRemaining: 3.5,
        quantity: 1,
        premium: 2.20,
        iv,
      },
    ];
  });

  // Re-calculate Greeks for each leg whenever spot, IV, or leg parameters change
  const populatedLegs = useMemo(() => {
    const effectiveSpot = selectedAsset.spotPrice + spotOffset;
    const effectiveIvOffset = (selectedAsset.iv * ivOffsetPct) / 100;

    return legs.map((leg) => {
      const remainingDte = Math.max(0.0001, leg.daysToExpiry - timeDecayDays);
      const remainingHours = leg.is0DTE
        ? Math.max(0.05, (leg.intradayHoursRemaining || 3.5) - timeDecayDays * 6.5)
        : undefined;

      const T = dteToYears(remainingDte, remainingHours);
      const legIv = Math.max(0.01, leg.iv + effectiveIvOffset);

      const bs = calculateBlackScholes(
        leg.type,
        effectiveSpot,
        leg.strike,
        T,
        customRate,
        legIv,
        customDiv
      );

      return {
        ...leg,
        delta: Number(bs.delta.toFixed(3)),
        gamma: Number(bs.gamma.toFixed(4)),
        theta: Number((leg.is0DTE ? bs.thetaHourly : bs.theta).toFixed(2)),
        vega: Number(bs.vega.toFixed(2)),
        rho: Number(bs.rho.toFixed(2)),
      };
    });
  }, [legs, selectedAsset.spotPrice, spotOffset, selectedAsset.iv, ivOffsetPct, timeDecayDays, customRate, customDiv]);

  // Aggregate Metrics & Greeks
  const metrics = useMemo(() => {
    const effectiveSpot = selectedAsset.spotPrice + spotOffset;
    return calculateStrategyMetrics(
      populatedLegs,
      effectiveSpot,
      selectedAsset.contractMultiplier,
      customRate,
      customDiv
    );
  }, [populatedLegs, selectedAsset.spotPrice, spotOffset, selectedAsset.contractMultiplier, customRate, customDiv]);

  const greeks = useMemo(() => {
    const effectiveSpot = selectedAsset.spotPrice + spotOffset;
    return calculateStrategyGreeks(
      populatedLegs,
      effectiveSpot,
      selectedAsset.contractMultiplier,
      customRate,
      customDiv
    );
  }, [populatedLegs, selectedAsset.spotPrice, spotOffset, selectedAsset.contractMultiplier, customRate, customDiv]);

  // Live market price tick simulation
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          if (asset.symbol !== selectedAsset.symbol) return asset;
          // Random minor tick
          const tickDelta = (Math.random() - 0.49) * asset.tickSize * 0.2;
          const newPrice = Number((asset.spotPrice + tickDelta).toFixed(asset.symbol === 'EURUSD' ? 4 : 2));
          const direction = tickDelta >= 0 ? 'UP' : 'DOWN';
          setLastTickDirection(direction);
          setTimeout(() => setLastTickDirection(null), 400);

          return {
            ...asset,
            spotPrice: newPrice,
            change24h: asset.change24h + tickDelta,
          };
        })
      );
    }, 2400);

    return () => clearInterval(interval);
  }, [isLiveStreaming, selectedAsset.symbol]);

  // Sync selectedAsset when assets array is updated by ticker
  useEffect(() => {
    const updated = assets.find((a) => a.symbol === selectedAsset.symbol);
    if (updated && updated.spotPrice !== selectedAsset.spotPrice) {
      setSelectedAsset(updated);
    }
  }, [assets, selectedAsset.symbol]);

  // Leg Management Callbacks
  const handleAddLeg = useCallback(
    (
      action: 'BUY' | 'SELL',
      type: 'CALL' | 'PUT',
      strike: number,
      premium: number,
      iv: number,
      dte: number,
      is0DTE: boolean,
      hoursRemaining?: number
    ) => {
      const newLeg: OptionLeg = {
        id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        action,
        type,
        strike,
        expiration: is0DTE ? `${selectedExpiration.label}` : `${selectedExpiration.label}`,
        daysToExpiry: dte,
        is0DTE,
        intradayHoursRemaining: hoursRemaining,
        quantity: 1,
        premium,
        iv,
      };
      setLegs((prev) => [...prev, newLeg]);
    },
    [selectedExpiration]
  );

  const handleUpdateLeg = useCallback((legId: string, updates: Partial<OptionLeg>) => {
    setLegs((prev) =>
      prev.map((l) => (l.id === legId ? { ...l, ...updates } : l))
    );
  }, []);

  const handleRemoveLeg = useCallback((legId: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== legId));
  }, []);

  const handleDuplicateLeg = useCallback((legId: string) => {
    setLegs((prev) => {
      const target = prev.find((l) => l.id === legId);
      if (!target) return prev;
      const copy: OptionLeg = {
        ...target,
        id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      return [...prev, copy];
    });
  }, []);

  const handleInvertPosition = useCallback(() => {
    setLegs((prev) =>
      prev.map((l) => ({
        ...l,
        action: l.action === 'BUY' ? 'SELL' : 'BUY',
      }))
    );
  }, []);

  const handleClearLegs = useCallback(() => {
    setLegs([]);
  }, []);

  // Apply a Preset Strategy to current asset & expiration
  const handleApplyPreset = useCallback(
    (preset: StrategyPreset) => {
      const spot = selectedAsset.spotPrice;
      const tick = selectedAsset.tickSize;
      const atm = Math.round(spot / tick) * tick;
      const dte = selectedExpiration.daysToExpiry;
      const is0DTE = selectedExpiration.is0DTE;
      const hoursRemaining = selectedExpiration.hoursRemaining;
      const iv = selectedAsset.iv;

      const configs = preset.legsConfig(spot, dte, iv);

      const generatedLegs: OptionLeg[] = configs.map((cfg, index) => {
        const strike = Number((atm + cfg.strikeOffset * tick).toFixed(selectedAsset.symbol === 'EURUSD' ? 4 : 2));
        const legDte = dte + (cfg.daysToExpiryOffset || 0);
        const T = dteToYears(legDte, hoursRemaining);

        // Price leg using Black-Scholes
        const bs = calculateBlackScholes(
          cfg.type,
          spot,
          strike,
          T,
          selectedAsset.riskFreeRate,
          iv,
          selectedAsset.dividendYield
        );

        return {
          id: `preset-${Date.now()}-${index}`,
          action: cfg.action,
          type: cfg.type,
          strike,
          expiration: is0DTE ? '0DTE Intraday' : selectedExpiration.label,
          daysToExpiry: legDte,
          is0DTE,
          intradayHoursRemaining: hoursRemaining,
          quantity: cfg.quantity,
          premium: Number(bs.price.toFixed(selectedAsset.symbol === 'EURUSD' ? 4 : 2)),
          iv,
        };
      });

      setLegs(generatedLegs);
    },
    [selectedAsset, selectedExpiration]
  );

  const handleLoadStrategyToBuilder = useCallback((loadedLegs: OptionLeg[]) => {
    setLegs(JSON.parse(JSON.stringify(loadedLegs)));
    setActiveTab('builder');
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Header Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        legsCount={legs.length}
        onResetStrategy={handleClearLegs}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4">
        {/* 2. Asset Selector & Live Heartbeat */}
        <AssetSelector
          assets={assets}
          selectedAsset={selectedAsset}
          onSelectAsset={handleSelectAsset}
          dataProvider={dataProvider}
          onChangeDataProvider={setDataProvider}
          isLiveStreaming={isLiveStreaming}
          onToggleLiveStreaming={() => setIsLiveStreaming(!isLiveStreaming)}
          lastTickDirection={lastTickDirection}
        />

        {/* 3. Always Visible Main Metrics Bar */}
        <KeyMetricsBar metrics={metrics} currency={selectedAsset.currency} />

        {/* 4. Tab Views */}

        {/* TAB: BUILDER & OPTION CHAIN */}
        {activeTab === 'builder' && (
          <div className="space-y-4">
            <StrategyLegBuilder
              legs={populatedLegs}
              asset={selectedAsset}
              onUpdateLeg={handleUpdateLeg}
              onRemoveLeg={handleRemoveLeg}
              onDuplicateLeg={handleDuplicateLeg}
              onInvertPosition={handleInvertPosition}
              onClearLegs={handleClearLegs}
              onApplyPreset={handleApplyPreset}
            />

            <StrategySummary
              legs={populatedLegs}
              metrics={metrics}
              greeks={greeks}
              asset={selectedAsset}
            />

            <OptionChain
              chain={currentChain}
              asset={selectedAsset}
              expirations={expirations}
              selectedExpiration={selectedExpiration}
              onSelectExpiration={setSelectedExpiration}
              onAddLeg={handleAddLeg}
              activeLegs={legs}
            />
          </div>
        )}

        {/* TAB: PAYOFF & 0DTE INTRADAY */}
        {activeTab === 'payoff' && (
          <div className="space-y-4">
            <PayoffChart
              legs={populatedLegs}
              asset={selectedAsset}
              metrics={metrics}
              ivOffset={(selectedAsset.iv * ivOffsetPct) / 100}
              spotOffset={spotOffset}
            />

            <SimulatorControls
              asset={selectedAsset}
              spotOffset={spotOffset}
              setSpotOffset={setSpotOffset}
              ivOffsetPct={ivOffsetPct}
              setIvOffsetPct={setIvOffsetPct}
              timeDecayDays={timeDecayDays}
              setTimeDecayDays={setTimeDecayDays}
              customRate={customRate}
              setCustomRate={setCustomRate}
              customDiv={customDiv}
              setCustomDiv={setCustomDiv}
              is0DTE={legs.some((l) => l.is0DTE)}
            />

            <StrategySummary
              legs={populatedLegs}
              metrics={metrics}
              greeks={greeks}
              asset={selectedAsset}
            />
          </div>
        )}

        {/* TAB: SCENARIO ANALYZER & HEATMAP */}
        {activeTab === 'scenario' && (
          <div className="space-y-4">
            <ScenarioHeatmap
              legs={populatedLegs}
              asset={selectedAsset}
              ivOffset={(selectedAsset.iv * ivOffsetPct) / 100}
            />

            <SimulatorControls
              asset={selectedAsset}
              spotOffset={spotOffset}
              setSpotOffset={setSpotOffset}
              ivOffsetPct={ivOffsetPct}
              setIvOffsetPct={setIvOffsetPct}
              timeDecayDays={timeDecayDays}
              setTimeDecayDays={setTimeDecayDays}
              customRate={customRate}
              setCustomRate={setCustomRate}
              customDiv={customDiv}
              setCustomDiv={setCustomDiv}
              is0DTE={legs.some((l) => l.is0DTE)}
            />
          </div>
        )}

        {/* TAB: GREEKS DASHBOARD */}
        {activeTab === 'greeks' && (
          <div className="space-y-4">
            <GreeksDashboard
              greeks={greeks}
              legs={populatedLegs}
              asset={selectedAsset}
            />

            <SimulatorControls
              asset={selectedAsset}
              spotOffset={spotOffset}
              setSpotOffset={setSpotOffset}
              ivOffsetPct={ivOffsetPct}
              setIvOffsetPct={setIvOffsetPct}
              timeDecayDays={timeDecayDays}
              setTimeDecayDays={setTimeDecayDays}
              customRate={customRate}
              setCustomRate={setCustomRate}
              customDiv={customDiv}
              setCustomDiv={setCustomDiv}
              is0DTE={legs.some((l) => l.is0DTE)}
            />
          </div>
        )}

        {/* TAB: MONTE CARLO & PROBABILISTIC ANALYSIS */}
        {activeTab === 'monte-carlo' && (
          <div className="space-y-4">
            <ProbabilisticAnalysis
              legs={populatedLegs}
              asset={selectedAsset}
              metrics={metrics}
              ivOffset={(selectedAsset.iv * ivOffsetPct) / 100}
            />
          </div>
        )}

        {/* TAB: STRATEGY COMPARATOR (3X) */}
        {activeTab === 'comparator' && (
          <div className="space-y-4">
            <StrategyComparator
              currentLegs={populatedLegs}
              asset={selectedAsset}
              onLoadStrategyToBuilder={handleLoadStrategyToBuilder}
            />
          </div>
        )}

        {/* TAB: AI STRATEGIC ASSISTANT & OPTIMIZER */}
        {activeTab === 'ai-advisor' && (
          <div className="space-y-4">
            <AiStrategicAssistant
              asset={selectedAsset}
              currentLegs={populatedLegs}
              onApplyPreset={handleApplyPreset}
              onReplaceLegs={setLegs}
            />
          </div>
        )}
      </main>

      {/* Subtle, professional footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500 font-mono">
        Option Lab Terminal · Black-Scholes Analytic Engine & 0DTE Intraday Pinning Simulator
      </footer>
    </div>
  );
}
