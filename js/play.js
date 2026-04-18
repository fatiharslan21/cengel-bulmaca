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
    ['⭐', '✨', '💫'].forEach((s, i) => {
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
const R=P.grid_size_r,C=P.grid_size_c;

function TR(c){
    const m={'i':'İ','ı':'I','ö':'Ö','ü':'Ü','ş':'Ş','ç':'Ç','ğ':'Ğ','İ':'İ','I':'I','Ö':'Ö','Ü':'Ü','Ş':'Ş','Ç':'Ç','Ğ':'Ğ'};
    return m[c]||c.toUpperCase();
}

function init(){mkGrid();mkClues();setupKB();updProg()}

function mkGrid(){
    const g=document.getElementById('grid');
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
}

function mkClues(){
    const a=document.getElementById('cla'),d=document.getElementById('cld');
    P.words.filter(w=>w.direction==='across').sort((x,y)=>x.number-y.number).forEach(w=>a.appendChild(mkCI(w)));
    P.words.filter(w=>w.direction==='down').sort((x,y)=>x.number-y.number).forEach(w=>{const e=mkCI(w);e.classList.add('cid');d.appendChild(e)});
}

function mkCI(w){
    const e=document.createElement('div');
    e.className='ci';e.dataset.n=w.number;e.dataset.d=w.direction;
    e.innerHTML=`<span class="cin">${w.number}.</span>${w.clue}`;
    e.addEventListener('click',()=>{sel={row:w.row,col:w.col};dir=w.direction;acl=w;if(!run)startTm();updUI();
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

function clickC(r,c){
    if(!P.grid[r][c])return;
    if(sel&&sel.row===r&&sel.col===c)dir=dir==='across'?'down':'across';
    else sel={row:r,col:c};
    if(!run)startTm();
    let w=findW(r,c,dir);
    if(!w){const alt=dir==='across'?'down':'across';w=findW(r,c,alt);if(w)dir=alt}
    if(w)acl=w;
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
                burstParticles(cx, cy);
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

function startTm(){run=true;tint=setInterval(()=>{tm++;document.getElementById('tm').textContent=fmt(tm)},1000)}
const fmt=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

function calcSc(){
    const m={"Kolay":1,"Orta":1.5,"Zor":2,"Çok Zor":3}[P.difficulty]||1;
    let tb;if(tm<=60)tb=200;else if(tm<=300)tb=Math.max(0,200-((tm-60)/30|0)*10);
    else tb=Math.max(0,100-((tm-300)/60|0)*15);
    return Math.max(10,Math.round((P.words.length*10+tb)*m-hc*15));
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
        document.getElementById('ctext').textContent=acl.clue;
    }
    document.querySelectorAll('.ci').forEach(el=>{
        const n=+el.dataset.n,d=el.dataset.d;
        el.classList.remove('on','sv');
        if(acl&&acl.number===n&&acl.direction===d)el.classList.add('on');
        if(slv.has(`${n}-${d}`))el.classList.add('sv');
    });
}

function updProg(){
    document.getElementById('ptxt').textContent=`${slv.size} / ${P.words.length}`;
    document.getElementById('pf').style.width=`${(slv.size/P.words.length)*100}%`;
}

// ─── WIN ───
function showWin(){
    clearInterval(tint);const sc=calcSc();

    // Zafer sesi + titreşim + flash
    playSFX('win');
    if(navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 800);

    // GÜNCELLEME: Tüm hücreleri sırayla kutlama dalgasıyla yeşile boya
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
                burstParticles(rect.left + rect.width/2, rect.top + rect.height/2,
                    ['#EAB308','#F59E0B','#22C55E','#3B82F6']);
            }
        }, index * 18);
    });
    // ... (orijinal showWin kodunun geri kalanı aynen devam etsin)
    document.getElementById('fs').textContent=sc;
    document.getElementById('ft').textContent=fmt(tm);
    document.getElementById('fh').textContent=hc;
    const m={"Kolay":1,"Orta":1.5,"Zor":2,"Çok Zor":3}[P.difficulty]||1;
    let tb;if(tm<=60)tb=200;else if(tm<=300)tb=Math.max(0,200-((tm-60)/30|0)*10);else tb=Math.max(0,100-((tm-300)/60|0)*15);
    document.getElementById('mbd').innerHTML=
        `📝 Kelime: ${P.words.length} × 10 = <b>${P.words.length*10}</b><br>⚡ Süre: <b>+${tb}</b> (${fmt(tm)})<br>🎯 Çarpan: <b>×${m}</b>${hc?'<br>💡 İpucu: <b>-'+hc*15+'</b>':''}`;
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
        window.CBAuth.saveScore(PID, sc, tm, hc, P.difficulty);
    }

    document.getElementById('modal').style.display='flex';
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
