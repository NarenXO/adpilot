import React, { useMemo } from 'react';

export interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: boolean;
  strokeWidth?: number;
  showDots?: boolean;
  className?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

export const SparkLine: React.FC<SparkLineProps> = ({
  data,
  width = 120,
  height = 32,
  stroke = 'currentColor',
  fill = true,
  strokeWidth = 1.75,
  showDots = false,
  className = '',
  ariaLabel,
  style,
}) => {
  // Stable gradient ID per mount — avoids collisions across multiple sparklines
  const gradientId = useMemo(
    () => `sl-grad-${Math.random().toString(36).substring(2, 9)}`,
    []
  );

  if (!data || data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={ariaLabel ?? 'Sparkline chart (no data)'}
        role="img"
        style={style}
      />
    );
  }

  const padX = 2;
  const padY = strokeWidth + 1;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max === min ? 1 : max - min;

  const points = data.map((val, idx) => {
    const x = padX + (idx / (data.length - 1)) * (width - padX * 2);
    const y = (height - padY) - ((val - min) / range) * (height - padY * 2);
    return { x, y };
  });

  // Straight polyline path (readable, performant)
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');

  // Area fill path: trace line, drop to bottom-right, across to bottom-left
  const areaPath = `${linePath} L${(width - padX).toFixed(2)},${height} L${padX.toFixed(2)},${height} Z`;

  const lastPt = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`adpilot-sparkline ${className}`.trim()}
      style={{ overflow: 'visible', display: 'block', ...style }}
      aria-label={ariaLabel ?? `Sparkline chart with ${data.length} data points`}
      role="img"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {fill && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          strokeLinecap="round"
        />
      )}

      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Most-recent value dot (always shown) */}
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r={strokeWidth + 0.75}
        fill={stroke}
      />

      {/* Optional additional dots on every data point */}
      {showDots &&
        points.slice(0, -1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={stroke} opacity={0.5} />
        ))}
    </svg>
  );
};

export default SparkLine;
