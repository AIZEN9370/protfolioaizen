"""
fetch_contributions.py - Scrape public GitHub contributions without a PAT.

Fetches the public contributions page for the given username, parses the
day cells, and stores results in data/contributions.json including overall
and streak metrics.

Usage:
    python scripts/fetch_contributions.py <username>
"""

import json
import os
import re
import sys
from datetime import date, timedelta

import requests
from bs4 import BeautifulSoup

OUTPUT = os.path.join("data", "contributions.json")
BASE_URL = "https://github.com/users/{username}/contributions"


def fetch_contributions_page(username: str) -> str:
    """Return the HTML of the public contributions page."""
    url = BASE_URL.format(username=username)
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; GitHubProfileBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
    }
    print(f"[fetch_contributions] Fetching {url}")
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_contributions(html: str, username: str) -> dict:
    """Parse day cells from the contributions graph HTML."""
    soup = BeautifulSoup(html, "html.parser")

    # GitHub wraps each day in a <td class="ContributionCalendar-day">
    # with data-date and data-count attributes.
    day_cells = soup.select("td.ContributionCalendar-day")

    days = []
    total = 0
    for cell in day_cells:
        date_str = cell.get("data-date")
        count = int(cell.get("data-count", "0") or 0)
        if not date_str:
            continue
        days.append({"date": date_str, "count": count})
        total += count

    # Compute current streak (consecutive days with count > 0 ending today)
    # and longest streak.
    days_sorted = sorted(days, key=lambda d: d["date"])
    longest_streak = 0
    current_streak = 0
    temp_streak = 0

    today = date.today().isoformat()
    # Build a set of dates with contributions
    contrib_dates = {d["date"] for d in days if d["count"] > 0}

    # Longest streak
    streak = 0
    prev_date = None
    for entry in days_sorted:
        d = date.fromisoformat(entry["date"])
        if entry["count"] > 0:
            if prev_date is None or (d - prev_date).days == 1:
                streak += 1
            else:
                streak = 1
            longest_streak = max(longest_streak, streak)
        else:
            streak = 0
        prev_date = d

    # Current streak: count backwards from today
    current_streak = 0
    cursor = date.today()
    while cursor.isoformat() in contrib_dates:
        current_streak += 1
        cursor -= timedelta(days=1)

    return {
        "username": username,
        "generated_at": date.today().isoformat(),
        "total_contributions": total,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "days": days,
    }


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python scripts/fetch_contributions.py <username>")

    username = sys.argv[1]

    html = fetch_contributions_page(username)
    data = parse_contributions(html, username)

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"[fetch_contributions] Total: {data['total_contributions']}")
    print(f"[fetch_contributions] Current streak: {data['current_streak']}")
    print(f"[fetch_contributions] Longest streak: {data['longest_streak']}")
    print(f"[fetch_contributions] Data saved to: {OUTPUT}")


if __name__ == "__main__":
    main()
