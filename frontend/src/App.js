import React, { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import VideoStream from './components/VideoStream';
import AudioGuide from './components/AudioGuide';
import ObjectList from './components/ObjectList';
import ControlPanel from './components/ControlPanel';
import TopBar from './components/TopBar';

const styles = {
  app: {
    padding: 'var(--spacing-md) var(--spacing-lg)',
    maxWidth: '1920px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    gap: 'var(--spacing-md)',
  },
  dashboardLayout: {
    display: 'grid',
    gridTemplateColumns: '68% 1fr', /* 68% for Hero, 32% for Navigation/Data */
    gap: 'var(--spacing-lg)',
    flex: 1,
    minHeight: 0,
    height: '100%',
  },
  cameraSection: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
  sidePanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden', /* Remove unnecessary scrolling at the root side panel level */
  },
  glassCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-lg)',
    padding: 'var(--spacing-md)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    border: '0',
  }
};

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [detections, setDetections] = useState([]);
  const [audioMessage, setAudioMessage] = useState(null);
  const [config, setConfig] = useState({
    confidence: 0.5,
    ttsEnabled: true
  });
  
  // Use a ref to prevent stale closures in socket event listeners
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [highContrastMode, setHighContrastMode] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  // Apply themes to body
  useEffect(() => {
    if (highContrastMode) {
      document.documentElement.setAttribute('data-theme', 'high-contrast');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [highContrastMode]);

  useEffect(() => {
    if (accessibilityMode) {
      document.body.classList.add('accessibility-mode');
    } else {
      document.body.classList.remove('accessibility-mode');
    }
  }, [accessibilityMode]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
      setIsRunning(false);
    });

    newSocket.on('connected', (data) => {
      if (data.config) {
        setConfig(data.config);
      }
    });

    // Listen to detections_update to match backend
    
    newSocket.on('v1/detections_update', (data) => {
      setDetections(data.objects || []);
      
      // Handle TTS from V1 protocol
      if (data.tracking && data.tracking.announcements) {
        data.tracking.announcements.forEach(a => {
          if (configRef.current.ttsEnabled && a.text) {
            speakInBrowser(a.text, a.priority);
          }
        });
      }
    });

    newSocket.on('detections_update', (data) => {
      setDetections(data.objects || []);
    });

    newSocket.on('audio_guide', (data) => {
      setAudioMessage(data);
      // Access the latest config via ref
      if (configRef.current.ttsEnabled && data.text) {
        speakInBrowser(data.text, data.urgent);
      }
    });

    newSocket.on('config_update', (data) => {
      setConfig(prev => ({ ...prev, ...data }));
    });

    setSocket(newSocket);

    return () => {
      // Proper cleanup of all listeners
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connected');
      newSocket.off('detections_update');
      newSocket.off('audio_guide');
      newSocket.off('config_update');
      newSocket.close();
    };
  }, []);

  // Browser-based TTS (for web accessibility)
  const speakInBrowser = useCallback((text, urgent = false) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = urgent ? 1.2 : 1.0;
    utterance.pitch = urgent ? 1.2 : 1.0;
    utterance.volume = urgent ? 1.0 : 0.9;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Samantha') ||
      v.name.includes('Microsoft')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    window.speechSynthesis.speak(utterance);
  }, []);

  const startDetection = async () => {
    try {
      const response = await fetch('/api/start', { method: 'POST' });
      const data = await response.json();
      if (data.status === 'started') {
        setIsRunning(true);
      }
    } catch (error) {
      console.error('Failed to start:', error);
    }
  };

  const stopDetection = async () => {
    try {
      await fetch('/api/stop', { method: 'POST' });
      setIsRunning(false);
      setDetections([]);
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  };

  const toggleTTS = () => {
    const newValue = !config.ttsEnabled;
    setConfig(prev => ({ ...prev, ttsEnabled: newValue }));
    socket?.emit('toggle_tts', { enabled: newValue });
    
    // Stop any ongoing speech immediately when disabled
    if (!newValue && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const updateConfidence = (value) => {
    setConfig(prev => ({ ...prev, confidence: value }));
    socket?.emit('set_confidence', { value });
  };

  const toggleHighContrast = () => setHighContrastMode(prev => !prev);
  const toggleAccessibility = () => setAccessibilityMode(prev => !prev);

  // Find closest object
  const closestObject = detections.length > 0 
    ? detections.reduce((min, obj) => (obj.distance_meters < min.distance_meters ? obj : min), detections[0])
    : null;

  return (
    <div style={styles.app} role="main" aria-label="Smart Navigation Dashboard">
      <h1 style={styles.srOnly}>Smart Navigation Assistant for Visually Impaired Users</h1>

      <TopBar 
        isRunning={isRunning} 
        isConnected={isConnected}
        highContrastMode={highContrastMode}
        toggleHighContrast={toggleHighContrast}
        accessibilityMode={accessibilityMode}
        toggleAccessibility={toggleAccessibility}
      />

      <div style={styles.dashboardLayout}>
        {/* Left Column: 60% Width for Camera Focus */}
        <div style={styles.cameraSection}>
          <div style={{...styles.glassCard, flex: 1, padding: 0, overflow: 'hidden'}} role="region" aria-label="Live Camera Feed">
            
            <VideoStream 
              isRunning={isRunning}
              onStart={startDetection}
              onStop={stopDetection}
              isCloudMode={config.cameraMode === 'browser'}
              socket={socket}
              detections={detections}
            />

          </div>
        </div>

        {/* Right Column: 40% Width for Navigation and Controls */}
        <div style={styles.sidePanel}>
          <div style={styles.glassCard} role="region" aria-label="Audio Navigation Guide">
            <AudioGuide 
              message={audioMessage}
              isEnabled={config.ttsEnabled}
              onToggle={toggleTTS}
              closestObject={closestObject}
            />
          </div>

          <div style={{...styles.glassCard, overflow: 'hidden'}} role="region" aria-label="Detected Objects History">
            <ObjectList 
              objects={detections}
              isRunning={isRunning}
            />
          </div>

          <div style={styles.glassCard} role="region" aria-label="System Controls">
            <ControlPanel
              config={config}
              isRunning={isRunning}
              onStart={startDetection}
              onStop={stopDetection}
              onToggleTTS={toggleTTS}
              onConfidenceChange={updateConfidence}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;