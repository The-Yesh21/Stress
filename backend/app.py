from __future__ import annotations

import base64
import logging
import os
import tempfile
import traceback
import urllib.request
from pathlib import Path
from typing import Any
from uuid import uuid4

import cv2
import numpy as np
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging to console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("stressai.backend")

load_dotenv(Path(__file__).with_name(".env"))

try:
    from ml_stress_model import DEFAULT_MODEL_PATH, load_model as load_stress_model, predict_stress
except ImportError:  # pragma: no cover - optional until ML dependencies are installed
    try:
        from backend.ml_stress_model import DEFAULT_MODEL_PATH, load_model as load_stress_model, predict_stress
    except ImportError:
        DEFAULT_MODEL_PATH = Path(__file__).with_name("models") / "stress_model.joblib"
        load_stress_model = None
        predict_stress = None

try:
    from hsemotion_onnx.facial_emotions import HSEmotionRecognizer
except ImportError:  # pragma: no cover - handled at runtime if dependencies are missing
    HSEmotionRecognizer = None


EMOTION_KEYS = (
    "neutral",
    "happy",
    "sad",
    "angry",
    "fearful",
    "disgusted",
    "surprised",
)

EMOTION_ALIASES = {
    "anger": "angry",
    "angry": "angry",
    "contempt": "disgusted",
    "disgust": "disgusted",
    "disgusted": "disgusted",
    "fear": "fearful",
    "fearful": "fearful",
    "happy": "happy",
    "neutral": "neutral",
    "sad": "sad",
    "sadness": "sad",
    "surprise": "surprised",
    "surprised": "surprised",
}


class CreateSessionResponse(BaseModel):
    sessionId: str


class FrameRequest(BaseModel):
    image: str


class FacialMetricsResponse(BaseModel):
    faceDetected: bool
    framesAnalyzed: int
    faceDetectionRate: float
    dominantEmotion: str
    expressions: dict[str, float]
    stressScore: float
    fatigueScore: float
    depressionScore: float
    anxietyScore: float
    frustrationScore: float
    darkCircles: float
    dullness: float
    tensionIndex: float
    note: str


app = FastAPI(title="StressAI Facial Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, list[dict[str, Any]]] = {}

    def create(self) -> str:
        session_id = uuid4().hex
        self._sessions[session_id] = []
        return session_id

    def get(self, session_id: str) -> list[dict[str, Any]]:
        if session_id not in self._sessions:
            raise KeyError(session_id)
        return self._sessions[session_id]

    def append(self, session_id: str, frame: dict[str, Any]) -> int:
        session = self.get(session_id)
        session.append(frame)
        return len(session)


sessions = SessionStore()
face_cascades = [
    cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"),
    cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml"),
    cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml"),
]
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
emotion_model: HSEmotionRecognizer | None = None
stress_ml_model: Any | None = None
NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_MODEL = "google/gemma-4-31b-it"
NVIDIA_API_KEY_ENV = "NVIDIA_API_KEY"
NVIDIA_NGC_API_KEY_ENV = "NGC_API_KEY"


def get_nvidia_api_key() -> str | None:
    api_key = os.getenv(NVIDIA_API_KEY_ENV) or os.getenv(NVIDIA_NGC_API_KEY_ENV)
    if not api_key:
        return None

    api_key = api_key.strip()
    if len(api_key) >= 2 and api_key[0] == api_key[-1] and api_key[0] in {"'", '"'}:
        api_key = api_key[1:-1].strip()

    return api_key or None


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def empty_expressions() -> dict[str, float]:
    return {key: 0.0 for key in EMOTION_KEYS}


def get_emotion_model() -> HSEmotionRecognizer | None:
    # Force disabled for memory efficiency on Render free tier
    return None


def get_stress_ml_model() -> Any | None:
    global stress_ml_model

    if load_stress_model is None:
        return None

    if stress_ml_model is None and DEFAULT_MODEL_PATH.exists():
        try:
            stress_ml_model = load_stress_model(DEFAULT_MODEL_PATH)
            logger.info("Loaded trained stress model from %s", DEFAULT_MODEL_PATH)
        except Exception:
            logger.exception("Failed to load trained stress model from %s", DEFAULT_MODEL_PATH)
            return None

    return stress_ml_model


def decode_data_url(data_url: str) -> np.ndarray:
    encoded = data_url.split(",", 1)[1] if "," in data_url else data_url

    try:
        image_bytes = base64.b64decode(encoded)
    except Exception as exc:  # pragma: no cover - invalid client payload
        raise HTTPException(status_code=400, detail="Invalid image payload.") from exc

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Unable to decode image.")
    return image


def normalize_expression_payload(label: str | None, raw_scores: Any) -> tuple[dict[str, float], str]:
    expressions = empty_expressions()

    if isinstance(raw_scores, dict):
        for raw_key, score in raw_scores.items():
            mapped = EMOTION_ALIASES.get(str(raw_key).lower())
            if mapped:
                expressions[mapped] += float(score)
    elif isinstance(raw_scores, (list, tuple, np.ndarray)):
        model = emotion_model
        class_lookup = getattr(model, "idx_to_class", None) if model is not None else None
        if isinstance(class_lookup, dict):
            for index, score in enumerate(raw_scores):
                mapped = EMOTION_ALIASES.get(str(class_lookup.get(index, "")).lower())
                if mapped:
                    expressions[mapped] += float(score)

    total = sum(expressions.values())
    if total > 0:
        expressions = {key: value / total for key, value in expressions.items()}
    else:
        fallback = EMOTION_ALIASES.get((label or "neutral").lower(), "neutral")
        expressions[fallback] = 1.0

    dominant = max(expressions, key=expressions.get)
    return expressions, dominant


def build_fallback_expression_payload(
    dark_circles: float,
    dullness: float,
    tension_index: float,
) -> tuple[dict[str, float], str]:
    expressions = empty_expressions()

    fatigue = clamp((dark_circles * 0.55 + dullness * 0.45) / 100, 0.0, 1.0)
    tension = clamp(abs(tension_index - 0.82) / 0.42, 0.0, 1.0)

    expressions["neutral"] = clamp(0.62 - fatigue * 0.22 - tension * 0.12, 0.18, 0.75)
    expressions["happy"] = clamp(0.18 - fatigue * 0.1, 0.03, 0.18)
    expressions["sad"] = clamp(fatigue * 0.28, 0.02, 0.28)
    expressions["angry"] = clamp(tension * 0.22, 0.02, 0.22)
    expressions["fearful"] = clamp(tension * 0.18, 0.02, 0.18)
    expressions["disgusted"] = clamp(fatigue * 0.08, 0.0, 0.08)
    expressions["surprised"] = clamp((1 - fatigue) * 0.06, 0.02, 0.06)

    total = sum(expressions.values()) or 1.0
    expressions = {key: value / total for key, value in expressions.items()}
    dominant = max(expressions, key=expressions.get)
    return expressions, dominant


def detect_primary_face(gray_image: np.ndarray) -> tuple[int, int, int, int] | None:
    equalized = cv2.equalizeHist(gray_image)
    image_height, image_width = gray_image.shape[:2]
    min_side = max(48, int(min(image_width, image_height) * 0.16))
    attempts = (
        {"scaleFactor": 1.08, "minNeighbors": 5, "minSize": (min_side, min_side)},
        {"scaleFactor": 1.05, "minNeighbors": 4, "minSize": (max(44, min_side - 18), max(44, min_side - 18))},
        {"scaleFactor": 1.03, "minNeighbors": 3, "minSize": (40, 40)},
    )

    candidates: list[tuple[int, int, int, int]] = []
    for cascade in face_cascades:
        if cascade.empty():
            continue
        for params in attempts:
            faces = cascade.detectMultiScale(equalized, **params)
            candidates.extend(tuple(int(value) for value in face) for face in faces)

    if candidates:
        center_x = image_width / 2
        center_y = image_height / 2

        def rank(face: tuple[int, int, int, int]) -> float:
            x, y, w, h = face
            area_score = w * h
            face_center_x = x + w / 2
            face_center_y = y + h / 2
            center_penalty = abs(face_center_x - center_x) + abs(face_center_y - center_y)
            return area_score - center_penalty * 0.35

        return max(candidates, key=rank)

    return None


def detect_eyes(face_gray: np.ndarray) -> list[tuple[int, int, int, int]]:
    eyes = eye_cascade.detectMultiScale(face_gray, scaleFactor=1.08, minNeighbors=6, minSize=(18, 18))
    if len(eyes) == 0:
        return []

    sorted_eyes = sorted(eyes, key=lambda eye: eye[2] * eye[3], reverse=True)
    top_two = sorted(sorted_eyes[:2], key=lambda eye: eye[0])
    return top_two


def analyze_dark_circles(face_gray: np.ndarray, eyes: list[tuple[int, int, int, int]]) -> float:
    face_mean = float(np.mean(face_gray))
    if face_mean <= 0:
        return 0.0

    severities: list[float] = []
    for ex, ey, ew, eh in eyes:
        under_y = min(face_gray.shape[0] - 1, ey + eh + max(4, eh // 5))
        under_h = min(face_gray.shape[0] - under_y, max(6, eh // 2))
        under_x = max(0, ex - max(2, ew // 8))
        under_w = min(face_gray.shape[1] - under_x, ew + max(4, ew // 4))
        patch = face_gray[under_y : under_y + under_h, under_x : under_x + under_w]
        if patch.size == 0:
            continue

        patch_mean = float(np.mean(patch))
        severity = clamp(((face_mean - patch_mean) / face_mean) * 175, 0.0, 100.0)
        severities.append(severity)

    if not severities:
        return clamp((140 - face_mean) * 0.9, 0.0, 100.0)

    return float(np.mean(severities))


def analyze_dullness(face_gray: np.ndarray) -> float:
    brightness = float(np.mean(face_gray))
    contrast = float(np.std(face_gray))
    low_brightness = clamp((132 - brightness) * 1.05, 0.0, 70.0)
    flat_texture = clamp((36 - contrast) * 1.25, 0.0, 30.0)
    return clamp(low_brightness + flat_texture, 0.0, 100.0)


def analyze_tension_index(face_box: tuple[int, int, int, int]) -> float:
    _, _, width, height = face_box
    return round(width / max(height, 1), 2)


def estimate_stress_score(expressions: dict[str, float], fatigue_score: float, tension_index: float) -> float:
    emotion_component = clamp(
        expressions["angry"] * 1.45
        + expressions["fearful"] * 1.45
        + expressions["sad"] * 1.1
        + expressions["disgusted"] * 0.9
        + expressions["surprised"] * 0.45
        - expressions["happy"] * 0.35
        - expressions["neutral"] * 0.2,
        0.0,
        1.0,
    )
    fatigue_component = fatigue_score / 100
    tension_component = clamp(abs(tension_index - 0.82) / 0.42, 0.0, 1.0)

    return clamp(
        emotion_component * 0.55 + fatigue_component * 0.3 + tension_component * 0.15,
        0.0,
        1.0,
    )


def build_note(dominant_emotion: str, stress_score: float, fatigue_score: float, face_detection_rate: float) -> str:
    if face_detection_rate < 0.4:
        return "Face visibility was inconsistent. Ask the user to stay centered and keep the room evenly lit."
    if fatigue_score > 68 and stress_score < 0.55:
        return "Fatigue markers were stronger than emotional stress markers during the scan."
    if dominant_emotion in {"angry", "fearful", "sad"} and stress_score >= 0.55:
        return f"The scan captured repeated {dominant_emotion} cues together with elevated facial stress markers."
    if dominant_emotion == "happy" and stress_score < 0.35:
        return "The scan stayed mostly relaxed, with low stress and low fatigue markers."
    if dominant_emotion == "neutral":
        return "Most frames stayed neutral. Stress scoring was driven more by fatigue and tension markers than by expression swings."
    return "Facial stress markers were mixed, with moderate expression changes across the scan."


def build_ai_note(summary: dict[str, Any], fallback_note: str) -> str:
    api_key = get_nvidia_api_key()
    if not api_key:
        return fallback_note

    prompt = (
        "Write the final statement for a stress analysis report. "
        "Use a calm, professional tone. Do not diagnose medical conditions. "
        "Mention the observed signals and give one practical next step. "
        "Keep it to 2 concise sentences.\n\n"
        f"Dominant emotion: {summary['dominantEmotion']}\n"
        f"Stress score: {summary['stressScore']} out of 1\n"
        f"Fatigue score: {summary['fatigueScore']} out of 100\n"
        f"Dark circles: {summary['darkCircles']} out of 100\n"
        f"Dullness: {summary['dullness']} out of 100\n"
        f"Tension index: {summary['tensionIndex']}\n"
        f"Face detection rate: {summary['faceDetectionRate']}\n"
        f"Rule-based note: {fallback_note}"
    )

    payload = {
        "model": NVIDIA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You improve stress report statements from facial analysis metrics. "
                    "Be helpful, measured, and non-clinical."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 90,
        "temperature": 0.2,
    }

    try:
        response = requests.post(
            NVIDIA_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=12,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        return content or fallback_note
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else "unknown"
        if status_code == 401:
            logger.warning(
                "NVIDIA AI report note generation failed: unauthorized. Check %s or %s.",
                NVIDIA_API_KEY_ENV,
                NVIDIA_NGC_API_KEY_ENV,
            )
        else:
            logger.warning("NVIDIA AI report note generation failed: %s", exc)
        return fallback_note
    except Exception as exc:
        logger.warning("NVIDIA AI report note generation failed: %s", exc)
        return fallback_note


def analyze_frame_payload(image: np.ndarray) -> dict[str, Any]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    face_box = detect_primary_face(gray)

    if face_box is None:
        return {
            "faceDetected": False,
            "dominantEmotion": "No face",
            "expressions": empty_expressions(),
            "stressScore": 0.0,
            "fatigueScore": 0.0,
            "depressionScore": 0.0,
            "anxietyScore": 0.0,
            "frustrationScore": 0.0,
            "darkCircles": 0.0,
            "dullness": 0.0,
            "tensionIndex": 0.0,
        }

    x, y, w, h = face_box
    face_region = image[y : y + h, x : x + w]
    face_gray = gray[y : y + h, x : x + w]
    eyes = detect_eyes(face_gray)

    dark_circles = analyze_dark_circles(face_gray, eyes)
    dullness = analyze_dullness(face_gray)
    tension_index = analyze_tension_index(face_box)
    fatigue_score = clamp(dark_circles * 0.58 + dullness * 0.42, 0.0, 100.0)

    model = get_emotion_model()
    if model is None:
        expressions, dominant_emotion = build_fallback_expression_payload(dark_circles, dullness, tension_index)
    else:
        try:
            predicted_label, raw_scores = model.predict_emotions(face_region, logits=False)
            expressions, dominant_emotion = normalize_expression_payload(predicted_label, raw_scores)
        except Exception:
            logger.exception("Emotion inference failed for current frame. Falling back to heuristic expression estimation.")
            expressions, dominant_emotion = build_fallback_expression_payload(dark_circles, dullness, tension_index)

    stress_score_heuristic = estimate_stress_score(expressions, fatigue_score, tension_index)
    stress_score = stress_score_heuristic
    trained_model = get_stress_ml_model()
    if trained_model is not None and predict_stress is not None:
        try:
            ml_prediction = predict_stress(face_region, trained_model)
            # Higher weight to the trained model (0.8) as it is now optimized for the grayscale/emotion dataset
            stress_score = clamp(stress_score_heuristic * 0.2 + ml_prediction.score * 0.8, 0.0, 1.0)
            logger.info(
                f"Frame Analysis: Heuristic={stress_score_heuristic:.2f}, "
                f"ML={ml_prediction.score:.2f} ({ml_prediction.label}), "
                f"Final={stress_score:.2f}"
            )
        except Exception:
            logger.exception("Trained stress model inference failed. Using heuristic stress score.")
            logger.info(f"Frame Analysis (Fallback): Heuristic={stress_score_heuristic:.2f}")
    else:
        logger.info(f"Frame Analysis (No ML): Heuristic={stress_score_heuristic:.2f}")

    # Calculate derived mental state scores
    depression_score = clamp(expressions["sad"] * 0.7 + (fatigue_score / 100) * 0.3 - expressions["happy"] * 0.2, 0.0, 1.0)
    anxiety_score = clamp(expressions["fearful"] * 0.6 + clamp(abs(tension_index - 0.82) / 0.42, 0.0, 1.0) * 0.4, 0.0, 1.0)
    frustration_score = clamp(expressions["angry"] * 0.7 + expressions["disgusted"] * 0.3, 0.0, 1.0)

    return {
        "faceDetected": True,
        "dominantEmotion": dominant_emotion.title(),
        "expressions": {key: round(value, 4) for key, value in expressions.items()},
        "stressScore": round(stress_score, 4),
        "fatigueScore": round(fatigue_score, 2),
        "depressionScore": round(depression_score, 4),
        "anxietyScore": round(anxiety_score, 4),
        "frustrationScore": round(frustration_score, 4),
        "darkCircles": round(dark_circles, 2),
        "dullness": round(dullness, 2),
        "tensionIndex": tension_index,
    }


def summarize_session(frames: list[dict[str, Any]]) -> dict[str, Any]:
    frames_analyzed = len(frames)
    detected_frames = [frame for frame in frames if frame["faceDetected"]]
    face_detection_rate = len(detected_frames) / frames_analyzed if frames_analyzed else 0.0

    if len(detected_frames) < 3:
        return {
            "faceDetected": False,
            "framesAnalyzed": frames_analyzed,
            "faceDetectionRate": round(face_detection_rate, 4),
            "dominantEmotion": "No face",
            "expressions": empty_expressions(),
            "stressScore": 0.0,
            "fatigueScore": 0.0,
            "depressionScore": 0.0,
            "anxietyScore": 0.0,
            "frustrationScore": 0.0,
            "darkCircles": 0.0,
            "dullness": 0.0,
            "tensionIndex": 0.0,
            "note": "No stable face was detected for long enough during the scan. Stay centered, face the camera directly, and improve lighting.",
        }

    # Stabilized aggregation using truncated mean (reject top/bottom 5% if enough frames exist)
    def stabilized_mean(values: list[float]) -> float:
        if len(values) < 10:
            return float(np.mean(values))
        sorted_values = sorted(values)
        trim = max(1, int(len(values) * 0.05))
        return float(np.mean(sorted_values[trim:-trim]))

    expressions = {
        key: round(float(np.mean([frame["expressions"][key] for frame in detected_frames])), 4)
        for key in EMOTION_KEYS
    }
    dominant_emotion = max(expressions, key=expressions.get).title()
    
    stress_score = stabilized_mean([frame["stressScore"] for frame in detected_frames])
    fatigue_score = stabilized_mean([frame["fatigueScore"] for frame in detected_frames])
    depression_score = stabilized_mean([frame["depressionScore"] for frame in detected_frames])
    anxiety_score = stabilized_mean([frame["anxietyScore"] for frame in detected_frames])
    frustration_score = stabilized_mean([frame["frustrationScore"] for frame in detected_frames])
    
    dark_circles = float(np.mean([frame["darkCircles"] for frame in detected_frames]))
    dullness = float(np.mean([frame["dullness"] for frame in detected_frames]))
    tension_index = float(np.mean([frame["tensionIndex"] for frame in detected_frames]))
    
    fallback_note = build_note(dominant_emotion.lower(), stress_score, fatigue_score, face_detection_rate)
    summary = {
        "faceDetected": True,
        "framesAnalyzed": frames_analyzed,
        "faceDetectionRate": round(face_detection_rate, 4),
        "dominantEmotion": dominant_emotion,
        "expressions": expressions,
        "stressScore": round(stress_score, 4),
        "fatigueScore": round(fatigue_score, 2),
        "depressionScore": round(depression_score, 4),
        "anxietyScore": round(anxiety_score, 4),
        "frustrationScore": round(frustration_score, 4),
        "darkCircles": round(dark_circles, 2),
        "dullness": round(dullness, 2),
        "tensionIndex": round(tension_index, 2),
        "note": fallback_note,
    }
    logger.info(f"Session Summary: Face Detection={face_detection_rate:.2%}, Final Stress Score={stress_score:.2%}")
    summary["note"] = build_ai_note(summary, fallback_note)
    return summary


def analyze_video_file(video_path: str, max_duration_seconds: float = 10.0) -> dict[str, Any]:
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise HTTPException(status_code=400, detail="Unable to open uploaded video.")

    # Use a fixed FPS if detection is unreliable to ensure deterministic sampling
    fps_raw = capture.get(cv2.CAP_PROP_FPS)
    fps = float(fps_raw) if fps_raw and fps_raw > 0 else 24.0
    
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration_seconds = total_frames / fps if total_frames > 0 else 0.0

    # Fixed sampling: Analyze exactly 2 frames per second for consistency
    frame_step = max(int(round(fps / 2.0)), 1)
    max_frame_index = int(min(total_frames or fps * max_duration_seconds, fps * max_duration_seconds))
    sampled_frames: list[dict[str, Any]] = []

    frame_index = 0
    while capture.isOpened() and frame_index <= max_frame_index:
        ok, frame = capture.read()
        if not ok:
            break

        if frame_index % frame_step == 0:
            sampled_frames.append(analyze_frame_payload(frame))

        frame_index += 1

    capture.release()

    summary = summarize_session(sampled_frames)
    summary["framesAnalyzed"] = len(sampled_frames)
    summary["note"] = (
        f"Processed {min(duration_seconds, max_duration_seconds):.1f}s of uploaded video. "
        f"{summary['note']}"
    )
    return summary


@app.on_event("startup")
async def startup_event():
    logger.info("Starting StressAI Facial Backend...")
    # We will lazy-load models on the first request to save memory during startup
    logger.info("Models will be initialized on first use to conserve RAM.")

@app.get("/health")
def health() -> dict[str, Any]:
    # Check if models are loaded for status reporting, but don't force load them here
    status = {
        "status": "ok",
        "stress_model_loaded": stress_ml_model is not None,
        "emotion_model_loaded": emotion_model is not None
    }
    return status


@app.post("/api/facial/session", response_model=CreateSessionResponse)
def create_facial_session() -> CreateSessionResponse:
    return CreateSessionResponse(sessionId=sessions.create())


@app.post("/api/facial/session/{session_id}/frame", response_model=FacialMetricsResponse)
def analyze_facial_frame(session_id: str, payload: FrameRequest) -> FacialMetricsResponse:
    try:
        sessions.get(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Facial session not found.") from exc

    try:
        frame_metrics = analyze_frame_payload(decode_data_url(payload.image))
        frames_analyzed = sessions.append(session_id, frame_metrics)
        detected_count = len([frame for frame in sessions.get(session_id) if frame["faceDetected"]])
        face_detection_rate = detected_count / frames_analyzed if frames_analyzed else 0.0
        note = build_note(
            frame_metrics["dominantEmotion"].lower(),
            frame_metrics["stressScore"],
            frame_metrics["fatigueScore"],
            face_detection_rate,
        )

        return FacialMetricsResponse(
            **frame_metrics,
            framesAnalyzed=frames_analyzed,
            faceDetectionRate=round(face_detection_rate, 4),
            note=note,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unhandled facial frame error: %s", exc)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Frame analysis failed: {exc}") from exc


@app.post("/api/facial/session/{session_id}/complete", response_model=FacialMetricsResponse)
def complete_facial_session(session_id: str) -> FacialMetricsResponse:
    try:
        frames = sessions.get(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Facial session not found.") from exc

    return FacialMetricsResponse(**summarize_session(frames))


@app.post("/api/facial/video", response_model=FacialMetricsResponse)
async def analyze_facial_video(video: UploadFile = File(...)) -> FacialMetricsResponse:
    suffix = os.path.splitext(video.filename or "")[1] or ".mp4"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_path = temp_file.name
        content = await video.read()
        temp_file.write(content)

    try:
        summary = analyze_video_file(temp_path)
        return FacialMetricsResponse(**summary)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unhandled facial video error: %s", exc)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {exc}") from exc
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass
