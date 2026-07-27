
/* =========================================================
   core.js — 모든 페이지가 함께 쓰는 공통 코드
   유틸 · 날짜/주차 · 비밀번호 해시 · 저장소 · 세션 · 조회 헬퍼
   ========================================================= */
'use strict';

/* ---------- 기본 유틸 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2 = s => esc(s).replace(/\n/g, '<br>');

function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- 날짜 / 주차 ---------- */
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseD = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
function fmtD(s, withDay) {
  if (!s) return '-';
  const d = parseD(s);
  return `${d.getMonth() + 1}/${d.getDate()}` + (withDay ? `(${DAYS[d.getDay()]})` : '');
}
const fmtFull = s => s ? s.replace(/-/g, '.') : '-';
function fmtTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
/** 해당 날짜가 속한 주(월~일)의 수요일 */
function wedOf(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const off = (d.getDay() + 6) % 7;            // 월=0
  d.setDate(d.getDate() - off + 2);            // 수요일
  return d;
}
function isoWeekNo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dn = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dn);
  const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - ys) / 864e5 + 1) / 7) };
}
function weekInfo(date) {
  const wed = wedOf(date);
  const { year, week } = isoWeekNo(wed);
  const mon = new Date(wed); mon.setDate(wed.getDate() - 2);
  const sun = new Date(wed); sun.setDate(wed.getDate() + 4);
  return { key: `${year}-W${String(week).padStart(2, '0')}`, year, week, wed: iso(wed), start: iso(mon), end: iso(sun) };
}
const curWeek = () => weekInfo(new Date());
/** 최근/향후 주차 목록 (기준일 포함, 과거 back주 ~ 미래 fwd주) */
function weekOptions(back = 16, fwd = 2) {
  const out = []; const base = wedOf(new Date());
  for (let i = fwd; i >= -back; i--) {
    const d = new Date(base); d.setDate(base.getDate() + i * 7);
    out.push(weekInfo(d));
  }
  return out;
}
const weekLabel = w => `${w.year}년 ${w.week}주차 · ${fmtD(w.start)}~${fmtD(w.end)}`;
const weekShort = w => `${String(w.year).slice(2)}년 ${w.week}주차`;
function dday(dueStr) {
  if (!dueStr) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((parseD(dueStr) - t) / 864e5);
}

/* ---------- 비밀번호 해시 (SHA-256 + 개인 솔트) ---------- */
const salt = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');
async function hashPw(pw, s) {
  const data = new TextEncoder().encode(s + '::' + pw);
  if (crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // http/file 환경 폴백 (GitHub Pages는 https이므로 위 경로 사용)
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (const b of data) { h1 = (h1 ^ b) * 16777619 >>> 0; h2 = (h2 + b * 31 ^ h1) >>> 0; }
  return 'fb' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/* =========================================================
   Store — 저장소 어댑터
   Supabase/Firebase 등으로 옮길 때 이 객체만 교체하면 됩니다.
   ========================================================= */
const KEY = 'weekly_report_db_v1';
const Store = {
  db: null,
  blank() { return { users: [], projects: [], reports: [], meta: { created: Date.now() } }; },
  load() {
    try { this.db = JSON.parse(localStorage.getItem(KEY)) || this.blank(); }
    catch { this.db = this.blank(); }
    for (const k of ['users', 'projects', 'reports']) if (!Array.isArray(this.db[k])) this.db[k] = [];
    if (!this.db.meta) this.db.meta = {};
    return this.db;
  },
  save() { localStorage.setItem(KEY, JSON.stringify(this.db)); },
  reset() { localStorage.removeItem(KEY); }
};
const DB = () => Store.db;

/* ---------- 세션 ---------- */
const SKEY = 'weekly_report_session';
let ME = null;
const setSession = id => sessionStorage.setItem(SKEY, id);
const clearSession = () => sessionStorage.removeItem(SKEY);
const isAdmin = () => ME && ME.role === 'admin';

/* ---------- 조회 헬퍼 ---------- */
const userById = id => DB().users.find(u => u.id === id);
const projById = id => DB().projects.find(p => p.id === id);
const userName = id => (userById(id) || {}).name || '(삭제된 사용자)';
const projName = id => (projById(id) || {}).name || '(삭제된 프로젝트)';
const activeProjects = () => DB().projects.filter(p => p.status !== '완료' && p.status !== '보류');
const reportsOfWeek = wk => DB().reports.filter(r => r.week === wk);
const myReports = () => DB().reports.filter(r => r.userId === ME.id);

const PSTATUS = ['진행중', '준비', '보류', '완료'];
const statusTag = s => {
  const m = { '진행중': 'tag-ink', '준비': 'tag-grey', '보류': 'tag-amber', '완료': 'tag-moss' };
  return `<span class="tag ${m[s] || 'tag-grey'}">${esc(s)}</span>`;
};
function ddayTag(due, status) {
  if (status === '완료') return '<span class="tag tag-moss">완료</span>';
  const d = dday(due);
  if (d === null) return '';
  if (d < 0) return `<span class="tag tag-rose">지연 ${-d}일</span>`;
  if (d <= 7) return `<span class="tag tag-amber">D-${d}</span>`;
  return `<span class="tag tag-grey">D-${d}</span>`;
}

function drawSpine() {
  const rail = $('#spineRail'); if (!rail) return;
  const base = wedOf(new Date()); let html = '';
  for (let i = -2; i <= 2; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i * 7);
    const w = weekInfo(d);
    const left = ((i + 2) / 4) * 100;
    html += `<div class="spine-node ${i === 0 ? 'on' : ''}" style="left:${left}%">
      <div class="spine-dot"></div><small>${w.week}주<br>${fmtD(w.wed)}</small></div>`;
  }
  rail.innerHTML = html;
}
function refreshTeamList() {
  if (!$('#teamList')) return;
  const teams = [...new Set(DB().users.map(u => u.team).filter(Boolean))];
  $('#teamList').innerHTML = teams.map(t => `<option value="${esc(t)}">`).join('');
}

/* ---------- 페이지 이동 ---------- */
const PAGE_LOGIN = 'index.html', PAGE_SIGNUP = 'signup.html', PAGE_SETUP = 'setup.html', PAGE_APP = 'app.html';
function currentUser() {
  const id = sessionStorage.getItem(SKEY);
  return id ? userById(id) : null;
}
function logout() { clearSession(); location.replace(PAGE_LOGIN); }

/* ---------- 폼 안내 문구 ---------- */
function showAlert(sel, msg, ok) {
  const a = $(sel); if (!a) return;
  a.textContent = msg || '';
  a.className = msg ? 'alert show ' + (ok ? 'ok' : 'err') : 'alert';
}

/* ---------- 입력 보조 ---------- */
/** Enter 로 다음 칸 이동, 마지막 칸에서는 제출 */
function chainEnter(selectors, submitSel) {
  selectors.forEach((s, i) => {
    const el = $(s); if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = selectors[i + 1] && $(selectors[i + 1]);
      if (next) next.focus(); else $(submitSel).click();
    });
  });
}
