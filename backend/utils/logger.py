import logging
import sys
import os

def get_logger(name: str) -> logging.Logger:
    """
    Returns a configured structured logger.
    
    Args:
        name (str): The name of the module requesting the logger.
        
    Returns:
        logging.Logger: A configured logger instance.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        from config.settings import settings
        
        logger.setLevel(settings.LOG_LEVEL)
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        )
        
        # Console Handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        # Ensure logs directory exists
        log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        # File Handler (All logs)
        app_log_path = os.path.join(log_dir, 'app.log')
        file_handler = logging.FileHandler(app_log_path, encoding='utf-8')
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)
        logger.addHandler(file_handler)
        
        # Error File Handler (Only errors)
        error_log_path = os.path.join(log_dir, 'error.log')
        error_handler = logging.FileHandler(error_log_path, encoding='utf-8')
        error_handler.setFormatter(formatter)
        error_handler.setLevel(logging.ERROR)
        logger.addHandler(error_handler)
        
    return logger
