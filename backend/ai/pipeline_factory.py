from config.settings import settings
from utils.logger import get_logger

logger = get_logger('pipeline_factory')

class PipelineFactory:
    @staticmethod
    def create(app_mode: str):
        logger.info(f"Initializing AI Pipeline in mode: {app_mode.upper()}")
        
        if app_mode == 'demo':
            from .demo_pipeline import DemoPipeline
            return DemoPipeline()
        elif app_mode == 'inference':
            from .yolo_pipeline import YoloPipeline
            try:
                from src.detection.model_loader import load_model, warmup
                logger.info("Loading global YOLOv8 model for inference...")
                model = load_model(None, device=None, half=True, verbose=True)
                warmup(model, imgsz=640, steps=3)
                logger.info("Global Model ready!")
                return YoloPipeline(model)
            except Exception as e:
                logger.error(f"Failed to load YOLO model: {e}")
                raise
        else:
            raise ValueError(f"Unknown APP_MODE: {app_mode}")
