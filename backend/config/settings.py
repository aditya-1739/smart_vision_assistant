import os
import importlib

class BaseSettings:
    """
    Base configuration loaded from environment variables.
    """
    # Application Mode
    APP_MODE = os.environ.get('APP_MODE', 'inference').lower() # 'inference' or 'demo'
    
    CAMERA_MODE = os.environ.get('CAMERA_MODE', 'local').lower()
    TTS_MODE = os.environ.get('TTS_MODE', 'local').lower()
    
    # AI Pipeline Configuration
    USE_GPU = os.environ.get('USE_GPU', 'true').lower() == 'true'
    CONFIDENCE_THRESHOLD = float(os.environ.get('CONFIDENCE_THRESHOLD', '0.50'))
    MODEL_PATH = os.environ.get('MODEL_PATH', 'yolov8n.pt')
    
    # Server Configuration
    TARGET_FPS = int(os.environ.get('TARGET_FPS', '30'))
    MAX_CLIENTS = int(os.environ.get('MAX_CLIENTS', '10'))
    MAX_FRAME_SIZE = int(os.environ.get('MAX_FRAME_SIZE', '5242880')) # 5MB default limit
    
    # Audio fallback (legacy support)
    USE_BROWSER_TTS = os.environ.get('USE_BROWSER_TTS', 'true').lower() == 'true'

def get_settings():
    env = os.environ.get('ENV', 'development').lower()
    if env == 'production':
        from .production import ProductionConfig
        return ProductionConfig()
    else:
        from .development import DevelopmentConfig
        return DevelopmentConfig()

settings = get_settings()
