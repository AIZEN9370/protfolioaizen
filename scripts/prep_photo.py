"""
prep_photo.py - Prepare a personal photograph for ASCII art generation.

Pipeline:
  1. Remove background using rembg (RMBG model).
  2. Boost local contrast using OpenCV CLAHE so facial details pop.
  3. Composite onto pure white background.
  4. Save result as data/source-prepped.png

Usage:
    python scripts/prep_photo.py [input_image]
        input_image defaults to 'data/profile-photo.jpg' if not provided.
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image

# Path to the rembg output (background removed)
RMBG_OUTPUT = os.path.join("data", "profile-nobg.png")
# Final prepped image saved here
OUTPUT_PATH = os.path.join("data", "source-prepped.png")

# Default input photo path (override via CLI arg)
DEFAULT_INPUT = os.path.join("data", "profile-photo.jpg")


def remove_background(input_path: str, output_path: str) -> None:
    """Strip the background from input_path using rembg, save PNG with alpha."""
    try:
        from rembg import remove
    except ImportError:
        raise SystemExit(
            "rembg is not installed. Run: pip install -r scripts/requirements.txt"
        )

    print(f"[prep_photo] Removing background from: {input_path}")
    with open(input_path, "rb") as f:
        input_data = f.read()

    output_data = remove(input_data)

    with open(output_path, "wb") as f:
        f.write(output_data)

    print(f"[prep_photo] Background-removed image saved to: {output_path}")


def clahe_enhance(input_path: str, output_path: str) -> None:
    """
    Load the background-removed image, apply CLAHE to the L channel in LAB
    space to boost local contrast, then composite onto pure white using the
    alpha channel as a mask. Save as RGB PNG.
    """
    print(f"[prep_photo] Enhancing contrast and compositing onto white: {input_path}")

    # Read PNG with alpha channel
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f"[prep_photo] Could not read image: {input_path}")

    if img.shape[2] != 4:
        # No alpha channel: convert BGR -> BGRA with full alpha
        bgr = img
        alpha = np.full((bgr.shape[0], bgr.shape[1], 1), 255, dtype=np.uint8)
        img = np.dstack([bgr, alpha])

    b, g, r, a = cv2.split(img)

    # Build LAB image from BGR channels
    bgr = cv2.merge([b, g, r])
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l, lab_a, lab_b = cv2.split(lab)

    # Apply CLAHE to the luminance channel
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l_clahe = clahe.apply(l)

    # Merge back and convert to BGR
    lab_clahe = cv2.merge([l_clahe, lab_a, lab_b])
    bgr_enhanced = cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2BGR)

    # Composite onto pure white using alpha mask
    alpha_norm = a.astype(np.float32) / 255.0
    white = np.full_like(bgr_enhanced, 255, dtype=np.float32)
    bgr_float = bgr_enhanced.astype(np.float32)

    composite = bgr_float * alpha_norm[..., None] + white * (1.0 - alpha_norm[..., None])
    composite = np.clip(composite, 0, 255).astype(np.uint8)

    # Save as RGB PNG (no alpha needed since background is white)
    pil_img = Image.fromarray(cv2.cvtColor(composite, cv2.COLOR_BGR2RGB))
    pil_img.save(output_path)

    print(f"[prep_photo] Prepped image saved to: {output_path}")


def main() -> None:
    input_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT

    if not os.path.isfile(input_path):
        raise SystemExit(f"[prep_photo] Input image not found: {input_path}\n"
                         "Place your photo at data/profile-photo.jpg or pass a path.")

    os.makedirs("data", exist_ok=True)

    remove_background(input_path, RMBG_OUTPUT)
    clahe_enhance(RMBG_OUTPUT, OUTPUT_PATH)


if __name__ == "__main__":
    main()
