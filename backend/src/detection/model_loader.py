# src/detection/model_loader.py
"""
Improved model loader & inference helpers for Ultralytics YOLO (v8).

Features:
- Prefer `runs/detect/*/weights/best.pt` if present (common after training)
- Fallback to models/<name>.pt or ultralytics auto-download
- Auto-select device (CUDA if available), enable half precision on GPU
- Predict wrapper returning structured results and optional annotated frame
- Helpers: warmup(), set_classes(), class name -> id filtering, spatial cues (left/right + distance)
"""

from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any, Callable
import os
import torch
import numpy as np
import cv2
import time
import warnings

from ultralytics import YOLO

# project layout assumptions
PROJECT_ROOT = Path(__file__).resolve().parents[1]  # src/.. -> project root
DEFAULT_LOCAL_MODEL = PROJECT_ROOT / "models" / "yolov8n.pt"
RUNS_DIR = PROJECT_ROOT / "runs" / "detect"

# Cache the loaded model globally so multiple calls reuse it
_MODEL_CACHE: Dict[str, YOLO] = {}

def _find_best_checkpoint() -> Optional[Path]:
    """
    Search runs/detect/*/weights/best.pt and return the most recent if found.
    """
    if not RUNS_DIR.exists():
        return None
    best_paths = list(RUNS_DIR.glob("**/weights/best.pt"))
    if not best_paths:
        return None
    best_paths.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return best_paths[0]


def _choose_device(device: Optional[str] = None) -> str:
    """
    Choose device: prefer user-specified, otherwise CUDA if available else CPU.
    Returns a device string accepted by Ultralytics (e.g., '0' or 'cpu').
    """
    if device:
        return device
    if torch.cuda.is_available():
        return "0"  # use GPU 0 by default
    return "cpu"


def load_model(weights_path: Optional[str] = None,
               device: Optional[str] = None,
               half: bool = True,
               verbose: bool = True) -> YOLO:
    """
    Load (and cache) an Ultralytics YOLO model with safe fallbacks and recommended runtime settings.

    Args:
        weights_path: path to .pt or model spec (if None, will try runs/*/best.pt, then models/, then 'yolov8n.pt')
        device: 'cpu' or '0' or '0,1' etc. If None, auto-selects GPU if present.
        half: use FP16 if running on CUDA (faster + often slightly better perf).
        verbose: print info about chosen model & device.

    Returns:
        ultralytics.YOLO instance
    """
    global _MODEL_CACHE

    device_str = _choose_device(device)

    # Resolve weights path logic
    chosen: Optional[Path] = None
    if weights_path:
        p = Path(weights_path)
        if p.exists():
            chosen = p
    else:
        # try latest trained "best.pt"
        best = _find_best_checkpoint()
        if best:
            chosen = best
        elif DEFAULT_LOCAL_MODEL.exists():
            chosen = DEFAULT_LOCAL_MODEL

    # default to ultralytics model name if nothing local found
    chosen_spec = str(chosen) if chosen else "yolov8n.pt"

    cache_key = f"{chosen_spec}|{device_str}|{half}"
    if cache_key in _MODEL_CACHE:
        if verbose:
            print(f"[model_loader] using cached model: {chosen_spec} on device={device_str} half={half}")
        return _MODEL_CACHE[cache_key]

    if verbose:
        print(f"[model_loader] loading model: {chosen_spec}")
        if chosen:
            print(f"  resolved to local path: {chosen}")
        print(f"  device: {device_str}; half precision: {half}")

    # Instantiate YOLO wrapper
    model = YOLO(chosen_spec)

    # Set sensible overrides (Ultralytics respects model.overrides on .predict/.train calls)
    model.overrides = {"device": device_str, "half": half and device_str != "cpu", "imgsz": 640}

    # Attempt to set half precision on underlying torch model for GPU
    try:
        if device_str != "cpu" and half and torch.cuda.is_available():
            model.model.half()
    except Exception:
        # safe ignore
        pass

    _MODEL_CACHE[cache_key] = model
    return model


def warmup(model: YOLO, imgsz: int = 640, steps: int = 1) -> None:
    """
    Warm up the model with a dummy tensor (useful to reduce first-inference latency).
    """
    try:
        dummy = np.zeros((1, 3, imgsz, imgsz), dtype=np.uint8)
        # Ultralytics accepts numpy arrays
        model.predict(source=dummy, imgsz=imgsz, conf=0.01, verbose=False)
        for _ in range(steps - 1):
            model.predict(source=dummy, imgsz=imgsz, conf=0.01, verbose=False)
    except Exception:
        pass


def set_classes(model: YOLO, classes: List[str]) -> None:
    """
    Set custom class names on the model (useful for YOLOWorld/YOLOE or overriding names).

    Args:
        model: YOLO instance
        classes: list of string class names
    """
    try:
        # different internals across versions: set both if possible
        if hasattr(model, "model") and hasattr(model.model, "names"):
            model.model.names = classes
    except Exception:
        pass
    try:
        model.names = classes  # frequently used by ultralytics wrappers
    except Exception:
        pass


def set_class_filter_by_names(model: YOLO, keep_names: List[str]) -> List[int]:
    """
    Given a YOLO model and a list of class names to keep, returns the COCO class ids matching those names.
    Also returns an integer list suitable for passing to `classes=` argument in predict().
    NOTE: This does not re-train; it only filters predictions.

    Args:
        model: YOLO instance (must have .names mapping)
        keep_names: list of class names (strings) to allow in predictions

    Returns:
        list of class ids (ints) corresponding to requested names
    """
    if not hasattr(model, "names"):
        warnings.warn("Model has no 'names' attribute; cannot set class filter by name.")
        return []
    name_to_id = {v: int(k) for k, v in model.names.items()} if isinstance(model.names, dict) else {v: i for i, v in enumerate(model.names)}
    class_ids = []
    for nm in keep_names:
        if nm in name_to_id:
            class_ids.append(name_to_id[nm])
        else:
            warnings.warn(f"Requested class '{nm}' not found in model.names")
    return class_ids


def _process_results(results, model: YOLO) -> List[Dict[str, Any]]:
    """
    Convert Ultralytics Results object (single frame) into a list of dicts:
    {'label': str, 'class_id': int, 'conf': float, 'bbox': [x1,y1,x2,y2], 'center': [cx,cy]}
    """
    out: List[Dict[str, Any]] = []
    if results is None:
        return out
    boxes = getattr(results, "boxes", None)
    if boxes is None or len(boxes) == 0:
        return out
        
    try:
        # Batch convert to CPU and numpy (much faster than individual calls)
        xyxys = boxes.xyxy.cpu().numpy()
        confs = boxes.conf.cpu().numpy().reshape(-1)
        clses = boxes.cls.cpu().numpy().reshape(-1)
        
        for i in range(len(boxes)):
            x1, y1, x2, y2 = map(int, xyxys[i][:4])
            conf = float(confs[i])
            cls = int(clses[i])
            cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
            label = model.names.get(cls, str(cls)) if hasattr(model, "names") else str(cls)
            out.append({"label": label, "class_id": cls, "conf": conf, "bbox": [x1, y1, x2, y2], "center": [cx, cy]})
    except Exception:
        # Fallback for different API versions
        for b in boxes:
            try:
                xyxy = [float(v) for v in b.xyxy.tolist()]
                conf = float(b.conf.tolist())
                cls = int(b.cls.tolist())
                x1, y1, x2, y2 = map(int, xyxy[:4])
                cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
                label = model.names.get(cls, str(cls)) if hasattr(model, "names") else str(cls)
                out.append({"label": label, "class_id": cls, "conf": conf, "bbox": [x1, y1, x2, y2], "center": [cx, cy]})
            except Exception:
                continue
    return out


def _bbox_height_ratio(bbox: List[int], frame_h: int) -> float:
    """
    Return ratio of bbox height to frame height (0..1).
    """
    x1, y1, x2, y2 = bbox
    h = max(1, y2 - y1)
    return h / max(1, frame_h)


def _distance_label_from_ratio(ratio: float) -> str:
    """
    Heuristic mapping from bbox height ratio to a distance label.
    Tweak thresholds as needed for your camera and use-case.
    """
    if ratio > 0.6:
        return "very near"
    if ratio > 0.25:
        return "near"
    return "far"


def get_spatial_cues(pred: Dict[str, Any], frame_shape: Tuple[int, int, int]) -> Dict[str, Any]:
    """
    Given a single prediction dict from _process_results and the frame shape (H,W,C),
    return spatial cues:
      - 'side': 'left' | 'center' | 'right'
      - 'distance': 'very near' | 'near' | 'far'

    Args:
        pred: prediction dict from _process_results
        frame_shape: (H,W,C)

    Returns:
        dict with 'side' and 'distance'
    """
    H, W = frame_shape[0], frame_shape[1]
    cx, cy = pred.get("center", [W // 2, H // 2])
    side = "center"
    # define left/center/right thresholds (thirds)
    if cx < W / 3:
        side = "left"
    elif cx > 2 * W / 3:
        side = "right"

    # distance: fallback to bbox height heuristic
    distance = "unknown"
    bbox = pred.get("bbox", [0, 0, W, H])
    ratio = _bbox_height_ratio(bbox, H)
    distance = _distance_label_from_ratio(ratio)

    return {"side": side, "distance": distance, "ratio": ratio}


def predict_image(model: YOLO,
                  image_bgr: np.ndarray,
                  conf: float = 0.45,
                  iou: float = 0.45,
                  imgsz: int = 640,
                  classes: Optional[List[int]] = None,
                  max_det: int = 100,
                  annotate: bool = False,
                  class_name_filter: Optional[List[str]] = None) -> Tuple[List[Dict[str, Any]], Optional[np.ndarray]]:
    """
    Run inference on a single BGR OpenCV image (np.ndarray).

    Args:
        model: YOLO instance from load_model()
        image_bgr: BGR image (as read by OpenCV)
        conf: confidence threshold
        iou: NMS IoU threshold
        imgsz: inference image size
        classes: optional list of COCO class ids to filter (int list)
        max_det: maximum number of detections to keep
        annotate: if True returns an annotated BGR image as second return value
        class_name_filter: optional list of class names (strings) to keep (applies in addition to classes)

    Returns:
        (predictions, annotated_image)
        predictions: list of dicts {'label','class_id','conf','bbox','center'}
        annotated_image: BGR image with boxes drawn if annotate=True, else None
    """
    # optional class name -> id mapping
    if class_name_filter and hasattr(model, "names"):
        # compute class ids to pass to Ultralytics
        keep_ids = set()
        name_map = model.names if isinstance(model.names, dict) else {v: i for i, v in enumerate(model.names)}
        for n in class_name_filter:
            if n in name_map:
                keep_ids.add(int(name_map[n]))
        if len(keep_ids) == 0:
            # no matches: warn and fall back to provided classes
            warnings.warn("class_name_filter did not match any model classes")
            pass
        else:
            classes = list(keep_ids)

    # Run inference (Ultralytics will handle device/half via model.overrides)
    results = model.predict(source=image_bgr, imgsz=imgsz, conf=conf, classes=classes, iou=iou, max_det=max_det, verbose=False)
    if not results:
        return [], None
    res = results[0]
    preds = _process_results(res, model)

    annotated = None
    if annotate:
        annotated = image_bgr.copy()
        for p in preds:
            x1, y1, x2, y2 = p["bbox"]
            label = p["label"]
            conf_score = p["conf"]
            color = (0, 220, 0)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            txt = f"{label} {conf_score:.2f}"
            (tw, th), _ = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
            cv2.rectangle(annotated, (x1, y1 - 20), (x1 + tw + 4, y1), color, -1)
            cv2.putText(annotated, txt, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)

    return preds, annotated


def infer_from_bgr(image_bgr: np.ndarray,
                   weights_path: Optional[str] = None,
                   conf: float = 0.45,
                   iou: float = 0.45,
                   imgsz: int = 640,
                   classes: Optional[List[int]] = None,
                   class_name_filter: Optional[List[str]] = None,
                   annotate: bool = True,
                   device: Optional[str] = None,
                   warmup_steps: int = 1) -> Tuple[List[Dict[str, Any]], Optional[np.ndarray]]:
    """
    High-level convenience entrypoint: loads model (if needed), performs warmup and runs prediction on a single BGR image.

    Returns:
      (preds, annotated_img)
    """
    model = load_model(weights_path, device=device)
    # warm up once (cheap) to reduce first-frame latency
    warmup(model, imgsz=imgsz, steps=warmup_steps)
    preds, annotated = predict_image(model, image_bgr, conf=conf, iou=iou, imgsz=imgsz, classes=classes, annotate=annotate, class_name_filter=class_name_filter)
    return preds, annotated