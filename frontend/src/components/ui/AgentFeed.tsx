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
  sentinel:      '#ffd23f', // yellow — detection
  investigator:  '#78dbf6', // cyan   — investigation
  guardian:      '#82e66f', // lime   — verification / safety
  strategist:    '#f364cb', // pink   — recommendation
  policy:        '#e1e1d8', // gray   — policy check
  executor:      '#82e66f', // lime   — execution
  learner:       '#78dbf6', // cyan   — learning
  orchestrator:  '#e1e1d8', // gray   — orchestrator
};

export const SEVERITY_COLORS: Record<NonNullable<SSEEvent['severity']>, string> = {
  info:    '#78dbf6',
  success: '#82e66f',
  warning: '#ffd23f',
  danger:  '#f364cb',
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
        borderRadius: '0px',
        backgroundColor: isNewest ? '#ffffff' : 'transparent',
        borderBottom: '2px solid #000000',
        borderLeft: isNewest ? '4px solid #82e66f' : '4px solid transparent',
        transition: 'all 150ms ease',
      }}
    >
      {/* Timestamp */}
      <span
        style={{
          fontFamily: "'Space Grotesk', monospace",
          fontSize: '0.6875rem',
          fontWeight: 700,
          color: '#4a4a46',
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
          justifyContent: 'center',
          padding: '0.1rem 0.45rem',
          borderRadius: '0px',
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontFamily: "'Space Grotesk', monospace",
          backgroundColor: modColor,
          color: '#000000',
          border: '2px solid #000000',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '86px',
        }}
        title={event.module}
      >
        {event.module}
      </span>

      {/* Severity dot (10px square) */}
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '0px',
          backgroundColor: sevColor,
          border: '1.5px solid #000000',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      {/* Message text */}
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: isNewest ? 700 : 500,
          color: '#000000',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
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
            padding: '2rem 1.5rem',
            textAlign: 'center',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#000000',
            fontFamily: "'Space Grotesk', monospace",
            textTransform: 'uppercase',
            border: '3px dashed #000000',
            backgroundColor: '#ffffff',
          }}
        >
          AWAITING AGENT ACTIVITY
        </div>
      ) : (
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            maxHeight: '380px',
            overflowY: 'auto',
            overflowX: 'hidden',
            border: '2px solid #000000',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
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
