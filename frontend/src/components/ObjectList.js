import React from 'react';
import { SectionTitle, StatusBadge } from './ui';

const getIcon = (label) => {
  const icons = {
    person: '👤', car: '🚗', bicycle: '🚲', motorcycle: '🏍️',
    chair: '🪑', bench: '🛋️', bottle: '🍶', 'cell phone': '📱',
    remote: '📺', dog: '🐕', cat: '🐱', book: '📚',
    backpack: '🎒', umbrella: '☂️',
  };
  return icons[label] || '📦';
};

const getConfidenceBadge = (confidence) => {
  const percent = Math.round(confidence * 100);
  if (percent >= 90) return { status: 'safe', label: `${percent}% Excellent` };
  if (percent >= 70) return { status: 'info', label: `${percent}% High` };
  if (percent >= 50) return { status: 'warning', label: `${percent}% Medium` };
  return { status: 'danger', label: `${percent}% Low` };
};

const getDistanceColor = (distance) => {
  if (!distance) return 'var(--text-secondary)';
  if (distance <= 1.0) return 'var(--status-danger)';
  if (distance <= 2.5) return 'var(--status-warning)';
  return 'var(--status-safe)';
};

function ObjectList({ objects, isRunning }) {
  if (!isRunning) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <SectionTitle title="Live Detections" icon="🎯" style={{ marginBottom: 'var(--spacing-sm)' }} />
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-surface)', borderRadius: 'var(--border-radius-lg)', border: '1px dashed var(--border-color)',
          color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--spacing-xl)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)', opacity: 0.5 }}>🔍</div>
          <p style={{ margin: 0, fontWeight: '500' }}>Start navigation to track objects</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
        <SectionTitle title="Live Detections" icon="🎯" style={{ marginBottom: 0 }} />
        <StatusBadge status="info" label={`${objects.length} Objects`} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', paddingRight: '4px' }}>
        {objects.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-surface)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)',
            textAlign: 'center', padding: 'var(--spacing-xl)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>✅</div>
            <h3 style={{ color: 'var(--status-safe)', margin: '0 0 var(--spacing-xs) 0', fontSize: 'var(--font-size-md)' }}>Path Clear</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 'var(--font-size-sm)' }}>No objects currently detected in your path.</p>
          </div>
        ) : (
          sortedObjects.map((obj, index) => {
            const conf = getConfidenceBadge(obj.confidence);
            const isDanger = obj.distance_meters && obj.distance_meters <= 1.0;
            
            return (
              <div 
                key={obj.id || index} 
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: 'var(--spacing-md)',
                  border: '1px solid',
                  borderColor: isDanger ? 'var(--status-danger)' : 'var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'var(--transition-normal)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    width: '40px', height: '40px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-surface-hover)', borderRadius: 'var(--border-radius-sm)'
                  }}>
                    {getIcon(obj.label)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', textTransform: 'capitalize', fontSize: 'var(--font-size-md)' }}>
                      {obj.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginTop: '4px' }}>
                      <StatusBadge status={conf.status} label={conf.label} style={{ fontSize: '0.65rem', padding: '2px 6px' }} />
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {obj.position}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: 'var(--font-size-lg)', 
                    fontWeight: '700', 
                    color: getDistanceColor(obj.distance_meters)
                  }}>
                    {obj.distance_meters ? `${obj.distance_meters.toFixed(1)}m` : '--'}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Distance
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ObjectList;