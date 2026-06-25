import React from 'react';
import { Panel, IconButton, StatusBadge } from './ui';

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--spacing-md) var(--spacing-lg)',
    marginBottom: 'var(--spacing-sm)',
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    borderBottom: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-lg)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
  },
  logo: {
    fontSize: '2rem',
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    margin: 0,
    fontWeight: '500',
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-lg)',
  },
  statusPanel: {
    display: 'flex',
    gap: 'var(--spacing-md)',
    padding: '0 var(--spacing-md)',
    borderRight: '1px solid var(--border-color)',
    borderLeft: '1px solid var(--border-color)',
  },
  iconGroup: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
  }
};

function TopBar({ isRunning, isConnected, highContrastMode, toggleHighContrast, accessibilityMode, toggleAccessibility }) {
  return (
    <header style={styles.header} role="banner">
      <div style={styles.titleGroup}>
        <div style={styles.logo} aria-hidden="true">🔭</div>
        <div>
          <h1 style={styles.title}>Smart Navigation Assistant</h1>
          <p style={styles.subtitle}>AI-Powered Assistive Vision System</p>
        </div>
      </div>

      <div style={styles.controlsGroup}>
        <div style={styles.statusPanel} aria-label="System Status">
          <StatusBadge 
            status={isConnected ? 'online' : 'offline'} 
            label="Backend" 
            pulse={isConnected}
          />
          <StatusBadge 
            status={isRunning ? 'online' : 'info'} 
            label="AI Model" 
            pulse={isRunning}
          />
          <StatusBadge 
            status={isRunning ? 'online' : 'warning'} 
            label="Camera" 
          />
        </div>

        <div style={styles.iconGroup}>
          <IconButton 
            icon="🌓"
            active={highContrastMode}
            onClick={toggleHighContrast}
            title="Toggle High Contrast Mode"
          />
          <IconButton 
            icon="Aa"
            active={accessibilityMode}
            onClick={toggleAccessibility}
            title="Toggle Accessibility Mode"
          />
        </div>
      </div>
    </header>
  );
}

export default TopBar;
