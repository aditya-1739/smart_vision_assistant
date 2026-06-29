# Development Log

## 2026-06-29: Dual Runtime Architecture

### Files Modified
- `backend/config/settings.py` (Added `APP_MODE`)
- `backend/app.py` (Refactored to use `PipelineFactory`)
- `frontend/src/App.js` (Added Demo Mode badge)
- `README_DEPLOY.md` (Updated deployment instructions)

### Runtime Architecture Changes
- Created `requirements-demo.txt` for lightweight cloud deployments without ML dependencies.
- Refactored `backend/ai/pipeline.py` into a factory pattern:
  - `backend/ai/base_pipeline.py`
  - `backend/ai/yolo_pipeline.py` (for `inference` mode)
  - `backend/ai/demo_pipeline.py` (for `demo` mode)
  - `backend/ai/pipeline_factory.py`
- Replaced `AIPipeline` logic in `app.py` with `PipelineFactory.create(settings.APP_MODE)`.
- Mode defaults to `inference` but can be explicitly overridden via `APP_MODE`.

### Verification Results
- Verified that `demo` mode loads without PyTorch/YOLO dependencies and runs predefined scenarios.
- Verified that `inference` mode loads YOLO correctly and performs real ML inference.
- Frontend properly detects and indicates Demo Mode.

### Remaining Work
- Setup deployment in Render using the new MCP integration.
