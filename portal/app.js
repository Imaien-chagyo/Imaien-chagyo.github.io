/* 今井園ポータル（imaien.com/portal） */
(function () {
'use strict';

/* ================= 基本 ================= */
const $root = document.getElementById('root');
const shell = document.getElementById('shell');
const DEMO = !!window.DEMO_DATA;
let D = null;            // サーバーから受け取ったデータ（加工済み）
let token = localStorage.getItem('ip_token') || '';
let ui = { stockLoc: 'all', stockQ: '', stockGroup: 'list', salesTab: 'w', orderChip: 'active', orderQ: '', orderView: 'list', openGroup: '', custChip: 'all', custQ: '', custBill: '', custView: 'list', showAllActions: false, sel: null, edit: false, boTab: 'o', poChip: 'active', poQ: '',
  sort: { orders: { k: '', dir: 1 }, cust: { k: '', dir: 1 }, stock: { k: '', dir: 1 }, po: { k: '', dir: 1 } } };
const mqPC = window.matchMedia('(min-width: 1024px)');
const isPC = () => mqPC.matches;
mqPC.addEventListener && mqPC.addEventListener('change', () => { if (D) render(); });

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
async function write(action, payload, okMsg, busyText) {
  busy(true, busyText);
  try { const data = await api(action, payload); setData(data); busy(false); if (data && data.warning) alert(data.warning); else if (okMsg) toast(okMsg); return true; }
  catch (e) { busy(false); if (e.message !== 'auth') alert(e.message); return false; }
}

/* ================= データ加工 ================= */
function setData(raw) {
  localStorage.setItem('ip_data', JSON.stringify(raw));
  const d = raw;
  d.cMap = {}; d.customers.forEach((c) => { d.cMap[c['取引先ID']] = c; });
  d.customers.forEach((c) => { c.bill = c['帳合先'] && d.cMap[c['帳合先']] && c['帳合先'] !== c['取引先ID'] ? d.cMap[c['帳合先']] : null; });
  d.suppliers = d.suppliers || []; d.supMap = {}; d.suppliers.forEach((x) => { d.supMap[x['仕入先ID']] = x; });
  d.invoices = d.invoices || []; d.invByOrder = {};
  d.invoices.forEach((x) => { (d.invByOrder[x['受注ID']] = d.invByOrder[x['受注ID']] || []).push(x); });
  Object.keys(d.invByOrder).forEach((k) => d.invByOrder[k].sort((a, b) => num(b['版']) - num(a['版'])));
  d.pMap = {}; d.products.forEach((p) => { d.pMap[p['商品ID']] = p; });
  d.aMap = {}; d.actions.forEach((a) => { d.aMap[a['参照ID']] = a; });
  const byO = {}; d.lines.forEach((l) => { (byO[l['受注ID']] = byO[l['受注ID']] || []).push(l); });
  const fx = d.eurjpy ? d.eurjpy.rate : 0;
  d.orders.forEach((o) => {
    o.c = d.cMap[o['取引先']] || { '取引先名': '（不明な取引先）', '国': '' };
    o.billTo = o.c.bill || o.c;
    o.inv = (d.invByOrder[o['受注ID']] || [])[0] || null;
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
  buildPurchases(d);
  render();
}
/* 発注：発注、入荷、支払 */
function buildPurchases(d) {
  d.purchases = d.purchases || []; d.purchaseLines = d.purchaseLines || [];
  const byP = {}; d.purchaseLines.forEach((l) => { (byP[l['発注ID']] = byP[l['発注ID']] || []).push(l); });
  d.poMap = {}; d.poActs = [];
  d.purchases.forEach((x) => {
    x.sup = d.supMap[x['仕入先']] || { '仕入先名': '（不明な仕入先）' };
    x.lines = byP[x['発注ID']] || [];
    x.total = x.lines.reduce((s, l) => s + num(l['数量']) * num(l['単価']), 0);
    x.recv = x.lines.reduce((s, l) => s + num(l['入荷数量'] === '' ? l['数量'] : l['入荷数量']) * num(l['単価']), 0);
    x.cancel = truthy(x['キャンセル']);
    x.status = x.cancel ? 'cancel' : x['支払日'] ? 'done' : x['入荷日'] ? 'unpaid' : 'ordered';
    x.step = { ordered: 1, unpaid: 2, done: 3, cancel: 0 }[x.status];
    x.no = x['発注番号'] || '';
    const f = x.lines[0];
    x.summary = f ? ((d.pMap[f['商品']] || {})['商品名'] || f['商品']) + ' ' + qtyFmt(f['数量']) + ((d.pMap[f['商品']] || {})['単位'] || '') + (x.lines.length > 1 ? ' ほか' + (x.lines.length - 1) + '件' : '') : '明細なし';
    const label = x.sup['仕入先名'] + ' ' + x.no;
    x.act = null;
    if (x.status === 'ordered') x.act = { '作業': '入荷確認', '案件名': label, '期日': x['入荷予定日'] || addDays(x['発注日'] || d.today, 7), href: '#/po/' + encodeURIComponent(x['発注ID']) };
    if (x.status === 'unpaid') x.act = { '作業': '支払', '案件名': label, '期日': x['支払期日'] || x['入荷日'], href: '#/po/' + encodeURIComponent(x['発注ID']) };
    if (x.act) d.poActs.push(x.act);
    d.poMap[x['発注ID']] = x;
  });
  d.purchases.sort((a, b) => (b['発注日'] || '').localeCompare(a['発注日'] || '') || b.no.localeCompare(a.no));
}
/** 税込の見込み額：税率ごとに切り捨て */
function poTaxIncl(x, received) {
  const sub = { 8: 0, 10: 0 };
  x.lines.forEach((l) => { const q = received && l['入荷数量'] !== '' ? num(l['入荷数量']) : num(l['数量']); const r = num((D.pMap[l['商品']] || {})['税率']) === 10 ? 10 : 8; sub[r] += q * num(l['単価']); });
  return Math.round(sub[8] + sub[10] + Math.floor(sub[8] * 0.08) + Math.floor(sub[10] * 0.1));
}
function isStockItem(p) { return !!p && !(p['在庫管理'] === false || String(p['在庫管理']).toUpperCase() === 'FALSE'); }
function r3(x) { return Math.round(x * 1000) / 1000; }
function buildStock(d) {
  const S = {};
  const grp = (pid, loc) => { const k = pid + '|' + loc; return S[k] || (S[k] = { pid, loc, qty: 0, safe: 0, lots: {} }); };
  (d.movements || []).forEach((m) => {
    const g = grp(m['商品'], m['拠点']); const q = num(m['数量']); g.qty += q;
    const lk = String(m['ロット'] || ''); const l = g.lots[lk] || (g.lots[lk] = { lot: lk, exp: '', qty: 0, cost: null });
    l.qty += q; if (m['賞味期限']) l.exp = m['賞味期限'];
    if (q > 0 && m['単価'] !== '' && m['単価'] != null && !isNaN(parseFloat(m['単価']))) l.cost = num(m['単価']);
  });
  (d.safety || []).forEach((x) => { grp(x['商品'], x['拠点']).safe = num(x['安全在庫']); });
  d.stock = Object.keys(S).map((k) => {
    const g = S[k]; g.qty = r3(g.qty); g.p = d.pMap[g.pid] || { '商品名': g.pid, '単位': '' };
    g.lotList = Object.keys(g.lots).map((x) => g.lots[x]).map((l) => { l.qty = r3(l.qty); return l; }).filter((l) => l.qty !== 0)
      .sort((a, b) => (a.exp || '9999').localeCompare(b.exp || '9999'));
    g.low = g.safe > 0 && g.qty < g.safe;
    g.std = costOf(g.p); g.sup = d.supMap[g.p['仕入先']] || null;
    g.value = g.lotList.reduce((s, l) => s + Math.max(l.qty, 0) * (l.cost != null ? l.cost : (g.std || 0)), 0);
    g.unit = g.qty > 0 ? g.value / g.qty : (g.std || 0);
    g.expiring = g.lotList.filter((l) => l.qty > 0 && l.exp && dayDiff(l.exp) <= 90);
    return g;
  });
  d.sMap = {}; d.stock.forEach((g) => { d.sMap[g.pid + '|' + g.loc] = g; });
  d.stockActs = [];
  d.stock.forEach((g) => {
    const label = (g.p['商品名'] || '') + '（' + g.loc + '）';
    if (g.low) d.stockActs.push({ '作業': '発注の検討', '案件名': label, '期日': d.today, href: '#/stock-item/' + encodeURIComponent(g.pid) });
    g.expiring.forEach((l) => { const dd = dayDiff(l.exp); d.stockActs.push({ '作業': '優先販売の検討', '案件名': label + (l.lot ? ' ' + l.lot : ''), '期日': addDays(l.exp, -90), href: '#/stock-item/' + encodeURIComponent(g.pid), label: dd < 0 ? '期限切れ' : '期限まで' + dd + '日', cls: dd <= 30 ? 'red' : 'amber', over: dd <= 30 }); });
  });
}
function costOf(p) { const v = p ? p['仕入単価'] : ''; return v === '' || v == null || isNaN(parseFloat(v)) ? null : num(v); }
/* 支払条件：帳合先があれば帳合先の条件。標準は請求日の翌月末払い。「日数指定」は請求日から支払サイト日数後 */
function payOf(c) { const b = (c && c.bill) || c || {}; return String(b['支払条件'] || '') === '日数指定' ? { days: num(b['支払サイト日数']) || 30 } : { eom: true }; }
function payLabel(c) { const t = payOf(c); return t.eom ? '翌月末払い' : '請求日から' + t.days + '日後'; }
function dueFrom(dateStr, c) { const t = payOf(c); if (!dateStr) return ''; if (!t.eom) return addDays(dateStr, t.days); const a = dateStr.split('-'); return isoDate(new Date(+a[0], +a[1] + 1, 0)); }
function payFields(cur, days, prefix) {
  return '<div class="two"><label>支払条件<select ' + prefix + '="支払条件" id="' + (prefix === 'data-f' ? 'cf_pay' : 'nc_pay') + '"><option value=""' + (cur !== '日数指定' ? ' selected' : '') + '>翌月末払い（請求日の翌月末）</option><option value="日数指定"' + (cur === '日数指定' ? ' selected' : '') + '>請求日から日数で決める</option></select></label>' +
    '<label>日数（日数で決める場合）<input ' + prefix + '="支払サイト日数" id="' + (prefix === 'data-f' ? 'cf_days' : 'nc_site') + '" type="number" inputmode="numeric" value="' + esc(days || 30) + '"' + (cur === '日数指定' ? '' : ' disabled') + '></label></div>';
}
function supName(id) { const x = D && D.supMap[id]; return x ? x['仕入先名'] : ''; }
function unitOf(pid) { return (D.pMap[pid] || {})['単位'] || ''; }
function custLabel(c) { return (c['取引先名'] || '') + (c['国'] && c['国'] !== 'JP' ? '（' + c['国'] + '）' : ''); }
function phaseOf(c) { if (c['フェーズ']) return String(c['フェーズ']); const m = /フェーズ: ([^、\n]+)/.exec(c['メモ'] || ''); return m ? m[1].trim() : ''; }
/* 会計年度は2月から翌1月 */
const FY_START_MONTH = 2;
function fyStart() { const t = todayStr(); const y = +t.slice(0, 4), m = +t.slice(5, 7); return (m >= FY_START_MONTH ? y : y - 1) + '-' + String(FY_START_MONTH).padStart(2, '0'); }
function fyLabel() { const y = +fyStart().slice(0, 4); return y + '年度（' + y + '年2月〜' + (y + 1) + '年1月）'; }
function salesByMonth() { const r = {}; D.orders.forEach((o) => { if (!o.cancel && o['請求日']) { const k = o['請求日'].slice(0, 7); r[k] = (r[k] || 0) + o.yen; } }); return r; }
function monthsBack(n) { const t = todayStr(); let y = +t.slice(0, 4), m = +t.slice(5, 7); const out = []; for (let i = 0; i < n; i++) { out.unshift(y + '-' + String(m).padStart(2, '0')); m--; if (!m) { m = 12; y--; } } return out; }

/* ================= ルーティング ================= */
function route() { const h = (location.hash || '#/').slice(1); const [path, q] = h.split('?'); const parts = path.split('/').filter(Boolean); return { parts, q: new URLSearchParams(q || '') }; }
function go(h) { if (location.hash === h) render(); else location.hash = h; }
/* PC用の表：列の見出しを押すと並べ替え */
function sortRows(t, cols, rows) {
  const st = ui.sort[t]; const col = cols.find((c) => c.k === st.k);
  if (!col) return rows;
  const v = col.sort || col.val;
  return rows.slice().sort((a, b) => { const x = v(a), y = v(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), 'ja'); return r * st.dir; });
}
function tableHtml(t, cols, rows, href) {
  const st = ui.sort[t];
  const head = '<tr>' + cols.map((c) => '<th class="' + (c.r ? 'r' : '') + (st.k === c.k ? ' on' : '') + '" data-act="sort" data-t="' + t + '" data-k="' + c.k + '">' + esc(c.label) + (st.k === c.k ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr>';
  const body = sortRows(t, cols, rows).map((r) => '<tr data-act="open" data-href="' + href(r) + '"' + (r._dim ? ' class="dim"' : '') + '>' + cols.map((c) => '<td class="' + (c.r ? 'r' : '') + '">' + (c.html ? c.html(r) : esc(c.val(r))) + '</td>').join('') + '</tr>').join('');
  return '<div class="card tbl-wrap"><table class="tbl"><thead>' + head + '</thead><tbody>' + (body || '<tr><td colspan="' + cols.length + '" class="empty">該当するものはありません</td></tr>') + '</tbody></table></div>';
}
window.addEventListener('hashchange', () => { ui.edit = false; render(); const m = document.querySelector('main.view'); if (m) m.scrollTop = 0; });

function tabOf(p) {
  const k = p[0] || '';
  if (/^(order|orders|new-order|po|new-po)$/.test(k)) return 'orders';
  if (/^(sales|customer|customer-edit|project-edit)$/.test(k)) return 'sales';
  if (/^(stock|stock-item|stock-op|stocktake|products|product-edit|suppliers|supplier-edit)$/.test(k)) return 'stock';
  if (/^(input|task|task-edit)$/.test(k)) return 'input';
  return 'dash';
}
function nav(active) {
  const t = [['dash', '#/', 'ダッシュボード'], ['sales', '#/sales', '営業'], ['orders', '#/orders', '受発注'], ['stock', '#/stock', '在庫'], ['input', '#/input', '入力']];
  return '<nav class="tabs"><div class="brand">今井園ポータル</div>' + t.map((x) => '<a href="' + x[1] + '" class="' + (x[0] === active ? 'on' : '') + '">' + ICON[x[0]] + '<span>' + x[2] + '</span></a>').join('') + '</nav>';
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
    case 'po': html = viewPO(decodeURIComponent(p[1] || '')); break;
    case 'new-po': html = viewPOForm(r.q); break;
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
    case 'suppliers': html = viewSuppliers(); break;
    case 'supplier-edit': html = viewSupplierForm(decodeURIComponent(p[1] || 'new')); break;
    case 'input': html = viewInput(); break;
    case 'task': html = viewTask(decodeURIComponent(p[1] || '')); break;
    case 'task-edit': html = viewTaskForm(); break;
    default: html = viewDash();
  }
  shell.innerHTML = html + nav(tabOf(p));
  if (p[0] === 'new-order') initOrderForm();
  if (p[0] === 'new-po') updPOForm();
  if (p[0] === 'stock-op') updStockOp();
}

/* ================= ダッシュボード ================= */
function isOverseas(o) { return (o.c['国'] && o.c['国'] !== 'JP') || o['通貨'] === 'EUR'; }
function salesSplit() { const r = {}; D.orders.forEach((o) => { if (!o.cancel && o['請求日']) { const k = o['請求日'].slice(0, 7); const x = r[k] || (r[k] = { jp: 0, os: 0 }); if (isOverseas(o)) x.os += o.yen; else x.jp += o.yen; } }); return r; }
function shiftMonth(k, n) { let y = +k.slice(0, 4), m = +k.slice(5, 7) + n; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return y + '-' + String(m).padStart(2, '0'); }
function pctLabel(cur, prev, label) { if (!prev) return '前年のデータはありません'; const p = Math.round((cur / prev - 1) * 100); return label + ' <span class="' + (p >= 0 ? 'up' : 'down') + '">' + (p >= 0 ? '+' : '') + p + '%</span>'; }
function shortageOf(o) {
  const loc = o['出荷元']; const need = {};
  o.lines.forEach((l) => { if (isStockItem(D.pMap[l['商品']])) need[l['商品']] = (need[l['商品']] || 0) + num(l['数量']); });
  return Object.keys(need).filter((pid) => { const g = D.sMap[pid + '|' + loc]; return (g ? g.qty : 0) < need[pid]; });
}
function viewDashPC() {
  const t = todayStr(); const cur = t.slice(0, 7); const sp = salesSplit(); const tot = (k) => (sp[k] ? sp[k].jp + sp[k].os : 0);
  const fy0 = fyStart(); const months = []; for (let i = 0; i < 12; i++) months.push(shiftMonth(fy0, i));
  let fyCur = 0, fyPrev = 0; months.forEach((k) => { if (k <= cur) { fyCur += tot(k); fyPrev += tot(shiftMonth(k, -12)); } });
  const unpaid = D.orders.filter((o) => o.status === 'unpaid');
  const over = unpaid.filter((o) => o['支払期日'] && dayDiff(o['支払期日']) < 0);
  const sum = (a) => a.reduce((x, o) => x + o.yen, 0);
  const oldest = over.reduce((m, o) => Math.max(m, -dayDiff(o['支払期日'])), 0);
  const stockValue = D.stock.reduce((x, g) => x + g.value, 0); const low = D.stock.filter((g) => g.low).length;
  const cnt = (st) => D.orders.filter((o) => o.status === st).length;
  const kpi = (label, value, sub, cls, href) => '<a class="kpi kpi-l' + (cls ? ' ' + cls : '') + '"' + (href ? ' href="' + href + '"' : '') + '><span>' + label + '</span><b>' + value + '</b><small>' + sub + '</small></a>';
  const kpis = '<section class="kpis six">' +
    kpi((+cur.slice(5)) + '月の売上', man(tot(cur)), pctLabel(tot(cur), tot(shiftMonth(cur, -12)), '前年同月比')) +
    kpi('今年度の累計', man(fyCur), pctLabel(fyCur, fyPrev, '前年度の同じ時期と比べて')) +
    kpi('入金待ち', yen(sum(unpaid)), unpaid.length + '件', '', '#/orders" data-act="goorders" data-chip="unpaid') +
    kpi('うち期日超過', yen(sum(over)), over.length + '件' + (oldest ? '・最長 ' + oldest + '日超過' : ''), over.length ? 'warn-red' : '', '#/orders" data-act="goorders" data-chip="unpaid') +
    kpi('在庫金額', yen(stockValue), low ? '安全在庫割れ ' + low + '品目' : '安全在庫割れなし', low ? 'warn-amber' : '', '#/stock" data-act="stockwarn') +
    kpi('進行中の受注', (cnt('unshipped') + cnt('uninvoiced') + cnt('unpaid')) + '件', '出荷待ち ' + cnt('unshipped') + '・請求待ち ' + cnt('uninvoiced') + '・入金待ち ' + cnt('unpaid'), '', '#/orders" data-act="goorders" data-chip="active') + '</section>';

  // B：会計年度の月別売上（国内と海外の積み上げ、前年度の同じ月を線で表示）
  const vals = months.map((k) => ({ k, jp: sp[k] ? sp[k].jp : 0, os: sp[k] ? sp[k].os : 0, prev: tot(shiftMonth(k, -12)), future: k > cur }));
  const maxV = Math.max(1, ...vals.map((v) => Math.max(v.jp + v.os, v.prev)));
  const step = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000].map((x) => x * 10000).find((x) => x * 4 >= maxV) || Math.ceil(maxV / 4);
  const top4 = step * 4, H = 200, hpx = (v) => Math.round(v / top4 * H);
  const selK = ui.fySel && months.indexOf(ui.fySel) >= 0 ? ui.fySel : (cur >= months[0] && cur <= months[11] ? cur : months[0]);
  const cols = vals.map((v) => {
    const total = v.jp + v.os; const hj = hpx(v.jp), ho = hpx(v.os);
    return '<button class="fycol' + (v.k === selK ? ' sel' : '') + (v.future ? ' future' : '') + '" data-act="fymonth" data-k="' + v.k + '" aria-label="' + (+v.k.slice(5)) + '月 国内' + man(v.jp) + ' 海外' + man(v.os) + '">' +
      '<span class="stack">' + (ho ? '<i class="os' + '" style="height:' + ho + 'px"></i>' : '') + (hj ? '<i class="jp' + (ho ? '' : ' cap') + '" style="height:' + hj + 'px"></i>' : '') + '</span>' +
      (v.prev ? '<em class="prev" style="bottom:' + hpx(v.prev) + 'px"></em>' : '') + '</button>';
  }).join('');
  const chart = '<section class="card pad fychart"><div class="h2row"><h2>月別の売上　' + fyStart().slice(0, 4) + '年度（2月〜翌1月）</h2><span class="note">万円・請求ベース</span></div>' +
    '<div class="legend"><span><span class="sw jp"></span>国内</span><span><span class="sw os"></span>海外</span><span><span class="sw prevsw"></span>前年度の同じ月</span><span class="ro" id="fyread">' + fyReadout(vals.find((v) => v.k === selK)) + '</span></div>' +
    '<div class="chart big"><div class="yax" style="height:' + H + 'px">' + [4, 3, 2, 1, 0].map((i) => '<span>' + Math.round(step * i / 10000).toLocaleString('ja-JP') + '</span>').join('') + '</div>' +
    '<div style="flex:1;display:flex;flex-direction:column"><div class="plot" style="height:' + H + 'px">' + [0, 25, 50, 75].map((p) => '<div class="grid" style="top:' + p + '%"></div>').join('') + cols + '</div>' +
    '<div class="xl" style="grid-template-columns:repeat(12,minmax(0,1fr))">' + months.map((k) => '<span class="' + (k === selK ? 'sel' : '') + (k > cur ? ' muted2' : '') + '">' + (+k.slice(5)) + '月</span>').join('') + '</div></div></div>' +
    '<div class="note">今年度の国内 ' + man(vals.reduce((x, v) => x + v.jp, 0)) + '・海外 ' + man(vals.reduce((x, v) => x + v.os, 0)) + '。ユーロの売上は請求日の為替レートで円に換算しています。</div></section>';
  ui._fyVals = vals;

  // D：入金待ちを経過日数で分ける
  const buckets = [['期日前', (d) => d >= 0, ''], ['1〜30日超過', (d) => d < 0 && d >= -30, 'amber'], ['31〜60日超過', (d) => d < -30 && d >= -60, 'red'], ['61日以上超過', (d) => d < -60, 'red']];
  const allU = sum(unpaid) || 1;
  const aging = buckets.map((b) => {
    const os = unpaid.filter((o) => b[1](o['支払期日'] ? dayDiff(o['支払期日']) : 0));
    const by = {}; os.forEach((o) => { const k = o.billTo['取引先名'] || ''; const x = by[k] || (by[k] = { name: k, yen: 0, n: 0, days: 0, id: o['受注ID'] }); x.yen += o.yen; x.n++; const dd = o['支払期日'] ? -dayDiff(o['支払期日']) : 0; if (dd >= x.days) { x.days = dd; x.id = o['受注ID']; } });
    const list = Object.keys(by).map((k) => by[k]).sort((a, c) => c.yen - a.yen);
    const amt = sum(os);
    return '<div class="age"><div class="age-h"><span class="pill ' + b[2] + '">' + b[0] + '</span><b>' + yen(amt) + '</b><span class="note">' + os.length + '件</span></div>' +
      '<div class="age-bar"><i class="' + b[2] + '" style="width:' + Math.round(amt / allU * 100) + '%"></i></div>' +
      (list.length ? '<div class="age-list">' + list.slice(0, 4).map((x) => '<a href="#/order/' + encodeURIComponent(x.id) + '"><span>' + esc(x.name) + (x.n > 1 ? '（' + x.n + '件）' : '') + '</span><span>' + yen(x.yen) + '</span></a>').join('') + (list.length > 4 ? '<span class="note">ほか ' + (list.length - 4) + '社</span>' : '') + '</div>' : '') + '</div>';
  }).join('');
  const agingCard = '<section class="card pad" style="display:flex;flex-direction:column;gap:12px"><div class="h2row"><h2>入金待ち（期日からの経過）</h2><a class="note" href="#/orders" data-act="goorders" data-chip="unpaid">受注を見る</a></div>' + aging + '</section>';

  // E：今週と来週の出荷予定
  const dow = (() => { const a = t.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]).getDay(); })();
  const sunday = addDays(t, (7 - dow) % 7), nextSunday = addDays(sunday, 7);
  const ship = D.orders.filter((o) => o.status === 'unshipped');
  const grp = [['予定日を過ぎた受注', (o) => o['出荷予定日'] && o['出荷予定日'] < t], ['今週（' + md(t) + '〜' + md(sunday) + '）', (o) => o['出荷予定日'] >= t && o['出荷予定日'] <= sunday], ['来週（' + md(addDays(sunday, 1)) + '〜' + md(nextSunday) + '）', (o) => o['出荷予定日'] > sunday && o['出荷予定日'] <= nextSunday], ['予定日が未設定', (o) => !o['出荷予定日']]];
  const shipRows = grp.map((g) => {
    const os = ship.filter(g[1]).sort((a, b) => (a['出荷予定日'] || '').localeCompare(b['出荷予定日'] || ''));
    if (!os.length) return '';
    return '<p class="note ship-g">' + g[0] + '　' + os.length + '件</p>' + os.map((o) => { const sh = shortageOf(o);
      return '<a class="row ship-r" href="#/order/' + encodeURIComponent(o['受注ID']) + '"><span class="t">' + (o['出荷予定日'] ? md(o['出荷予定日']) + '（' + WEEK[new Date(o['出荷予定日'].replace(/-/g, '/')).getDay()] + '）' : '—') + '</span><span class="c">' + esc(custLabel(o.c)) + '・' + esc(o.summary) + '</span><span class="pill">' + esc(o['出荷元'] || '') + '</span>' + (sh.length ? '<span class="pill amber" title="出荷元の在庫が足りません">在庫不足</span>' : '') + '</a>'; }).join('');
  }).join('');
  const later = ship.filter((o) => o['出荷予定日'] > nextSunday).length;
  const shipCard = '<section style="display:flex;flex-direction:column;gap:8px"><div class="h2row"><p class="sec-title">出荷の予定</p><span class="note">出荷待ち ' + ship.length + '件' + (later ? '（再来週以降 ' + later + '件）' : '') + '</span></div><div class="card list">' + (shipRows || '<div class="empty">今週と来週に出荷する受注はありません</div>') + '</div></section>';

  const acts = D.actions.concat(D.stockActs || [], D.poActs || []).sort((a, b) => (a['期日'] || '9').localeCompare(b['期日'] || '9'));
  const showN = ui.showAllActions ? acts.length : Math.min(acts.length, 10);
  const actRows = acts.slice(0, showN).map((a) => {
    const dd = a.label ? { cls: a.cls, label: a.label, over: a.over } : due(a['期日']);
    const href = a.href ? a.href : a['種類'] === '受注' ? '#/order/' + encodeURIComponent(a['参照ID']) : '#/task/' + encodeURIComponent(a['参照ID']);
    return '<a class="row' + (dd.over ? ' over' : '') + '" href="' + href + '"><span class="t">' + esc(a['作業']) + '</span><span class="c">' + esc(a['案件名']) + '</span><span class="pill ' + dd.cls + '">' + esc(dd.label) + '</span></a>';
  }).join('');
  const actCard = '<section style="display:flex;flex-direction:column;gap:8px"><div class="h2row"><p class="sec-title">ネクストアクション</p><span class="note">' + acts.length + '件・期日が近い順</span></div>' +
    '<div class="card list">' + (actRows || '<div class="empty">対応が必要な作業はありません</div>') +
    (acts.length > 10 ? '<button class="more" data-act="toggleacts">' + (ui.showAllActions ? '10件だけ表示' : 'すべて表示（' + acts.length + '件）') + '</button>' : '') + '</div></section>';

  return top('今井園ポータル', { sub: jpDate(t), logout: true }) + '<main class="view wide dashpc">' + kpis +
    '<div class="dgrid2"><div class="dcol2">' + chart + actCard + '</div><div class="dcol2">' + agingCard + shipCard + stockWarnCard() + dashProjects() + '</div></div></main>';
}
function fyReadout(v) { if (!v) return ''; return (+v.k.slice(5)) + '月：' + (v.future ? 'これから' : '国内 ' + man(v.jp) + '・海外 ' + man(v.os) + '・計 ' + man(v.jp + v.os) + '（前年度 ' + (v.prev ? man(v.prev) : 'なし') + '）'); }
function viewDash() {
  if (isPC()) return viewDashPC();
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

  const acts = D.actions.concat(D.stockActs || [], D.poActs || []).sort((a, b) => (a['期日'] || '9').localeCompare(b['期日'] || '9'));
  const showN = ui.showAllActions ? acts.length : Math.min(acts.length, 10);
  const actRows = acts.slice(0, showN).map((a) => {
    const dd = a.label ? { cls: a.cls, label: a.label, over: a.over } : due(a['期日']);
    const href = a.href ? a.href : a['種類'] === '受注' ? '#/order/' + encodeURIComponent(a['参照ID']) : '#/task/' + encodeURIComponent(a['参照ID']);
    return '<a class="row' + (dd.over ? ' over' : '') + '" href="' + href + '"><span class="t">' + esc(a['作業']) + '</span><span class="c">' + esc(a['案件名']) + '</span><span class="pill ' + dd.cls + '">' + esc(dd.label) + '</span></a>';
  }).join('');

  return top('今井園ポータル', { sub: jpDate(todayStr()), logout: true }) +
    '<main class="view wide">' +
    '<section class="kpis"><div class="kpi"><span>' + mlabel(cur) + 'の売上</span><b>' + man(vals[5]) + '</b></div><div class="kpi"><span>' + mlabel(ms[4]) + 'の売上</span><b>' + man(vals[4]) + '</b></div><div class="kpi" title="' + esc(fyLabel()) + '"><span>今年度の累計</span><b>' + man(fyTotal) + '</b></div></section>' +
    '<div class="dcols"><div class="dcol">' +
    '<section class="card pad" style="display:flex;flex-direction:column;gap:10px"><div class="h2row"><h2>月別の売上</h2><span class="note">万円・請求ベース</span></div>' +
    '<div class="legend"><span><span class="sw"></span>売上</span><span class="ro">' + mlabel(ms[sel]) + '：' + man(vals[sel]) + '</span></div>' + chart + '</section>' +
    '<section class="card pad" style="display:flex;flex-direction:column;gap:8px;cursor:pointer" data-act="goorders" data-chip="unpaid"><div class="h2row"><h2>入金待ち</h2><b style="font-size:15px">' + yen(so + sn) + '</b></div>' + payBar +
    '<div class="h2row" style="font-size:12px"><span style="color:var(--red);font-weight:700">期日超過 ' + over.length + '件 ' + yen(so) + '</span><span class="muted">期日前 ' + notyet.length + '件 ' + yen(sn) + '</span></div></section>' +
    stockWarnCard() + '</div><div class="dcol">' +
    '<section style="display:flex;flex-direction:column;gap:8px"><div class="h2row"><p class="sec-title">ネクストアクション</p><span class="note">' + acts.length + '件・期日が近い順</span></div>' +
    '<div class="card list">' + (actRows || '<div class="empty">対応が必要な作業はありません</div>') +
    (acts.length > 10 ? '<button class="more" data-act="toggleacts">' + (ui.showAllActions ? '10件だけ表示' : 'すべて表示（' + acts.length + '件）') + '</button>' : '') + '</div></section>' +
    dashProjects() + '</div></div></main>';
}

function stockWarnCard() {
  const low = D.stock.filter((g) => g.low).length; const exp = D.stock.reduce((n, g) => n + g.expiring.length, 0);
  if (!low && !exp) return '';
  return '<a class="card pad" href="#/stock" data-act="stockwarn" style="display:flex;justify-content:space-between;align-items:center;gap:8px;text-decoration:none;color:inherit;background:var(--amber-ll)"><b style="font-size:14px;color:#6B4500">在庫の確認</b><span style="font-size:13px;color:#6B4500">' +
    (low ? '安全在庫割れ ' + low + '品目' : '') + (low && exp ? '・' : '') + (exp ? '賞味期限90日以内 ' + exp + 'ロット' : '') + ' ›</span></a>';
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
const STATUS_LABEL = { unshipped: '出荷待ち', uninvoiced: '請求待ち', unpaid: '入金待ち', done: '完了', cancel: 'キャンセル' };
function billNote(c) { return c && c.bill ? '<span class="note billnote">帳合先 ' + esc(c.bill['取引先名']) + '</span>' : ''; }
function orderCard(o) {
  const a = o.act; const dd = a ? due(a['期日']) : null;
  return '<div class="ocard' + (o.cancel ? ' cancelled' : '') + '" data-act="open" data-href="#/order/' + encodeURIComponent(o['受注ID']) + '">' +
    '<div class="l1"><b>' + esc(custLabel(o.c)) + '</b><span class="note" style="flex:none">' + esc(o.no) + '・' + md(o['受注日']) + '</span></div>' + billNote(o.c) +
    '<div class="l2"><span>' + esc(o.summary) + '</span><b>' + money(o.total, o['通貨']) + '</b></div>' + stepsHtml(o) +
    (a ? '<div class="nextline"><span class="muted">次の作業</span><span class="due-' + (dd.cls === 'red' ? 'red' : dd.cls === 'amber' ? 'amber' : 'normal') + '">' + esc(dd.label) + '</span><span>' + esc(a['作業']) + '</span></div>' : '') + '</div>';
}
function filteredOrders() {
  const chip = ORDER_CHIPS.find((c) => c[0] === ui.orderChip) || ORDER_CHIPS[0];
  const q = ui.orderQ.trim().toLowerCase();
  let list = D.orders.filter(chip[2]);
  if (q) list = list.filter((o) => (custLabel(o.c) + ' ' + (o.c.bill ? o.c.bill['取引先名'] : '') + ' ' + o.no + ' ' + o.summary + ' ' + (o.inv ? o.inv['請求番号'] : '')).toLowerCase().indexOf(q) >= 0);
  if (['active', 'unshipped', 'uninvoiced', 'unpaid'].indexOf(chip[0]) >= 0) list.sort((a, b) => ((a.act || {})['期日'] || '9').localeCompare((b.act || {})['期日'] || '9'));
  return list;
}
const ORDER_COLS = [
  { k: 'no', label: '受注番号', val: (o) => o.no },
  { k: 'date', label: '受注日', val: (o) => o['受注日'] || '', html: (o) => ymd(o['受注日']) },
  { k: 'cust', label: '取引先', val: (o) => custLabel(o.c), html: (o) => '<b>' + esc(custLabel(o.c)) + '</b>' + (o.c.bill ? '<div class="note">帳合先 ' + esc(o.c.bill['取引先名']) + '</div>' : '') },
  { k: 'bill', label: '帳合先', val: (o) => (o.c.bill ? o.c.bill['取引先名'] : '') },
  { k: 'sum', label: '内容', val: (o) => o.summary },
  { k: 'amt', label: '金額', r: true, val: (o) => o.yen, html: (o) => money(o.total, o['通貨']) },
  { k: 'st', label: '状態', val: (o) => o.step, html: (o) => '<span class="pill ' + ({ unshipped: '', uninvoiced: 'amber', unpaid: 'amber', done: 'green' }[o.status] || '') + '">' + STATUS_LABEL[o.status] + '</span>' },
  { k: 'next', label: '次の作業', val: (o) => (o.act ? o.act['期日'] : '9'), html: (o) => { if (!o.act) return ''; const dd = due(o.act['期日']); return esc(o.act['作業']) + ' <span class="due-' + ({ red: 'red', amber: 'amber' }[dd.cls] || 'normal') + '">' + esc(dd.label) + '</span>'; } },
  { k: 'inv', label: '請求番号', val: (o) => (o.inv ? o.inv['請求番号'] : '') }
];
function orderGroups(list, by) {
  const G = {};
  list.forEach((o) => {
    const c = by === 'bill' ? o.billTo : o.c; const key = by === 'bill' ? (o.c.bill ? o.c['帳合先'] : o['取引先']) : o['取引先'];
    const g = G[key] || (G[key] = { key, c, orders: [], total: 0, unpaid: 0, last: '', subs: {} });
    g.orders.push(o); if (!o.cancel) { g.total += o.yen; if (o.status === 'unpaid') g.unpaid += o.yen; }
    if ((o['受注日'] || '') > g.last) g.last = o['受注日'] || '';
    if (by === 'bill' && o.c.bill) g.subs[o.c['取引先名']] = 1;
  });
  return Object.keys(G).map((k) => G[k]).sort((a, b) => b.last.localeCompare(a.last));
}
function orderListHtml() {
  const list = filteredOrders();
  if (ui.orderView === 'list') {
    if (isPC()) return tableHtml('orders', ORDER_COLS, list.slice(0, 300).map((o) => Object.assign(o, { _dim: o.cancel })), (o) => '#/order/' + encodeURIComponent(o['受注ID']));
    return list.slice(0, 150).map(orderCard).join('') || '<div class="empty">該当する受注はありません</div>';
  }
  const gs = orderGroups(list, ui.orderView);
  if (!gs.length) return '<div class="empty">該当する受注はありません</div>';
  return gs.map((g) => {
    const open = ui.openGroup === ui.orderView + ':' + g.key;
    const subs = Object.keys(g.subs);
    return '<div class="grp card' + (open ? ' open' : '') + '"><button class="grp-h" data-act="ogroup" data-v="' + esc(ui.orderView + ':' + g.key) + '">' +
      '<span class="grp-n"><b>' + esc(custLabel(g.c)) + '</b>' + (ui.orderView === 'cust' && g.c.bill ? '<span class="note">帳合先 ' + esc(g.c.bill['取引先名']) + '</span>' : '') + (subs.length ? '<span class="note">' + esc(subs.join('、')) + '</span>' : '') + '</span>' +
      '<span class="grp-s"><span>' + g.orders.length + '件</span><b>' + yen(g.total) + '</b>' + (g.unpaid ? '<span class="due-red">未入金 ' + yen(g.unpaid) + '</span>' : '<span class="muted">未入金なし</span>') + '</span><span class="grp-x">' + (open ? '▲' : '▼') + '</span></button>' +
      (open ? '<div class="grp-b">' + (isPC() ? tableHtml('orders', ORDER_COLS.filter((c) => c.k !== 'bill' && c.k !== 'cust' || ui.orderView === 'bill' && c.k === 'cust'), g.orders.map((o) => Object.assign(o, { _dim: o.cancel })), (o) => '#/order/' + encodeURIComponent(o['受注ID'])) : g.orders.map(orderCard).join('')) + '</div>' : '') + '</div>';
  }).join('');
}
function boSeg() { return '<div class="seg"><button class="' + (ui.boTab === 'o' ? 'on' : '') + '" data-act="botab" data-v="o">受注</button><button class="' + (ui.boTab === 'p' ? 'on' : '') + '" data-act="botab" data-v="p">発注</button></div>'; }
function viewOrders() {
  if (ui.boTab === 'p') return viewPurchases();
  const chip = ORDER_CHIPS.find((c) => c[0] === ui.orderChip) || ORDER_CHIPS[0];
  const chips = ORDER_CHIPS.map((c) => '<button class="chip' + (c[0] === chip[0] ? ' on' : '') + '" data-act="ochip" data-v="' + c[0] + '">' + c[1] + ' ' + D.orders.filter(c[2]).length + '</button>').join('');
  const views = [['list', '一覧'], ['cust', '取引先ごと'], ['bill', '帳合先ごと']];
  const seg = '<div class="seg light">' + views.map((v) => '<button class="' + (ui.orderView === v[0] ? 'on' : '') + '" data-act="oview" data-v="' + v[0] + '">' + v[1] + '</button>').join('') + '</div>';
  return top('受発注ボード', { extra: boSeg() }) + '<main class="view wide" style="gap:12px">' +
    '<div class="chips">' + chips + '</div><div class="toolbar"><input class="search" type="search" placeholder="取引先・受注番号・商品・請求番号で検索" value="' + esc(ui.orderQ) + '" data-input="orderQ">' + seg + '</div>' +
    '<div id="olist" style="display:flex;flex-direction:column;gap:12px">' + orderListHtml() + '</div>' +
    '<button class="btn primary narrow-btn" data-act="open" data-href="#/new-order">＋ 受注を登録</button></main>';
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
      actionHtml = '<div class="inline-form form"><b style="font-size:14px">請求を記録</b><label>請求日<input type="date" id="f_date" value="' + t + '"></label>' +
        '<div class="note">請求書PDFを' + esc(o.billTo['取引先名']) + ' 宛て（' + (overseas ? '英語' : '日本語') + '）で作り、Googleドライブに保存します。支払条件は' + esc(payLabel(o.c)) + (o.c.bill ? '（帳合先の条件）' : '') + 'で、今日付けで請求すると支払期日は' + ymd(dueFrom(t, o.c)) + 'になります。' + (cur === 'EUR' ? '為替レートは請求日時点のEUR/JPYを自動で記録します。' : '') + '</div>' +
        '<button class="btn primary" data-act="invoice" data-id="' + esc(id) + '">請求を記録する</button></div>';
    }
    if (o.status === 'unpaid') actionHtml = '<div class="inline-form form"><b style="font-size:14px">入金を記録</b><div class="two"><label>入金日<input type="date" id="f_date" value="' + t + '"></label><label>入金額（' + cur + '）<input type="number" step="any" inputmode="decimal" id="f_amount" value="' + (Math.round(o.total * 100) / 100) + '"></label></div><button class="btn primary" data-act="pay" data-id="' + esc(id) + '">入金を記録する</button></div>';
  }
  const undoStep = { uninvoiced: 'ship', unpaid: 'invoice', done: 'payment' }[o.status];
  const kv = [['取引先', '<a href="#/customer/' + encodeURIComponent(o['取引先']) + '">' + esc(custLabel(o.c)) + '</a>']].concat(o.c.bill ? [['帳合先（請求書の宛先）', '<a href="#/customer/' + encodeURIComponent(o.c['帳合先']) + '">' + esc(o.c.bill['取引先名']) + '</a>']] : []).concat([ ['受注日', ymd(o['受注日'])], ['出荷元', esc(o['出荷元'])], ['出荷予定日', ymd(o['出荷予定日'])], ['出荷日', ymd(o['出荷日'])], ['追跡番号', esc(o['追跡番号'] || '—')], ['請求日', ymd(o['請求日'])]]);
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
    invoiceCard(o) +
    '<section class="card kv">' + kv.map((x) => '<div><span>' + x[0] + '</span><span>' + x[1] + '</span></div>').join('') + '</section>' +
    (o['メモ'] ? '<section class="card memo">' + esc(o['メモ']) + '</section>' : '') +
    '<div class="btns">' + (ui.edit ? '' : '<button class="btn ghost" data-act="editon">内容を編集</button>') + (undoStep && !o.cancel ? '<button class="btn ghost" data-act="undo" data-id="' + esc(id) + '" data-step="' + undoStep + '">直前の工程を取り消す</button>' : '') +
    '<button class="btn danger" data-act="cancel" data-id="' + esc(id) + '" data-v="' + (o.cancel ? '0' : '1') + '">' + (o.cancel ? 'キャンセルを取り消す' : 'キャンセルにする') + '</button>' +
    '<button class="btn danger" data-act="delorder" data-id="' + esc(id) + '">受注を削除</button></div>' +
    '</main>';
}

function invoiceCard(o) {
  if (!o['請求日'] || o.cancel && !o.inv) return '';
  const invs = D.invByOrder[o['受注ID']] || [];
  if (!invs.length) return '<section class="card pad form" style="gap:10px"><div class="h2row"><b style="font-size:14px">請求書</b><span class="note">まだ作っていません</span></div>' +
    '<div class="note">宛先：' + esc(o.billTo['取引先名']) + '（' + (o.c['国'] && o.c['国'] !== 'JP' ? '英語' : '日本語') + '）</div>' +
    '<button class="btn primary" data-act="invissue" data-id="' + esc(o['受注ID']) + '">請求書PDFを作る</button></section>';
  const v = invs[0]; const cur = v['通貨'] || 'JPY';
  const old = invs.slice(1).map((x) => '<button class="linkbtn" data-act="invpdf" data-id="' + esc(x['請求書ID']) + '">第' + esc(x['版']) + '版（' + esc(x['作成日時']) + '）</button>').join('、');
  return '<section class="card pad form" style="gap:10px"><div class="h2row"><b style="font-size:14px">請求書 ' + esc(v['請求番号']) + (num(v['版']) > 1 ? '（第' + esc(v['版']) + '版）' : '') + '</b><b>' + money(v['合計'], cur) + '</b></div>' +
    '<div class="note">宛先 ' + esc(v['宛先']) + '・' + (v['言語'] === 'en' ? '英語' : '日本語') + '・作成 ' + esc(v['作成日時']) + (v['作成者'] ? '（' + esc(v['作成者']) + '）' : '') + '</div>' +
    (v['言語'] !== 'en' ? '<div class="note">小計 8% ' + yen(v['小計8']) + '・10% ' + yen(v['小計10']) + '／消費税 8% ' + yen(v['消費税8']) + '・10% ' + yen(v['消費税10']) + '</div>' : '') +
    '<div class="btns"><button class="btn primary" data-act="invpdf" data-id="' + esc(v['請求書ID']) + '">PDFを開く</button><button class="btn" data-act="invmail" data-id="' + esc(v['請求書ID']) + '">Gmailの下書きを作る</button></div>' +
    '<button class="btn ghost" data-act="invissue" data-id="' + esc(o['受注ID']) + '" data-re="1">内容を直して作り直す（第' + (num(v['版']) + 1) + '版）</button>' +
    (old ? '<div class="note">以前の版：' + old + '</div>' : '') + '</section>';
}
async function openInvoicePdf(id) {
  // iPhone では await の後に新しいタブを開けないため、先に空のタブを開いておく
  const w = window.open('', '_blank');
  if (w) w.document.write('<p style="font-family:sans-serif;padding:24px">請求書を読み込んでいます…</p>');
  busy(true, '請求書を読み込んでいます…');
  try {
    const r = await api('getInvoicePdf', { id });
    const bin = atob(r.base64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    busy(false);
    if (w) w.location.href = url;
    else { const a = document.createElement('a'); a.href = url; a.download = r.name || 'invoice.pdf'; document.body.appendChild(a); a.click(); a.remove(); }
  } catch (e) { busy(false); if (w) w.close(); if (e.message !== 'auth') alert(e.message); }
}
async function draftInvoiceMail(id) {
  if (!confirm('この請求書を添付したGmailの下書きを作ります（送信はしません）')) return;
  busy(true, '下書きを作っています…');
  try {
    const r = await api('draftInvoiceMail', { id }); busy(false);
    alert('Gmailの下書きを作りました。' + (r.to ? '宛先：' + r.to : '取引先のメールアドレスが未登録のため、宛先は空です。') + '\nポータルの管理アカウントのGmailで、内容を確認してから送信してください。');
  } catch (e) { busy(false); if (e.message !== 'auth') alert(e.message); }
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
    '<div class="two"><label>区分<select id="nc_kind">' + ['', 'カフェ', '卸', '小売', 'その他'].map((x) => '<option value="' + x + '">' + (x || '未設定') + '</option>').join('') + '</select></label><span></span></div>' + payFields('', 30, 'data-n') +
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
  if (isNewCust()) return { '取引先名': val('nc_name'), '国': val('nc_country'), '通貨': val('nc_cur'), '支払条件': val('nc_pay'), '支払サイト日数': val('nc_site') || 30 };
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
  document.getElementById('of_preview').innerHTML = '<b>登録するとネクストアクションに表示されます</b><span>' + (overseas ? '出荷準備・書類チェック' : '出荷準備') + '　期日 ' + (dueS ? md(dueS) + (dayDiff(dueS) <= 0 ? '（今日）' : '') : '—') + '</span>' + (c ? '<span class="note">通貨 ' + esc(c['通貨'] || 'JPY') + '・' + esc(payLabel(c)) + '・請求書は' + (overseas ? '英語' : '日本語') + '</span>' : '');
}
async function createOrder() {
  const sel = document.getElementById('of_c').value; const cid = sel === '__new' ? '' : sel;
  const lines = [...document.querySelectorAll('#of_lines .line-item')].map((el) => ({ productId: el.querySelector('.l_p').value, qty: el.querySelector('.l_q').value, price: el.querySelector('.l_u').value || 0 }));
  let newCustomer = null;
  if (sel === '__new') {
    if (!val('nc_name').trim()) { alert('新しい取引先の名前を入力してください'); return; }
    const ct = val('nc_contact').trim(); const em = (ct.match(/[^\s]+@[^\s]+/) || [''])[0];
    newCustomer = { '取引先名': val('nc_name').trim(), '国': val('nc_country'), '通貨': val('nc_cur'), '区分': val('nc_kind'), '支払条件': val('nc_pay'), '支払サイト日数': Number(val('nc_site')) || 30, '担当者名': ct.replace(em, '').trim(), 'メール': em, 'フェーズ': '取引中' };
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

/* ================= 発注 ================= */
const PO_STEPS = ['発注', '入荷', '支払'];
const PO_STATUS = { ordered: '入荷待ち', unpaid: '支払待ち', done: '完了', cancel: 'キャンセル' };
const PO_CHIPS = [['active', '進行中', (x) => x.status === 'ordered' || x.status === 'unpaid'], ['ordered', '入荷待ち', (x) => x.status === 'ordered'], ['unpaid', '支払待ち', (x) => x.status === 'unpaid'], ['done', '完了', (x) => x.status === 'done'], ['all', 'すべて', () => true], ['cancel', 'キャンセル', (x) => x.cancel]];
function poSteps(x) {
  if (x.cancel) return '<div class="pill" style="align-self:flex-start">キャンセル</div>';
  return '<div class="steps" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + PO_STEPS.map((l, i) => '<div class="' + (i < x.step ? 'done' : i === x.step ? 'cur' : '') + '"><i></i><span>' + l + '</span></div>').join('') + '</div>';
}
function poNext(x) {
  if (!x.act) return '';
  const dd = due(x.act['期日']);
  return '<div class="nextline"><span class="muted">次の作業</span><span class="due-' + ({ red: 'red', amber: 'amber' }[dd.cls] || 'normal') + '">' + esc(dd.label) + '</span><span>' + esc(x.act['作業']) + '</span></div>';
}
function poCard(x) {
  return '<div class="ocard' + (x.cancel ? ' cancelled' : '') + '" data-act="open" data-href="#/po/' + encodeURIComponent(x['発注ID']) + '">' +
    '<div class="l1"><b>' + esc(x.sup['仕入先名']) + '</b><span class="note" style="flex:none">' + esc(x.no) + '・' + md(x['発注日']) + '</span></div>' +
    '<div class="l2"><span>' + esc(x.summary) + '</span><b>' + yen(x.total) + '</b></div>' + poSteps(x) + poNext(x) + '</div>';
}
const PO_COLS = [
  { k: 'no', label: '発注番号', val: (x) => x.no },
  { k: 'date', label: '発注日', val: (x) => x['発注日'] || '', html: (x) => ymd(x['発注日']) },
  { k: 'sup', label: '仕入先', val: (x) => x.sup['仕入先名'], html: (x) => '<b>' + esc(x.sup['仕入先名']) + '</b>' },
  { k: 'sum', label: '内容', val: (x) => x.summary },
  { k: 'amt', label: '金額（税抜）', r: true, val: (x) => x.total, html: (x) => yen(x.total) },
  { k: 'st', label: '状態', val: (x) => x.step, html: (x) => '<span class="pill ' + ({ ordered: '', unpaid: 'amber', done: 'green' }[x.status] || '') + '">' + PO_STATUS[x.status] + '</span>' },
  { k: 'loc', label: '入荷先', val: (x) => x['入荷先'] || '' },
  { k: 'arr', label: '入荷予定・入荷日', val: (x) => x['入荷日'] || x['入荷予定日'] || '', html: (x) => (x['入荷日'] ? '入荷 ' + ymd(x['入荷日']) : x['入荷予定日'] ? '予定 ' + ymd(x['入荷予定日']) : '—') },
  { k: 'next', label: '次の作業', val: (x) => (x.act ? x.act['期日'] : '9'), html: (x) => { if (!x.act) return ''; const dd = due(x.act['期日']); return esc(x.act['作業']) + ' <span class="due-' + ({ red: 'red', amber: 'amber' }[dd.cls] || 'normal') + '">' + esc(dd.label) + '</span>'; } }
];
function poListHtml() {
  const chip = PO_CHIPS.find((c) => c[0] === ui.poChip) || PO_CHIPS[0];
  const q = ui.poQ.trim().toLowerCase();
  let list = D.purchases.filter(chip[2]);
  if (q) list = list.filter((x) => (x.sup['仕入先名'] + ' ' + x.no + ' ' + x.summary).toLowerCase().indexOf(q) >= 0);
  if (chip[0] === 'active' || chip[0] === 'ordered' || chip[0] === 'unpaid') list.sort((a, b) => ((a.act || {})['期日'] || '9').localeCompare((b.act || {})['期日'] || '9'));
  if (isPC()) return tableHtml('po', PO_COLS, list.map((x) => Object.assign(x, { _dim: x.cancel })), (x) => '#/po/' + encodeURIComponent(x['発注ID']));
  return list.map(poCard).join('') || '<div class="empty">該当する発注はありません</div>';
}
function viewPurchases() {
  const chip = PO_CHIPS.find((c) => c[0] === ui.poChip) || PO_CHIPS[0];
  const chips = PO_CHIPS.map((c) => '<button class="chip' + (c[0] === chip[0] ? ' on' : '') + '" data-act="pochip" data-v="' + c[0] + '">' + c[1] + ' ' + D.purchases.filter(c[2]).length + '</button>').join('');
  return top('受発注ボード', { extra: boSeg() }) + '<main class="view wide" style="gap:12px">' +
    '<div class="chips">' + chips + '</div><div class="toolbar"><input class="search" type="search" placeholder="仕入先・発注番号・商品で検索" value="' + esc(ui.poQ) + '" data-input="poQ"></div>' +
    '<div id="plist" style="display:flex;flex-direction:column;gap:12px">' + poListHtml() + '</div>' +
    '<button class="btn primary narrow-btn" data-act="open" data-href="#/new-po">＋ 発注を登録</button></main>';
}
function viewPO(id) {
  const x = D.poMap[id];
  if (!x) return top('発注', { back: true }) + '<main class="view"><div class="empty">発注が見つかりません</div></main>';
  const t = todayStr(); const locOpts = (v) => CONFIG.LOCATIONS.map((l) => '<option' + (l === v ? ' selected' : '') + '>' + l + '</option>').join('');
  let actionHtml = '';
  if (!x.cancel && x.status === 'ordered') {
    const rows = x.lines.map((l) => { const p = D.pMap[l['商品']] || {}; const st = isStockItem(p);
      return '<div class="recv-row" data-line="' + esc(l['明細ID']) + '"><div><b>' + esc(p['商品名'] || l['商品']) + '</b><div class="note">発注 ' + qtyFmt(l['数量']) + esc(p['単位'] || '') + (st ? '' : '・在庫管理しない商品') + '</div></div>' +
        '<label>入荷数量<input class="r_q" type="number" step="any" inputmode="decimal" value="' + num(l['数量']) + '"></label>' +
        (st ? '<label>ロット（任意）<input class="r_lot" placeholder="例：2612-A"></label><label>賞味期限（任意）<input class="r_exp" type="date"></label>' : '<span></span><span></span>') + '</div>'; }).join('');
    actionHtml = '<div class="inline-form form"><b style="font-size:14px">入荷を記録（検品）</b><div class="two"><label>入荷日<input type="date" id="f_date" value="' + t + '"></label><label>入荷先<select id="f_loc">' + locOpts(x['入荷先'] || CONFIG.LOCATIONS[0]) + '</select></label></div>' +
      '<div class="note">届いた数量を数え、発注と違うときは入荷数量を書き換えてください。在庫管理する商品は、入荷先の在庫に仕入単価つきで入庫します。支払期日は入荷日の翌月末になります（あとで変更できます）。</div>' +
      '<div class="recv">' + rows + '</div><button class="btn primary" data-act="poreceive" data-id="' + esc(id) + '">入荷を記録する</button></div>';
  }
  if (!x.cancel && x.status === 'unpaid') actionHtml = '<div class="inline-form form"><b style="font-size:14px">支払を記録</b><div class="two"><label>支払日<input type="date" id="f_date" value="' + t + '"></label><label>支払額（円、税込）<input type="number" step="any" inputmode="decimal" id="f_amount" value="' + poTaxIncl(x, true) + '"></label></div>' +
    '<div class="note">支払額の初期値は、入荷数量×仕入単価に消費税（税率ごとに切り捨て）を足した見込み額です。請求書の金額に合わせて直してください。' + (x.sup['支払条件'] ? '仕入先の支払条件：' + esc(x.sup['支払条件']) : '') + '</div>' +
    '<button class="btn primary" data-act="popay" data-id="' + esc(id) + '">支払を記録する</button></div>';
  const recvd = !!x['入荷日'];
  const lines = x.lines.map((l) => { const p = D.pMap[l['商品']] || {}; const u = p['単位'] || '';
    const rq = recvd && l['入荷数量'] !== '' ? num(l['入荷数量']) : null;
    return '<tr><td>' + esc(p['商品名'] || l['商品']) + (recvd ? '<div class="note">入荷 ' + qtyFmt(rq) + u + (rq !== num(l['数量']) ? '（発注と差あり）' : '') + (l['ロット'] ? '・ロット ' + esc(l['ロット']) : '') + (l['賞味期限'] ? '・賞味期限 ' + ymd(l['賞味期限']) : '') + '</div>' : '') + '</td><td class="r">' + qtyFmt(l['数量']) + esc(u) + ' × ' + yen(l['単価']) + '</td><td class="r">' + yen(num(l['数量']) * num(l['単価'])) + '</td></tr>'; }).join('');
  const undo = { unpaid: 'receive', done: 'payment' }[x.status];
  const kv = [['仕入先', '<a href="#/supplier-edit/' + encodeURIComponent(x['仕入先']) + '">' + esc(x.sup['仕入先名']) + '</a>'], ['発注日', ymd(x['発注日'])], ['入荷先', esc(x['入荷先'] || '—')], ['入荷予定日', ymd(x['入荷予定日'])], ['入荷日', ymd(x['入荷日'])], ['支払期日', ymd(x['支払期日'])], ['支払日', ymd(x['支払日'])], ['支払額', x['支払額'] !== '' && x['支払額'] != null ? yen(x['支払額']) : '—'], ['登録者', esc(x['登録者'] || '—')]];
  const editForm = ui.edit ? '<section class="card pad form"><b style="font-size:14px">内容を編集</b><div class="two"><label>入荷予定日<input type="date" id="e_plan" value="' + esc(x['入荷予定日']) + '"></label><label>入荷先<select id="e_loc">' + locOpts(x['入荷先']) + '</select></label></div>' +
    '<label>支払期日<input type="date" id="e_due" value="' + esc(x['支払期日']) + '"></label><label>メモ<textarea id="e_memo">' + esc(x['メモ']) + '</textarea></label>' +
    '<div class="btns"><button class="btn ghost" data-act="editoff">やめる</button><button class="btn primary" data-act="savepo" data-id="' + esc(id) + '">保存する</button></div></section>' : '';
  return top(x.no + '　' + x.sup['仕入先名'], { back: true }) + '<main class="view" style="gap:12px">' +
    '<section class="card pad" style="display:flex;flex-direction:column;gap:10px"><div class="h2row"><b>' + esc(x.sup['仕入先名']) + '</b><b style="font-size:17px">' + yen(x.total) + '<span class="note">（税抜）</span></b></div>' + poSteps(x) + poNext(x) + '</section>' +
    (actionHtml ? '<section class="card">' + actionHtml + '</section>' : '') + editForm +
    '<section class="card"><table class="lines">' + lines + '<tr class="total"><td>合計（税抜）</td><td></td><td class="r">' + yen(x.total) + '</td></tr><tr><td class="note">税込の見込み</td><td></td><td class="r note">' + yen(poTaxIncl(x, recvd)) + '</td></tr></table></section>' +
    '<section class="card kv">' + kv.map((r) => '<div><span>' + r[0] + '</span><span>' + r[1] + '</span></div>').join('') + '</section>' +
    (x['メモ'] ? '<section class="card memo">' + esc(x['メモ']) + '</section>' : '') +
    '<div class="btns">' + (ui.edit ? '' : '<button class="btn ghost" data-act="editon">内容を編集</button>') + (undo && !x.cancel ? '<button class="btn ghost" data-act="poundo" data-id="' + esc(id) + '" data-step="' + undo + '">直前の工程を取り消す</button>' : '') +
    (x.status === 'ordered' || x.cancel ? '<button class="btn danger" data-act="pocancel" data-id="' + esc(id) + '" data-v="' + (x.cancel ? '0' : '1') + '">' + (x.cancel ? 'キャンセルを取り消す' : 'キャンセルにする') + '</button>' : '') +
    '<button class="btn danger" data-act="delpo" data-id="' + esc(id) + '">発注を削除</button></div></main>';
}
/* ---------- 発注フォーム ---------- */
function poLineHtml(pid) {
  const ps = D.products.filter((p) => truthy(p['販売中']) || p['販売中'] === '' || isStockItem(p)).sort((a, b) => (a['商品名'] || '').localeCompare(b['商品名'] || '', 'ja'));
  return '<div class="line-item po-line"><label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:6px">商品<select class="pl_p"><option value="">選択</option>' + ps.map((p) => '<option value="' + esc(p['商品ID']) + '"' + (p['商品ID'] === pid ? ' selected' : '') + '>' + esc(p['商品名']) + '</option>').join('') + '</select></label>' +
    '<label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:6px">数量<input class="pl_q" type="number" step="any" inputmode="decimal"></label>' +
    '<label style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:6px">仕入単価<input class="pl_u" type="number" step="any" inputmode="decimal"' + (pid && costOf(D.pMap[pid]) != null ? ' value="' + costOf(D.pMap[pid]) + '"' : '') + '></label><button class="x" data-act="rmpoline" aria-label="削除">×</button></div>';
}
function viewPOForm(q) {
  const pid = q.get('p') || ''; const sid = q.get('s') || (pid && D.pMap[pid] ? D.pMap[pid]['仕入先'] : '') || '';
  const sups = D.suppliers.slice().sort((a, b) => (a['仕入先名'] || '').localeCompare(b['仕入先名'] || '', 'ja'));
  const loc = q.get('l') || (ui.stockLoc !== 'all' ? ui.stockLoc : CONFIG.LOCATIONS[0]);
  return top('発注を登録', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="poform">' +
    '<label>仕入先<select id="po_s"><option value="">選んでください</option>' + sups.map((x) => '<option value="' + esc(x['仕入先ID']) + '"' + (x['仕入先ID'] === sid ? ' selected' : '') + '>' + esc(x['仕入先名']) + '</option>').join('') + '</select></label>' +
    '<div id="po_lines" style="display:flex;flex-direction:column;gap:10px">' + poLineHtml(pid) + '</div><button class="btn ghost" data-act="addpoline" style="min-height:40px">＋ 商品を追加</button>' +
    '<div class="sumbox"><span class="note">合計（税抜）</span><b id="po_total">¥0</b></div>' +
    '<div class="two"><label>入荷予定日<input type="date" id="po_plan" value="' + addDays(todayStr(), 7) + '"></label><label>入荷先<select id="po_loc">' + CONFIG.LOCATIONS.map((l) => '<option' + (l === loc ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label></div>' +
    '<label>メモ（任意）<textarea id="po_memo" placeholder="発注の方法（電話、メール）、条件など"></textarea></label></section>' +
    '<div class="infobox" id="po_info"></div><button class="btn primary" data-act="createpo">登録する</button></main>';
}
function updPOForm() {
  const f = document.getElementById('poform'); if (!f) return;
  const sid = val('po_s'); let total = 0;
  document.querySelectorAll('#po_lines .po-line').forEach((el) => {
    const p = D.pMap[el.querySelector('.pl_p').value];
    el.querySelector('.pl_q').placeholder = p ? (p['単位'] || '') : '';
    total += num(el.querySelector('.pl_q').value) * num(el.querySelector('.pl_u').value);
  });
  document.getElementById('po_total').textContent = yen(total);
  const sp = D.products.filter((p) => sid && p['仕入先'] === sid).map((p) => p['商品名']);
  const plan = val('po_plan');
  document.getElementById('po_info').innerHTML = '<b>登録するとネクストアクションに表示されます</b><span>入荷確認　期日 ' + (plan ? md(plan) : '—') + '</span>' + (sid ? '<span class="note">この仕入先の商品：' + (sp.length ? esc(sp.join('、')) : '商品マスタで未設定') + '</span>' : '');
}
async function createPO() {
  const lines = [...document.querySelectorAll('#po_lines .po-line')].map((el) => ({ productId: el.querySelector('.pl_p').value, qty: el.querySelector('.pl_q').value, price: el.querySelector('.pl_u').value }));
  const payload = { supplierId: val('po_s'), location: val('po_loc'), planned: val('po_plan'), memo: val('po_memo'), lines };
  if (!payload.supplierId) { alert('仕入先を選んでください'); return; }
  if (!lines.some((l) => l.productId && num(l.qty) > 0)) { alert('商品と数量を入力してください'); return; }
  const before = new Set(D.purchases.map((x) => x['発注ID']));
  if (await write('createPurchase', payload, '発注を登録しました')) { const n = D.purchases.find((x) => !before.has(x['発注ID'])); ui.boTab = 'p'; go(n ? '#/po/' + encodeURIComponent(n['発注ID']) : '#/orders'); }
}
async function receivePO(id) {
  const lines = [...document.querySelectorAll('.recv-row')].map((r) => ({ lineId: r.dataset.line, qty: r.querySelector('.r_q').value, lot: r.querySelector('.r_lot') ? r.querySelector('.r_lot').value.trim() : '', expiry: r.querySelector('.r_exp') ? r.querySelector('.r_exp').value : '' }));
  const x = D.poMap[id]; const diff = lines.filter((l) => { const o = x.lines.find((y) => y['明細ID'] === l.lineId); return o && num(l.qty) !== num(o['数量']); });
  if (diff.length && !confirm(diff.length + '件の商品で、入荷数量が発注数量と違います。このまま記録しますか')) return;
  await write('receivePurchase', { id, date: val('f_date'), location: val('f_loc'), lines }, '入荷を記録し、在庫に入庫しました');
}

/* ================= 営業（取引先） ================= */
function custStats(c) {
  const fy = fyStart(); const os = D.orders.filter((o) => o['取引先'] === c['取引先ID'] && !o.cancel);
  return { fy: os.filter((o) => o['請求日'] && o['請求日'].slice(0, 7) >= fy).reduce((s, o) => s + o.yen, 0), unpaid: os.filter((o) => o.status === 'unpaid').reduce((s, o) => s + o.yen, 0), last: os.reduce((m, o) => (o['受注日'] > m ? o['受注日'] : m), ''), n: os.length };
}
function billParents() { const ids = {}; D.customers.forEach((c) => { if (c.bill) ids[c['帳合先']] = 1; }); return Object.keys(ids).map((k) => D.cMap[k]).sort((a, b) => (a['取引先名'] || '').localeCompare(b['取引先名'] || '', 'ja')); }
function filteredCustomers() {
  const q = ui.custQ.trim().toLowerCase();
  let list = D.customers.filter((c) => ui.custChip === 'all' || (phaseOf(c) || 'その他') === ui.custChip);
  if (ui.custBill === '__none') list = list.filter((c) => !c.bill);
  else if (ui.custBill === '__has') list = list.filter((c) => c.bill);
  else if (ui.custBill) list = list.filter((c) => c['帳合先'] === ui.custBill || c['取引先ID'] === ui.custBill);
  if (q) list = list.filter((c) => ((c['取引先名'] || '') + ' ' + (c.bill ? c.bill['取引先名'] : '') + ' ' + (c['国'] || '') + ' ' + (c['メモ'] || '')).toLowerCase().indexOf(q) >= 0);
  return list.map((c) => ({ c, s: custStats(c) })).sort((a, b) => (b.s.last || '').localeCompare(a.s.last || '') || (a.c['取引先名'] || '').localeCompare(b.c['取引先名'] || '', 'ja'));
}
function custCard(c, s) {
  const ph = phaseOf(c); const m = /現状: ([^\n]+)/.exec(c['メモ'] || '');
  return '<div class="ocard" data-act="open" data-href="#/customer/' + encodeURIComponent(c['取引先ID']) + '"><div class="l1"><b>' + esc(custLabel(c)) + '</b>' + (ph ? '<span class="badge">' + esc(ph) + '</span>' : '') + '</div>' + billNote(c) +
    (m ? '<span class="note" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m[1]) + '</span>' : '') +
    '<div class="stat"><span>今年度 <b>' + man(s.fy) + '</b></span>' + (s.unpaid ? '<span>入金待ち <b style="color:var(--red)">' + yen(s.unpaid) + '</b></span>' : '') + (s.last ? '<span>最終受注 <b>' + md(s.last) + '</b></span>' : '') + '</div></div>';
}
const CUST_COLS = [
  { k: 'name', label: '取引先名', val: (x) => x.c['取引先名'] || '', html: (x) => '<b>' + esc(custLabel(x.c)) + '</b>' },
  { k: 'bill', label: '帳合先', val: (x) => (x.c.bill ? x.c.bill['取引先名'] : '') },
  { k: 'phase', label: 'フェーズ', val: (x) => phaseOf(x.c) },
  { k: 'kind', label: '区分', val: (x) => x.c['区分'] || '' },
  { k: 'fy', label: '今年度の売上', r: true, val: (x) => x.s.fy, html: (x) => (x.s.fy ? yen(x.s.fy) : '—') },
  { k: 'unpaid', label: '入金待ち', r: true, val: (x) => x.s.unpaid, html: (x) => (x.s.unpaid ? '<span class="due-red">' + yen(x.s.unpaid) + '</span>' : '—') },
  { k: 'n', label: '受注', r: true, val: (x) => x.s.n, html: (x) => x.s.n + '件' },
  { k: 'last', label: '最終受注', val: (x) => x.s.last || '', html: (x) => ymd(x.s.last) }
];
function custListHtml() {
  const list = filteredCustomers();
  const href = (x) => '#/customer/' + encodeURIComponent(x.c['取引先ID']);
  if (ui.custView === 'bill') {
    // 帳合先ごと：帳合先の下に、その帳合先を通す取引先を並べる
    const byParent = {}; const roots = [];
    list.forEach((x) => { if (x.c.bill) (byParent[x.c['帳合先']] = byParent[x.c['帳合先']] || []).push(x); else roots.push(x); });
    Object.keys(byParent).forEach((pid) => { if (!roots.some((x) => x.c['取引先ID'] === pid)) roots.push({ c: D.cMap[pid], s: custStats(D.cMap[pid]), _ghost: true }); });
    const parents = roots.filter((x) => byParent[x.c['取引先ID']]).sort((a, b) => (a.c['取引先名'] || '').localeCompare(b.c['取引先名'] || '', 'ja'));
    const singles = roots.filter((x) => !byParent[x.c['取引先ID']] && !x._ghost);
    const block = (x) => { const kids = byParent[x.c['取引先ID']]; const tot = kids.reduce((s, k) => s + k.s.fy, x.s.fy);
      return '<div class="grp card open"><a class="grp-h" href="' + href(x) + '"><span class="grp-n"><span class="note">帳合先</span><b>' + esc(custLabel(x.c)) + '</b></span><span class="grp-s"><span>' + kids.length + '店舗</span><b>今年度 ' + man(tot) + '</b></span></a>' +
        '<div class="grp-b">' + (isPC() ? tableHtml('cust', CUST_COLS.filter((c) => c.k !== 'bill'), kids, href) : kids.map((k) => custCard(k.c, k.s)).join('')) + '</div></div>'; };
    return parents.map(block).join('') + (singles.length ? '<p class="sec-title" style="margin-top:4px">帳合先のない取引先</p>' + (isPC() ? tableHtml('cust', CUST_COLS.filter((c) => c.k !== 'bill'), singles, href) : singles.map((x) => custCard(x.c, x.s)).join('')) : '') || '<div class="empty">該当する取引先はありません</div>';
  }
  if (isPC()) return tableHtml('cust', CUST_COLS, list, href);
  return list.map((x) => custCard(x.c, x.s)).join('') || '<div class="empty">該当する取引先はありません</div>';
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
  return top('営業ボード', { extra: salesSeg() }) + '<main class="view wide" style="gap:12px"><div class="chips">' + chipDefs.map((x) => '<button class="chip' + (ui.custChip === x[0] ? ' on' : '') + '" data-act="cchip" data-v="' + esc(x[0]) + '">' + esc(x[1]) + ' ' + x[2] + '</button>').join('') + '</div>' +
    '<div class="toolbar"><input class="search" type="search" placeholder="取引先名・帳合先・国・メモで検索" value="' + esc(ui.custQ) + '" data-input="custQ">' +
    '<select class="search" id="cust_bill" aria-label="帳合先で絞り込み"><option value="">帳合先：すべて</option><option value="__has"' + (ui.custBill === '__has' ? ' selected' : '') + '>帳合先あり</option><option value="__none"' + (ui.custBill === '__none' ? ' selected' : '') + '>帳合先なし</option>' +
    billParents().map((b) => '<option value="' + esc(b['取引先ID']) + '"' + (ui.custBill === b['取引先ID'] ? ' selected' : '') + '>' + esc(b['取引先名']) + ' の取引先</option>').join('') + '</select>' +
    '<div class="seg light"><button class="' + (ui.custView === 'list' ? 'on' : '') + '" data-act="cview" data-v="list">一覧</button><button class="' + (ui.custView === 'bill' ? 'on' : '') + '" data-act="cview" data-v="bill">帳合先ごと</button></div></div>' +
    '<div id="clist" style="display:flex;flex-direction:column;gap:12px">' + custListHtml() + '</div>' +
    '<button class="btn primary narrow-btn" data-act="open" data-href="#/customer-edit/new">＋ 取引先・リードを追加</button></main>';
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
  const kids = D.customers.filter((x) => x['帳合先'] === id && x.bill);
  const kv = [['帳合先', c.bill ? '<a href="#/customer/' + encodeURIComponent(c['帳合先']) + '">' + esc(c.bill['取引先名']) + '</a>' : ''], ['請求書の宛先', c.bill ? c.bill['取引先名'] + '（帳合先）' : ''], ['国', c['国']], ['区分', c['区分']], ['担当者', c['担当者名']], ['メール', c['メール'] ? '<a href="mailto:' + esc(c['メール']) + '">' + esc(c['メール']) + '</a>' : ''], ['電話', c['電話'] ? '<a href="tel:' + esc(c['電話']) + '">' + esc(c['電話']) + '</a>' : ''], ['住所', c['住所']], ['通貨', c['通貨']], ['支払条件', payLabel(c) + (c.bill ? '（帳合先の条件）' : '')], ['請求書', c['国'] && c['国'] !== 'JP' ? '英語' : '日本語']];
  return top(c['取引先名'] || '取引先', { back: true }) + '<main class="view" style="gap:12px">' +
    '<section class="kpis"><div class="kpi"><span>今年度の売上</span><b>' + man(s.fy) + '</b></div><div class="kpi"><span>入金待ち</span><b' + (s.unpaid ? ' style="color:var(--red)"' : '') + '>' + yen(s.unpaid) + '</b></div><div class="kpi"><span>受注件数</span><b>' + s.n + '件</b></div></section>' +
    '<div class="btns"><button class="btn primary" data-act="open" data-href="#/new-order?c=' + encodeURIComponent(id) + '">受注を登録</button><button class="btn" data-act="open" data-href="#/customer-edit/' + encodeURIComponent(id) + '">情報を編集</button></div>' +
    '<section class="card kv">' + kv.filter((x) => x[1]).map((x) => '<div><span>' + x[0] + '</span><span>' + (String(x[1]).indexOf('<a ') === 0 ? x[1] : esc(x[1])) + '</span></div>').join('') + '</section>' +
    (c['メモ'] ? '<section class="card memo">' + esc(c['メモ']) + '</section>' : '') +
    (kids.length ? '<p class="sec-title">この取引先を帳合先にしている取引先（' + kids.length + '件）</p><div class="card list">' + kids.map((k) => '<a class="row" href="#/customer/' + encodeURIComponent(k['取引先ID']) + '"><span class="c" style="color:var(--ink)">' + esc(custLabel(k)) + '</span><span class="note" style="flex:none">今年度 ' + man(custStats(k).fy) + '</span></a>').join('') + '</div>' : '') +
    '<p class="sec-title">受注（' + os.length + '件）</p>' + (os.slice(0, 50).map(orderCard).join('') || '<div class="empty">まだ受注はありません</div>') +
    (os.length ? '<div class="note">受注がある取引先は削除できません。先に受注を削除してください。</div>' : kids.length ? '<div class="note">帳合先として使われている取引先は削除できません。</div>' : '<button class="btn danger" data-act="delcust" data-id="' + esc(id) + '">この取引先を削除</button>') + '</main>';
}
const COUNTRIES = ['JP', 'AT', 'DE', 'NL', 'IT', 'FR', 'CZ', 'SK', 'SI', 'HU', 'GB', 'US', 'AE', 'DO'];
function viewCustomerForm(id, phase) {
  const c = id === 'new' ? { '国': 'JP', '通貨': 'JPY', '支払サイト日数': 30, 'フェーズ': phase || '' } : Object.assign({}, D.cMap[id] || {}, { 'フェーズ': phaseOf(D.cMap[id] || {}) });
  const f = (k, label, type) => '<label>' + label + '<input data-f="' + k + '" type="' + (type || 'text') + '" value="' + esc(c[k]) + '"></label>';
  const ctry = COUNTRIES.indexOf(c['国']) < 0 && c['国'] ? COUNTRIES.concat([c['国']]) : COUNTRIES;
  return top(id === 'new' ? '取引先を追加' : '取引先を編集', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="cform">' + f('取引先名', '取引先名') +
    '<div class="two"><label>国<select data-f="国" id="cf_country">' + ctry.map((x) => '<option' + (x === c['国'] ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label><label>通貨<select data-f="通貨" id="cf_cur">' + ['JPY', 'EUR'].map((x) => '<option' + (x === c['通貨'] ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label></div>' +
    '<label>帳合先（請求書の宛先。ない場合は空欄）<select data-f="帳合先"><option value="">なし（この取引先に直接請求）</option>' +
    D.customers.filter((x) => x['取引先ID'] !== id && !x.bill).sort((a, b) => (a['取引先名'] || '').localeCompare(b['取引先名'] || '', 'ja')).map((x) => '<option value="' + esc(x['取引先ID']) + '"' + (x['取引先ID'] === (c['帳合先'] || '') ? ' selected' : '') + '>' + esc(custLabel(x)) + '</option>').join('') + '</select></label>' +
    '<label>営業のフェーズ<select data-f="フェーズ">' + [''].concat(PHASES).map((x) => '<option value="' + x + '"' + (x === (c['フェーズ'] || '') ? ' selected' : '') + '>' + (x || '未設定') + '</option>').join('') + '</select></label>' +
    '<div class="two"><label>区分<select data-f="区分">' + ['', 'カフェ', '卸', '小売', 'その他'].map((x) => '<option value="' + x + '"' + (x === (c['区分'] || '') ? ' selected' : '') + '>' + (x || '未設定') + '</option>').join('') + '</select></label><span></span></div>' + payFields(c['支払条件'] || '', c['支払サイト日数'], 'data-f') +
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
function costLine(g) {
  const u = g.p['単位'] || '';
  return (g.sup ? esc(g.sup['仕入先名']) : '仕入先未設定') + '・' + (g.unit ? '単価 ' + yen(g.unit) + (u ? '/' + esc(u) : '') : '単価未設定') + (g.value ? '・在庫金額 ' + yen(g.value) : '');
}
function stockCard(g, showLoc) {
  const u = g.p['単位'] || '';
  const alerts = [];
  if (g.low) alerts.push('<span class="alert amber">安全在庫 ' + qtyFmt(g.safe) + u + ' を下回っています・発注の検討</span>');
  g.expiring.forEach((l) => { const dd = dayDiff(l.exp); alerts.push('<span class="alert red">' + (l.lot ? 'ロット ' + esc(l.lot) + '：' : '') + (dd < 0 ? '賞味期限切れ' : '賞味期限まで' + dd + '日') + '・優先販売の検討</span>'); });
  return '<div class="ocard" data-act="open" data-href="#/stock-item/' + encodeURIComponent(g.pid) + '">' +
    '<div class="l1"><b>' + esc(g.p['商品名']) + '</b><b style="font-size:18px' + (g.qty <= 0 ? ';color:var(--red)' : '') + '">' + qtyFmt(g.qty) + ' ' + esc(u) + '</b></div>' +
    '<div class="note">' + (showLoc ? esc(g.loc) + (g.lotList.length ? '・' : '') : '') + g.lotList.map((l) => esc(lotText(l)) + (g.lotList.length > 1 ? '（' + qtyFmt(l.qty) + u + '）' : '')).join('、') + '</div>' +
    '<div class="note">' + costLine(g) + '</div>' + alerts.join('') + '</div>';
}
function filteredStock() {
  const q = ui.stockQ.trim().toLowerCase();
  let gs = D.stock.filter((g) => (ui.stockLoc === 'all' || g.loc === ui.stockLoc) && (g.qty !== 0 || g.safe > 0));
  if (q) gs = gs.filter((g) => ((g.p['商品名'] || '') + ' ' + (g.sup ? g.sup['仕入先名'] : '')).toLowerCase().indexOf(q) >= 0);
  gs.sort((a, b) => ((b.low || b.expiring.length ? 1 : 0) - (a.low || a.expiring.length ? 1 : 0)) || (a.p['商品名'] || '').localeCompare(b.p['商品名'] || '', 'ja') || a.loc.localeCompare(b.loc));
  return gs;
}
const STOCK_COLS = [
  { k: 'name', label: '商品', val: (g) => g.p['商品名'] || '', html: (g) => '<b>' + esc(g.p['商品名']) + '</b>' },
  { k: 'loc', label: '拠点', val: (g) => g.loc },
  { k: 'sup', label: '仕入先', val: (g) => (g.sup ? g.sup['仕入先名'] : '') },
  { k: 'qty', label: '数量', r: true, val: (g) => g.qty, html: (g) => '<b' + (g.qty <= 0 ? ' class="due-red"' : '') + '>' + qtyFmt(g.qty) + '</b> ' + esc(g.p['単位'] || '') },
  { k: 'unit', label: '仕入単価', r: true, val: (g) => g.unit || 0, html: (g) => (g.unit ? yen(g.unit) : '—') },
  { k: 'value', label: '在庫金額', r: true, val: (g) => g.value, html: (g) => (g.value ? yen(g.value) : '—') },
  { k: 'lots', label: 'ロット・賞味期限', val: (g) => (g.lotList[0] || {}).exp || '9', html: (g) => g.lotList.map((l) => esc(lotText(l)) + (g.lotList.length > 1 ? '（' + qtyFmt(l.qty) + '）' : '')).join('<br>') },
  { k: 'alert', label: '確認', val: (g) => (g.low ? 0 : 1) + (g.expiring.length ? 0 : 1), html: (g) => (g.low ? '<span class="pill amber">安全在庫割れ</span> ' : '') + (g.expiring.length ? '<span class="pill red">期限90日以内</span>' : '') }
];
function stockListHtml() {
  const gs = filteredStock(); const href = (g) => '#/stock-item/' + encodeURIComponent(g.pid);
  if (ui.stockGroup === 'sup') {
    const G = {};
    gs.forEach((g) => { const k = g.sup ? g.sup['仕入先ID'] : ''; (G[k] = G[k] || { sup: g.sup, list: [], value: 0 }).list.push(g); G[k].value += g.value; });
    const keys = Object.keys(G).sort((a, b) => (a === '' ? 1 : 0) - (b === '' ? 1 : 0) || G[b].value - G[a].value);
    return keys.map((k) => { const x = G[k];
      return '<div class="grp card open"><div class="grp-h"><span class="grp-n"><b>' + (x.sup ? esc(x.sup['仕入先名']) : '仕入先が未設定の商品') + '</b>' + (x.sup && x.sup['支払条件'] ? '<span class="note">支払条件 ' + esc(x.sup['支払条件']) + '</span>' : '') + '</span><span class="grp-s"><span>' + x.list.length + '件</span><b>在庫金額 ' + yen(x.value) + '</b></span></div>' +
        '<div class="grp-b">' + (isPC() ? tableHtml('stock', STOCK_COLS.filter((c) => c.k !== 'sup'), x.list, href) : x.list.map((g) => stockCard(g, ui.stockLoc === 'all')).join('')) + '</div></div>'; }).join('') || '<div class="empty">在庫はありません</div>';
  }
  if (isPC()) return tableHtml('stock', STOCK_COLS, gs, href);
  return gs.map((g) => stockCard(g, ui.stockLoc === 'all')).join('') || '<div class="empty">在庫はありません</div>';
}
function viewStock() {
  const locs = ['all'].concat(CONFIG.LOCATIONS);
  const seg = '<div class="seg">' + locs.map((l) => '<button class="' + (ui.stockLoc === l ? 'on' : '') + '" data-act="sloc" data-v="' + esc(l) + '">' + (l === 'all' ? '全拠点' : esc(l)) + '</button>').join('') + '</div>';
  const inLoc = D.stock.filter((g) => ui.stockLoc === 'all' || g.loc === ui.stockLoc);
  const low = inLoc.filter((g) => g.low).length, exp = inLoc.reduce((n, g) => n + g.expiring.length, 0);
  const value = inLoc.reduce((s, g) => s + g.value, 0);
  const noCost = inLoc.filter((g) => g.qty > 0 && !g.unit).length;
  return top('在庫管理', { extra: seg }) + '<main class="view wide" style="gap:12px">' +
    '<div class="kpis"><div class="kpi"><span>在庫金額（仕入単価）</span><b>' + yen(value) + '</b></div><div class="kpi" style="background:var(--amber-ll)"><span>安全在庫を下回る</span><b style="color:var(--amber)">' + low + '品目</b></div><div class="kpi" style="background:var(--red-bg)"><span>賞味期限90日以内</span><b style="color:var(--red)">' + exp + 'ロット</b></div></div>' +
    (noCost ? '<div class="note">仕入単価が未設定の在庫が ' + noCost + '件あり、在庫金額に含まれていません。商品マスタで設定できます。</div>' : '') +
    '<div class="tiles four"><button class="tile" data-act="open" data-href="#/stock-op/in">入庫</button><button class="tile" data-act="open" data-href="#/stock-op/out">出庫</button><button class="tile" data-act="open" data-href="#/stock-op/move">在庫移動</button><button class="tile" data-act="open" data-href="#/stocktake' + (ui.stockLoc !== 'all' ? '?l=' + encodeURIComponent(ui.stockLoc) : '') + '">棚卸</button></div>' +
    '<div class="toolbar"><input class="search" type="search" placeholder="商品名・仕入先で検索" value="' + esc(ui.stockQ) + '" data-input="stockQ">' +
    '<div class="seg light"><button class="' + (ui.stockGroup === 'list' ? 'on' : '') + '" data-act="sgroup" data-v="list">一覧</button><button class="' + (ui.stockGroup === 'sup' ? 'on' : '') + '" data-act="sgroup" data-v="sup">仕入先ごと</button></div></div>' +
    '<div id="slist" style="display:flex;flex-direction:column;gap:12px">' + stockListHtml() + '</div>' +
    '<div class="btns narrow-btn"><a class="btn ghost" href="#/products">商品マスタ（' + D.products.length + '件）</a><a class="btn ghost" href="#/suppliers">仕入先マスタ（' + D.suppliers.length + '件）</a></div></main>';
}
function viewStockItem(pid) {
  const p = D.pMap[pid];
  if (!p) return top('在庫', { back: true }) + '<main class="view"><div class="empty">商品が見つかりません</div></main>';
  const u = p['単位'] || '';
  const total = r3(D.stock.filter((g) => g.pid === pid).reduce((s, g) => s + g.qty, 0));
  const locCards = CONFIG.LOCATIONS.map((loc) => {
    const g = D.sMap[pid + '|' + loc] || { qty: 0, safe: 0, lotList: [], low: false, expiring: [] };
    return '<section class="card pad" style="display:flex;flex-direction:column;gap:8px"><div class="h2row"><b>' + esc(loc) + '</b><b style="font-size:17px' + (g.low ? ';color:var(--amber)' : '') + '">' + qtyFmt(g.qty) + ' ' + esc(u) + '</b></div>' +
      (g.lotList.length ? g.lotList.map((l) => '<div class="h2row note"><span>' + esc(lotText(l)) + (l.cost != null ? '・単価 ' + yen(l.cost) : '') + '</span><span>' + qtyFmt(l.qty) + u + '</span></div>').join('') : '') +
      '<div class="form" style="gap:6px"><div class="safe-row"><span class="note">安全在庫</span><input type="number" step="any" inputmode="decimal" id="safe_' + esc(loc) + '" value="' + (g.safe || '') + '" placeholder="未設定"><span class="note">' + esc(u) + '</span><button class="btn ghost" style="min-height:40px" data-act="savesafe" data-id="' + esc(pid) + '" data-loc="' + esc(loc) + '">保存</button></div></div></section>';
  }).join('');
  const hist = D.movements.filter((m) => m['商品'] === pid).slice().sort((a, b) => (b['日付'] || '').localeCompare(a['日付'] || '') || String(b['移動ID']).localeCompare(String(a['移動ID']))).slice(0, 40);
  const histRows = hist.map((m) => { const q = num(m['数量']); return '<div class="hist"><div><b>' + esc(m['種別']) + '</b>　' + esc(m['拠点']) + (m['ロット'] ? '・' + esc(m['ロット']) : '') + '<div class="note">' + md(m['日付']) + (m['メモ'] ? '　' + esc(m['メモ']) : '') + '</div></div><span class="' + (q < 0 ? 'neg' : 'pos') + '">' + (q > 0 ? '+' : '') + qtyFmt(q) + u + '</span><button class="x" data-act="delmove" data-id="' + esc(m['移動ID']) + '" aria-label="この記録を削除">×</button></div>'; }).join('');
  const q = '?p=' + encodeURIComponent(pid);
  return top(p['商品名'], { back: true }) + '<main class="view" style="gap:12px">' +
    '<section class="kpis"><div class="kpi"><span>全拠点の合計</span><b>' + qtyFmt(total) + ' ' + esc(u) + '</b></div><div class="kpi"><span>在庫金額</span><b>' + yen(D.stock.filter((g) => g.pid === pid).reduce((s, g) => s + g.value, 0)) + '</b></div><div class="kpi"><span>標準の仕入単価</span><b>' + (costOf(p) != null ? yen(costOf(p)) : '未設定') + '</b></div></section>' +
    '<div class="note">仕入先：' + (supName(p['仕入先']) ? '<a href="#/supplier-edit/' + encodeURIComponent(p['仕入先']) + '">' + esc(supName(p['仕入先'])) + '</a>' : '未設定') + '。入庫のときに入れた単価はロットごとに記録し、在庫金額はその単価で計算します（単価がないロットは標準の仕入単価で計算）。</div>' +
    '<div class="tiles"><button class="tile" data-act="open" data-href="#/stock-op/in' + q + '">入庫</button><button class="tile" data-act="open" data-href="#/stock-op/out' + q + '">出庫</button><button class="tile" data-act="open" data-href="#/stock-op/move' + q + '">在庫移動</button><button class="tile" data-act="open" data-href="#/product-edit/' + encodeURIComponent(pid) + '">商品の情報</button><button class="tile" data-act="open" data-href="#/new-po?p=' + encodeURIComponent(pid) + '">この商品を発注</button></div>' +
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
    '<div class="two"><label>仕入単価（円、税抜）<input id="so_cost" type="number" step="any" inputmode="decimal" placeholder="標準の仕入単価"></label><label>入庫日<input id="so_date" type="date" value="' + todayStr() + '"></label></div><label>メモ（任意）<input id="so_memo" placeholder="例：堀口園から仕入"></label>';
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
  const ce = document.getElementById('so_cost');
  if (ce && (ce.value === '' || ce.dataset.auto === '1')) { const c = costOf(D.pMap[pid]); ce.value = c != null ? c : ''; ce.dataset.auto = '1'; }
  const info = document.getElementById('so_info');
  if (!pid) { info.innerHTML = '<span>商品を選ぶと、今の在庫が表示されます。</span>'; return; }
  const line = (l) => { const x = D.sMap[pid + '|' + l]; return esc(l) + '　' + qtyFmt(x ? x.qty : 0) + u + (x && x.safe ? '（安全在庫 ' + qtyFmt(x.safe) + u + '）' : ''); };
  info.innerHTML = '<b>今の在庫</b>' + CONFIG.LOCATIONS.map((l) => '<span>' + line(l) + '</span>').join('');
}
async function saveStockOp(kind) {
  const base = { productId: val('so_p'), qty: val('so_qty'), memo: val('so_memo') };
  if (!base.productId || !(num(base.qty) > 0)) { alert('商品と数量を入力してください'); return; }
  let action, payload;
  if (kind === 'in') { action = 'stockIn'; payload = Object.assign(base, { location: val('so_loc'), lot: val('so_lot').trim(), expiry: val('so_exp'), date: val('so_date'), cost: val('so_cost') }); }
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
  const rows = ps.map((p) => '<a class="row" href="#/product-edit/' + encodeURIComponent(p['商品ID']) + '"' + (truthy(p['販売中']) ? '' : ' style="opacity:.5"') + '><span class="c" style="color:var(--ink);font-weight:500">' + esc(p['商品名']) +
    '<span class="note" style="display:block;font-weight:400">' + (supName(p['仕入先']) ? esc(supName(p['仕入先'])) : '仕入先未設定') + (costOf(p) != null ? '・仕入 ' + yen(costOf(p)) : '') + '・税率' + (num(p['税率']) === 10 ? '10%' : '8%') + '</span></span><span class="note" style="flex:none">' +
    priceLabel(p) + '</span></a>').join('');
  return top('商品マスタ', { back: true }) + '<main class="view" style="gap:12px">' +
    '<div class="h2row"><p class="sec-title">商品（' + ps.length + '件）</p><span class="note">標準の販売単価</span></div><div class="card list">' + rows + '</div>' +
    '<button class="btn primary" data-act="open" data-href="#/product-edit/new">＋ 商品を追加</button></main>';
}
function viewProductForm(id) {
  const p = id === 'new' ? { '単位': 'kg', '販売中': true, '税率': 8 } : (D.pMap[id] || {});
  const f = (k, label, type) => '<label>' + label + '<input data-f="' + k + '" type="' + (type || 'text') + '"' + (type === 'number' ? ' step="any" inputmode="decimal"' : '') + ' value="' + esc(p[k]) + '"></label>';
  const sups = D.suppliers.slice().sort((a, b) => (a['仕入先名'] || '').localeCompare(b['仕入先名'] || '', 'ja'));
  return top(id === 'new' ? '商品を追加' : '商品を編集', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="pform">' + f('商品名', '商品名') + f('英語の商品名', '英語の商品名（英語の請求書用）') +
    '<div class="two"><label>単位<select data-f="単位">' + ['kg', '個', '袋'].map((x) => '<option' + (x === p['単位'] ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
    '<label>消費税率<select data-f="税率"><option value="8"' + (num(p['税率']) !== 10 ? ' selected' : '') + '>8%（軽減税率・飲食料品）</option><option value="10"' + (num(p['税率']) === 10 ? ' selected' : '') + '>10%（サービス・配送料など）</option></select></label></div>' +
    '<div class="two">' + f('標準単価（円）', '標準の販売単価（円、税抜）', 'number') + f('標準単価（ユーロ）', '標準の販売単価（ユーロ）', 'number') + '</div>' +
    '<div class="two"><label>仕入先<select data-f="仕入先"><option value="">未設定</option>' + sups.map((x) => '<option value="' + esc(x['仕入先ID']) + '"' + (x['仕入先ID'] === p['仕入先'] ? ' selected' : '') + '>' + esc(x['仕入先名']) + '</option>').join('') + '</select></label>' + f('仕入単価', '標準の仕入単価（円、税抜）', 'number') + '</div>' +
    '<label class="check"><input type="checkbox" data-f="販売中"' + (truthy(p['販売中']) ? ' checked' : '') + '>販売中</label>' +
    '<label class="check"><input type="checkbox" data-f="在庫管理"' + (id === 'new' || isStockItem(p) ? ' checked' : '') + '>在庫を管理する（サービスや配送料は外す）</label></section>' +
    '<div class="note">輸出（海外の取引先）の請求書は免税になるため、税率の設定は国内の請求書だけに使います。</div><button class="btn primary" data-act="saveprod" data-id="' + esc(id) + '">保存する</button>' +
    (id !== 'new' ? '<button class="btn danger" data-act="delprod" data-id="' + esc(id) + '">この商品を削除</button>' : '') + '</main>';
}
function viewSuppliers() {
  const val2 = {}; D.stock.forEach((g) => { const k = g.p['仕入先'] || ''; val2[k] = (val2[k] || 0) + g.value; });
  const cnt = {}; D.products.forEach((p) => { const k = p['仕入先'] || ''; cnt[k] = (cnt[k] || 0) + 1; });
  const rows = D.suppliers.slice().sort((a, b) => (a['仕入先名'] || '').localeCompare(b['仕入先名'] || '', 'ja')).map((x) => '<a class="row" href="#/supplier-edit/' + encodeURIComponent(x['仕入先ID']) + '"><span class="c" style="color:var(--ink);font-weight:500">' + esc(x['仕入先名']) +
    '<span class="note" style="display:block;font-weight:400">商品 ' + (cnt[x['仕入先ID']] || 0) + '件' + (x['支払条件'] ? '・' + esc(x['支払条件']) : '') + (x['担当者名'] ? '・' + esc(x['担当者名']) : '') + '</span></span><span class="note" style="flex:none">在庫金額 ' + yen(val2[x['仕入先ID']] || 0) + '</span></a>').join('');
  return top('仕入先マスタ', { back: true }) + '<main class="view" style="gap:12px"><div class="card list">' + (rows || '<div class="empty">仕入先はまだありません</div>') + '</div>' +
    '<button class="btn primary" data-act="open" data-href="#/supplier-edit/new">＋ 仕入先を追加</button></main>';
}
function viewSupplierForm(id) {
  const x = id === 'new' ? {} : (D.supMap[id] || {});
  const f = (k, label, type) => '<label>' + label + '<input data-f="' + k + '" type="' + (type || 'text') + '" value="' + esc(x[k]) + '"></label>';
  const ps = D.products.filter((p) => p['仕入先'] === id);
  return top(id === 'new' ? '仕入先を追加' : '仕入先を編集', { back: true }) + '<main class="view" style="gap:12px"><section class="card pad form" id="supform">' + f('仕入先名', '仕入先名') + f('担当者名', '担当者') +
    '<div class="two">' + f('電話', '電話', 'tel') + f('メール', 'メール', 'email') + '</div>' + f('住所', '住所') + f('支払条件', '支払条件（例：月末締め翌月末払い）') +
    '<label>メモ<textarea data-f="メモ">' + esc(x['メモ']) + '</textarea></label></section><button class="btn primary" data-act="savesup" data-id="' + esc(id) + '">保存する</button>' + (id !== 'new' ? '<button class="btn" data-act="open" data-href="#/new-po?s=' + encodeURIComponent(id) + '">この仕入先に発注する</button>' : '') +
    (id !== 'new' ? '<p class="sec-title">この仕入先の商品（' + ps.length + '件）</p><div class="card list">' + (ps.map((p) => '<a class="row" href="#/product-edit/' + encodeURIComponent(p['商品ID']) + '"><span class="c" style="color:var(--ink)">' + esc(p['商品名']) + '</span><span class="note" style="flex:none">' + (costOf(p) != null ? '仕入 ' + yen(costOf(p)) : '仕入単価未設定') + '</span></a>').join('') || '<div class="empty">まだありません</div>') + '</div>' +
      (ps.length ? '<div class="note">商品がある仕入先は削除できません。</div>' : '<button class="btn danger" data-act="delsup" data-id="' + esc(id) + '">この仕入先を削除</button>') : '') + '</main>';
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
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">発注（仕入）</p><div class="tiles">' +
    '<button class="tile" data-act="open" data-href="#/new-po">発注を登録</button>' +
    '<button class="tile" data-act="gopo" data-chip="ordered">入荷を記録<small>入荷待ち ' + D.purchases.filter((x) => x.status === 'ordered').length + '件</small></button>' +
    '<button class="tile" data-act="gopo" data-chip="unpaid">支払を記録<small>支払待ち ' + D.purchases.filter((x) => x.status === 'unpaid').length + '件</small></button></div></section>' +
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">営業</p><div class="tiles">' +
    '<button class="tile" data-act="open" data-href="#/customer-edit/new?phase=' + encodeURIComponent('パイプライン') + '">リードを追加<small>営業先の候補</small></button>' +
    '<button class="tile" data-act="open" data-href="#/project-edit/new">プロジェクトを追加<small>進行中 ' + D.projects.filter((x) => (x['状態'] || '進行中') === '進行中').length + '件</small></button></div></section>' +
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">在庫</p><div class="tiles">' +
    '<button class="tile" data-act="open" data-href="#/stock-op/in">入庫</button><button class="tile" data-act="open" data-href="#/stock-op/out">出庫</button>' +
    '<button class="tile" data-act="open" data-href="#/stock-op/move">在庫移動</button><button class="tile" data-act="open" data-href="#/stocktake">棚卸</button></div></section>' +
    '<section style="display:flex;flex-direction:column;gap:8px"><p class="note" style="margin:0">マスタ</p><div class="tiles">' +
    '<button class="tile" data-act="open" data-href="#/customer-edit/new">取引先を追加</button><button class="tile" data-act="open" data-href="#/product-edit/new">商品を追加</button><button class="tile" data-act="open" data-href="#/supplier-edit/new">仕入先を追加</button><button class="tile" data-act="open" data-href="#/suppliers">仕入先マスタ</button></div></section>' +
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
    case 'fymonth': ui.fySel = el.dataset.k; render(); break;
    case 'toggleacts': ui.showAllActions = !ui.showAllActions; render(); break;
    case 'goorders': ui.orderChip = el.dataset.chip; ui.orderQ = ''; ui.boTab = 'o'; go('#/orders'); break;
    case 'gopo': ui.poChip = el.dataset.chip; ui.poQ = ''; ui.boTab = 'p'; go('#/orders'); break;
    case 'ochip': ui.orderChip = el.dataset.v; render(); break;
    case 'cchip': ui.custChip = el.dataset.v; render(); break;
    case 'gopj': ev.preventDefault(); ui.salesTab = 'p'; go('#/sales'); break;
    case 'stab': ui.salesTab = el.dataset.v; render(); break;
    case 'sloc': ui.stockLoc = el.dataset.v; render(); break;
    case 'stockwarn': ev.preventDefault(); ui.stockLoc = 'all'; go('#/stock'); break;
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
    case 'invoice': await write('recordInvoice', { id, date: val('f_date') }, '請求を記録し、請求書PDFを作りました', '請求書を作っています…'); break;
    case 'invissue': if (!el.dataset.re || confirm('今の受注の内容で請求書を作り直します。請求番号は同じで、版が1つ上がります')) await write('issueInvoice', { id }, '請求書PDFを作りました', '請求書を作っています…'); break;
    case 'invpdf': await openInvoicePdf(id); break;
    case 'invmail': await draftInvoiceMail(id); break;
    case 'cview': ui.custView = el.dataset.v; render(); break;
    case 'sgroup': ui.stockGroup = el.dataset.v; render(); break;
    case 'botab': ui.boTab = el.dataset.v; ui.edit = false; render(); break;
    case 'pochip': ui.poChip = el.dataset.v; render(); break;
    case 'addpoline': { const w = document.getElementById('po_lines'); w.insertAdjacentHTML('beforeend', poLineHtml('')); updPOForm(); break; }
    case 'rmpoline': { const w = document.getElementById('po_lines'); if (w.children.length > 1) el.closest('.po-line').remove(); updPOForm(); break; }
    case 'createpo': await createPO(); break;
    case 'poreceive': await receivePO(id); break;
    case 'popay': await write('payPurchase', { id, date: val('f_date'), amount: val('f_amount') }, '支払を記録しました'); break;
    case 'poundo': if (confirm(el.dataset.step === 'receive' ? '入荷の記録を取り消しますか。入荷で追加した在庫の記録も消えます' : '支払の記録を取り消しますか')) await write('undoPurchase', { id, step: el.dataset.step }, '取り消しました'); break;
    case 'pocancel': if (confirm(el.dataset.v === '1' ? 'この発注をキャンセルにしますか' : 'キャンセルを取り消しますか')) await write('updatePurchase', { id, fields: { 'キャンセル': el.dataset.v === '1' } }, '更新しました'); break;
    case 'delpo': if (confirm('この発注を削除しますか。明細と、入荷で追加した在庫の記録も消えます。元に戻せません')) { if (await write('deletePurchase', { id }, '発注を削除しました')) { ui.boTab = 'p'; go('#/orders'); } } break;
    case 'savepo': if (await write('updatePurchase', { id, fields: { '入荷予定日': val('e_plan'), '入荷先': val('e_loc'), '支払期日': val('e_due'), 'メモ': val('e_memo') } }, '保存しました')) { ui.edit = false; render(); } break;
    case 'oview': ui.orderView = el.dataset.v; ui.openGroup = ''; render(); break;
    case 'ogroup': ui.openGroup = ui.openGroup === el.dataset.v ? '' : el.dataset.v; document.getElementById('olist').innerHTML = orderListHtml(); break;
    case 'sort': { const st = ui.sort[el.dataset.t]; if (st.k === el.dataset.k) st.dir = -st.dir; else { st.k = el.dataset.k; st.dir = 1; } render(); break; }
    case 'pay': await write('recordPayment', { id, date: val('f_date'), amount: val('f_amount') }, '入金を記録しました'); break;
    case 'undo': if (confirm('直前の工程の記録を取り消しますか')) await write('undoStep', { id, step: el.dataset.step }, '取り消しました'); break;
    case 'cancel': if (confirm(el.dataset.v === '1' ? 'この受注をキャンセルにしますか' : 'キャンセルを取り消しますか')) await write('updateOrder', { id, fields: { 'キャンセル': el.dataset.v === '1' } }, '更新しました'); break;
    case 'saveorder': if (await write('updateOrder', { id, fields: { '出荷予定日': val('e_plan'), '出荷元': val('e_from'), '追跡番号': val('e_track'), '支払期日': val('e_due'), 'メモ': val('e_memo') } }, '保存しました')) { ui.edit = false; render(); } break;
    case 'addline': { const w = document.getElementById('of_lines'); w.insertAdjacentHTML('beforeend', lineHtml(w.children.length)); updOrderForm(); break; }
    case 'rmline': { const w = document.getElementById('of_lines'); if (w.children.length > 1) el.closest('.line-item').remove(); updOrderForm(); break; }
    case 'createorder': await createOrder(); break;
    case 'savecust': { const v = formVals('#cform'); if (!v['取引先名']) { alert('取引先名を入力してください'); break; } if (id !== 'new') v['取引先ID'] = id; const before = new Set(D.customers.map((c) => c['取引先ID'])); if (await write('saveCustomer', v, '保存しました')) { const n = id !== 'new' ? D.cMap[id] : D.customers.find((c) => !before.has(c['取引先ID'])); go(n ? '#/customer/' + encodeURIComponent(n['取引先ID']) : '#/sales'); } break; }
    case 'savesup': { const v = formVals('#supform'); if (!v['仕入先名']) { alert('仕入先名を入力してください'); break; } if (id !== 'new') v['仕入先ID'] = id; if (await write('saveSupplier', v, '保存しました')) go('#/suppliers'); break; }
    case 'delsup': if (confirm('この仕入先を削除しますか。元に戻せません')) { if (await write('deleteSupplier', { id }, '削除しました')) go('#/suppliers'); } break;
    case 'saveprod': { const v = formVals('#pform'); if (!v['商品名']) { alert('商品名を入力してください'); break; } if (id !== 'new') v['商品ID'] = id; if (await write('saveProduct', v, '保存しました')) go('#/products'); break; }
    case 'savetask': { const v = formVals('#tform'); if (!v['作業'] || !v['期日']) { alert('作業と期日を入力してください'); break; } if (await write('saveTask', v, 'タスクを登録しました')) go('#/'); break; }
    case 'donetask': if (await write('completeTask', { id }, '完了にしました')) go('#/'); break;
  }
});
function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
document.addEventListener('mouseover', (ev) => {
  const c = ev.target.closest && ev.target.closest('.fycol'); const r = document.getElementById('fyread');
  if (!c || !r || !ui._fyVals) return;
  r.textContent = fyReadout(ui._fyVals.find((v) => v.k === c.dataset.k));
});
document.addEventListener('mouseout', (ev) => {
  const c = ev.target.closest && ev.target.closest('.fychart'); const r = document.getElementById('fyread');
  if (!c || !r || !ui._fyVals || (ev.relatedTarget && c.contains(ev.relatedTarget))) return;
  const sel = document.querySelector('.fycol.sel'); r.textContent = fyReadout(ui._fyVals.find((v) => sel && v.k === sel.dataset.k));
});
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset && t.dataset.input) {
    ui[t.dataset.input] = t.value;
    if (t.dataset.input === 'orderQ') document.getElementById('olist').innerHTML = orderListHtml();
    if (t.dataset.input === 'custQ') document.getElementById('clist').innerHTML = custListHtml();
    if (t.dataset.input === 'poQ') document.getElementById('plist').innerHTML = poListHtml();
    if (t.dataset.input === 'stockQ') document.getElementById('slist').innerHTML = stockListHtml();
    return;
  }
  if (t.id === 'of_cq') {
    filterCustSelect(t.value);
    return;
  }
  if (t.closest && t.closest('#oform')) updOrderForm();
  if (t.closest && t.closest('#poform')) updPOForm();
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'so_cost') { t.dataset.auto = '0'; return; }
  if (t.id === 'so_p' || t.id === 'so_loc') { updStockOp(); return; }
  if (t.classList && t.classList.contains('pl_p')) { const p = D.pMap[t.value]; const u = t.closest('.po-line').querySelector('.pl_u'); if (p && costOf(p) != null) u.value = costOf(p); updPOForm(); return; }
  if (t.id === 'po_s' || t.id === 'po_plan') { updPOForm(); return; }
  if (t.id === 'cust_bill') { ui.custBill = t.value; document.getElementById('clist').innerHTML = custListHtml(); return; }
  if (t.id === 'tk_loc') { go('#/stocktake?l=' + encodeURIComponent(t.value)); return; }
  if (t.id === 'of_c') onCustChange();
  else if (t.classList && t.classList.contains('l_p')) { setLinePrice(t.closest('.line-item')); updOrderForm(); }
  else if (t.id === 'of_plan') updOrderForm();
  else if (t.id === 'nc_country') { document.getElementById('nc_cur').value = t.value === 'JP' ? 'JPY' : 'EUR'; onCustChange(); }
  else if (t.id === 'nc_cur') { document.querySelectorAll('#of_lines .line-item').forEach((el) => setLinePrice(el)); updOrderForm(); }
  else if (t.id === 'cf_pay' || t.id === 'nc_pay') { const d = document.getElementById(t.id === 'cf_pay' ? 'cf_days' : 'nc_site'); if (d) d.disabled = t.value !== '日数指定'; if (t.id === 'nc_pay') updOrderForm(); }
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
