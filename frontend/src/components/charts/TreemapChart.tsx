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

// ─── ROAS-delta color scale (Invente '26 Neo-Brutalist) ───────────────────────

const roasDeltaColor = (delta: number): string => {
  if (delta < -1.0) return '#f364cb'; // pink
  if (delta < 0)    return '#f364cb'; // pink
  if (delta === 0)  return '#e1e1d8'; // muted gray
  if (delta <= 1.0) return '#78dbf6'; // cyan
  return '#82e66f'; // lime
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

const transformNode = (node: TreemapNode): Record<string, unknown> => ({
  name: node.name,
  value: node.value ?? (node.children?.reduce((s, c) => s + (c.value ?? 0), 0) ?? 0),
  roasDelta: node.roas_delta,
  itemStyle: {
    color: node.roas_delta !== undefined ? roasDeltaColor(node.roas_delta) : '#e1e1d8',
    borderColor: '#000000',
    borderWidth: 2,
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
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 2,
        extraCssText: 'box-shadow: 3px 3px 0px #000000; font-family: Space Grotesk, sans-serif; color: #000000; font-weight: 600;',
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
              <div style="font-weight:700;color:#000000;margin-bottom:4px;word-break:break-all">${treePath || d.name}</div>
              <div style="display:flex;gap:16px;margin-top:2px">
                <span style="color:#4a4a46">Spend</span>
                <span style="color:#000000;font-weight:700">${spend}</span>
              </div>
              <div style="display:flex;gap:8px;margin-top:2px">
                <span style="color:#4a4a46">ROAS Δ</span>
                <span style="color:#000000;background-color:${Number(d.roasDelta ?? 0) >= 0 ? '#82e66f' : '#f364cb'};padding:0 4px;border:1px solid #000;font-weight:700">${roasDelta}</span>
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
          color: ['#f364cb', '#e1e1d8', '#78dbf6', '#82e66f'],
        },
        text: ['+ROAS', '-ROAS'],
        textStyle: { color: '#000000', fontSize: 11, fontFamily: "'Space Grotesk', monospace", fontWeight: 'bold' },
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
              color: '#000000',
              fontSize: 11,
              fontFamily: "'Space Grotesk', monospace",
              fontWeight: 700,
            },
            itemStyle: {
              color: '#ffffff',
              borderColor: '#000000',
              borderWidth: 2,
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
            color: '#000000',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            fontWeight: 700,
          },
          itemStyle: {
            borderColor: '#000000',
            borderWidth: 2,
            gapWidth: 2,
          },
          upperLabel: {
            show: true,
            height: 22,
            color: '#000000',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12,
            fontWeight: 700,
          },
          levels: [
            // Platform level
            {
              itemStyle: {
                borderColor: '#000000',
                borderWidth: 3,
                gapWidth: 3,
              },
              upperLabel: {
                show: true,
                color: '#000000',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                backgroundColor: '#e1e1d8',
                borderColor: '#000000',
                borderWidth: 1,
              },
            },
            // Campaign level
            {
              itemStyle: {
                borderColor: '#000000',
                borderWidth: 2,
                gapWidth: 2,
              },
              upperLabel: {
                show: true,
                color: '#000000',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
              },
            },
            // SKU leaf level
            {
              itemStyle: {
                borderColor: '#000000',
                borderWidth: 2,
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
