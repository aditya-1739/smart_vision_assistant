import React from 'react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  card: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  mainMessage: {
    background: 'rgba(0, 212, 255, 0.1)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '12px',
    padding: '12px 15px',
    textAlign: 'center',
    transition: 'all 0.3s',
  },
  urgentMessage: {
    background: 'rgba(255, 71, 87, 0.15)',
    borderColor: 'var(--accent-danger)',
    boxShadow: '0 0 20px rgba(255, 71, 87, 0.2)',
  },
  messageText: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#fff',
    lineHeight: '1.3',
    marginBottom: '4px',
  },
  urgentText: {
    color: 'var(--accent-danger)',
  },
  dataGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  dataBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    padding: '10px',
  },
  dataLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '5px',
  },
  dataValue: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  controls: {
    marginTop: 'auto',
    paddingTop: '10px',
    borderTop: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
};

function AudioGuide({ message, isEnabled, onToggle, closestObject }) {
  const isUrgent = message?.urgent || (message?.text && message.text.includes('Warning'));

  // Determine recommended action based on object distance
  let recommendedAction = "Proceed safely";
  if (closestObject) {
    if (closestObject.distance_meters < 1.0) {
      recommendedAction = "STOP IMMEDIATELY";
    } else if (closestObject.distance_meters < 2.5) {
      recommendedAction = "Slow down, prepare to avoid";
    } else {
      recommendedAction = "Path clear, proceed";
    }
  } else if (!message) {
      recommendedAction = "Waiting for data...";
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>🔊 Navigation Guidance</div>
      </div>

      <div style={styles.card}>
        <div 
          style={{
            ...styles.mainMessage,
            ...(isUrgent ? styles.urgentMessage : {})
          }}
          role="alert"
          aria-live={isUrgent ? "assertive" : "polite"}
        >
          <div style={{
            ...styles.messageText,
            ...(isUrgent ? styles.urgentText : {})
          }}>
            {message ? message.text : "System ready. Awaiting guidance..."}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            CURRENT INSTRUCTION
          </div>
        </div>

        <div style={styles.dataGrid}>
          <div style={styles.dataBox}>
            <div style={styles.dataLabel}>Nearest Object</div>
            <div style={styles.dataValue}>
              {closestObject ? `${closestObject.label} ${closestObject.position ? `(${closestObject.position})` : ''}` : '--'}
            </div>
          </div>
          <div style={styles.dataBox}>
            <div style={styles.dataLabel}>Est. Distance</div>
            <div style={{...styles.dataValue, color: closestObject?.distance_meters < 1.5 ? 'var(--accent-danger)' : 'var(--accent-primary)'}}>
              {closestObject?.distance_meters ? `${closestObject.distance_meters.toFixed(1)}m` : '--'}
            </div>
          </div>
        </div>

        <div style={{...styles.dataBox, marginTop: '-5px'}}>
          <div style={styles.dataLabel}>Recommended Action</div>
          <div style={{...styles.dataValue, color: recommendedAction === "STOP IMMEDIATELY" ? 'var(--accent-danger)' : '#fff'}}>
            {recommendedAction}
          </div>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: isEnabled ? 'var(--accent-success)' : 'var(--accent-danger)'
          }}></div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Voice Announcements: <strong style={{color: '#fff'}}>{isEnabled ? 'ON' : 'MUTED'}</strong>
          </span>
        </div>
        
        <button
          onClick={onToggle}
          className={`btn ${isEnabled ? 'btn-glass' : 'btn-primary'}`}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          aria-label={isEnabled ? 'Mute voice announcements' : 'Enable voice announcements'}
        >
          {isEnabled ? '🔇 Mute' : '🔊 Unmute'}
        </button>
      </div>
    </div>
  );
}

export default AudioGuide;