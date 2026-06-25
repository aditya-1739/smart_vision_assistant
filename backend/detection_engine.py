"""
Detection Engine for Web Backend
Wraps your existing YOLO + MiDaS code
"""

import cv2
import numpy as np
import time
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

# Import your existing modules
try:
    from src.detection.model_loader import load_model, warmup, predict_image
    from src.depth.depth_estimator import DepthEstimator, DepthInfo
    DETECTION_AVAILABLE = True
except ImportError:
    print("[Warning] Local detection modules not found")
    DETECTION_AVAILABLE = False


@dataclass
class DetectionResult:
    """Structured detection result for web frontend"""
    id: str
    label: str
    confidence: float
    bbox: List[int]  # [x1, y1, x2, y2]
    center: List[int]  # [cx, cy]
    position: str  # left, center, right
    distance_meters: Optional[float]
    distance_label: Optional[str]
    timestamp: float


class WebDetectionEngine:
    """
    Web-optimized detection engine
    Reuses your existing YOLO and MiDaS code
    """
    
    def __init__(self, 
                 confidence_threshold: float = 0.5,
                 enable_depth: bool = True,
                 class_filter: List[str] = None):
        
        self.confidence_threshold = confidence_threshold
        self.enable_depth = enable_depth
        self.class_filter = class_filter or [
            "person", "car", "bicycle", "motorcycle", 
            "chair", "bench", "bottle", "cell phone", 
            "dog", "cat", "remote", "book"
        ]
        
        self.model = None
        self.depth_estimator = None
        self.is_initialized = False
        self.frame_count = 0
        self.fps = 0
        self.last_fps_time = time.time()
        
        # Tracking for web
        self.tracked_objects = {}
        self.object_counter = 0
    
    def initialize(self) -> bool:
        """Initialize YOLO and depth models"""
        if not DETECTION_AVAILABLE:
            print("[DetectionEngine] Local modules not available")
            return False
        
        try:
            print("[DetectionEngine] Initializing YOLO...")
            self.model = load_model(None, device=None, half=False, verbose=False)
            warmup(self.model, imgsz=640, steps=1)
            print("[DetectionEngine] ✅ YOLO ready")
            
            if self.enable_depth:
                print("[DetectionEngine] Initializing MiDaS...")
                self.depth_estimator = DepthEstimator(model_type="MiDaS_small")
                print("[DetectionEngine] ✅ MiDaS ready")
            
            self.is_initialized = True
            return True
            
        except Exception as e:
            print(f"[DetectionEngine] ❌ Initialization failed: {e}")
            return False
    
    def process_frame(self, frame: np.ndarray) -> Tuple[List[DetectionResult], np.ndarray]:
        """
        Process single frame and return detections + annotated frame
        
        Args:
            frame: OpenCV BGR image
            
        Returns:
            (detections_list, annotated_frame)
        """
        if not self.is_initialized or self.model is None:
            return [], frame
        
        self.frame_count += 1
        current_time = time.time()
        
        # Calculate FPS
        if self.frame_count % 30 == 0:
            elapsed = current_time - self.last_fps_time
            self.fps = 30 / elapsed if elapsed > 0 else 0
            self.last_fps_time = current_time
        
        # Run detection using YOUR existing predict_image function
        preds, annotated = predict_image(
            self.model,
            frame,
            conf=self.confidence_threshold,
            iou=0.45,
            imgsz=640,
            annotate=True,
            class_name_filter=self.class_filter
        )
        
        if annotated is None:
            annotated = frame.copy()
        
        # Process detections
        detections = []
        height, width = frame.shape[:2]
        
        for p in preds:
            # Determine position (left/center/right)
            cx = p["center"][0]
            if cx < width * 0.35:
                position = "left"
            elif cx > width * 0.65:
                position = "right"
            else:
                position = "center"  # Using "center" instead of "ahead" for web
            
            # Get depth if available
            distance_m = None
            distance_label = None
            
            if self.depth_estimator and self.enable_depth:
                try:
                    depth_map = self.depth_estimator.estimate_depth(frame)
                    depth_info = self.depth_estimator.get_object_depth(
                        depth_map, p["bbox"]
                    )
                    distance_m = round(depth_info.distance_meters, 2)
                    distance_label = depth_info.distance_label
                    
                    # Draw distance on annotated frame
                    x1, y1, x2, y2 = p["bbox"]
                    cv2.putText(
                        annotated,
                        f"{distance_m:.1f}m",
                        (x1, y2 + 20),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 255),
                        2
                    )
                    
                except Exception as e:
                    print(f"[Depth Error] {e}")
            
            # Create detection result
            detection = DetectionResult(
                id=f"{p['label']}_{cx}_{int(current_time*1000)%10000}",
                label=p["label"],
                confidence=float(p["conf"]),
                bbox=p["bbox"],
                center=p["center"],
                position=position,
                distance_meters=distance_m,
                distance_label=distance_label,
                timestamp=current_time
            )
            detections.append(detection)
        
        # Draw FPS on frame
        cv2.putText(
            annotated,
            f"FPS: {self.fps:.1f}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )
        
        return detections, annotated
    
    def generate_audio_description(self, detections: List[DetectionResult]) -> str:
        """
        Generate natural language description for TTS
        (Reuses your existing logic from run_live_demo.py)
        """
        if not detections:
            return "Path clear ahead"
        
        # Sort by distance (closest first)
        sorted_dets = sorted(
            detections,
            key=lambda x: x.distance_meters if x.distance_meters else 999
        )
        
        # Get closest object
        closest = sorted_dets[0]
        label = closest.label
        position = closest.position
        distance = closest.distance_meters
        
        # Build message
        if distance:
            if distance < 1.0:
                dist_str = f"{distance:.1f} meters"
                if position == "center":
                    return f"Warning! {label} very close ahead at {dist_str}. Stop."
                else:
                    return f"Warning! {label} very close on your {position} at {dist_str}"
            elif distance < 10:
                dist_str = f"{distance:.1f} meters"
            else:
                dist_str = f"{int(distance)} meters"
        else:
            dist_str = "nearby"
        
        if position == "center":
            return f"{label} {dist_str} ahead"
        else:
            return f"{label} on your {position}, {dist_str}"
    
    def get_navigation_guidance(self, detections: List[DetectionResult]) -> Optional[str]:
        """
        Provide navigation guidance based on scene
        """
        if not detections:
            return None
        
        # Count by position
        left = sum(1 for d in detections if d.position == "left")
        center = sum(1 for d in detections if d.position == "center")
        right = sum(1 for d in detections if d.position == "right")
        
        # Check if center is blocked
        center_close = any(
            d.position == "center" and d.distance_meters and d.distance_meters < 2.0
            for d in detections
        )
        
        if not center_close:
            return "Path ahead is clear, safe to proceed"
        elif left == 0:
            return "Obstacle ahead, clear path on your left"
        elif right == 0:
            return "Obstacle ahead, clear path on your right"
        else:
            return f"Obstacles on all sides, {center} objects ahead. Proceed carefully"
    
    def shutdown(self):
        """Cleanup resources"""
        self.is_initialized = False
        self.model = None
        self.depth_estimator = None
        print("[DetectionEngine] Shutdown complete")


# Singleton instance for web app
_detection_engine = None

def get_detection_engine() -> WebDetectionEngine:
    """Get or create detection engine singleton"""
    global _detection_engine
    if _detection_engine is None:
        _detection_engine = WebDetectionEngine()
    return _detection_engine