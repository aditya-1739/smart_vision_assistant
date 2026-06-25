import React from 'react';
import { SectionTitle, Panel } from './ui';

function RawDataStream({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SectionTitle title="Raw Socket Stream" icon="📡" style={{ marginBottom: 'var(--spacing-md)' }} />
      
      <Panel style={{ 
        flex: 1, 
        background: '#0d0d12', 
        fontFamily: 'monospace', 
        fontSize: '12px', 
        overflowY: 'auto',
        maxHeight: '250px',
        border: '1px solid var(--border-color)',
        position: 'relative'
      }}>
        {data.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '20px' }}>Waiting for socket data...</div>
        ) : (
          <pre style={{ 
            color: 'var(--status-safe)', 
            margin: 0, 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-all' 
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </Panel>
    </div>
  );
}

export default RawDataStream;
