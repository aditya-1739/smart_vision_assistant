import cv2
import time
import os
import threading
import subprocess
import platform
import sys
from collections import deque
from datetime import datetime
import numpy as np

from utils.logger import get_logger
from config.settings import settings
from ai.pipeline import AIPipeline
from sessions.client_session import ClientSession

logger = get_logger('app')

# pyrefly: ignore [missing-import]
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

active_clients = {}

from ai.pipeline import AIPipeline

from src.detection.model_loader import load_model, warmup
logger.info("Loading global YOLOv8 model...")
try:
    global_model = load_model(None, device=None, half=True, verbose=True)
    warmup(global_model, imgsz=640, steps=3)
    ai_pipeline = AIPipeline(global_model)
    logger.info("Global Model ready!")
except Exception as e:
    logger.error(f"Failed to load model: {e}")


app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Import your detection (adjust path if needed)
try:
    from src.detection.model_loader import load_model, warmup, predict_image, get_spatial_cues
    DETECTION_AVAILABLE = True
except ImportError:
    # Try alternative import paths
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    try:
        from src.detection.model_loader import load_model, warmup, predict_image, get_spatial_cues
        DETECTION_AVAILABLE = True
    except ImportError:
        logger.info("[ERROR] Cannot find detection modules. Make sure src/ folder exists!")
        DETECTION_AVAILABLE = False

MIN_CONFIDENCE = settings.CONFIDENCE_THRESHOLD
UPDATE_COOLDOWN = 2.5
PATH_CLEAR_INTERVAL = 6.0

PRIORITY = {
    "person": 10, "car": 9, "bicycle": 8, "motorcycle": 8,
    "dog": 7, "cat": 6, "chair": 5, "bench": 4, "bottle": 3, 
    "cell phone": 3, "remote": 3, "backpack": 3
}

CLASS_FILTER = ["person", "car", "bicycle", "motorcycle", "chair", 
                "bench", "bottle", "cell phone", "remote", "dog", 
                "cat", "bus", "truck", "umbrella", "backpack", 
                "teddy bear", "book", "clock"]

class RobustTTS:
    def __init__(self):
        self.system = platform.system()
        self.speaking = False
        self.last_speech_time = 0
        self.cooldown = 0.5
        self.last_message = ""
        self.queue = deque()
        self.lock = threading.Lock()
        self.is_running = True
        self.enabled = True # Disables server TTS if web client handles it
        
        self.pyttsx3_engine = None
        try:
            import pyttsx3
            self.pyttsx3_engine = pyttsx3.init()
            self.pyttsx3_engine.setProperty('rate', 180)
            self.pyttsx3_engine.setProperty('volume', 0.9)
        except:
            pass
        
        self.worker = threading.Thread(target=self._speaker_worker, daemon=True)
        self.worker.start()
    
    def _speaker_worker(self):
        while self.is_running:
            if self.queue:
                with self.lock:
                    text, priority = self.queue.popleft()
                
                if not self.enabled:
                    continue

                current_time = time.time()
                
                if not priority and (current_time - self.last_speech_time) < self.cooldown:
                    continue
                
                if text == self.last_message and (current_time - self.last_speech_time) < 5.0:
                    continue
                
                self._speak_blocking(text)
                self.last_speech_time = time.time()
                self.last_message = text
            else:
                time.sleep(0.05)
    
    def _speak_blocking(self, text):
        logger.info(f"🔊 SPEAKING: {text}")
        if self.system == "Windows":
            try:
                import win32com.client
                speaker = win32com.client.Dispatch("SAPI.SpVoice")
                speaker.Speak(text)
                return
            except:
                pass
            try:
                safe_text = text.replace('"', '`"').replace("'", "`'")
                ps_cmd = f'Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak("{safe_text}");'
                subprocess.run(["powershell", "-WindowStyle", "Hidden", "-Command", ps_cmd], timeout=10, capture_output=True)
                return
            except:
                pass
        
        if self.system == "Darwin":
            try:
                subprocess.run(["say", text], timeout=10)
                return
            except:
                pass
        
        if self.system == "Linux":
            try:
                subprocess.run(["espeak", text], timeout=10)
                return
            except:
                pass
        
        if self.pyttsx3_engine:
            try:
                self.pyttsx3_engine.say(text)
                self.pyttsx3_engine.runAndWait()
            except Exception as e:
                logger.info(f"❌ TTS failed: {e}")
    
    def speak(self, text, priority=False):
        if not self.enabled:
            return
            
        # Emit to frontend so browser TTS can also play
        try:
            socketio.emit('audio_guide', {'text': text, 'urgent': priority})
        except Exception as e:
            pass
            
        with self.lock:
            if len(self.queue) > 3:
                self.queue.clear()
            self.queue.append((text, priority))
    
    def stop(self):
        self.is_running = False
        with self.lock:
            self.queue.clear()
            
    def clear_queue(self):
        with self.lock:
            self.queue.clear()
            self.last_message = ""

tts = RobustTTS()

tracked_objects = {}
object_counter = 0
last_path_clear_announcement = 0

def speak(text, priority=False):
    global last_path_clear_announcement
    if "clear" in text.lower():
        last_path_clear_announcement = time.time()
    tts.speak(text, priority)

def get_object_signature(label, position):
    return f"{label}_{position}"

def update_tracked_objects(current_preds, frame_shape):
    global object_counter, tracked_objects
    
    width = frame_shape[1]
    height = frame_shape[0]
    current_time = time.time()
    announcements = []
    active_signatures = set()
    
    for p in current_preds:
        label = p["label"]
        x_center = p["center"][0]
        bbox = p["bbox"]
        
        if x_center < width * 0.32:
            position = "right" # Inverted mapping: left side of frame is user's right
        elif x_center > width * 0.68:
            position = "left"  # Inverted mapping: right side of frame is user's left
        else:
            position = "ahead"
        
        obj_height = bbox[3] - bbox[1]
        distance_ratio = obj_height / height
        
        if distance_ratio > 0.50:
            distance = "very close"
        elif distance_ratio > 0.28:
            distance = "near"
        elif distance_ratio > 0.12:
            distance = "moderate distance"
        else:
            distance = "far"
        
        signature = get_object_signature(label, position)
        active_signatures.add(signature)
        
        approx_distance_meters = max(0.5, 1.5 / (distance_ratio + 0.1))
        # Invert horizontal position: 0 is right side of frame, 1 is left side
        inverted_horizontal = 1.0 - (x_center / width)
        
        if signature in tracked_objects:
            tracked_objects[signature]["last_seen"] = current_time
            tracked_objects[signature]["horizontal_pos"] = inverted_horizontal
            tracked_objects[signature]["distance_meters"] = approx_distance_meters
            tracked_objects[signature]["distance"] = distance
        
        if signature not in tracked_objects:
            object_counter += 1
            tracked_objects[signature] = {
                "id": object_counter,
                "label": label,
                "position": position,
                "distance": distance,
                "distance_meters": approx_distance_meters,
                "horizontal_pos": inverted_horizontal,
                "first_seen": current_time,
                "last_seen": current_time,
                "last_announced": 0,
                "times_announced": 0,
                "prev_distance": distance
            }
            
            priority = label in ["person", "car", "bicycle", "motorcycle"]
            
            if position == "ahead":
                text = f"{label} {distance} ahead"
            else:
                text = f"{label} on your {position}, {distance}"
            
            if distance == "very close" and position == "ahead":
                text = f"Watch out! {text}. Stop."
                priority = True
            
            announcements.append((text, priority, label))
            tracked_objects[signature]["last_announced"] = current_time
            tracked_objects[signature]["times_announced"] += 1
            
        else:
            obj = tracked_objects[signature]
            time_since_announce = current_time - obj["last_announced"]
            
            if obj["prev_distance"] != distance and time_since_announce > UPDATE_COOLDOWN:
                if position == "ahead":
                    text = f"{label} now {distance}"
                else:
                    text = f"{label} on your {position}, now {distance}"
                
                if distance == "very close" and obj["prev_distance"] != "very close":
                    if position == "left":
                        text += ". Move right"
                    elif position == "right":
                        text += ". Move left"
                    else:
                        text += ". Stop"
                    priority = True
                else:
                    priority = False
                
                announcements.append((text, priority, label))
                obj["last_announced"] = current_time
                obj["prev_distance"] = distance
    
    to_remove = []
    for sig, obj in tracked_objects.items():
        if sig not in active_signatures:
            if current_time - obj["last_seen"] > 2.0:
                if obj["distance"] in ["very close", "near"] and obj["times_announced"] > 0:
                    announcements.append((f"{obj['label']} moved away", False, obj['label']))
                to_remove.append(sig)
    
    for sig in to_remove:
        del tracked_objects[sig]
    
    return announcements

def generate_navigation_summary(preds, frame_shape):
    if not preds:
        return None
    
    width = frame_shape[1]
    left_count = sum(1 for p in preds if p["center"][0] < width * 0.35)
    right_count = sum(1 for p in preds if p["center"][0] > width * 0.65)
    ahead_count = len(preds) - left_count - right_count
    
    if ahead_count == 0:
        return "Path ahead is clear"
    elif left_count == 0 and right_count > 0:
        return "Path clear on your left"
    elif right_count == 0 and left_count > 0:
        return "Path clear on your right"
    elif ahead_count > 2:
        return f"{ahead_count} objects ahead, proceed carefully"
    return None

# ==================== PIPELINE ARCHITECTURE ====================

class CameraPipeline:
    def __init__(self):
        self.stream = None
        self.is_running = False
        
        # Thread safety Phase 2A
        self.raw_frame_lock = threading.Lock()
        self.latest_raw_frame = None
        self.latest_capture_time_ns = 0
        
        self.frame_ready_event = threading.Event()
        
        self.annotated_frame_lock = threading.Lock()
        self.latest_annotated_frame = None
        
        self.model = None
        self.fps = 0.0
        
        self.threads = []
        
        self.stats = {
            'capture_time_ms': 0,
            'inference_time_ms': 0,
            'encode_time_ms': 0,
            'inference_fps': 0,
            'capture_fps': 0
        }

    def start(self):
        if self.is_running:
            return True
        
        self.stream = cv2.VideoCapture(0)
        self.stream.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        # We don't fail immediately, in case we're headless. We will use a dummy frame fallback.
        self.is_running = True
        
        t_cap = threading.Thread(target=self._capture_thread, daemon=True)
        t_cap.start()
        self.threads.append(t_cap)
        
        t_inf = threading.Thread(target=self._inference_thread, daemon=True)
        t_inf.start()
        self.threads.append(t_inf)
        
        return True

    def stop(self):
        self.is_running = False
        if self.stream:
            self.stream.release()
            self.stream = None
            
    def _capture_thread(self):
        """Phase 2: Camera Capture Thread (Producer)"""
        last_time = time.time()
        frames = 0
        while self.is_running:
            start_t = time.time()
            if self.stream and self.stream.isOpened():
                ret, frame = self.stream.read()
            else:
                ret, frame = False, None
                
            capture_ns = time.perf_counter_ns()
            
            # Fallback for headless environments/profiling
            if not ret or frame is None:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                # Randomize to simulate changing frame (important for AI)
                cv2.rectangle(frame, (np.random.randint(0, 300), np.random.randint(0, 200)), 
                                     (np.random.randint(300, 600), np.random.randint(200, 400)), (255,255,255), -1)
                cv2.putText(frame, "Dummy Profiling Frame", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                time.sleep(0.033)
                ret = True
                
            if ret:
                with self.raw_frame_lock:
                    self.latest_raw_frame = frame
                    self.latest_capture_time_ns = capture_ns
                self.frame_ready_event.set()
                
            self.stats['capture_time_ms'] = (time.time() - start_t) * 1000
            
            frames += 1
            if time.time() - last_time > 1.0:
                self.stats['capture_fps'] = frames / (time.time() - last_time)
                frames = 0
                last_time = time.time()

    def _inference_thread(self):
        """Phase 2: Inference Thread (Consumer)"""
        logger.info("🚀 Loading YOLOv8 model...")
        self.model = load_model(None, device=None, half=True, verbose=True)
        # Phase 4: Model Warm-Up
        warmup(self.model, imgsz=640, steps=3)
        global ai_pipeline
        ai_pipeline = AIPipeline(self.model)
        self.ai_pipeline = ai_pipeline
        logger.info("✅ Model ready!")
        
        global tracked_objects, object_counter, last_path_clear_announcement
        tracked_objects = {}
        object_counter = 0
        last_path_clear_announcement = 0
        
        speak("Navigation assistant ready", priority=True)
        time.sleep(2)
        
        last_time = time.time()
        frames = 0
        
        while self.is_running:
            if not self.frame_ready_event.wait(timeout=0.1):
                continue
                
            self.frame_ready_event.clear()
            
            with self.raw_frame_lock:
                frame = self.latest_raw_frame
                capture_ns = self.latest_capture_time_ns
                
            if frame is None:
                continue
                
            start_t = time.time()
            
            # Use isolated AI Pipeline
            json_response, preds = self.ai_pipeline.process_frame(frame)
            
            annotated = frame 
            
            announcements = update_tracked_objects(preds, frame.shape)
            announcements.sort(key=lambda x: PRIORITY.get(x[2], 0), reverse=True)
            for text, priority, label in announcements[:2]:
                speak(text, priority=priority)
            
            if not preds:
                if start_t - last_path_clear_announcement > PATH_CLEAR_INTERVAL:
                    speak("Path clear ahead", priority=False)
            else:
                last_path_clear_announcement = start_t
            
            if frames % 90 == 0 and len(preds) > 0:
                summary = generate_navigation_summary(preds, frame.shape)
                if summary:
                    speak(summary, priority=False)
                    
            # In-place drawing
            for p in preds:
                x1, y1, x2, y2 = p["bbox"]
                label = p["label"]
                conf_score = p["conf"]
                color = (0, 220, 0)
                cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                txt = f"{label} {conf_score:.2f}"
                cv2.putText(annotated, txt, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)
            
            # Removed debug overlays to keep camera feed clean for frontend
                
            with self.annotated_frame_lock:
                self.latest_annotated_frame = annotated
            
            # Emit asynchronously with latency timestamps
            def emit_update(objs, anns, current_fps, cap_ns, inf_ns):
                socketio.emit('detections_update', {
                    'objects': objs,
                    'announcements': anns,
                    'fps': current_fps,
                    'capture_time_ns': cap_ns,
                    'inference_time_ns': inf_ns,
                    'timestamp': datetime.now().isoformat()
                })
            
            objs_list = [{
                'id': obj.get('id', 0), 'label': obj['label'],
                'position': obj['position'], 'distance': obj['distance'], 'confidence': 0.0,
                'horizontal_pos': obj.get('horizontal_pos', 0.5),
                'distance_meters': obj.get('distance_meters', 2.0)
            } for sig, obj in tracked_objects.items()]
            anns_list = [{'text': a[0], 'priority': a[1]} for a in announcements]
            
            socketio.start_background_task(emit_update, objs_list, anns_list, self.stats['inference_fps'], capture_ns, time.perf_counter_ns())
            
            self.stats['inference_time_ms'] = (time.time() - start_t) * 1000
            frames += 1
            if time.time() - last_time > 1.0:
                self.stats['inference_fps'] = frames / (time.time() - last_time)
                frames = 0
                last_time = time.time()
                
            # Phase 10: Performance Monitoring Log
            if frames % 30 == 0:
                print(f"[Metrics] Cap FPS: {self.stats['capture_fps']:.1f} | "
                      f"Inf FPS: {self.stats['inference_fps']:.1f} | "
                      f"Cap time: {self.stats['capture_time_ms']:.1f}ms | "
                      f"Inf time: {self.stats['inference_time_ms']:.1f}ms | "
                      f"Enc time: {self.stats['encode_time_ms']:.1f}ms")

pipeline = CameraPipeline()

@app.route('/')
def index():
    return jsonify({
        'status': 'Smart Navigation Web API - Optimized',
        'endpoints': {
            'video': '/video_feed',
            'start': '/api/start',
            'stop': '/api/stop'
        }
    })

@app.route('/api/start', methods=['POST'])
def start():
    if not DETECTION_AVAILABLE:
        return jsonify({'error': 'Detection modules not found. Check src/ folder.'}), 500
    
    if pipeline.is_running:
        return jsonify({'status': 'already_running'})
    
    if not pipeline.start():
        return jsonify({'error': 'Cannot open camera'}), 500
    
    return jsonify({'status': 'started', 'detection_available': DETECTION_AVAILABLE})

@app.route('/api/stop', methods=['POST'])
def stop():
    pipeline.stop()
    tts.clear_queue()
    return jsonify({'status': 'stopped'})

@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            if not pipeline.is_running:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(frame, "Camera Offline - Click Start", 
                          (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                time.sleep(0.5)
                continue
            
            with pipeline.annotated_frame_lock:
                frame = pipeline.latest_annotated_frame
            if frame is None:
                time.sleep(0.01)
                continue
                
            start_t = time.time()
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            pipeline.stats['encode_time_ms'] = (time.time() - start_t) * 1000
            
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                
            time.sleep(0.01) # Yield rate limiting for web (100 FPS max)
            
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')


@socketio.on('connect')
def handle_connect(auth=None):
    sid = request.sid
    logger.info(f'[Web] Client connected: {sid}')
    active_clients[sid] = ClientSession(sid)
    emit('connected', {'status': 'connected', 'config': {'confidence': MIN_CONFIDENCE, 'ttsEnabled': tts.enabled, 'cameraMode': settings.CAMERA_MODE}})

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    logger.info(f'[Web] Client disconnected: {sid}')
    if sid in active_clients:
        del active_clients[sid]
    tts.enabled = True
@socketio.on('toggle_tts')
def handle_toggle_tts(data):
    enabled = data.get('enabled', True)
    tts.enabled = enabled
    if not enabled:
        tts.clear_queue()
    logger.info(f'[Settings] TTS Enabled: {enabled}')

@socketio.on('set_confidence')
def handle_set_confidence(data):
    global MIN_CONFIDENCE
    val = float(data.get('value', 0.5))
    MIN_CONFIDENCE = max(0.05, min(0.95, val))
    logger.info(f'[Settings] Confidence threshold updated to {MIN_CONFIDENCE}')

if __name__ == '__main__':
    logger.info("🌐 Smart Navigation Web Server (Optimized)")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)

@socketio.on('v1/process_frame')
def handle_process_frame(data):
    sid = request.sid
    if sid not in active_clients:
        return
    
    session = active_clients[sid]
    
    try:
        # Decode binary JPEG data
        np_arr = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return
            
        # Process frame
        json_response, preds = ai_pipeline.process_frame(frame)
        
        # Track objects
        announcements = session.update_tracked_objects(preds, frame.shape)
        
        # Update JSON with tracking info and system mode
        json_response['tracking']['announcements'] = [{'text': a[0], 'priority': a[1]} for a in announcements]
        json_response['system']['camera_mode'] = settings.CAMERA_MODE
        
        emit('v1/detections_update', json_response, room=sid)
        
    except Exception as e:
        logger.error(f'[Socket] Error processing frame: {e}')
