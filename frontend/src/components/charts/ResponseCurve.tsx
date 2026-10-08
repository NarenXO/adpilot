import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

export interface CurvePoint {
  spend: number;
  revenue_low: number;
  revenue_mid: number;
  revenue_high: number;
}

interface Props {
  campaignId: string;
  sku: string;
  dataPoints: CurvePoint[];
  currentSpend: number;
  recommendedSpend: number;
  opportunityScore: number;
  height?: string;
}

export function ResponseCurve({
  campaignId,
  sku,
  dataPoints,
  currentSpend,
  recommendedSpend,
  opportunityScore,
  height = '280px',
}: Props) {
  const option = useMemo(() => {
    const pts = [...(dataPoints || [])].sort((a, b) => a.spend - b.spend);

    const midSeries = pts.map((p) => [p.spend, p.revenue_mid]);
    const highSeries = pts.map((p) => [p.spend, p.revenue_high]);
    const lowSeries = pts.map((p) => [p.spend, p.revenue_low]);

    const scoreColor =
      opportunityScore >= 70 ? '#82e66f' : opportunityScore >= 40 ? '#ffd23f' : '#f364cb';

    // Helper for formatting INR values on axes (e.g., ₹50k, ₹1L)
    const formatAxisINR = (val: number) => {
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
      return `₹${val}`;
    };

    return {
      backgroundColor: 'transparent',
      title: {
        text: `${campaignId}  ·  ${sku}  ·  Opp ${Math.round(opportunityScore)}/100`,
        left: 8,
        top: 6,
        textStyle: {
          fontSize: 12,
          fontWeight: 800,
          color: '#000000',
          fontFamily: 'Space Grotesk, sans-serif',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', lineStyle: { color: '#000', width: 1, type: 'dashed' } },
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 2,
        textStyle: { color: '#000', fontWeight: 700, fontFamily: 'Space Grotesk' },
        extraCssText: 'box-shadow: 3px 3px 0 #000; border-radius: 0;',
        valueFormatter: (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`,
      },
      legend: {
        data: ['Expected Revenue', '95% CI High', '95% CI Low'],
        top: 6,
        right: 8,
        textStyle: { color: '#000', fontWeight: 700, fontSize: 10, fontFamily: 'Space Grotesk' },
      },
      // GRID FIX: top: 65 separates title from Y-axis label. containLabel: true prevents left overflow
      grid: { left: 16, right: 24, top: 65, bottom: 20, containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Spend (₹)',
        nameLocation: 'end',
        nameTextStyle: { color: '#000', fontWeight: 800, fontFamily: 'Space Grotesk', padding: [0, 0, 0, 8] },
        axisLine: { lineStyle: { color: '#000', width: 2 } },
        axisLabel: {
          color: '#000',
          fontWeight: 700,
          fontFamily: 'Space Grotesk',
          formatter: formatAxisINR,
        },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.08)', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: 'Revenue (₹)',
        nameLocation: 'end',
        nameTextStyle: { color: '#000', fontWeight: 800, fontFamily: 'Space Grotesk', align: 'left', padding: [0, 0, 8, -30] },
        axisLine: { lineStyle: { color: '#000', width: 2 } },
        axisLabel: {
          color: '#000',
          fontWeight: 700,
          fontFamily: 'Space Grotesk',
          formatter: formatAxisINR,
        },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.08)', type: 'dashed' } },
      },
      series: [
        {
          name: 'Expected Revenue',
          type: 'line',
          smooth: true,
          showSymbol: true,
          data: midSeries,
          lineStyle: { width: 3, color: '#000000' },
          itemStyle: { color: scoreColor, borderColor: '#000', borderWidth: 1.5 },
          markLine: {
            symbol: 'none',
            data: [
              {
                xAxis: currentSpend,
                name: 'Current',
                lineStyle: { color: '#f364cb', width: 2, type: 'dashed' },
                label: { show: true, formatter: 'Current', color: '#000', fontWeight: 800, fontFamily: 'Space Grotesk' },
              },
              {
                xAxis: recommendedSpend,
                name: 'Recommended',
                lineStyle: { color: '#78dbf6', width: 2 },
                label: { show: true, formatter: 'Rec', color: '#000', fontWeight: 800, fontFamily: 'Space Grotesk' },
              },
            ],
          },
        },
        {
          name: '95% CI High',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: highSeries,
          lineStyle: { width: 1, color: '#78dbf6', type: 'dotted' },
          areaStyle: { color: 'rgba(120,219,246,0.12)' },
        },
        {
          name: '95% CI Low',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: lowSeries,
          lineStyle: { width: 1, color: '#78dbf6', type: 'dotted' },
        },
      ],
    };
  }, [campaignId, sku, dataPoints, currentSpend, recommendedSpend, opportunityScore]);

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div style={{ border: '3px solid #000', background: '#fff', padding: 16, boxShadow: '4px 4px 0 #000', fontWeight: 800, fontFamily: 'Space Grotesk' }}>
        No curve data available for {campaignId}
      </div>
    );
  }

  return (
    <div style={{ border: '3px solid #000', background: '#fff', boxShadow: '4px 4px 0 #000', padding: 12 }}>
      <ReactECharts
        key={`${campaignId}-${sku}-${dataPoints.length}`}
        option={option}
        style={{ height }}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
}

export default ResponseCurve;