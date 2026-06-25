import React from 'react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '5px',
    maxHeight: '220px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px dashed var(--glass-border)',
  },
  objectCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '10px 12px',
    border: '1px solid var(--glass-border)',
    transition: 'all 0.2s',
  },
  cardUrgent: {
    background: 'rgba(255, 71, 87, 0.1)',
    borderColor: 'var(--accent-danger)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  objectInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
  },
  label: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  positionBadge: {
    fontSize: '0.75rem',
    padding: '2px 8px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.1)',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  distance: {
    textAlign: 'right',
  },
  distanceVal: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--accent-primary)',
  },
  distanceUrgent: {
    color: 'var(--accent-danger)',
  },
  confidenceContainer: {
    marginTop: '10px',
  },
  confidenceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  progressBarBg: {
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'var(--accent-primary)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  summaryBadge: {
    fontSize: '0.85rem',
    padding: '4px 12px',
    background: 'rgba(0, 212, 255, 0.1)',
    color: 'var(--accent-primary)',
    borderRadius: '20px',
    fontWeight: '600',
  }
};

const getIcon = (label) => {
  const icons = {
    person: '👤', car: '🚗', bicycle: '🚲', motorcycle: '🏍️',
    chair: '🪑', bench: '🛋️', bottle: '🍶', 'cell phone': '📱',
    remote: '📺', dog: '🐕', cat: '🐱', book: '📚',
    backpack: '🎒', umbrella: '☂️',
  };
  return icons[label] || '🔹';
};

function ObjectList({ objects, isRunning }) {
  if (!isRunning) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>🎯 Detection History</div>
        </div>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}>🔍</div>
          <p>Start navigation to track objects</p>
        </div>
      </div>
    );
  }

  const sortedObjects = [...objects].sort((a, b) => {
    const distA = a.distance_meters || 999;
    const distB = b.distance_meters || 999;
    return distA - distB;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>🎯 Real-time Detections</div>
        <div style={styles.summaryBadge}>
          {objects.length} object{objects.length !== 1 ? 's' : ''}
        </div>
      </div>

      {objects.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.8 }}>✅</div>
          <p style={{ color: 'var(--accent-success)', fontWeight: '600' }}>Path Clear</p>
          <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>No objects currently detected</p>
        </div>
      ) : (
        <div style={styles.listContainer} role="list" aria-label="Detected objects list">
          {sortedObjects.map((obj, index) => {
            const isUrgent = obj.distance_meters && obj.distance_meters < 1.5;
            const confPercent = Math.round(obj.confidence * 100);
            
            return (
              <div 
                key={obj.id || index} 
                style={{...styles.objectCard, ...(isUrgent ? styles.cardUrgent : {})}}
                role="listitem"
              >
                <div style={styles.cardHeader}>
                  <div style={styles.objectInfo}>
                    <div style={styles.iconBox} aria-hidden="true">{getIcon(obj.label)}</div>
                    <div>
                      <div style={styles.label}>{obj.label}</div>
                      <div style={styles.positionBadge}>{obj.position}</div>
                    </div>
                  </div>
                  <div style={styles.distance}>
                    {obj.distance_meters ? (
                      <>
                        <div style={{...styles.distanceVal, ...(isUrgent ? styles.distanceUrgent : {})}}>
                          {obj.distance_meters < 10 ? obj.distance_meters.toFixed(1) : Math.round(obj.distance_meters)}m
                        </div>
                        <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                          {obj.distance_label || 'distance'}
                        </div>
                      </>
                    ) : (
                      <div style={{...styles.distanceVal, color: 'var(--text-secondary)'}}>--</div>
                    )}
                  </div>
                </div>

                <div style={styles.confidenceContainer}>
                  <div style={styles.confidenceHeader}>
                    <span>AI Confidence</span>
                    <span>{confPercent}%</span>
                  </div>
                  <div style={styles.progressBarBg}>
                    <div style={{
                      ...styles.progressBarFill, 
                      width: `${confPercent}%`,
                      background: confPercent > 80 ? 'var(--accent-success)' : (confPercent > 50 ? 'var(--accent-warning)' : 'var(--accent-danger)')
                    }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ObjectList;