import React from 'react';

const styles = {
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    marginBottom: '15px',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  logo: {
    fontSize: '2rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '600',
    border: '1px solid',
  },
  activeBadge: {
    background: 'rgba(0, 212, 255, 0.1)',
    color: 'var(--accent-primary)',
    borderColor: 'var(--accent-primary)',
  },
  inactiveBadge: {
    background: 'rgba(255, 100, 100, 0.1)',
    color: 'var(--accent-danger)',
    borderColor: 'var(--accent-danger)',
  },
  iconBtn: {
    background: 'transparent',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

function TopBar({ isRunning, isConnected, highContrastMode, toggleHighContrast, accessibilityMode, toggleAccessibility }) {
  return (
    <header className="glass-panel" style={styles.topBar} role="banner">
      <div style={styles.titleGroup}>
        <div style={styles.logo} aria-hidden="true">🔭</div>
        <div>
          <h1 className="text-gradient" style={styles.title}>Smart Navigation</h1>
          <p style={styles.subtitle}>AI Assistant for Visually Impaired Users</p>
        </div>
      </div>

      <div style={styles.controlsGroup}>
        <div 
          style={{
            ...styles.statusBadge,
            ...(isRunning ? styles.activeBadge : styles.inactiveBadge)
          }}
          role="status"
          aria-live="polite"
        >
          <span style={{ fontSize: '1.2rem', animation: isRunning ? 'pulse 2s infinite' : 'none' }}>
            {isRunning ? '●' : '○'}
          </span>
          {isRunning ? 'System Active' : 'System Standby'}
        </div>

        <div style={{...styles.statusBadge, border: 'none', background: 'transparent', color: isConnected ? 'var(--accent-success)' : 'var(--accent-danger)'}}>
           {isConnected ? '🟢 Server Connected' : '🔴 Server Offline'}
        </div>

        <button 
          style={{...styles.iconBtn, background: highContrastMode ? 'var(--accent-primary)' : 'transparent', color: highContrastMode ? '#000' : 'var(--text-primary)'}}
          onClick={toggleHighContrast}
          aria-label="Toggle High Contrast Mode"
          title="High Contrast Mode"
        >
          🌓
        </button>

        <button 
          style={{...styles.iconBtn, background: accessibilityMode ? 'var(--accent-primary)' : 'transparent', color: accessibilityMode ? '#000' : 'var(--text-primary)'}}
          onClick={toggleAccessibility}
          aria-label="Toggle Accessibility Mode (Larger Text)"
          title="Accessibility Mode"
        >
          Aa
        </button>
      </div>
    </header>
  );
}

export default TopBar;
