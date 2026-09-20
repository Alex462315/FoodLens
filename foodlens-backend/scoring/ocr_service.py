"""
FoodLens OCR Service
====================
Preprocessing pipeline + Tesseract OCR extraction.

Steps:
  1. Load image with Pillow
  2. Convert to grayscale (OpenCV)
  3. Boost contrast (CLAHE adaptive histogram equalization)
  4. Binarize (Otsu threshold)
  5. Deskew (find dominant angle via Hough lines, rotate)
  6. Run pytesseract with image_to_data to get per-word confidences
  7. Return raw_text (filtered words) + average confidence

Tesseract binary path is hardcoded for Windows deployment.
Change TESSERACT_CMD to None on Linux/macOS (uses system PATH).
"""

import re
import numpy as np
import cv2
import pytesseract
from PIL import Image
import io

# ── Tesseract binary path (Windows) ──────────────────────────────────────────
# On Linux/macOS, comment this line out and Tesseract on PATH will be used.
TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

# ── Tesseract config ──────────────────────────────────────────────────────────
# PSM 6: Assume a single uniform block of text (ingredient list layout)
# PSM 3 (default) works fine too but PSM 6 tends to be better for dense lists
TESS_CONFIG = "--psm 6 -l eng"

# Confidence threshold below which a word is considered noise
MIN_WORD_CONFIDENCE = 30


def _pil_to_cv2(pil_img: Image.Image) -> np.ndarray:
    """Convert PIL RGB image to OpenCV BGR array."""
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def _cv2_to_pil(cv2_img: np.ndarray) -> Image.Image:
    """Convert OpenCV BGR/Gray array back to PIL."""
    if len(cv2_img.shape) == 2:
        return Image.fromarray(cv2_img)
    return Image.fromarray(cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB))


def _deskew(gray: np.ndarray) -> np.ndarray:
    """
    Detect and correct skew angle using Hough line transform.
    Returns deskewed grayscale image. Falls back to original if angle
    detection is unreliable (e.g. very blurry images).
    """
    try:
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
        if lines is None or len(lines) < 5:
            return gray  # not enough lines to determine angle

        angles = []
        for line in lines:
            rho, theta = line[0]
            # Convert to degrees, centered around 0
            angle = np.degrees(theta) - 90
            if -45 < angle < 45:
                angles.append(angle)

        if not angles:
            return gray

        median_angle = float(np.median(angles))
        # Only correct if skew is meaningful (> 0.5°) and not extreme
        if abs(median_angle) < 0.5 or abs(median_angle) > 40:
            return gray

        h, w = gray.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        deskewed = cv2.warpAffine(
            gray, M, (w, h),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE,
        )
        return deskewed
    except Exception:
        return gray  # deskew is best-effort; never crash on it


def preprocess_image(image_bytes: bytes) -> Image.Image:
    """
    Full preprocessing pipeline for a raw phone photo.

    Returns a PIL image ready for pytesseract.
    """
    # Load
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Resize if very large (speeds up OCR without losing much text detail)
    max_dim = 2400
    w, h = pil_img.size
    if max(w, h) > max_dim:
        scale = max_dim / max(w, h)
        pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    cv_img = _pil_to_cv2(pil_img)

    # 1. Grayscale
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)

    # 2. Adaptive contrast enhancement (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # 3. Deskew
    gray = _deskew(gray)

    # 4. Binarize (Otsu — automatic threshold)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return _cv2_to_pil(binary)


def extract_text_from_image(image_bytes: bytes) -> dict:
    """
    Run full OCR pipeline on raw image bytes.

    Returns:
        {
            "raw_text": str,    # cleaned ingredient text
            "confidence": int,  # 0-100, genuine Tesseract per-word average
        }
    """
    preprocessed = preprocess_image(image_bytes)

    # Get per-word data including confidence scores
    data = pytesseract.image_to_data(
        preprocessed,
        config=TESS_CONFIG,
        output_type=pytesseract.Output.DICT,
    )

    words = []
    confidences = []

    n = len(data["text"])
    for i in range(n):
        word = data["text"][i].strip()
        conf = int(data["conf"][i])

        if conf < 0:
            # conf = -1 means Tesseract returned no confidence (separator row)
            continue
        if not word:
            continue
        if conf >= MIN_WORD_CONFIDENCE:
            words.append(word)
            confidences.append(conf)

    raw_text = " ".join(words)

    # Clean up common OCR noise characters
    raw_text = re.sub(r"[|\\^~`]", "", raw_text)           # common noise glyphs
    raw_text = re.sub(r"\s{2,}", " ", raw_text).strip()    # collapse whitespace

    avg_confidence = int(np.mean(confidences)) if confidences else 0

    return {
        "raw_text": raw_text,
        "confidence": avg_confidence,
    }
