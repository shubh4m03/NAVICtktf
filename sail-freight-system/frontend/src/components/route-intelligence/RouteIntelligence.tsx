// ─────────────────────────────────────────────────────────────
// components/route-intelligence/RouteIntelligence.tsx
// Professional Commercial Maritime Route Intelligence & 3D Globe Workstation
// ─────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import {
  Navigation,
  ShieldAlert,
  Anchor,
  Compass,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Fuel,
  MapPin,
  Globe,
  Ship,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { mockPorts } from '../../data/mockPorts';
import { mockRoutes } from '../../data/mockRoutes';
import { PortInfo, RouteInfo } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { MaritimeGlobe } from './MaritimeGlobe';
import { ChokepointInfo } from './chokepointsData';
import { DemoVesselPosition } from './vesselPositionsData';
import { nirnaynService } from '../../services/nirnaynService';

export default function RouteIntelligence() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  // Voyage Terminal Selection
  const [originPortId, setOriginPortId] = useState<string>('port-hay-point');
  const [destPortId, setDestPortId] = useState<string>('port-paradip');
  const [vesselSpeedKnots, setVesselSpeedKnots] = useState<number>(14);
  const [weatherFactorPct, setWeatherFactorPct] = useState<number>(5);

  // Inspection Drawer states
  const [inspectedPort, setInspectedPort] = useState<PortInfo | null>(() => {
    return mockPorts.find((p) => p.id === 'port-paradip') || mockPorts[0]!;
  });
  const [inspectedChokepoint, setInspectedChokepoint] = useState<ChokepointInfo | null>(null);
  const [inspectedVessel, setInspectedVessel] = useState<DemoVesselPosition | null>(null);

  const originPort = useMemo(
    () => mockPorts.find((p) => p.id === originPortId) || mockPorts[0]!,
    [originPortId]
  );
  const destPort = useMemo(
    () => mockPorts.find((p) => p.id === destPortId) || mockPorts[2]!,
    [destPortId]
  );

  // Find exact matching route or synthesize geodesic waypoints
  const currentRoute: RouteInfo = useMemo(() => {
    const found = mockRoutes.find(
      (r) => r.originPortId === originPortId && r.destinationPortId === destPortId
    );
    if (found) return found;

    // Fallback synthesis if an ad-hoc pair is selected
    const lat1 = originPort.lat || 0;
    const lon1 = originPort.lng || 0;
    const lat2 = destPort.lat || 0;
    const lon2 = destPort.lng || 0;

    const R = 3440.065; // Earth radius in NM
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = Math.round(R * c * 1.15);

    // Midpoint sea waypoint
    const midLon = (lon1 + lon2) / 2;
    const midLat = (lat1 + lat2) / 2 + 3.0;

    return {
      id: `synthetic-${originPort.id}-${destPort.id}`,
      originPortId: originPort.id,
      destinationPortId: destPort.id,
      distanceNauticalMiles: dist,
      estimatedTransitDays: Number((dist / (14 * 24)).toFixed(1)),
      regions: [originPort.region, 'International Commercial Sea Lanes', destPort.region],
      risks: ['Standard oceanic sea-lane conditions', 'Seasonal monsoon swell risk'],
      waypoints: [
        [lon1, lat1],
        [midLon, midLat],
        [lon2, lat2],
      ],
    };
  }, [originPortId, destPortId, originPort, destPort]);

  // Synchronize Route & Scenario Selection with NIRNAY Context
  useEffect(() => {
    nirnaynService.setActiveContext({
      route: currentRoute,
      scenario: {
        origin: originPort.name,
        destination: destPort.name,
        cargoTonnage: 70000,
        commodity: 'Coal (Coking)',
      },
    });
  }, [currentRoute, originPort, destPort]);

  // Calculated duration and bunker consumption
  const calculatedTransitDays = useMemo(() => {
    const rawHours = currentRoute.distanceNauticalMiles / vesselSpeedKnots;
    const weatherAdjustedHours = rawHours * (1 + weatherFactorPct / 100);
    return Number((weatherAdjustedHours / 24).toFixed(1));
  }, [currentRoute, vesselSpeedKnots, weatherFactorPct]);

  const estimatedFuelMt = useMemo(() => {
    const dailyBaseConsumption = 31 * Math.pow(vesselSpeedKnots / 14, 3);
    return Math.round(dailyBaseConsumption * calculatedTransitDays);
  }, [vesselSpeedKnots, calculatedTransitDays]);

  const handleSelectPortFromMap = (port: PortInfo) => {
    setInspectedPort(port);
    setDestPortId(port.id);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-3.5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-primary" />
            <h1 className="text-base font-bold text-ink tracking-normal">
              Maritime Route Intelligence &amp; 3D Hydrographic Globe
            </h1>
          </div>
          <p className="text-xs text-ink-secondary">
            Geodesic nautical routing, real continental coastlines, strategic chokepoints, and berthing draft clearances.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-ink-muted">PORTS NETWORK:</span>
          <span className="text-primary font-semibold px-2 py-0.5 rounded bg-surface border border-border">
            {mockPorts.length} COMMERCIAL TERMINALS
          </span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Side: Route Controls & Sensitivity Parameters (4 cols) */}
        <div className="xl:col-span-4 space-y-3.5">
          {/* Voyage Terminals Selector */}
          <div className="card p-3.5 space-y-3">
            <h2 className="card-title flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              Voyage Terminals
            </h2>

            <div className="space-y-2.5">
              <div className="field-group">
                <label className="field-label">Origin Port (Load)</label>
                <select
                  value={originPortId}
                  onChange={(e) => setOriginPortId(e.target.value)}
                  className="field-input font-mono text-xs"
                >
                  {mockPorts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.country}) · Draft: {p.maxDraftMeters}m
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Destination Port (Discharge)</label>
                <select
                  value={destPortId}
                  onChange={(e) => {
                    setDestPortId(e.target.value);
                    const found = mockPorts.find((p) => p.id === e.target.value);
                    if (found) setInspectedPort(found);
                  }}
                  className="field-input font-mono text-xs"
                >
                  {mockPorts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.country}) · Draft: {p.maxDraftMeters}m
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Terminal Clearances */}
            <div className="pt-2 border-t border-border space-y-1 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-ink-secondary">Load Port Draft Limit:</span>
                <span className="text-ink font-semibold">{originPort.maxDraftMeters}m</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-ink-secondary">Discharge Port Draft:</span>
                <span
                  className={`font-semibold ${
                    destPort.maxDraftMeters < 15 ? 'text-status-warning' : 'text-status-green'
                  }`}
                >
                  {destPort.maxDraftMeters}m{' '}
                  {destPort.maxDraftMeters < 15 ? '(Restricted Approach)' : '(Deepwater Capable)'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-ink-secondary">Queue Congestion:</span>
                <span
                  className={`font-semibold ${
                    destPort.congestionIndex > 0.6 ? 'text-status-red' : 'text-status-green'
                  }`}
                >
                  {(destPort.congestionIndex * 100).toFixed(0)}% Queue Index
                </span>
              </div>
            </div>
          </div>

          {/* Speed & Sea-State Propulsion Simulator */}
          <div className="card p-3.5 space-y-3">
            <h2 className="card-title flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-primary" />
              Transit &amp; Propulsion Parameters
            </h2>

            {/* Speed Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-secondary">Service Speed:</span>
                <span className="text-primary font-bold">{vesselSpeedKnots} Knots</span>
              </div>
              <input
                type="range"
                min="10"
                max="22"
                step="0.5"
                value={vesselSpeedKnots}
                onChange={(e) => setVesselSpeedKnots(Number(e.target.value))}
                className="w-full h-1.5 bg-background-secondary rounded appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-ink-muted font-mono">
                <span>10 kts (Eco)</span>
                <span>14 kts (Design)</span>
                <span>22 kts (Express)</span>
              </div>
            </div>

            {/* Weather Buffer Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-secondary">Weather &amp; Swell Margin:</span>
                <span className="text-status-warning font-bold">+{weatherFactorPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={weatherFactorPct}
                onChange={(e) => setWeatherFactorPct(Number(e.target.value))}
                className="w-full h-1.5 bg-background-secondary rounded appearance-none cursor-pointer accent-status-warning"
              />
            </div>

            {/* Calculated Metrics */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
              <div className="p-2 rounded bg-background-secondary border border-border">
                <div className="text-[10px] text-ink-secondary flex items-center gap-1 uppercase">
                  <Clock className="w-3 h-3 text-primary" /> Steaming Time
                </div>
                <div className="text-sm font-bold text-ink mt-0.5">{calculatedTransitDays} Days</div>
              </div>

              <div className="p-2 rounded bg-background-secondary border border-border">
                <div className="text-[10px] text-ink-secondary flex items-center gap-1 uppercase">
                  <Fuel className="w-3 h-3 text-status-warning" /> Bunker (VLSFO)
                </div>
                <div className="text-sm font-bold text-ink mt-0.5">{estimatedFuelMt} MT</div>
              </div>
            </div>
          </div>

          {/* Notice to Mariners & Route Risk Profile */}
          <div className="card p-3.5 space-y-2">
            <h3 className="card-title flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-status-warning" />
              Notice to Mariners &amp; Risk Profile
            </h3>
            <div className="space-y-1.5">
              {currentRoute.risks.map((risk, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-ink-secondary p-2 rounded bg-background-secondary border border-border"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-status-warning shrink-0 mt-0.5" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: 3D Maritime Globe & Analytical Inspection Drawer (8 cols) */}
        <div className="xl:col-span-8 flex flex-col space-y-3.5">
          {/* Main 3D Globe Component */}
          <div className="card p-2 flex-1 flex flex-col min-h-[500px] h-[550px] relative overflow-hidden">
            <MaritimeGlobe
              ports={mockPorts}
              selectedPortId={destPortId}
              onSelectPort={handleSelectPortFromMap}
              activeRoute={currentRoute}
              onSelectChokepoint={(cp) => setInspectedChokepoint(cp)}
              onSelectVessel={(v) => setInspectedVessel(v)}
            />
          </div>

          {/* Port Analytical Inspection Drawer (Opens when port is clicked) */}
          {inspectedPort && (
            <div className="card p-3.5 border-l-4 border-l-primary animate-fadeIn">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-primary" />
                  <div>
                    <h3 className="text-xs font-bold text-ink font-mono uppercase">
                      PORT INSPECTION: {inspectedPort.name} ({inspectedPort.country})
                    </h3>
                    <p className="text-[10px] text-ink-secondary font-mono">
                      Navigational Clearance &amp; Berthing Feasibility Analysis
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectedPort(null)}
                  className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-elevated"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono pt-1">
                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Max Permissible Draft</span>
                  <span className="text-sm font-bold text-primary">{inspectedPort.maxDraftMeters} m</span>
                </div>

                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Congestion Index</span>
                  <span
                    className={`text-sm font-bold ${
                      inspectedPort.congestionIndex > 0.6 ? 'text-status-red' : 'text-status-green'
                    }`}
                  >
                    {(inspectedPort.congestionIndex * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Panamax Feasibility</span>
                  <span className="text-sm font-bold text-status-green">ELIGIBLE (&lt; 14.5m)</span>
                </div>

                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Capesize (18m Draft)</span>
                  <span
                    className={`text-sm font-bold ${
                      inspectedPort.maxDraftMeters >= 18.0 ? 'text-status-green' : 'text-status-red'
                    }`}
                  >
                    {inspectedPort.maxDraftMeters >= 18.0 ? 'CLEARED' : 'DRAFT INFEASIBLE'}
                  </span>
                </div>
              </div>

              {/* Notice for Sandheads / Haldia / Paradip */}
              {inspectedPort.id === 'port-haldia' && (
                <div className="mt-2.5 p-2 rounded bg-status-warning/10 border border-status-warning/30 text-[11px] font-mono text-status-warning flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Hooghly River 8.5m draft restriction: Deep-draft bulk carriers must lighter cargo at Sagar-Sandheads anchorage prior to dock entry.
                  </span>
                </div>
              )}

              {inspectedPort.id === 'port-paradip' && (
                <div className="mt-2.5 p-2 rounded bg-primary/10 border border-primary/30 text-[11px] font-mono text-ink flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>
                    Paradip approach channel accommodates Kamsarmax (82k DWT) and Panamax bulk carriers. Fully laden Capesize requires offshore transshipment.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Strategic Chokepoint Inspection Drawer */}
          {inspectedChokepoint && (
            <div className="card p-3.5 border-l-4 border-l-status-warning animate-fadeIn">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-status-warning" />
                  <div>
                    <h3 className="text-xs font-bold text-ink font-mono uppercase">
                      STRATEGIC CHOKEPOINT: {inspectedChokepoint.name}
                    </h3>
                    <p className="text-[10px] text-ink-secondary font-mono">
                      Maritime Security &amp; Canal Passage Telemetry
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectedChokepoint(null)}
                  className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-elevated"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-ink-secondary mb-2.5 leading-relaxed">
                {inspectedChokepoint.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Draft Limit</span>
                  <span className="text-sm font-bold text-ink">{inspectedChokepoint.maxDraftMeters} m</span>
                </div>
                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Traffic Density</span>
                  <span className="text-sm font-bold text-status-warning">{inspectedChokepoint.trafficVolume}</span>
                </div>
                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Daily Transits</span>
                  <span className="text-sm font-bold text-ink">{inspectedChokepoint.dailyTransits} Ships/Day</span>
                </div>
                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Operational Status</span>
                  <span className="text-sm font-bold text-status-warning">{inspectedChokepoint.operationalStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* Demo Vessel Position Drawer */}
          {inspectedVessel && (
            <div className="card p-3.5 border-l-4 border-l-emerald-500 animate-fadeIn">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Ship className="w-4 h-4 text-emerald-500" />
                  <div>
                    <h3 className="text-xs font-bold text-ink font-mono uppercase">
                      {inspectedVessel.vesselName} ({inspectedVessel.imoNumber})
                    </h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                      ● {inspectedVessel.dataSourceLabel} · {inspectedVessel.vesselClass}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectedVessel(null)}
                  className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-elevated"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Voyage Routing</span>
                  <span className="text-xs font-bold text-ink truncate block">
                    {inspectedVessel.origin} → {inspectedVessel.destination}
                  </span>
                </div>
                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Speed &amp; Heading</span>
                  <span className="text-xs font-bold text-primary">
                    {inspectedVessel.speedKnots} kts @ {inspectedVessel.headingDegrees}°
                  </span>
                </div>
                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Manifest Payload</span>
                  <span className="text-xs font-bold text-ink truncate block">
                    {inspectedVessel.cargoTonnage.toLocaleString()} MT {inspectedVessel.cargo}
                  </span>
                </div>
                <div className="p-2 rounded bg-background-secondary border border-border">
                  <span className="text-[9px] text-ink-muted uppercase block">Telemetry Integrity</span>
                  <span className="text-xs font-bold text-emerald-500">SIMULATED DEMO</span>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-ink-muted font-mono flex items-center gap-1.5">
                <Info className="w-3 h-3 text-ink-muted flex-shrink-0" />
                <span>{inspectedVessel.disclaimer}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
