/* ─────────────────────────────────────────────
   Çengel Bulmaca — İsim-bazlı kimlik + bulut senkronizasyonu
   ------------------------------------------------------------
   Kullanıcı kimliği = normalize edilmiş ad (küçük harf, aksansız).
   Aynı isim → aynı profil (farklı cihazlardan bile).
   İsim değişirse yerel skorlar sıfırlanır, yeni isim için bulutta
   kayıt varsa geri yüklenir.

   Not (Firestore Rules): users koleksiyonu için:
     match /users/{userId} {
       allow read: if request.auth != null;
       allow write: if request.auth != null;  // isim-bazlı anahtar
     }
   ───────────────────────────────────────────── */
(function(){
    const STORE_USER = 'cb_user';
    const STORE_SCORES = 'cb_scores_local';
    const STORE_SETTINGS = 'cb_settings';
    const STORE_CB = 'cb';
    const STORE_DAILY = 'cb_daily';

    const firebaseConfig = window.CB_FIREBASE_CONFIG || window.firebaseConfig || null;

    let app, auth, db;
    let currentUser = null;
    let firebaseReady = false;
    let initPromise = null;

    const listeners = new Set();
    const notify = () => listeners.forEach(fn => { try { fn(currentUser); } catch(e){} });

    function normalizeName(name) {
        return (name || '').trim().toLowerCase()
            .normalize('NFD').replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40);
    }

    function saveUserLocal(user) {
        if(user) {
            const data = {
                uid: user.key || user.uid || ('local_' + Date.now()),
                key: user.key,
                name: (user.name || '').trim() || 'Misafir',
                createdAt: user.createdAt || Date.now()
            };
            localStorage.setItem(STORE_USER, JSON.stringify(data));
            currentUser = data;
        } else {
            localStorage.removeItem(STORE_USER);
            currentUser = null;
        }
        notify();
    }

    function loadUserLocal() {
        try {
            const raw = localStorage.getItem(STORE_USER);
            if(raw) currentUser = JSON.parse(raw);
        } catch(e) {}
    }

    function clearLocalScores() {
        localStorage.removeItem(STORE_CB);
        localStorage.removeItem(STORE_DAILY);
        localStorage.removeItem(STORE_SCORES);
    }

    async function initFirebase() {
        if(!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('YOUR_')) return false;
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js');
            const { getAuth, signInAnonymously, onAuthStateChanged } =
                await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js');
            const { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp } =
                await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');

            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);

            window._cbFB = { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp };

            try { await signInAnonymously(auth); }
            catch(e) {
                console.warn('[Çengel] Anonim giriş başarısız:', e.message);
                return false;
            }
            await new Promise((resolve) => {
                onAuthStateChanged(auth, () => resolve());
            });

            firebaseReady = true;
            return true;
        } catch(err) {
            console.warn('[Çengel] Firebase init hatası:', err.message);
            return false;
        }
    }

    // Buluttan kullanıcı verisini yerel localStorage'a yükle
    async function loadUserFromCloud(key) {
        if(!firebaseReady || !key) return false;
        try {
            const { doc, getDoc } = window._cbFB;
            const ref = doc(db, 'users', key);
            const snap = await getDoc(ref);
            if(!snap.exists()) return false;
            const d = snap.data();

            const puzzles = d.puzzles || {};
            const cb = {};
            const local = {};
            for(const [id, data] of Object.entries(puzzles)) {
                cb[id] = { s: data.score, t: data.time, h: data.hints };
                local[id] = data;
            }
            if(Object.keys(cb).length) {
                localStorage.setItem(STORE_CB, JSON.stringify(cb));
                localStorage.setItem(STORE_SCORES, JSON.stringify(local));
            }

            const daily = d.daily || {};
            const cbDaily = {};
            for(const [dateKey, data] of Object.entries(daily)) {
                cbDaily[dateKey] = { s: data.score, t: data.time, h: data.hints, id: data.id };
            }
            if(Object.keys(cbDaily).length) {
                localStorage.setItem(STORE_DAILY, JSON.stringify(cbDaily));
            }
            return true;
        } catch(e) {
            console.warn('Bulut okuma hatası:', e);
            return false;
        }
    }

    async function setName(name) {
        const clean = (name || '').trim();
        if(!clean) return { ok: false };
        const newKey = normalizeName(clean);
        if(!newKey) return { ok: false };

        // Firebase başlatılıyorsa bekle (buluttaki kayıt eksiksiz yüklensin)
        if(initPromise) { try { await initPromise; } catch(e){} }

        const prevKey = currentUser?.key;
        const sameUser = prevKey === newKey;

        if(!sameUser) {
            // Farklı kullanıcıya geçiş — yerel skorları temizle
            clearLocalScores();
            // Bulutta bu isimle kayıt varsa yükle
            if(firebaseReady) {
                await loadUserFromCloud(newKey);
            }
        }

        saveUserLocal({
            key: newKey,
            name: clean,
            createdAt: sameUser ? currentUser?.createdAt : Date.now()
        });

        if(firebaseReady) await syncUserMetaToCloud();
        return { ok: true, changed: !sameUser };
    }

    async function syncUserMetaToCloud() {
        if(!firebaseReady || !currentUser?.key) return;
        try {
            const { doc, setDoc, serverTimestamp } = window._cbFB;
            const ref = doc(db, 'users', currentUser.key);
            await setDoc(ref, {
                name: currentUser.name,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch(e) { console.warn('Meta sync hatası:', e); }
    }

    async function saveScore(puzzleId, score, time, hints, difficulty, dailyKey = null) {
        const entry = {
            score: score|0,
            time: time|0,
            hints: hints|0,
            difficulty: difficulty || 'Kolay',
            completedAt: Date.now()
        };

        const all = JSON.parse(localStorage.getItem(STORE_SCORES) || '{}');
        if(!all[puzzleId] || all[puzzleId].score < score) {
            all[puzzleId] = entry;
            localStorage.setItem(STORE_SCORES, JSON.stringify(all));
        }

        if(!firebaseReady || !currentUser?.key) return;
        try {
            const { doc, setDoc, getDoc, serverTimestamp } = window._cbFB;
            const ref = doc(db, 'users', currentUser.key);
            const snap = await getDoc(ref);
            const existing = snap.exists() ? snap.data() : {};
            const puzzles = existing.puzzles || {};
            const daily = existing.daily || {};

            let changed = false;
            if(!puzzles[puzzleId] || puzzles[puzzleId].score < score) {
                puzzles[puzzleId] = entry;
                changed = true;
            }
            if(dailyKey && (!daily[dailyKey] || daily[dailyKey].score < score)) {
                daily[dailyKey] = { ...entry, id: puzzleId };
                changed = true;
            }
            if(!changed) return;

            const totalScore = Object.values(puzzles).reduce((s, x) => s + (x.score || 0), 0);
            await setDoc(ref, {
                name: currentUser.name,
                puzzles, daily,
                totalScore,
                completedCount: Object.keys(puzzles).length,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch(e) { console.warn('Skor bulut kaydı hatası:', e); }
    }

    async function syncLocalScoresToCloud() {
        if(!firebaseReady || !currentUser?.key) return;
        try {
            const oldScores = JSON.parse(localStorage.getItem(STORE_CB) || '{}');
            const newScores = JSON.parse(localStorage.getItem(STORE_SCORES) || '{}');
            const localDaily = JSON.parse(localStorage.getItem(STORE_DAILY) || '{}');

            const merged = {};
            for(const [id, d] of Object.entries({ ...oldScores, ...newScores })) {
                merged[id] = {
                    score: d.s || d.score || 0,
                    time: d.t || d.time || 0,
                    hints: d.h || d.hints || 0,
                    difficulty: d.difficulty || 'Kolay'
                };
            }
            if(Object.keys(merged).length === 0 && Object.keys(localDaily).length === 0) return;

            const { doc, setDoc, getDoc, serverTimestamp } = window._cbFB;
            const ref = doc(db, 'users', currentUser.key);
            const snap = await getDoc(ref);
            const existing = snap.exists() ? snap.data() : {};
            const puzzles = existing.puzzles || {};
            const daily = existing.daily || {};

            let changed = false;
            for(const [id, data] of Object.entries(merged)) {
                if(!puzzles[id] || puzzles[id].score < data.score) {
                    puzzles[id] = data; changed = true;
                }
            }
            for(const [k, d] of Object.entries(localDaily)) {
                const data = { score: d.s || 0, time: d.t || 0, hints: d.h || 0, id: d.id };
                if(!daily[k] || daily[k].score < data.score) {
                    daily[k] = data; changed = true;
                }
            }
            if(!changed) return;

            const totalScore = Object.values(puzzles).reduce((s, x) => s + (x.score || 0), 0);
            await setDoc(ref, {
                name: currentUser.name,
                puzzles, daily,
                totalScore,
                completedCount: Object.keys(puzzles).length,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch(e) { console.warn('Toplu sync hatası:', e); }
    }

    async function getLeaderboard(topN = 50) {
        if(firebaseReady) {
            try {
                const { collection, query, orderBy, limit, getDocs } = window._cbFB;
                const q = query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(topN));
                const snap = await getDocs(q);
                const list = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    if(!d.name) return;
                    list.push({
                        uid: doc.id,
                        name: d.name,
                        totalScore: d.totalScore || 0,
                        completedCount: d.completedCount || 0
                    });
                });
                return list;
            } catch(e) { console.warn('LB hata:', e); }
        }
        return localLeaderboard();
    }

    function localLeaderboard() {
        const user = currentUser || { uid: 'guest', name: 'Sen' };
        const oldScores = JSON.parse(localStorage.getItem(STORE_CB) || '{}');
        const newScores = JSON.parse(localStorage.getItem(STORE_SCORES) || '{}');
        const merged = { ...oldScores, ...newScores };
        const total = Object.values(merged).reduce((s, x) => s + (x.s || x.score || 0), 0);
        const count = Object.keys(merged).length;
        return [{ uid: user.uid, name: user.name, totalScore: total, completedCount: count }];
    }

    function maskName(name) {
        if(!name) return '•••';
        const trimmed = name.trim();
        if(trimmed.length <= 1) return trimmed;
        return trimmed[0].toUpperCase() + '•'.repeat(Math.min(trimmed.length - 1, 6));
    }

    function onAuthChange(fn) {
        listeners.add(fn);
        fn(currentUser);
        return () => listeners.delete(fn);
    }

    function getSettings() {
        try { return JSON.parse(localStorage.getItem(STORE_SETTINGS) || '{}'); } catch(e) { return {}; }
    }
    function setSetting(key, val) {
        const s = getSettings();
        s[key] = val;
        localStorage.setItem(STORE_SETTINGS, JSON.stringify(s));
    }

    // Başlat
    loadUserLocal();

    // Eski kullanıcı verisi varsa ama key yoksa normalize et (geriye dönük uyum)
    if(currentUser && !currentUser.key && currentUser.name) {
        currentUser.key = normalizeName(currentUser.name);
        saveUserLocal(currentUser);
    }

    initPromise = initFirebase().then(async ready => {
        if(!ready) { console.info('[Çengel] Firebase yok/kapalı — skorlar sadece yerel.'); return; }
        if(currentUser?.key) {
            await loadUserFromCloud(currentUser.key);
            await syncLocalScoresToCloud();
            // Buluttan yüklenen skorlar yerele yansıdı — UI dinliyorsa güncellesin
            window.dispatchEvent(new CustomEvent('cbScoresSynced'));
        }
    });

    window.CBAuth = {
        setName,
        signOut: () => { saveUserLocal(null); clearLocalScores(); },
        getUser: () => currentUser,
        saveScore,
        getLeaderboard,
        maskName,
        onAuthChange,
        getSettings,
        setSetting,
        isFirebaseReady: () => firebaseReady,
        normalizeName
    };
})();
