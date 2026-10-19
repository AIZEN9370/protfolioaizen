"""
make_info_card.py - Render a self-contained neofetch-style terminal info card SVG.

Produces info-card.svg with slide/fade-in line-by-line CSS keyframe animations.
Set STATIC=1 in the environment to emit a non-animated preview.

Usage:
    STATIC=1 python scripts/make_info_card.py   # static preview
    python scripts/make_info_card.py            # animated version
"""

import os
import sys

OUTPUT = os.path.join("data", "info-card.svg")

# Card content
TITLE = "neofetch"
USER_HOST = "avi@github"
SEPARATOR = "-------------------------"

INFO_LINES = [
    ("OS", "GitHub Actions Ubuntu-latest x86_64"),
    ("Host", "GitHub Actions Runner"),
    ("Kernel", "5.15.0-1027-generic"),
    ("Uptime", "2 days, 4 hours, 12 minutes"),
    ("Packages", "1247 (apt), 89 (pip)"),
    ("Shell", "bash 5.2.15"),
    ("Terminal", "/dev/pts/0"),
    ("CPU", "Intel(R) Xeon(R) Platinum 8375C"),
    ("GPU", "Microsoft Basic Render Driver"),
    ("Memory", "2560MiB / 7580MiB"),
]

ROLE = "Software Engineer & Open Source Contributor"
STACK = "Python  TypeScript  Go  Rust  React  GitHub Actions"
STATS = [
    ("Commits", "12,403"),
    ("Repositories", "89"),
    ("Contributions", "2,147"),
    ("Pull Requests", "312"),
]


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_static() -> str:
    lines = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append('<svg xmlns="http://www.w3.org/2000/svg"')
    lines.append('     width="460" height="420"')
    lines.append('     viewBox="0 0 460 420"')
    lines.append('     font-family="Consolas, Menlo, monospace"')
    lines.append('     font-size="14px"')
    lines.append('     fill="#e0e0e0">')

    # Terminal window background
    lines.append('  <rect width="460" height="420" fill="#1e1e1e" rx="6" />')
    lines.append('  <rect x="10" y="10" width="440" height="28" fill="#2d2d2d" rx="4" />')
    lines.append('  <circle cx="18" cy="24" r="3" fill="#ff5f56" />')
    lines.append('  <circle cx="30" cy="24" r="3" fill="#ffbd2e" />')
    lines.append('  <circle cx="42" cy="24" r="3" fill="#27c93f" />')

    # Header
    lines.append(f'  <text x="70" y="32" fill="#569cd6" font-weight="bold">{esc(USER_HOST)}</text>')
    lines.append(f'  <text x="70" y="50" fill="#c678dd">{esc(TITLE)}</text>')
    lines.append(f'  <text x="70" y="66" fill="#5c6370">{esc(SEPARATOR)}</text>')

    # Info block
    yy = 92
    for label, value in INFO_LINES:
        lines.append(f'  <text x="70" y="{yy}" fill="#d19a66">{esc(label)}:</text>')
        lines.append(f'  <text x="140" y="{yy}" fill="#e0e0e0">{esc(value)}</text>')
        yy += 22

    yy += 10
    # Role
    lines.append(f'  <text x="70" y="{yy}" fill="#569cd6" font-weight="bold">{esc(ROLE)}</text>')
    yy += 24
    # Stack
    lines.append(f'  <text x="70" y="{yy}" fill="#98c379">{esc(STACK)}</text>')
    yy += 30

    # Stats block
    for label, value in STATS:
        lines.append(f'  <text x="70" y="{yy}" fill="#d19a66">{esc(label)}:</text>')
        lines.append(f'  <text x="160" y="{yy}" fill="#e0e0e0">{esc(value)}</text>')
        yy += 22

    lines.append('</svg>')
    return "\n".join(lines) + "\n"


def build_animated() -> str:
    """Animated version with CSS keyframe line-by-line slide/fade-in."""
    css = """
    <style>
      @keyframes slideIn {
        0% { opacity: 0; transform: translateX(-20px); }
        100% { opacity: 1; transform: translateX(0); }
      }
      .line {
        animation: slideIn 0.4s ease-out forwards;
        opacity: 0;
      }
    </style>
    """

    lines = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append('<svg xmlns="http://www.w3.org/2000/svg"')
    lines.append('     width="460" height="420"')
    lines.append('     viewBox="0 0 460 420"')
    lines.append('     font-family="Consolas, Menlo, monospace"')
    lines.append('     font-size="14px"')
    lines.append('     fill="#e0e0e0">')

    lines.append(css)

    # Terminal window background
    lines.append('  <rect width="460" height="420" fill="#1e1e1e" rx="6" class="line" style="animation-delay: 0.0s;" />')
    lines.append('  <rect x="10" y="10" width="440" height="28" fill="#2d2d2d" rx="4" class="line" style="animation-delay: 0.05s;" />')
    lines.append('  <circle cx="18" cy="24" r="3" fill="#ff5f56" class="line" style="animation-delay: 0.1s;" />')
    lines.append('  <circle cx="30" cy="24" r="3" fill="#ffbd2e" class="line" style="animation-delay: 0.12s;" />')
    lines.append('  <circle cx="42" cy="24" r="3" fill="#27c93f" class="line" style="animation-delay: 0.14s;" />')

    # Header
    lines.append(f'  <text x="70" y="32" fill="#569cd6" font-weight="bold" class="line" style="animation-delay: 0.2s;">{esc(USER_HOST)}</text>')
    lines.append(f'  <text x="70" y="50" fill="#c678dd" class="line" style="animation-delay: 0.25s;">{esc(TITLE)}</text>')
    lines.append(f'  <text x="70" y="66" fill="#5c6370" class="line" style="animation-delay: 0.3s;">{esc(SEPARATOR)}</text>')

    # Info block
    yy = 92
    for i, (label, value) in enumerate(INFO_LINES):
        delay = 0.35 + i * 0.06
        lines.append(f'  <text x="70" y="{yy}" fill="#d19a66" class="line" style="animation-delay: {delay}s;">{esc(label)}:</text>')
        lines.append(f'  <text x="140" y="{yy}" fill="#e0e0e0" class="line" style="animation-delay: {delay + 0.02}s;">{esc(value)}</text>')
        yy += 22

    yy += 10
    # Role
    lines.append(f'  <text x="70" y="{yy}" fill="#569cd6" font-weight="bold" class="line" style="animation-delay: 1.1s;">{esc(ROLE)}</text>')
    yy += 24
    # Stack
    lines.append(f'  <text x="70" y="{yy}" fill="#98c379" class="line" style="animation-delay: 1.15s;">{esc(STACK)}</text>')
    yy += 30

    # Stats block
    for i, (label, value) in enumerate(STATS):
        delay = 1.25 + i * 0.06
        lines.append(f'  <text x="70" y="{yy}" fill="#d19a66" class="line" style="animation-delay: {delay}s;">{esc(label)}:</text>')
        lines.append(f'  <text x="160" y="{yy}" fill="#e0e0e0" class="line" style="animation-delay: {delay + 0.02}s;">{esc(value)}</text>')
        yy += 22

    lines.append('</svg>')
    return "\n".join(lines) + "\n"


def main() -> None:
    static = os.environ.get("STATIC", "0") == "1"

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    if static:
        print("[make_info_card] Generating STATIC preview...")
        svg = build_static()
    else:
        print("[make_info_card] Generating animated version...")
        svg = build_animated()

    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(svg)

    print(f"[make_info_card] SVG saved to: {OUTPUT}")


if __name__ == "__main__":
    main()
