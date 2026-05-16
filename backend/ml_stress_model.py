from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
DEFAULT_MODEL_PATH = Path(__file__).with_name("models") / "stress_model.joblib"


@dataclass(frozen=True)
class StressPrediction:
    label: str
    score: float
    confidence: float


def iter_image_paths(data_dir: Path) -> list[tuple[Path, str]]:
    examples: list[tuple[Path, str]] = []
    for label_dir in sorted(path for path in data_dir.iterdir() if path.is_dir()):
        label = label_dir.name
        for image_path in sorted(label_dir.rglob("*")):
            if image_path.is_file() and image_path.suffix.lower() in IMAGE_EXTENSIONS:
                examples.append((image_path, label))
    return examples


def label_to_stress_score(label: str) -> float:
    normalized = label.lower().replace("-", "_").replace(" ", "_")
    if normalized in {"stress", "stressed", "high", "high_stress", "angry", "fear", "fearful", "sad", "disgust", "disgusted"}:
        return 1.0
    if normalized in {"medium", "moderate", "medium_stress", "moderate_stress", "surprise", "surprised"}:
        return 0.55
    if normalized in {"calm", "normal", "relaxed", "low", "low_stress", "not_stressed", "no_stress", "happy", "neutral"}:
        return 0.0
    return 0.5


def extract_lbp(image_gray: np.ndarray) -> np.ndarray:
    """Simple 3x3 Local Binary Pattern (LBP) histogram extraction."""
    img = image_gray.astype(np.int32)
    rows, cols = img.shape
    if rows < 3 or cols < 3:
        return np.zeros(256, dtype=np.float32)

    lbp = np.zeros((rows - 2, cols - 2), dtype=np.uint8)
    offsets = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]
    for i, (dr, dc) in enumerate(offsets):
        neighbor = img[1 + dr : rows - 1 + dr, 1 + dc : cols - 1 + dc]
        center = img[1 : rows - 1, 1 : cols - 1]
        lbp += ((neighbor >= center) << i).astype(np.uint8)

    hist, _ = np.histogram(lbp, bins=256, range=(0, 256), density=True)
    return hist.astype(np.float32)


def extract_gabor(image_gray: np.ndarray) -> np.ndarray:
    """Extract energy from a bank of Gabor filters (8 orientations, 2 scales)."""
    energies = []
    ksize = 21
    for theta in np.arange(0, np.pi, np.pi / 8):
        for sigma in (2.0, 4.0):
            kernel = cv2.getGaborKernel((ksize, ksize), sigma, theta, 10.0, 0.5, 0, ktype=cv2.CV_32F)
            filtered = cv2.filter2D(image_gray, cv2.CV_32F, kernel)
            energies.append(np.mean(np.abs(filtered)))
    return np.array(energies, dtype=np.float32)


def extract_features(image: np.ndarray) -> np.ndarray:
    # Handle both grayscale and color inputs gracefully
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    resized = cv2.resize(gray, (64, 64), interpolation=cv2.INTER_AREA)
    # Contrast limited adaptive histogram equalization (CLAHE) for better local contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray_norm = clahe.apply(resized)

    # 1. Texture: LBP (Local Binary Patterns) - excellent for grayscale micro-expressions
    lbp_features = extract_lbp(gray_norm)

    # 2. Orientations: Gabor filters for fine-grained expression cues
    gabor_features = extract_gabor(gray_norm)

    # 3. Shape/Edges: HOG (Histogram of Oriented Gradients)
    hog = cv2.HOGDescriptor(
        _winSize=(64, 64),
        _blockSize=(16, 16),
        _blockStride=(8, 8),
        _cellSize=(8, 8),
        _nbins=9,
    )
    hog_features = hog.compute(gray_norm).reshape(-1)

    # 3. Frequency/Energy: Laplacian and Sobel for edge energy
    laplacian = cv2.Laplacian(gray_norm, cv2.CV_32F).flatten()
    laplacian_stats = np.array([np.mean(laplacian), np.std(laplacian)], dtype=np.float32)

    # 4. Regional Distribution: Break face into grid to capture asymmetric stress markers
    grid_stats = []
    for r in range(0, 64, 16):
        for c in range(0, 64, 16):
            cell = gray_norm[r : r + 16, c : c + 16]
            grid_stats.extend([float(np.mean(cell)), float(np.std(cell))])
    grid_features = np.array(grid_stats, dtype=np.float32)

    # 5. Global Geometry: Canny edges summary
    edges = cv2.Canny(gray_norm, 40, 120)
    edge_summary = cv2.resize(edges, (16, 16), interpolation=cv2.INTER_AREA).reshape(-1).astype(np.float32) / 255.0

    return np.concatenate(
        [
            lbp_features,
            gabor_features,
            hog_features.astype(np.float32),
            laplacian_stats,
            grid_features,
            edge_summary,
        ]
    )


def load_model(model_path: Path = DEFAULT_MODEL_PATH) -> Any | None:
    if not model_path.exists():
        return None

    try:
        import joblib
    except ImportError:
        return None

    return joblib.load(model_path)


def predict_stress(image: np.ndarray, model: Any) -> StressPrediction:
    features = extract_features(image).reshape(1, -1)
    label = str(model.predict(features)[0])
    confidence = 1.0
    score = label_to_stress_score(label)

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(features)[0]
        classes = [str(value) for value in model.classes_]
        confidence = float(np.max(probabilities))
        score = float(
            np.sum([label_to_stress_score(class_label) * probability for class_label, probability in zip(classes, probabilities)])
        )

    return StressPrediction(label=label, score=float(np.clip(score, 0.0, 1.0)), confidence=confidence)
