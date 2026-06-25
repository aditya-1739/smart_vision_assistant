import React from 'react';
import { SectionTitle, StatusBadge } from './ui';

export const ActivityTimeline = ({ events }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <SectionTitle title="Activity Timeline" icon="⏱️" style={{ marginBottom: 'var(--spacing-sm)' }} />
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)',
        paddingRight: '4px'
      }}>
        {events.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--spacing-md)'
          }}>
            No recent activity
          </div>
        ) : (
          events.map((event, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--border-radius-md)',
              borderLeft: `3px solid var(--status-${event.type || 'info'})`,
              animation: 'fade-in 0.3s ease-out forwards',
            }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', minWidth: '60px' }}>
                {event.time}
              </div>
              <div style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                {event.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;
