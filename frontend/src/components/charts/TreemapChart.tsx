import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { EmptyState } from '../ui/EmptyState';

// ─── Contract type (mirrored locally) ────────────────────────────────────────

export interface TreemapNode {
  name: string;
  value?: number;
  roas_delta?: number;
  children?: TreemapNode[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_TREEMAP: TreemapNode[] = [
  { name: 'Meta', children: [
    { name: 'camp_meta_01', value: 8200, roas_delta: +0.3, children: [
      { name: 'SKU-012', value: 4800, roas_delta: +0.5 },
      { name: 'SKU-018', value: 3400, roas_delta: +0.1 },
    ]},
    { name: 'camp_meta_03', value: 12400, roas_delta: -1.2, children: [
      { name: 'SKU-042', value: 7100, roas_delta: -1.8 },
      { name: 'SKU-045', value: 5300, roas_delta: -0.6 },
    ]},
    { name: 'camp_meta_05', value: 6800, roas_delta: +0.8, children: [
      { name: 'SKU-021', value: 6800, roas_delta: +0.8 },
    ]},
  ]},
  { name: 'Google', children: [
    { name: 'camp_google_02', value: 9100, roas_delta: +0.1, children: [
      { name: 'SKU-012', value: 5200, roas_delta: +0.2 },
      { name: 'SKU-033', value: 3900, roas_delta: -0.1 },
    ]},
    { name: 'camp_google_07', value: 7300, roas_delta: -0.9, children: [
      { name: 'SKU-042', value: 4100, roas_delta: -1.4 },
      { name: 'SKU-050', value: 3200, roas_delta: -0.3 },
    ]},
  ]},
  { name: 'TikTok', children: [
    { name: 'camp_tiktok_01', value: 3200, roas_delta: +0.4, children: [
      { name: 'SKU-018', value: 3200, roas_delta: +0.4 },
    ]},
    { name: 'camp_tiktok_02', value: 4430, roas_delta: -0.2, children: [
      { name: 'SKU-055', value: 2600, roas_delta: -0.5 },
      { name: 'SKU-060', value: 1830, roas_delta: +0.1 },
    ]},
  ]},
];

// ─── ROAS-delta diverging color scale ────────────────────────────────────────

const roasDeltaColor = (delta: number): string => {
  if (delta < -1.0) return '#991b1b';
  if (delta < 0)    return '#ef4444';
  if (delta === 0)  return '#475569';
  if (delta <= 1.0) return '#10b981';
  return '#065f46';
};

// ─── Flatten tree to extract min/max roas_delta for visualMap ────────────────

const collectDeltas = (nodes: TreemapNode[]): number[] => {
  const out: number[] = [];
  const walk = (n: TreemapNode) => {
    if (n.roas_delta !== undefined) out.push(n.roas_delta);
    n.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
};

// ─── Transform TreemapNode[] → ECharts treemap data ──────────────────────────
// ECharts treemap expects: { name, value, itemStyle: { color }, children }

const transformNode = (node: TreemapNode): Record<string, unknown> => ({
  name: node.name,
  value: node.value ?? (node.children?.reduce((s, c) => s + (c.value ?? 0), 0) ?? 0),
  roasDelta: node.roas_delta,
  itemStyle: {
    color: node.roas_delta !== undefined ? roasDeltaColor(node.roas_delta) : '#475569',
    borderColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    gapWidth: 2,
  },
  children: node.children?.map(transformNode),
});

// ─── Component ────────────────────────────────────────────────────────────────

export interface TreemapChartProps {
  data?: TreemapNode[];
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const TreemapChart: React.FC<TreemapChartProps> = ({
  data = MOCK_TREEMAP,
  height = 420,
  className = '',
  style,
}) => {
  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    const deltas = collectDeltas(data);
    const minDelta = Math.min(...deltas);
    const maxDelta = Math.max(...deltas);

    const echartsData = data.map(transformNode);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 },
        formatter: (params: Record<string, unknown>) => {
          const d = params.data as Record<string, unknown>;
          const treePath = (params.treePathInfo as Record<string, unknown>[])
            ?.map((t: Record<string, unknown>) => t.name)
            .filter(Boolean)
            .join(' → ');
          const spend = d.value != null
            ? `$${Number(d.value).toLocaleString()}`
            : '—';
          const roasDelta = d.roasDelta != null
            ? `${Number(d.roasDelta) >= 0 ? '+' : ''}${Number(d.roasDelta).toFixed(1)}x`
            : '—';
          return `
            <div style="padding:4px 2px;max-width:260px">
              <div style="font-weight:700;color:#f8fafc;margin-bottom:4px;word-break:break-all">${treePath || d.name}</div>
              <div style="display:flex;gap:16px;margin-top:2px">
                <span style="color:#94a3b8">Spend</span>
                <span style="color:#e2e8f0;font-weight:600">${spend}</span>
              </div>
              <div style="display:flex;gap:8px;margin-top:2px">
                <span style="color:#94a3b8">ROAS Δ</span>
                <span style="color:${Number(d.roasDelta ?? 0) >= 0 ? '#10b981' : '#ef4444'};font-weight:700">${roasDelta}</span>
              </div>
            </div>
          `;
        },
      },
      visualMap: {
        show: true,
        type: 'continuous',
        min: minDelta,
        max: maxDelta,
        inRange: {
          color: ['#991b1b', '#ef4444', '#475569', '#10b981', '#065f46'],
        },
        text: ['+ROAS', '-ROAS'],
        textStyle: { color: '#94a3b8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
        orient: 'horizontal',
        left: 'right',
        top: 8,
        itemWidth: 14,
        itemHeight: 100,
        calculable: true,
        precision: 1,
      },
      series: [
        {
          type: 'treemap',
          name: 'Ad Spend',
          roam: false,
          nodeClick: 'zoomToNode',
          width: '100%',
          height: '100%',
          top: 48,
          breadcrumb: {
            show: true,
            top: 4,
            height: 28,
            textStyle: {
              color: '#94a3b8',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            },
            itemStyle: {
              color: 'rgba(255,255,255,0.05)',
              borderColor: '#334155',
              borderWidth: 1,
            },
          },
          label: {
            show: true,
            formatter: (params: Record<string, unknown>) => {
              const d = params.data as Record<string, unknown>;
              const isLeaf = !d.children || (d.children as unknown[]).length === 0;
              if (isLeaf) {
                return `${d.name}\n$${Number(d.value ?? 0).toLocaleString()}`;
              }
              return String(d.name);
            },
            color: '#f8fafc',
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            overflow: 'truncate',
          },
          upperLabel: {
            show: true,
            height: 28,
            color: '#e2e8f0',
            fontWeight: 700,
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            backgroundColor: 'rgba(0,0,0,0.35)',
            padding: [4, 8],
          },
          levels: [
            // Platform level
            {
              itemStyle: {
                borderColor: '#0a0d14',
                borderWidth: 3,
                gapWidth: 3,
              },
              upperLabel: { show: true },
            },
            // Campaign level
            {
              itemStyle: {
                borderColor: 'rgba(0,0,0,0.4)',
                borderWidth: 2,
                gapWidth: 2,
              },
              upperLabel: { show: true },
            },
            // SKU leaf level
            {
              itemStyle: {
                borderColor: 'rgba(0,0,0,0.2)',
                borderWidth: 1,
                gapWidth: 1,
              },
            },
          ],
          data: echartsData,
          animation: true,
          animationDuration: 400,
        },
      ],
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No treemap data"
        description="Campaign spend and ROAS attribution will appear here once data loads."
        style={{ minHeight: height }}
      />
    );
  }

  return (
    <div
      className={`adpilot-treemap-chart ${className}`.trim()}
      style={{ width: '100%', ...style }}
      aria-label="Spend treemap by platform, campaign, and SKU colored by ROAS delta"
    >
      <ReactECharts
        option={option ?? {}}
        style={{ width: '100%', height }}
        opts={{ renderer: 'svg' }}
        notMerge
        lazyUpdate={false}
      />
    </div>
  );
};

export default TreemapChart;
