import React, { useEffect, useRef } from 'react';

// ─── Contract types (mirrored locally — do NOT import from backend/) ─────────

export interface SSEEvent {
  ts: string;
  type: 'detection' | 'investigation' | 'verification'
      | 'recommendation' | 'execution' | 'learning' | 'info';
  module: 'sentinel' | 'investigator' | 'guardian'
        | 'strategist' | 'policy' | 'executor' | 'learner' | 'orchestrator';
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'danger';
}

// ─── Color maps ───────────────────────────────────────────────────────────────

export const MODULE_COLORS: Record<SSEEvent['module'], string> = {
  sentinel:      '#38bdf8', // cyan  — detection
  investigator:  '#a855f7', // purple — investigation
  guardian:      '#10b981', // green  — verification / safety
  strategist:    '#f59e0b', // amber  — recommendation
  policy:        '#64748b', // muted  — policy check
  executor:      '#f97316', // orange — execution
  learner:       '#06b6d4', // teal   — learning
  orchestrator:  '#e2e8f0', // near-white — orchestrator
};

export const SEVERITY_COLORS: Record<NonNullable<SSEEvent['severity']>, string> = {
  info:    '#38bdf8',
  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
};

// ─── Helper: format ISO → HH:MM:SS ───────────────────────────────────────────

const formatTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toISOString().substring(11, 19);
  } catch {
    return '??:??:??';
  }
};

// ─── Sub-component: single feed row ──────────────────────────────────────────

interface FeedRowProps {
  event: SSEEvent;
  isNewest: boolean;
}

const FeedRow: React.FC<FeedRowProps> = ({ event, isNewest }) => {
  const sevColor = SEVERITY_COLORS[event.severity ?? 'info'];
  const modColor = MODULE_COLORS[event.module];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '62px 90px auto 1fr',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.45rem 0.5rem',
        borderRadius: '0.375rem',
        backgroundColor: isNewest ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderLeft: isNewest ? `2px solid ${sevColor}` : '2px solid transparent',
        transition: 'all 300ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Timestamp */}
      <span
        style={{
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          fontSize: '0.6875rem',
          color: 'var(--text-muted, #64748b)',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}
      >
        {formatTime(event.ts)}
      </span>

      {/* Module pill */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.1rem 0.45rem',
          borderRadius: '9999px',
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono, monospace)',
          backgroundColor: `${modColor}1a`,
          color: modColor,
          border: `1px solid ${modColor}44`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '86px',
        }}
        title={event.module}
      >
        {event.module}
      </span>

      {/* Severity dot */}
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: sevColor,
          boxShadow: `0 0 6px ${sevColor}`,
          flexShrink: 0,
          animation: isNewest ? 'status-pulse 1.8s ease-in-out infinite' : undefined,
        }}
        aria-hidden="true"
      />

      {/* Message text */}
      <span
        style={{
          fontSize: '0.8125rem',
          color: isNewest ? 'var(--text-primary, #f8fafc)' : 'var(--text-secondary, #94a3b8)',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'color 300ms ease',
        }}
        title={event.message}
      >
        {event.message}
      </span>
    </div>
  );
};

// ─── AgentFeed ────────────────────────────────────────────────────────────────

export interface AgentFeedProps {
  events: SSEEvent[];
  maxVisible?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const AgentFeed: React.FC<AgentFeedProps> = ({
  events,
  maxVisible = 8,
  className = '',
  style,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visible = events.slice(0, maxVisible);

  // Auto-scroll to top when new events arrive (newest on top)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

  return (
    <div
      role="region"
      aria-label="Live agent stream"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
      className={`adpilot-agent-feed ${className}`.trim()}
      style={style}
    >
      {visible.length === 0 ? (
        <div
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--text-muted, #64748b)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          Awaiting agent events…
        </div>
      ) : (
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxHeight: '380px',
            overflowY: 'auto',
            overflowX: 'hidden',
            // Hide scrollbar cross-browser
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Inline style for webkit scrollbar hide */}
          <style>{`.adpilot-agent-feed-scroll::-webkit-scrollbar { display: none; }`}</style>

          {visible.map((evt, idx) => (
            <FeedRow
              key={`${evt.ts}-${idx}`}
              event={evt}
              isNewest={idx === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentFeed;
