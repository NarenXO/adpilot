import React from 'react';
import { useAppState } from '../../context/AppStateContext';

export const TopBar: React.FC = () => {
  const { appState, stepForward, togglePlay, setSpeed, toggleAutonomy, activateKillSwitch, deactivateKillSwitch } = useAppState();

  return (
    <header style={{
      height: 64, minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.25rem', background: '#ffffff', borderBottom: '3px solid #000',
      position: 'sticky', top: 0, zIndex: 90, fontFamily: "'Space Grotesk', sans-serif", gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ background: '#78dbf6', border: '2px solid #000', padding: '6px 12px', fontWeight: 800, fontSize: 14, boxShadow: '2px 2px 0 #000' }}>
          SIM {appState.sim_date}
        </div>

        <button onClick={stepForward} style={{
          background: '#ffd23f', border: '2px solid #000', padding: '6px 14px', fontWeight: 900,
          fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #000'
        }}>
          +1 DAY
        </button>

        <button onClick={togglePlay} style={{
          background: appState.is_playing ? '#82e66f' : '#ffffff', border: '2px solid #000',
          padding: '6px 12px', fontWeight: 800, cursor: 'pointer', boxShadow: '2px 2px 0 #000'
        }}>
          {appState.is_playing ? 'PAUSE' : 'PLAY'}
        </button>

        <div style={{ display: 'flex', border: '2px solid #000', background: '#fff' }}>
          {([1, 2, 5] as const).map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              padding: '4px 10px', fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer',
              background: appState.play_speed === s ? '#78dbf6' : 'transparent'
            }}>{s}x</button>
          ))}
        </div>
      </div>

      <button onClick={toggleAutonomy} style={{
        background: appState.autonomy_level === 'autopilot' ? '#82e66f' : '#ffd23f',
        border: '2px solid #000', padding: '6px 16px', fontWeight: 900, fontSize: 12,
        boxShadow: '2px 2px 0 #000', cursor: 'pointer'
      }}>
        {appState.autonomy_level === 'autopilot' ? '● AUTOPILOT' : '● SUPERVISED'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>
          RISK {appState.risk_budget.used_pct}% / {appState.risk_budget.cap_pct}%
        </div>
        <button onClick={() => appState.killswitch_active ? deactivateKillSwitch() : activateKillSwitch()} style={{
          background: appState.killswitch_active ? '#f364cb' : '#fff', border: '2px solid #000',
          padding: '6px 14px', fontWeight: 900, fontSize: 12, cursor: 'pointer', boxShadow: '2px 2px 0 #000'
        }}>
          {appState.killswitch_active ? 'KILL ACTIVE' : 'KILL SWITCH'}
        </button>
      </div>
    </header>
  );
};

export default TopBar;