import React from 'react';

const baseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--spacing-sm)',
  padding: 'var(--spacing-sm) var(--spacing-md)',
  borderRadius: 'var(--border-radius-md)',
  fontFamily: 'var(--font-main)',
  fontWeight: '600',
  fontSize: 'var(--font-size-sm)',
  cursor: 'pointer',
  border: 'none',
  transition: 'var(--transition-fast)',
  outline: 'none',
};

export const PrimaryButton = ({ children, onClick, style = {}, disabled = false, ...props }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  const btnStyle = {
    ...baseStyle,
    background: disabled ? 'var(--bg-surface-hover)' : 'var(--status-info)',
    color: disabled ? 'var(--text-tertiary)' : '#fff',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transform: isHovered && !disabled ? 'translateY(-1px)' : 'none',
    boxShadow: isHovered && !disabled ? 'var(--shadow-sm)' : 'none',
    ...style
  };

  return (
    <button 
      style={btnStyle} 
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export const SecondaryButton = ({ children, onClick, style = {}, disabled = false, ...props }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  const btnStyle = {
    ...baseStyle,
    background: isHovered && !disabled ? 'var(--bg-surface-hover)' : 'transparent',
    color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
    border: '1px solid',
    borderColor: disabled ? 'var(--border-color)' : (isHovered ? 'var(--text-secondary)' : 'var(--border-color)'),
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...style
  };

  return (
    <button 
      style={btnStyle} 
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export const IconButton = ({ icon, onClick, style = {}, title, active = false, ...props }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: 'var(--border-radius-md)',
    background: active ? 'var(--bg-surface-hover)' : (isHovered ? 'var(--bg-surface)' : 'transparent'),
    color: active ? 'var(--status-info)' : 'var(--text-primary)',
    border: '1px solid',
    borderColor: active ? 'var(--status-info)' : (isHovered ? 'var(--border-color)' : 'transparent'),
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    fontSize: '1.2rem',
    ...style
  };

  return (
    <button 
      style={btnStyle} 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      aria-label={title}
      {...props}
    >
      {icon}
    </button>
  );
};
