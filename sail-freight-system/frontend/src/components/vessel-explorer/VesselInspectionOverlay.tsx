// ─────────────────────────────────────────────────────────────
// components/vessel-explorer/VesselInspectionOverlay.tsx
// Technical HUD overlay for commercial 3D naval architecture viewer
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Layers, Eye, RefreshCw, Box, Compass, Sliders, Shield } from 'lucide-react';
import { VesselSubsystem, VisualRenderMode, SUBSYSTEMS } from './VesselTypes';

interface VesselInspectionOverlayProps {
  vesselClass: string;
  dwt: number;
  draft: number;
  beam: number;
  lengthOverall: number;
  speedKnots?: number;
  activeSubsystem: VesselSubsystem;
  onSelectSubsystem: (s: VesselSubsystem) => void;
  visualMode: VisualRenderMode;
  onChangeVisualMode: (m: VisualRenderMode) => void;
  explodedProgress: number;
  onChangeExplodedProgress: (val: number) => void;
  showWaterline: boolean;
  onToggleWaterline: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetCamera: () => void;
  onSetCameraPreset: (view: 'threeQuarter' | 'profile' | 'plan' | 'stern') => void;
}

export const VesselInspectionOverlay: React.FC<VesselInspectionOverlayProps> = ({
  vesselClass,
  dwt,
  draft,
  beam,
  lengthOverall,
  speedKnots = 14.0,
  activeSubsystem,
  onSelectSubsystem,
  visualMode,
  onChangeVisualMode,
  explodedProgress,
  onChangeExplodedProgress,
  showWaterline,
  onToggleWaterline,
  autoRotate,
  onToggleAutoRotate,
  onResetCamera,
  onSetCameraPreset,
}) => {
  const currentSubsystem = SUBSYSTEMS.find((s) => s.id === activeSubsystem) || SUBSYSTEMS[0]!;

  return (
    <>
      {/* Top Bar: Technical Telemetry HUD */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded border border-border text-xs font-mono shadow-sm">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="font-bold text-ink tracking-tight uppercase">{vesselClass}</span>
          <span className="text-ink-muted">|</span>
          <span className="text-ink-secondary">LOA: {lengthOverall || 225}m</span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink-secondary">BEAM: {beam || 32.2}m</span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink-secondary">DRAFT: {draft.toFixed(1)}m</span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink-secondary">SPEED: {speedKnots.toFixed(1)}kts</span>
          <span className="text-ink-muted">·</span>
          <span className="text-primary font-semibold">
            {dwt >= 1000 ? `${(dwt / 1000).toFixed(0)}k DWT` : `${dwt} DWT`}
          </span>
        </div>

        {/* Render Mode Switcher: Solid / X-Ray / Wireframe */}
        <div className="flex items-center gap-1 pointer-events-auto bg-surface/90 backdrop-blur-md p-1 rounded border border-border text-xs">
          <button
            onClick={() => onChangeVisualMode('solid')}
            className={`px-2.5 py-1 rounded transition-colors font-mono flex items-center gap-1.5 ${
              visualMode === 'solid'
                ? 'bg-primary text-white font-semibold'
                : 'text-ink-secondary hover:text-ink'
            }`}
            title="Standard PBR commercial ship materials"
          >
            <Box className="w-3 h-3" />
            SOLID
          </button>
          <button
            onClick={() => onChangeVisualMode('xray')}
            className={`px-2.5 py-1 rounded transition-colors font-mono flex items-center gap-1.5 ${
              visualMode === 'xray'
                ? 'bg-primary text-white font-semibold'
                : 'text-ink-secondary hover:text-ink'
            }`}
            title="Translucent outer hull exposing internal cargo holds, ballast tanks, and engine room"
          >
            <Layers className="w-3 h-3" />
            X-RAY
          </button>
          <button
            onClick={() => onChangeVisualMode('wireframe')}
            className={`px-2.5 py-1 rounded transition-colors font-mono flex items-center gap-1.5 ${
              visualMode === 'wireframe'
                ? 'bg-primary text-white font-semibold'
                : 'text-ink-secondary hover:text-ink'
            }`}
            title="Structural wireframe mesh"
          >
            <Eye className="w-3 h-3" />
            WIRE
          </button>
        </div>
      </div>

      {/* Floating Subsystem Quick Selector (Top-Left under Title) */}
      <div className="absolute top-14 left-3 pointer-events-auto max-w-xs space-y-1.5">
        <div className="bg-surface/95 backdrop-blur-md p-2 rounded border border-border shadow-md space-y-1.5">
          <div className="flex items-center justify-between text-[11px] border-b border-border pb-1">
            <span className="font-mono text-ink-muted flex items-center gap-1">
              <Shield className="w-3 h-3 text-primary" />
              SUBSYSTEM TARGETING
            </span>
            <span className="font-mono text-[10px] text-primary uppercase">{currentSubsystem.category}</span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
            {SUBSYSTEMS.map((sub) => {
              const isSelected = activeSubsystem === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => onSelectSubsystem(sub.id)}
                  className={`px-1.5 py-1 rounded text-center truncate transition-colors ${
                    isSelected
                      ? 'bg-primary text-white font-semibold shadow-xs'
                      : 'bg-background-secondary text-ink-secondary hover:text-ink hover:bg-surface-elevated'
                  }`}
                  title={sub.description}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>

          {activeSubsystem !== 'all' && (
            <div className="text-[10px] text-ink-secondary pt-1 border-t border-border/60 leading-tight">
              <span className="font-semibold text-ink">{currentSubsystem.name}: </span>
              {currentSubsystem.description}
              <div className="mt-1 font-mono text-[9px] text-primary">
                {currentSubsystem.telemetry}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camera Presets & Exploded View Slider (Bottom Control Bar) */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
        {/* Exploded View Slider */}
        <div className="flex items-center gap-2.5 pointer-events-auto bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded border border-border text-xs font-mono shadow-sm">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span className="text-ink-secondary text-[11px]">EXPLODED VIEW:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={explodedProgress}
            onChange={(e) => onChangeExplodedProgress(parseFloat(e.target.value))}
            className="w-24 sm:w-32 h-1.5 bg-background-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            title="Physically separate hull, deck, holds, superstructure, ballast, and engine"
          />
          <span className="w-8 text-right font-semibold text-ink text-[11px]">
            {Math.round(explodedProgress * 100)}%
          </span>
        </div>

        {/* Camera Views & Waterline Toggle */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-surface/90 backdrop-blur-md p-1 rounded border border-border text-xs font-mono">
          <button
            onClick={() => onSetCameraPreset('threeQuarter')}
            className="px-2 py-1 rounded text-ink-secondary hover:text-ink hover:bg-surface-elevated transition-colors text-[10px]"
            title="3/4 Elevated Isometric Port Bow"
          >
            3/4 VIEW
          </button>
          <button
            onClick={() => onSetCameraPreset('profile')}
            className="px-2 py-1 rounded text-ink-secondary hover:text-ink hover:bg-surface-elevated transition-colors text-[10px]"
            title="Direct Port Beam Profile"
          >
            PROFILE
          </button>
          <button
            onClick={() => onSetCameraPreset('plan')}
            className="px-2 py-1 rounded text-ink-secondary hover:text-ink hover:bg-surface-elevated transition-colors text-[10px]"
            title="Top-Down Weather Deck Plan"
          >
            PLAN
          </button>
          <button
            onClick={() => onSetCameraPreset('stern')}
            className="px-2 py-1 rounded text-ink-secondary hover:text-ink hover:bg-surface-elevated transition-colors text-[10px]"
            title="Aft Superstructure & Engine View"
          >
            STERN
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <button
            onClick={onToggleWaterline}
            className={`px-2 py-1 rounded text-[10px] transition-colors ${
              showWaterline
                ? 'text-primary font-semibold bg-primary/10'
                : 'text-ink-muted hover:text-ink'
            }`}
            title="Toggle Waterline Surface Plane"
          >
            WL 0.0M
          </button>

          <button
            onClick={onToggleAutoRotate}
            className={`px-2 py-1 rounded text-[10px] transition-colors flex items-center gap-1 ${
              autoRotate
                ? 'text-primary font-semibold bg-primary/10'
                : 'text-ink-muted hover:text-ink'
            }`}
            title="Toggle Continuous Slow Rotation"
          >
            <Compass className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} />
            ROTATE
          </button>

          <button
            onClick={onResetCamera}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-elevated transition-colors"
            title="Reset Camera to Standard Inspection Angle"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};
