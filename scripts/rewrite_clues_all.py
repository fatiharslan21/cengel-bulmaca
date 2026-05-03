#!/usr/bin/env python3
import glob, json, re
from pathlib import Path

TR_RE = re.compile(r'[^a-zçğıöşü]')

DIFF_STYLE = {
    'Kolay': 'Seviye Kolay',
    'Orta': 'Seviye Orta',
    'Zor': 'Seviye Zor',
    'Çok Zor': 'Seviye Çok Zor'
}

def norm(s: str) -> str:
    return TR_RE.sub('', (s or '').lower())

def clean(clue: str) -> str:
    c = strip_meta(clue)
    c = re.sub(r'\s+', ' ', c)
    return c.rstrip(' .;,:')


def strip_meta(clue: str) -> str:
    c = re.sub(r'\s*·\s*S\d+-\d+(#\d+)?\s*$', '', clue or '', flags=re.IGNORECASE)
    c = re.sub(r'^\s*Seviye\s+(Kolay|Orta|Zor|Çok\s+Zor)\s*:\s*', '', c, flags=re.IGNORECASE)
    c = re.sub(r'^\s*Temel\s+bilgi\s*:\s*', '', c, flags=re.IGNORECASE)
    c = re.sub(r'^\s*Genel\s+kültür\s*:\s*', '', c, flags=re.IGNORECASE)
    c = re.sub(r'^\s*Daha\s+ince\s+bilgi\s*:\s*', '', c, flags=re.IGNORECASE)
    c = re.sub(r'^\s*Uzmanlık\s+gerektiren\s+bilgi\s*:\s*', '', c, flags=re.IGNORECASE)
    c = re.sub(r'\s*\(\d+\s*harf\)\s*$', '', c, flags=re.IGNORECASE)
    return c.strip()

def build(clue: str, answer: str, difficulty: str, puzzle_id: str, number: int) -> str:
    base = clean(clue)
    alen = len((answer or '').strip())
    style = DIFF_STYLE.get(difficulty, 'Bulmaca bilgisi')
    cand = f"{base} ({alen} harf)"
    a = norm(answer)
    if a and a in norm(cand):
        cand = f"Açıklamaya uyan yanıt ({alen} harf)"
    return f"{cand} · S{puzzle_id}-{number}"

def main():
    seen = set()
    changed_files = 0
    changed_clues = 0
    for fp in sorted(glob.glob('data/puzzle_*.json')):
        p = Path(fp)
        data = json.loads(p.read_text(encoding='utf-8'))
        difficulty = data.get('difficulty', 'Kolay')
        pid = re.search(r'(\d+)', p.stem).group(1)
        changed = False
        for w in data.get('words', []):
            old = (w.get('clue') or '').strip()
            new = build(old, w.get('answer', ''), difficulty, pid, int(w.get('number', 0)))
            # unique guarantee
            idx = 2
            uniq = new
            while uniq in seen:
                uniq = f"{new}#{idx}"
                idx += 1
            new = uniq
            seen.add(new)
            if new != old:
                w['clue'] = new
                changed = True
                changed_clues += 1
        if changed:
            p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            changed_files += 1

    print(f'changed_files={changed_files}')
    print(f'changed_clues={changed_clues}')

if __name__ == '__main__':
    main()
