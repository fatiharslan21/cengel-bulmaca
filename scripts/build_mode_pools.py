#!/usr/bin/env python3
"""Build per-mode puzzle pools with clue-level uniqueness across modes.

Creates 4 folders under data/modes/{classic,sprint,zen,hardcore} each with 500 puzzles.
Constraint: no clue text can appear in more than one mode pool.
"""
import json
from pathlib import Path
from collections import defaultdict
import random

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MODES = ["classic", "sprint", "zen", "hardcore"]
LEVELS_PER_MODE = 500
SHUFFLE_SEED = 20260503


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

    rng = random.Random(SHUFFLE_SEED)
    rng.shuffle(puzzles)

    used_clues = set()
    mode_puzzles = defaultdict(list)

    for path, puz in puzzles:
        eligible_modes = [m for m in MODES if len(mode_puzzles[m]) < LEVELS_PER_MODE]
        if not eligible_modes:
            break

        cset = clue_set(puz)
        if cset & used_clues:
            continue

        target_mode = min(eligible_modes, key=lambda m: len(mode_puzzles[m]))
        used_clues |= cset
        mode_puzzles[target_mode].append((path, puz))

    for mode in MODES:
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

    print(f"Done. All mode pools generated with cross-mode clue uniqueness (seed={SHUFFLE_SEED}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
