from typing import Dict, Any, List, Tuple
import abc

class BasePipeline(abc.ABC):
    """
    Abstract base class for AI Pipelines.
    All pipelines must implement the process_frame method returning the same schema.
    """
    
    @abc.abstractmethod
    def process_frame(self, frame) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Process a single frame.
        
        Args:
            frame: A numpy array (image frame).
            
        Returns:
            Tuple containing the Version 1.0 JSON response and the raw predictions.
        """
        pass
