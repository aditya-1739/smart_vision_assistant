import time
import numpy as np
from typing import Dict, Any, List, Tuple
from config.settings import settings
from utils.logger import get_logger
from .base_pipeline import BasePipeline

logger = get_logger('demo_pipeline')

class DemoPipeline(BasePipeline):
    """
    Deterministic simulated AI Pipeline for Demo Mode.
    Cycles through predefined scenarios to demonstrate functionality consistently.
    """
    def __init__(self):
        self.start_time = time.time()
        self.scenario_index = 0
        self.scenario_start = self.start_time
        
        # Scenarios (duration in seconds)
        self.scenarios = [
            {"name": "person_ahead", "duration": 15},
            {"name": "chair_left", "duration": 10},
            {"name": "stairs_ahead", "duration": 10},
            {"name": "bicycle_crossing", "duration": 12},
            {"name": "clear", "duration": 5}
        ]

    def process_frame(self, frame) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        current_time = time.time()
        elapsed = current_time - self.scenario_start
        
        current_scenario = self.scenarios[self.scenario_index]
        
        if elapsed > current_scenario["duration"]:
            self.scenario_index = (self.scenario_index + 1) % len(self.scenarios)
            self.scenario_start = current_time
            current_scenario = self.scenarios[self.scenario_index]
            elapsed = 0
            
        height, width = frame.shape[:2] if frame is not None else (480, 640)
        
        preds = []
        objects = []
        
        # Simulate processing time
        inference_ms = 15.4 + (np.random.random() * 5.0)
        
        def add_object(label, conf, cx_ratio, cy_ratio, w_ratio, h_ratio):
            cx = int(cx_ratio * width)
            cy = int(cy_ratio * height)
            w = int(w_ratio * width)
            h = int(h_ratio * height)
            
            x1 = max(0, cx - w//2)
            y1 = max(0, cy - h//2)
            x2 = min(width, cx + w//2)
            y2 = min(height, cy + h//2)
            
            bbox = [x1, y1, x2, y2]
            
            distance_ratio = h / height
            approx_distance_meters = max(0.5, 1.5 / (distance_ratio + 0.1))
            
            preds.append({
                "label": label,
                "conf": conf,
                "bbox": bbox,
                "center": (cx, cy)
            })
            
            objects.append({
                "label": label,
                "confidence": conf,
                "bbox": bbox,
                "horizontal_pos": 1.0 - cx_ratio,
                "distance_meters": approx_distance_meters
            })

        if current_scenario["name"] == "person_ahead":
            # Person approaching from ahead
            progress = elapsed / current_scenario["duration"]
            size = 0.2 + (progress * 0.6) # Gets bigger
            add_object("person", 0.92, 0.5, 0.5, size * 0.4, size)
            
        elif current_scenario["name"] == "chair_left":
            # Static chair on the left side of frame (which is right horizontal_pos inverted)
            add_object("chair", 0.85, 0.8, 0.7, 0.3, 0.4)
            
        elif current_scenario["name"] == "stairs_ahead":
            # Simulating an obstacle ahead that needs warning
            progress = elapsed / current_scenario["duration"]
            size = 0.3 + (progress * 0.4)
            add_object("bench", 0.78, 0.5, 0.8, size * 0.8, size * 0.3)
            
        elif current_scenario["name"] == "bicycle_crossing":
            # Bicycle moving from right to left across frame
            progress = elapsed / current_scenario["duration"]
            x_pos = 0.1 + (progress * 0.8)
            add_object("bicycle", 0.88, x_pos, 0.6, 0.4, 0.5)
            if progress > 0.3 and progress < 0.7:
                # Add a person on the bicycle
                add_object("person", 0.81, x_pos, 0.4, 0.2, 0.4)
                
        elif current_scenario["name"] == "clear":
            pass # No objects

        json_response = {
            "protocol_version": "1.0",
            "objects": objects,
            "navigation": {},
            "depth": {},
            "ocr": {},
            "pose": {},
            "tracking": {},
            "system": {
                "inference_ms": round(inference_ms, 2),
                "model": "simulated_demo_v1",
                "gpu": False
            }
        }
        
        time.sleep(0.015) # Sim inference time
        return json_response, preds
