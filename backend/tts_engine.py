"""
TTS Engine for Web Backend
Provides server-side speech synthesis as backup
Primary TTS happens in browser for lower latency
"""

import platform
import subprocess
import threading
import queue
import time
from typing import Optional


class WebTTSEngine:
    """
    Server-side TTS (backup/secondary)
    Browser TTS is primary for web app
    """
    
    def __init__(self):
        self.system = platform.system()
        self.speech_queue = queue.Queue(maxsize=5)
        self.is_running = False
        self.worker_thread: Optional[threading.Thread] = None
        self.last_speech_time = 0
        self.cooldown = 1.0  # Seconds between speeches
        
        # Speech history to prevent repeats
        self.speech_history = {}
        
    def start(self):
        """Start TTS worker thread"""
        if self.is_running:
            return
        
        self.is_running = True
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()
        print("[TTS] Engine started")
    
    def stop(self):
        """Stop TTS engine"""
        self.is_running = False
        # Clear queue
        while not self.speech_queue.empty():
            try:
                self.speech_queue.get_nowait()
            except:
                pass
        print("[TTS] Engine stopped")
    
    def _worker(self):
        """Process speech queue"""
        while self.is_running:
            try:
                text, priority = self.speech_queue.get(timeout=0.1)
                
                current_time = time.time()
                
                # Check cooldown (unless priority)
                if not priority and (current_time - self.last_speech_time) < self.cooldown:
                    continue
                
                # Check for recent duplicates
                if text in self.speech_history:
                    if current_time - self.speech_history[text] < 5.0:
                        continue  # Skip repeat
                
                self._speak(text)
                self.last_speech_time = current_time
                self.speech_history[text] = current_time
                
                # Cleanup old history
                old = [k for k, v in self.speech_history.items() if current_time - v > 30]
                for k in old:
                    del self.speech_history[k]
                    
            except queue.Empty:
                continue
            except Exception as e:
                print(f"[TTS Error] {e}")
    
    def _speak(self, text: str):
        """Actually speak using system TTS"""
        print(f"[TTS Server] Speaking: {text}")
        
        try:
            if self.system == "Windows":
                # PowerShell TTS
                safe_text = text.replace('"', '`"').replace("'", "`'")
                ps_cmd = (
                    f'Add-Type -AssemblyName System.Speech; '
                    f'$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; '
                    f'$synth.Speak("{safe_text}");'
                )
                subprocess.run(
                    ["powershell", "-WindowStyle", "Hidden", "-Command", ps_cmd],
                    timeout=10,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                
            elif self.system == "Darwin":  # macOS
                subprocess.run(
                    ["say", text],
                    timeout=10,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                
            else:  # Linux
                subprocess.run(
                    ["espeak", text],
                    timeout=10,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                
        except subprocess.TimeoutExpired:
            print(f"[TTS Timeout] Speech took too long")
        except Exception as e:
            print(f"[TTS Error] {e}")
    
    def speak(self, text: str, priority: bool = False):
        """
        Queue text for speech
        
        Args:
            text: Text to speak
            priority: If True, skips cooldown checks
        """
        if not self.is_running:
            self.start()
        
        try:
            self.speech_queue.put_nowait((text, priority))
        except queue.Full:
            print(f"[TTS] Queue full, dropping: {text[:30]}...")
    
    def clear_queue(self):
        """Clear pending speeches"""
        while not self.speech_queue.empty():
            try:
                self.speech_queue.get_nowait()
            except:
                pass


# Singleton
_tts_engine = None

def get_tts_engine() -> WebTTSEngine:
    """Get or create TTS engine"""
    global _tts_engine
    if _tts_engine is None:
        _tts_engine = WebTTSEngine()
    return _tts_engine