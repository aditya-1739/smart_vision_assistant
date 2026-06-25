import React, { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import VideoStream from './components/VideoStream';
import AudioGuide from './components/AudioGuide';
import ObjectList from './components/ObjectList';
import ControlPanel from './components/ControlPanel';
import TopBar from './components/TopBar';
import ActivityTimeline from './components/ActivityTimeline';
import MiniRadar from './components/MiniRadar';
import { SegmentedControl } from './components/ui';

const styles = {
  app: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    maxWidth: '1920px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    gap: 'var(--spacing-sm)',
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
    gap: 'var(--spacing-sm)',
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
  const [events, setEvents] = useState([]);
  const [voiceState, setVoiceState] = useState('muted'); // 'muted', 'listening', 'speaking'
  const [uiMode, setUiMode] = useState('navigation'); // 'navigation', 'advanced'
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

      // Check for close objects to log warnings
      if (data.objects) {
        const closest = data.objects.reduce((min, obj) => (obj.distance_meters < min.distance_meters ? obj : min), data.objects[0]);
        if (closest && closest.distance_meters < 1.0) {
          addEvent(`Emergency stop! ${closest.label} at ${closest.distance_meters.toFixed(1)}m`, 'danger');
        } else if (closest && closest.distance_meters < 2.5) {
          addEvent(`Warning: ${closest.label} approaching`, 'warning');
        }
      }
    });

    newSocket.on('detections_update', (data) => {
      setDetections(data.objects || []);
    });

    newSocket.on('audio_guide', (data) => {
      setAudioMessage(data);
      if (data.text) {
        addEvent(`Voice instruction: ${data.text}`, 'info');
      }
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

  const addEvent = useCallback((text, type = 'info') => {
    setEvents(prev => {
      // Don't add duplicate back-to-back events
      if (prev.length > 0 && prev[0].text === text) return prev;
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newEvents = [{ text, type, time: timeStr }, ...prev].slice(0, 10);
      return newEvents;
    });
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
    
    utterance.onstart = () => setVoiceState('speaking');
    utterance.onend = () => setVoiceState(configRef.current.ttsEnabled ? 'listening' : 'muted');
    
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
    setVoiceState(newValue ? 'listening' : 'muted');
    socket?.emit('toggle_tts', { enabled: newValue });
    
    if (newValue) {
      addEvent('Voice assistance enabled', 'safe');
    } else {
      addEvent('Voice assistance muted', 'warning');
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
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

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-sm)' }}>
        <SegmentedControl 
          options={[
            { label: 'Navigation Mode', value: 'navigation' },
            { label: 'Advanced Mode', value: 'advanced' }
          ]}
          value={uiMode}
          onChange={setUiMode}
        />
      </div>

      <div className={`dashboard-layout ${uiMode}-mode`}>
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

        {/* Right Column */}
        <div style={styles.sidePanel}>
          <div style={{...styles.glassCard, ...(uiMode === 'navigation' ? { flex: 1 } : {})}} role="region" aria-label="Audio Navigation Guide">
            <AudioGuide 
              message={audioMessage}
              isEnabled={config.ttsEnabled}
              onToggle={toggleTTS}
              closestObject={closestObject}
              voiceState={voiceState}
            />
          </div>

          {uiMode === 'advanced' && (
            <>
              <div style={{...styles.glassCard, flex: 1, overflow: 'hidden'}} role="region" aria-label="Detected Objects History">
                <ObjectList 
                  objects={detections}
                  isRunning={isRunning}
                />
              </div>

              <div style={{...styles.glassCard, flex: 1, overflow: 'hidden'}} role="region" aria-label="Spatial Radar">
                <MiniRadar detections={detections} />
              </div>

              <div style={{...styles.glassCard, flex: 1, overflow: 'hidden'}} role="region" aria-label="Activity Timeline">
                <ActivityTimeline events={events} />
              </div>

              <div style={{...styles.glassCard, flex: 1.5}} role="region" aria-label="System Controls">
                <ControlPanel
                  config={config}
                  isRunning={isRunning}
                  onStart={startDetection}
                  onStop={stopDetection}
                  onToggleTTS={toggleTTS}
                  onConfidenceChange={updateConfidence}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;