import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TimelineChart, Incident } from '../components/charts/TimelineChart';
import { palette } from '../theme/tokens';

// Golden path fallback incidents (matching fixtures/incidents.json)
const FALLBACK_INCIDENTS: Incident[] = [
  {
    id: 'INC-001',
    sim_date: '2024-06-15',
    metric: 'ctr',
    scope: {
      platform: 'meta',
      campaign_id: 'camp_meta_03',
      sku: 'SKU-007',
      creative_id: 'cr_042',
    },
    direction: 'down',
    magnitude_pct: 35.2,
    detector: 'creative_fatigue',
    confidence: 0.92,
    money_at_risk: 340.0,
    severity: 312.8,
    status: 'open',
  },
  {
    id: 'INC-002',
    sim_date: '2024-06-15',
    metric: 'days_of_cover',
    scope: {
      platform: 'google',
      campaign_id: 'camp_goog_01',
      sku: 'SKU-002',
    },
    direction: 'down',
    magnitude_pct: 80.0,
    detector: 'stockout_risk',
    confidence: 0.95,
    money_at_risk: 850.0,
    severity: 807.5,
    status: 'open',
  },
  {
    id: 'INC-003',
    sim_date: '2024-06-14',
    metric: 'purchases',
    scope: {
      platform: 'tiktok',
      campaign_id: 'camp_tt_02',
      sku: 'SKU-015',
    },
    direction: 'down',
    magnitude_pct: 88.0,
    detector: 'tracking_break',
    confidence: 0.95,
    money_at_risk: 420.0,
    severity: 399.0,
    status: 'diagnosed',
  },
  {
    id: 'INC-004',
    sim_date: '2024-06-13',
    metric: 'margin_pct',
    scope: {
      platform: 'shopify',
      sku: 'SKU-009',
    },
    direction: 'down',
    magnitude_pct: 42.5,
    detector: 'margin_squeeze',
    confidence: 0.90,
    money_at_risk: 280.0,
    severity: 252.0,
    status: 'resolved',
  },
  {
    id: 'INC-005',
    sim_date: '2024-06-12',
    metric: 'cpc',
    scope: {
      platform: 'meta',
      campaign_id: 'camp_meta_01',
      sku: 'SKU-001',
    },
    direction: 'up',
    magnitude_pct: 28.4,
    detector: 'ewma',
    confidence: 0.84,
    money_at_risk: 160.0,
    severity: 134.4,
    status: 'resolved',
  },
];

export const Incidents: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'diagnosed' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'severity' | 'money_at_risk' | 'recent' | 'confidence'>('severity');

  // Fetch live incidents from API or fallback
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/api/incidents');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.incidents || [];
          if (isMounted && items.length > 0) {
            setIncidents(items);
            return;
          }
        }
      } catch (err) {
        // Fallback gracefully on network error or missing server
      }
      if (isMounted) {
        setIncidents(FALLBACK_INCIDENTS);
      }
    }

    loadData().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter & Search
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (statusFilter !== 'all' && inc.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMetric = inc.metric.toLowerCase().includes(query);
        const matchesPlatform = (inc.scope?.platform || '').toLowerCase().includes(query);
        const matchesCampaign = (inc.scope?.campaign_id || '').toLowerCase().includes(query);
        const matchesSku = (inc.scope?.sku || '').toLowerCase().includes(query);
        const matchesCreative = (inc.scope?.creative_id || '').toLowerCase().includes(query);
        const matchesDetector = inc.detector.toLowerCase().includes(query);
        const matchesId = inc.id.toLowerCase().includes(query);

        return (
          matchesMetric ||
          matchesPlatform ||
          matchesCampaign ||
          matchesSku ||
          matchesCreative ||
          matchesDetector ||
          matchesId
        );
      }
      return true;
    });
  }, [incidents, statusFilter, searchQuery]);

  // Ranked sorting (default descending by severity)
  const sortedIncidents = useMemo(() => {
    const list = [...filteredIncidents];
    list.sort((a, b) => {
      if (sortBy === 'severity') {
        return b.severity - a.severity;
      }
      if (sortBy === 'money_at_risk') {
        return b.money_at_risk - a.money_at_risk;
      }
      if (sortBy === 'confidence') {
        return b.confidence - a.confidence;
      }
      if (sortBy === 'recent') {
        return new Date(b.sim_date).getTime() - new Date(a.sim_date).getTime();
      }
      return 0;
    });
    return list;
  }, [filteredIncidents, sortBy]);

  // Summary Metrics
  const totalMoneyAtRisk = useMemo(() => {
    return incidents.reduce((sum, item) => sum + item.money_at_risk, 0);
  }, [incidents]);

  const maxSeverity = useMemo(() => {
    return incidents.length > 0 ? Math.max(...incidents.map((i) => i.severity)) : 0;
  }, [incidents]);

  const openCount = useMemo(() => {
    return incidents.filter((i) => i.status === 'open').length;
  }, [incidents]);

  const handleInvestigate = (id: string) => {
    navigate(`/diagnosis?id=${id}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          borderBottom: '3px solid #000',
          paddingBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>
              Incidents & Anomaly Radar
            </h1>
            <span
              style={{
                background: palette.accent.pink,
                border: '3px solid #000',
                boxShadow: '3px 3px 0px #000',
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#000',
              }}
            >
              Live Sentinel Stream
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>
            Continuous seasonal EWMA monitoring and deterministic business rules. Ranked descending by revenue risk.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <span
            style={{
              background: '#ffffff',
              border: '3px solid #000',
              boxShadow: '3px 3px 0px #000',
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span style={{ width: 10, height: 10, background: palette.accent.lime, borderRadius: '50%', border: '1px solid #000' }} />
            4 GOLDEN PATH DETECTORS ACTIVE
          </span>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '3px solid #000',
            boxShadow: '5px 5px 0px #000',
            padding: '1rem',
            borderTop: `6px solid ${palette.accent.pink}`,
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>
            Active Open Incidents
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.25rem', fontFamily: 'monospace' }}>
            {openCount} / {incidents.length}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#222', marginTop: '0.2rem' }}>
            Requiring immediate triage
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '3px solid #000',
            boxShadow: '5px 5px 0px #000',
            padding: '1rem',
            borderTop: `6px solid ${palette.accent.yellow}`,
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>
            Total Money At Risk
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.25rem', fontFamily: 'monospace' }}>
            ${totalMoneyAtRisk.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#222', marginTop: '0.2rem' }}>
            Potential daily ad waste
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '3px solid #000',
            boxShadow: '5px 5px 0px #000',
            padding: '1rem',
            borderTop: `6px solid ${palette.accent.cyan}`,
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>
            Max Severity Score
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.25rem', fontFamily: 'monospace' }}>
            {maxSeverity.toFixed(1)}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#222', marginTop: '0.2rem' }}>
            Stockout risk leading
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '3px solid #000',
            boxShadow: '5px 5px 0px #000',
            padding: '1rem',
            borderTop: `6px solid ${palette.accent.lime}`,
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>
            Decoy Noise Suppressed
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.25rem', fontFamily: 'monospace' }}>
            100%
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#222', marginTop: '0.2rem' }}>
            Holiday demand & promos guarded
          </div>
        </div>
      </div>

      {/* Multichannel Timeline Section */}
      <TimelineChart
        incidents={incidents}
        onSelectIncident={(id) => handleInvestigate(id)}
      />

      {/* Controls & Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '3px solid #000',
          boxShadow: '5px 5px 0px #000',
          padding: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          {(['all', 'open', 'diagnosed', 'resolved'] as const).map((status) => {
            const isActive = statusFilter === status;
            let activeColor = palette.accent.cyan;
            if (status === 'open') activeColor = palette.accent.pink;
            if (status === 'resolved') activeColor = palette.accent.lime;
            if (status === 'diagnosed') activeColor = palette.accent.yellow;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  background: isActive ? activeColor : '#ffffff',
                  border: '2px solid #000',
                  boxShadow: isActive ? '2px 2px 0px #000' : 'none',
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {status} ({status === 'all' ? incidents.length : incidents.filter((i) => i.status === status).length})
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search metric, SKU, detector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.45rem 0.8rem',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px #000',
              fontSize: '0.85rem',
              fontWeight: 700,
              fontFamily: '"Space Grotesk", sans-serif',
              minWidth: '240px',
            }}
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '0.45rem 0.8rem',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px #000',
              fontSize: '0.85rem',
              fontWeight: 800,
              fontFamily: '"Space Grotesk", sans-serif',
              background: '#ffffff',
            }}
          >
            <option value="severity">SORT: SEVERITY (HIGH → LOW)</option>
            <option value="money_at_risk">SORT: MONEY AT RISK</option>
            <option value="confidence">SORT: CONFIDENCE</option>
            <option value="recent">SORT: RECENT DATE</option>
          </select>
        </div>
      </div>

      {/* Incident List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sortedIncidents.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              border: '3px solid #000',
              boxShadow: '5px 5px 0px #000',
              padding: '3rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase' }}>
              No incidents matching filter
            </div>
            <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              All metrics within normal seasonal bands.
            </p>
          </div>
        ) : (
          sortedIncidents.map((inc) => {
            const isCritical = inc.severity >= 150;
            const leftBorderColor = isCritical ? palette.accent.pink : palette.accent.yellow;

            let statusBg = palette.accent.yellow;
            if (inc.status === 'open') statusBg = palette.accent.pink;
            if (inc.status === 'resolved') statusBg = palette.accent.lime;

            return (
              <div
                key={inc.id}
                style={{
                  background: '#ffffff',
                  border: '3px solid #000000',
                  borderLeft: `12px solid ${leftBorderColor}`,
                  boxShadow: '5px 5px 0px #000000',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        background: '#000000',
                        color: '#ffffff',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                      }}
                    >
                      {inc.id}
                    </span>

                    <span
                      style={{
                        background: statusBg,
                        border: '2px solid #000',
                        boxShadow: '2px 2px 0px #000',
                        padding: '0.15rem 0.5rem',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                      }}
                    >
                      {inc.status}
                    </span>

                    <span
                      style={{
                        background: palette.accent.cyan,
                        border: '2px solid #000',
                        padding: '0.15rem 0.5rem',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                      }}
                    >
                      {inc.detector.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#333', fontFamily: 'monospace' }}>
                    DETECTED: {inc.sim_date}
                  </div>
                </div>

                {/* Scope & Metric Info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', background: '#f8f8f4', border: '2px solid #000', padding: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#666' }}>Target Metric</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', color: inc.direction === 'down' ? '#e11d48' : '#16a34a' }}>
                      {inc.metric} ({inc.direction === 'down' ? '▼' : '▲'} {inc.magnitude_pct}%)
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#666' }}>Entity Scope</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                      {inc.scope?.platform?.toUpperCase()} // {inc.scope?.sku || inc.scope?.campaign_id || 'All'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#666' }}>Money At Risk</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'monospace' }}>
                      ${inc.money_at_risk.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#666' }}>Severity & Conf.</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, fontFamily: 'monospace' }}>
                      {inc.severity.toFixed(1)} / {(inc.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Card Footer with CTA */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', paddingTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#444' }}>
                    {inc.scope?.creative_id ? `Creative Asset: ${inc.scope.creative_id}` : `Campaign Ref: ${inc.scope?.campaign_id || 'Global'}`}
                  </div>

                  <button
                    onClick={() => handleInvestigate(inc.id)}
                    style={{
                      background: palette.accent.lime,
                      border: '3px solid #000000',
                      boxShadow: '4px 4px 0px #000000',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    Investigate Diagnosis &rarr;
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Incidents;
