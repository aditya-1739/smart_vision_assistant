import React from 'react';
import { SectionTitle, Panel } from './ui';

export const MiniRadar = ({ detections = [] }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <SectionTitle title="Spatial Radar" icon="📡" style={{ marginBottom: 'var(--spacing-sm)' }} />
      
      <Panel style={{ 
        flex: 1, 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'flex-end', 
        justifyContent: 'center',
        padding: 'var(--spacing-xl)',
        background: 'radial-gradient(circle at bottom center, var(--bg-surface-hover) 0%, var(--bg-surface) 100%)',
        overflow: 'hidden'
      }}>
        {/* Radar Rings */}
        <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '200%', border: '1px solid var(--border-color)', borderRadius: '50%', opacity: 0.2 }} />
        <div style={{ position: 'absolute', bottom: '-50%', width: '150%', height: '150%', border: '1px solid var(--border-color)', borderRadius: '50%', opacity: 0.3 }} />
        <div style={{ position: 'absolute', bottom: '-25%', width: '100%', height: '100%', border: '1px dashed var(--border-color)', borderRadius: '50%', opacity: 0.4 }} />
        <div style={{ position: 'absolute', bottom: '0', width: '50%', height: '50%', border: '1px solid var(--border-color)', borderRadius: '50%', opacity: 0.5 }} />

        {/* Radar Sweep Animation */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          width: '50%',
          height: '100%',
          transformOrigin: 'bottom left',
          background: 'conic-gradient(from 270deg, transparent 0%, rgba(0, 212, 255, 0.1) 10%, rgba(0, 212, 255, 0.4) 100%)',
          animation: 'radar-spin 4s infinite linear',
          borderRight: '1px solid var(--status-info)',
          zIndex: 1,
        }} />

        {/* You Indicator */}
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{ width: '12px', height: '12px', background: 'var(--status-info)', borderRadius: '50%', boxShadow: '0 0 10px var(--status-info)' }} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: '600' }}>YOU</span>
        </div>

        {/* Object Dots */}
        {detections.map((obj, i) => {
          // Calculate precise relative position from backend tracking
          let leftPercent = 50; // center
          if (obj.horizontal_pos !== undefined) {
            leftPercent = obj.horizontal_pos * 100;
          } else {
            if (obj.position === 'left') leftPercent = 25;
            if (obj.position === 'right') leftPercent = 75;
          }
          
          let bottomPercent = 30; // default distance
          if (obj.distance_meters) {
            // map 0.5m - 5m to 10% - 90%
            bottomPercent = Math.max(10, Math.min(90, (obj.distance_meters / 5) * 100));
          }

          const isDanger = obj.distance_meters && obj.distance_meters <= 1.0;

          return (
            <div key={i} style={{
              position: 'absolute',
              left: `${leftPercent}%`,
              bottom: `${bottomPercent}%`,
              transform: 'translate(-50%, 50%)',
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)', whiteSpace: 'nowrap', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {obj.label}
              </span>
              <div style={{ 
                width: '10px', 
                height: '10px', 
                background: isDanger ? 'var(--status-danger)' : 'var(--status-safe)', 
                borderRadius: '50%',
                boxShadow: `0 0 8px ${isDanger ? 'var(--status-danger)' : 'var(--status-safe)'}`
              }} />
            </div>
          );
        })}
      </Panel>
    </div>
  );
};

export default MiniRadar;
