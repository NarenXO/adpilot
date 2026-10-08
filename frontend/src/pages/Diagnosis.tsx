import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { WaterfallChart } from '../components/charts/WaterfallChart';
import { TreemapChart } from '../components/charts/TreemapChart';
import { HeatmapChart } from '../components/charts/HeatmapChart';

export type ProvenanceType = 'Measured' | 'Derived' | 'Scenario';

export interface EvidenceItem {
  id: string;
  title: string;
  provenance: ProvenanceType;
  sourceTable: string;
  metricSnippet: string;
  description: string;
  timestamp: string;
  highlightedKeys: string[];
}

export interface CreativeItem {
  id: string;
  name: string;
  format: 'Video 9:16' | 'Static Image' | 'Carousel';
  hookType: string;
  ageDays: number;
  ctrDecayPct: number;
  frequency: number;
  status: 'Fatigued' | 'Healthy' | 'Testing';
}

export interface ToolTraceStep {
  step: number;
  toolName: string;
  description: string;
  args: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
}

const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'E12',
    title: 'CTR Baseline vs Current',
    provenance: 'Measured',
    sourceTable: 'meta_ads_insights_daily',
    metricSnippet: 'CTR dropped from 2.8% to 1.8%',
    description: 'Measured click-through rate over 12-day window across camp_meta_03 showing sharp downward inflection.',
    timestamp: '2024-06-15 08:30 UTC',
    highlightedKeys: ['2.8%', '1.8%', '12-day'],
  },
  {
    id: 'E13',
    title: 'High Audience Overlap & Frequency',
    provenance: 'Derived',
    sourceTable: 'meta_audience_overlap_log',
    metricSnippet: 'Frequency 7.2x (warning alert > 6.0x)',
    description: 'Target segment reach exhausted. Audience repetition exceeded standard threshold of 6.0x across top ad sets.',
    timestamp: '2024-06-15 08:31 UTC',
    highlightedKeys: ['7.2x', '6.0x'],
  },
  {
    id: 'E14',
    title: 'Creative Age & Wearout Curve',
    provenance: 'Derived',
    sourceTable: 'creative_fatigue_models',
    metricSnippet: 'Asset age: 21 days past peak engagement',
    description: 'Parametric decay curve models saturation point crossed on Day 9 of launch; current age 21 days.',
    timestamp: '2024-06-15 08:32 UTC',
    highlightedKeys: ['21 days'],
  },
  {
    id: 'E15',
    title: 'Budget Shift & Daily Opportunity Cost',
    provenance: 'Measured',
    sourceTable: 'simulation_rebalance_v4',
    metricSnippet: 'Shift $1,200/day to camp_meta_05',
    description: 'Projected net profit recovery by migrating allocated budget away from saturated ad sets.',
    timestamp: '2024-06-15 08:33 UTC',
    highlightedKeys: ['$1,200'],
  },
  {
    id: 'E16',
    title: 'ROAS Uplift from Winner Rotation',
    provenance: 'Scenario',
    sourceTable: 'synthetic_counterfactual_engine',
    metricSnippet: 'Estimated +0.8x blended ROAS delta',
    description: 'Marginal ROAS improvement calculated via synthetic control reweighting on winning SKUs.',
    timestamp: '2024-06-15 08:34 UTC',
    highlightedKeys: ['+0.8x'],
  },
];

const CREATIVES_DATA: CreativeItem[] = [
  { id: 'cr_meta_03_A', name: 'UGC Unboxing Hook v2', format: 'Video 9:16', hookType: 'Problem-Agitation (0-3s)', ageDays: 21, ctrDecayPct: -38, frequency: 7.2, status: 'Fatigued' },
  { id: 'cr_meta_03_B', name: 'Product Comparison Carousel', format: 'Carousel', hookType: 'Competitor Benchmark', ageDays: 14, ctrDecayPct: -12, frequency: 4.1, status: 'Healthy' },
  { id: 'cr_meta_03_C', name: 'Founder Story / Value Prop', format: 'Static Image', hookType: 'Social Proof & Press', ageDays: 4, ctrDecayPct: -2, frequency: 1.8, status: 'Testing' },
];

const TOOL_TRACE_STEPS: ToolTraceStep[] = [
  {
    step: 1,
    toolName: 'metric_drilldown',
    description: 'Isolate campaign-level CTR drop across Meta platform',
    args: { platform: 'meta', campaign: 'camp_meta_03', lookback_days: 14, metric: 'ctr' },
    output: { baseline_ctr: 0.028, current_ctr: 0.018, delta_pct: -35.7, p_value: 0.0004 },
    durationMs: 140,
  },
  {
    step: 2,
    toolName: 'creative_breakdown',
    description: 'Inspect individual creative assets within camp_meta_03',
    args: { campaign_id: 'camp_meta_03', top_n: 3, sort_by: 'spend_desc' },
    output: { assets_evaluated: 6, top_fatigued: 'cr_meta_03_A', spend_share_pct: 68.4, avg_frequency: 7.2 },
    durationMs: 220,
  },
  {
    step: 3,
    toolName: 'fatigue_curve',
    description: 'Fit Weibull decay model on ad impressions vs engagement',
    args: { asset_id: 'cr_meta_03_A', metric: 'ctr', half_life_days: 8.5 },
    output: { inflection_day: 9, current_day: 21, decay_severity: 'critical', replacement_recommended: true },
    durationMs: 310,
  },
  {
    step: 4,
    toolName: 'inventory_check',
    description: 'Verify SKU inventory levels for associated campaign ads',
    args: { campaign_id: 'camp_meta_03', skus: ['SKU-042', 'SKU-045'] },
    output: { 'SKU-042': { stock: 1420, days_of_supply: 28, stockout_risk: 'low' }, 'SKU-045': { stock: 890, days_of_supply: 22, stockout_risk: 'low' } },
    durationMs: 95,
  },
  {
    step: 5,
    toolName: 'margin_check',
    description: 'Audit gross margin elasticity given current acquisition cost',
    args: { campaign_id: 'camp_meta_03', cpa_current: 44.5, target_cpa: 28.0 },
    output: { current_contribution_margin: 0.14, target_contribution_margin: 0.32, burn_rate_daily: 820.0 },
    durationMs: 180,
  },
  {
    step: 6,
    toolName: 'tracking_health',
    description: 'Confirm Meta CAPI pixel event match quality and deduplication',
    args: { pixel_id: 'px_88491029', window_hours: 48 },
    output: { emq_score: 8.8, deduplication_rate: 0.994, latency_sec: 1.2, status: 'healthy' },
    durationMs: 110,
  },
];

export interface DiagnosisModel {
  incident_id: string;
  cause: string;
  evidence_ids: string[];
  explanation: string;
  source: 'llm' | 'playbook';
  guardian: 'PASS' | 'DOWNGRADED' | 'FAIL';
}

export interface AgentStep {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  result_summary: string;
}

export const MOCK_DIAGNOSIS: DiagnosisModel = {
  incident_id: 'INC-001',
  cause: 'creative_fatigue',
  evidence_ids: ['E12', 'E13', 'E14', 'E15', 'E16'],
  explanation: 'Creative fatigue on Meta ads leading to a 32.4% drop in CTR. Audience repetition frequency reached 7.2x, causing high wearout on 21-day video creative.',
  source: 'llm',
  guardian: 'PASS',
};

export const MOCK_AGENT_STEPS: AgentStep[] = TOOL_TRACE_STEPS.map((t) => ({ step: t.step, tool: t.toolName, args: t.args, result_summary: t.description }));
export const MOCK_EVIDENCE = EVIDENCE_ITEMS;
export const MOCK_CREATIVE_FATIGUE = CREATIVES_DATA;

const ICON_SIZE_STYLE: React.CSSProperties = { width: 14, height: 14, flexShrink: 0, display: 'block' };

const TinyChevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    style={{ ...ICON_SIZE_STYLE, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const TinyCheck = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    style={ICON_SIZE_STYLE}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export const Diagnosis: React.FC = () => {
  const [highlightedEvidence, setHighlightedEvidence] = useState<string | null>(null);
  const [expandedTraceSteps, setExpandedTraceSteps] = useState<number[]>([1]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  const activeHighlightedKeys = useMemo(() => {
    if (!highlightedEvidence) return [];
    const item = EVIDENCE_ITEMS.find((e) => e.id === highlightedEvidence);
    return item ? item.highlightedKeys : [];
  }, [highlightedEvidence]);

  const isTextHighlighted = useCallback(
    (textSnippet: string, evidenceId?: string) => {
      if (evidenceId && highlightedEvidence === evidenceId) return true;
      return activeHighlightedKeys.includes(textSnippet);
    },
    [highlightedEvidence, activeHighlightedKeys]
  );

  const handleReplayTrace = () => {
    setIsReplaying(true);
    setExpandedTraceSteps([1]);
    let currentStep = 1;
    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep <= TOOL_TRACE_STEPS.length) {
        setExpandedTraceSteps((prev) => [...prev, currentStep]);
      } else {
        clearInterval(interval);
        setIsReplaying(false);
      }
    }, 700);
  };

  const toggleTraceStep = (stepNumber: number) => {
    if (isReplaying) return;
    setExpandedTraceSteps((prev) => (prev.includes(stepNumber) ? prev.filter((s) => s !== stepNumber) : [...prev, stepNumber]));
  };

  return (
    <div className="diagnosis-page space-y-6 pb-12 animate-fade-in font-sans">
      <style>{`.diagnosis-page svg{max-width:20px !important;max-height:20px !important;}`}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6" style={{ backgroundColor: '#ffffff', border: '3px solid #000000', boxShadow: '5px 5px 0px #000000' }}>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold uppercase px-3 py-1" style={{ backgroundColor: '#f364cb', color: '#000000', border: '2px solid #000000' }}>INCIDENT</span>
            <h1 className="text-xl md:text-2xl font-bold text-black tracking-tight font-sans">INC-001: Creative Fatigue on Meta Ads</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
            <span className="px-2.5 py-1 font-bold" style={{ backgroundColor: '#f364cb', color: '#000000', border: '2px solid #000000' }}>Metric: CTR (-32.4%)</span>
            <span className="px-2.5 py-1 font-bold" style={{ backgroundColor: '#78dbf6', color: '#000000', border: '2px solid #000000' }}>Scope: camp_meta_03</span>
            <span className="px-2.5 py-1 font-bold" style={{ backgroundColor: '#ffd23f', color: '#000000', border: '2px solid #000000' }}>Severity: High</span>
            <span className="px-2.5 py-1 font-bold" style={{ backgroundColor: '#78dbf6', color: '#000000', border: '2px solid #000000' }}>Confidence: 91%</span>
          </div>
        </div>

        <div className="flex items-center self-start md:self-auto gap-3 px-4 py-2.5" style={{ backgroundColor: '#82e66f', border: '2px solid #000000', boxShadow: '3px 3px 0px #000000' }}>
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-black font-bold">Guardian Verdict</span>
            <span className="text-sm font-bold text-black flex items-center gap-1.5 justify-end font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-black inline-block animate-pulse" />
              PASS / VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* EXPLANATION + EVIDENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col">
          <Card
            title={<div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#82e66f] border border-black" /><span className="font-bold text-black text-sm uppercase tracking-wider font-sans">VERIFIED EXPLANATION</span></div>}
            action={<Badge variant="success">Deterministic Match</Badge>}
            className="h-full flex flex-col justify-between"
          >
            <div className="space-y-4 text-sm text-black leading-relaxed font-sans font-medium">
              <p>
                Root-cause diagnosis identifies significant ad exhaustion in{' '}
                <span className="font-mono text-black font-bold px-1.5 py-0.5 border border-black" style={{ backgroundColor: '#78dbf6' }}>camp_meta_03</span>.
                The primary driver is severe creative fatigue in high-volume creative assets where click-through rate plummeted from{' '}
                <span className={`verified-number ${isTextHighlighted('2.8%', 'E12') ? 'highlighted' : ''}`} onMouseEnter={() => setHighlightedEvidence('E12')} onMouseLeave={() => setHighlightedEvidence(null)}>2.8%</span>{' '}to{' '}
                <span className={`verified-number ${isTextHighlighted('1.8%', 'E12') ? 'highlighted' : ''}`} onMouseEnter={() => setHighlightedEvidence('E12')} onMouseLeave={() => setHighlightedEvidence(null)}>1.8%</span>{' '}over a{' '}
                <span className={`verified-number ${isTextHighlighted('12-day', 'E12') ? 'highlighted' : ''}`} onMouseEnter={() => setHighlightedEvidence('E12')} onMouseLeave={() => setHighlightedEvidence(null)}>12-day</span>{' '}monitoring cycle.
              </p>

              <p>
                Audience saturation indicators confirm individual user repetition reached an excessive frequency of{' '}
                <span className={`verified-number ${isTextHighlighted('7.2x', 'E13') ? 'highlighted' : ''}`} onMouseEnter={() => setHighlightedEvidence('E13')} onMouseLeave={() => setHighlightedEvidence(null)}>7.2x</span>, well past the safe burn threshold of{' '}
                <span className={`verified-number ${isTextHighlighted('6.0x', 'E13') ? 'highlighted' : ''}`} onMouseEnter={() => setHighlightedEvidence('E13')} onMouseLeave={() => setHighlightedEvidence(null)}>6.0x</span>. The lead video creative asset has now been running continuously for{' '}
                <span className={`verified-number ${isTextHighlighted('21 days', 'E14') ? 'highlighted' : ''}`} onMouseEnter={() => setHighlightedEvidence('E14')} onMouseLeave={() => setHighlightedEvidence(null)}>21 days</span>{' '}without revision or fresh hook variations.
              </p>

              <p>
                Recommended mitigation protocol is to throttle target spend and reallocate{' '}
                <span className={`verified-number ${isTextHighlighted('$1,200', 'E15') ? 'highlighted' : ''}`} onMouseEnter={() => setHighlightedEvidence('E15')} onMouseLeave={() => setHighlightedEvidence(null)}>$1,200</span>{' '}daily into accelerating winner{' '}
                <span className="font-mono text-black font-bold px-1.5 py-0.5 border border-black" style={{ backgroundColor: '#78dbf6' }}>camp_meta_05</span>, yielding an estimated{' '}
                <span className={`verified-number ${isTextHighlighted('+0.8x', 'E16') ? 'highlighted' : ''}`} onMouseEnter={() => setHighlightedEvidence('E16')} onMouseLeave={() => setHighlightedEvidence(null)}>+0.8x</span>{' '}counterfactual ROAS uplift across active ad sets.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-black flex items-center justify-between text-xs text-black font-semibold font-sans">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#82e66f] border border-black" />Hover on evidence cards to highlight linked findings in text</span>
              <span className="font-mono text-[11px] text-black font-bold">Evidence link: 5 checks active</span>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-black tracking-wider uppercase font-sans">EVIDENCE LEDGER ({EVIDENCE_ITEMS.length})</h2>
            <span className="text-xs text-black font-mono font-bold">Hover to inspect</span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {EVIDENCE_ITEMS.map((item) => {
              const isHovered = highlightedEvidence === item.id;
              const provBg = item.provenance === 'Measured' ? '#78dbf6' : item.provenance === 'Derived' ? '#f364cb' : '#ffd23f';
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHighlightedEvidence(item.id)}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                  className="p-3.5 transition-all duration-150 cursor-pointer"
                  style={{ backgroundColor: isHovered ? '#82e66f' : '#ffffff', border: '2px solid #000000', boxShadow: isHovered ? '5px 5px 0px #000000' : '3px 3px 0px #000000', transform: isHovered ? 'translate(-2px, -2px)' : 'none' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-black text-white border border-black">{item.id}</span>
                      <span className="text-xs font-bold text-black font-sans">{item.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5" style={{ backgroundColor: provBg, color: '#000000', border: '1.5px solid #000000' }}>{item.provenance}</span>
                  </div>
                  <p className="font-mono text-xs font-bold text-black mb-1">{item.metricSnippet}</p>
                  <p className="text-[11px] text-black font-medium leading-relaxed font-sans">{item.description}</p>
                  <div className="mt-2 pt-1.5 border-t border-black/30 flex items-center justify-between text-[10px] text-black font-mono font-bold">
                    <span>table: {item.sourceTable}</span>
                    <span>{item.timestamp.split(' ')[1]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4" style={{ backgroundColor: '#ffd23f', border: '2px solid #000000', boxShadow: '3px 3px 0px #000000' }}>
            <div className="flex items-center gap-2 font-bold text-black mb-1 font-sans text-xs uppercase tracking-wide">
              <TinyCheck />
              Guardian Verification Notes
            </div>
            <p className="text-[11px] text-black font-medium leading-normal font-sans">
              100% of statistical citations reconciled against cold storage warehouse records. Zero synthetic hall-checks detected. Ground truth variance &lt; 0.02%.
            </p>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <Card title="Profit Impact Bridge" action={<span className="text-xs text-black font-mono font-bold">Net profit impact decomposed by drivers</span>}>
            <WaterfallChart height={360} />
          </Card>
        </div>
        <div className="lg:col-span-6">
          <Card title="Multi-Channel Driver Treemap" action={<span className="text-xs text-black font-mono font-bold">Spend volume leaf sized, ROAS colored</span>}>
            <TreemapChart height={360} />
          </Card>
        </div>
      </div>

      {/* HEATMAP */}
      <div>
        <Card
          title="14-Day Performance Intensity Matrix"
          action={
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-black">
              <span className="w-3 h-3 border border-black inline-block" style={{ backgroundColor: '#f364cb' }} /> Low ROAS
              <span className="w-3 h-3 border border-black inline-block ml-2" style={{ backgroundColor: '#ffd23f' }} /> Mid
              <span className="w-3 h-3 border border-black inline-block ml-2" style={{ backgroundColor: '#82e66f' }} /> High ROAS
            </div>
          }
        >
          <div className="mb-3 text-xs text-black font-semibold font-sans">
            Daily ROAS progression across portfolio (highlighting creative fatigue in camp_meta_03)
          </div>
          <HeatmapChart height={320} />
        </Card>
      </div>

      {/* AGENT TRACE + CREATIVE FATIGUE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card
            title="Agent Tool Trace Replay"
            action={
              <Button
                variant="secondary"
                onClick={handleReplayTrace}
                disabled={isReplaying}
                className="brutal-btn"
                style={{ backgroundColor: '#78dbf6', color: '#000000', padding: '0.3rem 0.8rem', fontSize: '0.75rem', border: '2px solid #000000', boxShadow: '2px 2px 0px #000000' }}
              >
                {isReplaying ? 'Replaying...' : 'Replay Trace'}
              </Button>
            }
          >
            <div className="mb-3 text-xs text-black font-semibold font-sans">Step-by-step audit logs of autonomous investigative tools</div>
            <div className="space-y-3">
              {TOOL_TRACE_STEPS.map((trace) => {
                const isExpanded = expandedTraceSteps.includes(trace.step);
                return (
                  <div key={trace.step} style={{ backgroundColor: '#ffffff', border: '2px solid #000000', boxShadow: '3px 3px 0px #000000' }}>
                    <div onClick={() => toggleTraceStep(trace.step)} className="p-3 flex items-center justify-between cursor-pointer transition-colors hover:bg-[#f3f3ed]">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs w-6 h-6 flex items-center justify-center font-bold text-black" style={{ backgroundColor: '#ffd23f', border: '2px solid #000000' }}>{trace.step}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-black">{trace.toolName}()</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 font-bold" style={{ backgroundColor: '#78dbf6', border: '1px solid #000' }}>TOOL</span>
                          </div>
                          <p className="text-xs text-black font-medium font-sans">{trace.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono font-bold text-black">{trace.durationMs}ms</span>
                        <TinyChevron expanded={isExpanded} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 border-t-2 border-black bg-[#f3f3ed] text-xs font-mono space-y-2">
                        <div>
                          <span className="text-black uppercase text-[10px] font-bold tracking-wider block mb-1">Arguments</span>
                          <pre className="p-2 text-black overflow-x-auto text-[11px] font-bold" style={{ backgroundColor: '#ffffff', border: '2px solid #000000' }}>
                            {JSON.stringify(trace.args, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-black uppercase text-[10px] font-bold tracking-wider block mb-1">Returned Payload</span>
                          <pre className="p-2 text-black overflow-x-auto text-[11px] font-bold" style={{ backgroundColor: '#ffffff', border: '2px solid #000000' }}>
                            {JSON.stringify(trace.output, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card title="Creative Fatigue Breakdown" action={<span className="text-xs text-black font-mono font-bold">Asset health metrics</span>}>
            <div className="mb-3 text-xs text-black font-semibold font-sans">Active creative variants in camp_meta_03</div>
            <div className="space-y-3.5">
              {CREATIVES_DATA.map((cr) => {
                const statusBg = cr.status === 'Fatigued' ? '#f364cb' : cr.status === 'Healthy' ? '#82e66f' : '#78dbf6';
                return (
                  <div key={cr.id} className="p-3.5 font-sans" style={{ backgroundColor: '#ffffff', border: '2px solid #000000', boxShadow: '3px 3px 0px #000000' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-black">{cr.id}</span>
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5" style={{ backgroundColor: statusBg, color: '#000000', border: '1.5px solid #000000' }}>{cr.status}</span>
                        </div>
                        <h4 className="text-xs font-bold text-black mt-0.5">{cr.name}</h4>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-black">{cr.ageDays}d active</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2 py-2 border-y-2 border-black">
                      <div>
                        <span className="text-black text-[10px] font-bold block">CTR DECAY</span>
                        <span className="text-black font-black">
                          <span className="px-1 py-0.2" style={{ backgroundColor: cr.ctrDecayPct < -20 ? '#f364cb' : '#82e66f', border: '1px solid #000' }}>
                            {cr.ctrDecayPct > 0 ? `+${cr.ctrDecayPct}%` : `${cr.ctrDecayPct}%`}
                          </span>
                        </span>
                      </div>
                      <div>
                        <span className="text-black text-[10px] font-bold block">FREQUENCY</span>
                        <span className="font-black flex items-center gap-1">
                          {cr.frequency > 6.0 && (
                            <span className="text-[10px] px-1.5 py-0.2 font-bold" style={{ backgroundColor: '#ffd23f', border: '1px solid #000' }}>&gt;6.0x</span>
                          )}
                          {cr.frequency.toFixed(1)}x
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-black font-semibold font-mono">
                      <span>Format: {cr.format}</span>
                      <span>Hook: {cr.hookType}</span>
                    </div>
                  </div>
                );
              })}

              <div className="p-3 font-sans font-bold text-xs text-black text-center uppercase tracking-wider" style={{ backgroundColor: '#f364cb', border: '2px solid #000000', boxShadow: '3px 3px 0px #000000' }}>
                Rotate Recommended: Replace cr_meta_03_A with new hook variation
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Diagnosis;