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
    if (ratioPercent < 50) return '#82e66f'; // lime
    if (ratioPercent <= 80) return '#ffd23f'; // yellow
    return '#f364cb'; // pink
  }, [ratioPercent]);

  // SVG dimensions
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const strokeW = size * 0.12;
  const r = (size - strokeW * 2) / 2 - 4;

  // Arc helpers
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPoint = (angleDeg: number) => ({
    x: cx + r * Math.cos(degToRad(angleDeg)),
    y: cy + r * Math.sin(degToRad(angleDeg)),
  });

  // Background track: full 180° arc
  const trackStart = arcPoint(180);
  const trackEnd = arcPoint(0);
  const trackPath = [
    `M ${trackStart.x.toFixed(2)},${trackStart.y.toFixed(2)}`,
    `A ${r} ${r} 0 0 1 ${trackEnd.x.toFixed(2)},${trackEnd.y.toFixed(2)}`,
  ].join(' ');

  // Fill arc
  const fillAngle = 180 + ratio * 180;
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
        {/* Background track black outline */}
        <path
          d={trackPath}
          fill="none"
          stroke="#000000"
          strokeWidth={strokeW + 6}
          strokeLinecap="square"
        />

        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#e1e1d8"
          strokeWidth={strokeW}
          strokeLinecap="square"
        />

        {/* Fill arc */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeW}
            strokeLinecap="square"
          />
        )}

        {/* Center Text: value */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="auto"
          fill="#000000"
          fontSize={size * 0.16}
          fontWeight={700}
          fontFamily="'Space Grotesk', monospace"
        >
          {valueText}
        </text>

        {/* Center Text: cap label */}
        <text
          x={cx}
          y={cy + size * 0.045}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="#4a4a46"
          fontSize={size * 0.082}
          fontFamily="'Space Grotesk', monospace"
          fontWeight={600}
        >
          {capText}
        </text>

        {/* Left label "0%" */}
        <text
          x={trackStart.x - 6}
          y={trackStart.y + 4}
          textAnchor="end"
          fill="#000000"
          fontSize={size * 0.075}
          fontWeight={700}
          fontFamily="'Space Grotesk', monospace"
        >
          0%
        </text>

        {/* Right label = cap */}
        <text
          x={trackEnd.x + 6}
          y={trackEnd.y + 4}
          textAnchor="start"
          fill="#000000"
          fontSize={size * 0.075}
          fontWeight={700}
          fontFamily="'Space Grotesk', monospace"
        >
          {formatPct(capPct)}
        </text>
      </svg>

      {label && (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#000000',
            marginTop: '0.5rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default RiskGauge;
