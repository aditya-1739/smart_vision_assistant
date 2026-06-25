import React from 'react';
import { Panel, SectionTitle, IconButton } from './ui';

const getNavigationState = (closestObject) => {
  if (!closestObject) return { level: 'clear', color: 'var(--status-safe)', icon: '✅', title: 'PATH CLEAR', action: 'Proceed safely' };
  
  const dist = closestObject.distance_meters;
  if (!dist) return { level: 'info', color: 'var(--status-info)', icon: 'ℹ️', title: 'DETECTING', action: 'Analyzing surroundings' };
  
  if (dist <= 1.0) {
    return { level: 'danger', color: 'var(--status-danger)', icon: '🚨', title: 'EMERGENCY STOP', action: 'STOP IMMEDIATELY' };
  } else if (dist <= 2.5) {
    return { level: 'warning', color: 'var(--status-warning)', icon: '⚠️', title: 'WARNING', action: 'Slow down, prepare to avoid' };
  } else {
    return { level: 'clear', color: 'var(--status-safe)', icon: '✅', title: 'PATH CLEAR', action: 'Proceed safely' };
  }
};

const DistanceBar = ({ distance, maxDistance = 5.0, color }) => {
  if (!distance) return <div style={{ height: '8px', background: 'var(--bg-surface-hover)', borderRadius: '4px' }} />;
  
  // Inverse percentage so closer is fuller
  const percentage = Math.max(5, 100 - (distance / maxDistance) * 100);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, height: '8px', background: 'var(--bg-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ 
          width: `${percentage}%`, 
          height: '100%', 
          background: color,
          transition: 'width 0.3s ease-out, background 0.3s ease'
        }} />
      </div>
      <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', minWidth: '50px' }}>
        {distance.toFixed(1)}m
      </span>
    </div>
  );
};

function AudioGuide({ message, isEnabled, onToggle, closestObject, voiceState }) {
  const navState = getNavigationState(closestObject);
  
  const panelStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  };

  // Dynamic animated background based on state
  const backgroundStyle = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: `radial-gradient(circle at center 0%, color-mix(in srgb, ${navState.color} 15%, transparent), transparent 70%)`,
    transition: 'background 0.5s ease',
    pointerEvents: 'none',
    zIndex: 0,
  };

  const renderVoiceState = () => {
    if (voiceState === 'speaking') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-info)' }}>
          <span style={{ animation: 'pulse-subtle 1s infinite' }}>🎤</span>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>Speaking...</span>
        </div>
      );
    } else if (voiceState === 'listening') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-safe)' }}>
          <span>🎤</span>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>Listening...</span>
        </div>
      );
    } else {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <span>🔇</span>
          <span style={{ fontSize: 'var(--font-size-sm)' }}>Muted</span>
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <SectionTitle title="Navigation Guidance" icon="🧭" style={{ marginBottom: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          {renderVoiceState()}
          <IconButton 
            icon={isEnabled ? '🔊' : '🔇'} 
            active={isEnabled} 
            onClick={onToggle} 
            title="Toggle Voice Announcements"
          />
        </div>
      </div>

      <Panel style={panelStyle}>
        <div style={backgroundStyle} />
        
        {/* State Banner */}
        <div style={{ zIndex: 1, textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-sm)' }}>
            {navState.icon}
          </div>
          <h2 style={{ 
            fontSize: 'var(--font-size-2xl)', 
            fontWeight: '700', 
            color: navState.color,
            letterSpacing: '1px',
            margin: 0,
            transition: 'color 0.3s ease'
          }}>
            {navState.title}
          </h2>
        </div>

        {/* Action Recommendation */}
        <div style={{ zIndex: 1, textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--bg-surface-hover)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            Recommended Action
          </div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', color: '#fff' }}>
            {navState.action}
          </div>
        </div>

        {/* Detailed Metrics */}
        <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'auto' }}>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Nearest Object</span>
              <span style={{ fontSize: 'var(--font-size-md)', fontWeight: '600', color: '#fff', textTransform: 'capitalize' }}>
                {closestObject ? closestObject.label : '--'}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)', marginTop: 'var(--spacing-md)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Distance</span>
            </div>
            <DistanceBar distance={closestObject?.distance_meters} color={navState.color} />
          </div>

        </div>
      </Panel>
    </div>
  );
}

export default AudioGuide;