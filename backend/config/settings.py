import os

class Settings:
    """
    Centralized configuration management loaded from environment variables.
    """
    # Application Mode
    CAMERA_MODE = os.environ.get('CAMERA_MODE', 'local').lower() # 'local' or 'browser'
    
    # AI Pipeline Configuration
    USE_GPU = os.environ.get('USE_GPU', 'true').lower() == 'true'
    CONFIDENCE_THRESHOLD = float(os.environ.get('CONFIDENCE_THRESHOLD', '0.50'))
    MODEL_PATH = os.environ.get('MODEL_PATH', 'yolov8n.pt')
    
    # Server Configuration
    TARGET_FPS = int(os.environ.get('TARGET_FPS', '30'))
    MAX_CLIENTS = int(os.environ.get('MAX_CLIENTS', '10'))
    MAX_FRAME_SIZE = int(os.environ.get('MAX_FRAME_SIZE', '5242880')) # 5MB default limit
    
    # Audio
    USE_BROWSER_TTS = os.environ.get('USE_BROWSER_TTS', 'true').lower() == 'true'

settings = Settings()
