# Smart Vision Assistant

Smart Vision Assistant is a real-time object detection and navigation aid designed for visually impaired users. It uses a camera feed to detect objects in the surroundings using YOLOv8, and provides immediate audio feedback (Text-to-Speech) to guide the user safely by announcing object proximity and directional warnings.

## Features

- **Real-Time Object Detection**: Utilizes YOLOv8 and OpenCV to detect objects (e.g., person, car, chair, dog) in real-time.
- **Audio Navigation Guide**: Provides robust Text-to-Speech (TTS) announcements indicating object position ("left", "right", "ahead") and distance ("far", "near", "very close").
- **Urgency Alerts**: Generates urgent warnings (e.g., "Watch out! Person very close ahead. Stop.") to ensure user safety.
- **Web Dashboard**: A React-based accessible web interface displaying the live camera feed, detected objects history, and control panel.
- **Accessibility Modes**: Supports High Contrast mode and other accessibility features out-of-the-box.
- **Low-Latency Streaming**: Employs WebSockets (Socket.IO) for high-performance, low-latency streaming of video frames and detection metadata.

## Tech Stack

### Backend
- **Python**: Core programming language.
- **Flask & Flask-SocketIO**: Web server and WebSocket communication.
- **YOLOv8 (Ultralytics)**: Object detection model.
- **OpenCV**: Video capture and image processing.
- **PyTorch**: Deep learning backend for YOLOv8.
- **PyTTSx3 / Win32com**: Robust multi-platform Text-to-Speech engine.

### Frontend
- **React**: UI library for the web dashboard.
- **Socket.io-client**: Real-time communication with the backend.
- **Axios**: HTTP client for API requests.
- **CSS**: Custom styles with glassmorphism and accessibility themes.

## Project Structure

```text
Smart Vision Assistant/
├── backend/                  # Python Flask backend
│   ├── app.py                # Main server and inference pipeline
│   ├── detection_engine.py   # Object detection utilities
│   ├── tts_engine.py         # Text-to-Speech utilities
│   ├── requirements.txt      # Python dependencies
│   ├── src/                  # Detection model loaders
│   └── yolov8n.pt            # Pre-trained YOLOv8 weights
└── frontend/                 # React web application
    ├── package.json          # Node.js dependencies
    ├── public/               # Static assets
    └── src/                  # React components and App logic
        ├── components/       # UI Components (VideoStream, AudioGuide, etc.)
        └── App.js            # Main React application
```

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js (v14 or higher) and npm
- A connected webcam

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Flask server:
   ```bash
   python app.py
   ```
   The backend will run on `http://localhost:5000`.

### Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```
   The web dashboard will automatically open at `http://localhost:3000`.

## Usage

1. Open the web dashboard in your browser (`http://localhost:3000`).
2. Ensure your webcam is connected and accessible.
3. Click the **Start** button on the control panel to initiate the camera feed and object detection.
4. The system will begin streaming video, drawing bounding boxes around detected objects, and generating audio navigation cues.
5. You can toggle Text-to-Speech (TTS), adjust the detection confidence threshold, and enable High Contrast mode via the dashboard controls.
6. Click **Stop** to halt the detection pipeline.
