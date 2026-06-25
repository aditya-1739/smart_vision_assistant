import re
f = open('frontend/src/App.js', 'r', encoding='utf-8')
content = f.read()
f.close()

v1_listener = '''
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
'''

content = content.replace("newSocket.on('detections_update', (data) => {", v1_listener + "\n    newSocket.on('detections_update', (data) => {")

f = open('frontend/src/App.js', 'w', encoding='utf-8')
f.write(content)
f.close()
