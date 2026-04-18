/* ─────────────────────────────────────────────
   Çengel Bulmaca — Kayıt/Giriş Modalı
   ───────────────────────────────────────────── */
(function(){
    let modal = null;
    let authLoadAttempted = false;

    function createFallbackAuth() {
        if(window.CBAuth && typeof window.CBAuth.login === 'function') return window.CBAuth;

        const STORE_USER = 'cb_user';
        const STORE_ACCOUNTS = 'cb_accounts_local';

        const normalizeName = (name) => (name || '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40);

        const getAccounts = () => {
            try { return JSON.parse(localStorage.getItem(STORE_ACCOUNTS) || '{}'); } catch(e) { return {}; }
        };
        const setAccounts = (v) => localStorage.setItem(STORE_ACCOUNTS, JSON.stringify(v));
        const setUser = (key, name) => {
            localStorage.setItem(STORE_USER, JSON.stringify({ key, uid:key, name, loggedInAt: Date.now() }));
        };
        const getUser = () => {
            try { return JSON.parse(localStorage.getItem(STORE_USER) || 'null'); } catch(e) { return null; }
        };
        const clearUser = () => localStorage.removeItem(STORE_USER);
        const hash = async (pw) => {
            try {
                if(window.crypto?.subtle) {
                    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
                    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
                }
            } catch(e) {}
            return `plain:${pw}`;
        };

        window.CBAuth = {
            async register(username, password) {
                const clean = (username || '').trim();
                if(clean.length < 3) return { ok:false, message:'Kullanıcı adı en az 3 karakter olmalı.' };
                if((password || '').length < 4) return { ok:false, message:'Şifre en az 4 karakter olmalı.' };
                const key = normalizeName(clean);
                if(!key) return { ok:false, message:'Geçerli bir kullanıcı adı girin.' };
                const all = getAccounts();
                if(all[key]) return { ok:false, message:'Bu kullanıcı adı zaten kayıtlı.' };
                all[key] = { username: clean, passHash: await hash(password), createdAt: Date.now() };
                setAccounts(all);
                setUser(key, clean);
                return { ok:true, mode:'register' };
            },
            async login(username, password) {
                const clean = (username || '').trim();
                if(clean.length < 3) return { ok:false, message:'Kullanıcı adı en az 3 karakter olmalı.' };
                if((password || '').length < 4) return { ok:false, message:'Şifre en az 4 karakter olmalı.' };
                const key = normalizeName(clean);
                const all = getAccounts();
                const acc = all[key];
                if(!acc) return { ok:false, message:'Kullanıcı bulunamadı. Önce kayıt ol.' };
                const passHash = await hash(password);
                if(acc.passHash !== passHash) return { ok:false, message:'Şifre hatalı.' };
                setUser(key, acc.username || clean);
                return { ok:true, mode:'login' };
            },
            signOut() { clearUser(); },
            getUser() { return getUser(); },
            isLoggedIn() { return !!getUser()?.key; },
            onAuthChange(fn) { try { if(typeof fn === 'function') fn(getUser()); } catch(e) {} return () => {}; },
            saveScore() {},
            getLeaderboard() { return []; }
        };
        return window.CBAuth;
    }

    function ensureAuthScript() {
        if(authLoadAttempted || (window.CBAuth && typeof window.CBAuth.login === 'function')) return;
        authLoadAttempted = true;
        const s = document.createElement('script');
        s.src = './js/auth.js';
        s.async = true;
        document.head.appendChild(s);
    }

    async function waitForAuthReady(timeoutMs = 5000) {
        ensureAuthScript();
        const start = Date.now();
        while(Date.now() - start < timeoutMs) {
            if(window.CBAuth && typeof window.CBAuth.register === 'function' && typeof window.CBAuth.login === 'function') {
                return true;
            }
            await new Promise(r => setTimeout(r, 80));
        }
        createFallbackAuth();
        return !!(window.CBAuth && typeof window.CBAuth.register === 'function' && typeof window.CBAuth.login === 'function');
    }

    function build() {
        if(modal) return modal;
        modal = document.createElement('div');
        modal.className = 'welcome-overlay';
        modal.innerHTML = `
            <div class="welcome-modal">
                <div class="welcome-decor">
                    <span class="wd wd-1">Ç</span>
                    <span class="wd wd-2">✦</span>
                    <span class="wd wd-3">◆</span>
                </div>
                <div class="welcome-logo">Ç</div>
                <h2 class="welcome-title">Hesabınla Devam Et</h2>
                <p class="welcome-sub">Bölümlere girmek için kayıt olman veya giriş yapman gerekir.</p>

                <div class="auth-tabs">
                    <button type="button" class="welcome-btn auth-tab is-active" id="tab-register">Kayıt Ol</button>
                    <button type="button" class="welcome-btn auth-tab" id="tab-login">Giriş Yap</button>
                </div>

                <form class="welcome-form" id="welcome-form">
                    <input type="text" id="welcome-name" placeholder="Kullanıcı adı" maxlength="24" autocomplete="username" spellcheck="false" required>
                    <div class="pass-wrap">
                        <input type="password" id="welcome-pass" placeholder="Şifre" minlength="4" autocomplete="current-password" required>
                        <button type="button" class="pass-toggle" id="toggle-pass" aria-label="Şifreyi göster/gizle">👁️</button>
                    </div>
                    <input type="password" id="welcome-pass2" placeholder="Şifre (tekrar)" minlength="4" autocomplete="new-password" required>
                    <button type="submit" class="welcome-btn welcome-submit"><span id="welcome-btn-label">Kayıt Ol</span></button>
                </form>
                <p id="welcome-msg" class="welcome-note"></p>
            </div>
        `;
        document.body.appendChild(modal);

        let mode = 'register';
        const registerBtn = modal.querySelector('#tab-register');
        const loginBtn = modal.querySelector('#tab-login');
        const form = modal.querySelector('#welcome-form');
        const msg = modal.querySelector('#welcome-msg');
        const btnLabel = modal.querySelector('#welcome-btn-label');
        const passInput = modal.querySelector('#welcome-pass');
        const passAgainInput = modal.querySelector('#welcome-pass2');
        const togglePass = modal.querySelector('#toggle-pass');

        function setMode(nextMode) {
            mode = nextMode;
            registerBtn.classList.toggle('is-active', nextMode === 'register');
            loginBtn.classList.toggle('is-active', nextMode === 'login');
            btnLabel.textContent = nextMode === 'register' ? 'Kayıt Ol' : 'Giriş Yap';
            passAgainInput.style.display = nextMode === 'register' ? 'block' : 'none';
            passAgainInput.required = nextMode === 'register';
            passAgainInput.value = '';
            passInput.autocomplete = nextMode === 'register' ? 'new-password' : 'current-password';
            msg.textContent = '';
        }

        registerBtn.addEventListener('click', () => setMode('register'));
        loginBtn.addEventListener('click', () => setMode('login'));
        togglePass.addEventListener('click', () => {
            passInput.type = passInput.type === 'password' ? 'text' : 'password';
            togglePass.textContent = passInput.type === 'password' ? '👁️' : '🙈';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = modal.querySelector('#welcome-name').value.trim();
            const password = modal.querySelector('#welcome-pass').value;
            const password2 = modal.querySelector('#welcome-pass2').value;

            if(mode === 'register' && password !== password2) {
                msg.textContent = 'Şifreler aynı değil.';
                msg.classList.add('error');
                return;
            }

            const submitBtn = form.querySelector('.welcome-submit');
            submitBtn.disabled = true;
            btnLabel.textContent = 'Yükleniyor…';

            let result = null;
            try {
                const ready = await waitForAuthReady(5000);
                if(!ready) {
                    throw new Error('Giriş servisi başlatılamadı. Tarayıcıyı kapatıp tekrar aç ve yeniden dene.');
                }
                const fn = mode === 'register' ? window.CBAuth?.register : window.CBAuth?.login;
                if(typeof fn !== 'function') {
                    throw new Error('Giriş servisi hazır değil. Sayfayı yenileyip tekrar deneyin.');
                }
                result = await Promise.race([
                    fn(username, password),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('İstek zaman aşımına uğradı. İnternetini kontrol edip tekrar dene.')), 10000))
                ]);
            } catch(err) {
                result = { ok: false, message: err?.message || 'İşlem sırasında beklenmeyen hata oluştu.' };
            } finally {
                submitBtn.disabled = false;
                btnLabel.textContent = mode === 'register' ? 'Kayıt Ol' : 'Giriş Yap';
            }

            if(result?.ok) {
                msg.textContent = '✅ Başarılı, yönlendiriliyorsun…';
                msg.classList.remove('error');
                msg.classList.add('success');
                setTimeout(() => {
                    close();
                    window.dispatchEvent(new CustomEvent('cbAuthRequiredResolved'));
                    const next = new URLSearchParams(window.location.search).get('next');
                    if(next) { window.location.href = decodeURIComponent(next); return; }
                    window.location.reload();
                }, 350);
                return;
            }

            msg.textContent = result?.message || 'İşlem başarısız.';
            msg.classList.remove('success');
            msg.classList.add('error');
        });

        return modal;
    }

    function open(opts = {}) {
        build();
        const title = modal.querySelector('.welcome-title');
        const sub = modal.querySelector('.welcome-sub');
        if(opts.mode === 'login') {
            modal.querySelector('#tab-login').click();
        } else {
            modal.querySelector('#tab-register').click();
        }
        if(opts.forced) {
            title.textContent = 'Giriş Zorunlu';
            sub.textContent = 'Oynamak için önce kayıt olmalı veya giriş yapmalısın.';
        } else {
            title.textContent = 'Hesabınla Devam Et';
            sub.textContent = 'Bölümlere girmek için kayıt olman veya giriş yapman gerekir.';
        }

        modal.classList.add('show');
        setTimeout(() => modal.querySelector('#welcome-name')?.focus(), 120);
    }

    function close() {
        if(modal) modal.classList.remove('show');
    }

    function requireAuth(opts = {}) {
        if(window.CBAuth && window.CBAuth.isLoggedIn && window.CBAuth.isLoggedIn()) return true;
        open({ forced: true, mode: opts.mode || 'login' });
        return false;
    }

    window.CBWelcome = { open, close, requireAuth };

    function autoPrompt() {
        if(!window.CBAuth) return;
        if(!window.CBAuth.isLoggedIn()) open({ forced: true });
    }

    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(autoPrompt, 250));
    } else {
        setTimeout(autoPrompt, 250);
    }
})();
