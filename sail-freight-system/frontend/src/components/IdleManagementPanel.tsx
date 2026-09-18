// ─────────────────────────────────────────────────────────────
// components/IdleManagementPanel.tsx
// Expected idle days and alternative employment recommendation.
// ─────────────────────────────────────────────────────────────

import type { IdleManagement } from '@/types/charter'

interface IdleManagementPanelProps {
  data: IdleManagement
}

function idleRatingLabel(days: number): { label: string; color: string } {
  if (days < 1)   return { label: 'Minimal',  color: 'text-status-green' }
  if (days < 3)   return { label: 'Moderate', color: 'text-status-amber' }
  return           { label: 'High',     color: 'text-status-red'   }
}

export default function IdleManagementPanel({ data }: IdleManagementPanelProps) {
  const { label: idleLabel, color: idleColor } = idleRatingLabel(data.expected_idle_days)

  return (
    <div className="card panel-enter flex flex-col" role="region" aria-label="Idle Management">
      <div className="card-header">
        <svg className="w-3.5 h-3.5 text-ink-secondary" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="4" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5" />
          <line x1="5" y1="2" x2="5" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="11" y1="2" x2="11" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="card-title">Idle Management</span>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Expected idle days — hero */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xs text-ink-tertiary uppercase tracking-wide mb-0.5">Expected Idle</p>
            <p className="num-hero">
              {data.expected_idle_days.toFixed(1)}
              <span className="text-sm font-normal text-ink-secondary ml-1">days</span>
            </p>
          </div>
          <span className={`text-sm font-semibold ${idleColor}`} aria-label={`Idle rating: ${idleLabel}`}>
            {idleLabel}
          </span>
        </div>

        <div className="divider" />

        {/* Alternative employment */}
        <div className="flex-1">
          <p className="text-2xs text-ink-tertiary uppercase tracking-wide mb-1">
            Alternative Employment
          </p>
          <div className="rounded bg-primary-muted border border-primary-border p-2">
            <div className="flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1L9 6H14L10 9L12 14L7 11L2 14L4 9L0 6H5L7 1Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-ink leading-snug">{data.alternative_employment}</p>
            </div>
          </div>
        </div>

        {/* Contextual note */}
        <p className="text-xs text-ink-tertiary">
          {data.expected_idle_days < 1
            ? 'Minimal idle time expected — vessel scheduling is tight.'
            : `${data.expected_idle_days.toFixed(1)} idle days present an employment window. Consider the alternative above.`}
        </p>
      </div>
    </div>
  )
}
