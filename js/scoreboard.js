/* ─────────────────────────────────────────────
   Çengel Bulmaca — Scoreboard UI
   ───────────────────────────────────────────── */
(function(){
    let modalEl = null;

    function build() {
        if(modalEl) return modalEl;
        modalEl = document.createElement('div');
        modalEl.className = 'sb-overlay';
        modalEl.innerHTML = `
            <div class="sb-modal">
                <div class="sb-header">
                    <h2>🏆 Puan Tablosu</h2>
                    <button class="sb-close" aria-label="Kapat">×</button>
                </div>
                <div class="sb-auth" id="sb-auth"></div>
                <div class="sb-list" id="sb-list">
                    <div class="sb-loading">Yükleniyor…</div>
                </div>
                <p class="sb-foot">Diğer oyuncuların isimlerinin sadece ilk harfi gösterilir.</p>
            </div>
        `;
        document.body.appendChild(modalEl);

        modalEl.addEventListener('click', (e) => {
            if(e.target === modalEl || e.target.classList.contains('sb-close')) close();
        });
        return modalEl;
    }

    async function open() {
        build();
        modalEl.classList.add('show');
        await render();
    }

    function close() {
        if(!modalEl) return;
        modalEl.classList.remove('show');
    }

    async function render() {
        const user = window.CBAuth.getUser();
        const authDiv = modalEl.querySelector('#sb-auth');
        const listDiv = modalEl.querySelector('#sb-list');

        if(user) {
            const initial = (user.name||'?')[0].toUpperCase();
            authDiv.innerHTML = `
                <div class="sb-me">
                    <div class="sb-avatar sb-avatar-fallback">${initial}</div>
                    <div class="sb-me-info">
                        <div class="sb-me-name">${escapeHtml(user.name)}</div>
                        <div class="sb-me-sub">${window.CBAuth.isFirebaseReady() ? '☁️ Bulut senkronize' : '📱 Yerel oyuncu'}</div>
                    </div>
                    <button class="sb-signout">Çıkış Yap</button>
                </div>
            `;
            authDiv.querySelector('.sb-signout').onclick = () => {
                if(window.CBAuth){ window.CBAuth.signOut(); }
                window.CBWelcome && window.CBWelcome.open({ mode: 'login', forced: true });
                render();
            };
        } else {
            authDiv.innerHTML = `
                <div class="sb-signin-box">
                    <p>Henüz giriş yapılmamış.</p>
                    <button class="sb-google-btn">
                        <span>✨</span> Giriş / Kayıt
                    </button>
                </div>
            `;
            authDiv.querySelector('.sb-google-btn').onclick = () => {
                window.CBWelcome && window.CBWelcome.open();
            };
        }

        listDiv.innerHTML = '<div class="sb-loading">Sıralama yükleniyor…</div>';
        const list = await window.CBAuth.getLeaderboard(50);
        renderList(list, user);
    }

    function renderList(list, me) {
        const listDiv = modalEl.querySelector('#sb-list');
        if(!list || list.length === 0) {
            listDiv.innerHTML = '<div class="sb-empty">Henüz kimse yok. İlk sen ol!</div>';
            return;
        }
        const meIdx = me ? list.findIndex(x => x.uid === me.uid) : -1;

        const rows = list.map((e, i) => {
            const rank = i + 1;
            const isMe = me && e.uid === me.uid;
            const displayName = isMe ? escapeHtml(e.name) : window.CBAuth.maskName(e.name);
            const avatar = `<div class="sb-row-avatar sb-avatar-fallback">${(e.name||'?')[0].toUpperCase()}</div>`;

            let medal = '';
            if(rank === 1) medal = '<span class="sb-medal gold">🥇</span>';
            else if(rank === 2) medal = '<span class="sb-medal silver">🥈</span>';
            else if(rank === 3) medal = '<span class="sb-medal bronze">🥉</span>';
            else medal = `<span class="sb-rank">#${rank}</span>`;

            return `
                <div class="sb-row ${isMe ? 'me' : ''}">
                    ${medal}
                    ${avatar}
                    <div class="sb-row-info">
                        <div class="sb-row-name">${displayName}${isMe ? ' <span class="sb-you">sen</span>' : ''}</div>
                        <div class="sb-row-sub">${e.completedCount}/750 tamamlandı</div>
                    </div>
                    <div class="sb-row-score">${e.totalScore.toLocaleString('tr')}</div>
                </div>
            `;
        }).join('');

        // Eğer kullanıcı top listede değilse en alta kendini göster
        let tail = '';
        if(me && meIdx === -1) {
            const local = window.CBAuth.getLeaderboard ? null : null;
            // Local veri ile hesapla
            const oldScores = JSON.parse(localStorage.getItem('cb') || '{}');
            const total = Object.values(oldScores).reduce((s, x) => s + (x.s || 0), 0);
            const count = Object.keys(oldScores).length;
            tail = `
                <div class="sb-divider">Sen</div>
                <div class="sb-row me">
                    <span class="sb-rank">—</span>
                    <div class="sb-row-avatar sb-avatar-fallback">${(me.name||'?')[0].toUpperCase()}</div>
                    <div class="sb-row-info">
                        <div class="sb-row-name">${escapeHtml(me.name)} <span class="sb-you">sen</span></div>
                        <div class="sb-row-sub">${count}/750 tamamlandı</div>
                    </div>
                    <div class="sb-row-score">${total.toLocaleString('tr')}</div>
                </div>
            `;
        }

        listDiv.innerHTML = rows + tail;
    }

    function escapeHtml(s) {
        if(!s) return '';
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    window.CBScoreboard = { open, close };
})();
