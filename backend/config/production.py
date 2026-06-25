import os
import logging
from .settings import BaseSettings

class ProductionConfig(BaseSettings):
    ENV = 'production'
    DEBUG = False
    LOG_LEVEL = logging.INFO
    # Allow Vercel or specified CORS origins, fallback to localhost for local-prod
    _cors = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5000')
    CORS_ORIGINS = _cors.split(',') if _cors != '*' else '*'
    ASYNC_MODE = os.environ.get('ASYNC_MODE', 'eventlet')
