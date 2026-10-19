"""
make_ascii_svg.py - Generate a self-typing monochrome ASCII-portrait SVG.

Reads data/source-prepped.png (produced by prep_photo.py), downscales to a
~100x53 character grid, maps brightness to the ramp ` .`:-=+*cs#%@`, and
emits a self-contained SVG (avi-ascii.svg) whose rows appear one at a time
with horizontal wipes and a blinking cursor using pure SMIL animations.

Usage:
    python scripts/make_ascii_svg.py [input_image]
        input_image defaults to data/source-prepped.png
"""

import os
import sys
import math
from PIL import Image, ImageOps

DEFAULT_INPUT = os.path.join("data", "source-prepped.png")
DEFAULT_OUTPUT = os.path.join("data", "avi-ascii.svg")

# Grid dimensions
COLS = 100
ROWS = 53

# Brightness-to-character ramp (dark -> light)
RAMP = " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@"


def load_and_resize(path: str) -> Image.Image:
    """Load image, convert to grayscale, resize to COLS x ROWS."""
    img = Image.open(path).convert("L")
    img = ImageOps.fit(img, (COLS, ROWS), Image.Resampling.LANCZOS)
    return img


def image_to_ascii_grid(img: Image.Image) -> list[list[str]]:
    """Convert grayscale image to a grid of characters using RAMP."""
    width, height = img.size
    px = img.load()
    grid = []
    ramp_len = len(RAMP)
    for y in range(height):
        row = []
        for x in range(width):
            lum = px[x, y]
            idx = min(ramp_len - 1, int(lum / 256 * ramp_len))
            row.append(RAMP[idx])
        grid.append(row)
    return grid


def esc(s: str) -> str:
    """Escape XML special characters."""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_svg(grid: list[list[str]]) -> str:
    """
    Build an SVG that self-types the ASCII portrait.

    Each row is a <text> element with a monospace font. Rows are staggered
    in time using <set> + <animate> SMIL elements so they appear with a
    horizontal wipe effect. A blinking cursor sits at the end of each row.
    """
    rows = len(grid)
    cols = len(grid[0]) if rows else 0

    # Cell metrics
    char_w = 8   # px per character
    char_h = 14  # px per line
    pad = 20

    svg_w = cols * char_w + pad * 2
    svg_h = rows * char_h + pad * 2

    # Timing
    row_delay = 0.08   # seconds between row appearances
    wipe_dur = 0.35    # seconds for the horizontal wipe
    cursor_dur = 1.0   # cursor blink duration

    lines = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg"')
    lines.append(f'     width="{svg_w}" height="{svg_h}"')
    lines.append(f'     viewBox="0 0 {svg_w} {svg_h}"')
    lines.append('     font-family="Consolas, Menlo, monospace"')
    lines.append('     font-size="14px"')
    lines.append('     fill="#1a1a1a">')

    # Background rect (optional: transparent)
    lines.append(f'  <rect width="{svg_w}" height="{svg_h}" fill="none" />')

    # Render rows
    for r, row_chars in enumerate(grid):
        text_str = "".join(row_chars).rstrip()
        if not text_str.strip():
            continue

        x = pad
        y = pad + (r + 1) * char_h - 4  # baseline adjustment
        row_start = r * row_delay

        # Container group for this row (handles wipe timing)
        lines.append(f'  <g id="row-{r}">')

        # Hide group until its start time, then wipe in
        # <set> hides initially; <animate> reveals via stroke-dashoffset-like
        # approach using clip-path width animation for the horizontal wipe.
        clip_id = f"clip-row-{r}"
        lines.append(f'    <clipPath id="{clip_id}">')
        lines.append(f'      <rect id="clip-rect-{r}" x="{x}" y="{y - char_h + 4}"'
                   f' width="0" height="{char_h}" />')
        lines.append(f'    </clipPath>')

        # The text, clipped by the growing rect
        lines.append(f'    <text x="{x}" y="{y}" clip-path="url(#{clip_id})">')
        lines.append(f'      {esc(text_str)}')
        lines.append(f'    </text>')

        # Animate clip rect width from 0 to full text width (horizontal wipe)
        text_w = len(text_str) * char_w
        lines.append(f'    <animate attributeName="width"')
        lines.append(f'                   attributeType="XML"')
        lines.append(f'                   begin="{row_start}s"')
        lines.append(f'                   dur="{wipe_dur}s"')
        lines.append(f'                   from="0" to="{text_w}"')
        lines.append(f'                   fill="freeze" />')

        # Blinking cursor at end of row
        cursor_x = x + text_w + 2
        lines.append(f'    <text x="{cursor_x}" y="{y}" fill="#1a1a1a">')
        lines.append(f'      _')
        lines.append(f'    </text>')
        lines.append(f'    <animate attributeName="opacity"')
        lines.append(f'                   begin="{row_start + wipe_dur}s"')
        lines.append(f'                   dur="{cursor_dur}s"')
        lines.append(f'                   values="1;0;1"')
        lines.append(f'                   repeatCount="indefinite" />')

        lines.append(f'  </g>')

    lines.append('</svg>')
    return "\n".join(lines) + "\n"


def main() -> None:
    input_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT
    output_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT

    if not os.path.isfile(input_path):
        raise SystemExit(
            f"[make_ascii_svg] Input image not found: {input_path}\n"
            "Run scripts/prep_photo.py first to generate data/source-prepped.png."
        )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"[make_ascii_svg] Loading image: {input_path}")
    img = load_and_resize(input_path)

    print("[make_ascii_svg] Converting to ASCII grid...")
    grid = image_to_ascii_grid(img)

    print(f"[make_ascii_svg] Building SVG ({COLS}x{ROWS})...")
    svg = build_svg(grid)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg)

    print(f"[make_ascii_svg] SVG saved to: {output_path}")


if __name__ == "__main__":
    main()
