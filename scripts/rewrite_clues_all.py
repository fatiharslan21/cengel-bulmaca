#!/usr/bin/env python3
import glob, json, re, hashlib
from pathlib import Path

TR_RE = re.compile(r'[^a-zçğıöşü]')

def norm(s: str) -> str:
    return TR_RE.sub('', (s or '').lower())


def simplify_base(clue: str) -> str:
    c = (clue or '').strip()
    if ',' in c:
        parts = [p.strip() for p in c.split(',') if p.strip()]
        if len(parts) >= 2:
            return f"{parts[0]} ya da {parts[1]}"
    return c


def candidate_templates(base: str):
    return [
        f"{base} anlamına gelen sözcük",
        f"Günlük dilde {base} olarak bilinen kavram",
        f"{base} karşılığı olarak kullanılan kelime",
        f"Bulmacada {base} karşılığını veren yanıt",
        f"{base} için kullanılan yaygın ifade"
    ]


def improve(clue: str, answer: str) -> str:
    clue = (clue or '').strip()
    if not clue:
        return clue

    # Zaten yeterince açıklayıcıysa bırak
    words = [w for w in re.split(r'\s+', clue) if w]
    if len(clue) >= 24 and len(words) >= 4:
        return clue

    base = simplify_base(clue)
    cands = candidate_templates(base)

    # deterministik sıra (aynı clue farklı bulmacalarda aynı kalsın)
    seed = int(hashlib.md5(base.encode('utf-8')).hexdigest(), 16)
    offset = seed % len(cands)
    ordered = cands[offset:] + cands[:offset]

    a = norm(answer)
    for cand in ordered:
        if a and a in norm(cand):
            continue
        if len(cand) <= len(clue):
            continue
        return cand

    return clue


def main():
    changed_files = 0
    changed_clues = 0
    for fp in sorted(glob.glob('data/puzzle_*.json')):
        p = Path(fp)
        data = json.loads(p.read_text(encoding='utf-8'))
        changed = False
        for w in data.get('words', []):
            old = (w.get('clue') or '').strip()
            new = improve(old, w.get('answer', ''))
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
