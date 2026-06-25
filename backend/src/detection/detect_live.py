# src/detection/model_loader.py
"""
Improved model loader & inference helpers for Ultralytics YOLO (v8).

Features:
- auto-select best checkpoint -> models -> yolov8n.pt
- device auto-selection and FP16 on CUDA
- robust results parsing across Ultralytics versions
- class-name -> id filtering helper
- spatial cues (side + distance) using bbox-height heuristic
- nicer annotation (consistent colors, readable label backgrounds)
- cached model loading + warmup
"""

from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any, Callable
import os
import random
import warnings

import numpy as np
import cv2
import torch
from ultralytics import YOLO

PROJECT_ROOT = Path(__file__).resolve().parents[1]  # src/.. -> project root
DEFAULT_LOCAL_MODEL = PROJECT_ROOT / "models" / "yolov8n.pt"
RUNS_DIR = PROJECT_ROOT / "runs" / "detect"

_MODEL_CACHE: Dict[str, YOLO] = {}

# --------------------
# Utilities: model selection & device
# --------------------
def _find_best_checkpoint() -> Optional[Path]:
    """Return newest runs/detect/**/weights/best.pt if present."""
    if not RUNS_DIR.exists():
        return None
    candidates = list(RUNS_DIR.glob("**/weights/best.pt"))
    if not candidates:
        return None
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return candidates[0]


def _find_local_model() -> Optional[Path]:
    """Return a reasonable local model inside models/ if present."""
    model_dir = PROJECT_ROOT / "models"
    if not model_dir.exists():
        return None
    for name in ("yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "best.pt"):
        p = model_dir / name
        if p.exists():
            return p
    pts = list(model_dir.glob("*.pt"))
    return pts[0] if pts else None


def _choose_device(device: Optional[str]) -> str:
    if device:
        return device
    return "0" if torch.cuda.is_available() else "cpu"


# --------------------
# Model loader
# --------------------
def load_model(weights_path: Optional[str] = None,
               device: Optional[str] = None,
               half: bool = True,
               verbose: bool = True) -> YOLO:
    """
    Load and cache YOLO model (priority: explicit -> runs/*/best.pt -> models/* -> yolov8n.pt).
    """
    device_str = _choose_device(device)

    chosen: Optional[Path] = None
    if weights_path:
        p = Path(weights_path)
        if p.exists():
            chosen = p
    if chosen is None:
        best = _find_best_checkpoint()
        if best:
            chosen = best
    if chosen is None:
        local = _find_local_model()
        if local:
            chosen = local

    chosen_spec = str(chosen) if chosen else "yolov8n.pt"
    cache_key = f"{chosen_spec}|{device_str}|{bool(half)}"
    if cache_key in _MODEL_CACHE:
        if verbose:
            print(f"[model_loader] using cached model: {chosen_spec} device={device_str} half={half}")
        return _MODEL_CACHE[cache_key]

    if verbose:
        print(f"[model_loader] loading model: {chosen_spec}")
        if chosen:
            print(f"  resolved to: {chosen}")
        print(f"  device={device_str} half={half}")

    model = YOLO(chosen_spec)
    model.overrides = {"device": device_str, "half": half and device_str != "cpu", "imgsz": 640}

    # try to set half on underlying model when GPU available
    try:
        if device_str != "cpu" and half and torch.cuda.is_available():
            model.model.half()
    except Exception:
        pass

    _MODEL_CACHE[cache_key] = model
    return model


def warmup(model: YOLO, imgsz: int = 640, steps: int = 1) -> None:
    """Warm up the model with dummy images to reduce first-inference latency."""
    try:
        dummy = np.zeros((1, 3, imgsz, imgsz), dtype=np.uint8)
        model.predict(source=dummy, imgsz=imgsz, conf=0.01, verbose=False)
        for _ in range(steps - 1):
            model.predict(source=dummy, imgsz=imgsz, conf=0.01, verbose=False)
    except Exception:
        pass


# --------------------
# Helpers: class name -> id mapping
# --------------------
def set_class_filter_by_names(model: YOLO, keep_names: List[str]) -> List[int]:
    """
    Given model and class names, return list of ids suitable for predict(..., classes=[...]).
    """
    if not hasattr(model, "names"):
        warnings.warn("Model has no 'names' attribute; returning empty class filter")
        return []
    if isinstance(model.names, dict):
        name_to_id = {v: int(k) for k, v in model.names.items()}
    else:
        name_to_id = {v: i for i, v in enumerate(model.names)}
    ids = []
    for n in keep_names:
        if n in name_to_id:
            ids.append(name_to_id[n])
        else:
            warnings.warn(f"Class name '{n}' not found in model.names")
    return ids


# --------------------
# Result processing + spatial cues
# --------------------
def _safe_to_list(x) -> List[float]:
    try:
        arr = np.asarray(x)
        # flatten if nested
        return arr.reshape(-1).tolist()
    except Exception:
        try:
            return list(x)
        except Exception:
            return []


def _extract_box_fields(box) -> Tuple[List[float], float, int]:
    """
    Extract xyxy (len 4), conf, cls from a detection 'box' object (robust to API differences).
    """
    xyxy = []
    conf = 0.0
    cls = 0

    # xyxy
    try:
        if hasattr(box, "xyxy"):
            arr = box.xyxy.cpu().numpy()
            xyxy = arr.reshape(-1).tolist()[:4]
    except Exception:
        xyxy = _safe_to_list(getattr(box, "xyxy", []))[:4]

    # conf
    try:
        if hasattr(box, "conf"):
            conf = float(box.conf.cpu().numpy().reshape(-1)[0])
    except Exception:
        try:
            conf = float(getattr(box, "conf", 0.0))
        except Exception:
            conf = 0.0

    # cls
    try:
        if hasattr(box, "cls"):
            cls = int(box.cls.cpu().numpy().reshape(-1)[0])
    except Exception:
        try:
            cls = int(getattr(box, "cls", 0))
        except Exception:
            cls = 0

    return xyxy, conf, cls


def _process_results(results, model: YOLO) -> List[Dict[str, Any]]:
    """
    Convert Ultralytics Results object (single image) into list of dicts:
    {'label','class_id','conf','bbox':[x1,y1,x2,y2],'center':[cx,cy]}
    """
    out: List[Dict[str, Any]] = []
    if results is None:
        return out
    boxes = getattr(results, "boxes", [])
    for b in boxes:
        xyxy, conf, cls = _extract_box_fields(b)
        if not xyxy or len(xyxy) < 4:
            continue
        x1, y1, x2, y2 = map(int, xyxy[:4])
        cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
        label = model.names.get(cls, str(cls)) if hasattr(model, "names") else str(cls)
        out.append({"label": label, "class_id": cls, "conf": conf, "bbox": [x1, y1, x2, y2], "center": [cx, cy]})
    return out


def _bbox_height_ratio(bbox: List[int], frame_h: int) -> float:
    x1, y1, x2, y2 = bbox
    h = max(1, y2 - y1)
    return h / max(1, frame_h)


def _distance_label_from_ratio(ratio: float) -> str:
    if ratio > 0.6:
        return "very near"
    if ratio > 0.25:
        return "near"
    return "far"


def get_spatial_cues(pred: Dict[str, Any], frame_shape: Tuple[int, int, int]) -> Dict[str, Any]:
    """
    Return {'side': 'left'|'center'|'right', 'distance': 'very near'|'near'|'far', 'ratio': float}.
    """
    H, W = frame_shape[0], frame_shape[1]
    cx, cy = pred.get("center", [W // 2, H // 2])
    side = "center"
    if cx < W / 3:
        side = "left"
    elif cx > 2 * W / 3:
        side = "right"

    bbox = pred.get("bbox", [0, 0, W, H])
    ratio = _bbox_height_ratio(bbox, H)
    distance = _distance_label_from_ratio(ratio)

    return {"side": side, "distance": distance, "ratio": ratio}


# --------------------
# Annotation utilities
# --------------------
_COLOR_CACHE: Dict[str, Tuple[int, int, int]] = {}


def _get_color_for_label(label: str) -> Tuple[int, int, int]:
    if label not in _COLOR_CACHE:
        rnd = random.Random(label)
        _COLOR_CACHE[label] = (rnd.randint(40, 255), rnd.randint(40, 255), rnd.randint(40, 255))
    return _COLOR_CACHE[label]


def _draw_label(background_img: np.ndarray, x1: int, y1: int, text: str, color: Tuple[int, int, int]):
    (tw, th), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
    pad = 6
    bx1, by1 = x1, max(0, y1 - th - pad)
    bx2, by2 = x1 + tw + pad, y1
    cv2.rectangle(background_img, (bx1, by1), (bx2, by2), color, -1)
    cv2.putText(background_img, text, (x1 + 3, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)


def predict_image(model: YOLO,
                  image: np.ndarray,
                  conf: float = 0.45,
                  iou: float = 0.45,
                  imgsz: int = 640,
                  classes: Optional[List[int]] = None,
                  max_det: int = 100,
                  annotate: bool = False,
                  class_name_filter: Optional[List[str]] = None) -> Tuple[List[Dict[str, Any]], Optional[np.ndarray]]:
    """
    Run inference on a BGR OpenCV image.

    - class_name_filter: optional list of class names to keep (strings). If provided, it will override 'classes'.
    - returns (preds, annotated_bgr_or_None)
    """
    # map class_name_filter -> classes if provided
    if class_name_filter and hasattr(model, "names"):
        if isinstance(model.names, dict):
            name_map = {v: int(k) for k, v in model.names.items()}
        else:
            name_map = {v: i for i, v in enumerate(model.names)}
        keep_ids = [name_map[n] for n in class_name_filter if n in name_map]
        if len(keep_ids) == 0:
            warnings.warn("class_name_filter did not match any model classes; ignoring filter")
        else:
            classes = keep_ids

    # perform prediction (Ultralytics will honor model.overrides)
    try:
        results = model.predict(source=image, imgsz=imgsz, conf=conf, classes=classes, iou=iou, max_det=max_det, verbose=False)
    except Exception as e:
        warnings.warn(f"model.predict failed: {e}")
        return [], None

    if not results:
        return [], None
    res = results[0]
    preds = _process_results(res, model)

    annotated = None
    if annotate:
        annotated = image.copy()
        for p in preds:
            x1, y1, x2, y2 = p["bbox"]
            label = p["label"]
            conf_score = p["conf"]
            color = _get_color_for_label(label)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            txt = f"{label} {conf_score:.2f}"
            _draw_label(annotated, x1, y1, txt, color)

    return preds, annotated


def infer_from_bgr(image_bgr: np.ndarray,
                   weights_path: Optional[str] = None,
                   conf: float = 0.45,
                   iou: float = 0.45,
                   imgsz: int = 640,
                   classes: Optional[List[int]] = None,
                   annotate: bool = True,
                   class_name_filter: Optional[List[str]] = None,
                   device: Optional[str] = None) -> Tuple[List[Dict[str, Any]], Optional[np.ndarray]]:
    """
    Convenience wrapper: load model if needed, warmup, and predict on one BGR frame.
    """
    model = load_model(weights_path, device=device)
    warmup(model, imgsz=imgsz, steps=1)
    return predict_image(model, image_bgr, conf=conf, iou=iou, imgsz=imgsz, classes=classes, annotate=annotate, class_name_filter=class_name_filter)

def run_live_detection(
    source=0,
    conf=0.45,
    imgsz=640,
    frame_confirm=3,
    class_name_filter=None,
    device=None
):
    """
    Live webcam / video detection loop
    """

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open source: {source}")

    print("[detect_live] Live detection started. Press 'q' to quit.")

    model = load_model(device=device)
    warmup(model, imgsz=imgsz)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        preds, annotated = predict_image(
            model,
            frame,
            conf=conf,
            imgsz=imgsz,
            annotate=True,
            class_name_filter=class_name_filter
        )

        if annotated is None:
            annotated = frame

        cv2.imshow("Smart Vision Assistant", annotated)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()