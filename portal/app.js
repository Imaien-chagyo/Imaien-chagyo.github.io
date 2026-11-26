/* 今井園ポータル（imaien.com/portal） */
(function () {
'use strict';

/* ================= 基本 ================= */
const $root = document.getElementById('root');
const shell = document.getElementById('shell');
const DEMO = !!window.DEMO_DATA;
let D = null;            // サーバーから受け取ったデータ（加工済み）
let token = localStorage.getItem('ip_token') || '';
let ui = { stockLoc: 'all', stockQ: '', salesTab: 'w', orderChip: 'active', orderQ: '', custChip: 'all', custQ: '', showAllActions: false, sel: null, edit: false };

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => (typeof v === 'number' ? v : parseFloat(v)) || 0;
const yen = (n) => '¥' + Math.round(n).toLocaleString('ja-JP');
const eur = (n) => '€' + num(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n, cur) => (cur === 'EUR' ? eur(n) : yen(n));
const man = (n) => { const v = n / 10000; return (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('ja-JP') : (Math.round(v * 10) / 10).toLocaleString('ja-JP')) + '万円'; };
const truthy = (v) => v === true || v === 'TRUE' || v === 'true';
const qtyFmt = (q) => (Math.round(num(q) * 1000) / 1000).toLocaleString('ja-JP');

function todayStr() { return D && D.today ? D.today : isoDate(new Date()); }
function isoDate(d) { const z = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
function addDays(s, n) { const a = s.split('-'); const d = new Date(+a[0], +a[1] - 1, +a[2] + n); return isoDate(d); }
function dayDiff(s) { if (!s) return null; const a = s.split('-'), b = todayStr().split('-'); return Math.round((new Date(+a[0], +a[1] - 1, +a[2]) - new Date(+b[0], +b[1] - 1, +b[2])) / 86400000); }
function md(s) { if (!s) return ''; const a = s.split('-'); return (+a[1]) + '/' + (+a[2]); }
function ymd(s) { return s ? s.replace(/-/g, '/') : '—'; }
function due(s) {
  const d = dayDiff(s);
  if (d === null) return { cls: '', label: '—', over: false };
  if (d < 0) return { cls: 'red', label: (-d) + '日超過', over: true };
  if (d === 0) return { cls: 'amber', label: '今日', over: false };
  if (d === 1) return { cls: '', label: '明日', over: false };
  return { cls: '', label: md(s), over: false };
}
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
function jpDate(s) { const a = s.split('-'); const d = new Date(+a[0], +a[1] - 1, +a[2]); return (+a[1]) + '月' + (+a[2]) + '日（' + WEEK[d.getDay()] + '）'; }

const ICON = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  sales: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h4"/></svg>',
  stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  input: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>'
};

/* ================= 認証 ================= */
/* ログイン用URL（imaien.com 内のユーザーのみ）で署名付きトークンを受け取り、#login= で戻ってくる */
(function takeLoginFromHash() {
  const m = /[#&]login=([\w.-]+)/.exec(location.hash);
  if (m) { token = m[1]; localStorage.setItem('ip_token', token); history.replaceState(null, '', location.pathname + '#/'); }
})();
function tokenInfo(t) {
  try {
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b + '==='.slice((b.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch (e) { return null; }
}
function tokenValid() { if (DEMO) return true; const p = token && tokenInfo(token); return !!(p && p.x - Date.now() > 60000); }
function showLogin(msg) {
  shell.innerHTML = '<div class="top"><div class="top-row"><div style="display:flex;flex-direction:column;gap:2px"><span class="title">今井園ポータル</span></div></div></div>' +
    '<div class="login"><h1>ログイン</h1><p>@' + esc(CONFIG.DOMAIN) + ' のGoogleアカウントでログインします。<br>次の画面で「ポータルに戻る」を押してください。</p>' +
    '<a class="btn primary" style="min-width:240px" href="' + esc(CONFIG.LOGIN_URL) + '">Googleアカウントでログイン</a>' +
    (msg ? '<p class="err">' + esc(msg) + '</p>' : '') + '</div>';
}
function logout() {
  if (!confirm('ログアウトしますか')) return;
  token = ''; localStorage.removeItem('ip_token'); localStorage.removeItem('ip_data');
  D = null; showLogin();
}

/* ================= API ================= */
async function api(action, payload) {
  if (DEMO) return demoApi(action, payload);
  if (!tokenValid()) { showLogin('ログインの有効期限が切れました。もう一度ログインしてください'); throw new Error('auth'); }
  const r = await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify({ token, action, payload: payload || {} }) });
  const j = await r.json();
  if (!j.ok) {
    if (j.auth) { token = ''; localStorage.removeItem('ip_token'); showLogin(j.error); }
    throw new Error(j.error || 'エラーが発生しました');
  }
  return j.data;
}
function demoApi(action) {
  if (action !== 'bootstrap') toast('デモ表示のため保存されません');
  return Promise.resolve(JSON.parse(JSON.stringify(window.DEMO_DATA)));
}

let busyEl = null;
function busy(on, text) {
  if (on) { if (!busyEl) { busyEl = document.createElement('div'); busyEl.className = 'busy'; shell.appendChild(busyEl); } busyEl.innerHTML = '<span>' + esc(text || '保存しています…') + '</span>'; }
  else if (busyEl) { busyEl.remove(); busyEl = null; }
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; shell.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
async function write(action, payload, okMsg) {
  busy(true);
  try { const data = await api(action, payload); setData(data); busy(false); if (okMsg) toast(okMsg); return true; }
  catch (e) { busy(false); if (e.message !== 'auth') alert(e.message); return false; }
}

/* ================= データ加工 ================= */
function setData(raw) {
  localStorage.setItem('ip_data', JSON.stringify(raw));
  const d = raw;
  d.cMap = {}; d.customers.forEach((c) => { d.cMap[c['取引先ID']] = c; });
  d.pMap = {}; d.products.forEach((p) => { d.pMap[p['商品ID']] = p; });
  d.aMap = {}; d.actions.forEach((a) => { d.aMap[a['参照ID']] = a; });
  const byO = {}; d.lines.forEach((l) => { (byO[l['受注ID']] = byO[l['受注ID']] || []).push(l); });
  const fx = d.eurjpy ? d.eurjpy.rate : 0;
  d.orders.forEach((o) => {
    o.c = d.cMap[o['取引先']] || { '取引先名': '（不明な取引先）', '国': '' };
    o.lines = byO[o['受注ID']] || [];
    o.total = o.lines.reduce((s, l) => s + num(l['数量']) * num(l['単価']), 0);
    const cur = o['通貨'] || 'JPY';
    const rate = cur === 'JPY' ? 1 : (num(o['為替レート']) || fx);
    o.yen = o.total * rate;
    o.cancel = truthy(o['キャンセル']);
    o.status = o.cancel ? 'cancel' : o['入金日'] ? 'done' : o['請求日'] ? 'unpaid' : o['出荷日'] ? 'uninvoiced' : 'unshipped';
    o.step = { unshipped: 1, uninvoiced: 2, unpaid: 3, done: 4, cancel: 0 }[o.status];
    o.act = d.aMap[o['受注ID']] || null;
    o.no = o['受注番号'] || '';
    const first = o.lines[0];
    o.summary = first ? ((d.pMap[first['商品']] || {})['商品名'] || first['商品']) + ' ' + qtyFmt(first['数量']) + ((d.pMap[first['商品']] || {})['単位'] || '') + (o.lines.length > 1 ? ' ほか' + (o.lines.length - 1) + '件' : '') : '明細なし';
  });
  d.orders.sort((a, b) => (b['受注日'] || '').localeCompare(a['受注日'] || '') || b.no.localeCompare(a.no));
  d.tMap = {}; d.tasks.forEach((t) => { d.tMap[t['タスクID']] = t; });
  d.projects = d.projects || []; d.pjMap = {}; d.projects.forEach((x) => { d.pjMap[x['プロジェクトID']] = x; });
  D = d;
  buildStock(d);
  render();
}
function isStockItem(p) { return !!p && !(p['在庫管理'] === false || String(p['在庫管理']).toUpperCase() === 'FALSE'); }
function r3(x) { return Math.round(x * 1000) / 1000; }
function buildStock(d) {
  const S = {};
  const grp = (pid, loc) => { const k = pid + '|' + loc; return S[k] || (S[k] = { pid, loc, qty: 0, safe: 0, lots: {} }); };
  (d.movements || []).forEach((m) => {
    const g = grp(m['商品'], m['拠点']); const q = num(m['数量']); g.qty += q;
    const lk = String(m['ロット'] || ''); const l = g.lots[lk] || (g.lots[lk] = { lot: lk, exp: '', qty: 0 });
    l.qty += q; if (m['賞味期限']) l.exp = m['賞味期限'];
  });
  (d.safety || []).forEach((x) => { grp(x['商品'], x['拠点']).safe = num(x['安全在庫']); });
  d.stock = Object.keys(S).map((k) => {
    const g = S[k]; g.qty = r3(g.qty); g.p = d.pMap[g.pid] || { '商品名': g.pid, '単位': '' };
    g.lotList = Object.keys(g.lots).map((x) => g.lots[x]).map((l) => { l.qty = r3(l.qty); return l; }).filter((l) => l.qty !== 0)
      .sort((a, b) => (a.exp || '9999').localeCompare(b.exp || '9999'));
    g.low = g.safe > 0 && g.qty < g.safe;
    g.expiring = g.lotList.filter((l) => l.qty > 0 && l.exp && dayDiff(l.exp) <= 90);
    return g;
  });
  d.sMap = {}; d.stock.forEach((g) => { d.sMap[g.pid + '|' + g.loc] = g; });
  d.stockActs = [];
  d.stock.forEach((g) => {
    const label = (g.p['商品名'] || '') + '（' + g.loc + '）';
    if (g.low) d.stockActs.push({ '作業': '発注の検討', '案件名': label, '期日': d.today, href: '#/stock-item/' + encodeURIComponent(g.pid) });
    g.expiring.forEach((l) => d.stockActs.push({ '作業': '優先販売の検討', '案件名': label + (l.lot ? ' ' + l.lot : ''), '期日': addDays(l.exp, -90), href: '#/stock-item/' + encodeURIComponent(g.pid) }));
  });
}
function unitOf(pid) { return (D.pMap[pid] || {})['単位'] || ''; }
function custLabel(c) { return (c['取引先名'] || '') + (c['国'] && c['国'] !== 'JP' ? '（' + c['国'] + '）' : ''); }
function phaseOf(c) { if (c['フェーズ']) return String(c['フェーズ']); const m = /フェーズ: ([^、\n]+)/.exec(c['メモ'] || ''); return m ? m[1].trim() : ''; }
function fyStart() { const t = todayStr(); const y = +t.slice(0, 4), m = +t.slice(5, 7); return (m >= 4 ? y : y - 1) + '-04'; }
function salesByMonth() { const r = {}; D.orders.forEach((o) => { if (!o.cancel && o['請求日']) { const k = o['請求日'].slice(0, 7); r[k] = (r[k] || 0) + o.yen; } }); return r; }
function monthsBack(n) { const t = todayStr(); let y = +t.slice(0, 4), m = +t.slice(5, 7); const out = []; for (let i = 0; i < n; i++) { out.unshift(y + '-' + String(m).padStart(2, '0')); m--; if (!m) { m = 12; y--; } } return out; }

/* ================= ルーティング ================= */
function route() { const h = (location.hash || '#/').slice(1); const [path, q] = h.split('?'); const parts = path.split('/').filter(Boolean); return { parts, q: new URLSearchParams(q || '') }; }
function go(h) { if (location.hash === h) render(); else location.hash = h; }
window.addEventListener('hashchange', () => { ui.edit = false; render(); const m = document.querySelector('main.view'); if (m) m.scrollTop = 0; });

function tabOf(p) {
  const k = p[0] || '';
  if (/^(order|orders|new-order)$/.test(k)) return 'orders';
  if (/^(sales|customer|customer-edit|project-edit)$/.test(k)) return 'sales';
  if (/^(stock|stock-item|stock-op|stocktake|products|product-edit)$/.test(k)) return 'stock';
  if (/^(input|task|task-edit)$/.test(k)) return 'input';
  return 'dash';
}
function nav(active) {
  const t = [['dash', '#/', 'ダッシュボード'], ['sales', '#/sales', '営業'], ['orders', '#/orders', '受発注'], ['stock', '#/stock', '在庫'], ['input', '#/input', '入力']];
  return '<nav class="tabs">' + t.map((x) => '<a href="' + x[1] + '" class="' + (x[0] === active ? 'on' : '') + '">' + ICON[x[0]] + '<span>' + x[2] + '</span></a>').join('') + '</nav>';
}
function top(title, opt) {
  opt = opt || {};
  const left = opt.back ? '<button class="back" data-act="back">‹ 戻る</button><span class="title">' + esc(title) + '</span>'
    : (opt.sub ? '<span class="sub">' + esc(opt.sub) + '</span>' : '') + '<span class="title">' + esc(title) + '</span>';
  const right = opt.back ? '' : '<div class="top-actions"><button class="icon-btn" data-act="reload" title="最新にする">' + ICON.reload + '</button>' + (opt.logout ? '<button class="icon-btn" data-act="logout" title="ログアウト">' + ICON.logout + '</button>' : '') + '</div>';
  return '<header class="top"><div class="top-row"><div style="display:flex;flex-direction:column;gap:2px;min-width:0">' + left + '</div>' + right + '</div>' + (opt.extra || '') + '</header>';
}

function render() {
  if (!D) return;
  const r = route(); const p = r.parts;
  let html;
  switch (p[0]) {
    case 'orders': html = viewOrders(); break;
    case 'order': html = viewOrder(decodeURIComponent(p[1] || '')); break;
    case 'new-order': html = viewOrderForm(r.q.get('c') || ''); break;
    case 'sales': html = viewSales(); break;
    case 'customer': html = viewCustomer(decodeURIComponent(p[1] || '')); break;
    case 'customer-edit': html = viewCustomerForm(decodeURIComponent(p[1] || 'new'), r.q.get('phase') || ''); break;
    case 'project-edit': html = viewProjectForm(decodeURIComponent(p[1] || 'new')); break;
    case 'stock': html = viewStock(); break;
    case 'stock-item': html = viewStockItem(decodeURIComponent(p[1] || '')); break;
    case 'stock-op': html = viewStockOp(p[1] || 'in', r.q); break;
    case 'stocktake': html = viewStocktake(r.q.get('l') || CONFIG.LOCATIONS[0]); break;
    case 'products': html = viewProducts(); break;
    case 'product-edit': html = viewProductForm(decodeURIComponent(p[1] || 'new')); break;
    case 'input': html = viewInput(); break;
    case 'task': html = viewTask(decodeURIComponent(p[1] || '')); break;
    case 'task-edit': html = viewTaskForm(); break;
    default: html = viewDash();
  }
  shell.innerHTML = html + nav(tabOf(p));
  if (p[0] === 'new-order') initOrderForm();
  if (p[0] === 'stock-op') updStockOp();
}

/* ================= ダッシュボード ================= */
function viewDash() {
  const sm = salesByMonth(); const ms = monthsBack(6); const cur = ms[5];
  const fy = fyStart(); let fyTotal = 0; Object.keys(sm).forEach((k) => { if (k >= fy && k <= cur) fyTotal += sm[k]; });
  const mlabel = (k) => (+k.slice(5)) + '月';
  const vals = ms.map((k) => sm[k] || 0);
  const maxV = Math.max(...vals, 1);
  const step = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000].map((x) => x * 10000).find((s) => s * 3 >= maxV) || Math.ceil(maxV / 3);
  const top3 = step * 3;
  if (ui.sel == null || ui.sel > 5) ui.sel = 5;
  const sel = ui.sel;
  const chart = '<div class="chart"><div class="yax">' + [3, 2, 1, 0].map((i) => '<span>' + Math.round(step * i / 10000) + '</span>').join('') + '</div>' +
    '<div style="flex:1;display:flex;flex-direction:column"><div class="plot"><div class="grid" style="top:0"></div><div class="grid" style="top:33.3%"></div><div class="grid" style="top:66.6%"></div>' +
    ms.map((k, i) => '<button class="col' + (i === sel ? ' sel' : '') + '" data-act="selmonth" data-i="' + i + '" aria-label="' + mlabel(k) + ' 売上' + man(vals[i]) + '"><i style="height:' + Math.round(vals[i] / top3 * 140) + 'px"></i></button>').join('') +
    '</div><div class="xl" style="grid-template-columns:repeat(6,minmax(0,1fr))">' + ms.map((k, i) => '<span class="' + (i === sel ? 'sel' : '') + '">' + mlabel(k) + '</span>').join('') + '</div></div></div>';

  const unpaid = D.orders.filter((o) => o.status === 'unpaid');
  const over = unpaid.filter((o) => o['支払期日'] && dayDiff(o['支払期日']) < 0);
  const notyet = unpaid.filter((o) => over.indexOf(o) < 0);
  const sum = (a) => a.reduce((s, o) => s + o.yen, 0);
  const so = sum(over), sn = sum(notyet);
  const payBar = (so + sn) > 0 ? '<div class="pay-bar">' + (so ? '<div style="flex:' + so + '"></div>' : '') + (sn ? '<div style="flex:' + sn + '"></div>' : '') + '</div>' : '';

  const acts = D.actions.concat(D.stockActs || []).sort((a, b) => (a['期日'] || '9').localeCompare(b['期日'] || '9'));
  const showN = ui.showAllActions ? acts.length : Math.min(acts.length, 10);
  const actRows = acts.slice(0, showN).map((a) => {
    const dd = due(a['期日']);
    const href = a.href ? a.href : a['種類'] === '受注' ? '#/order/' + encodeURIComponent(a['参照ID']) : '#/task/' + encodeURIComponent(a['参照ID']);
    return '<a class="row' + (dd.over ? ' over' : '') + '" href="' + href + '"><span class="t">' + esc(a['作業']) + '</span><span class="c">' + esc(a['案件名']) + '</span><span class="pill ' + dd.cls + '">' + esc(dd.label) + '</span></a>';
  }).join('');

  return top('今井園ポータル', { sub: jpDate(todayStr()), logout: true }) +
    '<main class="view">' +
    '<section class="kpis"><div class="kpi"><span>' + mlabel(cur) + 'の売上</span><b>' + man(vals[5]) + '</b></div><div class="kpi"><span>' + mlabel(ms[4]) + 'の売上</span><b>' + man(vals[4]) + '</b></div><div class="kpi"><span>今年度の累計</span><b>' + man(fyTotal) + '</b></div></section>' +
    '<section class="card pad" style="display:flex;flex-direction:column;gap:10px"><div class="h2row"><h2>月別の売上</h2><span class="note">万円・請求ベース</span></div>' +
    '<div class="legend"><span><span class="sw"></span>売上</span><span class="ro">' + mlabel(ms[sel]) + '：' + man(vals[sel]) + '</span></div>' + chart + '</section>' +
    '<section class="card pad" style="display:flex;flex-direction:column;gap:8px;cursor:pointer" data-act="goorders" data-chip="unpaid"><div class="h2row"><h2>入金待ち</h2><b style="font-size:15px">' + yen(so + sn) + '</b></div>' + payBar +
    '<div class="h2row" style="font-size:12px"><span style="color:var(--red);font-weight:700">期日超過 ' + over.length + '件 ' + yen(so) + '</span><span class="muted">期日前 ' + notyet.length + '件 ' + yen(sn) + '</span></div></section>' +
    '<section style="display:flex;flex-direction:column;gap:8px"><div class="h2row"><p class="sec-title">ネクストアクション</p><span class="note">' + acts.length + '件・期日が近い順</span></div>' +
    '<div class="card list">' + (actRows || '<div class="empty">対応が必要な作業はありません</div>') +
    (acts.length > 10 ? '<button class="more" data-act="toggleacts">' + (ui.showAllActions ? '10件だけ表示' : 'すべて表示（' + acts.length + '件）') + '</button>' : '') + '</div></section>' +
    dashProjects() + '</main>';
}

function dashProjects() {
  const list = sortedProjects().filter((x) => (x['状態'] || '進行中') === '進行中');
  if (!list.length) return '';
  return '<section style="display:flex;flex-direction:column;gap:8px"><div class="h2row"><p class="sec-title">進行中のプロジェクト</p><a class="note" href="#/sales" data-act="gopj">すべて見る</a></div>' + list.map(projectCard).join('') + '</section>';
}

/* ================= 受注 ================= */
const STEP_LABELS = ['受注', '出荷', '請求', '入金'];
function stepsHtml(o) {
  if (o.cancel) return '<div class="pill" style="align-self:flex-start">キャンセル</div>';
  return '<div class="steps" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + STEP_LABELS.map((l, i) => '<div class="' + (i < o.step ? 'done' : i === o.step ? 'cur' : '') + '"><i></i><span>' + l + '</span></div>').join('') + '</div>';
}
const ORDER_CHIPS = [['active', '進行中', (o) => ['unshipped', 'uninvoiced', 'unpaid'].indexOf(o.status) >= 0], ['unshipped', '出荷待ち', (o) => o.status === 'unshipped'], ['uninvoiced', '請求待ち', (o) => o.status === 'uninvoiced'], ['unpaid', '入金待ち', (o) => o.status === 'unpaid'], ['done', '完了', (o) => o.status === 'done'], ['all', 'すべて', () => true], ['cancel', 'キャンセル', (o) => o.cancel]];
function orderCard(o) {
  const a = o.act; const dd = a ? due(a['期日']) : null;
  return '<div class="ocard' + (o.cancel ? ' cancelled' : '') + '" data-act="open" data-href="#/order/' + encodeURIComponent(o['受注ID']) + '">' +
    '<div class="l1"><b>' + esc(custLabel(o.c)) + '</b><span class="note" style="flex:none">' + esc(o.no) + '・' + md(o['受注日']) + '</span></div>' +
    '<div class="l2"><span>' + esc(o.summary) + '</span><b>' + money(o.total, o['通貨']) + '</b></div>' + stepsHtml(o) +
    (a ? '<div class="nextline"><span class="muted">次の作業</span><span class="due-' + (dd.cls === 'red' ? 'red' : dd.cls === 'amber' ? 'amber' : 'normal') + '">' + esc(dd.label) + '</span><span>' + esc(a['作業']) + '</span></div>' : '') + '</div>';
}
function orderListHtml() {
  const chip = ORDER_CHIPS.find((c) => c[0] === ui.orderChip) || ORDER_CHIPS[0];
  const q = ui.orderQ.trim().toLowerCase();
  let list = D.orders.filter(chip[2]);
  if (q) list = list.filter((o) => (custLabel(o.c) + ' ' + o.no + ' ' + o.summary).toLowerCase().indexOf(q) >= 0);
  if (['active', 'unshipped', 'uninvoiced', 'unpaid'].indexOf(chip[0]) >= 0) list.sort((a, b) => ((a.act || {})['期日'] || '9').localeCompare((b.act || {})['期日'] || '9'));
  return list.slice(0, 150).map(orderCard).join('') || '<div class="empty">該当する受注はありません</div>';
}
function viewOrders() {
  const chip = ORDER_CHIPS.find((c) => c[0] === ui.orderChip) || ORDER_CHIPS[0];
  const chips = ORDER_CHIPS.map((c) => '<button class="chip' + (c[0] === chip[0] ? ' on' : '') + '" data-act="ochip" data-v="' + c[0] + '">' + c[1] + ' ' + D.orders.filter(c[2]).length + '</button>').join('');
  return top('受発注ボード') + '<main class="view" style="gap:12px">' +
    '<div class="chips">' + chips + '</div><input class="search" type="search" placeholder="取引先・受注番号・商品で検索" value="' + esc(ui.orderQ) + '" data-input="orderQ">' +
    '<div id="olist" style="display:flex;flex-direction:column;gap:12px">' + orderListHtml() + '</div>' +
    '<button class="btn primary" data-act="open" data-href="#/new-order">＋ 受注を登録</button></main>';
}
function viewOrder(id) {
  const o = D.orders.find((x) => x['受注ID'] === id);
  if (!o) return top('受注', { back: true }) + '<main class="view"><div class="empty">受注が見つかりません</div></main>';
  const cur = o['通貨'] || 'JPY'; const overseas = o.c['国'] && o.c['国'] !== 'JP';
  const t = todayStr();
  let actionHtml = '';
  if (!o.cancel) {
    if (o.status === 'unshipped') actionHtml = '<div class="inline-form form"><b style="font-size:14px">出荷を記録</b><div class="two"><label>出荷日<input type="date" id="f_date" value="' + t + '"></label><label>追跡番号（任意）<input id="f_track" value="' + esc(o['追跡番号']) + '"></label></div>' + shipStockNote(o) + '<button class="btn primary" data-act="ship" data-id="' + esc(id) + '">出荷を記録する</button></div>';
    if (o.status === 'uninvoiced') {
      const site = num(o.c['支払サイト日数']) || 30;
      actionHtml = '<div class="inline-form form"><b style="font-size:14px">請求を記録</b><label>請求日<input type="date" id="f_date" value="' + t + '"></label>' +
        '<div class="note">請求書は' + (overseas ? '英語' : '日本語') + 'で作成します。支払期日は請求日の' + site + '日後になります。' + (cur === 'EUR' ? '為替レートは請求日時点のEUR/JPYを自動で記録します。' : '') + '</div>' +
        '<button class="btn primary" data-act="invoice" data-id="' + esc(id) + '">請求を記録する</button></div>';
    }
    if (o.status === 'unpaid') actionHtml = '<div class="inline-form form"><b style="font-size:14px">入金を記録</b><div class="two"><label>入金日<input type="date" id="f_date" value="' + t + '"></label><label>入金額（' + cur + '）<input type="number" step="any" inputmode="decimal" id="f_amount" value="' + (Math.round(o.total * 100) / 100) + '"></label></div><button class="btn primary" data-act="pay" data-id="' + esc(id) + '">入金を記録する</button></div>';
  }
  const undoStep = { uninvoiced: 'ship', unpaid: 'invoice', done: 'payment' }[o.status];
  const kv = [['取引先', '<a href="#/customer/' + encodeURIComponent(o['取引先']) + '">' + esc(custLabel(o.c)) + '</a>'], ['受注日', ymd(o['受注日'])], ['出荷元', esc(o['出荷元'])], ['出荷予定日', ymd(o['出荷予定日'])], ['出荷日', ymd(o['出荷日'])], ['追跡番号', esc(o['追跡番号'] || '—')], ['請求日', ymd(o['請求日'])]];
  if (cur === 'EUR') kv.push(['為替レート', o['為替レート'] ? esc(o['為替レート']) + ' 円/ユーロ' : '—']);
  kv.push(['支払期日', ymd(o['支払期日'])], ['入金日', ymd(o['入金日'])], ['入金額', o['入金額'] !== '' && o['入金額'] != null ? money(o['入金額'], cur) : '—'], ['登録者', esc(o['登録者'] || '—')]);
  const lines = o.lines.map((l) => { const p = D.pMap[l['商品']] || {}; return '<tr><td>' + esc(p['商品名'] || l['商品']) + '</td><td class="r">' + qtyFmt(l['数量']) + esc(p['単位'] || '') + ' × ' + money(l['単価'], cur) + '</td><td class="r">' + money(num(l['数量']) * num(l['単価']), cur) + '</td></tr>'; }).join('');
  const editForm = ui.edit ? '<section class="card pad form"><b style="font-size:14px">内容を編集</b><div class="two"><label>出荷予定日<input type="date" id="e_plan" value="' + esc(o['出荷予定日']) + '"></label><label>出荷元<select id="e_from">' + CONFIG.LOCATIONS.map((l) => '<option' + (l === o['出荷元'] ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label></div>' +
    '<div class="two"><label>追跡番号<input id="e_track" value="' + esc(o['追跡番号']) + '"></label><label>支払期日<input type="date" id="e_due" value="' + esc(o['支払期日']) + '"></label></div><label>メモ<textarea id="e_memo">' + esc(o['メモ']) + '</textarea></label>' +
    '<div class="btns"><button class="btn ghost" data-act="editoff">やめる</button><button class="btn primary" data-act="saveorder" data-id="' + esc(id) + '">保存する</button></div></section>' : '';
  return top(o.no + '　' + (o.c['取引先名'] || ''), { back: true }) + '<main class="view" style="gap:12px">' +
    '<section class="card pad" style="display:flex;flex-direction:column;gap:10px"><div class="h2row"><b>' + esc(custLabel(o.c)) + '</b><b style="font-size:17px">' + money(o.total, cur) + '</b></div>' +
    (cur !== 'JPY' ? '<div class="note" style="text-align:right">円換算 ' + yen(o.yen) + (o['為替レート'] ? '' : '（最新レートで概算）') + '</div>' : '') + stepsHtml(o) +
    (o.act ? '<div class="nextline"><span class="muted">次の作業</span><span class="due-' + ({ red: 'red', amber: 'amber' }[due(o.act['期日']).cls] || 'normal') + '">' + esc(due(o.act['期日']).label) + '</span><span>' + esc(o.act['作業']) + '</span></div>' : '') + '</section>' +
    (actionHtml ? '<section class="card">' + actionHtml + '</section>' : '') + editForm +
    '<section class="card"><table class="lines">' + lines + '<tr class="total"><td>合計</td><td></td><td class="r">' + money(o.total, cur) + '</td></tr></table></section>' +
    '<section class="card kv">' + kv.map((x) => '<div><span>' + x[0] + '</span><span>' + x[1] + '</span></div>').join('') + '</section>' +
    (o['メモ'] ? '<section class="card memo">' + esc(o['メモ']) + '</section>' : '') +
    '<div class="btns">' + (ui.edit ? '' : '<button class="btn ghost" data-act="editon">内容を編集</button>') + (undoStep && !o.cancel ? '<button class="btn ghost" data-act="undo" data-id="' + esc(id) + '" data-step="' + undoStep + '">直前の工程を取り消す</button>' : '') +
    '<button class="btn danger" data-act="cancel" data-id="' + esc(id) + '" data-v="' + (o.cancel ? '0' : '1') + '">' + (o.cancel ? 'キャンセルを取り消す' : 'キャンセルにする') + '</button>' +
    '<button class="btn danger" data-act="delorder" data-id="' + esc(id) + '">受注を削除</button></div>' +
    '</main>';
}

function shipStockNote(o) {
  const loc = o['出荷元'];
  const need = {}; o.lines.forEach((l) => { if (isStockItem(D.pMap[l['商品']])) need[l['商品']] = (need[l['商品']] || 0) + num(l['数量']); });
  const ids = Object.keys(need); if (!ids.length) return '';
  const short = ids.filter((pid) => { const g = D.sMap[pid + '|' + loc]; return (g ? g.qty : 0) < need[pid]; });
  return '<div class="note">出荷すると、' + esc(loc) + ' の在庫から自動で差し引きます。</div>' +
    (short.length ? '<div class="warnbox">' + short.map((pid) => { const g = D.sMap[pid + '|' + loc]; return esc((D.pMap[pid] || {})['商品名']) + '：' + esc(loc) + 'の在庫 ' + qtyFmt(g ? g.qty : 0) + unitOf(pid) + '（必要 ' + qtyFmt(need[pid]) + unitOf(pid) + '）'; }).join('<br>') + '<br>在庫が足りません。出荷元を確認してください。</div>' : '');
}

/* ---------- 受注フォーム ---------- */
function viewOrderForm(cid) {
  const cs = D.customers.slice().sort((a, b) => (a['取引先名'] || '').localeCompare(b['取引先名'] || '', 'ja'));
  const opts = '<option value="">選んでください</option><option value="__new">＋ 新しい取引先を登録</option>' + cs.map((c) => '<option value="' + esc(c['取引先ID']) + '"' + (c['取引先ID'] === cid ? ' selected' : '') + '>' + esc(custLabel(c)) + '</option>').join('');
  return top('受注を登録', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="oform">' +
    '<label>取引先<input class="search" style="height:40px" placeholder="取引先名で絞り込み" id="of_cq"><select id="of_c">' + opts + '</select></label>' +
    '<div class="subform hidden" id="of_newc"><b>新しい取引先（取引先マスタにも登録されます）</b><label>取引先名<input id="nc_name" placeholder="例：Cafe Graz"></label>' +
    '<div class="two"><label>国<select id="nc_country">' + COUNTRIES.map((x) => '<option>' + x + '</option>').join('') + '</select></label><label>通貨<select id="nc_cur"><option>JPY</option><option>EUR</option></select></label></div>' +
    '<div class="two"><label>区分<select id="nc_kind">' + ['', 'カフェ', '卸', '小売', 'その他'].map((x) => '<option value="' + x + '">' + (x || '未設定') + '</option>').join('') + '</select></label><label>支払サイト（日）<input id="nc_site" type="number" inputmode="numeric" value="30"></label></div>' +
    '<label>先方の担当者・メール（任意）<input id="nc_contact" placeholder="例：山田さん yamada@example.com"></label></div>' +
    '<div id="of_lines" style="display:flex;flex-direction:column;gap:10px"></div><button class="btn ghost" data-act="addline" style="min-height:40px">＋ 商品を追加</button>' +
    '<div class="sumbox"><span class="note" id="of_curnote">合計</span><b id="of_total">¥0</b></div>' +
    '<div class="two"><label>出荷予定日<input type="date" id="of_plan" value="' + addDays(todayStr(), 3) + '"></label><label>出荷元<select id="of_from">' + CONFIG.LOCATIONS.map((l) => '<option>' + l + '</option>').join('') + '</select></label></div>' +
    '<label>メモ（任意）<textarea id="of_memo" placeholder="納品先、条件など"></textarea></label></section>' +
    '<div class="infobox" id="of_preview"></div><button class="btn primary" data-act="createorder">登録する</button></main>';
}
function lineHtml(i, cur) {
  const ps = D.products.filter((p) => truthy(p['販売中']) || p['販売中'] === '').sort((a, b) => (a['商品名'] || '').localeCompare(b['商品名'] || '', 'ja'));
  return '<div class="line-item" data-line="' + i + '"><label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:6px">商品<select class="l_p"><option value="">選択</option>' + ps.map((p) => '<option value="' + esc(p['商品ID']) + '">' + esc(p['商品名']) + '</option>').join('') + '</select></label>' +
    '<label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:6px">数量<input class="l_q" type="number" step="any" inputmode="decimal"></label>' +
    '<label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:6px">単価<span class="l_unit"></span><input class="l_u" type="number" step="any" inputmode="decimal"></label><button class="x" data-act="rmline" aria-label="削除">×</button></div>';
}
/* 取引先の絞り込み：iPhone は option の hidden が効かないため、候補を作り直す */
function filterCustSelect(text) {
  const q = text.trim().toLowerCase(); const sel = document.getElementById('of_c'); const prev = sel.value;
  const cs = D.customers.slice().sort((a, b) => (a['取引先名'] || '').localeCompare(b['取引先名'] || '', 'ja'));
  const hit = q ? cs.filter((c) => custLabel(c).toLowerCase().indexOf(q) >= 0) : cs;
  sel.innerHTML = '<option value="">' + (q ? (hit.length ? '候補 ' + hit.length + '件' : '該当する取引先がありません') : '選んでください') + '</option><option value="__new">＋ 新しい取引先を登録</option>' +
    hit.map((c) => '<option value="' + esc(c['取引先ID']) + '">' + esc(custLabel(c)) + '</option>').join('');
  if (prev === '__new') sel.value = '__new';
  else if (hit.some((c) => c['取引先ID'] === prev)) sel.value = prev;
  else sel.value = q && hit.length ? hit[0]['取引先ID'] : '';
  if (sel.value !== prev) onCustChange();
}
function isNewCust() { return document.getElementById('of_c').value === '__new'; }
function formCust() {
  if (isNewCust()) return { '取引先名': val('nc_name'), '国': val('nc_country'), '通貨': val('nc_cur'), '支払サイト日数': val('nc_site') || 30 };
  return D.cMap[document.getElementById('of_c').value] || null;
}
function formCur() { const c = formCust(); return c ? (c['通貨'] || 'JPY') : 'JPY'; }
function initOrderForm() {
  const wrap = document.getElementById('of_lines'); wrap.innerHTML = lineHtml(0); onCustChange(true); updOrderForm();
}
function onCustChange(initial) {
  document.getElementById('of_newc').classList.toggle('hidden', !isNewCust());
  const c = formCust();
  if (c) document.getElementById('of_from').value = (c['国'] && c['国'] !== 'JP') ? 'Graz' : '学大';
  if (!initial) document.querySelectorAll('#of_lines .line-item').forEach((el) => setLinePrice(el));
  updOrderForm();
}
function setLinePrice(el) {
  const p = D.pMap[el.querySelector('.l_p').value]; if (!p) return;
  const cur = formCur(); const v = cur === 'EUR' ? p['標準単価（ユーロ）'] : p['標準単価（円）'];
  el.querySelector('.l_u').value = v === '' || v == null ? '' : v;
}
function updOrderForm() {
  const cur = formCur(); let total = 0;
  document.querySelectorAll('#of_lines .line-item').forEach((el) => {
    const p = D.pMap[el.querySelector('.l_p').value];
    el.querySelector('.l_unit').textContent = '';
    el.querySelector('.l_q').placeholder = p ? (p['単位'] || '') : '';
    el.querySelector('.l_u').placeholder = cur === 'EUR' ? '€' : '¥';
    total += num(el.querySelector('.l_q').value) * num(el.querySelector('.l_u').value);
  });
  document.getElementById('of_total').textContent = money(total, cur);
  document.getElementById('of_curnote').textContent = '合計（' + cur + '）';
  const c = formCust();
  const plan = document.getElementById('of_plan').value;
  const overseas = c && c['国'] && c['国'] !== 'JP';
  const dueS = plan ? addDays(plan, -2) : '';
  document.getElementById('of_preview').innerHTML = '<b>登録するとネクストアクションに表示されます</b><span>' + (overseas ? '出荷準備・書類チェック' : '出荷準備') + '　期日 ' + (dueS ? md(dueS) + (dayDiff(dueS) <= 0 ? '（今日）' : '') : '—') + '</span>' + (c ? '<span class="note">通貨 ' + esc(c['通貨'] || 'JPY') + '・支払サイト ' + esc(c['支払サイト日数'] || 30) + '日・請求書は' + (overseas ? '英語' : '日本語') + '</span>' : '');
}
async function createOrder() {
  const sel = document.getElementById('of_c').value; const cid = sel === '__new' ? '' : sel;
  const lines = [...document.querySelectorAll('#of_lines .line-item')].map((el) => ({ productId: el.querySelector('.l_p').value, qty: el.querySelector('.l_q').value, price: el.querySelector('.l_u').value || 0 }));
  let newCustomer = null;
  if (sel === '__new') {
    if (!val('nc_name').trim()) { alert('新しい取引先の名前を入力してください'); return; }
    const ct = val('nc_contact').trim(); const em = (ct.match(/[^\s]+@[^\s]+/) || [''])[0];
    newCustomer = { '取引先名': val('nc_name').trim(), '国': val('nc_country'), '通貨': val('nc_cur'), '区分': val('nc_kind'), '支払サイト日数': Number(val('nc_site')) || 30, '担当者名': ct.replace(em, '').trim(), 'メール': em, 'フェーズ': '取引中' };
  }
  const payload = { customerId: cid, newCustomer, currency: formCur(), shipFrom: document.getElementById('of_from').value, plannedShip: document.getElementById('of_plan').value, memo: document.getElementById('of_memo').value, lines };
  if (!cid && !newCustomer) { alert('取引先を選んでください'); return; }
  if (!lines.some((l) => l.productId && num(l.qty) > 0)) { alert('商品と数量を入力してください'); return; }
  const before = new Set(D.orders.map((o) => o['受注ID']));
  if (await write('createOrder', payload, '受注を登録しました')) {
    const n = D.orders.find((o) => !before.has(o['受注ID']));
    go(n ? '#/order/' + encodeURIComponent(n['受注ID']) : '#/orders');
  }
}

/* ================= 営業（取引先） ================= */
function custStats(c) {
  const fy = fyStart(); const os = D.orders.filter((o) => o['取引先'] === c['取引先ID'] && !o.cancel);
  return { fy: os.filter((o) => o['請求日'] && o['請求日'].slice(0, 7) >= fy).reduce((s, o) => s + o.yen, 0), unpaid: os.filter((o) => o.status === 'unpaid').reduce((s, o) => s + o.yen, 0), last: os.reduce((m, o) => (o['受注日'] > m ? o['受注日'] : m), ''), n: os.length };
}
function custListHtml() {
  const q = ui.custQ.trim().toLowerCase();
  let list = D.customers.filter((c) => ui.custChip === 'all' || (phaseOf(c) || 'その他') === ui.custChip);
  if (q) list = list.filter((c) => ((c['取引先名'] || '') + ' ' + (c['国'] || '') + ' ' + (c['メモ'] || '')).toLowerCase().indexOf(q) >= 0);
  const withStats = list.map((c) => ({ c, s: custStats(c) })).sort((a, b) => (b.s.last || '').localeCompare(a.s.last || '') || (a.c['取引先名'] || '').localeCompare(b.c['取引先名'] || '', 'ja'));
  const cards = withStats.map(({ c, s }) => {
    const ph = phaseOf(c); const m = /現状: ([^\n]+)/.exec(c['メモ'] || '');
    return '<div class="ocard" data-act="open" data-href="#/customer/' + encodeURIComponent(c['取引先ID']) + '"><div class="l1"><b>' + esc(custLabel(c)) + '</b>' + (ph ? '<span class="badge">' + esc(ph) + '</span>' : '') + '</div>' +
      (m ? '<span class="note" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m[1]) + '</span>' : '') +
      '<div class="stat"><span>今年度 <b>' + man(s.fy) + '</b></span>' + (s.unpaid ? '<span>入金待ち <b style="color:var(--red)">' + yen(s.unpaid) + '</b></span>' : '') + (s.last ? '<span>最終受注 <b>' + md(s.last) + '</b></span>' : '') + '</div></div>';
  }).join('');
  return cards || '<div class="empty">該当する取引先はありません</div>';
}
const PHASES = ['取引中', '商談中', 'パイプライン', '失注'];
function salesSeg() {
  return '<div class="seg"><button class="' + (ui.salesTab === 'w' ? 'on' : '') + '" data-act="stab" data-v="w">卸売り営業</button><button class="' + (ui.salesTab === 'p' ? 'on' : '') + '" data-act="stab" data-v="p">プロジェクト</button></div>';
}
function viewSales() {
  if (ui.salesTab === 'p') return viewProjects();
  const phases = {}; D.customers.forEach((c) => { const p = phaseOf(c) || 'その他'; phases[p] = (phases[p] || 0) + 1; });
  const order = PHASES.concat(['その他']);
  const chipDefs = [['all', 'すべて', D.customers.length]].concat(order.filter((p) => phases[p]).map((p) => [p, p, phases[p]]));
  return top('営業ボード', { extra: salesSeg() }) + '<main class="view" style="gap:12px"><div class="chips">' + chipDefs.map((x) => '<button class="chip' + (ui.custChip === x[0] ? ' on' : '') + '" data-act="cchip" data-v="' + esc(x[0]) + '">' + esc(x[1]) + ' ' + x[2] + '</button>').join('') + '</div>' +
    '<input class="search" type="search" placeholder="取引先名・国・メモで検索" value="' + esc(ui.custQ) + '" data-input="custQ"><div id="clist" style="display:flex;flex-direction:column;gap:12px">' + custListHtml() + '</div>' +
    '<button class="btn primary" data-act="open" data-href="#/customer-edit/new">＋ 取引先・リードを追加</button></main>';
}

/* ---------- プロジェクト ---------- */
function projectCard(x) {
  const budget = num(x['予算']), cost = num(x['費用']), income = num(x['収入']);
  const pct = budget ? Math.round(cost / budget * 100) : 0;
  const warn = budget && pct >= 80;
  const dd = x['期日'] ? due(x['期日']) : null;
  const st = x['状態'] || '進行中';
  return '<div class="ocard" data-act="open" data-href="#/project-edit/' + encodeURIComponent(x['プロジェクトID']) + '"' + (st !== '進行中' ? ' style="opacity:.6"' : '') + '>' +
    '<div class="l1"><b style="font-size:15px">' + esc(x['プロジェクト名']) + '</b><span class="badge">' + esc(st) + '</span></div>' +
    '<div class="stat"><span>期日 <b' + (dd && dd.over && st === '進行中' ? ' style="color:var(--red)"' : '') + '>' + (x['期日'] ? ymd(x['期日']) : '未設定') + '</b></span>' + (income ? '<span>収入 <b>' + yen(income) + '</b></span>' : '') + '</div>' +
    (budget ? '<div class="pbar"><i class="' + (warn ? 'warn' : '') + '" style="width:' + Math.min(pct, 100) + '%"></i></div><span class="note"' + (warn ? ' style="color:var(--amber);font-weight:700"' : '') + '>費用 ' + yen(cost) + '／予算 ' + yen(budget) + '（' + pct + '%）' + (warn ? '・予算の8割を超えました' : '') + '</span>'
      : '<span class="note">予算は未設定です</span>') +
    (x['メモ'] ? '<span class="note" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x['メモ']) + '</span>' : '') + '</div>';
}
function sortedProjects() {
  const rank = { '進行中': 0, '完了': 1, '中止': 2 };
  return D.projects.slice().sort((a, b) => (rank[a['状態'] || '進行中'] - rank[b['状態'] || '進行中']) || (a['期日'] || '9').localeCompare(b['期日'] || '9'));
}
function viewProjects() {
  const list = sortedProjects();
  return top('営業ボード', { extra: salesSeg() }) + '<main class="view" style="gap:12px">' +
    (list.map(projectCard).join('') || '<div class="empty">プロジェクトはまだありません</div>') +
    '<button class="btn primary" data-act="open" data-href="#/project-edit/new">＋ プロジェクトを追加</button></main>';
}
function viewProjectForm(id) {
  const x = id === 'new' ? { '状態': '進行中' } : (D.pjMap[id] || {});
  const f = (k, label, type, ph) => '<label>' + label + '<input data-f="' + k + '" type="' + (type || 'text') + '"' + (type === 'number' ? ' inputmode="numeric"' : '') + (ph ? ' placeholder="' + ph + '"' : '') + ' value="' + esc(x[k]) + '"></label>';
  return top(id === 'new' ? 'プロジェクトを追加' : 'プロジェクトを編集', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="pjform">' +
    f('プロジェクト名', 'プロジェクト名', 'text', '例：Sawakai 冬イベント') +
    '<div class="two"><label>状態<select data-f="状態">' + ['進行中', '完了', '中止'].map((v) => '<option' + (v === x['状態'] ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label>' + f('期日', '期日', 'date') + '</div>' +
    '<div class="two">' + f('予算', '予算（円）', 'number') + f('費用', '費用の実績（円）', 'number') + '</div>' + f('収入', '収入（円）', 'number') +
    '<label>メモ<textarea data-f="メモ">' + esc(x['メモ']) + '</textarea></label></section>' +
    '<div class="note">費用と収入は、今は手で入力します。経費シートや受注との連動は第4段階で追加します。</div>' +
    '<button class="btn primary" data-act="saveproj" data-id="' + esc(id) + '">保存する</button>' + (id !== 'new' ? '<button class="btn danger" data-act="delproj" data-id="' + esc(id) + '">このプロジェクトを削除</button>' : '') + '</main>';
}
function viewCustomer(id) {
  const c = D.cMap[id];
  if (!c) return top('取引先', { back: true }) + '<main class="view"><div class="empty">取引先が見つかりません</div></main>';
  const s = custStats(c); const os = D.orders.filter((o) => o['取引先'] === id);
  const kv = [['国', c['国']], ['区分', c['区分']], ['担当者', c['担当者名']], ['メール', c['メール'] ? '<a href="mailto:' + esc(c['メール']) + '">' + esc(c['メール']) + '</a>' : ''], ['電話', c['電話'] ? '<a href="tel:' + esc(c['電話']) + '">' + esc(c['電話']) + '</a>' : ''], ['住所', c['住所']], ['通貨', c['通貨']], ['支払サイト', (c['支払サイト日数'] || 30) + '日'], ['請求書', c['国'] && c['国'] !== 'JP' ? '英語' : '日本語']];
  return top(c['取引先名'] || '取引先', { back: true }) + '<main class="view" style="gap:12px">' +
    '<section class="kpis"><div class="kpi"><span>今年度の売上</span><b>' + man(s.fy) + '</b></div><div class="kpi"><span>入金待ち</span><b' + (s.unpaid ? ' style="color:var(--red)"' : '') + '>' + yen(s.unpaid) + '</b></div><div class="kpi"><span>受注件数</span><b>' + s.n + '件</b></div></section>' +
    '<div class="btns"><button class="btn primary" data-act="open" data-href="#/new-order?c=' + encodeURIComponent(id) + '">受注を登録</button><button class="btn" data-act="open" data-href="#/customer-edit/' + encodeURIComponent(id) + '">情報を編集</button></div>' +
    '<section class="card kv">' + kv.filter((x) => x[1]).map((x) => '<div><span>' + x[0] + '</span><span>' + (String(x[1]).indexOf('<a ') === 0 ? x[1] : esc(x[1])) + '</span></div>').join('') + '</section>' +
    (c['メモ'] ? '<section class="card memo">' + esc(c['メモ']) + '</section>' : '') +
    '<p class="sec-title">受注（' + os.length + '件）</p>' + (os.slice(0, 50).map(orderCard).join('') || '<div class="empty">まだ受注はありません</div>') +
    (os.length ? '<div class="note">受注がある取引先は削除できません。先に受注を削除してください。</div>' : '<button class="btn danger" data-act="delcust" data-id="' + esc(id) + '">この取引先を削除</button>') + '</main>';
}
const COUNTRIES = ['JP', 'AT', 'DE', 'NL', 'IT', 'FR', 'CZ', 'SK', 'SI', 'HU', 'GB', 'US', 'AE', 'DO'];
function viewCustomerForm(id, phase) {
  const c = id === 'new' ? { '国': 'JP', '通貨': 'JPY', '支払サイト日数': 30, 'フェーズ': phase || '' } : Object.assign({}, D.cMap[id] || {}, { 'フェーズ': phaseOf(D.cMap[id] || {}) });
  const f = (k, label, type) => '<label>' + label + '<input data-f="' + k + '" type="' + (type || 'text') + '" value="' + esc(c[k]) + '"></label>';
  const ctry = COUNTRIES.indexOf(c['国']) < 0 && c['国'] ? COUNTRIES.concat([c['国']]) : COUNTRIES;
  return top(id === 'new' ? '取引先を追加' : '取引先を編集', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="cform">' + f('取引先名', '取引先名') +
    '<div class="two"><label>国<select data-f="国" id="cf_country">' + ctry.map((x) => '<option' + (x === c['国'] ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label><label>通貨<select data-f="通貨" id="cf_cur">' + ['JPY', 'EUR'].map((x) => '<option' + (x === c['通貨'] ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label></div>' +
    '<label>営業のフェーズ<select data-f="フェーズ">' + [''].concat(PHASES).map((x) => '<option value="' + x + '"' + (x === (c['フェーズ'] || '') ? ' selected' : '') + '>' + (x || '未設定') + '</option>').join('') + '</select></label>' +
    '<div class="two"><label>区分<select data-f="区分">' + ['', 'カフェ', '卸', '小売', 'その他'].map((x) => '<option value="' + x + '"' + (x === (c['区分'] || '') ? ' selected' : '') + '>' + (x || '未設定') + '</option>').join('') + '</select></label>' + f('支払サイト日数', '支払サイト（日）', 'number') + '</div>' +
    f('担当者名', '先方の担当者') + '<div class="two">' + f('メール', 'メール', 'email') + f('電話', '電話', 'tel') + '</div>' + f('住所', '住所') +
    '<label>メモ<textarea data-f="メモ">' + esc(c['メモ']) + '</textarea></label></section><button class="btn primary" data-act="savecust" data-id="' + esc(id) + '">保存する</button></main>';
}

/* ================= 在庫（商品） ================= */
function priceLabel(p) {
  const a = [];
  if (p['標準単価（円）'] !== '' && p['標準単価（円）'] != null) a.push(yen(p['標準単価（円）']));
  if (p['標準単価（ユーロ）'] !== '' && p['標準単価（ユーロ）'] != null) a.push(eur(p['標準単価（ユーロ）']));
  return a.length ? a.join('・') + (p['単位'] ? ' /' + esc(p['単位']) : '') : '未設定';
}
function lotText(l) { return (l.lot ? 'ロット ' + l.lot : 'ロットなし') + (l.exp ? '・賞味期限 ' + ymd(l.exp) : ''); }
function stockCard(g, showLoc) {
  const u = g.p['単位'] || '';
  const alerts = [];
  if (g.low) alerts.push('<span class="alert amber">安全在庫 ' + qtyFmt(g.safe) + u + ' を下回っています・発注の検討</span>');
  g.expiring.forEach((l) => { const dd = dayDiff(l.exp); alerts.push('<span class="alert red">' + (l.lot ? 'ロット ' + esc(l.lot) + '：' : '') + (dd < 0 ? '賞味期限切れ' : '賞味期限まで' + dd + '日') + '・優先販売の検討</span>'); });
  return '<div class="ocard" data-act="open" data-href="#/stock-item/' + encodeURIComponent(g.pid) + '">' +
    '<div class="l1"><b>' + esc(g.p['商品名']) + '</b><b style="font-size:18px' + (g.qty <= 0 ? ';color:var(--red)' : '') + '">' + qtyFmt(g.qty) + ' ' + esc(u) + '</b></div>' +
    '<div class="note">' + (showLoc ? esc(g.loc) + (g.lotList.length ? '・' : '') : '') + g.lotList.map((l) => esc(lotText(l)) + (g.lotList.length > 1 ? '（' + qtyFmt(l.qty) + u + '）' : '')).join('、') + '</div>' + alerts.join('') + '</div>';
}
function stockListHtml() {
  const q = ui.stockQ.trim().toLowerCase();
  let gs = D.stock.filter((g) => (ui.stockLoc === 'all' || g.loc === ui.stockLoc) && (g.qty !== 0 || g.safe > 0));
  if (q) gs = gs.filter((g) => (g.p['商品名'] || '').toLowerCase().indexOf(q) >= 0);
  gs.sort((a, b) => ((b.low || b.expiring.length ? 1 : 0) - (a.low || a.expiring.length ? 1 : 0)) || (a.p['商品名'] || '').localeCompare(b.p['商品名'] || '', 'ja') || a.loc.localeCompare(b.loc));
  return gs.map((g) => stockCard(g, ui.stockLoc === 'all')).join('') || '<div class="empty">在庫はありません</div>';
}
function viewStock() {
  const locs = ['all'].concat(CONFIG.LOCATIONS);
  const seg = '<div class="seg">' + locs.map((l) => '<button class="' + (ui.stockLoc === l ? 'on' : '') + '" data-act="sloc" data-v="' + esc(l) + '">' + (l === 'all' ? '全拠点' : esc(l)) + '</button>').join('') + '</div>';
  const inLoc = D.stock.filter((g) => ui.stockLoc === 'all' || g.loc === ui.stockLoc);
  const low = inLoc.filter((g) => g.low).length, exp = inLoc.reduce((n, g) => n + g.expiring.length, 0);
  return top('在庫管理', { extra: seg }) + '<main class="view" style="gap:12px">' +
    '<div class="two-cards"><div class="kpi" style="background:var(--amber-ll)"><span>安全在庫を下回る</span><b style="color:var(--amber)">' + low + '品目</b></div><div class="kpi" style="background:var(--red-bg)"><span>賞味期限まで90日以内</span><b style="color:var(--red)">' + exp + 'ロット</b></div></div>' +
    '<div class="tiles four"><button class="tile" data-act="open" data-href="#/stock-op/in">入庫</button><button class="tile" data-act="open" data-href="#/stock-op/out">出庫</button><button class="tile" data-act="open" data-href="#/stock-op/move">在庫移動</button><button class="tile" data-act="open" data-href="#/stocktake' + (ui.stockLoc !== 'all' ? '?l=' + encodeURIComponent(ui.stockLoc) : '') + '">棚卸</button></div>' +
    '<input class="search" type="search" placeholder="商品名で検索" value="' + esc(ui.stockQ) + '" data-input="stockQ"><div id="slist" style="display:flex;flex-direction:column;gap:12px">' + stockListHtml() + '</div>' +
    '<a class="btn ghost" href="#/products">商品マスタ（' + D.products.length + '件）</a></main>';
}
function viewStockItem(pid) {
  const p = D.pMap[pid];
  if (!p) return top('在庫', { back: true }) + '<main class="view"><div class="empty">商品が見つかりません</div></main>';
  const u = p['単位'] || '';
  const total = r3(D.stock.filter((g) => g.pid === pid).reduce((s, g) => s + g.qty, 0));
  const locCards = CONFIG.LOCATIONS.map((loc) => {
    const g = D.sMap[pid + '|' + loc] || { qty: 0, safe: 0, lotList: [], low: false, expiring: [] };
    return '<section class="card pad" style="display:flex;flex-direction:column;gap:8px"><div class="h2row"><b>' + esc(loc) + '</b><b style="font-size:17px' + (g.low ? ';color:var(--amber)' : '') + '">' + qtyFmt(g.qty) + ' ' + esc(u) + '</b></div>' +
      (g.lotList.length ? g.lotList.map((l) => '<div class="h2row note"><span>' + esc(lotText(l)) + '</span><span>' + qtyFmt(l.qty) + u + '</span></div>').join('') : '') +
      '<div class="form" style="gap:6px"><div class="safe-row"><span class="note">安全在庫</span><input type="number" step="any" inputmode="decimal" id="safe_' + esc(loc) + '" value="' + (g.safe || '') + '" placeholder="未設定"><span class="note">' + esc(u) + '</span><button class="btn ghost" style="min-height:40px" data-act="savesafe" data-id="' + esc(pid) + '" data-loc="' + esc(loc) + '">保存</button></div></div></section>';
  }).join('');
  const hist = D.movements.filter((m) => m['商品'] === pid).slice().sort((a, b) => (b['日付'] || '').localeCompare(a['日付'] || '') || String(b['移動ID']).localeCompare(String(a['移動ID']))).slice(0, 40);
  const histRows = hist.map((m) => { const q = num(m['数量']); return '<div class="hist"><div><b>' + esc(m['種別']) + '</b>　' + esc(m['拠点']) + (m['ロット'] ? '・' + esc(m['ロット']) : '') + '<div class="note">' + md(m['日付']) + (m['メモ'] ? '　' + esc(m['メモ']) : '') + '</div></div><span class="' + (q < 0 ? 'neg' : 'pos') + '">' + (q > 0 ? '+' : '') + qtyFmt(q) + u + '</span><button class="x" data-act="delmove" data-id="' + esc(m['移動ID']) + '" aria-label="この記録を削除">×</button></div>'; }).join('');
  const q = '?p=' + encodeURIComponent(pid);
  return top(p['商品名'], { back: true }) + '<main class="view" style="gap:12px">' +
    '<section class="kpis" style="grid-template-columns:1fr"><div class="kpi"><span>全拠点の合計</span><b>' + qtyFmt(total) + ' ' + esc(u) + '</b></div></section>' +
    '<div class="tiles"><button class="tile" data-act="open" data-href="#/stock-op/in' + q + '">入庫</button><button class="tile" data-act="open" data-href="#/stock-op/out' + q + '">出庫</button><button class="tile" data-act="open" data-href="#/stock-op/move' + q + '">在庫移動</button><button class="tile" data-act="open" data-href="#/product-edit/' + encodeURIComponent(pid) + '">商品の情報</button></div>' +
    locCards + '<p class="sec-title">入出庫の記録</p><div class="card">' + (histRows || '<div class="empty">記録はありません</div>') + '</div>' +
    '<div class="note">間違えて登録した記録は × で削除できます。在庫移動は、移動元と移動先の両方の記録が消えます。</div></main>';
}
const OP = { in: '入庫', out: '出庫', move: '在庫移動' };
function stockProducts() { return D.products.filter((x) => isStockItem(x)).sort((a, b) => (a['商品名'] || '').localeCompare(b['商品名'] || '', 'ja')); }
function viewStockOp(kind, q) {
  if (!OP[kind]) kind = 'in';
  const pid = q.get('p') || ''; const loc = q.get('l') || (ui.stockLoc !== 'all' ? ui.stockLoc : CONFIG.LOCATIONS[0]);
  const prodSel = '<label>商品<select id="so_p"><option value="">選んでください</option>' + stockProducts().map((x) => '<option value="' + esc(x['商品ID']) + '"' + (x['商品ID'] === pid ? ' selected' : '') + '>' + esc(x['商品名']) + '</option>').join('') + '</select></label>';
  const locSel = (id, label, v) => '<label>' + label + '<select id="' + id + '">' + CONFIG.LOCATIONS.map((l) => '<option' + (l === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>';
  let body = prodSel;
  if (kind === 'in') body += '<div class="two">' + locSel('so_loc', '入庫先', loc) + '<label>数量<input id="so_qty" type="number" step="any" inputmode="decimal"></label></div>' +
    '<div class="two"><label>ロット（任意）<input id="so_lot" placeholder="例：2611-A"></label><label>賞味期限（任意）<input id="so_exp" type="date"></label></div>' +
    '<label>入庫日<input id="so_date" type="date" value="' + todayStr() + '"></label><label>メモ（任意）<input id="so_memo" placeholder="例：堀口園から仕入"></label>';
  if (kind === 'out') body += '<div class="two">' + locSel('so_loc', '出庫元', loc) + '<label>数量<input id="so_qty" type="number" step="any" inputmode="decimal"></label></div>' +
    '<label>ロット<select id="so_lot"></select></label><label>理由・メモ<input id="so_memo" placeholder="例：サンプル送付、自店で使用"></label>';
  if (kind === 'move') body += '<div class="two">' + locSel('so_loc', '移動元', loc) + locSel('so_to', '移動先', CONFIG.LOCATIONS.find((l) => l !== loc)) + '</div>' +
    '<div class="two"><label>数量<input id="so_qty" type="number" step="any" inputmode="decimal"></label><label>ロット<select id="so_lot"></select></label></div><label>メモ（任意）<input id="so_memo"></label>';
  return top(OP[kind] + 'を記録', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="soform" data-kind="' + kind + '">' + body + '</section>' +
    '<div class="infobox" id="so_info"></div>' + (kind !== 'in' ? '<div class="note">ロットを「自動」にすると、賞味期限が近いロットから順に差し引きます。受注の出荷を記録したときも、同じ順で自動的に差し引かれます。</div>' : '') +
    '<button class="btn primary" data-act="saveop" data-v="' + kind + '">記録する</button></main>';
}
function updStockOp() {
  const f = document.getElementById('soform'); if (!f) return;
  const kind = f.dataset.kind; const pid = val('so_p'); const loc = val('so_loc'); const u = unitOf(pid);
  const g = D.sMap[pid + '|' + loc];
  const lotSel = document.getElementById('so_lot');
  if (lotSel && lotSel.tagName === 'SELECT') {
    const had = lotSel.options.length > 0; const cur = lotSel.value;
    lotSel.innerHTML = '<option value="__auto">自動（賞味期限が近い順）</option>' + (g ? g.lotList.filter((l) => l.qty > 0).map((l) => '<option value="' + esc(l.lot) + '">' + esc(lotText(l)) + '（' + qtyFmt(l.qty) + u + '）</option>').join('') : '');
    if (had && [...lotSel.options].some((o) => o.value === cur)) lotSel.value = cur;
  }
  document.querySelectorAll('#so_qty').forEach((e) => { e.placeholder = u; });
  const info = document.getElementById('so_info');
  if (!pid) { info.innerHTML = '<span>商品を選ぶと、今の在庫が表示されます。</span>'; return; }
  const line = (l) => { const x = D.sMap[pid + '|' + l]; return esc(l) + '　' + qtyFmt(x ? x.qty : 0) + u + (x && x.safe ? '（安全在庫 ' + qtyFmt(x.safe) + u + '）' : ''); };
  info.innerHTML = '<b>今の在庫</b>' + CONFIG.LOCATIONS.map((l) => '<span>' + line(l) + '</span>').join('');
}
async function saveStockOp(kind) {
  const base = { productId: val('so_p'), qty: val('so_qty'), memo: val('so_memo') };
  if (!base.productId || !(num(base.qty) > 0)) { alert('商品と数量を入力してください'); return; }
  let action, payload;
  if (kind === 'in') { action = 'stockIn'; payload = Object.assign(base, { location: val('so_loc'), lot: val('so_lot').trim(), expiry: val('so_exp'), date: val('so_date') }); }
  if (kind === 'out') { action = 'stockOut'; payload = Object.assign(base, { location: val('so_loc'), lot: val('so_lot') }); }
  if (kind === 'move') {
    if (val('so_loc') === val('so_to')) { alert('移動元と移動先が同じです'); return; }
    action = 'stockMove'; payload = Object.assign(base, { from: val('so_loc'), to: val('so_to'), lot: val('so_lot') });
  }
  if (kind !== 'in') { const g = D.sMap[base.productId + '|' + (payload.location || payload.from)]; if ((g ? g.qty : 0) < num(base.qty) && !confirm('在庫（' + qtyFmt(g ? g.qty : 0) + unitOf(base.productId) + '）より多い数量です。このまま記録しますか')) return; }
  if (await write(action, payload, OP[kind] + 'を記録しました')) go('#/stock-item/' + encodeURIComponent(base.productId));
}
function viewStocktake(loc) {
  const gs = D.stock.filter((g) => g.loc === loc && (g.qty !== 0 || g.safe > 0)).sort((a, b) => (a.p['商品名'] || '').localeCompare(b.p['商品名'] || '', 'ja'));
  const rows = [];
  gs.forEach((g) => { const lots = g.lotList.length ? g.lotList : [{ lot: '', exp: '', qty: 0 }]; lots.forEach((l) => rows.push({ g, l })); });
  const rowHtml = rows.map((x, i) => '<div class="take-row" data-pid="' + esc(x.g.pid) + '" data-lot="' + esc(x.l.lot) + '" data-cur="' + x.l.qty + '"><div><b>' + esc(x.g.p['商品名']) + '</b><div class="note">' + esc(lotText(x.l)) + '・帳簿 ' + qtyFmt(x.l.qty) + esc(x.g.p['単位'] || '') + '</div></div><input type="number" step="any" inputmode="decimal" value="' + x.l.qty + '" aria-label="実際の数量"></div>').join('');
  return top('棚卸', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form"><label>拠点<select id="tk_loc">' + CONFIG.LOCATIONS.map((l) => '<option' + (l === loc ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    '<div class="note">実際に数えた数量に書き換えてください。帳簿と違うものだけ「棚卸調整」として記録します。</div></section>' +
    '<section class="card" id="tk_rows">' + (rowHtml || '<div class="empty">この拠点の在庫はありません</div>') + '</section>' +
    '<section class="card pad form" id="tk_new"><b style="font-size:13px">一覧にない商品を追加</b><div class="line-item" style="grid-template-columns:minmax(0,1fr) 88px"><label>商品<select id="tkn_p"><option value="">選択</option>' + stockProducts().map((x) => '<option value="' + esc(x['商品ID']) + '">' + esc(x['商品名']) + '</option>').join('') + '</select></label><label>数量<input id="tkn_q" type="number" step="any" inputmode="decimal"></label></div>' +
    '<div class="two"><label>ロット（任意）<input id="tkn_lot"></label><label>賞味期限（任意）<input id="tkn_exp" type="date"></label></div></section>' +
    '<button class="btn primary" data-act="savetake">棚卸を記録する</button></main>';
}
async function saveStocktake() {
  const loc = val('tk_loc'); const items = [];
  document.querySelectorAll('#tk_rows .take-row').forEach((r) => { const v = r.querySelector('input').value; if (v !== '' && num(v) !== num(r.dataset.cur)) items.push({ productId: r.dataset.pid, lot: r.dataset.lot, actual: num(v) }); });
  if (val('tkn_p') && val('tkn_q') !== '') items.push({ productId: val('tkn_p'), lot: val('tkn_lot').trim(), expiry: val('tkn_exp'), actual: num(val('tkn_q')) });
  if (!items.length) { alert('帳簿と違う数量がありません'); return; }
  if (!confirm(items.length + '件の差を棚卸調整として記録します')) return;
  if (await write('stocktake', { location: loc, items }, '棚卸を記録しました')) { ui.stockLoc = loc; go('#/stock'); }
}
function viewProducts() {
  const ps = D.products.slice().sort((a, b) => (a['商品名'] || '').localeCompare(b['商品名'] || '', 'ja'));
  const rows = ps.map((p) => '<a class="row" href="#/product-edit/' + encodeURIComponent(p['商品ID']) + '"' + (truthy(p['販売中']) ? '' : ' style="opacity:.5"') + '><span class="c" style="color:var(--ink);font-weight:500">' + esc(p['商品名']) + '</span><span class="note" style="flex:none">' +
    priceLabel(p) + '</span></a>').join('');
  return top('商品マスタ', { back: true }) + '<main class="view" style="gap:12px">' +
    '<div class="h2row"><p class="sec-title">商品（' + ps.length + '件）</p><span class="note">標準単価</span></div><div class="card list">' + rows + '</div>' +
    '<button class="btn primary" data-act="open" data-href="#/product-edit/new">＋ 商品を追加</button></main>';
}
function viewProductForm(id) {
  const p = id === 'new' ? { '単位': 'kg', '販売中': true } : (D.pMap[id] || {});
  const f = (k, label, type) => '<label>' + label + '<input data-f="' + k + '" type="' + (type || 'text') + '"' + (type === 'number' ? ' step="any" inputmode="decimal"' : '') + ' value="' + esc(p[k]) + '"></label>';
  return top(id === 'new' ? '商品を追加' : '商品を編集', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="pform">' + f('商品名', '商品名') + f('英語の商品名', '英語の商品名（英語の請求書用）') +
    '<label>単位<select data-f="単位">' + ['kg', '個', '袋'].map((x) => '<option' + (x === p['単位'] ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
    '<div class="two">' + f('標準単価（円）', '標準単価（円）', 'number') + f('標準単価（ユーロ）', '標準単価（ユーロ）', 'number') + '</div>' +
    '<label class="check"><input type="checkbox" data-f="販売中"' + (truthy(p['販売中']) ? ' checked' : '') + '>販売中</label>' +
    '<label class="check"><input type="checkbox" data-f="在庫管理"' + (id === 'new' || isStockItem(p) ? ' checked' : '') + '>在庫を管理する（サービスや配送料は外す）</label></section><button class="btn primary" data-act="saveprod" data-id="' + esc(id) + '">保存する</button>' +
    (id !== 'new' ? '<button class="btn danger" data-act="delprod" data-id="' + esc(id) + '">この商品を削除</button>' : '') + '</main>';
}

/* ================= 入力 ================= */
function viewInput() {
  const cnt = (s) => D.orders.filter((o) => o.status === s).length;
  const recent = D.orders.slice(0, 6).map((o) => '<a class="row" href="#/order/' + encodeURIComponent(o['受注ID']) + '"><span class="c" style="color:var(--ink)">' + esc(o.c['取引先名']) + '　' + esc(o.no) + '</span><span class="note" style="flex:none">' + md(o['受注日']) + '</span></a>').join('');
  const tasks = D.tasks.filter((t) => !truthy(t['完了'])).length;
  return top('入力') + '<main class="view">' +
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">受注</p><div class="tiles">' +
    '<button class="tile primary" data-act="open" data-href="#/new-order">受注を登録</button>' +
    '<button class="tile" data-act="goorders" data-chip="unshipped">出荷を記録<small>出荷待ち ' + cnt('unshipped') + '件</small></button>' +
    '<button class="tile" data-act="goorders" data-chip="uninvoiced">請求を記録<small>請求待ち ' + cnt('uninvoiced') + '件</small></button>' +
    '<button class="tile" data-act="goorders" data-chip="unpaid">入金を記録<small>入金待ち ' + cnt('unpaid') + '件</small></button></div></section>' +
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">営業</p><div class="tiles">' +
    '<button class="tile" data-act="open" data-href="#/customer-edit/new?phase=' + encodeURIComponent('パイプライン') + '">リードを追加<small>営業先の候補</small></button>' +
    '<button class="tile" data-act="open" data-href="#/project-edit/new">プロジェクトを追加<small>進行中 ' + D.projects.filter((x) => (x['状態'] || '進行中') === '進行中').length + '件</small></button></div></section>' +
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">在庫</p><div class="tiles">' +
    '<button class="tile" data-act="open" data-href="#/stock-op/in">入庫</button><button class="tile" data-act="open" data-href="#/stock-op/out">出庫</button>' +
    '<button class="tile" data-act="open" data-href="#/stock-op/move">在庫移動</button><button class="tile" data-act="open" data-href="#/stocktake">棚卸</button></div></section>' +
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">マスタ</p><div class="tiles">' +
    '<button class="tile" data-act="open" data-href="#/customer-edit/new">取引先を追加</button><button class="tile" data-act="open" data-href="#/product-edit/new">商品を追加</button></div></section>' +
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">その他</p><div class="tiles">' +
    '<button class="tile" data-act="open" data-href="#/task-edit/new">タスクを追加<small>未完了 ' + tasks + '件</small></button></div></section>' +
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">最近の受注</p><div class="card list">' + recent + '</div></section></main>';
}
function viewTask(id) {
  const t = D.tMap[id];
  if (!t) return top('タスク', { back: true }) + '<main class="view"><div class="empty">タスクが見つかりません</div></main>';
  const dd = due(t['期日']);
  return top('タスク', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad" style="display:flex;flex-direction:column;gap:8px"><b style="font-size:17px">' + esc(t['作業']) + '</b><span>' + esc(t['案件名']) + '</span>' +
    '<div><span class="pill ' + dd.cls + '">期日 ' + ymd(t['期日']) + '（' + esc(dd.label) + '）</span></div></section>' +
    '<section class="card kv"><div><span>担当者</span><span>' + esc(t['担当者']) + '</span></div><div><span>状態</span><span>' + (truthy(t['完了']) ? '完了' : '未完了') + '</span></div></section>' +
    (t['メモ'] ? '<section class="card memo">' + esc(t['メモ']) + '</section>' : '') +
    (truthy(t['完了']) ? '' : '<button class="btn primary" data-act="donetask" data-id="' + esc(id) + '">完了にする</button>') + '</main>';
}
function viewTaskForm() {
  return top('タスクを追加', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="tform">' +
    '<label>作業<input data-f="作業" placeholder="例：説明会申込"></label><label>案件名<input data-f="案件名" placeholder="例：目黒区補助金"></label>' +
    '<label>期日<input type="date" data-f="期日" value="' + addDays(todayStr(), 1) + '"></label><label>メモ（任意）<textarea data-f="メモ"></textarea></label></section>' +
    '<div class="note">ルールで自動表示されない用事だけを登録します。受注の工程は登録しなくても自動で表示されます。</div><button class="btn primary" data-act="savetask">登録する</button></main>';
}

/* ================= イベント ================= */
function formVals(sel) { const o = {}; document.querySelectorAll(sel + ' [data-f]').forEach((el) => { o[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; }); return o; }
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act; const id = el.dataset.id;
  switch (a) {
    case 'back': if (history.length > 1) history.back(); else go('#/'); break;
    case 'open': go(el.dataset.href); break;
    case 'reload': await refresh(true); break;
    case 'logout': logout(); break;
    case 'selmonth': ui.sel = +el.dataset.i; render(); break;
    case 'toggleacts': ui.showAllActions = !ui.showAllActions; render(); break;
    case 'goorders': ui.orderChip = el.dataset.chip; ui.orderQ = ''; go('#/orders'); break;
    case 'ochip': ui.orderChip = el.dataset.v; render(); break;
    case 'cchip': ui.custChip = el.dataset.v; render(); break;
    case 'gopj': ev.preventDefault(); ui.salesTab = 'p'; go('#/sales'); break;
    case 'stab': ui.salesTab = el.dataset.v; render(); break;
    case 'sloc': ui.stockLoc = el.dataset.v; render(); break;
    case 'saveop': await saveStockOp(el.dataset.v); break;
    case 'savetake': await saveStocktake(); break;
    case 'savesafe': { const v = val('safe_' + el.dataset.loc); await write('saveSafety', { productId: id, location: el.dataset.loc, value: v }, '安全在庫を保存しました'); break; }
    case 'delmove': if (confirm('この記録を削除しますか（在庫数が元に戻ります）')) await write('deleteMove', { id }, '削除しました'); break;
    case 'delorder': if (confirm('この受注を削除しますか。明細と、出荷で差し引いた在庫の記録も消えます。元に戻せません')) { if (await write('deleteOrder', { id }, '受注を削除しました')) go('#/orders'); } break;
    case 'delcust': if (confirm('この取引先を削除しますか。元に戻せません')) { if (await write('deleteCustomer', { id }, '取引先を削除しました')) go('#/sales'); } break;
    case 'delproj': if (confirm('このプロジェクトを削除しますか。元に戻せません')) { if (await write('deleteProject', { id }, '削除しました')) { ui.salesTab = 'p'; go('#/sales'); } } break;
    case 'delprod': if (confirm('この商品を削除しますか。元に戻せません')) { if (await write('deleteProduct', { id }, '削除しました')) go('#/products'); } break;
    case 'saveproj': { const v = formVals('#pjform'); if (!v['プロジェクト名']) { alert('プロジェクト名を入力してください'); break; } if (id !== 'new') v['プロジェクトID'] = id; if (await write('saveProject', v, '保存しました')) { ui.salesTab = 'p'; go('#/sales'); } break; }
    case 'editon': ui.edit = true; render(); break;
    case 'editoff': ui.edit = false; render(); break;
    case 'ship': await write('recordShip', { id, date: val('f_date'), tracking: val('f_track') }, '出荷を記録しました'); break;
    case 'invoice': await write('recordInvoice', { id, date: val('f_date') }, '請求を記録しました'); break;
    case 'pay': await write('recordPayment', { id, date: val('f_date'), amount: val('f_amount') }, '入金を記録しました'); break;
    case 'undo': if (confirm('直前の工程の記録を取り消しますか')) await write('undoStep', { id, step: el.dataset.step }, '取り消しました'); break;
    case 'cancel': if (confirm(el.dataset.v === '1' ? 'この受注をキャンセルにしますか' : 'キャンセルを取り消しますか')) await write('updateOrder', { id, fields: { 'キャンセル': el.dataset.v === '1' } }, '更新しました'); break;
    case 'saveorder': if (await write('updateOrder', { id, fields: { '出荷予定日': val('e_plan'), '出荷元': val('e_from'), '追跡番号': val('e_track'), '支払期日': val('e_due'), 'メモ': val('e_memo') } }, '保存しました')) { ui.edit = false; render(); } break;
    case 'addline': { const w = document.getElementById('of_lines'); w.insertAdjacentHTML('beforeend', lineHtml(w.children.length)); updOrderForm(); break; }
    case 'rmline': { const w = document.getElementById('of_lines'); if (w.children.length > 1) el.closest('.line-item').remove(); updOrderForm(); break; }
    case 'createorder': await createOrder(); break;
    case 'savecust': { const v = formVals('#cform'); if (!v['取引先名']) { alert('取引先名を入力してください'); break; } if (id !== 'new') v['取引先ID'] = id; const before = new Set(D.customers.map((c) => c['取引先ID'])); if (await write('saveCustomer', v, '保存しました')) { const n = id !== 'new' ? D.cMap[id] : D.customers.find((c) => !before.has(c['取引先ID'])); go(n ? '#/customer/' + encodeURIComponent(n['取引先ID']) : '#/sales'); } break; }
    case 'saveprod': { const v = formVals('#pform'); if (!v['商品名']) { alert('商品名を入力してください'); break; } if (id !== 'new') v['商品ID'] = id; if (await write('saveProduct', v, '保存しました')) go('#/products'); break; }
    case 'savetask': { const v = formVals('#tform'); if (!v['作業'] || !v['期日']) { alert('作業と期日を入力してください'); break; } if (await write('saveTask', v, 'タスクを登録しました')) go('#/'); break; }
    case 'donetask': if (await write('completeTask', { id }, '完了にしました')) go('#/'); break;
  }
});
function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset && t.dataset.input) {
    ui[t.dataset.input] = t.value;
    if (t.dataset.input === 'orderQ') document.getElementById('olist').innerHTML = orderListHtml();
    if (t.dataset.input === 'custQ') document.getElementById('clist').innerHTML = custListHtml();
    if (t.dataset.input === 'stockQ') document.getElementById('slist').innerHTML = stockListHtml();
    return;
  }
  if (t.id === 'of_cq') {
    filterCustSelect(t.value);
    return;
  }
  if (t.closest && t.closest('#oform')) updOrderForm();
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'so_p' || t.id === 'so_loc') { updStockOp(); return; }
  if (t.id === 'tk_loc') { go('#/stocktake?l=' + encodeURIComponent(t.value)); return; }
  if (t.id === 'of_c') onCustChange();
  else if (t.classList && t.classList.contains('l_p')) { setLinePrice(t.closest('.line-item')); updOrderForm(); }
  else if (t.id === 'of_plan') updOrderForm();
  else if (t.id === 'nc_country') { document.getElementById('nc_cur').value = t.value === 'JP' ? 'JPY' : 'EUR'; onCustChange(); }
  else if (t.id === 'nc_cur') { document.querySelectorAll('#of_lines .line-item').forEach((el) => setLinePrice(el)); updOrderForm(); }
  else if (t.id === 'cf_country') { const c = document.getElementById('cf_cur'); if (c) c.value = t.value === 'JP' ? 'JPY' : 'EUR'; }
});

/* ================= 起動 ================= */
async function refresh(manual) {
  const btn = document.querySelector('[data-act="reload"]'); if (btn) btn.classList.add('spin');
  try { setData(await api('bootstrap')); if (manual) toast('最新の状態にしました'); }
  catch (e) { if (e.message !== 'auth') toast('読み込めませんでした：' + e.message); }
}
function start() {
  const cached = localStorage.getItem('ip_data');
  if (cached && !DEMO) { try { setData(JSON.parse(cached)); } catch (e) {} }
  if (!D) shell.innerHTML = '<div class="login"><p>読み込んでいます…</p></div>';
  refresh(false);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && D && tokenValid()) refresh(false); });

if (tokenValid()) start(); else showLogin();
})();
