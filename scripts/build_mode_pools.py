#!/usr/bin/env python3
"""Build per-mode puzzle pools with clue-level uniqueness across modes.

Creates 4 folders under data/modes/{classic,sprint,zen,hardcore} each with 500 puzzles.
Constraint: no clue text can appear in more than one mode pool.
"""
import json
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MODES = ["classic", "sprint", "zen", "hardcore"]
LEVELS_PER_MODE = 500


def load_base_puzzles():
    puzzles = []
    for p in sorted(DATA.glob("puzzle_*.json")):
        if "modes" in p.parts:
            continue
        try:
            puzzles.append((p, json.loads(p.read_text(encoding="utf-8"))))
        except Exception:
            pass
    return puzzles


def clue_set(puz):
    return {str(w.get("clue", "")).strip() for w in puz.get("words", []) if str(w.get("clue", "")).strip()}


def main():
    puzzles = load_base_puzzles()
    if len(puzzles) < LEVELS_PER_MODE * len(MODES):
        print(f"ERROR: Need at least {LEVELS_PER_MODE * len(MODES)} base puzzles, found {len(puzzles)}")
        print("Tip: add more source puzzles before generating fully unique 4x500 mode pools.")
        return 1

    used_clues = set()
    mode_puzzles = defaultdict(list)
    idx = 0

    for mode in MODES:
        while len(mode_puzzles[mode]) < LEVELS_PER_MODE and idx < len(puzzles):
            path, puz = puzzles[idx]
            idx += 1
            cset = clue_set(puz)
            if cset & used_clues:
                continue
            used_clues |= cset
            mode_puzzles[mode].append((path, puz))

        if len(mode_puzzles[mode]) < LEVELS_PER_MODE:
            print(f"ERROR: Could not fill mode '{mode}' with {LEVELS_PER_MODE} clue-unique puzzles.")
            print(f"Filled: {len(mode_puzzles[mode])}")
            return 2

    for mode in MODES:
        out = DATA / "modes" / mode
        out.mkdir(parents=True, exist_ok=True)
        for i, (_, puz) in enumerate(mode_puzzles[mode], start=1):
            (out / f"puzzle_{i:03d}.json").write_text(json.dumps(puz, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{mode}: wrote {len(mode_puzzles[mode])} puzzles")

    print("Done. All mode pools generated with cross-mode clue uniqueness.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
