/* ─────────────────────────────────────────────
   Çengel Bulmaca — Auth ve Skor Yönetimi
   Öncelik sırası:
     1) Firebase (Firestore)  → window.CB_FIREBASE_CONFIG varsa
     2) Opsiyonel Node backend → window.CB_API_BASE veya /api/health yanıtı
     3) localStorage fallback
   ───────────────────────────────────────────── */
(function(){
    var STORE_USER = 'cb_user';
    var STORE_DB = 'cb_accounts_db';
    var STORE_SETTINGS = 'cb_settings';
    var STORE_CB = 'cb';
    var STORE_SCORES = 'cb_scores_local';
    var STORE_DAILY = 'cb_daily';

    var fbApp = null;
    var fbDb = null;
    var fbAuth = null;
    var fbReady = null;          // Promise<boolean>
    var fbUsable = false;        // Firestore hazır mı?

    var currentUser = null;
    var listeners = [];

    function notify(){ listeners.forEach(function(fn){ try { fn(currentUser); } catch(e){}; }); }
    function safeParse(raw, fallback){ try { return JSON.parse(raw); } catch(e){ return fallback; } }

    function normalizeName(name){
        return (name || '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40);
    }

    // ─── Firebase init ───
    function initFirebase(){
        if(fbReady) return fbReady;
        fbReady = new Promise(function(resolve){
            try {
                if(!window.CB_FIREBASE_CONFIG || typeof firebase === 'undefined' || !firebase.initializeApp){
                    resolve(false); return;
                }
                fbApp = firebase.apps && firebase.apps.length
                    ? firebase.app()
                    : firebase.initializeApp(window.CB_FIREBASE_CONFIG);
                fbAuth = firebase.auth();
                fbDb = firebase.firestore();
                // Firestore kurallarımız auth gerektiriyor; anonim girişle karşıla.
                fbAuth.signInAnonymously().then(function(){
                    fbUsable = true;
                    resolve(true);
                }).catch(function(err){
                    console.warn('Firebase anon sign-in failed:', err && err.message);
                    fbUsable = false;
                    resolve(false);
                });
            } catch(e){
                console.warn('Firebase init error:', e && e.message);
                resolve(false);
            }
        });
        return fbReady;
    }

    function usersCol(){
        return fbDb.collection('users');
    }

    // ─── localStorage DB ───
    function getDB(){
        var db = safeParse(localStorage.getItem(STORE_DB) || '', null);
        if(!db || typeof db !== 'object') db = {};
        if(!db.users || typeof db.users !== 'object') db.users = {};
        return db;
    }
    function saveDB(db){ localStorage.setItem(STORE_DB, JSON.stringify(db)); }

    function userTemplate(username){
        return { username: username, createdAt: Date.now(), updatedAt: Date.now(), puzzles:{}, daily:{}, totalScore:0, completedCount:0 };
    }

    function readUserSession(){
        var raw = safeParse(localStorage.getItem(STORE_USER) || '', null);
        if(raw && raw.key) currentUser = raw;
    }

    function setUserSession(key, name, createdAt){
        currentUser = { key:key, uid:key, name:name, createdAt:createdAt || Date.now(), loggedInAt: Date.now() };
        localStorage.setItem(STORE_USER, JSON.stringify(currentUser));
        notify();
    }

    function clearUserSession(){
        currentUser = null;
        localStorage.removeItem(STORE_USER);
        notify();
    }

    function validateCredentials(username){
        var clean = (username || '').trim();
        if(clean.length < 3) return { ok:false, message:'Kullanıcı adı en az 3 karakter olmalı.' };
        var key = normalizeName(clean);
        if(!key) return { ok:false, message:'Geçerli bir kullanıcı adı girin.' };
        return { ok:true, username: clean, key: key };
    }

    function hashPassword(password){
        if(window.crypto && window.crypto.subtle && window.TextEncoder){
            return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)).then(function(buf){
                return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
            });
        }
        return Promise.resolve('plain:' + password);
    }

    function loadUserDataToLegacyStores(userRec){
        var cb = {}, scores = {}, daily = {};
        var puzzles = (userRec && userRec.puzzles) || {};
        Object.keys(puzzles).forEach(function(pid){
            var p = puzzles[pid] || {};
            cb[pid] = { s:p.score||0, t:p.time||0, h:p.hints||0 };
            scores[pid] = { score:p.score||0, time:p.time||0, hints:p.hints||0, difficulty:p.difficulty||'Kolay', completedAt:p.completedAt||Date.now() };
        });
        var dailies = (userRec && userRec.daily) || {};
        Object.keys(dailies).forEach(function(dk){
            var d = dailies[dk] || {};
            daily[dk] = { s:d.score||0, t:d.time||0, h:d.hints||0, id:d.id||null };
        });
        localStorage.setItem(STORE_CB, JSON.stringify(cb));
        localStorage.setItem(STORE_SCORES, JSON.stringify(scores));
        localStorage.setItem(STORE_DAILY, JSON.stringify(daily));
        window.dispatchEvent(new CustomEvent('cbScoresSynced'));
    }

    // ─── Firestore helpers ───
    async function fbGetUser(key){
        var snap = await usersCol().doc(key).get();
        return snap.exists ? snap.data() : null;
    }

    async function fbCreateUser(key, data){
        await usersCol().doc(key).set(data);
    }

    async function fbUpdateUser(key, patch){
        await usersCol().doc(key).set(patch, { merge: true });
    }

    // ─── Public: register ───
    async function enter(username){
        var v = validateCredentials(username);
        if(!v.ok) return v;

        if(await initFirebase()){
            try {
                var rec = await fbGetUser(v.key);
                if(!rec){
                    rec = { username: v.username, createdAt: Date.now(), updatedAt: Date.now(), puzzles: {}, daily: {}, totalScore: 0, completedCount: 0 };
                    await fbCreateUser(v.key, rec);
                } else {
                    rec.updatedAt = Date.now();
                    await fbUpdateUser(v.key, { updatedAt: rec.updatedAt });
                }
                setUserSession(v.key, rec.username || v.username, rec.createdAt || Date.now());
                loadUserDataToLegacyStores(rec);
                return { ok:true, mode:'enter' };
            } catch(err){ return { ok:false, message:'Bulut girişi başarısız: ' + (err && err.message || 'bilinmeyen hata') }; }
        }

        var db = getDB();
        var recLocal = db.users[v.key];
        if(!recLocal){
            recLocal = userTemplate(v.username);
            db.users[v.key] = recLocal;
        }
        recLocal.username = recLocal.username || v.username;
        recLocal.updatedAt = Date.now();
        saveDB(db);
        setUserSession(v.key, recLocal.username, recLocal.createdAt || Date.now());
        loadUserDataToLegacyStores(recLocal);
        return { ok:true, mode:'enter' };
    }


    // ─── Public: saveScore ───
    async function saveScore(puzzleId, score, time, hints, difficulty, dailyKey){
        if(!currentUser || !currentUser.key) return;
        var pid = String(puzzleId);
        var entry = {
            score: Number(score) || 0,
            time: Number(time) || 0,
            hints: Number(hints) || 0,
            difficulty: difficulty || 'Kolay',
            completedAt: Date.now()
        };

        if(await initFirebase()){
            try {
                var rec = await fbGetUser(currentUser.key);
                if(!rec){
                    // Profil yoksa asgari bir profil oluştur (beklenmedik durum).
                    rec = { username: currentUser.name || currentUser.key, createdAt: Date.now(), updatedAt: Date.now(), puzzles:{}, daily:{}, totalScore:0, completedCount:0 };
                }
                if(!rec.puzzles) rec.puzzles = {};
                if(!rec.daily) rec.daily = {};
                if(!rec.puzzles[pid] || (rec.puzzles[pid].score || 0) < entry.score){
                    rec.puzzles[pid] = entry;
                }
                if(dailyKey){
                    var dk = String(dailyKey);
                    if(!rec.daily[dk] || (rec.daily[dk].score || 0) < entry.score){
                        rec.daily[dk] = { score: entry.score, time: entry.time, hints: entry.hints, id: puzzleId, completedAt: entry.completedAt };
                    }
                }
                var vals = Object.values(rec.puzzles);
                rec.totalScore = vals.reduce(function(s, x){ return s + (x.score || 0); }, 0);
                rec.completedCount = vals.length;
                rec.updatedAt = Date.now();
                await fbUpdateUser(currentUser.key, rec);
                loadUserDataToLegacyStores(rec);
                window.dispatchEvent(new CustomEvent('cbLeaderboardUpdated'));
                return;
            } catch(err){
                console.warn('Firestore saveScore error:', err && err.message);
                // Düşme: localStorage'a kaydet.
            }
        }

        var db = getDB();
        var recLocal = db.users[currentUser.key] || userTemplate(currentUser.name || currentUser.key);
        if(!recLocal.puzzles) recLocal.puzzles = {};
        if(!recLocal.daily) recLocal.daily = {};

        if(!recLocal.puzzles[pid] || (recLocal.puzzles[pid].score || 0) < entry.score){
            recLocal.puzzles[pid] = entry;
        }
        if(dailyKey){
            var dkLocal = String(dailyKey);
            if(!recLocal.daily[dkLocal] || (recLocal.daily[dkLocal].score || 0) < entry.score){
                recLocal.daily[dkLocal] = { score: entry.score, time: entry.time, hints: entry.hints, id: puzzleId, completedAt: entry.completedAt };
            }
        }

        var valsLocal = Object.values(recLocal.puzzles);
        recLocal.totalScore = valsLocal.reduce(function(sum, x){ return sum + (x.score || 0); }, 0);
        recLocal.completedCount = valsLocal.length;
        recLocal.updatedAt = Date.now();
        db.users[currentUser.key] = recLocal;
        saveDB(db);
        loadUserDataToLegacyStores(recLocal);
        window.dispatchEvent(new CustomEvent('cbLeaderboardUpdated'));
    }

    // ─── Public: getLeaderboard ───
    async function getLeaderboard(topN){
        var n = topN || 50;

        if(await initFirebase()){
            try {
                var snap = await usersCol()
                    .orderBy('totalScore', 'desc')
                    .limit(n)
                    .get();
                var list = [];
                snap.forEach(function(doc){
                    var u = doc.data() || {};
                    list.push({
                        uid: doc.id,
                        name: u.username || doc.id,
                        totalScore: u.totalScore || 0,
                        completedCount: u.completedCount || 0
                    });
                });
                return list;
            } catch(err){
                console.warn('Firestore leaderboard error:', err && err.message);
            }
        }

        var db = getDB();
        return Object.keys(db.users).map(function(k){
            var u = db.users[k] || {};
            return {
                uid: k,
                name: u.username || k,
                totalScore: u.totalScore || 0,
                completedCount: u.completedCount || 0
            };
        }).sort(function(a,b){ return (b.totalScore||0) - (a.totalScore||0); }).slice(0, n);
    }

    function signOut(){
        clearUserSession();
        localStorage.removeItem(STORE_CB);
        localStorage.removeItem(STORE_SCORES);
        localStorage.removeItem(STORE_DAILY);
    }

    function maskName(name){
        if(!name) return '•••';
        var t = String(name).trim();
        if(t.length <= 1) return t;
        return t[0].toUpperCase() + '•'.repeat(Math.min(t.length - 1, 6));
    }

    function onAuthChange(fn){
        if(typeof fn !== 'function') return function(){};
        listeners.push(fn);
        try { fn(currentUser); } catch(e){}
        return function(){ listeners = listeners.filter(function(x){ return x !== fn; }); };
    }

    function getSettings(){ return safeParse(localStorage.getItem(STORE_SETTINGS) || '', {}) || {}; }
    function setSetting(key, val){ var s = getSettings(); s[key] = val; localStorage.setItem(STORE_SETTINGS, JSON.stringify(s)); }

    readUserSession();

    // Firebase varsa, init'i baştan başlat; arka planda hazırlanır.
    initFirebase().then(function(ok){
        if(ok && currentUser && currentUser.key){
            fbGetUser(currentUser.key).then(function(rec){
                if(rec) loadUserDataToLegacyStores(rec);
            }).catch(function(){});
        }
    });

    window.CBAuth = {
        register: enter,
        login: enter,
        enter: enter,
        signOut: signOut,
        getUser: function(){ return currentUser; },
        isLoggedIn: function(){ return !!(currentUser && currentUser.key); },
        saveScore: saveScore,
        getLeaderboard: getLeaderboard,
        maskName: maskName,
        onAuthChange: onAuthChange,
        getSettings: getSettings,
        setSetting: setSetting,
        isFirebaseReady: function(){ return !!fbUsable; },
        normalizeName: normalizeName,
        isBackendReady: function(){ return false; }
    };
})();
