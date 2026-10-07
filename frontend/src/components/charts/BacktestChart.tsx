import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';

export interface BacktestChartProps {
  backtestData?: {
    mean_profit_delta: number;
    ci_low: number;
    ci_high: number;
    worst_seed: number;
    n_seeds: number;
    curve: Array<{ seed: number; profit_delta: number }>;
  };
}

const FALLBACK_BACKTEST: BacktestChartProps['backtestData'] = {
  mean_profit_delta: 8.2,
  ci_low: 4.1,
  ci_high: 12.3,
  worst_seed: -1.2,
  n_seeds: 20,
  curve: Array.from({ length: 20 }, (_, i) => {
    const rng = Math.sin(i * 3.7 + 0.5) * 4.5;
    return { seed: i + 1, profit_delta: parseFloat((8.2 + rng).toFixed(2)) };
  }),
};

export const BacktestChart: React.FC<BacktestChartProps> = ({ backtestData }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const data = useMemo(() => backtestData ?? FALLBACK_BACKTEST!, [backtestData]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'canvas',
      });
    }

    const chart = chartInstance.current;
    const seeds = data.curve.map((p) => `Seed ${p.seed}`);
    const profits = data.curve.map((p) => p.profit_delta);

    // Find worst seed index
    const worstIdx = data.curve.findIndex((p) => p.profit_delta === data.worst_seed);
    const worstSeedActualIdx = worstIdx >= 0 ? worstIdx : profits.indexOf(Math.min(...profits));

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animationDuration: 800,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: { color: 'rgba(56, 189, 248, 0.4)', type: 'dashed' },
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.25)',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#f1f5f9',
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        extraCssText:
          'backdrop-filter: blur(12px); box-shadow: 0 20px 40px -8px rgba(0,0,0,0.6); border-radius: 10px;',
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const seedLabel = params[0]?.axisValue ?? '';
          const profitParam = params.find((p: any) => p.seriesName === 'Seed Profit Uplift');
          const profitVal = profitParam ? profitParam.value : '—';
          const isWorst = profitVal !== '—' && Number(profitVal) === data.worst_seed;

          let html = `<div style="font-weight:700;color:#e2e8f0;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:4px">🧪 ${seedLabel}</div>`;
          html += `<div style="display:flex;justify-content:space-between;gap:20px;font-size:12px">`;
          html += `<span style="color:#94a3b8">Profit Δ</span>`;
          html += `<span style="font-family:JetBrains Mono,monospace;font-weight:700;color:${Number(profitVal) >= 0 ? '#34d399' : '#fb7185'}">${Number(profitVal) >= 0 ? '+' : ''}${profitVal}%</span>`;
          html += `</div>`;
          html += `<div style="display:flex;justify-content:space-between;gap:20px;font-size:11px;margin-top:4px">`;
          html += `<span style="color:#64748b">95% CI Band</span>`;
          html += `<span style="font-family:monospace;color:#67e8f9">[${data.ci_low}%, ${data.ci_high}%]</span>`;
          html += `</div>`;
          html += `<div style="display:flex;justify-content:space-between;gap:20px;font-size:11px;margin-top:2px">`;
          html += `<span style="color:#64748b">Mean Δ</span>`;
          html += `<span style="font-family:monospace;color:#a5b4fc">+${data.mean_profit_delta}%</span>`;
          html += `</div>`;
          if (isWorst) {
            html += `<div style="margin-top:6px;padding:4px 8px;background:rgba(251,113,133,0.12);border-left:3px solid #fb7185;border-radius:4px;font-size:10px;color:#fda4af">⚠️ Worst Performing Seed</div>`;
          }
          return html;
        },
      },
      legend: {
        show: true,
        top: 8,
        right: 16,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        data: ['Seed Profit Uplift', 'Mean Δ', '95% CI Band'],
      },
      grid: {
        top: 52,
        left: 55,
        right: 30,
        bottom: 50,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: seeds,
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          rotate: seeds.length > 15 ? 35 : 0,
          formatter: (v: string) => v.replace('Seed ', 'S'),
        },
      },
      yAxis: {
        type: 'value',
        name: 'Profit Δ (%)',
        nameTextStyle: { color: '#64748b', fontSize: 10, align: 'right' },
        axisLine: { show: true, lineStyle: { color: '#334155' } },
        splitLine: {
          lineStyle: { color: 'rgba(51, 65, 85, 0.3)', type: 'dashed' },
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: (v: number) => `${v >= 0 ? '+' : ''}${v}%`,
        },
      },
      series: [
        // Walk-forward backtest curve with continuous line + per-seed scatter nodes + CI band
        {
          name: 'Seed Profit Uplift',
          type: 'line',
          data: profits,
          smooth: 0.35,
          lineStyle: {
            color: '#38bdf8',
            width: 2.5,
            shadowColor: 'rgba(56, 189, 248, 0.4)',
            shadowBlur: 8,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.18)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.01)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: (params: any) => {
              if (params.dataIndex === worstSeedActualIdx) return '#fb7185';
              return params.value >= data.mean_profit_delta ? '#34d399' : '#38bdf8';
            },
            borderColor: '#0f172a',
            borderWidth: 2,
            shadowBlur: 6,
            shadowColor: 'rgba(56, 189, 248, 0.4)',
          },
          z: 10,
          markArea: {
            silent: true,
            data: [
              [
                {
                  name: '95% CI Band',
                  yAxis: data.ci_low,
                  itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: 'rgba(52, 211, 153, 0.16)' },
                      { offset: 1, color: 'rgba(56, 189, 248, 0.08)' },
                    ]),
                  },
                },
                {
                  yAxis: data.ci_high,
                },
              ],
            ],
          },
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: [
              {
                yAxis: data.ci_high,
                lineStyle: { color: 'rgba(52, 211, 153, 0.55)', type: 'dashed', width: 1 },
                label: {
                  show: true,
                  position: 'insideEndTop',
                  formatter: `CI High: +${data.ci_high}%`,
                  color: '#6ee7b7',
                  fontSize: 10,
                },
              },
              {
                yAxis: data.ci_low,
                lineStyle: { color: 'rgba(56, 189, 248, 0.55)', type: 'dashed', width: 1 },
                label: {
                  show: true,
                  position: 'insideEndBottom',
                  formatter: `CI Low: +${data.ci_low}%`,
                  color: '#67e8f9',
                  fontSize: 10,
                },
              },
            ],
          },
          markPoint: worstSeedActualIdx >= 0 ? {
            data: [
              {
                name: 'Worst Seed',
                coord: [worstSeedActualIdx, profits[worstSeedActualIdx]],
                value: 'WORST',
                symbol: 'pin',
                symbolSize: 48,
                itemStyle: {
                  color: '#fb7185',
                  shadowBlur: 14,
                  shadowColor: 'rgba(251, 113, 133, 0.6)',
                },
                label: {
                  show: true,
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 'bold',
                  formatter: 'WORST',
                },
              },
            ],
          } : undefined,
        },
        // Center line: Mean profit delta across seeds
        {
          name: 'Mean Δ',
          type: 'line',
          data: seeds.map(() => data.mean_profit_delta),
          smooth: false,
          showSymbol: false,
          lineStyle: {
            color: '#a5b4fc',
            width: 2,
            type: 'dashed',
          },
          itemStyle: { color: '#a5b4fc' },
          z: 8,
        },
        // Zero baseline reference line
        {
          name: '_zero',
          type: 'line',
          data: seeds.map(() => 0),
          smooth: false,
          showSymbol: false,
          lineStyle: { color: '#475569', width: 1, type: 'dotted' },
          silent: true,
          tooltip: { show: false },
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartInstance.current = null;
    };
  }, [data]);

  // KPI badges along the top
  const sortedDeltas = [...data.curve].sort((a, b) => a.profit_delta - b.profit_delta);
  const median =
    sortedDeltas.length % 2 === 0
      ? (sortedDeltas[sortedDeltas.length / 2 - 1].profit_delta +
          sortedDeltas[sortedDeltas.length / 2].profit_delta) /
        2
      : sortedDeltas[Math.floor(sortedDeltas.length / 2)].profit_delta;

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl backdrop-blur-md shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#34d399',
                  boxShadow: '0 0 8px rgba(52,211,153,0.5)',
                  animation: 'pulse 2s infinite',
                }}
              />
              Walk-Forward Backtest — {data.n_seeds}-Seed Profit Uplift
            </h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
              95% CI band with per-seed scatter. Worst-case seed highlighted.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: 8,
                padding: '6px 14px',
              }}
            >
              <span style={{ fontSize: 10, color: '#6ee7b7', letterSpacing: '0.05em' }}>MEAN Δ</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>
                +{data.mean_profit_delta}%
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.2)',
                borderRadius: 8,
                padding: '6px 14px',
              }}
            >
              <span style={{ fontSize: 10, color: '#67e8f9', letterSpacing: '0.05em' }}>MEDIAN</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace' }}>
                +{median.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(251,113,133,0.08)',
                border: '1px solid rgba(251,113,133,0.2)',
                borderRadius: 8,
                padding: '6px 14px',
              }}
            >
              <span style={{ fontSize: 10, color: '#fda4af', letterSpacing: '0.05em' }}>WORST</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fb7185', fontFamily: 'JetBrains Mono, monospace' }}>
                {data.worst_seed >= 0 ? '+' : ''}{data.worst_seed}%
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Chart */}
      <div ref={chartRef} style={{ width: '100%', height: '340px' }} />
    </div>
  );
};

export default BacktestChart;
