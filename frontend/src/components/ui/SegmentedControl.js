import React from 'react';

export const SegmentedControl = ({ options, value, onChange }) => {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--bg-surface-hover)',
      padding: '4px',
      borderRadius: 'var(--border-radius-lg)',
      border: '1px solid var(--border-color)',
    }}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 16px',
              border: 'none',
              background: isActive ? 'var(--bg-secondary)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: isActive ? '600' : '500',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
