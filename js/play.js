/* Çengel Bulmaca — Motor v5 Premium+ */
// SES MOTORU (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const SOUND_ON = () => JSON.parse(localStorage.getItem('cb_settings') || '{"sound":true}').sound !== false;

function playSFX(type) {
    if(!SOUND_ON()) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    const tone = (freq, dur, type='sine', vol=.08, slide=null) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if(slide) osc.frequency.exponentialRampToValueAtTime(slide, now + dur);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + dur);
    };

    if(type === 'click') tone(400, 0.05, 'sine', .05, 100);
    else if(type === 'type') tone(300, 0.03, 'sine', .04);
    else if(type === 'solve') {
        // Arpej: başarı sesi
        [523, 659, 784, 1046].forEach((f, i) => {
            setTimeout(() => tone(f, .2, 'triangle', .08), i * 60);
        });
    }
    else if(type === 'error') tone(150, 0.15, 'square', .06);
    else if(type === 'win') {
        // Zafer fanfarı
        [523, 659, 784, 1046, 1318].forEach((f, i) => {
            setTimeout(() => tone(f, .3, 'triangle', .1), i * 80);
        });
    }
    else if(type === 'hint') tone(800, 0.12, 'sine', .05, 1200);
}

function getThemeFX() {
    const t = document.body.dataset.theme || (document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    if(t === 'ocean') {
        return {
            burst: ['#0EA5E9','#22D3EE','#14B8A6','#67E8F9'],
            glow: 'rgba(14,165,233,.45)',
            stream: 'rgba(34,211,238,.65)',
            stars: ['🌊','✨','🫧']
        };
    }
    if(t === 'sunset') {
        return {
            burst: ['#FB923C','#F97316','#F43F5E','#FDBA74'],
            glow: 'rgba(249,115,22,.45)',
            stream: 'rgba(251,146,60,.7)',
            stars: ['🌇','✨','🔥']
        };
    }
    if(t === 'dark') {
        return {
            burst: ['#60A5FA','#A78BFA','#22D3EE','#C4B5FD'],
            glow: 'rgba(96,165,250,.4)',
            stream: 'rgba(167,139,250,.7)',
            stars: ['🌙','✨','💫']
        };
    }
    return {
        burst: ['#16A34A','#22C55E','#4ADE80','#3B82F6'],
        glow: 'rgba(22,163,74,.4)',
        stream: 'rgba(59,130,246,.65)',
        stars: ['⭐','✨','💫']
    };
}

function burstParticles(x, y, colors = ['#16A34A','#22C55E','#4ADE80']) {
    for(let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 6 + 3;
        const angle = (Math.PI * 2 * i) / 12;
        const dist = Math.random() * 60 + 30;
        p.style.cssText = `
            left: ${x}px; top: ${y}px;
            width: ${size}px; height: ${size}px;
            background: ${colors[i % colors.length]};
            --dx: ${Math.cos(angle) * dist}px;
            --dy: ${Math.sin(angle) * dist - 20}px;
            box-shadow: 0 0 ${size*2}px ${colors[i % colors.length]};
        `;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1000);
    }
}

function starBurst(x, y) {
    const symbols = getThemeFX().stars;
    symbols.forEach((s, i) => {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'star-burst';
            el.textContent = s;
            el.style.left = (x + (Math.random() - .5) * 40) + 'px';
            el.style.top = (y + (Math.random() - .5) * 20) + 'px';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1200);
        }, i * 80);
    });
}

function showCombo(text) {
    const el = document.createElement('div');
    el.className = 'combo-badge';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
}
let sel=null,dir="across",ug={},rev=new Set(),wrg=new Set(),slv=new Set(),lck=new Set();
let hc=0,tm=0,tint=null,run=false,acl=null;
let lastSolveTime = 0, streakCount = 0;
let flowTimer = null;
const R=P.grid_size_r,C=P.grid_size_c;
const GAME_MODE = (window.CB_GAME_MODE || 'classic').toLowerCase();
const MODE_CONF = {
    classic: { label:'Klasik', maxTime: null, hintAllowed: true, hintPenalty: 15, timeBonus: true },
    sprint: { label:'Sprint 3dk', maxTime: 180, hintAllowed: true, hintPenalty: 20, timeBonus: true },
    zen: { label:'Zen', maxTime: null, hintAllowed: true, hintPenalty: 10, timeBonus: false },
    hardcore: { label:'Hardcore', maxTime: null, hintAllowed: false, hintPenalty: 30, timeBonus: true }
};
const ACTIVE_MODE = MODE_CONF[GAME_MODE] || MODE_CONF.classic;

function TR(c){
    const ch = (c == null ? '' : String(c)).trim();
    if(!ch) return '';
    const m={'i':'İ','ı':'I','ö':'Ö','ü':'Ü','ş':'Ş','ç':'Ç','ğ':'Ğ','İ':'İ','I':'I','Ö':'Ö','Ü':'Ü','Ş':'Ş','Ç':'Ç','Ğ':'Ğ'};
    return m[ch] || ch.toLocaleUpperCase('tr-TR');
}

function saveLastPlayed(done=false){
    try{
        const now = new Date();
        const when = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        localStorage.setItem('cb_last', JSON.stringify({id: PID, when, done: !!done}));
    }catch(e){}
}

function init(){
    saveLastPlayed(false);
    mkGrid();
    mkClues();
    setupKB();
    setupMicroInteractions();
    updProg();
}

function mkGrid(){
    const g=document.getElementById('grid');
    const frame = document.querySelector('.grid-frame');
    if(frame && !frame.querySelector('.word-flow')) {
        const wf = document.createElement('div');
        wf.className = 'word-flow';
        frame.appendChild(wf);
    }
    g.style.setProperty('--cols', C);
    const nums={};
    P.words.forEach(w=>{const k=`${w.row}-${w.col}`;if(!nums[k])nums[k]=w.number});
    for(let r=0;r<R;r++)for(let c=0;c<C;c++){
        const el=document.createElement('div');
        el.className='cell';el.dataset.r=r;el.dataset.c=c;
        if(!P.grid[r][c])el.classList.add('bk');
        else{
            if(nums[`${r}-${c}`]){const n=document.createElement('span');n.className='nm';n.textContent=nums[`${r}-${c}`];el.appendChild(n)}
            const l=document.createElement('span');l.className='lt';el.appendChild(l);
            el.addEventListener('click',()=>clickC(r,c));
        }
        g.appendChild(el);
    }
    fitGrid();
    window.addEventListener('resize', fitGrid);
    window.addEventListener('orientationchange', () => setTimeout(fitGrid, 100));
}

function fitGrid(){
    const frame = document.querySelector('.grid-frame');
    const grid = document.getElementById('grid');
    if(!frame || !grid) return;
    const framePadding = 16;
    const available = frame.clientWidth - framePadding;
    const gapTotal = (C - 1) * 2 + 4;
    const maxCellBySpace = Math.floor((available - gapTotal) / C);
    const isMobile = window.innerWidth <= 768;
    const minCell = isMobile ? 16 : 22;
    const maxCell = isMobile ? 38 : 42;
    const size = Math.max(minCell, Math.min(maxCell, maxCellBySpace));
    grid.style.setProperty('--cell-size', size + 'px');
    if(maxCellBySpace < minCell) {
        frame.classList.add('show-hint');
    } else {
        frame.classList.remove('show-hint');
    }
    drawWordFlow();
}


function cleanClueText(clue){
    return String(clue || '')
        .replace(/\s*\(\d+\s*harf\)\s*/gi, ' ')
        .replace(/\s*\[B\d+-S\d+\]\s*/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function mkClues(){
    const a=document.getElementById('cla'),d=document.getElementById('cld');
    P.words.filter(w=>w.direction==='across').sort((x,y)=>x.number-y.number).forEach(w=>a.appendChild(mkCI(w)));
    P.words.filter(w=>w.direction==='down').sort((x,y)=>x.number-y.number).forEach(w=>{const e=mkCI(w);e.classList.add('cid');d.appendChild(e)});
}

function firstEditableCell(w){
    for(let i=0;i<w.length;i++){
        const r=w.direction==='down'?w.row+i:w.row;
        const c=w.direction==='across'?w.col+i:w.col;
        const k=`${r}-${c}`;
        if(lck.has(k)) continue;
        const current = ug[k];
        const expected = TR(w.answer[i]);
        if(!current || TR(current)!==expected) return {row:r,col:c};
    }
    return {row:w.row,col:w.col};
}

function mkCI(w){
    const e=document.createElement('div');
    e.className='ci';e.dataset.n=w.number;e.dataset.d=w.direction;
    e.innerHTML=`<span class="cin">${w.number}.</span>${cleanClueText(w.clue)}`;
    e.addEventListener('click',()=>{dir=w.direction;acl=w;sel=firstEditableCell(w);if(!run)startTm();updUI();
        e.scrollIntoView({block:'nearest',behavior:'smooth'})});
    return e;
}

function setupKB(){
    document.addEventListener('keydown',onK);
    document.querySelectorAll('.key').forEach(b=>b.addEventListener('click',e=>{
        e.preventDefault();
        // MOBİL İÇİN HAPTİK TİTREŞİM EKLENDİ
        if(navigator.vibrate) navigator.vibrate(15); 
        
        const k=b.dataset.k;
        onK({key:k==='BS'?'Backspace':k,length:k.length,preventDefault:()=>{}});
    }));
}

function setupMicroInteractions(){
    const cards = document.querySelectorAll('.grid-frame, .clue-strip, .toolbar, .progress-bar, .play-hdr');
    cards.forEach(card => {
        card.classList.add('micro-card');
        card.addEventListener('mousemove', (e) => {
            if(window.innerWidth <= 900) return;
            const rect = card.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width - .5) * 2;
            const py = ((e.clientY - rect.top) / rect.height - .5) * 2;
            card.style.setProperty('--rx', `${(-py * 2.2).toFixed(2)}deg`);
            card.style.setProperty('--ry', `${(px * 2.6).toFixed(2)}deg`);
            card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
            card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
        });
        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--rx', '0deg');
            card.style.setProperty('--ry', '0deg');
            card.style.setProperty('--mx', '50%');
            card.style.setProperty('--my', '0%');
        });
    });

    const pressables = document.querySelectorAll('.key, .tool, .icon-btn, .nav-btn, .mbtn');
    const press = (el) => {
        el.classList.remove('spring-release');
        el.classList.add('spring-press');
    };
    const release = (el) => {
        el.classList.remove('spring-press');
        el.classList.add('spring-release');
        setTimeout(() => el.classList.remove('spring-release'), 220);
    };
    pressables.forEach(el => {
        el.addEventListener('pointerdown', () => press(el));
        el.addEventListener('pointerup', () => release(el));
        el.addEventListener('pointerleave', () => release(el));
        el.addEventListener('pointercancel', () => release(el));
    });
}

function clickC(r,c){
    if(!P.grid[r][c])return;
    if(sel&&sel.row===r&&sel.col===c)dir=dir==='across'?'down':'across';
    else sel={row:r,col:c};
    if(!run)startTm();
    let w=findW(r,c,dir);
    if(!w){const alt=dir==='across'?'down':'across';w=findW(r,c,alt);if(w)dir=alt}
    if(w){acl=w; if(sel && sel.row===r && sel.col===c && ug[`${r}-${c}`]) sel=firstEditableCell(w);}
    updUI();
}

function onK(e){
    if(!sel)return;
    const{row:r,col:c}=sel,k=`${r}-${c}`;
    if(e.key==='Tab'){e.preventDefault();doDir();return}
    if(e.key==='ArrowUp'){e.preventDefault();mv(-1,0);return}
    if(e.key==='ArrowDown'){e.preventDefault();mv(1,0);return}
    if(e.key==='ArrowLeft'){e.preventDefault();mv(0,-1);return}
    if(e.key==='ArrowRight'){e.preventDefault();mv(0,1);return}
    
    if(e.key==='Backspace'){
        e.preventDefault();
        if(lck.has(k)){const p=prev(r,c);if(p)sel=p}
        else if(ug[k]){delete ug[k];wrg.delete(k)}
        else{const p=prev(r,c);if(p){sel=p;const pk=`${p.row}-${p.col}`;if(!lck.has(pk)){delete ug[pk];wrg.delete(pk)}}}
        updUI();return;
    }
    
    if(e.key.length===1&&/[a-zA-ZçÇğĞıİöÖşŞüÜ]/.test(e.key)){
        e.preventDefault();
        if(lck.has(k)){nextOpen(r,c);updUI();return}
        ug[k]=TR(e.key);wrg.delete(k);
        playSFX('type');
        // Pop animation
        const cell=getCell(r,c);
        if(cell){
            const lt=cell.querySelector('.lt');
            if(lt){lt.classList.remove('pop');void lt.offsetWidth;lt.classList.add('pop')}
            // Ripple
            const ripple = document.createElement('div');
            ripple.className = 'cell-ripple';
            const size = cell.offsetWidth;
            ripple.style.cssText = `width:${size}px;height:${size}px;top:0;left:0;`;
            cell.appendChild(ripple);
            setTimeout(() => ripple.remove(), 500);
        }
        chkComp();
        nextOpen(r,c);
        updUI();
    }
}

function prev(r,c){
    const nr=dir==='down'?r-1:r,nc=dir==='across'?c-1:c;
    if(nr>=0&&nc>=0&&P.grid[nr]?.[nc])return{row:nr,col:nc};
    return null;
}

function nextOpen(r,c){
    let nr=dir==='down'?r+1:r,nc=dir==='across'?c+1:c;
    while(nr<R&&nc<C&&P.grid[nr]?.[nc]){
        if(!lck.has(`${nr}-${nc}`)){sel={row:nr,col:nc};return}
        if(dir==='down')nr++;else nc++;
    }
}

function mv(dr,dc){
    if(!sel)return;
    let r=sel.row+dr,c=sel.col+dc;
    while(r>=0&&r<R&&c>=0&&c<C){if(P.grid[r][c]){sel={row:r,col:c};updUI();return}r+=dr;c+=dc}
}

function getCell(r,c){return document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`)}

function findW(r,c,d){
    return P.words.find(w=>{
        if(w.direction!==d)return false;
        for(let i=0;i<w.length;i++){
            const wr=w.direction==='down'?w.row+i:w.row,wc=w.direction==='across'?w.col+i:w.col;
            if(wr===r&&wc===c)return true;
        }return false;
    });
}

function wCells(w){
    const c=[];for(let i=0;i<w.length;i++)c.push(`${w.direction==='down'?w.row+i:w.row}-${w.direction==='across'?w.col+i:w.col}`);return c;
}

// ─── TAMAMLANMA ───
function chkComp(){
    let newSolve=false;
    P.words.forEach(w=>{
        const wk=`${w.number}-${w.direction}`;
        if(slv.has(wk))return;
        let ok=true;
        for(let i=0;i<w.length;i++){
            const r=w.direction==='down'?w.row+i:w.row,c=w.direction==='across'?w.col+i:w.col;
            const v=ug[`${r}-${c}`];
            if(!v||TR(v)!==TR(w.answer[i])){ok=false;break}
        }
        if(ok){
            slv.add(wk); newSolve=true;
            wCells(w).forEach(k=>lck.add(k));

            playSFX('solve');
            if(navigator.vibrate) navigator.vibrate([30, 40, 30]);

            // Kelimenin her hücresinde dalga animasyonu
            wCells(w).forEach((k, idx) => {
                const [r, c] = k.split('-').map(Number);
                const cell = getCell(r, c);
                if(cell) {
                    setTimeout(() => {
                        cell.style.animation = 'none';
                        cell.offsetHeight;
                        cell.style.animation = 'wordWave .4s ease forwards';
                    }, idx * 40);
                }
            });

            // Kelimenin ortasındaki hücreyi bulup puanı oradan uçuralım
            const midIndex = Math.floor(w.length / 2);
            const midR = w.direction === 'down' ? w.row + midIndex : w.row;
            const midC = w.direction === 'across' ? w.col + midIndex : w.col;
            const targetCell = getCell(midR, midC);

            if(targetCell) {
                const rect = targetCell.getBoundingClientRect();
                const cx = rect.left + rect.width/2;
                const cy = rect.top + rect.height/2;
                const fx = getThemeFX();

                // Combo sistemi
                const now = Date.now();
                if(now - lastSolveTime < 8000) streakCount++;
                else streakCount = 1;
                lastSolveTime = now;

                const floater = document.createElement('div');
                floater.className = 'floating-score';
                const bonus = streakCount >= 3 ? ` x${streakCount}` : '';
                floater.textContent = '+' + (10 * (streakCount >= 3 ? streakCount : 1)) + bonus;
                floater.style.left = `${rect.left + window.scrollX}px`;
                floater.style.top = `${rect.top + window.scrollY}px`;
                document.body.appendChild(floater);
                setTimeout(() => floater.remove(), 1200);

                // Particle burst
                burstParticles(cx, cy, fx.burst);
                glowPulse(cx, cy, fx.glow);
                starBurst(cx, cy);

                // Combo badge
                if(streakCount === 3) showCombo('COMBO ×3!');
                else if(streakCount === 5) showCombo('İNANILMAZ ×5!');
                else if(streakCount >= 7) showCombo('EFSANE ×' + streakCount + '!');
            }
        }
    });
    updProg();
    if(slv.size===P.words.length)setTimeout(showWin,300);
}

function doHint(){
    if(!ACTIVE_MODE.hintAllowed){
        showCombo('Bu modda ipucu kapalı!');
        playSFX('error');
        return;
    }
    if(!sel)return;
    let w=findW(sel.row,sel.col,dir);
    if(!w)w=findW(sel.row,sel.col,dir==='across'?'down':'across');
    if(!w)return;
    for(let i=0;i<w.length;i++){
        const r=w.direction==='down'?w.row+i:w.row,c=w.direction==='across'?w.col+i:w.col,k=`${r}-${c}`;
        if(!ug[k]||TR(ug[k])!==TR(w.answer[i])){
            ug[k]=TR(w.answer[i]);rev.add(k);wrg.delete(k);hc++;
            playSFX('hint');
            if(navigator.vibrate) navigator.vibrate(20);
            chkComp();updUI();break;
        }
    }
}

function doCheck(){
    wrg.clear();let bad=false;
    Object.entries(ug).forEach(([k,v])=>{
        if(lck.has(k))return;
        const[r,c]=k.split('-').map(Number);
        for(const w of P.words){for(let i=0;i<w.length;i++){
            const wr=w.direction==='down'?w.row+i:w.row,wc=w.direction==='across'?w.col+i:w.col;
            if(wr===r&&wc===c){if(TR(v)!==TR(w.answer[i])){wrg.add(k);bad=true}return}
        }}
    });
    if(bad) {
        playSFX('error');
        if(navigator.vibrate) navigator.vibrate([20, 40, 20]);
        wrg.forEach(k=>{const[r,c]=k.split('-');const el=getCell(+r,+c);
            if(el){el.classList.add('shake');setTimeout(()=>el.classList.remove('shake'),300)}});
    } else {
        playSFX('click');
    }
    updUI();
}

function doDir(){
    dir=dir==='across'?'down':'across';
    if(sel){const w=findW(sel.row,sel.col,dir);if(w)acl=w}
    updUI();
}

function startTm(){run=true;tint=setInterval(()=>{tm++;document.getElementById('tm').textContent=fmt(tm);if(ACTIVE_MODE.maxTime && tm>=ACTIVE_MODE.maxTime){clearInterval(tint);showWin();}},1000)}
const fmt=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;


function getXPState(){
    try { return JSON.parse(localStorage.getItem('cb_xp') || '{"xp":0,"level":1}'); } catch(e){ return {xp:0, level:1}; }
}

function xpForLevel(level){
    return 120 + (level - 1) * 80;
}

function grantXP(baseScore, perfect=false){
    const st = getXPState();
    let gain = Math.max(10, Math.round(baseScore / 10));
    if(perfect) gain += 50;
    let xp = (st.xp || 0) + gain;
    let level = st.level || 1;
    let leveledUp = false;
    while(xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level += 1;
        leveledUp = true;
    }
    localStorage.setItem('cb_xp', JSON.stringify({ xp, level }));
    return { gain, level, xp, next: xpForLevel(level), leveledUp };
}

function showXPFloater(info){
    const box = document.createElement('div');
    box.className = 'combo-badge';
    box.style.top = '18%';
    box.textContent = info.leveledUp
        ? `⭐ LEVEL ${info.level}! +${info.gain} XP`
        : `+${info.gain} XP · Lv.${info.level} (${info.xp}/${info.next})`;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2000);
}

function rememberSeenClues() {
    try {
        const seen = JSON.parse(localStorage.getItem('cb_seen_clues') || '{}');
        P.words.forEach(w => {
            const clue = cleanClueText(w.clue);
            if(!clue) return;
            seen[clue] = (seen[clue] || 0) + 1;
        });
        localStorage.setItem('cb_seen_clues', JSON.stringify(seen));
    } catch(e) {}
}

function calcSc(){
    const m={"Kolay":1,"Orta":1.5,"Zor":2,"Çok Zor":3}[P.difficulty]||1;
    let tb;if(tm<=60)tb=200;else if(tm<=300)tb=Math.max(0,200-((tm-60)/30|0)*10);
    else tb=Math.max(0,100-((tm-300)/60|0)*15);
    const timePart = ACTIVE_MODE.timeBonus ? tb : 0;
    return Math.max(10,Math.round((P.words.length*10+timePart)*m-hc*ACTIVE_MODE.hintPenalty));
}

// ─── UI ───
function updUI(){
    const awc=acl?wCells(acl):[];
    document.querySelectorAll('.cell').forEach(el=>{
        if(el.classList.contains('bk'))return;
        const r=+el.dataset.r,c=+el.dataset.c,k=`${r}-${c}`;
        el.classList.remove('sel','iw','wr','rv','ok');
        if(lck.has(k))el.classList.add('ok');
        else{
            if(sel&&sel.row===r&&sel.col===c)el.classList.add('sel');
            else if(awc.includes(k))el.classList.add('iw');
            if(wrg.has(k))el.classList.add('wr');
            if(rev.has(k))el.classList.add('rv');
        }
        const l=el.querySelector('.lt');if(l)l.textContent=ug[k]||'';
    });
    document.getElementById('dbtn').textContent=dir==='across'?'→ Yatay':'↓ Dikey';
    document.getElementById('hc').textContent=hc;
    if(acl){
        document.getElementById('badge').textContent=`${acl.number}${acl.direction==='across'?'→':'↓'}`;
        document.getElementById('badge').className='clue-num'+(acl.direction==='down'?' dn':'');
        document.getElementById('ctext').textContent=cleanClueText(acl.clue);
    }
    document.querySelectorAll('.ci').forEach(el=>{
        const n=+el.dataset.n,d=el.dataset.d;
        el.classList.remove('on','sv');
        if(acl&&acl.number===n&&acl.direction===d)el.classList.add('on');
        if(slv.has(`${n}-${d}`))el.classList.add('sv');
    });
    drawWordFlow();
}

function updProg(){
    document.getElementById('ptxt').textContent=`${slv.size} / ${P.words.length}`;
    document.getElementById('pf').style.width=`${(slv.size/P.words.length)*100}%`;
}

function drawWordFlow() {
    const frame = document.querySelector('.grid-frame');
    const flow = frame ? frame.querySelector('.word-flow') : null;
    if(!frame || !flow) return;
    if(!acl || !sel) {
        flow.classList.remove('on');
        return;
    }
    const cells = wCells(acl);
    if(!cells.length) return;
    const [sr, sc] = cells[0].split('-').map(Number);
    const [er, ec] = cells[cells.length - 1].split('-').map(Number);
    const sEl = getCell(sr, sc);
    const eEl = getCell(er, ec);
    if(!sEl || !eEl) return;

    const fr = frame.getBoundingClientRect();
    const rs = sEl.getBoundingClientRect();
    const re = eEl.getBoundingClientRect();
    const x1 = rs.left + rs.width / 2 - fr.left;
    const y1 = rs.top + rs.height / 2 - fr.top;
    const x2 = re.left + re.width / 2 - fr.left;
    const y2 = re.top + re.height / 2 - fr.top;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const fx = getThemeFX();
    flow.style.setProperty('--x', `${x1}px`);
    flow.style.setProperty('--y', `${y1}px`);
    flow.style.setProperty('--len', `${len}px`);
    flow.style.setProperty('--ang', `${angle}deg`);
    flow.style.setProperty('--stream-color', fx.stream);
    flow.classList.add('on');

    clearTimeout(flowTimer);
    flowTimer = setTimeout(() => flow.classList.remove('on'), 1600);
}

function glowPulse(x, y, glowColor) {
    const g = document.createElement('div');
    g.className = 'sync-glow';
    g.style.left = `${x}px`;
    g.style.top = `${y}px`;
    g.style.setProperty('--glow-color', glowColor || 'rgba(22,163,74,.4)');
    document.body.appendChild(g);
    setTimeout(() => g.remove(), 620);
}

// ─── WIN ───
function showWin(){
    clearInterval(tint);const sc=calcSc();
    const perfect = hc === 0;
    const fx = getThemeFX();

    // Zafer sesi + titreşim + flash
    playSFX('win');
    if(perfect) showCombo('MÜKEMMEL ÇÖZÜM!');
    if(navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 800);

    // Stage-1: Grid pulse wave
    const allCells = document.querySelectorAll('.cell:not(.bk)');
    allCells.forEach((cell, index) => {
        setTimeout(() => {
            cell.style.animation = 'none';
            cell.offsetHeight;
            cell.style.animation = `okPulse 0.5s ease forwards`;
            cell.style.background = 'var(--green-light)';
            cell.style.borderColor = 'var(--green-mid)';
            const lt = cell.querySelector('.lt');
            if(lt) lt.style.color = 'var(--green)';
            // Rastgele particle burst
            if(index % 3 === 0) {
                const rect = cell.getBoundingClientRect();
                burstParticles(rect.left + rect.width/2, rect.top + rect.height/2, fx.burst);
            }
        }, index * 18);
    });
    document.querySelector('.modal')?.classList.add('win-stage');

    // Stage-2: score count up
    animateCounter(document.getElementById('fs'), 0, sc, 950);
    document.getElementById('ft').textContent=fmt(tm);
    document.getElementById('fh').textContent=hc;
    const m={"Kolay":1,"Orta":1.5,"Zor":2,"Çok Zor":3}[P.difficulty]||1;
    let tb;if(tm<=60)tb=200;else if(tm<=300)tb=Math.max(0,200-((tm-60)/30|0)*10);else tb=Math.max(0,100-((tm-300)/60|0)*15);
    const timeLine = ACTIVE_MODE.timeBonus ? `⚡ Süre: <b>+${tb}</b> (${fmt(tm)})<br>` : `🧘 Zen Modu: <b>Süre Bonusu Yok</b><br>`;
    document.getElementById('mbd').innerHTML=
        `🎮 Mod: <b>${ACTIVE_MODE.label}</b><br>📝 Kelime: ${P.words.length} × 10 = <b>${P.words.length*10}</b><br>${timeLine}🎯 Çarpan: <b>×${m}</b>${hc?'<br>💡 İpucu: <b>-'+(hc*ACTIVE_MODE.hintPenalty)+'</b>':''}${perfect?'<br>🌟 Mükemmel Çözüm: <b>+50 XP</b>':''}`;
    try{const s=JSON.parse(localStorage.getItem('cb')||'{}');
    if(!s[PID]||sc>s[PID].s){s[PID]={s:sc,t:tm,h:hc};localStorage.setItem('cb',JSON.stringify(s))}}catch(e){}

    // Günün bulmacası ise ayrıca kaydet
    try{
        if(window.CB_DAILY_KEY) {
            const d = JSON.parse(localStorage.getItem('cb_daily') || '{}');
            if(!d[window.CB_DAILY_KEY] || sc > d[window.CB_DAILY_KEY].s) {
                d[window.CB_DAILY_KEY] = {s:sc, t:tm, h:hc, id:PID};
                localStorage.setItem('cb_daily', JSON.stringify(d));
            }
        }
    }catch(e){}

    // Confetti
    spawnConfetti();

    // Scoreboard'a kaydet (auth varsa cloud'a, yoksa local'a)
    if(window.CBAuth && window.CBAuth.saveScore) {
        window.CBAuth.saveScore(PID, sc, tm, hc, P.difficulty, window.CB_DAILY_KEY || null);
    }

    const xpInfo = grantXP(sc, perfect);
    setTimeout(() => showXPFloater(xpInfo), 650);
    setTimeout(() => {
        const modal = document.querySelector('.modal');
        if(modal) {
            modal.classList.remove('win-stage');
            modal.classList.add('win-stage-final');
            setTimeout(() => modal.classList.remove('win-stage-final'), 700);
        }
    }, 1100);
    rememberSeenClues();

    saveLastPlayed(true);
    document.getElementById('modal').style.display='flex';
}

function animateCounter(el, from, to, duration=900){
    if(!el) return;
    const start = performance.now();
    const diff = to - from;
    const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + diff * eased);
        if(p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

function spawnConfetti(){
    const box=document.getElementById('confetti');
    const colors=['#16A34A','#2563EB','#D97706','#DC2626','#7C3AED','#EC4899','#EAB308','#06B6D4'];
    for(let i=0;i<80;i++){
        const d=document.createElement('div');
        const sz=Math.random()*8+4;
        const rotStart = Math.random()*360;
        const rotEnd = rotStart + Math.random()*720;
        const xDrift = (Math.random()-.5)*200;
        d.style.cssText=`position:absolute;width:${sz}px;height:${sz*(Math.random()*.5+.5)}px;background:${colors[i%colors.length]};
            border-radius:${Math.random()>.6?'50%':Math.random()>.5?'2px':'0'};left:${Math.random()*100}%;top:-20px;
            opacity:${Math.random()*.6+.4};
            transform: rotate(${rotStart}deg);
            animation:confettiFall ${Math.random()*2+2.5}s cubic-bezier(.2,.6,.3,1) ${Math.random()*.6}s forwards;
            --xdrift:${xDrift}px;--rotend:${rotEnd}deg;
            box-shadow: 0 0 ${sz}px ${colors[i%colors.length]}40;`;
        box.appendChild(d);
    }

    // Body düzeyinde ekranı kaplayan confetti
    const fullBox = document.createElement('div');
    fullBox.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:300;overflow:hidden;';
    document.body.appendChild(fullBox);
    for(let i=0;i<60;i++){
        const d=document.createElement('div');
        const sz=Math.random()*8+4;
        const xDrift = (Math.random()-.5)*400;
        d.style.cssText=`position:absolute;width:${sz}px;height:${sz*1.5}px;background:${colors[i%colors.length]};
            border-radius:${Math.random()>.5?'50%':'2px'};left:${Math.random()*100}%;top:-20px;
            opacity:${Math.random()*.6+.4};
            animation:confettiFallFull ${Math.random()*2+3}s cubic-bezier(.2,.6,.3,1) ${Math.random()*.8}s forwards;
            --xdrift:${xDrift}px;`;
        fullBox.appendChild(d);
    }
    setTimeout(() => fullBox.remove(), 5000);
}

// Confetti animation via JS-injected style
const confettiStyle=document.createElement('style');
confettiStyle.textContent=`
@keyframes confettiFall{to{transform:translateY(500px) translateX(var(--xdrift,0)) rotate(var(--rotend,720deg));opacity:0}}
@keyframes confettiFallFull{to{transform:translateY(110vh) translateX(var(--xdrift,0)) rotate(720deg);opacity:0}}`;
document.head.appendChild(confettiStyle);

init();
