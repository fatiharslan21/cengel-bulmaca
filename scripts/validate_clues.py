#!/usr/bin/env python3
import glob
import json
import re
from collections import Counter

TR_RE = re.compile(r'[^a-zçğıöşü]')

def norm(s: str) -> str:
    return TR_RE.sub('', (s or '').lower())

bad_contains = []
short_clues = []
repeated = Counter()

for path in sorted(glob.glob('data/puzzle_*.json')):
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    for w in data.get('words', []):
        clue = w.get('clue', '')
        ans = w.get('answer', '')
        c = norm(clue)
        a = norm(ans)
        repeated[clue.strip()] += 1
        if a and a in c:
            bad_contains.append((path, w.get('number'), clue, ans))
        if len(clue.strip()) < 8:
            short_clues.append((path, w.get('number'), clue, ans))

print('answer_in_clue:', len(bad_contains))
print('too_short_clues(<8):', len(short_clues))
print('top_repeated_clues:')
for clue, cnt in repeated.most_common(10):
    print(f'  {cnt:>4}x | {clue}')

if bad_contains:
    print('\nExamples answer_in_clue:')
    for row in bad_contains[:20]:
        print(' ', row)
