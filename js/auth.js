/* ─────────────────────────────────────────────
   Çengel Bulmaca — Kullanıcı + Scoreboard Motoru
   İsim-bazlı giriş. Firebase (Anonymous Auth + Firestore) varsa
   skorlar buluta yazılır. Yoksa localStorage'a.
   ───────────────────────────────────────────── */
(function(){
    const STORE_USER = 'cb_user';
    const STORE_SCORES = 'cb_scores_local';
    const STORE_SETTINGS = 'cb_settings';

    const firebaseConfig = window.CB_FIREBASE_CONFIG || window.firebaseConfig || null;

    let app, auth, db;
    let currentUser = null;
    let firebaseReady = false;
    let cloudUid = null;

    const listeners = new Set();
    const notify = () => listeners.forEach(fn => { try { fn(currentUser); } catch(e){} });

    function saveUserLocal(user) {
        if(user) {
            const data = {
                uid: user.uid || ('local_' + Date.now()),
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

            // Sessizce anonim giriş
            try {
                await signInAnonymously(auth);
            } catch(e) {
                console.warn('[Çengel] Anonim giriş başarısız. Firebase konsolunda Authentication > Sign-in method > Anonymous aktif mi?', e.message);
                return false;
            }

            await new Promise((resolve) => {
                onAuthStateChanged(auth, (user) => {
                    if(user) {
                        cloudUid = user.uid;
                        if(currentUser) syncUserToCloud();
                    }
                    resolve();
                });
            });

            firebaseReady = true;
            return true;
        } catch(err) {
            console.warn('[Çengel] Firebase init hatası:', err.message);
            return false;
        }
    }

    async function syncUserToCloud() {
        if(!firebaseReady || !cloudUid || !currentUser) return;
        try {
            const { doc, setDoc, getDoc, serverTimestamp } = window._cbFB;
            const userRef = doc(db, 'users', cloudUid);
            const snap = await getDoc(userRef);
            const prev = snap.exists() ? snap.data() : {};

            // İsim değiştiyse güncelle
            if(prev.name !== currentUser.name) {
                await setDoc(userRef, {
                    name: currentUser.name,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }
        } catch(e) { console.warn('User sync hatası:', e); }
    }

    async function setName(name) {
        const clean = (name || '').trim();
        if(!clean) return false;
        saveUserLocal({
            uid: currentUser?.uid || ('local_' + Date.now()),
            name: clean,
            createdAt: currentUser?.createdAt || Date.now()
        });
        if(firebaseReady) await syncUserToCloud();
        return true;
    }

    async function saveScore(puzzleId, score, time, hints, difficulty) {
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

        if(firebaseReady && cloudUid && currentUser) {
            try {
                const { doc, setDoc, getDoc, serverTimestamp } = window._cbFB;
                const userRef = doc(db, 'users', cloudUid);
                const snap = await getDoc(userRef);
                const prev = snap.exists() ? (snap.data().puzzles || {}) : {};

                if(!prev[puzzleId] || prev[puzzleId].score < score) {
                    prev[puzzleId] = entry;
                    const totalScore = Object.values(prev).reduce((s, x) => s + (x.score || 0), 0);
                    const completedCount = Object.keys(prev).length;
                    await setDoc(userRef, {
                        name: currentUser.name,
                        puzzles: prev,
                        totalScore,
                        completedCount,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            } catch(e) { console.warn('Cloud save hatası:', e); }
        }
    }

    async function syncLocalScoresToCloud() {
        if(!firebaseReady || !cloudUid || !currentUser) return;
        try {
            const oldScores = JSON.parse(localStorage.getItem('cb') || '{}');
            const newScores = JSON.parse(localStorage.getItem(STORE_SCORES) || '{}');
            const merged = {};
            for(const [id, d] of Object.entries({...oldScores, ...newScores})) {
                merged[id] = {
                    score: d.s || d.score || 0,
                    time: d.t || d.time || 0,
                    hints: d.h || d.hints || 0,
                    difficulty: d.difficulty || 'Kolay'
                };
            }
            if(Object.keys(merged).length === 0) return;

            const { doc, setDoc, getDoc, serverTimestamp } = window._cbFB;
            const userRef = doc(db, 'users', cloudUid);
            const snap = await getDoc(userRef);
            const existing = snap.exists() ? (snap.data().puzzles || {}) : {};

            let changed = false;
            for(const [id, data] of Object.entries(merged)) {
                if(!existing[id] || existing[id].score < data.score) {
                    existing[id] = data;
                    changed = true;
                }
            }
            if(changed) {
                const totalScore = Object.values(existing).reduce((s, x) => s + (x.score || 0), 0);
                await setDoc(userRef, {
                    name: currentUser.name,
                    puzzles: existing,
                    totalScore,
                    completedCount: Object.keys(existing).length,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }
        } catch(e) { console.warn('Sync hatası:', e); }
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
        const oldScores = JSON.parse(localStorage.getItem('cb') || '{}');
        const newScores = JSON.parse(localStorage.getItem(STORE_SCORES) || '{}');
        const merged = {...oldScores, ...newScores};
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
    initFirebase().then(ready => {
        if(ready && currentUser) syncLocalScoresToCloud();
        if(!ready) console.info('[Çengel] Firebase yok/kapalı — skorlar sadece yerel.');
    });

    window.CBAuth = {
        setName,
        signOut: () => { saveUserLocal(null); },
        getUser: () => currentUser,
        saveScore,
        getLeaderboard,
        maskName,
        onAuthChange,
        getSettings,
        setSetting,
        isFirebaseReady: () => firebaseReady
    };
})();
