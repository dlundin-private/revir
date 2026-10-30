(() => {
/* ---------- World ---------- */
const W = 240, H = 240, N = W * H;
const PR = 1.6, TR = 1.4, SELF_K = 10, STEP = 0.4, TAU = Math.PI * 2;
const owner = new Uint8Array(N), trail = new Uint8Array(N), tseq = new Int32Array(N);
const seen = new Uint8Array(N), rq = new Int32Array(N), counts = new Int32Array(8);
const wrapA = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };

/* ---------- Themes ---------- */
const THEMES = {
  klassisk: { label:'Klassisk', icon:'🎨', deco:'dots',
    pal:['#3b82f6','#ef4444','#22c55e','#f59e0b','#a855f7','#ec4899','#14b8a6','#84cc16'],
    bots:[['🦊','Räven'],['🦌','Älgen'],['🐿️','Ekorren'],['🦔','Igelkotten'],['🐰','Haren'],['🦡','Grävlingen'],['🐻','Björnen']] },
  candy: { label:'Candy', icon:'🍭', deco:'candy', field:'#ffe4f1', wall:'#f0a3c6',
    pal:['#7c4dff','#ff4f8b','#ffb020','#22c3a6','#ff7a45','#8bd346','#3fb6ff','#d94fd0'],
    bots:[['🍭','Klubban'],['🍬','Kolan'],['🧁','Muffinsen'],['🍩','Munken'],['🍫','Chokladen'],['🍓','Jordgubben'],['🍪','Kakan']] },
  djungel: { label:'Djungel', icon:'🌴', deco:'jungle', field:'#79ab5b', wall:'#2c5523',
    pal:['#ffd23f','#ff6b35','#e63946','#8338ec','#3a86ff','#ff4fa3','#00c2d1','#8a5a2b'],
    bots:[['🐯','Tigern'],['🐒','Apan'],['🦜','Papegojan'],['🐍','Ormen'],['🐸','Grodan'],['🐆','Jaguaren'],['🦥','Sengångaren']] },
  korallrev: { label:'Korallrev', icon:'🐠', deco:'reef', field:'#4cc4d9', wall:'#17608a',
    pal:['#ff7f50','#ffd166','#ef476f','#7b4ee0','#f15bb5','#2b50c8','#ff9e00','#b5121b'],
    bots:[['🐠','Clownfisken'],['🐙','Bläckfisken'],['🐢','Sköldpaddan'],['🦀','Krabban'],['⭐','Sjöstjärnan'],['🦈','Hajen'],['🐡','Blåsfisken']] },
  rymd: { label:'Rymd', icon:'🚀', deco:'space', field:'#1a1442', wall:'#070418',
    pal:['#00e5ff','#ff3df2','#ffe600','#7cff4f','#ff6b3d','#a78bfa','#ff4d6d','#4dd2a8'],
    bots:[['☄️','Kometen'],['🌙','Månen'],['🛸','Ufot'],['🚀','Raketen'],['👾','Rymdvarelsen'],['🪐','Saturnus'],['🌟','Stjärnan']] },
  vinter: { label:'Vinter', icon:'❄️', deco:'snow', field:'#eaf4fb', wall:'#a7c7dc',
    pal:['#2563eb','#dc2626','#16a34a','#f59e0b','#9333ea','#db2777','#0d9488','#ea580c'],
    bots:[['🐧','Pingvinen'],['⛄','Snögubben'],['🦭','Sälen'],['🦊','Fjällräven'],['🦉','Ugglan'],['🐺','Vargen'],['🐻‍❄️','Isbjörnen']] }
};

const players = Array.from({ length: 8 }, (_, id) => ({
  id, v: id + 1, isBot: id > 0, name: id ? '' : 'Du', emo: '',
  color:'#000', dark:'#000', trailCol:'#000', rgbL:[0,0,0], rgbD:[0,0,0],
  alive:false, x:0, y:0, ang:0, target:0, want:0, carry:0,
  speed: id ? 20.5 + Math.random()*3 : 25, turn: id ? 5.5 : 7.5,
  pts:[], cells:[], seq:0, outDist:0, mode:'roam', phase:0, legA:10, legB:10, side:1,
  thinkT:0, nearT:0, home:null, respawnAt:0, kills:0, maxPct:0, frozenUntil:0, shieldUntil:0, speedUntil:0, lastTaker:null
}));
const me = players[0];

/* ---------- Canvas & territory images ---------- */
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
let dpr = 1, vw = 0, vh = 0, U = 6, now = 0;
const cvL = document.createElement('canvas'), cvD = document.createElement('canvas');
cvL.width = cvD.width = W; cvL.height = cvD.height = H;
const gL = cvL.getContext('2d'), gD = cvD.getContext('2d');
const imL = gL.createImageData(W, H), imD = gD.createImageData(W, H);
let imgDirty = true, builtFrom = null;
function paint(i, v){
  const k = i * 4, L = imL.data, D = imD.data;
  if (!v){ L[k+3] = 0; D[k+3] = 0; }
  else {
    const p = players[v-1];
    L[k] = p.rgbL[0]; L[k+1] = p.rgbL[1]; L[k+2] = p.rgbL[2]; L[k+3] = 255;
    D[k] = p.rgbD[0]; D[k+1] = p.rgbD[1]; D[k+2] = p.rgbD[2]; D[k+3] = 255;
  }
  imgDirty = true;
}
function rebuild(O){ for (let i = 0; i < N; i++) paint(i, O[i]); }
function flushImg(){ if (imgDirty){ gL.putImageData(imL, 0, 0); gD.putImageData(imD, 0, 0); imgDirty = false; } }

let css = {};
function readCss(){
  const s = getComputedStyle(document.documentElement);
  css = { field:s.getPropertyValue('--field').trim(), grid:s.getPropertyValue('--grid').trim(), wall:s.getPropertyValue('--wall').trim() };
}
function resize(){
  dpr = Math.min(2, window.devicePixelRatio || 1);
  vw = innerWidth; vh = innerHeight;
  canvas.width = vw * dpr; canvas.height = vh * dpr;
  U = Math.max(4, Math.min(vw, vh) / 64);
}
addEventListener('resize', resize);
readCss(); resize();

/* ---------- Theme tiles ---------- */
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeTile(deco, field){
  const T = 256, c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d'), R = rng(11);
  g.fillStyle = field; g.fillRect(0, 0, T, T);
  const tiled = (x, y, fn) => { for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) { g.save(); g.translate(x + ox, y + oy); fn(); g.restore(); } };
  if (deco === 'dots'){
    g.fillStyle = css.grid;
    for (let x = 0; x < T; x += 16) for (let y = 0; y < T; y += 16){ g.beginPath(); g.arc(x + 8, y + 8, 1.4, 0, TAU); g.fill(); }
  } else if (deco === 'candy'){
    const cols = ['#ff7eb6','#7ed6ff','#ffd36e','#a0e77d','#c79bff','#ffffff'];
    for (let k = 0; k < 48; k++){
      const x = R()*T, y = R()*T, r = R()*TAU, col = cols[k % cols.length];
      tiled(x, y, () => { g.rotate(r); g.fillStyle = col; g.globalAlpha = .9; g.beginPath(); g.roundRect ? g.roundRect(-1.8, -5, 3.6, 10, 1.8) : g.rect(-1.8, -5, 3.6, 10); g.fill(); });
    }
  } else if (deco === 'jungle'){
    const cols = ['#5e9447','#6aa352','#4f8a3c','#8cc06c'];
    for (let k = 0; k < 24; k++){
      const x = R()*T, y = R()*T, r = R()*TAU, a = 9 + R()*12, b = 4 + R()*4, col = cols[k % cols.length];
      tiled(x, y, () => {
        g.rotate(r); g.globalAlpha = .75; g.fillStyle = col;
        g.beginPath(); g.ellipse(0, 0, a, b, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(40,80,30,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-a*.9, 0); g.lineTo(a*.9, 0); g.stroke();
      });
    }
  } else if (deco === 'reef'){
    for (let k = 0; k < 70; k++){
      const x = R()*T, y = R()*T, r = 0.8 + R()*1.4, a = .1 + R()*.18;
      tiled(x, y, () => { g.globalAlpha = a; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); });
    }
    for (let k = 0; k < 7; k++){
      const x = R()*T, y = R()*T, w = 30 + R()*40;
      tiled(x, y, () => { g.globalAlpha = .12; g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(w*.3, -8, w*.6, 8, w, 0); g.stroke(); });
    }
    for (let k = 0; k < 14; k++){
      const x = R()*T, y = R()*T, r = 2.5 + R()*6;
      tiled(x, y, () => {
        g.globalAlpha = .4; g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
        g.globalAlpha = .55; g.fillStyle = '#fff'; g.beginPath(); g.arc(-r*.35, -r*.35, r*.25, 0, TAU); g.fill();
      });
    }
  } else if (deco === 'space'){
    for (let k = 0; k < 95; k++){
      const x = R()*T, y = R()*T, r = .4 + R()*1.3, a = .3 + R()*.7;
      tiled(x, y, () => { g.globalAlpha = a; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); });
    }
    for (let k = 0; k < 5; k++){
      const x = R()*T, y = R()*T, s = 4 + R()*4;
      tiled(x, y, () => { g.globalAlpha = .8; g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.moveTo(0, -s); g.lineTo(0, s); g.stroke(); });
    }
  } else if (deco === 'snow'){
    for (let k = 0; k < 26; k++){
      const x = R()*T, y = R()*T, s = 4 + R()*5, r = R()*TAU;
      tiled(x, y, () => {
        g.rotate(r); g.globalAlpha = .7; g.strokeStyle = '#b5d5ea'; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath();
        for (let a = 0; a < 6; a++){ const c = Math.cos(a*TAU/6), sn = Math.sin(a*TAU/6); g.moveTo(0, 0); g.lineTo(c*s, sn*s); }
        g.stroke();
      });
    }
    for (let k = 0; k < 40; k++){
      const x = R()*T, y = R()*T;
      tiled(x, y, () => { g.globalAlpha = .6; g.fillStyle = '#c9e2f2'; g.beginPath(); g.arc(0, 0, 1.2, 0, TAU); g.fill(); });
    }
  }
  return c;
}

let theme = null, themeId = 'klassisk', pattern = null, wallCol = '#000';
function applyTheme(id){
  if (!THEMES[id]) id = 'klassisk';
  themeId = id; theme = THEMES[id];
  const field = theme.field || css.field; wallCol = theme.wall || css.wall;
  players.forEach((p, i) => {
    const c = theme.pal[i], [r, g, b] = hexRgb(c);
    p.color = c; p.rgbL = [r, g, b]; p.rgbD = [r*.64|0, g*.64|0, b*.64|0];
    p.dark = `rgb(${p.rgbD.join(',')})`; p.trailCol = `rgba(${r},${g},${b},.5)`;
    if (i){ p.emo = theme.bots[i-1][0]; p.name = theme.bots[i-1][1]; }
  });
  pattern = ctx.createPattern(makeTile(theme.deco, field), 'repeat');
  document.body.style.background = wallCol;
  document.documentElement.style.setProperty('--me', me.color);
  builtFrom = null;
  document.querySelectorAll('#themes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
  try { localStorage.setItem('revir-theme', id); } catch(e){}
}
const themesEl = document.getElementById('themes');
themesEl.innerHTML = Object.entries(THEMES).map(([id, t]) => `<button data-id="${id}" aria-pressed="false">${t.icon} ${t.label}</button>`).join('');
themesEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b){ applyTheme(b.dataset.id); updateHud(); } });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readCss(); if (themeId === 'klassisk') applyTheme('klassisk'); });

/* ---------- Ownership ---------- */
let snapDirty = true;
function setOwner(i, v){
  const o = owner[i]; if (o === v) return;
  if (o) counts[o-1]--; if (v) counts[v-1]++;
  owner[i] = v; snapDirty = true;
  if (builtFrom === owner) paint(i, v);
}
function headPos(p){ return [p.x + Math.cos(p.ang)*p.carry, p.y + Math.sin(p.ang)*p.carry]; }

function spawn(p){
  const R = 7; let cx = W/2, cy = H/2;
  for (let t = 0; t < 300; t++){
    const x = R + 6 + Math.random()*(W - 2*R - 12), y = R + 6 + Math.random()*(H - 2*R - 12);
    let ok = true;
    for (let dy = -R-3; dy <= R+3 && ok; dy++) for (let dx = -R-3; dx <= R+3; dx++){
      const i = ((y+dy)|0)*W + ((x+dx)|0); if (owner[i] || trail[i]){ ok = false; break; }
    }
    if (ok) for (const q of players) if (q !== p && q.alive && Math.hypot(q.x-x, q.y-y) < 35){ ok = false; break; }
    cx = x; cy = y; if (ok) break;
  }
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++){
    if (dx*dx + dy*dy > R*R) continue;
    const gx = (cx|0) + dx, gy = (cy|0) + dy;
    if (gx >= 0 && gy >= 0 && gx < W && gy < H) setOwner(gy*W + gx, p.v);
  }
  const a = Math.random()*TAU;
  Object.assign(p, { x:(cx|0)+.5, y:(cy|0)+.5, ang:a, target:a, want:a, carry:0, pts:[], cells:[], seq:0, outDist:0,
    mode:'roam', phase:0, legA:10 + Math.random()*22, legB:8 + Math.random()*18, side: Math.random() < .5 ? 1 : -1,
    alive:true, respawnAt:0, home:null, nearT:0, frozenUntil:0, shieldUntil:0, speedUntil:0, lastTaker:null });
}

const particles = [];
function burstAt(x, y, color){
  for (let k = 0; k < 28; k++){
    const a = Math.random()*TAU, s = 6 + Math.random()*16;
    particles.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:1, color });
  }
}

/* ---------- Power-ups ---------- */
const PW = [ { emo:'🛡️', label:'Odödlig', col:'#ffc83d' }, { emo:'⚡', label:'Dubbel fart', col:'#3fb6ff' },
             { emo:'❄️', label:'Frys', col:'#7dd3fc' }, { emo:'💥', label:'Markbomb', col:'#ff6b3d' } ];
const GOAL = 0.30, rings = [];
function landBomb(p){
  const [hx, hy] = headPos(p), R = 10;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++){
    if (dx*dx + dy*dy > R*R) continue;
    const gx = (hx|0) + dx, gy = (hy|0) + dy;
    if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
    const i = gy*W + gx, o = owner[i];
    if (o === p.v) continue;
    if (o) players[o-1].lastTaker = p;
    setOwner(i, p.v);
  }
  rings.push({ x:hx, y:hy, t0:now, col:p.color });
}
const items = []; let itemT = 0;
const shielded = p => now < p.shieldUntil;
function spawnItem(){
  for (let t = 0; t < 30; t++){
    const x = 8 + Math.random()*(W-16), y = 8 + Math.random()*(H-16);
    if (players.some(p => p.alive && (p.x-x)**2 + (p.y-y)**2 < 100)) continue;
    const r = Math.random();
    items.push({ x, y, k: r < .3 ? 0 : r < .6 ? 1 : r < .8 ? 2 : 3, born: now }); return;
  }
}
function pickups(p){
  const [hx, hy] = headPos(p);
  for (let k = items.length - 1; k >= 0; k--){
    const it = items[k];
    if ((it.x-hx)**2 + (it.y-hy)**2 > (PR + 1.8)**2) continue;
    items.splice(k, 1);
    if (it.k === 0){ p.shieldUntil = now + 5000; if (p === me) toast('🛡️ Odödlig i 5 sekunder!'); }
    else if (it.k === 1){ p.speedUntil = now + 5000; if (p === me) toast('⚡ Dubbel fart i 5 sekunder!'); }
    else if (it.k === 2){
      for (const o of players) if (o !== p && o.alive && !shielded(o)) o.frozenUntil = now + 3000;
      if (p === me) toast('❄️ Alla andra är frusna i 3 sekunder!');
      else if (!shielded(me)) toast(`❄️ ${p.emo} ${p.name} frös dig!`);
    } else { landBomb(p); if (p === me) toast('💥 Markbomb!'); }
  }
}
function tickItems(){
  for (let k = items.length - 1; k >= 0; k--) if (now - items[k].born > 30000) items.splice(k, 1);
  if (now >= itemT){ itemT = now + 3500; if (items.length < 6) spawnItem(); }
}

let death = null;
function kill(p, killer, cause, lx, ly){
  if (!p.alive || shielded(p)) return;
  const [hx, hy] = headPos(p);
  p.alive = false;
  for (const j of p.cells) if (trail[j] === p.v) trail[j] = 0;
  p.cells = []; p.pts = [];
  const heir = killer && killer !== p && killer.alive ? killer.v : 0;
  for (let i = 0; i < N; i++) if (owner[i] === p.v) setOwner(i, heir);
  burstAt(hx, hy, p.color);
  if (killer === me && p !== me){ me.kills++; toast(`Du slog ut ${p.emo} ${p.name} och tog deras mark!`); }
  if (p.isBot) p.respawnAt = now + 1800;
  else { death = { cause, killer, x:lx, y:ly, t:now, hx, hy }; setTimeout(startReplay, 800); }
}

function capture(p){
  const v = p.v;
  for (const j of p.cells){ if (trail[j] === v) trail[j] = 0; if (owner[j] && owner[j] !== v) players[owner[j]-1].lastTaker = p; setOwner(j, v); }
  p.cells = []; p.pts = [];
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let i = 0; i < N; i++) if (owner[i] === v){
    const x = i % W, y = (i / W) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  minX = Math.max(0, minX-1); minY = Math.max(0, minY-1); maxX = Math.min(W-1, maxX+1); maxY = Math.min(H-1, maxY+1);
  for (let y = minY; y <= maxY; y++) seen.fill(0, y*W + minX, y*W + maxX + 1);
  let h = 0, t = 0;
  const seed = i => { if (!seen[i] && owner[i] !== v){ seen[i] = 1; rq[t++] = i; } };
  for (let x = minX; x <= maxX; x++){ seed(minY*W + x); seed(maxY*W + x); }
  for (let y = minY; y <= maxY; y++){ seed(y*W + minX); seed(y*W + maxX); }
  while (h < t){
    const i = rq[h++], x = i % W, y = (i / W) | 0;
    if (x > minX) seed(i-1); if (x < maxX) seed(i+1);
    if (y > minY) seed(i-W); if (y < maxY) seed(i+W);
  }
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++){
    const i = y*W + x; if (!seen[i] && owner[i] !== v){ if (owner[i]) players[owner[i]-1].lastTaker = p; setOwner(i, v); }
  }
  for (const o of players) if (o !== p && o.alive && counts[o.id] === 0) kill(o, p, 'surround', o.x, o.y);
}

function advance(p){
  const x = p.x, y = p.y;
  if (x < 0 || y < 0 || x >= W || y >= H){
    if (shielded(p)){
      if (x < 0 || x >= W){ p.x = Math.min(W - .01, Math.max(.01, x)); p.ang = Math.PI - p.ang; }
      if (y < 0 || y >= H){ p.y = Math.min(H - .01, Math.max(.01, y)); p.ang = -p.ang; }
      p.target = p.ang; return false;
    }
    kill(p, null, 'wall', Math.min(W-.5, Math.max(.5, x)), Math.min(H-.5, Math.max(.5, y))); return false;
  }
  p.seq++;
  const cx = x | 0, cy = y | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
    const gx = cx + dx, gy = cy + dy;
    if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
    const ex = gx + .5 - x, ey = gy + .5 - y; if (ex*ex + ey*ey > 1.21) continue;
    const i = gy*W + gx, t = trail[i]; if (!t) continue;
    if (t === p.v){ if (!shielded(p) && tseq[i] < p.seq - SELF_K){ kill(p, null, 'self', x, y); return false; } }
    else kill(players[t-1], p, 'cut', gx + .5, gy + .5);
  }
  if (owner[cy*W + cx] === p.v){ if (p.cells.length) capture(p); p.outDist = 0; return p.alive; }
  p.outDist += STEP;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++){
    const gx = cx + dx, gy = cy + dy;
    if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
    const ex = gx + .5 - x, ey = gy + .5 - y; if (ex*ex + ey*ey > TR*TR) continue;
    const j = gy*W + gx;
    if (trail[j] === 0 && owner[j] !== p.v){ trail[j] = p.v; tseq[j] = p.seq; p.cells.push(j); }
  }
  const n = p.pts.length;
  if (!n || (x - p.pts[n-2])**2 + (y - p.pts[n-1])**2 > .36) p.pts.push(x, y);
  return true;
}

function update(p, dt){
  if (now < p.frozenUntil) return;
  const fast = now < p.speedUntil;
  const m = p.turn * (fast ? 1.7 : 1) * dt, da = wrapA(p.target - p.ang);
  p.ang += Math.max(-m, Math.min(m, da));
  p.carry += p.speed * (fast ? 2 : 1) * dt;
  const c = Math.cos(p.ang), s = Math.sin(p.ang);
  while (p.carry >= STEP){
    p.carry -= STEP; p.x += c*STEP; p.y += s*STEP;
    if (!advance(p)) return;
  }
}

/* ---------- Bots ---------- */
function rayClear(p, a, max){
  const c = Math.cos(a), s = Math.sin(a);
  for (let d = 1.5; d <= max; d += .8){
    const x = p.x + c*d, y = p.y + s*d;
    if (x < 1.5 || y < 1.5 || x >= W-1.5 || y >= H-1.5) return d;
    const i = (y|0)*W + (x|0);
    if (trail[i] === p.v && tseq[i] < p.seq - SELF_K) return d;
  }
  return max;
}
function enemyTrailAhead(p){
  for (const off of [0, -.45, .45, -.9, .9]){
    const a = p.ang + off, c = Math.cos(a), s = Math.sin(a);
    for (let d = 2; d <= 9; d += 1){
      const x = p.x + c*d, y = p.y + s*d;
      if (x < 0 || y < 0 || x >= W || y >= H) break;
      const t = trail[(y|0)*W + (x|0)];
      if (t && t !== p.v) return a;
    }
  }
  return null;
}
function nearestOwn(p){
  let best = null, bd = 1e9;
  for (let i = 0; i < N; i++) if (owner[i] === p.v){
    const x = i % W + .5, y = ((i / W) | 0) + .5, d = (x-p.x)**2 + (y-p.y)**2;
    if (d < bd){ bd = d; best = [x, y]; }
  }
  return best;
}
function botThink(p){
  const hunt = enemyTrailAhead(p);
  if (hunt !== null){ p.target = hunt; return; }
  const inHome = owner[(p.y|0)*W + (p.x|0)] === p.v;
  if (inHome){
    if (p.mode !== 'roam'){
      p.mode = 'roam'; p.phase = 0; p.legA = 10 + Math.random()*22; p.legB = 8 + Math.random()*18;
      p.side = Math.random() < .5 ? 1 : -1; p.want = Math.random()*TAU;
    } else if (Math.random() < .03) p.want = p.ang + (Math.random() - .5)*2;
  } else if (p.cells.length){
    for (const o of players) if (o !== p && o.alive && (o.x-p.x)**2 + (o.y-p.y)**2 < 400) p.mode = 'home';
    if (p.mode === 'roam'){
      if (p.phase === 0 && p.outDist > p.legA){ p.phase = 1; p.want = p.ang + p.side*Math.PI/2; }
      else if (p.phase === 1 && p.outDist > p.legA + p.legB){ p.phase = 2; p.want = p.ang + p.side*Math.PI/2; }
      else if (p.phase === 2 && p.outDist > p.legA*2 + p.legB) p.mode = 'home';
    }
    if (p.mode === 'home'){
      if (now > p.nearT){ p.nearT = now + 300; p.home = nearestOwn(p); }
      if (p.home) p.want = Math.atan2(p.home[1] - p.y, p.home[0] - p.x);
    }
  }
  if (p.mode !== 'home' && (inHome || p.phase === 0)){
    let bi = null, bd = 484;
    for (const it of items){ const d = (it.x-p.x)**2 + (it.y-p.y)**2; if (d < bd){ bd = d; bi = it; } }
    if (bi) p.want = Math.atan2(bi.y - p.y, bi.x - p.x);
  }
  let bestA = p.want, bestC = -1;
  for (const off of [0, .35, -.35, .7, -.7, 1.05, -1.05, 1.4, -1.4, 1.9, -1.9, 2.5, -2.5]){
    const a = p.want + off, c = rayClear(p, a, 10);
    if (c >= 10){ bestA = a; break; }
    if (c > bestC){ bestC = c; bestA = a; }
  }
  p.target = bestA;
}

/* ---------- Replay recording ---------- */
const REC = 300;
const rec = Array.from({ length: REC }, () => ({ t:0, terr:null, h:new Float32Array(56), tr:new Array(8), it:[] }));
let recHead = 0, recCount = 0, lastRec = -1e9, snap = null;
function record(t){
  if (t - lastRec < 15) return; lastRec = t;
  if (snapDirty || !snap){ snap = owner.slice(); snapDirty = false; }
  const f = rec[recHead]; f.t = t; f.terr = snap; f.it = items.map(i => [i.x, i.y, i.k]);
  for (const p of players){
    const o = p.id*7;
    if (p.alive){ const [x, y] = headPos(p); f.h[o] = x; f.h[o+1] = y; f.h[o+2] = 1; f.h[o+3] = p.ang; f.h[o+4] = Math.max(0, p.shieldUntil - now); f.h[o+5] = Math.max(0, p.speedUntil - now); f.h[o+6] = Math.max(0, p.frozenUntil - now); f.tr[p.id] = [p.pts, p.pts.length]; }
    else { f.h[o+2] = 0; f.tr[p.id] = null; }
  }
  recHead = (recHead + 1) % REC; recCount = Math.min(REC, recCount + 1);
}
function recFrames(from, to){
  const out = [];
  for (let k = 0; k < recCount; k++){
    const f = rec[(recHead - recCount + k + REC*2) % REC];
    if (f.t >= from && f.t <= to) out.push(f);
  }
  return out;
}

/* ---------- Input ---------- */
let mode = 'live';
const keys = new Set();
const KEYV = { ArrowRight:[1,0], KeyD:[1,0], ArrowLeft:[-1,0], KeyA:[-1,0], ArrowDown:[0,1], KeyS:[0,1], ArrowUp:[0,-1], KeyW:[0,-1] };
function applyKeys(){
  let x = 0, y = 0; for (const k of keys){ x += KEYV[k][0]; y += KEYV[k][1]; }
  if ((x || y) && me.alive && mode === 'live') me.target = Math.atan2(y, x);
}
addEventListener('keydown', e => {
  if (mode === 'replay' && ['Space','Enter','Escape'].includes(e.code)){ e.preventDefault(); endReplay(); return; }
  if (e.code in KEYV){ e.preventDefault(); keys.add(e.code); applyKeys(); }
  else if ((e.code === 'Space' || e.code === 'Enter') && !overlay.hidden && document.activeElement?.tagName !== 'BUTTON'){ e.preventDefault(); start(); }
});
addEventListener('keyup', e => { if (keys.delete(e.code)) applyKeys(); });
let joy = null;
function mouseSteer(e){
  if (!me.alive || mode !== 'live') return;
  const dx = e.clientX - vw/2, dy = e.clientY - vh/2;
  if (dx*dx + dy*dy > 64) me.target = Math.atan2(dy, dx);
}
canvas.addEventListener('pointerdown', e => {
  if (mode === 'replay'){ endReplay(); return; }
  if (e.pointerType === 'mouse'){ mouseSteer(e); return; }
  joy = { id:e.pointerId, ax:e.clientX, ay:e.clientY, fx:e.clientX, fy:e.clientY };
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse'){ mouseSteer(e); return; }
  if (!joy || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ax, dy = e.clientY - joy.ay; const L = Math.hypot(dx, dy);
  if (L > 8 && me.alive && mode === 'live') me.target = Math.atan2(dy, dx);
  if (L > 55){ joy.ax = e.clientX - dx/L*55; joy.ay = e.clientY - dy/L*55; }
  joy.fx = e.clientX; joy.fy = e.clientY;
});
['pointerup','pointercancel'].forEach(n => canvas.addEventListener(n, e => { if (joy && e.pointerId === joy.id) joy = null; }));

/* ---------- UI ---------- */
const $ = id => document.getElementById(id);
const overlay = $('overlay'), toastEl = $('toast'), pctEl = $('pct'), boardEl = $('board'), scoreEl = $('score'), rbar = $('rbar');
const fmt = n => n.toLocaleString('sv-SE', { maximumFractionDigits:1, minimumFractionDigits:1 }) + ' %';
const label = p => p === me ? 'Du' : `${p.emo} ${p.name}`;
const chip = p => `<span class="chip" style="--c:${p.color}">${label(p)}</span>`;
function causeHtml(d){
  if (d.cause === 'cut') return `${chip(d.killer)} körde på ditt spår.`;
  if (d.cause === 'surround') return d.killer ? `${chip(d.killer)} ringade in hela ditt område.` : 'Hela ditt område togs.';
  if (d.cause === 'wall') return 'Du körde in i kanten.';
  return 'Du körde på ditt eget spår.';
}
let toastTimer = 0;
function toast(t){ toastEl.textContent = t; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600); }
let best = 0; try { best = parseFloat(localStorage.getItem('revir-best')) || 0; } catch(e){}

function liveFrame(){
  const h = new Float32Array(56);
  for (const p of players){ const o = p.id*7; if (p.alive){ const [x, y] = headPos(p); h[o] = x; h[o+1] = y; h[o+2] = 1; } }
  return { terr:owner, h, tr:players.map(p => p.alive && p.pts.length ? [p.pts, p.pts.length] : null) };
}
function showCard(win){
  if (me.maxPct > best){ best = me.maxPct; try { localStorage.setItem('revir-best', String(best)); } catch(e){} }
  if (win){
    $('title').textContent = win === me ? 'Du vann! 🏆' : 'Rundan är slut';
    $('msg').innerHTML = win === me ? 'Du tog 30 % av banan först.' : `${chip(win)} tog 30 % av banan först.`;
    $('again').hidden = true;
    drawMini(liveFrame(), null);
  } else {
    $('title').textContent = 'Utslagen!';
    $('msg').innerHTML = causeHtml(death);
    const fr = recFrames(death.t - 4000, death.t);
    $('again').hidden = fr.length < 5;
    drawMini(fr.length ? fr[fr.length-1] : null, death);
  }
  $('sPct').textContent = fmt(me.maxPct);
  $('sKills').textContent = me.kills;
  $('sBest').textContent = fmt(best);
  $('stats').hidden = false;
  $('play').textContent = 'Spela igen';
  overlay.hidden = false; scoreEl.hidden = true; boardEl.hidden = false;
  $('play').focus();
}
const miniBuf = document.createElement('canvas'); miniBuf.width = W; miniBuf.height = H;
function drawMini(f, dd){
  const wrap = $('mapwrap'), mc = $('mini');
  if (!f){ wrap.hidden = true; return; }
  wrap.hidden = false;
  const S = 140, r = Math.min(2, window.devicePixelRatio || 1), k = S / W;
  mc.width = S*r; mc.height = S*r;
  const bg = miniBuf.getContext('2d'), img = bg.createImageData(W, H), d = img.data;
  const [fr, fg, fb] = hexRgb(theme.field || (css.field.startsWith('#') ? css.field : '#e6edf6'));
  for (let i = 0; i < N; i++){
    const o = f.terr[i], q = i*4;
    if (o){ const c = players[o-1].rgbL; d[q] = c[0]; d[q+1] = c[1]; d[q+2] = c[2]; }
    else { d[q] = fr; d[q+1] = fg; d[q+2] = fb; }
    d[q+3] = 255;
  }
  bg.putImageData(img, 0, 0);
  const m = mc.getContext('2d'); m.setTransform(r, 0, 0, r, 0, 0);
  m.imageSmoothingEnabled = true; m.drawImage(miniBuf, 0, 0, S, S);
  m.lineCap = m.lineJoin = 'round'; m.lineWidth = 2;
  for (const p of players){
    const tr = f.tr[p.id]; if (!tr || tr[1] < 2) continue;
    const [pts, len] = tr, o = p.id*7;
    m.strokeStyle = p.trailCol; m.beginPath(); m.moveTo(pts[0]*k, pts[1]*k);
    for (let j = 2; j < len; j += 2) m.lineTo(pts[j]*k, pts[j+1]*k);
    m.lineTo(f.h[o]*k, f.h[o+1]*k); m.stroke();
  }
  if (!dd) return;
  if (dd.killer){
    const o = dd.killer.id*7;
    if (f.h[o+2]){ m.fillStyle = dd.killer.dark; m.beginPath(); m.arc(f.h[o]*k, f.h[o+1]*k, 4, 0, TAU); m.fill(); }
  }
  const x = dd.x*k, y = dd.y*k;
  m.lineCap = 'round';
  for (const [w, c] of [[6, '#fff'], [3, '#e5484d']]){
    m.strokeStyle = c; m.lineWidth = w; m.beginPath();
    m.moveTo(x-6, y-6); m.lineTo(x+6, y+6); m.moveTo(x+6, y-6); m.lineTo(x-6, y+6); m.stroke();
  }
}

let rp = { frames:[], idx:0, clock:0, start:0, end:0, burst:false };
function startReplay(){
  const frames = recFrames(death.t - 3200, death.t + 300);
  if (frames.length < 5){ showCard(); return; }
  rp = { frames, idx:0, clock:0, start:frames[0].t, end:frames[frames.length-1].t, burst:false };
  particles.length = 0; joy = null;
  mode = 'replay';
  $('rtext').innerHTML = causeHtml(death);
  overlay.hidden = true; scoreEl.hidden = true; boardEl.hidden = true; rbar.hidden = false;
}
function endReplay(){
  if (mode !== 'replay') return;
  mode = 'live'; rbar.hidden = true; particles.length = 0;
  showCard();
}
$('again').addEventListener('click', startReplay);
function endRound(w){
  me.maxPct = Math.max(me.maxPct, counts[0] / N * 100);
  updateHud(); mode = 'ended'; joy = null; $('fx').innerHTML = '';
  if (w === me){ const [x, y] = headPos(me); for (let k = 0; k < 6; k++) burstAt(x, y, theme.pal[k]); }
  setTimeout(() => showCard(w), 1000);
}

function resetWorld(){
  owner.fill(0); trail.fill(0); counts.fill(0); particles.length = 0; snapDirty = true;
  for (const p of players){ p.alive = false; p.pts = []; p.cells = []; }
  builtFrom = null;
  for (const p of players) if (p.isBot) spawn(p);
  items.length = 0; itemT = 0;
  for (let k = 0; k < 4; k++) spawnItem();
}
function start(){
  resetWorld(); rings.length = 0; spawn(me); me.kills = 0; me.maxPct = 0; death = null; recCount = 0; keys.clear();
  mode = 'live'; overlay.hidden = true; rbar.hidden = true; scoreEl.hidden = false; boardEl.hidden = false;
}
$('play').addEventListener('click', start);
function updateHud(){
  const pct = counts[0] / N * 100;
  if (me.alive){ me.maxPct = Math.max(me.maxPct, pct); pctEl.textContent = fmt(pct); $('barFill').style.width = Math.min(100, pct / (GOAL*100) * 100) + '%'; }
  $('fx').innerHTML = me.alive && mode === 'live' ? [[me.shieldUntil, 0], [me.speedUntil, 1], [me.frozenUntil, 2]].filter(([u]) => u > now).map(([u, k]) => `<span>${PW[k].emo} ${Math.ceil((u - now)/1000)}</span>`).join('') : '';
  const list = players.filter(p => p.alive).sort((a, b) => counts[b.id] - counts[a.id]).slice(0, 5);
  boardEl.innerHTML = list.map(p => `<div class="${p===me?'me':''}" style="--c:${p.color}"><span>${label(p)}</span><span>${fmt(counts[p.id]/N*100)}</span></div>`).join('');
}

/* ---------- Render ---------- */
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function circle(x, y, r){ ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function drawHead(p, ang, X, Y, s){
  const r = PR*s*1.1;
  ctx.fillStyle = p.dark; circle(X, Y, r + Math.max(1.5, s*.35));
  ctx.fillStyle = p.color; circle(X, Y, r);
  if (p.isBot){
    ctx.font = `${r*1.25}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.emo, X, Y + r*.06);
  } else {
    const c = Math.cos(ang), sn = Math.sin(ang);
    for (const k of [-1, 1]){
      const ex = X + c*r*.3 - sn*r*.42*k, ey = Y + sn*r*.3 + c*r*.42*k;
      ctx.fillStyle = '#fff'; circle(ex, ey, r*.3);
      ctx.fillStyle = '#1c2738'; circle(ex + c*r*.12, ey + sn*r*.12, r*.16);
    }
  }
}

// view: { heads:[{p,x,y,ang}], trails:[{p,pts,len,hx,hy}], cx, cy, s, ring, mark }
function render(v){
  const s = v.s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = wallCol; ctx.fillRect(0, 0, vw, vh);
  const ox = vw/2 - v.cx*s, oy = vh/2 - v.cy*s;
  ctx.save(); ctx.translate(Math.round(ox), Math.round(oy)); ctx.fillStyle = pattern; ctx.fillRect(0, 0, W*s, H*s); ctx.restore();
  flushImg();
  ctx.imageSmoothingEnabled = true;
  const ow = Math.max(1.5, s*.35);
  for (const [dx, dy] of [[-ow, 0], [ow, 0], [0, -ow], [0, ow]]) ctx.drawImage(cvD, ox + dx, oy + dy, W*s, H*s);
  ctx.drawImage(cvL, ox, oy, W*s, H*s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = TR*2*s;
  for (const t of v.trails){
    if (!t.len) continue;
    ctx.strokeStyle = t.p.trailCol; ctx.beginPath();
    ctx.moveTo(ox + t.pts[0]*s, oy + t.pts[1]*s);
    for (let j = 2; j < t.len; j += 2) ctx.lineTo(ox + t.pts[j]*s, oy + t.pts[j+1]*s);
    ctx.lineTo(ox + t.hx*s, oy + t.hy*s); ctx.stroke();
  }
  for (const it of v.items){
    const X = ox + it.x*s, gy = oy + it.y*s, Y = gy + Math.sin(now/300 + it.x)*s*.35, R = s*2;
    if (X < -40 || Y < -40 || X > vw + 40 || Y > vh + 40) continue;
    ctx.globalAlpha = .22; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(X, gy + s*2.1, R*.8, R*.28, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.92)'; circle(X, Y, R);
    ctx.strokeStyle = PW[it.k].col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, R, 0, TAU); ctx.stroke();
    ctx.font = `${R*1.1}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(PW[it.k].emo, X, Y + R*.05);
  }
  if (v.mark){
    const m = v.mark, X = ox + m.x*s, Y = oy + m.y*s, pulse = (now/400) % 1;
    ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 3; ctx.globalAlpha = m.a*(1 - pulse);
    ctx.beginPath(); ctx.arc(X, Y, s*(2.5 + pulse*4), 0, TAU); ctx.stroke();
    ctx.globalAlpha = m.a;
    for (const [w, c] of [[8, '#fff'], [4.5, '#e5484d']]){
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
      ctx.moveTo(X - s*1.4, Y - s*1.4); ctx.lineTo(X + s*1.4, Y + s*1.4); ctx.moveTo(X + s*1.4, Y - s*1.4); ctx.lineTo(X - s*1.4, Y + s*1.4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  v.heads.sort((a, b) => a.y - b.y);
  for (const h of v.heads){
    const X = ox + h.x*s, Y = oy + h.y*s;
    if (X < -60 || Y < -60 || X > vw + 60 || Y > vh + 60) continue;
    const big = v.ring === h.p, r = PR*s*1.1;
    if (big){
      const pulse = .5 + .5*Math.sin(now/120);
      ctx.strokeStyle = h.p.color; ctx.lineWidth = 3 + pulse*2;
      ctx.beginPath(); ctx.arc(X, Y, r*(1.7 + pulse*.25), 0, TAU); ctx.stroke();
    }
    if (h.sp > 0){
      const c = Math.cos(h.ang), sn = Math.sin(h.ang);
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(2, s*.35); ctx.lineCap = 'round'; ctx.beginPath();
      for (const k of [-1, 0, 1]){
        const bx = X - c*r*1.3 - sn*r*.6*k, by = Y - sn*r*1.3 + c*r*.6*k, L = s*(k ? 2.5 : 4);
        ctx.moveTo(bx, by); ctx.lineTo(bx - c*L, by - sn*L);
      }
      ctx.stroke();
    }
    drawHead(h.p, h.ang, X, Y, s);
    if (h.sh > 0 && (h.sh > 1000 || Math.floor(now/120) % 2)){
      ctx.fillStyle = 'rgba(255,255,255,.22)'; circle(X, Y, r*1.75);
      ctx.strokeStyle = PW[0].col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, r*1.75, 0, TAU); ctx.stroke();
    }
    if (h.fz > 0){
      ctx.fillStyle = 'rgba(175,225,255,.6)'; circle(X, Y, r*1.2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, r*1.2, 0, TAU); ctx.stroke();
      ctx.font = `${r*.9}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('❄️', X + r*.9, Y - r*.9);
    }
    if (h.p.isBot || big){
      ctx.font = `${big ? 800 : 700} ${Math.max(12, s*(big ? 2.8 : 2.1))}px ui-rounded,'SF Pro Rounded','Nunito','Varela Round','Segoe UI',system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,.45)';
      const ty = Y - r - s*(big ? 1.6 : 1);
      ctx.strokeText(h.p.name, X, ty); ctx.fillStyle = '#fff'; ctx.fillText(h.p.name, X, ty);
    }
  }
  for (const q of particles){
    ctx.globalAlpha = Math.max(0, q.life); ctx.fillStyle = q.color;
    const z = s*1.2*q.life + 2; ctx.fillRect(ox + q.x*s - z/2, oy + q.y*s - z/2, z, z);
  }
  ctx.globalAlpha = 1;
}

let camX = W/2, camY = H/2;
function renderLive(){
  if (builtFrom !== owner){ rebuild(owner); builtFrom = owner; }
  if (me.alive){ [camX, camY] = headPos(me); }
  const heads = [], trails = [];
  for (const p of players){
    if (!p.alive) continue;
    const [x, y] = headPos(p);
    heads.push({ p, x, y, ang:p.ang, sh:p.shieldUntil - now, sp:p.speedUntil - now, fz:p.frozenUntil - now });
    if (p.pts.length) trails.push({ p, pts:p.pts, len:p.pts.length, hx:x, hy:y });
  }
  render({ heads, trails, items, cx:camX, cy:camY, s:U, ring:null, mark:null });
  const ox = vw/2 - camX*U, oy = vh/2 - camY*U;
  for (let k = rings.length - 1; k >= 0; k--){
    const g = rings[k], a = (now - g.t0) / 700;
    if (a >= 1){ rings.splice(k, 1); continue; }
    ctx.globalAlpha = 1 - a; ctx.strokeStyle = g.col; ctx.lineWidth = 6*(1 - a) + 2;
    ctx.beginPath(); ctx.arc(ox + g.x*U, oy + g.y*U, U*10*(.3 + a*.9), 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (joy && me.alive){
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = .35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(joy.ax, joy.ay, 55, 0, TAU); ctx.stroke();
    const dx = joy.fx - joy.ax, dy = joy.fy - joy.ay, L = Math.hypot(dx, dy) || 1, k = Math.min(1, 55/L);
    ctx.globalAlpha = .5; ctx.fillStyle = '#fff'; circle(joy.ax + dx*k, joy.ay + dy*k, 20);
    ctx.globalAlpha = 1;
  }
}
function renderReplay(){
  const tNow = rp.start + rp.clock, fr = rp.frames;
  while (rp.idx < fr.length - 1 && fr[rp.idx+1].t <= tNow) rp.idx++;
  const f = fr[rp.idx];
  if (builtFrom !== f.terr){ rebuild(f.terr); builtFrom = f.terr; }
  const heads = [], trails = [];
  for (const p of players){
    const o = p.id*7; if (!f.h[o+2]) continue;
    heads.push({ p, x:f.h[o], y:f.h[o+1], ang:f.h[o+3], sh:f.h[o+4], sp:f.h[o+5], fz:f.h[o+6] });
    const tr = f.tr[p.id];
    if (tr && tr[1]) trails.push({ p, pts:tr[0], len:tr[1], hx:f.h[o], hy:f.h[o+1] });
  }
  const cx = f.h[2] ? f.h[0] : death.hx, cy = f.h[2] ? f.h[1] : death.hy;
  const until = death.t - tNow;
  const mark = until < 700 ? { x:death.x, y:death.y, a:Math.min(1, (700 - until)/400) } : null;
  render({ heads, trails, items:f.it.map(a => ({ x:a[0], y:a[1], k:a[2] })), cx, cy, s:U*.8, ring:death.killer, mark });
}

/* ---------- Loop ---------- */
let saved = 'klassisk'; try { saved = localStorage.getItem('revir-theme') || 'klassisk'; } catch(e){}
applyTheme(saved);
resetWorld();
let last = performance.now(), hudT = 0;
function frame(t){
  const dt = Math.min(50, t - last) / 1000; last = t; now = t;
  if (mode === 'live'){
    for (const p of players){
      if (!p.alive){ if (p.isBot && p.respawnAt && t >= p.respawnAt) spawn(p); continue; }
      if (p.isBot && t >= p.thinkT){ p.thinkT = t + 80; botThink(p); }
      update(p, dt);
      if (p.alive) pickups(p);
    }
    tickItems();
    for (const p of players) if (p.alive && counts[p.id] === 0 && !shielded(p)) kill(p, p.lastTaker, 'surround', p.x, p.y);
    if (me.alive || (death && t - death.t < 350)) record(t);
    if (me.alive) for (const p of players) if (p.alive && counts[p.id] >= N*GOAL){ endRound(p); break; }
  } else if (mode === 'replay'){
    rp.clock += dt*1000*.55;
    if (!rp.burst && rp.start + rp.clock >= death.t){ rp.burst = true; burstAt(death.hx, death.hy, me.color); }
    if (rp.start + rp.clock > rp.end + 1000) endReplay();
  }
  const sp = mode === 'replay' ? .55 : 1;
  for (let k = particles.length - 1; k >= 0; k--){
    const q = particles[k];
    q.x += q.vx*dt*sp; q.y += q.vy*dt*sp; q.vx *= .93; q.vy *= .93; q.life -= dt*sp/.7;
    if (q.life <= 0) particles.splice(k, 1);
  }
  if (mode === 'replay') renderReplay(); else renderLive();
  if (mode === 'live' && t - hudT > 200){ hudT = t; updateHud(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- Offline (PWA) ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
})();
