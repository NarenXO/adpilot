import React, { useMemo } from 'react';

export interface RiskGaugeProps {
  usedPct: number;
  capPct: number;
  size?: number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SVG semi-circular arc gauge for risk budget display.
 * Arc sweeps from 9 o'clock (left) to 3 o'clock (right), 180°.
 * Color: <50% of cap → neon green, 50–80% → amber, >80% → red.
 */
export const RiskGauge: React.FC<RiskGaugeProps> = ({
  usedPct,
  capPct,
  size = 180,
  label,
  className = '',
  style,
}) => {
  const gradientId = useMemo(
    () => `rg-grad-${Math.random().toString(36).substring(2, 9)}`,
    []
  );

  const ratio = capPct > 0 ? Math.min(Math.max(usedPct / capPct, 0), 1) : 0;
  const ratioPercent = ratio * 100;

  // Color by ratio threshold
  const fillColor = useMemo(() => {
    if (ratioPercent < 50) return '#10b981'; // neon green
    if (ratioPercent <= 80) return '#f59e0b'; // amber
    return '#ef4444'; // red
  }, [ratioPercent]);

  const glowColor = useMemo(() => {
    if (ratioPercent < 50) return 'rgba(16, 185, 129, 0.45)';
    if (ratioPercent <= 80) return 'rgba(245, 158, 11, 0.45)';
    return 'rgba(239, 68, 68, 0.45)';
  }, [ratioPercent]);

  // SVG dimensions
  const cx = size / 2;
  const cy = size / 2 + size * 0.05; // push center down slightly so text fits
  const strokeW = size * 0.1;
  const r = (size - strokeW * 2) / 2 - 4;

  // Arc helpers — semi-circle from 180° to 0° (left to right)
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPoint = (angleDeg: number) => ({
    x: cx + r * Math.cos(degToRad(angleDeg)),
    y: cy + r * Math.sin(degToRad(angleDeg)),
  });

  const startAngle = 180; // left
  const endAngle = 0;     // right (going counter-clockwise by design feels wrong; use sweep via fill angle)

  // Background track: full 180° arc
  const trackStart = arcPoint(180);
  const trackEnd = arcPoint(0);
  const trackPath = [
    `M ${trackStart.x.toFixed(2)},${trackStart.y.toFixed(2)}`,
    `A ${r} ${r} 0 0 1 ${trackEnd.x.toFixed(2)},${trackEnd.y.toFixed(2)}`,
  ].join(' ');

  // Fill arc: 0 to ratio × 180° sweep, starting from left (180°)
  const fillAngle = 180 + ratio * 180; // from 180° sweeping towards 360°=0°
  const fillEnd = arcPoint(fillAngle > 360 ? fillAngle - 360 : fillAngle);
  const largeArc = ratio > 0.5 ? 1 : 0;

  const fillPath =
    ratio <= 0
      ? null
      : [
          `M ${trackStart.x.toFixed(2)},${trackStart.y.toFixed(2)}`,
          `A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x.toFixed(2)},${fillEnd.y.toFixed(2)}`,
        ].join(' ');

  // Format display values
  const formatPct = (v: number) => {
    if (Number.isInteger(v)) return `${v}%`;
    return `${v.toFixed(1)}%`;
  };

  const valueText = formatPct(usedPct);
  const capText = `of ${formatPct(capPct)} cap`;

  return (
    <div
      className={`adpilot-risk-gauge ${className}`.trim()}
      role="meter"
      aria-valuenow={usedPct}
      aria-valuemin={0}
      aria-valuemax={capPct}
      aria-label={label ?? `Risk budget: ${valueText} used of ${capText}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: size,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size * 0.6}
        viewBox={`0 0 ${size} ${cy + strokeW / 2 + 4}`}
        style={{ overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          <filter id={gradientId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={strokeW * 0.6} result="blur" />
          </filter>
        </defs>

        {/* Glow layer under fill */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            opacity={0.3}
            filter={`url(#${gradientId})`}
          />
        )}

        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 ${strokeW * 0.4}px ${glowColor})`,
            }}
          />
        )}

        {/* Cap tick mark */}
        {(() => {
          const capAngle = 180 + (1.0) * 180;
          const inner = { x: cx + (r - strokeW / 2) * Math.cos(degToRad(capAngle)), y: cy + (r - strokeW / 2) * Math.sin(degToRad(capAngle)) };
          const outer = { x: cx + (r + strokeW / 2) * Math.cos(degToRad(capAngle)), y: cy + (r + strokeW / 2) * Math.sin(degToRad(capAngle)) };
          return (
            <line
              x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
              x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.5}
            />
          );
        })()}

        {/* Center Text: value */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="auto"
          fill="var(--text-primary, #f8fafc)"
          fontSize={size * 0.155}
          fontWeight={700}
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          letterSpacing="-0.02em"
        >
          {valueText}
        </text>

        {/* Center Text: cap label */}
        <text
          x={cx}
          y={cy + size * 0.045}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="var(--text-muted, #64748b)"
          fontSize={size * 0.082}
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
        >
          {capText}
        </text>

        {/* Left label "0%" */}
        <text
          x={trackStart.x - 4}
          y={trackStart.y + 2}
          textAnchor="end"
          fill="var(--text-muted, #64748b)"
          fontSize={size * 0.07}
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
        >
          0%
        </text>

        {/* Right label = cap */}
        <text
          x={trackEnd.x + 4}
          y={trackEnd.y + 2}
          textAnchor="start"
          fill="var(--text-muted, #64748b)"
          fontSize={size * 0.07}
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
        >
          {formatPct(capPct)}
        </text>
      </svg>

      {label && (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--text-secondary, #94a3b8)',
            marginTop: '0.25rem',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default RiskGauge;
