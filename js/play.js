/* Çengel Bulmaca — Motor v4 Premium */
let sel=null,dir="across",ug={},rev=new Set(),wrg=new Set(),slv=new Set(),lck=new Set();
let hc=0,tm=0,tint=null,run=false,acl=null;
const R=P.grid_size_r,C=P.grid_size_c;

function TR(c){
    const m={'i':'İ','ı':'I','ö':'Ö','ü':'Ü','ş':'Ş','ç':'Ç','ğ':'Ğ','İ':'İ','I':'I','Ö':'Ö','Ü':'Ü','Ş':'Ş','Ç':'Ç','Ğ':'Ğ'};
    return m[c]||c.toUpperCase();
}

function init(){mkGrid();mkClues();setupKB();updProg()}

function mkGrid(){
    const g=document.getElementById('grid');
    g.style.gridTemplateColumns=`repeat(${C},34px)`;
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
        // Pop animation
        const cell=getCell(r,c);
        if(cell){const lt=cell.querySelector('.lt');if(lt){lt.classList.remove('pop');void lt.offsetWidth;lt.classList.add('pop')}}
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
            slv.add(wk);newSolve=true;
            wCells(w).forEach(k=>lck.add(k));
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
    if(bad)wrg.forEach(k=>{const[r,c]=k.split('-');const el=getCell(+r,+c);
        if(el){el.classList.add('shake');setTimeout(()=>el.classList.remove('shake'),300)}});
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
    document.getElementById('fs').textContent=sc;
    document.getElementById('ft').textContent=fmt(tm);
    document.getElementById('fh').textContent=hc;
    const m={"Kolay":1,"Orta":1.5,"Zor":2,"Çok Zor":3}[P.difficulty]||1;
    let tb;if(tm<=60)tb=200;else if(tm<=300)tb=Math.max(0,200-((tm-60)/30|0)*10);else tb=Math.max(0,100-((tm-300)/60|0)*15);
    document.getElementById('mbd').innerHTML=
        `📝 Kelime: ${P.words.length} × 10 = <b>${P.words.length*10}</b><br>⚡ Süre: <b>+${tb}</b> (${fmt(tm)})<br>🎯 Çarpan: <b>×${m}</b>${hc?'<br>💡 İpucu: <b>-'+hc*15+'</b>':''}`;
    try{const s=JSON.parse(localStorage.getItem('cb')||'{}');
    if(!s[PID]||sc>s[PID].s){s[PID]={s:sc,t:tm,h:hc};localStorage.setItem('cb',JSON.stringify(s))}}catch(e){}
    
    // Confetti
    spawnConfetti();
    
    document.getElementById('modal').style.display='flex';
}

function spawnConfetti(){
    const box=document.getElementById('confetti');
    const colors=['#16A34A','#2563EB','#D97706','#DC2626','#7C3AED','#EC4899'];
    for(let i=0;i<40;i++){
        const d=document.createElement('div');
        const sz=Math.random()*6+4;
        d.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;background:${colors[i%colors.length]};
            border-radius:${Math.random()>.5?'50%':'2px'};left:${Math.random()*100}%;top:-10px;
            opacity:${Math.random()*.6+.4};animation:confettiFall ${Math.random()*2+1.5}s ease ${Math.random()*.5}s forwards`;
        box.appendChild(d);
    }
}

// Confetti animation via JS-injected style
const confettiStyle=document.createElement('style');
confettiStyle.textContent=`@keyframes confettiFall{to{transform:translateY(400px) rotate(${Math.random()*720}deg);opacity:0}}`;
document.head.appendChild(confettiStyle);

init();
