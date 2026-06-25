import React from 'react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '1.2rem',
    fontWeight: '600',
    color: 'var(--accent-primary)',
    marginBottom: '-5px',
  },
  mainActionBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '1.2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  settingsGroup: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '12px',
  },
  settingTitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.1)',
    outline: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '10px',
    marginTop: '10px',
    borderTop: '1px dashed var(--glass-border)',
    cursor: 'pointer',
  },
  toggleLabel: {
    fontSize: '1.05rem',
    color: '#fff',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  toggleSwitch: {
    width: '46px',
    height: '24px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    position: 'relative',
    transition: 'all 0.3s',
  },
  toggleSwitchOn: {
    background: 'var(--accent-success)',
  },
  toggleKnob: {
    width: '20px',
    height: '20px',
    background: '#fff',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform 0.3s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  toggleKnobOn: {
    transform: 'translateX(22px)',
  },
};

function ControlPanel({ config, isRunning, onStart, onStop, onToggleTTS, onConfidenceChange }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        ⚙️ Settings & Controls
      </div>

      <button
        onClick={isRunning ? onStop : onStart}
        className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'}`}
        style={styles.mainActionBtn}
        aria-label={isRunning ? 'Pause navigation' : 'Start navigation'}
      >
        {isRunning ? (
          <><span>⏸</span> Pause System</>
        ) : (
          <><span>▶</span> Start System</>
        )}
      </button>

      <div style={styles.settingsGroup}>
        <div style={styles.settingTitle}>
          <span>🎯</span> Detection Sensitivity
        </div>
        <div style={styles.sliderContainer}>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.1"
            value={config.confidence}
            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
            style={styles.slider}
            aria-label="Detection confidence threshold"
          />
          <div style={styles.sliderLabels}>
            <span>More Sensitive</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>
              {Math.round(config.confidence * 100)}%
            </span>
            <span>More Accurate</span>
          </div>
        </div>
      </div>

      <div style={styles.settingsGroup}>
        <div style={styles.settingTitle}>
          <span>🔊</span> Audio Preferences
        </div>
        
        <div style={styles.toggleRow} onClick={onToggleTTS}>
          <span style={styles.toggleLabel}>Audio Announcements</span>
          <div style={{...styles.toggleSwitch, ...(config.ttsEnabled ? styles.toggleSwitchOn : {})}}>
            <div style={{...styles.toggleKnob, ...(config.ttsEnabled ? styles.toggleKnobOn : {})}} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;