import time
from typing import Dict, Any, List, Tuple
from src.detection.model_loader import predict_image
from config.settings import settings
from utils.logger import get_logger

logger = get_logger('ai_pipeline')

CLASS_FILTER = ["person", "car", "bicycle", "motorcycle", "chair", 
                "bench", "bottle", "cell phone", "remote", "dog", 
                "cat", "bus", "truck", "umbrella", "backpack", 
                "teddy bear", "book", "clock"]

class AIPipeline:
    """
    Isolated, transport-agnostic AI Pipeline.
    Receives an image frame and returns structured JSON conforming to Protocol Version 1.0.
    """
    def __init__(self, model):
        self.model = model

    def process_frame(self, frame) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Process a single frame.
        
        Args:
            frame: A numpy array (image frame).
            
        Returns:
            Tuple containing the Version 1.0 JSON response and the raw YOLO predictions (for legacy compatibility).
        """
        start_t = time.time()
        
        preds, _ = predict_image(
            self.model, frame, conf=settings.CONFIDENCE_THRESHOLD, iou=0.45, imgsz=640,
            annotate=False, class_name_filter=CLASS_FILTER
        )
        
        inference_ms = (time.time() - start_t) * 1000

        # Construct protocol version 1.0 baseline
        objects = []
        for p in preds:
            objects.append({
                "label": p["label"],
                "confidence": float(p["conf"]),
                "bbox": [int(x) for x in p["bbox"]]
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
