# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0] - 2026-06-25

### Added
- Phase 1: Object detection pipeline utilizing YOLOv8 and OpenCV.
- Phase 2: Web frontend dashboard with React and WebSockets.
- Phase 3: Spatial Audio Guidance and Text-to-Speech integration (Win32 & Browser Web Speech API).
- Phase 4: System optimizations, Producer-Consumer pipeline, dynamic frame skipping, and WebRTC streaming for cloud mode.
- Phase 5A: Local Production Deployment using unified Flask static serving and Eventlet WSGI.
- Phase 5B: Cloud Architecture with Render (Backend) and Vercel (Frontend) configuration, dynamic environment variables, and strict CORS.
- Security headers and robust error handling.

### Changed
- Refactored `settings.py` to support `development` and `production` environments.
- Replaced console `print()` with structured file logging (`app.log`, `error.log`).

### Fixed
- Object tracker memory leaks by clearing old paths.
- Spatial radar accurately inverting logic mathematically without mirroring video.
