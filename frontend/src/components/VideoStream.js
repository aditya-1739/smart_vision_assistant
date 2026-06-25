import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import UnifiedOverlay from './UnifiedOverlay';
import { PrimaryButton, StatusBadge } from './ui';

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 'var(--border-radius-xl)',
    overflow: 'hidden',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border-color)',
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, #111 0%, #000 100%)',
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
    background: 'var(--bg-main)',
    padding: 'var(--spacing-xl)',
    textAlign: 'center',
    gap: 'var(--spacing-md)',
  },
  processingOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-sm)',
    color: 'var(--text-primary)',
    zIndex: 20,
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border-color)',
    borderTopColor: 'var(--status-info)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  overlayTop: {
    position: 'absolute',
    top: 'var(--spacing-md)',
    left: 'var(--spacing-md)',
    zIndex: 10,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 'var(--spacing-md)',
    right: 'var(--spacing-md)',
    zIndex: 10,
  },
  fullscreenBtn: {
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    border: '1px solid var(--border-color)',
    color: '#fff',
    width: '36px',
    height: '36px',
    borderRadius: 'var(--border-radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
};

function VideoStream({ isRunning, onStart, isCloudMode, socket, detections, isProcessing = false }) {
  const { videoRef, canvasRef } = useWebRTC(socket, isRunning && isCloudMode);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Add the keyframe for spinning if not already in index.css
  useEffect(() => {
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.innerHTML = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

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
    <div ref={containerRef} style={{...styles.container, borderRadius: isFullscreen ? '0' : 'var(--border-radius-xl)'}}>
      {isRunning ? (
        <div style={styles.videoWrapper}>
          
          {isProcessing && (
            <div style={styles.processingOverlay}>
              <div style={styles.spinner} />
              <div style={{ fontWeight: '600', letterSpacing: '1px' }}>🧠 AI PROCESSING...</div>
            </div>
          )}

          {isCloudMode ? (
            <>
              <video 
                ref={videoRef} 
                style={styles.video} 
                playsInline 
                muted 
              />
              <canvas ref={canvasRef} style={{display: 'none'}} />
              <UnifiedOverlay 
                videoRef={videoRef} 
                detections={detections} 
                isCloudMode={isCloudMode} 
              />
            </>
          ) : (
            <>
              <img 
                src="http://localhost:5000/video_feed"
                alt="Live camera feed with object detection overlay"
                style={styles.video}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {/* Note: In local mode, UnifiedOverlay doesn't render from video feed directly in this app's architecture, 
                  but we'll keep the design clean. */}
            </>
          )}

          <div style={styles.overlayTop}>
            <StatusBadge 
              status="danger" 
              label="LIVE" 
              pulse={true}
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />
          </div>

          <div style={styles.overlayBottom}>
            <button 
              style={styles.fullscreenBtn}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
            >
              {isFullscreen ? '↙️' : '↗️'}
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.placeholder}>
          <div style={{ fontSize: '4rem', opacity: 0.8 }}>📷</div>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-xs)', color: 'var(--text-primary)' }}>
              Camera Offline
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '350px', margin: '0 auto', lineHeight: '1.5' }}>
              The AI vision system is currently on standby. Connect the camera to begin real-time navigation assistance.
            </p>
          </div>
          <PrimaryButton onClick={onStart} style={{ marginTop: 'var(--spacing-md)' }}>
            <span style={{ fontSize: '1.2rem' }}>▶</span> Start Camera Feed
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

export default VideoStream;