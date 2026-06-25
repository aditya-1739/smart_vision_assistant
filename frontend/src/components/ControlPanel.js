import React from 'react';
import { SectionTitle, PrimaryButton } from './ui';

const ToggleSwitch = ({ checked, onChange, label, icon }) => (
  <div 
    onClick={onChange}
    role="switch"
    aria-checked={checked}
    aria-label={label}
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange();
      }
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--spacing-md)',
      background: 'var(--bg-surface-hover)',
      borderRadius: 'var(--border-radius-md)',
      cursor: 'pointer',
      transition: 'var(--transition-fast)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
      {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
      <span style={{ fontSize: 'var(--font-size-md)', fontWeight: '500' }}>{label}</span>
    </div>
    
    <div style={{
      width: '44px',
      height: '24px',
      background: checked ? 'var(--status-safe)' : 'var(--bg-secondary)',
      borderRadius: '12px',
      position: 'relative',
      transition: 'var(--transition-normal)',
      border: `1px solid ${checked ? 'var(--status-safe)' : 'var(--border-color)'}`
    }}>
      <div style={{
        width: '18px',
        height: '18px',
        background: '#fff',
        borderRadius: '50%',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'var(--transition-normal)',
        boxShadow: 'var(--shadow-sm)'
      }} />
    </div>
  </div>
);

const RangeSlider = ({ value, onChange, label, icon, minLabel, maxLabel }) => (
  <div style={{
    padding: 'var(--spacing-md)',
    background: 'var(--bg-surface-hover)',
    borderRadius: 'var(--border-radius-md)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
        <span style={{ fontSize: 'var(--font-size-md)', fontWeight: '500' }}>{label}</span>
      </div>
      <span style={{ color: 'var(--status-info)', fontWeight: '700' }}>
        {Math.round(value * 100)}%
      </span>
    </div>
    
    <input
      type="range"
      min="0.1"
      max="0.9"
      step="0.1"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        background: `linear-gradient(to right, var(--status-info) ${((value - 0.1) / 0.8) * 100}%, var(--bg-secondary) ${((value - 0.1) / 0.8) * 100}%)`,
        outline: 'none',
        WebkitAppearance: 'none',
        cursor: 'pointer',
        marginBottom: 'var(--spacing-sm)'
      }}
      aria-label={label}
    />
    
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
      <span>{minLabel}</span>
      <span>{maxLabel}</span>
    </div>
  </div>
);

function ControlPanel({ config, isRunning, onStart, onStop, onToggleTTS, onConfidenceChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <SectionTitle title="System Controls" icon="⚙️" style={{ marginBottom: 'var(--spacing-sm)' }} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* Main Action Button */}
        <PrimaryButton 
          onClick={isRunning ? onStop : onStart}
          danger={isRunning}
          style={{ width: '100%', padding: 'var(--spacing-md)' }}
        >
          {isRunning ? (
            <><span style={{ fontSize: '1.2rem' }}>⏸</span> Pause System</>
          ) : (
            <><span style={{ fontSize: '1.2rem' }}>▶</span> Start System</>
          )}
        </PrimaryButton>

        {/* Navigation Settings */}
        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
            Navigation Intelligence
          </div>
          <RangeSlider 
            value={config.confidence}
            onChange={onConfidenceChange}
            label="Detection Sensitivity"
            icon="🎯"
            minLabel="More Sensitive"
            maxLabel="More Accurate"
          />
        </div>

        {/* Preferences */}
        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
            Preferences
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <ToggleSwitch 
              checked={config.ttsEnabled}
              onChange={onToggleTTS}
              label="Audio Announcements"
              icon="🔊"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default ControlPanel;