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
            const avatar = user.photoURL
                ? `<img src="${user.photoURL}" alt="" class="sb-avatar">`
                : `<div class="sb-avatar sb-avatar-fallback">${(user.name||'?')[0].toUpperCase()}</div>`;
            authDiv.innerHTML = `
                <div class="sb-me">
                    ${avatar}
                    <div class="sb-me-info">
                        <div class="sb-me-name">${escapeHtml(user.name)}</div>
                        <div class="sb-me-sub">${user.email || 'Yerel oyuncu'}</div>
                    </div>
                    <button class="sb-signout">Çıkış</button>
                </div>
            `;
            authDiv.querySelector('.sb-signout').onclick = async () => {
                await window.CBAuth.signOut();
                render();
            };
        } else {
            authDiv.innerHTML = `
                <div class="sb-signin-box">
                    <p>Skorunu kaydet, sıralamada yerini al.</p>
                    <button class="sb-google-btn">
                        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                        Google ile Giriş Yap
                    </button>
                </div>
            `;
            authDiv.querySelector('.sb-google-btn').onclick = async () => {
                const ok = await window.CBAuth.signIn();
                if(ok) render();
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
            const avatar = isMe && e.photoURL
                ? `<img src="${e.photoURL}" alt="" class="sb-row-avatar">`
                : `<div class="sb-row-avatar sb-avatar-fallback">${(e.name||'?')[0].toUpperCase()}</div>`;

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
                        <div class="sb-row-sub">${e.completedCount}/100 tamamlandı</div>
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
                        <div class="sb-row-sub">${count}/100 tamamlandı</div>
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
