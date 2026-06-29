import time
from typing import Dict, Any, List, Tuple
from config.settings import settings
from utils.logger import get_logger
from .base_pipeline import BasePipeline

try:
    from src.detection.model_loader import predict_image
except ImportError:
    # Will fail if dependencies are missing, but inference mode shouldn't run if so
    pass

logger = get_logger('yolo_pipeline')

CLASS_FILTER = ["person", "car", "bicycle", "motorcycle", "chair", 
                "bench", "bottle", "cell phone", "remote", "dog", 
                "cat", "bus", "truck", "umbrella", "backpack", 
                "teddy bear", "book", "clock"]

class YoloPipeline(BasePipeline):
    """
    Real AI Pipeline using YOLOv8 for local development and GPU-capable deployments.
    """
    def __init__(self, model):
        self.model = model

    def process_frame(self, frame) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        start_t = time.time()
        
        preds, _ = predict_image(
            self.model, frame, conf=settings.CONFIDENCE_THRESHOLD, iou=0.45, imgsz=640,
            annotate=False, class_name_filter=CLASS_FILTER
        )
        
        inference_ms = (time.time() - start_t) * 1000

        # Construct protocol version 1.0 baseline
        objects = []
        for p in preds:
            bbox = [int(x) for x in p["bbox"]]
            x_center = p["center"][0]
            width = frame.shape[1]
            height = frame.shape[0]
            
            obj_height = bbox[3] - bbox[1]
            distance_ratio = obj_height / height
            approx_distance_meters = max(0.5, 1.5 / (distance_ratio + 0.1))
            
            objects.append({
                "label": p["label"],
                "confidence": float(p["conf"]),
                "bbox": bbox,
                "horizontal_pos": 1.0 - (x_center / width), # Inverted mapping
                "distance_meters": approx_distance_meters
            })

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
                "model": settings.MODEL_PATH,
                "gpu": settings.USE_GPU
            }
        }
        
        return json_response, preds
