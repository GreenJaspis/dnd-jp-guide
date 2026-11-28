// サイトを組み立てるスクリプト。`npm run build` で dist/ に出力する。
// 本文は src/pages/<id>.html、ページの並びは src/site.mjs、
// 用語集と特性のデータは src/data/ にある。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import {CH, PAGES, OLD} from './src/site.mjs';
import {G, CATS} from './src/data/glossary.mjs';
import {TR, TCOLS} from './src/data/traits.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = id => id === 'top' ? '/' : `/${id}/`;
const byId = Object.fromEntries(PAGES.map(p => [p.id, p]));
const warnings = [];

// ---- 本文の <...> を注記タグにする(用語集の書き方)
// タグの名前と色(class)。凡例(トップ)と同じ対応にしておく。
const TAGCLS = [['単一出典', 't-single'], ['プレイ報告', 't-play'], ['情報割れ', 't-conf'], ['解釈割れ', 't-interp'],
  ['推論', 't-inf'], ['仮訳', 't-tr'], ['準備中', 't-prep'], ['画面で確認', 't-ok'], ['表記確認済', 't-name'],
  ['セーブで確認', 't-save'], ['旧版の画面', 't-old']];
const tagClass = name => (TAGCLS.find(([k]) => name.startsWith(k)) || [null, 't-tr'])[1];
// 用語集・特性の説明文の中の <タグ名> をタグの表示にする(いくつあってもよい)
function tagify(text) {
  return String(text).split(/(<[^<>]+>)/).map(s => {
    const m = s.match(/^<([^<>]+)>$/);
    return m ? `<span class="tag ${tagClass(m[1])}">${esc(m[1])}</span>` : esc(s);
  }).join('');
}
const plain = s => String(s).replace(/[<>]/g, '');

// ---- 読み込み
const load = html => cheerio.load(html, null, false);
const pages = PAGES.map(p => {
  const file = path.join(SRC, 'pages', p.id + '.html');
  if (!fs.existsSync(file)) throw new Error(`本文がありません: src/pages/${p.id}.html`);
  return {p, $: load(fs.readFileSync(file, 'utf8'))};
});
const legend = pages.find(x => x.p.id === 'top').$('#legend-main').html() || '';

// ---- 1回目: 見出しに id を付け、id → ページの対応表と検索索引を作る
const anchors = {};
const sections = [];
for (const {p, $} of pages) {
  if (p.id !== 'top' && p.id !== 'glossary') {
    $.root().children('h3').each((i, h) => { if (!$(h).attr('id')) $(h).attr('id', `${p.id}-s${i + 1}`); });
  }
  $('[id]').each((_, el) => {
    const id = $(el).attr('id');
    if (anchors[id] && anchors[id] !== p.id) warnings.push(`id「${id}」が ${anchors[id]} と ${p.id} で重複`);
    anchors[id] = p.id;
  });
  $('[data-legend]').each((_, el) => { $(el).html(legend); });
  if (p.id === 'glossary') continue;
  let cur = {u: url(p.id), p: p.t, t: p.t, x: ''};
  sections.push(cur);
  $.root().children().each((_, el) => {
    const $el = $(el);
    if (el.tagName === 'script') return;
    if (el.tagName === 'h3' && $el.attr('id')) {
      const c = $el.clone(); c.find('.tag').remove();
      cur = {u: `${url(p.id)}#${$el.attr('id')}`, p: p.t, t: c.text().trim(), x: ''};
      sections.push(cur);
      return;
    }
    cur.x += ' ' + $el.text().replace(/\s+/g, ' ');
  });
}
for (const s of sections) s.x = s.x.replace(/\s+/g, ' ').trim();

// ---- ページごとの部品
const chapnav = cur => CH.map(c => {
  const first = PAGES.find(q => q.ch === c.id);
  return `<a href="${url(first.id)}" data-ch="${c.id}"${c.id === cur ? ' aria-current="page"' : ''}>${esc(c.name)}</a>`;
}).join('');

function subnav(p) {
  const sib = PAGES.filter(q => q.ch === p.ch);
  if (sib.length < 2) return '';
  const name = CH.find(c => c.id === p.ch).name;
  return `<div class="subnav"><span class="sublab">${esc(name)}</span>` +
    sib.map(q => `<a href="${url(q.id)}"${q.prep ? ' class="prep"' : ''}${q.id === p.id ? ' aria-current="page"' : ''}>${esc(q.t)}</a>`).join('') + '</div>';
}

function pager(p) {
  const i = PAGES.findIndex(q => q.id === p.id);
  const prev = PAGES[i - 1], next = PAGES[i + 1];
  const a = prev && prev.id !== 'top' ? `<a href="${url(prev.id)}" class="prev">← ${esc(prev.t)}</a>` : '<span></span>';
  const b = next ? `<a href="${url(next.id)}" class="next">${esc(next.t)} →</a>` : '<span></span>';
  return `<div class="pager">${a}<a href="/" class="totop">トップへ</a>${b}</div>`;
}

function feedback(p) {
  const f = cfg.feedback || {}, g = cfg.giscus || {};
  const hasForm = !!f.formUrl;
  const hasGiscus = !!(g.repo && g.repoId && g.category && g.categoryId);
  if (!hasForm && !hasGiscus) return '';
  let h = '<div class="feedback" id="feedback"><h3>このページへの指摘・コメント</h3>' +
    '<p>間違いや、ゲームの画面と違うところを見つけたら教えてください。</p>';
  if (hasForm) {
    const u = new URL(f.formUrl);
    if (f.pageEntry) { u.searchParams.set('usp', 'pp_url'); u.searchParams.set(f.pageEntry, `${p.t}(${url(p.id)})`); }
    h += `<p><a class="fbtn" href="${esc(u.toString())}" target="_blank" rel="noopener">修正を依頼する(フォーム)</a></p>`;
  }
  if (hasGiscus) {
    h += '<p class="count">下のコメント欄は GitHub のアカウントで書き込めます。アカウントがない方は上のフォームからどうぞ。</p>' +
      `<div class="giscus"></div><script src="https://giscus.app/client.js" data-repo="${esc(g.repo)}" data-repo-id="${esc(g.repoId)}"` +
      ` data-category="${esc(g.category)}" data-category-id="${esc(g.categoryId)}" data-mapping="pathname" data-strict="1"` +
      ' data-reactions-enabled="1" data-emit-metadata="0" data-input-position="top" data-theme="preferred_color_scheme"' +
      ' data-lang="ja" data-loading="lazy" crossorigin="anonymous" async></script>';
  }
  return h + '</div>';
}

function toc($, p) {
  if (p.id === 'top' || p.id === 'glossary') return;
  const hs = $.root().children('h3').toArray();
  if (hs.length < 4) return;
  const items = hs.map(h => {
    const c = $(h).clone(); c.find('.tag').remove();
    return `<li><a href="#${$(h).attr('id')}">${esc(c.text().trim())}</a></li>`;
  }).join('');
  const d = `<details class="toc" open><summary>このページの内容</summary><ol>${items}</ol></details>`;
  const lead = $.root().children('.lead').first();
  (lead.length ? lead : $.root().children('h2').first()).after(d);
}

function formationGrids($) {
  $('.fgrid').each((_, g) => {
    const $g = $(g);
    $g.before('<div class="fhead" aria-hidden="true"><span>後衛</span><span>中衛</span><span>前衛 → 敵</span></div>');
    const cells = $g.children().toArray().map(c => $(c).text().trim());
    const cols = ['後衛', '中衛', '前衛'].map((n, ci) => {
      const v = [0, 1, 2].map(r => cells[r * 3 + ci]).filter(Boolean);
      return n + ': ' + (v.length ? v.join('、') : 'なし');
    });
    $g.attr('role', 'img').attr('aria-label', ($g.attr('aria-label') || '配置図') + '。' + cols.join('。') + '。右が敵の方向');
  });
}

// ---- 特定のページの中身
function topMenu($) {
  const html = CH.filter(c => c.id !== 'top').map(c => {
    const lis = PAGES.filter(p => p.ch === c.id).map(p =>
      `<li><a href="${url(p.id)}">${esc(p.t)}</a>` +
      (p.prep ? '<span class="tag t-prep">準備中</span>' : '') +
      (p.d ? `<span class="md">${esc(desc(p))}</span>` : '') + '</li>').join('');
    return `<div class="mcard"><h3>${esc(c.name)}</h3><ul>${lis}</ul></div>`;
  }).join('');
  $('#menu').html(html);
}

function glossary($) {
  $('#chips').html(`<button type="button" data-k="all" aria-pressed="true">すべて</button>` +
    Object.entries(CATS).map(([k, v]) => `<button type="button" data-k="${k}" aria-pressed="false">${esc(v)}</button>`).join(''));
  let html = '';
  for (const k of Object.keys(CATS)) {
    const items = G.filter(g => g[0] === k);
    if (!items.length) continue;
    html += `<h3 class="gcat" data-cat="${k}">${esc(CATS[k])}</h3>`;
    for (const g of items) {
      html += `<div class="entry" data-cat="${k}"><div class="hd"><span class="ja">${esc(g[2])}</span>` +
        (g[3] ? '<span class="tag t-name">表記確認済</span>' : '<span class="tag t-tr">仮訳</span>') +
        `<span class="en">${esc(g[1])}</span></div><p class="desc">${tagify(g[4])}</p>` +
        (g[5] && g[5] !== '—' ? `<p class="who"><b>効く対象: </b>${tagify(g[5])}</p>` : '') + '</div>';
    }
  }
  $('#glist').html(html);
  $('#count').text(G.length + ' 件');
}

function traits($) {
  $('#trcount').text(String(TR.length));
  const groups = [];
  TCOLS.forEach(c => { const g = groups[groups.length - 1]; if (g && g[0] === c[2]) g[1]++; else groups.push([c[2], 1]); });
  $('#ttable thead').html('<tr><th class="nm" rowspan="2">特性</th>' +
    groups.map(g => `<th colspan="${g[1]}" class="grp">${esc(g[0])}</th>`).join('') + '</tr><tr>' +
    TCOLS.map(c => `<th>${esc(c[1])}</th>`).join('') + '</tr>');
  $('#tcol').html('<option value="">(列を選ばない)</option>' + TCOLS.map(c => `<option value="${c[0]}">${esc(c[2] + ': ' + c[1])}</option>`).join(''));
  const SYM = {o: '○', x: '✕', t: '△'};
  const parse = m => Object.fromEntries((m || '').split(' ').filter(Boolean).map(x => x.split(':')));
  $('#ttable tbody').html(TR.map(r => {
    const m = parse(r[3]);
    const det = '【' + r[6] + '・' + r[7] + '】' + r[8] + (r[9] ? '(関連する能力値: ' + r[9] + ')' : '') + ' ／ DWIKI の要約: ' + r[4];
    return `<tr class="row" tabindex="0" aria-expanded="false" data-en="${esc(r[0])}" data-ja="${esc(r[1])}" data-pol="${esc(r[6])}" data-race="${r[5] ? 1 : 0}" data-m="${esc(r[3])}">` +
      `<td class="nm"><b>${esc(r[1])}</b></td>` +
      TCOLS.map(c => { const v = m[c[0]]; return v ? `<td class="m${v}">${SYM[v]}</td>` : '<td></td>'; }).join('') +
      `</tr><tr class="det" hidden><td colspan="${TCOLS.length + 1}"><div class="detin">${esc(det)}</div></td></tr>`;
  }).join(''));
  $('#tcount').text(TR.length + ' 件');
}

// ---- 本文の出典の略称(STORE・PATCH・CNOTE・外部攻略記事・DWIKI・ITCH)を、出典と注意ページの該当の節へのリンクにする
const SRCLINK = {STORE: 'src-store', PATCH: 'src-patch', CNOTE: 'src-cnote', '外部攻略記事': 'src-ext', DWIKI: 'src-dwiki', ITCH: 'src-itch'};
const SRCRE = /(?<![A-Za-z])(STORE|PATCH|CNOTE|DWIKI|ITCH)(?![A-Za-z])|外部攻略記事/g;
function srcLinks($) {
  const skip = new Set(['a', 'code', 'script', 'style', 'h1', 'h2', 'h3', 'h4', 'title', 'button', 'option']);
  const walk = el => {
    for (const n of [...(el.children || [])]) {
      if (n.type === 'text') {
        const s = n.data;
        if (!SRCRE.test(s)) { SRCRE.lastIndex = 0; continue; }
        SRCRE.lastIndex = 0;
        const html = esc(s).replace(SRCRE, m => `<a class="src" href="${url('about')}#${SRCLINK[m]}">${m}</a>`);
        $(n).replaceWith(html);
      } else if (n.type === 'tag' && !skip.has(n.name)) walk(n);
    }
  };
  walk($.root()[0]);
}

const desc = p => (p.d || '').replace('{G}', String(G.length));

// ---- 2回目: リンクの書き換えと組み立て
const layout = fs.readFileSync(path.join(SRC, 'layout.html'), 'utf8');
const assets = ['style.css', 'site.js'].map(f => fs.readFileSync(path.join(SRC, 'assets', f)));
const version = crypto.createHash('sha1').update(Buffer.concat(assets)).digest('hex').slice(0, 8);
const siteUrl = (cfg.siteUrl || '').replace(/\/$/, '');

function head(p) {
  let h = cfg.indexable ? '' : '<meta name="robots" content="noindex">\n';
  if (siteUrl) {
    h += `<link rel="canonical" href="${esc(siteUrl + url(p.id))}">\n` +
      `<meta property="og:type" content="website">\n<meta property="og:site_name" content="${esc(cfg.siteName)}">\n` +
      `<meta property="og:title" content="${esc(p.id === 'top' ? cfg.siteName : p.t)}">\n<meta property="og:url" content="${esc(siteUrl + url(p.id))}">\n`;
  }
  return h.trimEnd();
}

function render(p, content) {
  const title = p.id === 'top' ? cfg.siteName : `${p.t} | ${cfg.siteName}`;
  const description = p.id === 'top'
    ? 'ギルド経営シミュレーション「Dungeons & Dynasties」(Steam早期アクセス)の非公式・日本語攻略メモ。'
    : `${desc(p)}。「Dungeons & Dynasties」の非公式・日本語攻略メモ。`;
  const vals = {title: esc(title), description: esc(description), head: head(p), version, id: p.id,
    chapnav: chapnav(p.ch), content};
  return layout.replace(/\{\{(\w+)\}\}/g, (_, k) => vals[k] ?? '');
}

fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(path.join(OUT, 'assets'), {recursive: true});
assets.forEach((b, i) => fs.writeFileSync(path.join(OUT, 'assets', ['style.css', 'site.js'][i]), b));

for (const {p, $} of pages) {
  $('a[href^="#"]').each((_, a) => {
    const h = decodeURIComponent($(a).attr('href').slice(1));
    if (!h) return;
    const id = OLD[h] || h;
    if (byId[id]) $(a).attr('href', url(id));
    else if (anchors[id]) { if (anchors[id] !== p.id) $(a).attr('href', `${url(anchors[id])}#${id}`); }
    else warnings.push(`${p.id}: リンク先「#${h}」が見つかりません`);
  });
  toc($, p);
  formationGrids($);
  if (p.id === 'top') topMenu($);
  if (p.id === 'glossary') glossary($);
  if (p.id === 'traits') traits($);
  if (p.id !== 'about') srcLinks($);
  if (p.id !== 'top') { $.root().prepend(subnav(p)); $.root().append(feedback(p) + pager(p)); }
  const dir = path.join(OUT, p.id === 'top' ? '' : p.id);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'index.html'), render(p, $.html().trim()));
}

// 404
fs.writeFileSync(path.join(OUT, '404.html'), render({id: 'notfound', ch: '', t: 'ページが見つかりません', d: 'ページが見つかりません'},
  '<h2>ページが見つかりません</h2><p>URL が変わったか、ページがなくなった可能性があります。<a href="/">トップ</a>か、上の検索から探してください。</p>'));

// 検索索引と、旧サイトのハッシュの読み替え表
fs.writeFileSync(path.join(OUT, 'search-index.json'), JSON.stringify({
  s: sections,
  g: G.map(g => [g[2], g[1], plain(g[4])]),
  t: TR.map(r => [r[1], r[0], r[4]])
}));
const amap = Object.fromEntries(Object.entries(anchors).map(([id, pid]) => [id, byId[id] ? url(id) : `${url(pid)}#${id}`]));
for (const [o, n] of Object.entries(OLD)) amap[o] = url(n);
fs.writeFileSync(path.join(OUT, 'anchors.json'), JSON.stringify(amap));

// robots.txt と sitemap.xml
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n' + (siteUrl && cfg.indexable ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''));
if (siteUrl && cfg.indexable) {
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    PAGES.map(p => `<url><loc>${esc(siteUrl + url(p.id))}</loc></url>`).join('\n') + '\n</urlset>\n');
}

if (warnings.length) { console.warn('注意:\n  ' + warnings.join('\n  ')); }
console.log(`${PAGES.length} ページを dist/ に出力しました${cfg.indexable ? '' : '(検索エンジンには載らない設定)'}`);
