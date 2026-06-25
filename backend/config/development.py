import os
import logging
from .settings import BaseSettings

class DevelopmentConfig(BaseSettings):
    ENV = 'development'
    DEBUG = True
    LOG_LEVEL = logging.DEBUG
    CORS_ORIGINS = "*"
    ASYNC_MODE = os.environ.get('ASYNC_MODE', 'threading')
