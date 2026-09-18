// ─────────────────────────────────────────────────────────────
// components/StatusBadge.tsx
// Reusable status badge — color + text label, never color-only.
// Used across ForecastPanel (volatility), RiskPanel (overall risk),
// VesselFeasibilityPanel (feasible/infeasible rows).
// ─────────────────────────────────────────────────────────────

import type { RiskLevel, VolatilityLevel } from '@/types/charter'

type BadgeLevel = RiskLevel | VolatilityLevel  // 'low' | 'medium' | 'high'

interface StatusBadgeProps {
  level: BadgeLevel
  /** Override the auto-generated label (e.g. "Feasible", "Infeasible"). */
  label?: string
  size?: 'sm' | 'md'
}

const CONFIG: Record<BadgeLevel, { dot: string; text: string; container: string; defaultLabel: string }> = {
  low:    { dot: 'bg-status-green',  text: 'text-status-green',  container: 'bg-status-green-bg  border border-status-green-border',  defaultLabel: 'Low'    },
  medium: { dot: 'bg-status-amber',  text: 'text-status-amber',  container: 'bg-status-amber-bg  border border-status-amber-border',  defaultLabel: 'Medium' },
  high:   { dot: 'bg-status-red',    text: 'text-status-red',    container: 'bg-status-red-bg    border border-status-red-border',    defaultLabel: 'High'   },
}

export default function StatusBadge({ level, label, size = 'sm' }: StatusBadgeProps) {
  const cfg = CONFIG[level]
  const textSize = size === 'md' ? 'text-sm' : 'text-xs'
  const dotSize  = size === 'md' ? 'w-2 h-2'  : 'w-1.5 h-1.5'
  const padding  = size === 'md' ? 'px-2 py-1' : 'px-1.5 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${textSize} ${padding} ${cfg.container} ${cfg.text}`}
      role="status"
      aria-label={`Status: ${label ?? cfg.defaultLabel}`}
    >
      <span className={`rounded-full flex-shrink-0 ${dotSize} ${cfg.dot}`} aria-hidden="true" />
      {label ?? cfg.defaultLabel}
    </span>
  )
}
