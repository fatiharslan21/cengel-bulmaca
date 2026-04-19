/* ─────────────────────────────────────────────
   Çengel Bulmaca — Stabil Yerel Hesap Sistemi
   Not: Bu sürümde hesaplar ve skorlar localStorage'da tutulur.
   ───────────────────────────────────────────── */
(function(){
    var STORE_USER = 'cb_user';
    var STORE_DB = 'cb_accounts_db';
    var STORE_SETTINGS = 'cb_settings';

    // Oyunun mevcut ekranları bu legacy anahtarları okuyor.
    var STORE_CB = 'cb';
    var STORE_SCORES = 'cb_scores_local';
    var STORE_DAILY = 'cb_daily';

    var currentUser = null;
    var listeners = [];

    function notify(){
        for(var i=0;i<listeners.length;i++){
            try { listeners[i](currentUser); } catch(e) {}
        }
    }

    function normalizeName(name){
        return (name || '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40);
    }

    function safeParse(raw, fallback){
        try { return JSON.parse(raw); } catch(e) { return fallback; }
    }

    function getDB(){
        var db = safeParse(localStorage.getItem(STORE_DB) || '', null);
        if(!db || typeof db !== 'object') db = {};
        if(!db.users || typeof db.users !== 'object') db.users = {};
        return db;
    }

    function saveDB(db){
        localStorage.setItem(STORE_DB, JSON.stringify(db));
    }

    function userTemplate(username, passHash){
        return {
            username: username,
            passHash: passHash,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            puzzles: {},
            daily: {},
            totalScore: 0,
            completedCount: 0
        };
    }

    function readUserSession(){
        var raw = safeParse(localStorage.getItem(STORE_USER) || '', null);
        if(raw && raw.key) currentUser = raw;
    }

    function setUserSession(key, name, createdAt){
        currentUser = {
            key: key,
            uid: key,
            name: name,
            createdAt: createdAt || Date.now(),
            loggedInAt: Date.now()
        };
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
        // Kriptografik hash varsa kullan, yoksa deterministik fallback.
        if(window.crypto && window.crypto.subtle && window.TextEncoder){
            var data = new TextEncoder().encode(password);
            return window.crypto.subtle.digest('SHA-256', data).then(function(buf){
                var arr = Array.prototype.slice.call(new Uint8Array(buf));
                return arr.map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
            });
        }
        return Promise.resolve('plain:' + password);
    }

    function loadUserDataToLegacyStores(userRec){
        var cb = {};
        var scores = {};
        var daily = {};

        var puzzles = userRec && userRec.puzzles ? userRec.puzzles : {};
        for(var pid in puzzles){
            if(!Object.prototype.hasOwnProperty.call(puzzles, pid)) continue;
            var p = puzzles[pid] || {};
            cb[pid] = { s:p.score||0, t:p.time||0, h:p.hints||0 };
            scores[pid] = {
                score: p.score||0,
                time: p.time||0,
                hints: p.hints||0,
                difficulty: p.difficulty||'Kolay',
                completedAt: p.completedAt||Date.now()
            };
        }

        var dailies = userRec && userRec.daily ? userRec.daily : {};
        for(var dk in dailies){
            if(!Object.prototype.hasOwnProperty.call(dailies, dk)) continue;
            var d = dailies[dk] || {};
            daily[dk] = { s:d.score||0, t:d.time||0, h:d.hints||0, id:d.id||null };
        }

        localStorage.setItem(STORE_CB, JSON.stringify(cb));
        localStorage.setItem(STORE_SCORES, JSON.stringify(scores));
        localStorage.setItem(STORE_DAILY, JSON.stringify(daily));
        window.dispatchEvent(new CustomEvent('cbScoresSynced'));
    }

    function register(username, password){
        var v = validateCredentials(username, password);
        if(!v.ok) return Promise.resolve(v);

        var db = getDB();
        if(db.users[v.key]) return Promise.resolve({ ok:false, message:'Bu kullanıcı adı zaten kayıtlı.' });

        return hashPassword(password).then(function(passHash){
            db.users[v.key] = userTemplate(v.username, passHash);
            saveDB(db);
            setUserSession(v.key, v.username, db.users[v.key].createdAt);
            loadUserDataToLegacyStores(db.users[v.key]);
            return { ok:true, mode:'register' };
        });
    }

    function login(username, password){
        var v = validateCredentials(username, password);
        if(!v.ok) return Promise.resolve(v);

        var db = getDB();
        var rec = db.users[v.key];
        if(!rec) return Promise.resolve({ ok:false, message:'Kullanıcı bulunamadı. Önce kayıt ol.' });

        return hashPassword(password).then(function(passHash){
            if(rec.passHash !== passHash) return { ok:false, message:'Şifre hatalı.' };
            rec.updatedAt = Date.now();
            db.users[v.key] = rec;
            saveDB(db);
            setUserSession(v.key, rec.username || v.username, rec.createdAt || Date.now());
            loadUserDataToLegacyStores(rec);
            return { ok:true, mode:'login' };
        });
    }

    function signOut(){
        clearUserSession();
        localStorage.removeItem(STORE_CB);
        localStorage.removeItem(STORE_SCORES);
        localStorage.removeItem(STORE_DAILY);
    }

    function saveScore(puzzleId, score, time, hints, difficulty, dailyKey){
        if(!currentUser || !currentUser.key) return;
        var key = String(puzzleId);
        var db = getDB();
        var rec = db.users[currentUser.key];
        if(!rec){
            rec = userTemplate(currentUser.name || currentUser.key, '');
        }
        if(!rec.puzzles) rec.puzzles = {};
        if(!rec.daily) rec.daily = {};

        var nextEntry = {
            score: score|0,
            time: time|0,
            hints: hints|0,
            difficulty: difficulty || 'Kolay',
            completedAt: Date.now()
        };

        var prev = rec.puzzles[key];
        if(!prev || (prev.score||0) < nextEntry.score) {
            rec.puzzles[key] = nextEntry;
        }

        if(dailyKey){
            var dk = String(dailyKey);
            var oldDaily = rec.daily[dk];
            if(!oldDaily || (oldDaily.score||0) < nextEntry.score){
                rec.daily[dk] = {
                    score: nextEntry.score,
                    time: nextEntry.time,
                    hints: nextEntry.hints,
                    id: puzzleId,
                    completedAt: nextEntry.completedAt
                };
            }
        }

        var total = 0;
        var count = 0;
        for(var pid in rec.puzzles){
            if(!Object.prototype.hasOwnProperty.call(rec.puzzles, pid)) continue;
            count += 1;
            total += rec.puzzles[pid].score || 0;
        }
        rec.totalScore = total;
        rec.completedCount = count;
        rec.updatedAt = Date.now();

        db.users[currentUser.key] = rec;
        saveDB(db);
        loadUserDataToLegacyStores(rec);
    }

    function getLeaderboard(topN){
        var n = topN || 50;
        var db = getDB();
        var list = [];
        for(var key in db.users){
            if(!Object.prototype.hasOwnProperty.call(db.users, key)) continue;
            var u = db.users[key] || {};
            list.push({
                uid: key,
                name: u.username || key,
                totalScore: u.totalScore || 0,
                completedCount: u.completedCount || 0
            });
        }
        list.sort(function(a,b){ return (b.totalScore||0) - (a.totalScore||0); });
        return Promise.resolve(list.slice(0, n));
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
        try { fn(currentUser); } catch(e) {}
        return function(){
            listeners = listeners.filter(function(x){ return x !== fn; });
        };
    }

    function getSettings(){
        return safeParse(localStorage.getItem(STORE_SETTINGS) || '', {}) || {};
    }

    function setSetting(key, val){
        var s = getSettings();
        s[key] = val;
        localStorage.setItem(STORE_SETTINGS, JSON.stringify(s));
    }

    // Init
    readUserSession();
    if(currentUser && currentUser.key){
        var db = getDB();
        var rec = db.users[currentUser.key];
        if(rec) loadUserDataToLegacyStores(rec);
        else clearUserSession();
    }

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
        normalizeName: normalizeName
    };
})();
