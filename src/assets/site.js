// 画面側の動き: サイト内検索、用語集と特性の絞り込み、表の補助。
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const page = document.body.dataset.page;
const params = new URLSearchParams(location.search);

// ---- 章のナビ: 現在の章が見えるようにする
{const cur = $('#chapnav [aria-current]'); if (cur) cur.scrollIntoView({block: 'nearest', inline: 'nearest'});}

// ---- 旧サイト(1ページ版)のリンク #xxx を新しい URL に読み替える
if (page === 'top' && location.hash.length > 1) {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!document.getElementById(h)) {
    fetch('/anchors.json').then(r => r.json()).then(m => { if (m[h]) location.replace(m[h]); }).catch(() => {});
  }
}

// ---- 表の補助
function fixTT() {
  const r1 = $('#ttable thead tr:first-child'); if (!r1 || !r1.offsetHeight) return;
  $$('#ttable thead tr:nth-child(2) th').forEach(th => th.style.top = r1.offsetHeight + 'px');
}
function hints() { $$('main .tbl, main .ttbl').forEach(t => t.classList.toggle('scrollx', t.scrollWidth > t.clientWidth + 2)); }
window.addEventListener('resize', () => { hints(); fixTT(); });
hints(); fixTT();

// ---- 用語集の絞り込み
if (page === 'glossary') {
  const q = $('#q'), chips = $('#chips');
  let cur = 'all';
  const entries = $$('#glist .entry').map(el => ({el, cat: el.dataset.cat, text: el.textContent.toLowerCase()}));
  const heads = $$('#glist .gcat');
  function render() {
    const term = q.value.trim().toLowerCase(); let n = 0; const seen = new Set();
    entries.forEach(e => {
      const on = (cur === 'all' || cur === e.cat) && (!term || e.text.includes(term));
      e.el.hidden = !on; if (on) { n++; seen.add(e.cat); }
    });
    heads.forEach(h => h.hidden = !seen.has(h.dataset.cat));
    $('#count').textContent = n + ' 件';
  }
  chips.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    cur = b.dataset.k; [...chips.children].forEach(c => c.setAttribute('aria-pressed', c === b ? 'true' : 'false')); render();
  });
  q.addEventListener('input', render);
  if (params.get('q')) q.value = params.get('q');
  render();
}

// ---- 特性の絞り込み
if (page === 'traits') {
  const tq = $('#tq'), sel = $('#tcol');
  let mode = 'any', pol = 'all';
  const rows = $$('#ttable tr.row').map(tr => {
    const m = Object.fromEntries((tr.dataset.m || '').split(' ').filter(Boolean).map(x => x.split(':')));
    return {tr, det: tr.nextElementSibling, en: tr.dataset.en.toLowerCase(), ja: tr.dataset.ja, pol: tr.dataset.pol, race: tr.dataset.race === '1', m};
  });
  rows.forEach(r => {
    const tog = () => { r.det.hidden = !r.det.hidden; r.tr.setAttribute('aria-expanded', r.det.hidden ? 'false' : 'true'); };
    r.tr.addEventListener('click', tog);
    r.tr.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); tog(); } });
  });
  function draw() {
    const q = tq.value.trim().toLowerCase(), col = sel.value; let n = 0;
    rows.forEach(r => {
      let on = !q || r.en.includes(q) || r.ja.includes(q);
      if (on) { if (pol === 'race') on = r.race; else if (pol !== 'all') on = r.pol === pol; }
      if (on && col) { const v = r.m[col]; on = !!v && (mode === 'any' || v === mode); }
      r.tr.hidden = !on; if (!on) { r.det.hidden = true; r.tr.setAttribute('aria-expanded', 'false'); }
      if (on) n++;
    });
    $('#tcount').textContent = n + ' 件'; fixTT();
  }
  tq.addEventListener('input', draw); sel.addEventListener('change', draw);
  $$('#tmode button').forEach(bt => bt.addEventListener('click', () => { mode = bt.dataset.m; $$('#tmode button').forEach(x => x.setAttribute('aria-pressed', x === bt ? 'true' : 'false')); draw(); }));
  $$('#tpol button').forEach(bt => bt.addEventListener('click', () => { pol = bt.dataset.p; $$('#tpol button').forEach(x => x.setAttribute('aria-pressed', x === bt ? 'true' : 'false')); draw(); }));
  if (params.get('q')) tq.value = params.get('q');
  draw();
}

// ---- サイト内検索(索引は最初に入力したときに読み込む)
const sq = $('#sq'), sres = $('#sres');
let IDX = null, loading = null;
function loadIndex() {
  if (!loading) loading = fetch('/search-index.json').then(r => r.json()).then(d => { IDX = d; });
  return loading;
}
function snip(t, term) { const i = t.toLowerCase().indexOf(term); if (i < 0) return t.slice(0, 70); const a = Math.max(0, i - 30); return (a ? '…' : '') + t.slice(a, i + term.length + 50) + '…'; }
function markIn(el, txt, term) { const i = txt.toLowerCase().indexOf(term); if (i < 0) { el.textContent = txt; return; } el.append(txt.slice(0, i)); const m = document.createElement('mark'); m.textContent = txt.slice(i, i + term.length); el.append(m, txt.slice(i + term.length)); }
function addHit(ul, href, title, sp, term) {
  const li = document.createElement('li'); const a = document.createElement('a'); a.href = href;
  const t = document.createElement('span'); t.className = 'st'; t.textContent = title; a.appendChild(t);
  if (sp) { const s2 = document.createElement('span'); s2.className = 'sp'; markIn(s2, sp, term); a.appendChild(s2); }
  a.addEventListener('click', () => { sres.innerHTML = ''; });
  li.appendChild(a); ul.appendChild(li);
}
function search() {
  const raw = sq.value.trim(); sres.innerHTML = ''; if (raw.length < 2) return;
  if (!IDX) { loadIndex().then(search); return; }
  const terms = raw.toLowerCase().split(/\s+/); const t0 = terms[0];
  const ul = document.createElement('ul'); let n = 0;
  IDX.s.forEach(e => { const all = (e.t + ' ' + e.x).toLowerCase(); if (terms.every(t => all.includes(t))) { n++; if (n <= 30) addHit(ul, e.u, e.p + (e.t !== e.p ? ' › ' + e.t : ''), snip(e.x, t0), t0); } });
  IDX.g.forEach(([ja, en, d]) => { const all = (en + ' ' + ja + ' ' + d).toLowerCase(); if (terms.every(t => all.includes(t))) { n++; if (n <= 45) addHit(ul, '/glossary/?q=' + encodeURIComponent(raw), '用語集 › ' + ja + (en && en !== '(未確認)' ? ' (' + en + ')' : ''), d, t0); } });
  IDX.t.forEach(([ja, en, d]) => { const all = (en + ' ' + ja + ' ' + d).toLowerCase(); if (terms.every(t => all.includes(t))) { n++; if (n <= 60) addHit(ul, '/traits/?q=' + encodeURIComponent(ja) + '#ttable', '特性 › ' + ja, d, t0); } });
  const c = document.createElement('div'); c.className = 'scount'; c.textContent = n ? (n + ' 件' + (n > 60 ? '(一部を表示)' : '')) : '見つかりませんでした';
  sres.appendChild(c); if (n) sres.appendChild(ul);
}
sq.addEventListener('focus', loadIndex, {once: true});
sq.addEventListener('input', search);
})();
