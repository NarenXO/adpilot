import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

export interface BudgetChangeItem {
  campaignId: string;
  fromSpend: number;
  toSpend: number;
}

export interface SankeyChartProps {
  changes: BudgetChangeItem[];
  height?: string;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({
  changes = [],
  height = '340px',
}) => {
  // Filter active changes where absolute change > $1
  const activeChanges = useMemo(() => {
    return changes.filter(
      (c) => Math.abs(c.toSpend - c.fromSpend) > 1.0
    );
  }, [changes]);

  // Fallback empty state: if zero changes or portfolio is stable
  if (!activeChanges || activeChanges.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-[#1f2d45] bg-[#111827] p-8 text-center"
        style={{ height }}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a2235] text-[#3b82f6]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="mb-1 text-sm font-semibold text-[#e2e8f0]">Portfolio Spend is Stable</div>
        <p className="max-w-md text-xs text-[#64748b]">
          No budget reallocations today. Portfolio spend is stable.
        </p>
      </div>
    );
  }

  const option = useMemo<EChartsOption>(() => {
    // 1. Group into sources (decreases) and targets (increases)
    const sources: Array<{ name: string; campaignId: string; amount: number; color: string }> = [];
    const targets: Array<{ name: string; campaignId: string; amount: number; color: string }> = [];

    // Distinct palette for sources & targets
    const srcPalette = ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#f87171'];
    const tgtPalette = ['#00ff88', '#34d399', '#10b981', '#6ee7b7', '#059669'];

    let srcIdx = 0;
    let tgtIdx = 0;

    for (const c of activeChanges) {
      const delta = c.toSpend - c.fromSpend;
      const absDelta = Math.round(Math.abs(delta));

      if (delta < 0) {
        sources.push({
          name: `${c.campaignId} [-$${absDelta}]`,
          campaignId: c.campaignId,
          amount: absDelta,
          color: srcPalette[srcIdx % srcPalette.length],
        });
        srcIdx++;
      } else if (delta > 0) {
        targets.push({
          name: `${c.campaignId} [+$${absDelta}]`,
          campaignId: c.campaignId,
          amount: absDelta,
          color: tgtPalette[tgtIdx % tgtPalette.length],
        });
        tgtIdx++;
      }
    }

    const totalDec = sources.reduce((sum, s) => sum + s.amount, 0);
    const totalInc = targets.reduce((sum, t) => sum + t.amount, 0);

    // If only sources exist or only targets exist, add an equilibrium node
    if (sources.length === 0 && targets.length > 0) {
      sources.push({
        name: `Budget Expansion [-$${totalInc}]`,
        campaignId: 'Budget Expansion',
        amount: totalInc,
        color: '#3b82f6',
      });
    } else if (targets.length === 0 && sources.length > 0) {
      targets.push({
        name: `Reserve Savings [+$${totalDec}]`,
        campaignId: 'Reserve Savings',
        amount: totalDec,
        color: '#3b82f6',
      });
    } else if (totalDec > totalInc) {
      const diff = totalDec - totalInc;
      targets.push({
        name: `Reserve Savings [+$${diff}]`,
        campaignId: 'Reserve Savings',
        amount: diff,
        color: '#3b82f6',
      });
    } else if (totalInc > totalDec) {
      const diff = totalInc - totalDec;
      sources.push({
        name: `Budget Expansion [-$${diff}]`,
        campaignId: 'Budget Expansion',
        amount: diff,
        color: '#3b82f6',
      });
    }

    const flowTotal = Math.max(
      sources.reduce((sum, s) => sum + s.amount, 0),
      targets.reduce((sum, t) => sum + t.amount, 0),
      1.0
    );

    // Assemble nodes
    const nodes = [
      ...sources.map((s) => ({
        name: s.name,
        itemStyle: { color: s.color, borderColor: '#1f2d45', borderWidth: 1 },
      })),
      ...targets.map((t) => ({
        name: t.name,
        itemStyle: { color: t.color, borderColor: '#1f2d45', borderWidth: 1 },
      })),
    ];

    // Assemble proportional links
    const links: any[] = [];
    for (const src of sources) {
      for (const tgt of targets) {
        const linkVal = Math.round((src.amount * tgt.amount) / flowTotal);
        if (linkVal >= 1) {
          links.push({
            source: src.name,
            target: tgt.name,
            value: linkVal,
            sourceCamp: src.campaignId,
            targetCamp: tgt.campaignId,
          });
        }
      }
    }

    return {
      backgroundColor: 'transparent',
      animationDuration: 600,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0a0d14',
        borderColor: '#1f2d45',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: '#e2e8f0',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            const edge = params.data;
            return `
              <div style="font-family:Inter,sans-serif;min-width:200px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">
                  Budget Reallocation Flow
                </div>
                <div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:6px;">
                  Reallocating $${Math.round(edge.value).toLocaleString()}
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;font-size:12px;">
                  <span style="color:#64748b;">From: <b style="color:#f43f5e;">${edge.sourceCamp}</b></span>
                  <span style="color:#64748b;">To: <b style="color:#00ff88;">${edge.targetCamp}</b></span>
                </div>
              </div>
            `;
          } else {
            return `
              <div style="font-family:Inter,sans-serif;padding:2px 4px;">
                <div style="font-weight:700;color:#e2e8f0;font-size:13px;">${params.name}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
                  Total Shift: <b>$${Math.round(params.value).toLocaleString()}</b>
                </div>
              </div>
            `;
          }
        },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency',
          },
          nodeAlign: 'justify',
          nodeWidth: 16,
          nodeGap: 14,
          draggable: false,
          top: 20,
          right: 20,
          bottom: 20,
          left: 20,
          label: {
            color: '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 500,
          },
          lineStyle: {
            color: 'source',
            curveness: 0.5,
            opacity: 0.42,
          },
          data: nodes,
          links: links,
        },
      ],
    };
  }, [activeChanges]);

  return (
    <div className="relative w-full rounded-xl border border-[#1f2d45] bg-[#111827] p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-[#1f2d45] pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#e2e8f0]">Budget Reallocation Flow</span>
          <span className="rounded bg-[#1a2235] px-2 py-0.5 text-[10px] text-[#64748b]">
            Source → Target
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#64748b]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
            <span>Decreased Spend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00ff88]" />
            <span>Increased Spend</span>
          </div>
        </div>
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
    </div>
  );
};

export default SankeyChart;
