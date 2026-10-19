"""
render_heatmap_svg.py - Render a GitHub-style contribution heatmap SVG.

Reads data/contributions.json (produced by fetch_contributions.py) and draws
a 53-week x 7-day contribution calendar with rounded boxes and standard
GitHub green colors. The graph slide-reveals line-by-line (diagonal,
staggered CSS keyframe transitions) on load.

Output: data/contrib-heatmap.svg

Usage:
    python scripts/render_heatmap_svg.py [input_json]
        input_json defaults to data/contributions.json
"""

import json
import os
import sys
from datetime import date, timedelta

DEFAULT_INPUT = os.path.join("data", "contributions.json")
DEFAULT_OUTPUT = os.path.join("data", "contrib-heatmap.svg")

# Standard GitHub contribution colors (low -> high)
COLORS = ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"]

CELL_SIZE = 10
CELL_GAP = 2
WEEKS = 53
DAYS = 7
TOP_LABEL_GAP = 24


def color_for_count(count: int) -> str:
    """Map a contribution count to a GitHub green."""
    if count == 0:
        return COLORS[0]
    if count <= 3:
        return COLORS[1]
    if count <= 7:
        return COLORS[2]
    if count <= 12:
        return COLORS[3]
    return COLORS[4]


def build_heatmap(data: dict) -> str:
    """Build the SVG heatmap with staggered slide-reveal animation."""
    days_data = data.get("days", [])
    day_map = {d["date"]: d["count"] for d in days_data}

    # Determine the date range: last 53 weeks ending on the most recent date
    if days_data:
        latest = date.fromisoformat(max(day_map.keys()))
    else:
        latest = date.today()

    start_date = latest - timedelta(weeks=WEEKS - 1, days=6)

    # Build grid: weeks x days
    grid = []
    for w in range(WEEKS):
        week = []
        for d in range(DAYS):
            day_date = start_date + timedelta(weeks=w, days=d)
            count = day_map.get(day_date.isoformat(), 0)
            week.append(count)
        grid.append(week)

    # Dimensions
    width = WEEKS * (CELL_SIZE + CELL_GAP) + 80
    height = DAYS * (CELL_SIZE + CELL_GAP) + TOP_LABEL_GAP + 40

    day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    lines = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append('<svg xmlns="http://www.w3.org/2000/svg"')
    lines.append(f'     width="{width}" height="{height}"')
    lines.append('     viewBox="0 0 {} {}"'.format(width, height))
    lines.append('     font-family="Consolas, Menlo, monospace"')
    lines.append('     font-size="11px"')
    lines.append('     fill="#1a1a1a">')

    # CSS keyframes for staggered slide-reveal
    lines.append('  <style>')
    lines.append('    @keyframes slideReveal {')
    lines.append('      0% { opacity: 0; transform: translateY(8px); }')
    lines.append('      100% { opacity: 1; transform: translateY(0); }')
    lines.append('    }')
    lines.append('    .cell {')
    lines.append('      animation: slideReveal 0.3s ease-out forwards;')
    lines.append('      opacity: 0;')
    lines.append('    }')
    lines.append('  </style>')

    # Day name labels (left side)
    for d in range(DAYS):
        y = TOP_LABEL_GAP + d * (CELL_SIZE + CELL_GAP) + CELL_SIZE // 2 + 4
        lines.append(f'  <text x="55" y="{y}" text-anchor="end" fill="#5c6370">{day_names[d]}</text>')

    # Month labels (top)
    # Find first day of each month within range
    month_labels = []
    cursor = start_date.replace(day=1)
    while cursor <= latest:
        month_labels.append((cursor, cursor.strftime("%b")))
        # advance to next month
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)

    for month_date, label in month_labels:
        # Find which week this month starts in
        offset_days = (month_date - start_date).days
        week_idx = offset_days // 7
        if week_idx < 0:
            week_idx = 0
        x = 80 + week_idx * (CELL_SIZE + CELL_GAP) + CELL_SIZE // 2
        lines.append(f'  <text x="{x}" y="16" text-anchor="middle" fill="#5c6370">{label}</text>')

    # Draw cells
    cell_index = 0
    for w in range(WEEKS):
        for d in range(DAYS):
            count = grid[w][d]
            fill = color_for_count(count)
            x = 80 + w * (CELL_SIZE + CELL_GAP)
            y = TOP_LABEL_GAP + d * (CELL_SIZE + CELL_GAP)
            rx = 2  # rounded corners

            # Staggered delay: diagonal wave (week + day) * offset
            delay = (w + d) * 0.015

            lines.append(
                f'  <rect x="{x}" y="{y}" width="{CELL_SIZE}" height="{CELL_SIZE}"'
                f' rx="{rx}" ry="{rx}" fill="{fill}" class="cell"'
                f' style="animation-delay: {delay}s;" />'
            )
            cell_index += 1

    # Legend
    legend_y = height - 20
    lines.append(f'  <text x="80" y="{legend_y}" fill="#5c6370">Legend:</text>')
    for i, c in enumerate(COLORS):
        lx = 80 + 40 + i * 30
        lines.append(f'  <rect x="{lx}" y="{legend_y - 10}" width="10" height="10" fill="{c}" />')
        labels = ["0", "1-3", "4-7", "8-12", "13+"]
        lines.append(f'  <text x="{lx + 12}" y="{legend_y - 2}" fill="#5c6370" font-size="10">{labels[i]}</text>')

    lines.append('</svg>')
    return "\n".join(lines) + "\n"


def main() -> None:
    input_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT
    output_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT

    if not os.path.isfile(input_path):
        raise SystemExit(
            f"[render_heatmap_svg] Input JSON not found: {input_path}\n"
            "Run scripts/fetch_contributions.py first."
        )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"[render_heatmap_svg] Loaded {len(data.get('days', []))} day entries")
    svg = build_heatmap(data)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg)

    print(f"[render_heatmap_svg] SVG saved to: {output_path}")


if __name__ == "__main__":
    main()
