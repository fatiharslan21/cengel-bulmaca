/* ─────────────────────────────────────────────
   Çengel Bulmaca — Kayıt/Giriş Modalı
   ───────────────────────────────────────────── */
(function(){
    let modal = null;

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

                <div style="display:flex;gap:8px;margin-bottom:10px;">
                    <button type="button" class="welcome-btn" id="tab-register" style="flex:1;">Kayıt Ol</button>
                    <button type="button" class="welcome-btn" id="tab-login" style="flex:1;background:var(--panel-2);color:var(--text)">Giriş Yap</button>
                </div>

                <form class="welcome-form" id="welcome-form">
                    <input type="text" id="welcome-name" placeholder="Kullanıcı adı" maxlength="24" autocomplete="username" spellcheck="false" required>
                    <input type="password" id="welcome-pass" placeholder="Şifre" minlength="4" autocomplete="current-password" required>
                    <button type="submit" class="welcome-btn"><span id="welcome-btn-label">Kayıt Ol</span></button>
                </form>
                <p id="welcome-msg" class="welcome-note" style="justify-content:center;min-height:20px"></p>
            </div>
        `;
        document.body.appendChild(modal);

        let mode = 'register';
        const registerBtn = modal.querySelector('#tab-register');
        const loginBtn = modal.querySelector('#tab-login');
        const form = modal.querySelector('#welcome-form');
        const msg = modal.querySelector('#welcome-msg');
        const btnLabel = modal.querySelector('#welcome-btn-label');

        function setMode(nextMode) {
            mode = nextMode;
            const onStyle = 'flex:1;';
            const offStyle = 'flex:1;background:var(--panel-2);color:var(--text)';
            registerBtn.setAttribute('style', nextMode === 'register' ? onStyle : offStyle);
            loginBtn.setAttribute('style', nextMode === 'login' ? onStyle : offStyle);
            btnLabel.textContent = nextMode === 'register' ? 'Kayıt Ol' : 'Giriş Yap';
            msg.textContent = '';
        }

        registerBtn.addEventListener('click', () => setMode('register'));
        loginBtn.addEventListener('click', () => setMode('login'));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = modal.querySelector('#welcome-name').value.trim();
            const password = modal.querySelector('#welcome-pass').value;

            const submitBtn = form.querySelector('.welcome-btn');
            submitBtn.disabled = true;
            btnLabel.textContent = 'Yükleniyor…';

            const fn = mode === 'register' ? window.CBAuth.register : window.CBAuth.login;
            const result = await fn(username, password);

            submitBtn.disabled = false;
            btnLabel.textContent = mode === 'register' ? 'Kayıt Ol' : 'Giriş Yap';

            if(result?.ok) {
                msg.textContent = '✅ Başarılı, yönlendiriliyorsun…';
                msg.style.color = 'var(--green)';
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
            msg.style.color = '#ef4444';
        });

        return modal;
    }

    function open(opts = {}) {
        build();
        const title = modal.querySelector('.welcome-title');
        const sub = modal.querySelector('.welcome-sub');
        if(opts.mode === 'login') {
            modal.querySelector('#tab-login').click();
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
