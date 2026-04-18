/* ─────────────────────────────────────────────
   Çengel Bulmaca — Hoş Geldin Modal (İsim Girişi)
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
                <h2 class="welcome-title">Hoş geldin!</h2>
                <p class="welcome-sub">İsmini gir, puan tablosunda yerini al.</p>
                <form class="welcome-form" id="welcome-form">
                    <input type="text" id="welcome-name" placeholder="Adın veya rumuzun" maxlength="24" autocomplete="off" spellcheck="false" required>
                    <button type="submit" class="welcome-btn">
                        <span>Başla</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                </form>
                <p class="welcome-note">
                    <span>🔒</span>
                    Diğer oyuncular isminin sadece ilk harfini görür.
                </p>
            </div>
        `;
        document.body.appendChild(modal);
        const input = modal.querySelector('#welcome-name');
        const form = modal.querySelector('#welcome-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = input.value.trim();
            if(!name) return;

            const btn = form.querySelector('.welcome-btn');
            const btnText = btn.querySelector('span');
            const prevText = btnText.textContent;
            btn.disabled = true;
            btnText.textContent = 'Yükleniyor…';

            const result = await window.CBAuth.setName(name);

            btn.disabled = false;
            btnText.textContent = prevText;

            if(result?.changed) {
                // Yeni/farklı kullanıcı — sayfa yenilenerek güncel skorlar yansır
                window.location.reload();
                return;
            }
            close();
        });
        return modal;
    }

    function open(opts = {}) {
        build();
        const input = modal.querySelector('#welcome-name');
        const title = modal.querySelector('.welcome-title');
        const sub = modal.querySelector('.welcome-sub');
        if(opts.mode === 'edit') {
            title.textContent = 'İsmini Değiştir';
            sub.textContent = 'Yeni ismin puan tablosunda görünecek.';
            input.value = (window.CBAuth.getUser()?.name) || '';
        } else {
            title.textContent = 'Hoş geldin!';
            sub.textContent = 'İsmini gir, puan tablosunda yerini al.';
            input.value = '';
        }
        modal.classList.add('show');
        setTimeout(() => input.focus(), 200);
    }

    function close() {
        if(modal) modal.classList.remove('show');
    }

    window.CBWelcome = { open, close };

    // İlk ziyaret: isim yoksa otomatik aç
    function autoPrompt() {
        if(!window.CBAuth) return;
        const user = window.CBAuth.getUser();
        if(!user || !user.name) open();
    }

    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(autoPrompt, 600));
    } else {
        setTimeout(autoPrompt, 600);
    }
})();
