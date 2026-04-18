/* ─────────────────────────────────────────────
   Çengel Bulmaca — Kayıt/Giriş Modalı
   ───────────────────────────────────────────── */
(function(){
    let modal = null;
    let authLoadAttempted = false;

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
        return false;
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
