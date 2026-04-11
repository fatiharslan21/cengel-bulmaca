"""
Yeni Çok Zor bölüm ekle.
Kullanım: python add_level.py [adet]
Varsayılan: 1 bölüm ekler.
Mevcut bulmacaların sonrasına ekler, hep "Çok Zor" seviyesinde.
"""
import sys, os, glob, json, random

# generate_puzzles.py'den import
sys.path.insert(0, os.path.dirname(__file__))
from generate_puzzles import Builder, WORDS, VALID

DATA = os.path.join(os.path.dirname(__file__), "static", "data")

def get_next_id():
    files = glob.glob(os.path.join(DATA, "puzzle_*.json"))
    if not files:
        return 1
    ids = []
    for f in files:
        base = os.path.basename(f)
        num = int(base.replace("puzzle_","").replace(".json",""))
        ids.append(num)
    return max(ids) + 1

def add_levels(count=1):
    pool = [(w, c) for w, c in WORDS if all(ch in VALID for ch in w) and 4 <= len(w) <= 10]
    seen = set()
    clean = []
    for w, c in pool:
        if w not in seen:
            clean.append((w, c))
            seen.add(w)
    pool = clean
    
    next_id = get_next_id()
    
    for i in range(count):
        pid = next_id + i
        random.seed(pid * 31 + 7)
        random.shuffle(pool)
        
        b = Builder(21)
        placed = b.build(pool[:80], target=20)
        
        data = b.to_json(pid, f"Bölüm {pid}", "Çok Zor")
        if data:
            fname = os.path.join(DATA, f"puzzle_{pid:03d}.json")
            with open(fname, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  ✅ Bölüm {pid} eklendi ({len(data['words'])} kelime, {data['grid_size_r']}x{data['grid_size_c']})")
        else:
            print(f"  ❌ Bölüm {pid} oluşturulamadı")

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    print(f"Yeni {count} Çok Zor bölüm ekleniyor...\n")
    add_levels(count)
    total = len(glob.glob(os.path.join(DATA, "puzzle_*.json")))
    print(f"\nToplam bölüm sayısı: {total}")
