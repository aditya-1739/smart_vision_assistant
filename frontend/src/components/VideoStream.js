import React, { useState, useEffect, useRef } from 'react';

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: '20px',
    overflow: 'hidden',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)',
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
    padding: '20px',
    textAlign: 'center',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px',
    display: 'flex',
    justifyContent: 'flex-end',
    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
    zIndex: 10,
  },
  badge: {
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    border: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    pointerEvents: 'auto',
  },
  liveBadge: {
    color: 'var(--accent-primary)',
    borderColor: 'var(--accent-primary)',
  },
  metricsGroup: {
    display: 'flex',
    gap: '10px',
    pointerEvents: 'auto',
  },
  metric: {
    color: '#fff',
  },
  fullscreenBtn: {
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    border: '1px solid var(--glass-border)',
    color: '#fff',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    pointerEvents: 'auto',
  },
};

function VideoStream({ isRunning, onStart }) {
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mock metrics for UI demonstration of real-time monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = Date.now();
    let metricsInterval;
    
    if (isRunning) {
      metricsInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        if (elapsed > 0) {
          // Simulate slight FPS variation around 30
          setFps(Math.round(28 + Math.random() * 4));
          // Simulate latency around 45ms
          setLatency(Math.round(40 + Math.random() * 15));
        }
        lastTime = now;
      }, 1000);
    } else {
      setFps(0);
      setLatency(0);
    }

    return () => clearInterval(metricsInterval);
  }, [isRunning]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} style={{...styles.container, borderRadius: isFullscreen ? '0' : '20px'}}>
      {isRunning ? (
        <div style={styles.videoWrapper}>
          <img 
            src="http://localhost:5000/video_feed"
            alt="Live camera feed with object detection overlay"
            style={styles.video}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          
          <div style={styles.overlayTop}>
            <div style={{...styles.badge, ...styles.liveBadge}} role="status">
              <span style={{ animation: 'pulse 2s infinite' }}>🔴</span> LIVE
            </div>
            
            <div style={styles.metricsGroup}>
              <div style={{...styles.badge, ...styles.metric}}>
                ⏱️ {latency}ms
              </div>
              <div style={{...styles.badge, ...styles.metric}}>
                🎞️ {fps} FPS
              </div>
            </div>
          </div>

          <div style={styles.overlayBottom}>
            <button 
              style={styles.fullscreenBtn}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? '↙️' : '↗️'}
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.placeholder}>
          <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.8 }}>📷</div>
          <h3 style={{ marginBottom: '15px', fontSize: '1.5rem' }}>
            Camera Offline
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', maxWidth: '300px' }}>
            The AI vision system is currently on standby. Start navigation to begin object detection and guidance.
          </p>
          <button
            onClick={onStart}
            className="btn btn-primary"
            aria-label="Start detection"
          >
            ▶ Start Camera Feed
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoStream;