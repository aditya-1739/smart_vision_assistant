import React from 'react';
import { Panel } from './Panel';

export const InfoCard = ({ title, children, icon, color = 'var(--status-info)', style = {} }) => {
  return (
    <Panel style={{ borderLeft: `4px solid ${color}`, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
        {icon && <span style={{ fontSize: '1.2rem', color }}>{icon}</span>}
        <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
      </div>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
        {children}
      </div>
    </Panel>
  );
};
