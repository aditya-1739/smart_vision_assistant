import React from 'react';

const styles = {
  panel: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-lg)',
    padding: 'var(--spacing-md)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'var(--transition-normal)',
  },
  glass: {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--shadow-lg)',
  }
};

export const Panel = ({ children, variant = 'flat', className = '', style = {}, ...props }) => {
  const combinedStyle = {
    ...styles.panel,
    ...(variant === 'glass' ? styles.glass : {}),
    ...style
  };

  return (
    <div style={combinedStyle} className={className} {...props}>
      {children}
    </div>
  );
};
