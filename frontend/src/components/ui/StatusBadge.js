import React from 'react';

const getStatusColor = (status) => {
  switch (status) {
    case 'safe':
    case 'success':
    case 'online':
      return 'var(--status-safe)';
    case 'warning':
      return 'var(--status-warning)';
    case 'danger':
    case 'error':
    case 'offline':
      return 'var(--status-danger)';
    case 'info':
    default:
      return 'var(--status-info)';
  }
};

export const StatusBadge = ({ status = 'info', label, pulse = false, style = {}, ...props }) => {
  const color = getStatusColor(status);
  
  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: '4px 8px',
    borderRadius: 'var(--border-radius-sm)',
    background: `color-mix(in srgb, ${color} 15%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    color: color,
    fontSize: 'var(--font-size-xs)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    ...style
  };

  const dotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 4px ${color}`,
    animation: pulse ? 'pulse-subtle 2s infinite' : 'none'
  };

  return (
    <div style={badgeStyle} {...props}>
      <div style={dotStyle} />
      {label}
    </div>
  );
};
