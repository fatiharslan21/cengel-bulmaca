/* ─────────────────────────────────────────────
   Çengel Bulmaca — Local DB + Optional Backend API
   ───────────────────────────────────────────── */
(function(){
    var STORE_USER = 'cb_user';
    var STORE_DB = 'cb_accounts_db';
    var STORE_SETTINGS = 'cb_settings';
    var STORE_CB = 'cb';
    var STORE_SCORES = 'cb_scores_local';
    var STORE_DAILY = 'cb_daily';

    var API_BASE = (window.CB_API_BASE || '').replace(/\/$/, '');
    var backendChecked = false;
    var backendAvailable = false;

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

    function getDB(){
        var db = safeParse(localStorage.getItem(STORE_DB) || '', null);
        if(!db || typeof db !== 'object') db = {};
        if(!db.users || typeof db.users !== 'object') db.users = {};
        return db;
    }
    function saveDB(db){ localStorage.setItem(STORE_DB, JSON.stringify(db)); }

    function userTemplate(username, passHash){
        return { username, passHash, createdAt: Date.now(), updatedAt: Date.now(), puzzles:{}, daily:{}, totalScore:0, completedCount:0 };
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

    function validateCredentials(username, password){
        var clean = (username || '').trim();
        if(clean.length < 3) return { ok:false, message:'Kullanıcı adı en az 3 karakter olmalı.' };
        if((password || '').length < 4) return { ok:false, message:'Şifre en az 4 karakter olmalı.' };
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

    function apiUrl(path){ return (API_BASE || '') + path; }

    async function checkBackend(){
        if(backendChecked) return backendAvailable;
        backendChecked = true;
        try {
            var res = await fetch(apiUrl('/api/health'), { method:'GET' });
            backendAvailable = !!res.ok;
        } catch(e){ backendAvailable = false; }
        return backendAvailable;
    }

    async function apiPost(path, body){
        var res = await fetch(apiUrl(path), {
            method:'POST',
            headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify(body)
        });
        var json = await res.json().catch(function(){ return { ok:false, message:'Sunucu yanıtı okunamadı.' }; });
        if(!res.ok || json.ok === false) return { ok:false, message: json.message || 'İşlem başarısız.' };
        return json;
    }

    async function apiGet(path){
        var res = await fetch(apiUrl(path), { method:'GET' });
        var json = await res.json().catch(function(){ return { ok:false }; });
        if(!res.ok || json.ok === false) return null;
        return json;
    }

    async function register(username, password){
        var v = validateCredentials(username, password);
        if(!v.ok) return v;
        var passHash = await hashPassword(password);

        if(await checkBackend()){
            var remote = await apiPost('/api/register', { key:v.key, username:v.username, passHash:passHash });
            if(!remote.ok) return remote;
            var u = remote.user || {};
            setUserSession(v.key, v.username, u.createdAt || Date.now());
            loadUserDataToLegacyStores(u);
            return { ok:true, mode:'register' };
        }

        var db = getDB();
        if(db.users[v.key]) return { ok:false, message:'Bu kullanıcı adı zaten kayıtlı.' };
        db.users[v.key] = userTemplate(v.username, passHash);
        saveDB(db);
        setUserSession(v.key, v.username, db.users[v.key].createdAt);
        loadUserDataToLegacyStores(db.users[v.key]);
        return { ok:true, mode:'register' };
    }

    async function login(username, password){
        var v = validateCredentials(username, password);
        if(!v.ok) return v;
        var passHash = await hashPassword(password);

        if(await checkBackend()){
            var remote = await apiPost('/api/login', { key:v.key, passHash:passHash });
            if(!remote.ok) return remote;
            var u = remote.user || {};
            setUserSession(v.key, u.username || v.username, u.createdAt || Date.now());
            loadUserDataToLegacyStores(u);
            return { ok:true, mode:'login' };
        }

        var db = getDB();
        var rec = db.users[v.key];
        if(!rec) return { ok:false, message:'Kullanıcı bulunamadı. Önce kayıt ol.' };
        if(rec.passHash !== passHash) return { ok:false, message:'Şifre hatalı.' };
        rec.updatedAt = Date.now();
        db.users[v.key] = rec;
        saveDB(db);
        setUserSession(v.key, rec.username || v.username, rec.createdAt || Date.now());
        loadUserDataToLegacyStores(rec);
        return { ok:true, mode:'login' };
    }

    async function saveScore(puzzleId, score, time, hints, difficulty, dailyKey){
        if(!currentUser || !currentUser.key) return;

        if(await checkBackend()){
            var remote = await apiPost('/api/score', {
                key: currentUser.key,
                puzzleId: puzzleId,
                score: score,
                time: time,
                hints: hints,
                difficulty: difficulty,
                dailyKey: dailyKey || null
            });
            if(remote.ok && remote.user) loadUserDataToLegacyStores(remote.user);
            return;
        }

        var key = String(puzzleId);
        var db = getDB();
        var rec = db.users[currentUser.key] || userTemplate(currentUser.name || currentUser.key, '');
        if(!rec.puzzles) rec.puzzles = {};
        if(!rec.daily) rec.daily = {};

        var entry = { score: score|0, time: time|0, hints: hints|0, difficulty: difficulty || 'Kolay', completedAt: Date.now() };
        if(!rec.puzzles[key] || (rec.puzzles[key].score||0) < entry.score) rec.puzzles[key] = entry;
        if(dailyKey){
            var dk = String(dailyKey);
            if(!rec.daily[dk] || (rec.daily[dk].score||0) < entry.score) rec.daily[dk] = { score:entry.score, time:entry.time, hints:entry.hints, id:puzzleId, completedAt:entry.completedAt };
        }

        var vals = Object.values(rec.puzzles);
        rec.totalScore = vals.reduce(function(s,x){ return s + (x.score||0); }, 0);
        rec.completedCount = vals.length;
        rec.updatedAt = Date.now();
        db.users[currentUser.key] = rec;
        saveDB(db);
        loadUserDataToLegacyStores(rec);
    }

    async function getLeaderboard(topN){
        var n = topN || 50;
        if(await checkBackend()){
            var remote = await apiGet('/api/leaderboard?n=' + encodeURIComponent(n));
            if(remote && Array.isArray(remote.leaderboard)) return remote.leaderboard;
        }

        var db = getDB();
        var list = Object.keys(db.users).map(function(k){
            var u = db.users[k] || {};
            return { uid:k, name:u.username || k, totalScore:u.totalScore || 0, completedCount:u.completedCount || 0 };
        }).sort(function(a,b){ return (b.totalScore||0)-(a.totalScore||0); });
        return list.slice(0, n);
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

    window.CBAuth = {
        register: register,
        login: login,
        signOut: signOut,
        getUser: function(){ return currentUser; },
        isLoggedIn: function(){ return !!(currentUser && currentUser.key); },
        saveScore: saveScore,
        getLeaderboard: getLeaderboard,
        maskName: maskName,
        onAuthChange: onAuthChange,
        getSettings: getSettings,
        setSetting: setSetting,
        isFirebaseReady: function(){ return false; },
        normalizeName: normalizeName,
        isBackendReady: function(){ return backendAvailable; }
    };

    if(currentUser && currentUser.key){
        checkBackend().then(function(ok){
            if(ok){
                apiGet('/api/user/' + encodeURIComponent(currentUser.key)).then(function(res){
                    if(res && res.user){ loadUserDataToLegacyStores(res.user); }
                });
            } else {
                var db = getDB();
                var rec = db.users[currentUser.key];
                if(rec) loadUserDataToLegacyStores(rec);
            }
        });
    }
})();
