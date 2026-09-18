// ─────────────────────────────────────────────────────────────
// components/vessel-explorer/VesselExplorer.tsx
// Commercial Maritime Vessel Intelligence & Technical Workstation
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Ship, CheckCircle2, XCircle, AlertTriangle, Gauge, Compass, Sliders, Layers, Box, Cpu, Info } from 'lucide-react';
import { mockVessels } from '../../data/mockVessels';
import { Vessel3DViewer } from './Vessel3DViewer';
import { VesselClass } from '../../types';
import { VesselSubsystem, VisualRenderMode, SUBSYSTEMS } from './VesselTypes';

export default function VesselExplorer() {
  const initialVessel = mockVessels[0] as VesselClass;
  const [selectedVessel, setSelectedVessel] = useState<VesselClass>(initialVessel);
  const [simulatedCargoMt, setSimulatedCargoMt] = useState<number>(initialVessel.capacityTonnes * 0.85);
  const [simulatedSpeedKnots, setSimulatedSpeedKnots] = useState<number>(initialVessel.avgSpeedKnots || 14.0);

  // Technical 3D Inspection States
  const [activeSubsystem, setActiveSubsystem] = useState<VesselSubsystem>('all');
  const [visualMode, setVisualMode] = useState<VisualRenderMode>('solid');
  const [explodedProgress, setExplodedProgress] = useState<number>(0);

  const handleSelectVessel = (v: VesselClass) => {
    setSelectedVessel(v);
    setSimulatedCargoMt(Math.round(v.capacityTonnes * 0.85));
    setSimulatedSpeedKnots(v.avgSpeedKnots || 14.0);
    setActiveSubsystem('all');
  };

  // Canal checks
  const isPanamaEligible = (selectedVessel.beamMeters || 32.2) <= 32.31 && (selectedVessel.lengthMeters || 225) <= 294.13;
  const isSuezEligible = selectedVessel.maxDraftMeters <= 20.1;
  const isMalaccaEligible = selectedVessel.maxDraftMeters <= 20.5;

  // Cargo capacity simulation calculation
  const loadPercentage = Math.round((simulatedCargoMt / selectedVessel.capacityTonnes) * 100);
  const estimatedDraft = Number(
    (selectedVessel.maxDraftMeters * 0.45 + (simulatedCargoMt / selectedVessel.capacityTonnes) * (selectedVessel.maxDraftMeters * 0.55)).toFixed(2)
  );
  const isOverweight = simulatedCargoMt > selectedVessel.capacityTonnes;

  const currentSubsystemInfo = SUBSYSTEMS.find((s) => s.id === activeSubsystem) || SUBSYSTEMS[0]!;

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-3.5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ship className="w-4 h-4 text-primary" />
            <h1 className="text-base font-bold text-ink tracking-normal">
              Vessel Intelligence &amp; 3D Hydrodynamic Inspection
            </h1>
          </div>
          <p className="text-xs text-ink-secondary">
            Parametric naval architecture inspection, cargo hold volumetrics, machinery compartments, and canal clearances.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-ink-muted">CARRIER FLEET:</span>
          <span className="text-primary font-semibold px-2 py-0.5 rounded bg-surface border border-border">
            {mockVessels.length} COMMERCIAL CLASSES
          </span>
        </div>
      </div>

      {/* Main Grid: Selector, 3D Canvas, Technical Specs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Left Column: Vessel Class Library (3 cols) */}
        <div className="xl:col-span-3 space-y-3.5">
          <div className="card p-3">
            <h2 className="card-title mb-2.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-primary" />
              Carrier Classes
            </h2>
            <div className="space-y-1.5">
              {mockVessels.map((vessel) => {
                const isSelected = vessel.id === selectedVessel.id;
                return (
                  <button
                    key={vessel.id}
                    onClick={() => handleSelectVessel(vessel)}
                    className={`w-full text-left p-2.5 rounded border transition-colors ${
                      isSelected
                        ? 'bg-surface-elevated border-primary text-ink font-semibold'
                        : 'bg-background-secondary border-border text-ink-secondary hover:text-ink hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-mono text-xs ${isSelected ? 'text-primary font-bold' : 'text-ink'}`}>
                        {vessel.className}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-ink-muted">
                        {vessel.capacityTonnes >= 1000 ? `${(vessel.capacityTonnes / 1000).toFixed(0)}k DWT` : `${vessel.capacityTonnes} DWT`}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-secondary line-clamp-2 leading-relaxed">
                      {vessel.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Canal Compatibility Matrix */}
          <div className="card p-3 space-y-2">
            <h3 className="card-title text-[11px]">Chokepoint Transit Verification</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-background-secondary border border-border">
                <span className="text-ink-secondary">Panama Locks (Original)</span>
                {isPanamaEligible ? (
                  <span className="inline-flex items-center gap-1 text-status-green font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ELIGIBLE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-status-red font-semibold">
                    <XCircle className="w-3.5 h-3.5" /> EXCEEDS BEAM
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-background-secondary border border-border">
                <span className="text-ink-secondary">Suez Canal (&lt; 20.1m)</span>
                {isSuezEligible ? (
                  <span className="inline-flex items-center gap-1 text-status-green font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ELIGIBLE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-status-warning font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> DRAFT LIMIT
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-background-secondary border border-border">
                <span className="text-ink-secondary">Strait of Malacca (&lt; 20.5m)</span>
                {isMalaccaEligible ? (
                  <span className="inline-flex items-center gap-1 text-status-green font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ELIGIBLE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-status-red font-semibold">
                    <XCircle className="w-3.5 h-3.5" /> MALACCAMAX
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center: High-Fidelity 3D Viewport (6 cols) */}
        <div className="xl:col-span-6 flex flex-col h-[600px]">
          <Vessel3DViewer
            vesselClass={selectedVessel.className}
            dwt={selectedVessel.capacityTonnes}
            draft={estimatedDraft}
            designDraft={selectedVessel.maxDraftMeters}
            beam={selectedVessel.beamMeters || 32.2}
            lengthOverall={selectedVessel.lengthMeters || 225}
            speedKnots={simulatedSpeedKnots}
            payloadMt={simulatedCargoMt}
            activeSubsystem={activeSubsystem}
            onSelectSubsystem={setActiveSubsystem}
            visualMode={visualMode}
            onChangeVisualMode={setVisualMode}
            explodedProgress={explodedProgress}
            onChangeExplodedProgress={setExplodedProgress}
          />
        </div>

        {/* Right Column: Technical Subsystems & Inspection Telemetry (3 cols) */}
        <div className="xl:col-span-3 space-y-3.5">
          {/* Subsystem Inspection Targeting */}
          <div className="card p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="card-title flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Engineering Subsystems
              </h3>
              <span className="text-[10px] font-mono text-primary font-semibold uppercase">
                {activeSubsystem}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              {SUBSYSTEMS.map((sub) => {
                const isSelected = activeSubsystem === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setActiveSubsystem(sub.id);
                      if (sub.id !== 'all' && visualMode === 'solid') {
                        setVisualMode('xray'); // Automatically switch to X-ray to reveal internal component
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded border text-left transition-colors ${
                      isSelected
                        ? 'bg-primary text-white border-primary font-semibold'
                        : 'bg-background-secondary border-border text-ink-secondary hover:text-ink hover:border-border-hover'
                    }`}
                  >
                    <div className="text-[10px] uppercase opacity-75">{sub.category}</div>
                    <div className="text-xs truncate">{sub.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Selected Subsystem Description Box */}
            <div className="p-2.5 rounded bg-background-secondary border border-border space-y-1 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-ink font-semibold">{currentSubsystemInfo.name}</span>
                <span className="text-[10px] text-primary">{currentSubsystemInfo.telemetry}</span>
              </div>
              <p className="text-[11px] text-ink-secondary leading-relaxed">
                {currentSubsystemInfo.description}
              </p>
            </div>
          </div>

          {/* Engineering Dimensions */}
          <div className="card p-3.5 space-y-2.5">
            <h3 className="card-title flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-primary" />
              Naval Architecture Parameters
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-background-secondary border border-border">
                <div className="text-[10px] text-ink-secondary uppercase tracking-wider">Length (LOA)</div>
                <div className="text-xs font-bold text-ink mt-0.5">{(selectedVessel.lengthMeters || 225).toFixed(0)} m</div>
              </div>

              <div className="p-2 rounded bg-background-secondary border border-border">
                <div className="text-[10px] text-ink-secondary uppercase tracking-wider">Molded Beam</div>
                <div className="text-xs font-bold text-ink mt-0.5">{(selectedVessel.beamMeters || 32.2).toFixed(1)} m</div>
              </div>

              <div className="p-2 rounded bg-background-secondary border border-border">
                <div className="text-[10px] text-ink-secondary uppercase tracking-wider">Scantling Draft</div>
                <div className="text-xs font-bold text-primary mt-0.5">{selectedVessel.maxDraftMeters.toFixed(1)} m</div>
              </div>

              <div className="p-2 rounded bg-background-secondary border border-border">
                <div className="text-[10px] text-ink-secondary uppercase tracking-wider">Service Speed</div>
                <div className="text-xs font-bold text-ink mt-0.5">{selectedVessel.avgSpeedKnots.toFixed(1)} kts</div>
              </div>
            </div>
          </div>

          {/* Real-time Draft & Payload Loading Simulator */}
          <div className="card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="card-title flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                Hydrodynamic Load Simulator
              </h3>
              <span className={`text-xs font-mono font-bold ${isOverweight ? 'text-status-red' : 'text-primary'}`}>
                {loadPercentage}% DWT
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-secondary">Cargo Tonnage:</span>
                <span className="text-ink font-semibold">{simulatedCargoMt.toLocaleString()} MT</span>
              </div>
              <input
                type="range"
                min={Math.round(selectedVessel.capacityTonnes * 0.2)}
                max={Math.round(selectedVessel.capacityTonnes * 1.2)}
                step={500}
                value={simulatedCargoMt}
                onChange={(e) => setSimulatedCargoMt(Number(e.target.value))}
                className="w-full h-1.5 bg-background-secondary rounded appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Dynamic Calculated Results */}
            <div className="p-2 rounded bg-background-secondary border border-border space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Operating Draft:</span>
                <span className={`font-bold ${estimatedDraft > selectedVessel.maxDraftMeters ? 'text-status-red' : 'text-primary'}`}>
                  {estimatedDraft} m / {selectedVessel.maxDraftMeters} m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Classification:</span>
                {isOverweight ? (
                  <span className="text-status-red font-semibold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> EXCEEDS DWT LIMIT
                  </span>
                ) : estimatedDraft > selectedVessel.maxDraftMeters ? (
                  <span className="text-status-warning font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> OVERDRAFT RISK
                  </span>
                ) : (
                  <span className="text-status-green font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SEAWORTHY &amp; COMPLIANT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Propulsion & Transit Speed Simulator */}
          <div className="card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="card-title flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-primary" />
                Propulsion &amp; Speed
              </h3>
              <span className="text-xs font-mono font-bold text-primary">
                {simulatedSpeedKnots.toFixed(1)} KTS
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-secondary">Engine Output:</span>
                <span className="text-ink font-semibold">
                  {Math.min(110, Math.round((simulatedSpeedKnots / (selectedVessel.avgSpeedKnots || 14.0)) * 85))}% MCR
                </span>
              </div>
              <input
                type="range"
                min={8.0}
                max={Math.max(22.0, Number(((selectedVessel.avgSpeedKnots || 14.0) * 1.35).toFixed(1)))}
                step={0.5}
                value={simulatedSpeedKnots}
                onChange={(e) => setSimulatedSpeedKnots(Number(e.target.value))}
                className="w-full h-1.5 bg-background-secondary rounded appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
