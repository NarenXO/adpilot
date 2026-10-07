import React, { useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

class CurveErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Response curve chart caught rendering error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ background: '#ffffff', border: '3px solid #000000', boxShadow: '4px 4px 0px #000000', borderRadius: '10px', padding: '24px', textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", color: '#4a4a4a', fontSize: '12px', fontWeight: 700 }}>
          Unable to render response curve chart.
        </div>
      );
    }
    return this.props.children;
  }
}

export interface CurvePointData {
  spend: number;
  revenue_low: number;
  revenue_mid: number;
  revenue_high: number;
}

export interface ResponseCurveProps {
  campaignId: string;
  sku?: string;
  dataPoints: CurvePointData[];
  currentSpend: number;
  recommendedSpend: number;
  opportunityScore?: number;
  height?: string;
}

export const ResponseCurve: React.FC<ResponseCurveProps> = ({
  campaignId,
  sku,
  dataPoints = [],
  currentSpend,
  recommendedSpend,
  opportunityScore,
  height = '320px',
}) => {
  // Empty state handling
  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div
        style={{
          height,
          background: '#ffffff',
          border: '3px solid #000000',
          boxShadow: '4px 4px 0px #000000',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#000000', marginBottom: '6px' }}>No Response Curve Available</div>
        <p style={{ fontSize: '12px', color: '#666666', fontWeight: 600, margin: 0 }}>
          Insufficient ad performance data to fit the Hill curve for {campaignId}.
        </p>
      </div>
    );
  }

  // Sort data points by spend
  const sortedPoints = useMemo(() => {
    return [...dataPoints].sort((a, b) => a.spend - b.spend);
  }, [dataPoints]);

  // Interpolate expected revenue at given spend level
  const interpolateRevenue = (targetSpend: number): CurvePointData => {
    if (sortedPoints.length === 0) {
      return { spend: targetSpend, revenue_low: 0, revenue_mid: 0, revenue_high: 0 };
    }
    if (targetSpend <= sortedPoints[0].spend) {
      return {
        spend: targetSpend,
        revenue_low: sortedPoints[0].revenue_low,
        revenue_mid: sortedPoints[0].revenue_mid,
        revenue_high: sortedPoints[0].revenue_high,
      };
    }
    const last = sortedPoints[sortedPoints.length - 1];
    if (targetSpend >= last.spend) {
      return {
        spend: targetSpend,
        revenue_low: last.revenue_low,
        revenue_mid: last.revenue_mid,
        revenue_high: last.revenue_high,
      };
    }
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const p1 = sortedPoints[i];
      const p2 = sortedPoints[i + 1];
      if (targetSpend >= p1.spend && targetSpend <= p2.spend) {
        const ratio = (targetSpend - p1.spend) / (p2.spend - p1.spend || 1);
        return {
          spend: targetSpend,
          revenue_low: p1.revenue_low + ratio * (p2.revenue_low - p1.revenue_low),
          revenue_mid: p1.revenue_mid + ratio * (p2.revenue_mid - p1.revenue_mid),
          revenue_high: p1.revenue_high + ratio * (p2.revenue_high - p1.revenue_high),
        };
      }
    }
    return sortedPoints[0];
  };

  const curRev = interpolateRevenue(currentSpend);
  const recRev = interpolateRevenue(recommendedSpend);

  const option = useMemo<EChartsOption>(() => {
    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 800,
      grid: {
        top: 36,
        right: 28,
        bottom: 38,
        left: 60,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 3,
        padding: [10, 14],
        textStyle: {
          color: '#000000',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const dataIndex = params[0].dataIndex;
          const pt = sortedPoints[dataIndex];
          if (!pt) return '';

          return `
            <div style="font-family:'Space Grotesk',sans-serif;min-width:180px;color:#000000;">
              <div style="font-weight:800;font-size:13px;color:#000000;margin-bottom:6px;border-bottom:2px solid #000;padding-bottom:3px;">
                Spend: $${pt.spend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <tr>
                  <td style="color:#000000;font-weight:700;padding:2px 0;">Expected (Mid):</td>
                  <td style="color:#000000;text-align:right;font-weight:800;">$${pt.revenue_mid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td style="color:#4a4a4a;padding:2px 0;">Conservative (Low):</td>
                  <td style="color:#4a4a4a;text-align:right;">$${pt.revenue_low.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td style="color:#4a4a4a;padding:2px 0;">Optimistic (High):</td>
                  <td style="color:#4a4a4a;text-align:right;">$${pt.revenue_high.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              </table>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: 'Spend ($)',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: {
          color: '#000000',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 11,
        },
        axisLabel: {
          color: '#000000',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 11,
          formatter: (v: number) => `$${v}`,
        },
        axisLine: { lineStyle: { color: '#000000', width: 2 } },
        splitLine: { lineStyle: { color: '#e1e1d8', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: 'Revenue ($)',
        nameTextStyle: {
          color: '#000000',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 11,
        },
        axisLabel: {
          color: '#000000',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 11,
          formatter: (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`,
        },
        axisLine: { lineStyle: { color: '#000000', width: 2 } },
        splitLine: { lineStyle: { color: '#e1e1d8', type: 'dashed' } },
      },
      series: [
        // 1. Lower bound (stacked baseline, invisible)
        {
          name: 'Low Bound Base',
          type: 'line',
          data: sortedPoints.map((p) => [p.spend, p.revenue_low]),
          stack: 'confidence-band',
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'transparent' },
          silent: true,
        },
        // 2. High - Low difference (shaded confidence band)
        {
          name: '95% Confidence Band',
          type: 'line',
          data: sortedPoints.map((p) => [p.spend, Math.max(0, p.revenue_high - p.revenue_low)]),
          stack: 'confidence-band',
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: 'rgba(120, 219, 246, 0.25)',
          },
          silent: true,
        },
        // 3. Expected revenue mid prediction line
        {
          name: 'Expected Revenue (Mid)',
          type: 'line',
          data: sortedPoints.map((p) => [p.spend, p.revenue_mid]),
          smooth: true,
          showSymbol: false,
          symbolSize: 6,
          lineStyle: {
            color: '#000000',
            width: 3,
          },
          markLine: {
            silent: false,
            symbol: ['none', 'none'],
            data: [
              // Current Spend Marker
              {
                name: 'Current Spend',
                xAxis: currentSpend,
                lineStyle: {
                  type: 'dashed',
                  color: '#f364cb',
                  width: 2,
                },
                label: {
                  show: true,
                  position: 'insideEndTop',
                  color: '#000000',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 800,
                  backgroundColor: '#f364cb',
                  borderColor: '#000000',
                  borderWidth: 1.5,
                  padding: [2, 6],
                  borderRadius: 4,
                  formatter: `Current\n$${Math.round(currentSpend)}`,
                },
                tooltip: {
                  formatter: () =>
                    `<b>Current Spend:</b> $${Math.round(currentSpend)}<br/><b>Expected Revenue:</b> $${Math.round(curRev.revenue_mid)}`,
                },
              },
              // Recommended Spend Marker
              {
                name: 'Recommended Spend',
                xAxis: recommendedSpend,
                lineStyle: {
                  type: 'dashed',
                  color: '#82e66f',
                  width: 2,
                },
                label: {
                  show: true,
                  position: 'insideStartTop',
                  color: '#000000',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 800,
                  backgroundColor: '#82e66f',
                  borderColor: '#000000',
                  borderWidth: 1.5,
                  padding: [2, 6],
                  borderRadius: 4,
                  formatter: `Rec\n$${Math.round(recommendedSpend)}`,
                },
                tooltip: {
                  formatter: () =>
                    `<b>Recommended Spend:</b> $${Math.round(recommendedSpend)}<br/><b>Expected Revenue (conservative):</b> $${Math.round(recRev.revenue_low)}`,
                },
              },
            ],
          },
        },
        // 4. Point markers on curve for current & recommended spends
        {
          name: 'Spend Markers',
          type: 'scatter',
          data: [
            {
              value: [currentSpend, curRev.revenue_mid],
              itemStyle: { color: '#f364cb', borderColor: '#000000', borderWidth: 2 },
              symbolSize: 10,
              tooltip: {
                formatter: () =>
                  `<b>Current Spend:</b> $${Math.round(currentSpend)}<br/><b>Expected Revenue:</b> $${Math.round(curRev.revenue_mid)}`,
              },
            },
            {
              value: [recommendedSpend, recRev.revenue_mid],
              itemStyle: { color: '#82e66f', borderColor: '#000000', borderWidth: 2 },
              symbolSize: 12,
              tooltip: {
                formatter: () =>
                  `<b>Recommended Spend:</b> $${Math.round(recommendedSpend)}<br/><b>Expected Revenue:</b> $${Math.round(recRev.revenue_mid)} (Conservative: $${Math.round(recRev.revenue_low)})`,
              },
            },
          ],
        },
      ],
    };
  }, [sortedPoints, currentSpend, recommendedSpend, curRev, recRev]);

  const oppBg = opportunityScore !== undefined
    ? (opportunityScore >= 70 ? '#82e66f' : opportunityScore >= 40 ? '#ffd23f' : '#f364cb')
    : '#82e66f';

  return (
    <CurveErrorBoundary>
      <div style={{
        background: '#ffffff',
        border: '3px solid #000000',
        boxShadow: '4px 4px 0px #000000',
        borderRadius: '10px',
        padding: '16px',
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#000000' }}>{campaignId}</span>
            {sku && (
              <span style={{
                background: '#f3f3ed',
                border: '2px solid #000000',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#000000',
              }}>
                {sku}
              </span>
            )}
          </div>
          {opportunityScore !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#4a4a4a' }}>Opportunity:</span>
              <span style={{
                background: oppBg,
                border: '2px solid #000000',
                borderRadius: '4px',
                boxShadow: '2px 2px 0px #000000',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#000000',
              }}>
                {Math.round(opportunityScore)}/100
              </span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{ height }}>
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>

        {/* Legend & Summary */}
        <div style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '2px solid #000000',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 700,
          color: '#000000',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f364cb', border: '1.5px solid #000000' }} />
              <span>Current: ${Math.round(currentSpend)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#82e66f', border: '1.5px solid #000000' }} />
              <span>Recommended: ${Math.round(recommendedSpend)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '10px', background: 'rgba(120, 219, 246, 0.4)', border: '1.5px solid #000000', borderRadius: '2px' }} />
            <span>95% Confidence Band</span>
          </div>
        </div>
      </div>
    </CurveErrorBoundary>
  );
};

export default ResponseCurve;
