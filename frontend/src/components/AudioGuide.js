import React from 'react';
import { Panel, SectionTitle, IconButton } from './ui';

const getNavigationState = (closestObject) => {
  if (!closestObject) return { level: 'clear', color: 'var(--status-safe)', icon: '✅', title: 'Path Clear', action: 'Proceed safely' };
  
  const dist = closestObject.distance_meters;
  if (!dist) return { level: 'info', color: 'var(--status-info)', icon: 'ℹ️', title: 'Detecting', action: 'Analyzing surroundings' };
  
  if (dist <= 1.0) {
    return { level: 'danger', color: 'var(--status-danger)', icon: '🚨', title: 'Emergency', action: 'STOP IMMEDIATELY' };
  } else if (dist <= 2.5) {
    return { level: 'warning', color: 'var(--status-warning)', icon: '⚠️', title: 'Warning', action: 'Slow down' };
  } else {
    return { level: 'clear', color: 'var(--status-safe)', icon: '✅', title: 'Clear', action: 'Proceed safely' };
  }
};

const InfoBlock = ({ label, value, valueColor = '#fff', icon }) => (
  <div style={{ 
    background: 'var(--bg-surface-hover)', 
    padding: 'var(--spacing-sm) var(--spacing-md)', 
    borderRadius: 'var(--border-radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  }}>
    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-lg)', fontWeight: '600', color: valueColor, textTransform: 'capitalize' }}>
      {icon && <span>{icon}</span>}
      {value}
    </div>
  </div>
);

function AudioGuide({ message, isEnabled, onToggle, closestObject, voiceState }) {
  const navState = getNavigationState(closestObject);
  
  const renderVoiceState = () => {
    if (voiceState === 'speaking') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-info)' }}>
          <span style={{ animation: 'pulse-subtle 1s infinite' }}>🎤</span>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600' }}>SPEAKING</span>
        </div>
      );
    } else if (voiceState === 'listening') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-safe)' }}>
          <span>🎤</span>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600' }}>LISTENING</span>
        </div>
      );
    } else {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
          <span>🔇</span>
          <span style={{ fontSize: 'var(--font-size-xs)' }}>MUTED</span>
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--spacing-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionTitle title="Navigation HUD" icon="🧭" style={{ marginBottom: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {renderVoiceState()}
          <IconButton 
            icon={isEnabled ? '🔊' : '🔇'} 
            active={isEnabled} 
            onClick={onToggle} 
            title="Toggle Voice Announcements"
          />
        </div>
      </div>

      <Panel style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-md)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Dynamic Background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at top right, color-mix(in srgb, ${navState.color} 15%, transparent), transparent 70%)`,
          pointerEvents: 'none', zIndex: 0
        }} />

        {/* Primary Action Banner */}
        <div style={{ 
          zIndex: 1, 
          background: `color-mix(in srgb, ${navState.color} 10%, var(--bg-surface-hover))`,
          borderLeft: `4px solid ${navState.color}`,
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--border-radius-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              System State: {navState.title}
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', color: navState.color }}>
              {navState.action}
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', opacity: 0.8 }}>
            {navState.icon}
          </div>
        </div>

        {/* Dense Information Grid */}
        <div style={{ zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
          <InfoBlock 
            label="Nearest Object" 
            value={closestObject ? closestObject.label : '--'} 
          />
          <InfoBlock 
            label="Distance" 
            value={closestObject && closestObject.distance_meters ? `${closestObject.distance_meters.toFixed(1)}m` : '--'} 
            valueColor={closestObject ? navState.color : '#fff'}
          />
          <InfoBlock 
            label="Direction" 
            value={closestObject?.position || '--'} 
          />
          <InfoBlock 
            label="Confidence" 
            value={closestObject ? `${Math.round(closestObject.confidence * 100)}%` : '--'} 
          />
        </div>
      </Panel>
    </div>
  );
}

export default AudioGuide;