import React from 'react';
import { Panel } from './Panel';

export const MetricCard = ({ label, value, icon, style = {} }) => {
  return (
    <Panel style={{ padding: 'var(--spacing-md)', flexDirection: 'row', alignItems: 'center', gap: 'var(--spacing-md)', ...style }}>
      {icon && (
        <div style={{ 
          fontSize: '1.5rem', 
          color: 'var(--status-info)',
          background: 'color-mix(in srgb, var(--status-info) 10%, transparent)',
          padding: '8px',
          borderRadius: 'var(--border-radius-md)'
        }}>
          {icon}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', color: 'var(--text-primary)' }}>
          {value}
        </span>
      </div>
    </Panel>
  );
};
