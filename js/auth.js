/* ─────────────────────────────────────────────
   Çengel Bulmaca — Auth + Scoreboard Motoru
   Firebase (Google Sign-In + Firestore) kullanır.
   Firebase yapılandırması yoksa localStorage'a fallback.
   ───────────────────────────────────────────── */
(function(){
    const STORE_USER = 'cb_user';
    const STORE_SCORES = 'cb_scores_local';
    const STORE_SETTINGS = 'cb_settings';

    // Firebase config: Aşağıdaki değerleri Firebase konsolundan al.
    // https://console.firebase.google.com > Proje ayarları > Web uygulaması
    // Firestore + Google Authentication aktif olmalı.
    const firebaseConfig = window.CB_FIREBASE_CONFIG || null;

    let app, auth, db, provider;
    let currentUser = null;
    let firebaseReady = false;

    const listeners = new Set();
    const notify = () => listeners.forEach(fn => { try { fn(currentUser); } catch(e){} });

    // Local user bilgilerini kaydet
    function saveUserLocal(user) {
        if(user) {
            const data = {
                uid: user.uid || ('local_' + Date.now()),
                name: user.displayName || user.name || 'Misafir',
                email: user.email || null,
                photoURL: user.photoURL || null,
                provider: user.provider || 'google'
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

    // Firebase başlat
    async function initFirebase() {
        if(!firebaseConfig) return false;
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js');
            const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } =
                await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js');
            const { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp } =
                await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');

            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            provider = new GoogleAuthProvider();

            window._cbFB = { signInWithPopup, signOut, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp };

            onAuthStateChanged(auth, (user) => {
                if(user) {
                    saveUserLocal({
                        uid: user.uid,
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        provider: 'google'
                    });
                    syncLocalScoresToCloud();
                } else {
                    saveUserLocal(null);
                }
            });
            firebaseReady = true;
            return true;
        } catch(err) {
            console.warn('Firebase init başarısız:', err);
            return false;
        }
    }

    async function signIn() {
        if(firebaseReady && auth && provider) {
            try {
                await window._cbFB.signInWithPopup(auth, provider);
                return true;
            } catch(err) {
                console.error('Giriş hatası:', err);
                alert('Giriş başarısız: ' + (err.message || err.code));
                return false;
            }
        } else {
            // Fallback: local kullanıcı adı soralım
            const name = prompt('İsminizi girin (cloud scoreboard için Firebase yapılandırması gerekli):', 'Misafir');
            if(!name) return false;
            saveUserLocal({
                uid: 'local_' + btoa(name).replace(/=/g, '').slice(0, 12),
                displayName: name.trim(),
                provider: 'local'
            });
            return true;
        }
    }

    async function signOutUser() {
        if(firebaseReady && auth) {
            try { await window._cbFB.signOut(auth); } catch(e){}
        }
        saveUserLocal(null);
    }

    // SKORU KAYDET (her bölüm için en iyi skor)
    async function saveScore(puzzleId, score, time, hints, difficulty) {
        const entry = {
            score: score|0,
            time: time|0,
            hints: hints|0,
            difficulty: difficulty || 'Kolay',
            completedAt: Date.now()
        };

        // Her zaman local'a da kaydet
        const all = JSON.parse(localStorage.getItem(STORE_SCORES) || '{}');
        if(!all[puzzleId] || all[puzzleId].score < score) {
            all[puzzleId] = entry;
            localStorage.setItem(STORE_SCORES, JSON.stringify(all));
        }

        // Cloud'a yaz
        if(firebaseReady && currentUser && currentUser.provider === 'google') {
            try {
                const { doc, setDoc, getDoc, serverTimestamp } = window._cbFB;
                const userRef = doc(db, 'users', currentUser.uid);
                const snap = await getDoc(userRef);
                const prev = snap.exists() ? (snap.data().puzzles || {}) : {};

                if(!prev[puzzleId] || prev[puzzleId].score < score) {
                    prev[puzzleId] = entry;
                    const totalScore = Object.values(prev).reduce((s, x) => s + (x.score || 0), 0);
                    const completedCount = Object.keys(prev).length;
                    await setDoc(userRef, {
                        name: currentUser.name,
                        photoURL: currentUser.photoURL || null,
                        puzzles: prev,
                        totalScore,
                        completedCount,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            } catch(err) {
                console.warn('Cloud save hatası:', err);
            }
        }
    }

    // Local skorları cloud'a senkronize et (ilk girişte)
    async function syncLocalScoresToCloud() {
        if(!firebaseReady || !currentUser) return;
        try {
            const oldScores = JSON.parse(localStorage.getItem('cb') || '{}');
            const newScores = JSON.parse(localStorage.getItem(STORE_SCORES) || '{}');
            const merged = {...oldScores, ...newScores};

            if(Object.keys(merged).length === 0) return;

            const { doc, setDoc, getDoc, serverTimestamp } = window._cbFB;
            const userRef = doc(db, 'users', currentUser.uid);
            const snap = await getDoc(userRef);
            const existing = snap.exists() ? (snap.data().puzzles || {}) : {};

            let changed = false;
            for(const [id, data] of Object.entries(merged)) {
                const score = data.s || data.score || 0;
                const time = data.t || data.time || 0;
                const hints = data.h || data.hints || 0;
                if(!existing[id] || existing[id].score < score) {
                    existing[id] = { score, time, hints, difficulty: data.difficulty || 'Kolay' };
                    changed = true;
                }
            }

            if(changed) {
                const totalScore = Object.values(existing).reduce((s, x) => s + (x.score || 0), 0);
                await setDoc(userRef, {
                    name: currentUser.name,
                    photoURL: currentUser.photoURL || null,
                    puzzles: existing,
                    totalScore,
                    completedCount: Object.keys(existing).length,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }
        } catch(err) {
            console.warn('Sync hatası:', err);
        }
    }

    // Leaderboard çek
    async function getLeaderboard(topN = 50) {
        if(firebaseReady) {
            try {
                const { collection, query, orderBy, limit, getDocs } = window._cbFB;
                const q = query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(topN));
                const snap = await getDocs(q);
                const list = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    list.push({
                        uid: doc.id,
                        name: d.name || 'Anonim',
                        totalScore: d.totalScore || 0,
                        completedCount: d.completedCount || 0,
                        photoURL: d.photoURL || null
                    });
                });
                return list;
            } catch(err) {
                console.warn('Leaderboard hata:', err);
            }
        }
        // Fallback: local leaderboard (sadece kendin)
        return localLeaderboard();
    }

    function localLeaderboard() {
        const user = currentUser || { uid: 'guest', name: 'Sen' };
        const scores = JSON.parse(localStorage.getItem(STORE_SCORES) || '{}');
        const oldScores = JSON.parse(localStorage.getItem('cb') || '{}');
        const merged = {...oldScores, ...scores};
        const total = Object.values(merged).reduce((s, x) => s + (x.s || x.score || 0), 0);
        const count = Object.keys(merged).length;
        return [{
            uid: user.uid,
            name: user.name,
            totalScore: total,
            completedCount: count,
            photoURL: user.photoURL
        }];
    }

    // İsmi maskele: "Fatih" -> "F****"
    function maskName(name) {
        if(!name) return '***';
        const trimmed = name.trim();
        if(trimmed.length <= 1) return trimmed;
        return trimmed[0] + '•'.repeat(Math.min(trimmed.length - 1, 5));
    }

    function onAuthChange(fn) {
        listeners.add(fn);
        fn(currentUser);
        return () => listeners.delete(fn);
    }

    // Ayarlar
    function getSettings() {
        try { return JSON.parse(localStorage.getItem(STORE_SETTINGS) || '{}'); }
        catch(e) { return {}; }
    }
    function setSetting(key, val) {
        const s = getSettings();
        s[key] = val;
        localStorage.setItem(STORE_SETTINGS, JSON.stringify(s));
    }

    // Başlat
    loadUserLocal();
    initFirebase().then(ready => {
        if(!ready) {
            console.info('Çengel: Firebase config yok. Scoreboard yerel modda çalışıyor.');
        }
    });

    // Public API
    window.CBAuth = {
        signIn,
        signOut: signOutUser,
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
