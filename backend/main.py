import asyncio
import base64
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2

from gaze_detector import GazeDetector

app = FastAPI(title="Gaze Detection API")

# Allow CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global detector instance
detector = GazeDetector()


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Gaze detection server running"}


@app.websocket("/ws/gaze")
async def websocket_gaze(websocket: WebSocket):
    """
    WebSocket endpoint for real-time gaze detection.
    
    Expects: Base64 encoded JPEG/PNG frames
    Returns: JSON with gaze detection results
    """
    await websocket.accept()
    print("Client connected")
    
    try:
        while True:
            # Receive frame data
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                frame_data = message.get("frame", "")
                
                # Remove data URL prefix if present
                if "," in frame_data:
                    frame_data = frame_data.split(",")[1]
                
                # Decode base64 to image
                img_bytes = base64.b64decode(frame_data)
                img_array = np.frombuffer(img_bytes, dtype=np.uint8)
                frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                
                if frame is None:
                    await websocket.send_json({
                        "error": "Failed to decode frame"
                    })
                    continue
                
                # Convert BGR to RGB for MediaPipe
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Detect gaze
                result = detector.detect(rgb_frame)
                
                if result:
                    await websocket.send_json({
                        "is_looking_away": result.is_looking_away,
                        "head_yaw": round(result.head_yaw, 2),
                        "head_pitch": round(result.head_pitch, 2),
                        "left_iris_offset": round(result.left_iris_offset, 3),
                        "right_iris_offset": round(result.right_iris_offset, 3),
                        "confidence": result.confidence,
                        "reason": result.reason
                    })
                else:
                    await websocket.send_json({
                        "is_looking_away": True,
                        "reason": "detection_failed"
                    })
                    
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
            except Exception as e:
                print(f"Processing error: {e}")
                await websocket.send_json({"error": str(e)})
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



