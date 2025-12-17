import numpy as np
import mediapipe as mp
from dataclasses import dataclass
from typing import Optional
import math


@dataclass
class GazeResult:
    is_looking_away: bool
    head_yaw: float  # Left/right rotation in degrees
    head_pitch: float  # Up/down rotation in degrees
    left_iris_offset: float  # -1 (looking left) to 1 (looking right)
    right_iris_offset: float
    confidence: float
    reason: str


class GazeDetector:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,  # Enables iris landmarks
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Landmark indices for head pose estimation
        # Using key facial points for pose calculation
        self.NOSE_TIP = 1
        self.CHIN = 152
        self.LEFT_EYE_LEFT = 33
        self.RIGHT_EYE_RIGHT = 263
        self.LEFT_MOUTH = 61
        self.RIGHT_MOUTH = 291
        
        # Eye landmark indices
        self.LEFT_EYE_INNER = 133
        self.LEFT_EYE_OUTER = 33
        self.RIGHT_EYE_INNER = 362
        self.RIGHT_EYE_OUTER = 263
        
        # Iris landmark indices (available when refine_landmarks=True)
        self.LEFT_IRIS_CENTER = 468
        self.RIGHT_IRIS_CENTER = 473
        
        # Thresholds for detecting looking away
        self.YAW_THRESHOLD = 20  # degrees
        self.PITCH_THRESHOLD = 15  # degrees
        self.IRIS_OFFSET_THRESHOLD = 0.35  # normalized offset

    def calculate_head_pose(self, landmarks, image_width: int, image_height: int) -> tuple[float, float]:
        """Calculate head yaw and pitch from facial landmarks."""
        
        # Get 3D coordinates of key points
        nose = landmarks[self.NOSE_TIP]
        chin = landmarks[self.CHIN]
        left_eye = landmarks[self.LEFT_EYE_LEFT]
        right_eye = landmarks[self.RIGHT_EYE_RIGHT]
        left_mouth = landmarks[self.LEFT_MOUTH]
        right_mouth = landmarks[self.RIGHT_MOUTH]
        
        # Convert to image coordinates
        def to_pixel(lm):
            return np.array([lm.x * image_width, lm.y * image_height, lm.z * image_width])
        
        nose_3d = to_pixel(nose)
        chin_3d = to_pixel(chin)
        left_eye_3d = to_pixel(left_eye)
        right_eye_3d = to_pixel(right_eye)
        left_mouth_3d = to_pixel(left_mouth)
        right_mouth_3d = to_pixel(right_mouth)
        
        # Calculate face center
        face_center = (left_eye_3d + right_eye_3d) / 2
        
        # Calculate yaw (left/right rotation)
        # Use the relative positions of eyes
        eye_vector = right_eye_3d - left_eye_3d
        eye_distance = np.linalg.norm(eye_vector[:2])
        
        # Yaw based on nose position relative to eye center
        eye_center = (left_eye_3d + right_eye_3d) / 2
        nose_offset = nose_3d[0] - eye_center[0]
        yaw = math.degrees(math.atan2(nose_offset, eye_distance / 2))
        
        # Calculate pitch (up/down rotation)
        # Use nose tip relative to eye-mouth midpoint
        mouth_center = (left_mouth_3d + right_mouth_3d) / 2
        vertical_ref = mouth_center[1] - eye_center[1]
        nose_vertical_offset = nose_3d[1] - eye_center[1]
        
        if vertical_ref != 0:
            pitch_ratio = (nose_vertical_offset / vertical_ref) - 0.5
            pitch = pitch_ratio * 60  # Scale to approximate degrees
        else:
            pitch = 0
            
        return yaw, pitch

    def calculate_iris_offset(self, landmarks) -> tuple[float, float]:
        """
        Calculate iris position within the eye.
        Returns normalized offset: -1 (looking left) to 1 (looking right)
        """
        def get_iris_offset(iris_idx, inner_idx, outer_idx):
            iris = landmarks[iris_idx]
            inner = landmarks[inner_idx]
            outer = landmarks[outer_idx]
            
            # Calculate eye width
            eye_width = abs(outer.x - inner.x)
            if eye_width == 0:
                return 0
            
            # Calculate iris position within eye (0 = inner corner, 1 = outer corner)
            eye_center_x = (inner.x + outer.x) / 2
            iris_offset = (iris.x - eye_center_x) / (eye_width / 2)
            
            return iris_offset
        
        left_offset = get_iris_offset(
            self.LEFT_IRIS_CENTER, 
            self.LEFT_EYE_INNER, 
            self.LEFT_EYE_OUTER
        )
        right_offset = get_iris_offset(
            self.RIGHT_IRIS_CENTER,
            self.RIGHT_EYE_INNER,
            self.RIGHT_EYE_OUTER
        )
        
        return left_offset, right_offset

    def detect(self, frame: np.ndarray) -> Optional[GazeResult]:
        """
        Detect gaze direction from a video frame.
        
        Args:
            frame: BGR image from OpenCV (or RGB)
            
        Returns:
            GazeResult with gaze information, or None if no face detected
        """
        # Convert BGR to RGB if needed
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            rgb_frame = frame
        else:
            return None
            
        image_height, image_width = frame.shape[:2]
        
        # Process with MediaPipe
        results = self.face_mesh.process(rgb_frame)
        
        if not results.multi_face_landmarks:
            return GazeResult(
                is_looking_away=True,
                head_yaw=0,
                head_pitch=0,
                left_iris_offset=0,
                right_iris_offset=0,
                confidence=0,
                reason="no_face_detected"
            )
        
        landmarks = results.multi_face_landmarks[0].landmark
        
        # Calculate head pose
        yaw, pitch = self.calculate_head_pose(landmarks, image_width, image_height)
        
        # Calculate iris offsets
        left_iris, right_iris = self.calculate_iris_offset(landmarks)
        
        # Determine if looking away
        is_looking_away = False
        reason = "looking_at_screen"
        
        # Check head rotation
        if abs(yaw) > self.YAW_THRESHOLD:
            is_looking_away = True
            reason = f"head_turned_{'left' if yaw < 0 else 'right'}"
        elif abs(pitch) > self.PITCH_THRESHOLD:
            is_looking_away = True
            reason = f"head_tilted_{'down' if pitch > 0 else 'up'}"
        # Check iris position (both eyes should agree)
        elif abs(left_iris) > self.IRIS_OFFSET_THRESHOLD and abs(right_iris) > self.IRIS_OFFSET_THRESHOLD:
            # Both irises looking in the same direction
            avg_iris = (left_iris + right_iris) / 2
            if abs(avg_iris) > self.IRIS_OFFSET_THRESHOLD:
                is_looking_away = True
                reason = f"eyes_looking_{'left' if avg_iris < 0 else 'right'}"
        
        return GazeResult(
            is_looking_away=is_looking_away,
            head_yaw=yaw,
            head_pitch=pitch,
            left_iris_offset=left_iris,
            right_iris_offset=right_iris,
            confidence=1.0,
            reason=reason
        )

    def close(self):
        """Release resources."""
        self.face_mesh.close()



