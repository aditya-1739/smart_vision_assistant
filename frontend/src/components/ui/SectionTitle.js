import React from 'react';

export const SectionTitle = ({ title, subtitle, icon, style = {} }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', ...style }}>
      {icon && <span style={{ fontSize: '1.2rem', color: 'var(--status-info)' }}>{icon}</span>}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h2>
        {subtitle && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
