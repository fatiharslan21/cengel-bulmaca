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
        window.CBAuth = {
            async enter(username) {
                const clean = (username || '').trim();
                if(clean.length < 3) return { ok:false, message:'Kullanıcı adı en az 3 karakter olmalı.' };
                const key = normalizeName(clean);
                if(!key) return { ok:false, message:'Geçerli bir kullanıcı adı girin.' };
                const all = getAccounts();
                if(!all[key]) all[key] = { username: clean, createdAt: Date.now() };
                setAccounts(all);
                setUser(key, all[key].username || clean);
                return { ok:true, mode:'enter' };
            },
            register(username) { return this.enter(username); },
            login(username) { return this.enter(username); },
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
                <h2 class="welcome-title">İsminle Devam Et</h2>
                <p class="welcome-sub">Sadece kullanıcı adı gir, doğrudan oyuna başla.</p>

                <form class="welcome-form" id="welcome-form">
                    <input type="text" id="welcome-name" placeholder="Benzersiz kullanıcı adı" maxlength="24" autocomplete="username" spellcheck="false" required>
                    <button type="submit" class="welcome-btn welcome-submit"><span id="welcome-btn-label">Oyuna Gir</span></button>
                </form>
                <p id="welcome-msg" class="welcome-note"></p>
            </div>
        `;
        document.body.appendChild(modal);
        const form = modal.querySelector('#welcome-form');
        const msg = modal.querySelector('#welcome-msg');
        const btnLabel = modal.querySelector('#welcome-btn-label');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = modal.querySelector('#welcome-name').value.trim();

            const submitBtn = form.querySelector('.welcome-submit');
            submitBtn.disabled = true;
            btnLabel.textContent = 'Yükleniyor…';

            let result = null;
            try {
                const ready = await waitForAuthReady(5000);
                if(!ready) {
                    throw new Error('Giriş servisi başlatılamadı. Tarayıcıyı kapatıp tekrar aç ve yeniden dene.');
                }
                const fn = window.CBAuth?.enter || window.CBAuth?.login || window.CBAuth?.register;
                if(typeof fn !== 'function') {
                    throw new Error('Giriş servisi hazır değil. Sayfayı yenileyip tekrar deneyin.');
                }
                result = await Promise.race([
                    fn(username),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('İstek zaman aşımına uğradı. İnternetini kontrol edip tekrar dene.')), 10000))
                ]);
            } catch(err) {
                result = { ok: false, message: err?.message || 'İşlem sırasında beklenmeyen hata oluştu.' };
            } finally {
                submitBtn.disabled = false;
                btnLabel.textContent = 'Oyuna Gir';
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
        if(opts.forced) {
            title.textContent = 'Giriş Zorunlu';
            sub.textContent = 'Oynamak için benzersiz kullanıcı adı girmen yeterli.';
        } else {
            title.textContent = 'İsminle Devam Et';
            sub.textContent = 'Sadece kullanıcı adı gir, skor tablosunda yerini al.';
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
