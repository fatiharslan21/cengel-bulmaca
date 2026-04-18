/* ─────────────────────────────────────────────
   Çengel Bulmaca — Kullanıcı adı/şifre kimlik + bulut senkronizasyonu
   ───────────────────────────────────────────── */
(function(){
    const STORE_USER = 'cb_user';
    const STORE_SCORES = 'cb_scores_local';
    const STORE_SETTINGS = 'cb_settings';
    const STORE_CB = 'cb';
    const STORE_DAILY = 'cb_daily';
    const STORE_ACCOUNTS_LOCAL = 'cb_accounts_local';

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

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function saveUserLocal(user) {
        if(user) {
            const data = {
                uid: user.key,
                key: user.key,
                name: user.name,
                createdAt: user.createdAt || Date.now(),
                loggedInAt: Date.now()
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

    function getLocalAccounts() {
        try {
            return JSON.parse(localStorage.getItem(STORE_ACCOUNTS_LOCAL) || '{}');
        } catch(e) {
            return {};
        }
    }

    function saveLocalAccounts(accounts) {
        localStorage.setItem(STORE_ACCOUNTS_LOCAL, JSON.stringify(accounts));
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

    async function getCloudAccount(key) {
        if(!firebaseReady || !key) return null;
        try {
            const { doc, getDoc } = window._cbFB;
            const ref = doc(db, 'accounts', key);
            const snap = await getDoc(ref);
            if(!snap.exists()) return null;
            return snap.data();
        } catch(e) {
            console.warn('Hesap bulut okuma hatası:', e);
            return null;
        }
    }

    async function upsertCloudAccount(key, username, passHash) {
        if(!firebaseReady || !key) return false;
        try {
            const { doc, setDoc, serverTimestamp } = window._cbFB;
            const ref = doc(db, 'accounts', key);
            await setDoc(ref, {
                username,
                passHash,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            }, { merge: true });
            return true;
        } catch(e) {
            console.warn('Hesap bulut yazma hatası:', e);
            return false;
        }
    }

    function validateCredentials(username, password) {
        const clean = (username || '').trim();
        if(clean.length < 3) return { ok: false, message: 'Kullanıcı adı en az 3 karakter olmalı.' };
        if(password.length < 4) return { ok: false, message: 'Şifre en az 4 karakter olmalı.' };
        const key = normalizeName(clean);
        if(!key) return { ok: false, message: 'Geçerli bir kullanıcı adı girin.' };
        return { ok: true, username: clean, key };
    }

    async function register(username, password) {
        const v = validateCredentials(username, password);
        if(!v.ok) return v;

        if(initPromise) { try { await initPromise; } catch(e){} }

        const accounts = getLocalAccounts();
        if(accounts[v.key]) return { ok: false, message: 'Bu kullanıcı adı zaten kayıtlı.' };

        if(firebaseReady) {
            const existingCloud = await getCloudAccount(v.key);
            if(existingCloud) return { ok: false, message: 'Bu kullanıcı adı zaten kayıtlı.' };
        }

        const passHash = await hashPassword(password);
        accounts[v.key] = {
            username: v.username,
            passHash,
            createdAt: Date.now()
        };
        saveLocalAccounts(accounts);
        await upsertCloudAccount(v.key, v.username, passHash);

        clearLocalScores();
        await loadUserFromCloud(v.key);
        saveUserLocal({ key: v.key, name: v.username, createdAt: Date.now() });
        await syncUserMetaToCloud();
        return { ok: true, mode: 'register' };
    }

    async function login(username, password) {
        const v = validateCredentials(username, password);
        if(!v.ok) return v;

        if(initPromise) { try { await initPromise; } catch(e){} }

        const passHash = await hashPassword(password);
        let account = null;

        if(firebaseReady) {
            account = await getCloudAccount(v.key);
        }
        if(!account) {
            const accounts = getLocalAccounts();
            account = accounts[v.key] || null;
        }

        if(!account) return { ok: false, message: 'Kullanıcı bulunamadı. Önce kayıt ol.' };
        if(account.passHash !== passHash) return { ok: false, message: 'Şifre hatalı.' };

        const sameUser = currentUser?.key === v.key;
        if(!sameUser) {
            clearLocalScores();
            await loadUserFromCloud(v.key);
        }

        saveUserLocal({ key: v.key, name: account.username || v.username, createdAt: account.createdAt || Date.now() });
        await syncUserMetaToCloud();
        await syncLocalScoresToCloud();
        return { ok: true, mode: 'login' };
    }

    function signOut() {
        saveUserLocal(null);
        clearLocalScores();
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
        if(!currentUser?.key) return;

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

    initPromise = initFirebase().then(async ready => {
        if(!ready) { console.info('[Çengel] Firebase yok/kapalı — hesaplar bu cihazda tutulur.'); return; }
        if(currentUser?.key) {
            await loadUserFromCloud(currentUser.key);
            await syncLocalScoresToCloud();
            window.dispatchEvent(new CustomEvent('cbScoresSynced'));
        }
    });

    window.CBAuth = {
        register,
        login,
        signOut,
        getUser: () => currentUser,
        isLoggedIn: () => !!currentUser?.key,
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
