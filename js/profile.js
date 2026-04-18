/* ─────────────────────────────────────────────
   Çengel Bulmaca — Profil Modalı
   ───────────────────────────────────────────── */
(function(){
    let modalEl = null;

    function build() {
        if(modalEl) return modalEl;
        modalEl = document.createElement('div');
        modalEl.className = 'profile-overlay';
        modalEl.innerHTML = `
            <div class="profile-modal">
                <div class="profile-head">
                    <h2>👤 Profilim</h2>
                    <button class="profile-close" aria-label="Kapat">×</button>
                </div>
                <div class="profile-user" id="profile-user"></div>
                <div class="profile-stats" id="profile-stats"></div>
                <div class="profile-achievements" id="profile-achievements"></div>
                <div class="profile-admin" id="profile-admin" style="display:none;"></div>
                <div class="profile-actions">
                    <button class="welcome-btn profile-logout" id="profile-logout">Çıkış Yap</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);

        modalEl.addEventListener('click', (e) => {
            if(e.target === modalEl || e.target.classList.contains('profile-close')) close();
        });
        modalEl.querySelector('#profile-logout').onclick = () => {
            window.CBAuth?.signOut();
            close();
            window.CBWelcome?.open({ mode: 'login', forced: true });
        };
        return modalEl;
    }

    function getStats() {
        const user = window.CBAuth?.getUser() || null;
        const scores = JSON.parse(localStorage.getItem('cb_scores_local') || '{}');
        const daily = JSON.parse(localStorage.getItem('cb_daily') || '{}');
        const xp = JSON.parse(localStorage.getItem('cb_xp') || '{"xp":0,"level":1}');

        const entries = Object.values(scores);
        const solved = entries.length;
        const totalScore = entries.reduce((s, x) => s + (x.score || 0), 0);
        const perfect = entries.filter(x => (x.hints || 0) === 0).length;
        const avgTime = solved ? Math.round(entries.reduce((s, x) => s + (x.time || 0), 0) / solved) : 0;

        const dates = Object.keys(daily).sort().reverse();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let streak = 0;
        for(let i=0; i<dates.length; i++) {
            const d = new Date(dates[i]);
            const diff = Math.floor((today - d)/86400000);
            if(diff === i) streak++; else break;
        }

        return { user, solved, totalScore, perfect, avgTime, streak, xp };
    }

    function fmtTime(sec) {
        if(!sec) return '00:00';
        return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
    }

    function render() {
        const st = getStats();
        const userBox = modalEl.querySelector('#profile-user');
        const statsBox = modalEl.querySelector('#profile-stats');
        const achBox = modalEl.querySelector('#profile-achievements');
        const adminBox = modalEl.querySelector('#profile-admin');

        userBox.innerHTML = `
            <div class="pu-avatar">${(st.user?.name || '?')[0].toUpperCase()}</div>
            <div>
                <div class="pu-name">${st.user?.name || 'Misafir'}</div>
                <div class="pu-sub">Lv.${st.xp.level || 1} · ${st.xp.xp || 0} XP</div>
            </div>
        `;

        statsBox.innerHTML = `
            <div class="ps-item"><b>${st.solved}</b><span>Tamamlanan</span></div>
            <div class="ps-item"><b>${st.totalScore.toLocaleString('tr')}</b><span>Toplam Puan</span></div>
            <div class="ps-item"><b>${st.perfect}</b><span>Mükemmel</span></div>
            <div class="ps-item"><b>${fmtTime(st.avgTime)}</b><span>Ort. Süre</span></div>
            <div class="ps-item"><b>${st.streak}</b><span>Günlük Seri</span></div>
        `;

        const achievements = [
            { ok: st.solved >= 1, t: 'İlk Adım', d: 'İlk bulmacayı çöz' },
            { ok: st.solved >= 25, t: 'Çözücü', d: '25 bulmaca çöz' },
            { ok: st.perfect >= 5, t: 'Mükemmeliyet', d: '5 ipucusuz çözüm' },
            { ok: st.streak >= 7, t: 'Ateş Serisi', d: '7 günlük seri yap' }
        ];
        achBox.innerHTML = achievements.map(a => `
            <div class="ach ${a.ok ? 'ok' : ''}">
                <span>${a.ok ? '✅' : '🔒'}</span>
                <div><b>${a.t}</b><small>${a.d}</small></div>
            </div>
        `).join('');

        if(window.CBAuth?.isAdmin && window.CBAuth.isAdmin()) {
            adminBox.style.display = 'block';
            adminBox.innerHTML = `
                <div class="admin-box">
                    <h3>🛠 Admin Pipeline</h3>
                    <p>Bu panel sadece admin hesapta görünür.</p>
                    <div class="admin-actions">
                        <button class="welcome-btn admin-btn" id="admin-repeat">Tekrar Analizi</button>
                        <button class="welcome-btn admin-btn" id="admin-template">Şablon İndir</button>
                    </div>
                    <pre class="admin-log" id="admin-log">Hazır.</pre>
                </div>
            `;
            setupAdminTools();
        } else {
            adminBox.style.display = 'none';
            adminBox.innerHTML = '';
        }
    }

    function setupAdminTools() {
        const log = modalEl.querySelector('#admin-log');
        const repeatBtn = modalEl.querySelector('#admin-repeat');
        const tplBtn = modalEl.querySelector('#admin-template');
        if(!log || !repeatBtn || !tplBtn) return;

        repeatBtn.onclick = () => {
            const seen = JSON.parse(localStorage.getItem('cb_seen_clues') || '{}');
            const top = Object.entries(seen).sort((a,b) => b[1]-a[1]).slice(0, 12);
            if(top.length === 0) {
                log.textContent = 'Henüz analiz için veri yok.';
                return;
            }
            log.textContent = top.map(([k,v], i) => `${i+1}. (${v}x) ${k}`).join('\n');
        };

        tplBtn.onclick = () => {
            const template = {
                title: 'Yeni Zor Bulmaca',
                difficulty: 'Zor',
                rules: ['Cevabı ipucunda geçirme', 'Önceki clue tekrarını en aza indir', 'Yeni kelime havuzu kullan'],
                words: [{ clue: '', answer: '', direction: 'across', row: 0, col: 0, length: 0 }]
            };
            const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'admin_puzzle_template.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 500);
        };
    }

    function open() {
        build();
        render();
        modalEl.classList.add('show');
    }

    function close() {
        if(modalEl) modalEl.classList.remove('show');
    }

    window.CBProfile = { open, close };
})();
