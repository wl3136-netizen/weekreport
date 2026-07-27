/* =========================================================
   app.js — 로그인 후 앱 화면 (app.html 전용)
   ========================================================= */
'use strict';

/* =========================================================
   네비게이션 / 라우터
   ========================================================= */
const NAV_USER = [
  { g: '내 업무' },
  { id: 'my-home', ic: '◎', t: '대시보드' },
  { id: 'my-input', ic: '✎', t: '주간업무 입력', badge: true },
  { id: 'my-works', ic: '☰', t: '내 진행사항 관리' },
  { g: '기준 정보' },
  { id: 'ref-proj', ic: '▤', t: '프로젝트 목록' },
  { g: '계정' },
  { id: 'my-acc', ic: '⚙', t: '내 정보' }
];
const NAV_ADMIN = [
  { g: '모니터링' },
  { id: 'adm-week', ic: '◎', t: '금주 모니터링', badge: true },
  { id: 'adm-proj', ic: '▤', t: '프로젝트별 모니터링' },
  { id: 'adm-person', ic: '☺', t: '사람별 모니터링' },
  { id: 'adm-team', ic: '▦', t: '팀별 모니터링' },
  { id: 'adm-report', ic: '⎙', t: '보고서 취합' },
  { g: '기준 정보' },
  { id: 'ref-proj', ic: '✚', t: '프로젝트 관리' },
  { id: 'adm-users', ic: '☰', t: '사용자 · 권한' },
  { id: 'adm-data', ic: '⛁', t: '데이터 백업' },
  { g: '내 업무' },
  { id: 'my-input', ic: '✎', t: '주간업무 입력' },
  { id: 'my-works', ic: '⌸', t: '내 진행사항 관리' },
  { id: 'my-acc', ic: '⚙', t: '내 정보' }
];

let PAGE = '';
function buildNav() {
  const list = isAdmin() ? NAV_ADMIN : NAV_USER;
  $('#navBox').innerHTML = list.map(n => n.g
    ? `<div class="nav-group">${esc(n.g)}</div>`
    : `<button class="nav-item" data-go="${n.id}"><span class="ic">${n.ic}</span> ${esc(n.t)}${n.badge ? '<span class="nav-badge" data-slot="' + n.id + '"></span>' : ''}</button>`
  ).join('');
  $$('#navBox [data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
}
function markNav() {
  $$('#navBox .nav-item').forEach(b => b.classList.toggle('on', b.dataset.go === PAGE));
}
function navBadges() {
  const wk = curWeek().key;
  const mine = DB().reports.filter(r => r.userId === ME.id && r.week === wk).length;
  const slotIn = $('[data-slot="my-input"]');
  if (slotIn) { slotIn.textContent = mine || ''; slotIn.style.display = mine ? '' : 'none'; }
  const slotAd = $('[data-slot="adm-week"]');
  if (slotAd) {
    const n = new Set(reportsOfWeek(wk).map(r => r.userId)).size;
    slotAd.textContent = n || ''; slotAd.style.display = n ? '' : 'none';
  }
}

const PAGES = {};
function go(id) {
  PAGE = id; markNav();
  $('#pgActions').innerHTML = '';
  const fn = PAGES[id];
  if (!fn) { $('#pgBody').innerHTML = '<div class="empty">페이지를 찾을 수 없습니다.</div>'; return; }
  fn();
  navBadges();
  window.scrollTo(0, 0);
}
function head(title, desc) { $('#pgTitle').textContent = title; $('#pgDesc').textContent = desc || ''; }
function actions(html) { $('#pgActions').innerHTML = html; }
const emptyBox = (big, sub) => `<div class="empty"><div class="big">${esc(big)}</div><div class="small">${esc(sub || '')}</div></div>`;

/* ---------- 모달 ---------- */
function openModal(title, body, foot) {
  $('#mTitle').textContent = title; $('#mBody').innerHTML = body;
  $('#mFoot').innerHTML = foot || '<button class="btn btn-ghost" onclick="closeModal()">닫기</button>';
  $('#mask').classList.add('on');
  setTimeout(() => { const f = $('#mBody input,#mBody select,#mBody textarea'); f && f.focus(); }, 40);
}
function closeModal() { $('#mask').classList.remove('on'); }
$('#mask').addEventListener('click', e => { if (e.target.id === 'mask') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* =========================================================
   [입력자] 대시보드
   ========================================================= */
PAGES['my-home'] = () => {
  const wk = curWeek();
  head('대시보드', `${weekLabel(wk)} · 기준일 ${fmtD(wk.wed, true)}`);
  actions(`<button class="btn btn-primary" onclick="go('my-input')">이번 주 업무 입력</button>`);

  const mine = myReports();
  const thisWk = mine.filter(r => r.week === wk.key);
  const myProjIds = [...new Set(mine.map(r => r.projectId))];
  const late = DB().projects.filter(p => myProjIds.includes(p.id) && p.status !== '완료' && dday(p.dueDate) < 0);
  const soon = DB().projects.filter(p => myProjIds.includes(p.id) && p.status !== '완료' && dday(p.dueDate) >= 0 && dday(p.dueDate) <= 14);

  let h = `<div class="stats">
    <div class="stat"><div class="k">이번 주 작성</div><div class="v">${thisWk.length}<small> 건</small></div>
      <div class="d">${thisWk.length ? '작성 완료' : '아직 작성 전입니다'}</div></div>
    <div class="stat"><div class="k">담당 프로젝트</div><div class="v">${myProjIds.length}<small> 개</small></div><div class="d">내가 기록한 기준</div></div>
    <div class="stat"><div class="k">누적 작성</div><div class="v">${mine.length}<small> 건</small></div><div class="d">전체 주차 합계</div></div>
    <div class="stat"><div class="k">기한 임박·지연</div><div class="v">${late.length + soon.length}<small> 개</small></div>
      <div class="d">${late.length ? `지연 ${late.length}건 포함` : '2주 이내 마감'}</div></div>
  </div>`;

  h += `<div class="card"><div class="card-h"><h3>이번 주 내 작성 내역</h3>
    <span class="small mute">${weekLabel(wk)}</span></div><div class="card-b">`;
  h += thisWk.length ? renderMyRows(thisWk) : emptyBox('이번 주 작성 내역이 없습니다', '‘주간업무 입력’에서 프로젝트를 불러와 작성하세요.');
  h += `</div></div>`;

  const attn = [...late, ...soon].sort((a, b) => dday(a.dueDate) - dday(b.dueDate));
  h += `<div class="card"><div class="card-h"><h3>마감 임박 프로젝트</h3></div><div class="card-b" style="padding:0">`;
  h += attn.length ? `<div class="t-wrap" style="border:none;border-radius:0"><table>
    <thead><tr><th>프로젝트</th><th>상태</th><th>완료 예정일</th><th>잔여</th></tr></thead><tbody>` +
    attn.map(p => `<tr><td><b>${esc(p.name)}</b> <span class="chip">${esc(p.code)}</span></td>
      <td>${statusTag(p.status)}</td><td class="num">${fmtFull(p.dueDate)}</td><td>${ddayTag(p.dueDate, p.status)}</td></tr>`).join('') +
    `</tbody></table></div>` : emptyBox('임박한 마감이 없습니다', '');
  h += `</div></div>`;
  $('#pgBody').innerHTML = h;
};

function renderMyRows(rows) {
  return `<div class="nlist">` + rows.map(r => {
    const p = projById(r.projectId) || {};
    return `<div class="nrow"><div class="nhead" onclick="this.parentNode.classList.toggle('open')">
      <span class="ncaret">▶</span>
      <span class="ntitle">${esc(p.name || '(삭제됨)')}</span>
      <span class="chip">${esc(p.code || '-')}</span>
      <span class="nsub">${r.progress != null ? `<span class="num">${r.progress}%</span>` : ''}
        <span>${fmtTime(r.updatedAt)}</span></span></div>
      <div class="nbody">
        <div class="row2">
          <div><div class="k small mute" style="font-weight:700;margin-bottom:4px">금주 진행사항</div>
            <div class="pre">${nl2(r.thisWeek) || '<span class="mute">-</span>'}</div></div>
          <div><div class="k small mute" style="font-weight:700;margin-bottom:4px">차주 진행계획</div>
            <div class="pre">${nl2(r.nextWeek) || '<span class="mute">-</span>'}</div></div>
        </div>
        ${r.issue ? `<div class="divider"></div><div class="k small mute" style="font-weight:700;margin-bottom:4px">이슈 / 요청사항</div><div class="pre">${nl2(r.issue)}</div>` : ''}
        <div class="divider"></div>
        <div class="btn-row"><button class="btn btn-ghost btn-sm" onclick="editReport('${r.id}')">수정</button>
        <button class="btn btn-danger btn-sm" onclick="delReport('${r.id}')">삭제</button></div>
      </div></div>`;
  }).join('') + `</div>`;
}

/* =========================================================
   [입력자] 주간업무 입력
   ========================================================= */
let INPUT_WEEK = null;
PAGES['my-input'] = () => {
  const wks = weekOptions(12, 1);
  if (!INPUT_WEEK || !wks.some(w => w.key === INPUT_WEEK)) INPUT_WEEK = curWeek().key;
  const w = wks.find(x => x.key === INPUT_WEEK);
  head('주간업무 입력', '프로젝트별로 금주 진행사항과 차주 계획을 작성합니다. 같은 프로젝트에 여러 명이 각자 입력할 수 있습니다.');
  actions(`<button class="btn btn-primary" onclick="saveAllInputs()">전체 저장</button>`);

  let h = `<div class="toolbar">
    <label class="small mute" style="font-weight:600">작성 주차</label>
    <select id="selWeek">${wks.map(x => `<option value="${x.key}" ${x.key === INPUT_WEEK ? 'selected' : ''}>${weekLabel(x)}${x.key === curWeek().key ? ' — 이번 주' : ''}</option>`).join('')}</select>
    <span class="tag tag-ink">기준 수요일 ${fmtD(w.wed, true)}</span>
    <span class="sp"></span>
    <label class="small flexc"><input type="checkbox" id="onlyMine" style="width:auto"> 내가 작성한 항목만 보기</label>
  </div>`;

  const projs = DB().projects.slice().sort((a, b) => (a.status === '완료') - (b.status === '완료') || a.dueDate.localeCompare(b.dueDate));
  if (!projs.length) {
    h += emptyBox('등록된 프로젝트가 없습니다', isAdmin() ? '기준 정보 > 프로젝트 관리에서 먼저 프로젝트를 추가하세요.' : '관리자에게 프로젝트 등록을 요청하세요.');
    $('#pgBody').innerHTML = h; bindWeekSel(); return;
  }

  h += `<div class="nlist" id="inputList">`;
  for (const p of projs) {
    const mineR = DB().reports.find(r => r.week === INPUT_WEEK && r.projectId === p.id && r.userId === ME.id);
    const others = DB().reports.filter(r => r.week === INPUT_WEEK && r.projectId === p.id && r.userId !== ME.id);
    const filled = !!mineR;
    h += `<div class="nrow ${filled ? 'open' : ''}" data-proj="${p.id}" data-filled="${filled}">
      <div class="nhead" onclick="this.parentNode.classList.toggle('open')">
        <span class="ncaret">▶</span>
        <span class="ntitle">${esc(p.name)}</span>
        <span class="chip">${esc(p.code)}</span>
        ${statusTag(p.status)} ${ddayTag(p.dueDate, p.status)}
        <span class="nsub">
          ${filled ? '<span class="tag tag-moss">작성함</span>' : '<span class="tag tag-grey">미작성</span>'}
          ${others.length ? `<span>동료 ${others.length}명</span>` : ''}
        </span></div>
      <div class="nbody">
        <div class="row2">
          <div class="field"><label>금주 진행사항 <span style="color:var(--rose)">*</span></label>
            <textarea data-f="thisWeek" placeholder="이번 주에 실제로 진행한 내용을 적어주세요.">${esc(mineR ? mineR.thisWeek : '')}</textarea></div>
          <div class="field"><label>차주 진행계획 <span style="color:var(--rose)">*</span></label>
            <textarea data-f="nextWeek" placeholder="다음 주에 진행할 계획을 적어주세요.">${esc(mineR ? mineR.nextWeek : '')}</textarea></div>
        </div>
        <div class="row2">
          <div class="field"><label>진척률 (%)</label>
            <input type="number" min="0" max="100" step="5" data-f="progress" value="${mineR && mineR.progress != null ? mineR.progress : ''}" placeholder="0~100"></div>
          <div class="field"><label>이슈 / 협조 요청</label>
            <input data-f="issue" value="${esc(mineR ? (mineR.issue || '') : '')}" placeholder="없으면 비워두세요"></div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary btn-sm" onclick="saveOne('${p.id}',this)">저장</button>
          ${mineR ? `<button class="btn btn-ghost btn-sm" onclick="copyPrevInto('${p.id}',this)">지난주 차주계획 불러오기</button>
                     <button class="btn btn-danger btn-sm" onclick="delReport('${mineR.id}')">삭제</button>`
      : `<button class="btn btn-ghost btn-sm" onclick="copyPrevInto('${p.id}',this)">지난주 차주계획 불러오기</button>`}
          <span class="small mute flexc">${mineR ? '최종 수정 ' + fmtTime(mineR.updatedAt) : '아직 저장되지 않음'}</span>
        </div>
        ${others.length ? `<div class="divider"></div>
          <div class="k small mute" style="font-weight:700;margin-bottom:7px">같은 프로젝트 동료 작성 내용</div>
          ${others.map(o => `<div style="border-left:2px solid var(--line-strong);padding-left:11px;margin-bottom:10px">
            <div class="small"><b>${esc(userName(o.userId))}</b> <span class="mute">${esc((userById(o.userId) || {}).team || '')} · ${fmtTime(o.updatedAt)}</span></div>
            <div class="small" style="margin-top:3px"><span class="mute">금주 ·</span> ${nl2(o.thisWeek)}</div>
            <div class="small"><span class="mute">차주 ·</span> ${nl2(o.nextWeek)}</div></div>`).join('')}` : ''}
      </div></div>`;
  }
  h += `</div>`;
  $('#pgBody').innerHTML = h;
  bindWeekSel();
  $('#onlyMine').onchange = e => {
    $$('#inputList .nrow').forEach(r => r.style.display = (e.target.checked && r.dataset.filled !== 'true') ? 'none' : '');
  };
};
function bindWeekSel() {
  const s = $('#selWeek'); if (s) s.onchange = () => { INPUT_WEEK = s.value; go('my-input'); };
}
function readRow(row) {
  const g = f => { const el = row.querySelector(`[data-f="${f}"]`); return el ? el.value.trim() : ''; };
  const pr = g('progress');
  return { thisWeek: g('thisWeek'), nextWeek: g('nextWeek'), issue: g('issue'), progress: pr === '' ? null : Math.max(0, Math.min(100, +pr)) };
}
function upsert(projectId, v) {
  let r = DB().reports.find(x => x.week === INPUT_WEEK && x.projectId === projectId && x.userId === ME.id);
  if (!r) {
    r = { id: uid(), week: INPUT_WEEK, projectId, userId: ME.id, createdAt: Date.now() };
    DB().reports.push(r);
  }
  Object.assign(r, v, { updatedAt: Date.now() });
  return r;
}
function saveOne(projectId, btn) {
  const row = btn.closest('.nrow'); const v = readRow(row);
  if (!v.thisWeek || !v.nextWeek) return toast('금주 진행사항과 차주 진행계획을 모두 입력하세요.');
  upsert(projectId, v); Store.save(); toast('저장되었습니다.'); go('my-input');
}
function saveAllInputs() {
  let n = 0, skip = 0;
  $$('#inputList .nrow').forEach(row => {
    const v = readRow(row);
    if (!v.thisWeek && !v.nextWeek) return;
    if (!v.thisWeek || !v.nextWeek) { skip++; return; }
    upsert(row.dataset.proj, v); n++;
  });
  Store.save();
  toast(n ? `${n}건 저장${skip ? ` · ${skip}건은 항목 누락으로 제외` : ''}` : '저장할 내용이 없습니다.');
  go('my-input');
}
function copyPrevInto(projectId, btn) {
  const wks = weekOptions(12, 1); const i = wks.findIndex(w => w.key === INPUT_WEEK);
  const prev = wks[i + 1];
  if (!prev) return toast('이전 주차 정보가 없습니다.');
  const r = DB().reports.find(x => x.week === prev.key && x.projectId === projectId && x.userId === ME.id);
  if (!r || !r.nextWeek) return toast('지난주에 작성한 차주 계획이 없습니다.');
  btn.closest('.nrow').querySelector('[data-f="thisWeek"]').value = r.nextWeek;
  toast('지난주 차주 계획을 금주 진행사항에 넣었습니다. 내용을 다듬어 저장하세요.');
}
function delReport(id) {
  const r = DB().reports.find(x => x.id === id); if (!r) return;
  if (!isAdmin() && r.userId !== ME.id) return toast('본인이 작성한 항목만 삭제할 수 있습니다.');
  if (!confirm('이 진행사항을 삭제할까요? 되돌릴 수 없습니다.')) return;
  DB().reports = DB().reports.filter(x => x.id !== id); Store.save();
  toast('삭제되었습니다.'); go(PAGE);
}
function editReport(id) {
  const r = DB().reports.find(x => x.id === id); if (!r) return;
  if (!isAdmin() && r.userId !== ME.id) return toast('본인이 작성한 항목만 수정할 수 있습니다.');
  const p = projById(r.projectId) || {};
  openModal(`진행사항 수정 — ${p.name || ''}`, `
    <div class="small mute" style="margin-bottom:12px">${esc(r.week)} · ${esc(weekLabel(weekByKey(r.week)))} · 작성자 ${esc(userName(r.userId))}</div>
    <div class="field"><label>금주 진행사항</label><textarea id="e_tw">${esc(r.thisWeek)}</textarea></div>
    <div class="field"><label>차주 진행계획</label><textarea id="e_nw">${esc(r.nextWeek)}</textarea></div>
    <div class="row2">
      <div class="field"><label>진척률 (%)</label><input type="number" min="0" max="100" id="e_pg" value="${r.progress ?? ''}"></div>
      <div class="field"><label>이슈 / 협조 요청</label><input id="e_is" value="${esc(r.issue || '')}"></div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">취소</button>
     <button class="btn btn-primary" onclick="saveEdit('${r.id}')">변경사항 저장</button>`);
}
function saveEdit(id) {
  const r = DB().reports.find(x => x.id === id); if (!r) return;
  const tw = $('#e_tw').value.trim(), nw = $('#e_nw').value.trim();
  if (!tw || !nw) return toast('금주·차주 내용을 모두 입력하세요.');
  const pg = $('#e_pg').value.trim();
  Object.assign(r, { thisWeek: tw, nextWeek: nw, issue: $('#e_is').value.trim(), progress: pg === '' ? null : +pg, updatedAt: Date.now() });
  Store.save(); closeModal(); toast('수정되었습니다.'); go(PAGE);
}

/* =========================================================
   [입력자] 내 진행사항 관리 — 노션풍 (테이블 / 프로젝트 보드)
   ========================================================= */
let MW = { view: 'table', proj: 'all', week: 'all', q: '' };
PAGES['my-works'] = () => {
  head('내 진행사항 관리', '내가 작성한 모든 주간업무를 한곳에서 확인하고 수정합니다.');
  actions(`<button class="btn btn-ghost" onclick="exportMyCsv()">CSV 내보내기</button>
           <button class="btn btn-primary" onclick="go('my-input')">새로 입력</button>`);

  let rows = myReports().slice().sort((a, b) => b.week.localeCompare(a.week) || b.updatedAt - a.updatedAt);
  const allWeeks = [...new Set(myReports().map(r => r.week))].sort().reverse();
  const allProjs = [...new Set(myReports().map(r => r.projectId))];

  if (MW.proj !== 'all') rows = rows.filter(r => r.projectId === MW.proj);
  if (MW.week !== 'all') rows = rows.filter(r => r.week === MW.week);
  if (MW.q) { const q = MW.q.toLowerCase(); rows = rows.filter(r => (r.thisWeek + r.nextWeek + (r.issue || '') + projName(r.projectId)).toLowerCase().includes(q)); }

  let h = `<div class="toolbar">
    <div class="seg">
      <button class="${MW.view === 'table' ? 'on' : ''}" onclick="MW.view='table';go('my-works')">테이블</button>
      <button class="${MW.view === 'board' ? 'on' : ''}" onclick="MW.view='board';go('my-works')">프로젝트 보드</button>
      <button class="${MW.view === 'time' ? 'on' : ''}" onclick="MW.view='time';go('my-works')">주차 타임라인</button>
    </div>
    <select onchange="MW.proj=this.value;go('my-works')">
      <option value="all">전체 프로젝트</option>
      ${allProjs.map(id => `<option value="${id}" ${MW.proj === id ? 'selected' : ''}>${esc(projName(id))}</option>`).join('')}
    </select>
    <select onchange="MW.week=this.value;go('my-works')">
      <option value="all">전체 주차</option>
      ${allWeeks.map(w => `<option value="${w}" ${MW.week === w ? 'selected' : ''}>${w}</option>`).join('')}
    </select>
    <input id="mwq" placeholder="내용 검색" value="${esc(MW.q)}" style="min-width:180px">
    <span class="sp"></span><span class="small mute">${rows.length}건</span>
  </div>`;

  if (!rows.length) h += emptyBox('표시할 진행사항이 없습니다', '필터를 바꾸거나 새 업무를 입력하세요.');
  else if (MW.view === 'table') {
    h += `<div class="t-wrap"><table><thead><tr>
      <th style="width:96px">주차</th><th style="width:190px">프로젝트</th>
      <th>금주 진행사항</th><th>차주 진행계획</th>
      <th style="width:92px">진척</th><th style="width:74px"></th></tr></thead><tbody>`;
    h += rows.map(r => {
      const p = projById(r.projectId) || {};
      return `<tr><td class="num nowrap">${esc(r.week)}</td>
        <td><b>${esc(p.name || '(삭제됨)')}</b><div class="small mute">${esc(p.code || '')}</div></td>
        <td class="pre">${nl2(r.thisWeek)}${r.issue ? `<div class="small" style="margin-top:5px"><span class="tag tag-amber">이슈</span> ${nl2(r.issue)}</div>` : ''}</td>
        <td class="pre">${nl2(r.nextWeek)}</td>
        <td>${r.progress != null ? `<div class="num">${r.progress}%</div><div class="bar ${r.progress >= 100 ? 'done' : ''}"><i style="width:${r.progress}%"></i></div>` : '<span class="mute">-</span>'}</td>
        <td class="nowrap"><button class="btn btn-ghost btn-sm" onclick="editReport('${r.id}')">수정</button></td></tr>`;
    }).join('') + `</tbody></table></div>`;
  } else if (MW.view === 'board') {
    const byP = {}; rows.forEach(r => (byP[r.projectId] ||= []).push(r));
    h += Object.entries(byP).map(([pid, list]) => {
      const p = projById(pid) || {};
      const latest = list[0];
      return `<div class="card"><div class="card-h">
        <h3>${esc(p.name || '(삭제됨)')} <span class="chip">${esc(p.code || '-')}</span></h3>
        <span class="flexc small">${statusTag(p.status || '-')} ${ddayTag(p.dueDate, p.status)} <span class="mute">완료예정 ${fmtFull(p.dueDate)}</span></span>
      </div><div class="card-b" style="padding:0">${renderMyRows(list)}
      </div></div>`;
    }).join('');
  } else {
    const byW = {}; rows.forEach(r => (byW[r.week] ||= []).push(r));
    h += Object.entries(byW).map(([wk, list]) => `<div class="card"><div class="card-h">
      <h3>${esc(wk)}</h3><span class="small mute">${list.length}개 프로젝트</span></div>
      <div class="card-b" style="padding:0">${renderMyRows(list)}</div></div>`).join('');
  }
  $('#pgBody').innerHTML = h;
  const q = $('#mwq');
  if (q) { q.oninput = e => { clearTimeout(q._t); q._t = setTimeout(() => { MW.q = e.target.value; go('my-works'); }, 320); }; }
};
function exportMyCsv() { downloadCsv(myReports(), `내주간업무_${ME.name}.csv`); }

function downloadCsv(rows, filename) {
  if (!rows.length) return toast('내보낼 데이터가 없습니다.');
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['주차', '기준수요일', '프로젝트코드', '프로젝트명', '완료예정일', '팀', '작성자', '금주진행사항', '차주진행계획', '진척률', '이슈', '최종수정'];
  const body = rows.map(r => {
    const p = projById(r.projectId) || {}, u = userById(r.userId) || {};
    const w = weekOptions(120, 8).find(x => x.key === r.week);
    return [r.week, w ? w.wed : '', p.code || '', p.name || '', p.dueDate || '', u.team || '', u.name || '',
    r.thisWeek, r.nextWeek, r.progress ?? '', r.issue || '', fmtTime(r.updatedAt)].map(q).join(',');
  });
  const blob = new Blob(['\uFEFF' + head.map(q).join(',') + '\n' + body.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href); toast('CSV 파일을 내려받았습니다.');
}

/* =========================================================
   [기준 정보] 프로젝트 관리
   ========================================================= */
let PF = { status: 'all', q: '' };
PAGES['ref-proj'] = () => {
  const admin = isAdmin();
  head(admin ? '프로젝트 관리' : '프로젝트 목록',
    admin ? '기준 정보입니다. 프로젝트를 추가·수정하면 모든 입력자의 주간업무 입력 화면에 반영됩니다.' : '관리자가 등록한 프로젝트 목록입니다.');
  if (admin) actions(`<button class="btn btn-ghost" onclick="exportProjCsv()">CSV 내보내기</button>
                      <button class="btn btn-primary" onclick="projForm()">＋ 프로젝트 추가</button>`);

  let list = DB().projects.slice();
  if (PF.status !== 'all') list = list.filter(p => p.status === PF.status);
  if (PF.q) { const q = PF.q.toLowerCase(); list = list.filter(p => (p.name + p.code + (p.owner || '') + (p.team || '')).toLowerCase().includes(q)); }
  list.sort((a, b) => (a.status === '완료') - (b.status === '완료') || String(a.dueDate).localeCompare(String(b.dueDate)));

  let h = `<div class="toolbar">
    <div class="seg">${['all', ...PSTATUS].map(s => `<button class="${PF.status === s ? 'on' : ''}" onclick="PF.status='${s}';go('ref-proj')">${s === 'all' ? '전체' : s}</button>`).join('')}</div>
    <input id="pfq" placeholder="프로젝트·담당·팀 검색" value="${esc(PF.q)}" style="min-width:200px">
    <span class="sp"></span><span class="small mute">${list.length} / ${DB().projects.length}개</span>
  </div>`;

  if (!list.length) {
    h += emptyBox('프로젝트가 없습니다', admin ? '‘＋ 프로젝트 추가’로 첫 프로젝트를 등록하세요.' : '관리자에게 등록을 요청하세요.');
  } else {
    h += `<div class="t-wrap"><table><thead><tr>
      <th style="width:96px">코드</th><th>프로젝트명</th><th style="width:110px">주관팀</th>
      <th style="width:96px">PM</th><th style="width:82px">상태</th>
      <th style="width:100px">시작일</th><th style="width:104px">완료 예정일</th>
      <th style="width:92px">잔여</th><th style="width:110px">이번 주 입력</th>${admin ? '<th style="width:104px"></th>' : ''}
    </tr></thead><tbody>`;
    const wk = curWeek().key;
    h += list.map(p => {
      const n = DB().reports.filter(r => r.week === wk && r.projectId === p.id).length;
      return `<tr>
        <td><span class="chip">${esc(p.code)}</span></td>
        <td><b>${esc(p.name)}</b>${p.desc ? `<div class="small mute">${esc(p.desc)}</div>` : ''}</td>
        <td>${esc(p.team || '-')}</td><td>${esc(p.owner || '-')}</td>
        <td>${statusTag(p.status)}</td>
        <td class="num">${fmtFull(p.startDate)}</td>
        <td class="num"><b>${fmtFull(p.dueDate)}</b></td>
        <td>${ddayTag(p.dueDate, p.status)}</td>
        <td>${n ? `<span class="tag tag-moss">${n}명 작성</span>` : '<span class="tag tag-grey">없음</span>'}</td>
        ${admin ? `<td class="nowrap"><button class="btn btn-ghost btn-sm" onclick="projForm('${p.id}')">수정</button>
          <button class="btn btn-danger btn-sm" onclick="delProj('${p.id}')">삭제</button></td>` : ''}
      </tr>`;
    }).join('') + `</tbody></table></div>`;
  }
  $('#pgBody').innerHTML = h;
  const q = $('#pfq');
  if (q) q.oninput = e => { clearTimeout(q._t); q._t = setTimeout(() => { PF.q = e.target.value; go('ref-proj'); }, 300); };
};

function projForm(id) {
  const p = id ? projById(id) : null;
  const teams = [...new Set(DB().users.map(u => u.team).filter(Boolean))];
  openModal(p ? '프로젝트 수정' : '프로젝트 추가', `
    <div class="alert err" id="pfAlert"></div>
    <div class="row2">
      <div class="field"><label>프로젝트 코드 <span style="color:var(--rose)">*</span></label>
        <input id="p_code" value="${esc(p ? p.code : '')}" placeholder="예: PRJ-2026-01"></div>
      <div class="field"><label>상태</label>
        <select id="p_status">${PSTATUS.map(s => `<option ${p && p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>프로젝트명 <span style="color:var(--rose)">*</span></label>
      <input id="p_name" value="${esc(p ? p.name : '')}" placeholder="예: 차세대 포털 구축"></div>
    <div class="row2">
      <div class="field"><label>주관팀</label><input id="p_team" list="teamList2" value="${esc(p ? p.team || '' : '')}" placeholder="예: 플랫폼개발팀">
        <datalist id="teamList2">${teams.map(t => `<option value="${esc(t)}">`).join('')}</datalist></div>
      <div class="field"><label>PM / 책임자</label><input id="p_owner" value="${esc(p ? p.owner || '' : '')}" placeholder="예: 홍길동"></div>
    </div>
    <div class="row2">
      <div class="field"><label>시작일</label><input type="date" id="p_start" value="${p ? p.startDate || '' : iso(new Date())}"></div>
      <div class="field"><label>완료 예정일 <span style="color:var(--rose)">*</span></label>
        <input type="date" id="p_due" value="${p ? p.dueDate : ''}">
        <div class="hint">반드시 지정해야 저장됩니다.</div></div>
    </div>
    <div class="field"><label>설명</label><textarea id="p_desc" placeholder="선택 입력">${esc(p ? p.desc || '' : '')}</textarea></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">취소</button>
     <button class="btn btn-primary" onclick="saveProj(${p ? `'${p.id}'` : 'null'})">${p ? '변경사항 저장' : '프로젝트 추가'}</button>`);
}
function saveProj(id) {
  const v = {
    code: $('#p_code').value.trim(), name: $('#p_name').value.trim(),
    team: $('#p_team').value.trim(), owner: $('#p_owner').value.trim(),
    startDate: $('#p_start').value, dueDate: $('#p_due').value,
    status: $('#p_status').value, desc: $('#p_desc').value.trim()
  };
  const bad = m => { showAlert('#pfAlert', m); return false; };
  if (!v.code) return bad('프로젝트 코드를 입력하세요.');
  if (!v.name) return bad('프로젝트명을 입력하세요.');
  if (!v.dueDate) return bad('완료 예정일은 필수입니다. 날짜를 지정하세요.');
  if (v.startDate && v.dueDate < v.startDate) return bad('완료 예정일이 시작일보다 빠릅니다.');
  if (DB().projects.some(p => p.id !== id && p.code.toLowerCase() === v.code.toLowerCase())) return bad('이미 사용 중인 프로젝트 코드입니다.');

  if (id) { Object.assign(projById(id), v, { updatedAt: Date.now() }); }
  else { DB().projects.push({ id: uid(), ...v, createdAt: Date.now(), updatedAt: Date.now() }); }
  Store.save(); closeModal(); toast(id ? '프로젝트를 수정했습니다.' : '프로젝트를 추가했습니다.'); go('ref-proj');
}
function delProj(id) {
  const n = DB().reports.filter(r => r.projectId === id).length;
  if (!confirm(`프로젝트를 삭제할까요?${n ? `\n연결된 주간업무 ${n}건도 함께 삭제됩니다.` : ''}`)) return;
  DB().projects = DB().projects.filter(p => p.id !== id);
  DB().reports = DB().reports.filter(r => r.projectId !== id);
  Store.save(); toast('삭제되었습니다.'); go('ref-proj');
}
function exportProjCsv() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['코드', '프로젝트명', '주관팀', 'PM', '상태', '시작일', '완료예정일', '설명'];
  const body = DB().projects.map(p => [p.code, p.name, p.team, p.owner, p.status, p.startDate, p.dueDate, p.desc].map(q).join(','));
  const blob = new Blob(['\uFEFF' + head.map(q).join(',') + '\n' + body.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '프로젝트목록.csv'; a.click();
  URL.revokeObjectURL(a.href); toast('CSV 파일을 내려받았습니다.');
}

/* =========================================================
   내 정보
   ========================================================= */
PAGES['my-acc'] = () => {
  head('내 정보', '계정 정보와 비밀번호를 관리합니다.');
  $('#pgBody').innerHTML = `
    <div class="card" style="max-width:520px"><div class="card-h"><h3>계정</h3></div><div class="card-b">
      <div class="row2">
        <div class="field"><label>이름</label><input id="a_name" value="${esc(ME.name)}"></div>
        <div class="field"><label>사번</label><input value="${esc(ME.empNo)}" disabled><div class="hint">사번은 변경할 수 없습니다.</div></div>
      </div>
      <div class="row2">
        <div class="field"><label>팀명</label><input id="a_team" value="${esc(ME.team)}"></div>
        <div class="field"><label>권한</label><input value="${isAdmin() ? '관리자' : '입력자'}" disabled></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="saveAcc()">계정 정보 저장</button>
    </div></div>
    <div class="card" style="max-width:520px"><div class="card-h"><h3>비밀번호 변경</h3></div><div class="card-b">
      <div class="alert err" id="pwAlert"></div>
      <div class="field"><label>현재 비밀번호</label><input type="password" id="a_old"></div>
      <div class="row2">
        <div class="field"><label>새 비밀번호</label><input type="password" id="a_new" placeholder="6자 이상"></div>
        <div class="field"><label>새 비밀번호 확인</label><input type="password" id="a_new2"></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="changePw()">비밀번호 변경</button>
      <div class="hint" style="margin-top:10px">비밀번호는 개인 솔트를 붙여 SHA-256으로 해시 저장되며, 평문은 어디에도 남지 않습니다.</div>
    </div></div>`;
};
function saveAcc() {
  const n = $('#a_name').value.trim(), t = $('#a_team').value.trim();
  if (!n || !t) return toast('이름과 팀명을 입력하세요.');
  ME.name = n; ME.team = t; Store.save();
  $('#sbName').textContent = n; $('#sbMeta').textContent = `${t} · ${ME.empNo} · ${isAdmin() ? '관리자' : '입력자'}`;
  toast('계정 정보를 저장했습니다.');
}
async function changePw() {
  const o = $('#a_old').value, n = $('#a_new').value, n2 = $('#a_new2').value;
  if (await hashPw(o, ME.salt) !== ME.pw) return showAlert('#pwAlert', '현재 비밀번호가 일치하지 않습니다.');
  if (n.length < 6) return showAlert('#pwAlert', '새 비밀번호는 6자 이상이어야 합니다.');
  if (n !== n2) return showAlert('#pwAlert', '새 비밀번호 확인이 일치하지 않습니다.');
  ME.salt = salt(); ME.pw = await hashPw(n, ME.salt); Store.save();
  showAlert('#pwAlert', ''); ['#a_old', '#a_new', '#a_new2'].forEach(i => $(i).value = '');
  toast('비밀번호가 변경되었습니다.');
}

/* =========================================================
   [관리자] 공통 가드 & 도우미
   ========================================================= */
function guard() {
  if (isAdmin()) return true;
  head('접근 권한 없음', '');
  $('#pgBody').innerHTML = emptyBox('관리자 전용 페이지입니다', '관리자에게 권한 부여를 요청하세요.');
  return false;
}
function weekByKey(k) { return weekOptions(160, 8).find(w => w.key === k) || { key: k, year: '', week: '', start: '', end: '', wed: '' }; }
function allWeekKeys() { return [...new Set(DB().reports.map(r => r.week))].sort().reverse(); }
function pctBar(v) {
  if (v == null) return '<span class="mute">-</span>';
  return `<div class="num">${v}%</div><div class="bar ${v >= 100 ? 'done' : ''}"><i style="width:${Math.min(100, v)}%"></i></div>`;
}
function reportBlock(r, showUser) {
  const u = userById(r.userId) || {};
  return `<div style="border-left:2px solid var(--line-strong);padding:0 0 0 12px;margin-bottom:13px">
    <div class="flexc small" style="flex-wrap:wrap">
      ${showUser ? `<b>${esc(u.name || '-')}</b><span class="mute">${esc(u.team || '')}</span>` : ''}
      ${r.progress != null ? `<span class="tag tag-ink">${r.progress}%</span>` : ''}
      ${r.issue ? `<span class="tag tag-amber">이슈</span>` : ''}
      <span class="mute" style="margin-left:auto">${fmtTime(r.updatedAt)}</span></div>
    <div class="small" style="margin-top:4px"><span class="mute">금주 ·</span> ${nl2(r.thisWeek)}</div>
    <div class="small"><span class="mute">차주 ·</span> ${nl2(r.nextWeek)}</div>
    ${r.issue ? `<div class="small"><span class="mute">이슈 ·</span> ${nl2(r.issue)}</div>` : ''}
    <div class="btn-row" style="margin-top:6px"><button class="btn btn-ghost btn-sm" onclick="editReport('${r.id}')">수정</button>
    <button class="btn btn-danger btn-sm" onclick="delReport('${r.id}')">삭제</button></div>
  </div>`;
}

/* =========================================================
   [관리자] 금주 모니터링
   ========================================================= */
let AW = { week: null, group: 'proj' };
PAGES['adm-week'] = () => {
  if (!guard()) return;
  const wks = weekOptions(20, 1);
  if (!AW.week) AW.week = curWeek().key;
  const w = weekByKey(AW.week);
  head('금주 모니터링', `${weekLabel(w)} · 제출 현황과 프로젝트별 진행 상황을 한눈에 봅니다.`);
  actions(`<button class="btn btn-ghost" onclick="downloadCsv(reportsOfWeek(AW.week),'주간업무_${AW.week}.csv')">CSV 내보내기</button>
           <button class="btn btn-primary" onclick="ADR.week=AW.week;go('adm-report')">보고서 만들기</button>`);

  const rows = reportsOfWeek(AW.week);
  const submitters = new Set(rows.map(r => r.userId));
  const allUsers = DB().users;
  const notYet = allUsers.filter(u => !submitters.has(u.id));
  const projCovered = new Set(rows.map(r => r.projectId));
  const actP = activeProjects();
  const noUpdate = actP.filter(p => !projCovered.has(p.id));
  const issues = rows.filter(r => r.issue);
  const rate = allUsers.length ? Math.round(submitters.size / allUsers.length * 100) : 0;

  let h = `<div class="toolbar">
    <label class="small mute" style="font-weight:600">조회 주차</label>
    <select onchange="AW.week=this.value;go('adm-week')">
      ${wks.map(x => `<option value="${x.key}" ${x.key === AW.week ? 'selected' : ''}>${weekLabel(x)}${x.key === curWeek().key ? ' — 이번 주' : ''}</option>`).join('')}
    </select>
    <span class="sp"></span>
    <div class="seg">
      <button class="${AW.group === 'proj' ? 'on' : ''}" onclick="AW.group='proj';go('adm-week')">프로젝트별</button>
      <button class="${AW.group === 'team' ? 'on' : ''}" onclick="AW.group='team';go('adm-week')">팀별</button>
      <button class="${AW.group === 'flat' ? 'on' : ''}" onclick="AW.group='flat';go('adm-week')">전체 목록</button>
    </div></div>`;

  h += `<div class="stats">
    <div class="stat"><div class="k">제출 인원</div><div class="v">${submitters.size}<small> / ${allUsers.length}명</small></div>
      <div class="bar" style="margin-top:7px"><i style="width:${rate}%"></i></div></div>
    <div class="stat"><div class="k">작성 건수</div><div class="v">${rows.length}<small> 건</small></div><div class="d">프로젝트×작성자</div></div>
    <div class="stat"><div class="k">업데이트된 프로젝트</div><div class="v">${projCovered.size}<small> / ${actP.length}개</small></div><div class="d">진행중·준비 기준</div></div>
    <div class="stat"><div class="k">이슈 제기</div><div class="v">${issues.length}<small> 건</small></div><div class="d">${issues.length ? '확인이 필요합니다' : '보고된 이슈 없음'}</div></div>
  </div>`;

  h += `<div class="row2" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
    <div class="card"><div class="card-h"><h3>미제출자</h3><span class="tag ${notYet.length ? 'tag-rose' : 'tag-moss'}">${notYet.length}명</span></div>
      <div class="card-b">${notYet.length
      ? notYet.map(u => `<div class="flexc" style="padding:5px 0;border-bottom:1px solid var(--line)">
            <b>${esc(u.name)}</b><span class="small mute">${esc(u.team)} · ${esc(u.empNo)}</span>
            <span class="small mute" style="margin-left:auto">${u.role === 'admin' ? '관리자' : ''}</span></div>`).join('')
      : '<div class="small mute">전원 제출했습니다.</div>'}</div></div>
    <div class="card"><div class="card-h"><h3>업데이트 없는 진행 프로젝트</h3><span class="tag ${noUpdate.length ? 'tag-amber' : 'tag-moss'}">${noUpdate.length}개</span></div>
      <div class="card-b">${noUpdate.length
      ? noUpdate.map(p => `<div class="flexc" style="padding:5px 0;border-bottom:1px solid var(--line)">
            <b>${esc(p.name)}</b><span class="chip">${esc(p.code)}</span>
            <span style="margin-left:auto">${ddayTag(p.dueDate, p.status)}</span></div>`).join('')
      : '<div class="small mute">모든 진행 프로젝트가 업데이트되었습니다.</div>'}</div></div>
  </div>`;

  if (issues.length) {
    h += `<div class="card"><div class="card-h"><h3>이슈 · 협조 요청</h3></div><div class="card-b" style="padding:0">
      <div class="t-wrap" style="border:none"><table><thead><tr><th style="width:200px">프로젝트</th><th style="width:130px">작성자</th><th>내용</th></tr></thead><tbody>
      ${issues.map(r => `<tr><td><b>${esc(projName(r.projectId))}</b></td>
        <td>${esc(userName(r.userId))}<div class="small mute">${esc((userById(r.userId) || {}).team || '')}</div></td>
        <td class="pre">${nl2(r.issue)}</td></tr>`).join('')}
      </tbody></table></div></div></div>`;
  }

  if (!rows.length) { h += emptyBox('해당 주차에 제출된 주간업무가 없습니다', ''); $('#pgBody').innerHTML = h; return; }

  if (AW.group === 'flat') {
    h += `<div class="card"><div class="card-h"><h3>전체 작성 목록</h3><span class="small mute">${rows.length}건</span></div>
      <div class="card-b" style="padding:0"><div class="t-wrap" style="border:none"><table><thead><tr>
      <th style="width:180px">프로젝트</th><th style="width:110px">작성자</th><th style="width:100px">팀</th>
      <th>금주 진행사항</th><th>차주 진행계획</th><th style="width:88px">진척</th><th style="width:74px"></th>
      </tr></thead><tbody>` +
      rows.slice().sort((a, b) => projName(a.projectId).localeCompare(projName(b.projectId))).map(r => `<tr>
        <td><b>${esc(projName(r.projectId))}</b><div class="small mute">${esc((projById(r.projectId) || {}).code || '')}</div></td>
        <td>${esc(userName(r.userId))}</td><td class="small">${esc((userById(r.userId) || {}).team || '')}</td>
        <td class="pre">${nl2(r.thisWeek)}</td><td class="pre">${nl2(r.nextWeek)}</td>
        <td>${pctBar(r.progress)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="editReport('${r.id}')">수정</button></td></tr>`).join('') +
      `</tbody></table></div></div></div>`;
  } else if (AW.group === 'proj') {
    const byP = {}; rows.forEach(r => (byP[r.projectId] ||= []).push(r));
    h += Object.entries(byP).sort((a, b) => projName(a[0]).localeCompare(projName(b[0]))).map(([pid, list]) => {
      const p = projById(pid) || {};
      const avg = list.filter(r => r.progress != null);
      const av = avg.length ? Math.round(avg.reduce((s, r) => s + r.progress, 0) / avg.length) : null;
      return `<div class="card"><div class="card-h">
        <h3>${esc(p.name || '(삭제됨)')} <span class="chip">${esc(p.code || '-')}</span></h3>
        <span class="flexc small">${statusTag(p.status || '-')} ${ddayTag(p.dueDate, p.status)}
          <span class="mute">완료예정 ${fmtFull(p.dueDate)}</span>
          <span class="tag tag-grey">${list.length}명 작성</span>
          ${av != null ? `<span class="tag tag-ink">평균 ${av}%</span>` : ''}</span></div>
        <div class="card-b">${list.map(r => reportBlock(r, true)).join('')}</div></div>`;
    }).join('');
  } else {
    const byT = {}; rows.forEach(r => { const t = (userById(r.userId) || {}).team || '미지정'; (byT[t] ||= []).push(r); });
    h += Object.entries(byT).sort().map(([t, list]) => `<div class="card">
      <div class="card-h"><h3>${esc(t)}</h3><span class="small mute">${new Set(list.map(r => r.userId)).size}명 · ${list.length}건</span></div>
      <div class="card-b">${list.map(r => `<div style="margin-bottom:6px"><div class="small"><b>${esc(projName(r.projectId))}</b> <span class="mute">· ${esc(userName(r.userId))}</span></div>${reportBlock(r, false)}</div>`).join('')}</div></div>`).join('');
  }
  $('#pgBody').innerHTML = h;
};

/* =========================================================
   [관리자] 프로젝트별 모니터링
   ========================================================= */
let AP = { proj: null };
PAGES['adm-proj'] = () => {
  if (!guard()) return;
  const projs = DB().projects.slice().sort((a, b) => a.name.localeCompare(b.name));
  head('프로젝트별 모니터링', '프로젝트 하나를 골라 주차별·담당자별 진행 이력을 추적합니다.');
  if (!projs.length) { $('#pgBody').innerHTML = emptyBox('등록된 프로젝트가 없습니다', '기준 정보에서 먼저 프로젝트를 추가하세요.'); return; }
  if (!AP.proj || !projById(AP.proj)) AP.proj = projs[0].id;
  const p = projById(AP.proj);
  const rows = DB().reports.filter(r => r.projectId === p.id);
  const weeks = [...new Set(rows.map(r => r.week))].sort().reverse();
  const people = [...new Set(rows.map(r => r.userId))];
  const withPg = rows.filter(r => r.progress != null).sort((a, b) => b.week.localeCompare(a.week));
  const latestPg = withPg.length ? withPg[0].progress : null;

  actions(`<button class="btn btn-ghost" onclick="downloadCsv(DB().reports.filter(r=>r.projectId==='${p.id}'),'프로젝트_${p.code}.csv')">CSV 내보내기</button>`);

  let h = `<div class="toolbar">
    <label class="small mute" style="font-weight:600">프로젝트</label>
    <select onchange="AP.proj=this.value;go('adm-proj')" style="min-width:260px">
      ${projs.map(x => `<option value="${x.id}" ${x.id === AP.proj ? 'selected' : ''}>${esc(x.code)} · ${esc(x.name)}</option>`).join('')}
    </select>
    <span class="sp"></span><button class="btn btn-ghost btn-sm" onclick="projForm('${p.id}')">기준 정보 수정</button></div>`;

  h += `<div class="stats">
    <div class="stat"><div class="k">상태</div><div class="v" style="font-size:20px;padding-top:6px">${statusTag(p.status)}</div><div class="d">${esc(p.team || '-')} · PM ${esc(p.owner || '-')}</div></div>
    <div class="stat"><div class="k">완료 예정일</div><div class="v num" style="font-size:20px;padding-top:6px">${fmtFull(p.dueDate)}</div><div class="d">${ddayTag(p.dueDate, p.status)}</div></div>
    <div class="stat"><div class="k">최근 진척률</div><div class="v">${latestPg != null ? latestPg + '<small>%</small>' : '<small>미기록</small>'}</div>
      <div class="bar ${latestPg >= 100 ? 'done' : ''}" style="margin-top:7px"><i style="width:${latestPg || 0}%"></i></div></div>
    <div class="stat"><div class="k">참여 인원 / 기록 주차</div><div class="v">${people.length}<small> 명 · ${weeks.length}주</small></div><div class="d">총 ${rows.length}건 작성</div></div>
  </div>`;

  if (!rows.length) { h += emptyBox('이 프로젝트에 작성된 주간업무가 없습니다', ''); $('#pgBody').innerHTML = h; return; }

  // 주차 × 사람 교차표
  h += `<div class="card"><div class="card-h"><h3>주차 × 담당자 작성 현황</h3><span class="small mute">셀을 누르면 내용이 열립니다</span></div>
    <div class="card-b" style="padding:0"><div class="t-wrap" style="border:none"><table>
    <thead><tr><th style="width:120px">주차</th>${people.map(u => `<th>${esc(userName(u))}</th>`).join('')}</tr></thead><tbody>`;
  for (const wk of weeks) {
    h += `<tr><td class="num nowrap"><b>${esc(wk)}</b><div class="small mute">${fmtD(weekByKey(wk).wed)}</div></td>`;
    for (const u of people) {
      const r = rows.find(x => x.week === wk && x.userId === u);
      h += `<td>${r ? `<button class="btn btn-ghost btn-sm" onclick="peekReport('${r.id}')">
        ${r.progress != null ? r.progress + '%' : '보기'}</button>` : '<span class="mute">-</span>'}</td>`;
    }
    h += `</tr>`;
  }
  h += `</tbody></table></div></div></div>`;

  h += weeks.map(wk => `<div class="card"><div class="card-h"><h3>${esc(wk)}</h3>
    <span class="small mute">${weekLabel(weekByKey(wk))}</span></div>
    <div class="card-b">${rows.filter(r => r.week === wk).map(r => reportBlock(r, true)).join('')}</div></div>`).join('');
  $('#pgBody').innerHTML = h;
};
function peekReport(id) {
  const r = DB().reports.find(x => x.id === id); if (!r) return;
  openModal(`${projName(r.projectId)} — ${userName(r.userId)}`, `
    <div class="small mute" style="margin-bottom:12px">${esc(r.week)} · ${weekLabel(weekByKey(r.week))} · 최종 수정 ${fmtTime(r.updatedAt)}</div>
    <div class="field"><label>금주 진행사항</label><div class="pre">${nl2(r.thisWeek)}</div></div>
    <div class="field"><label>차주 진행계획</label><div class="pre">${nl2(r.nextWeek)}</div></div>
    ${r.progress != null ? `<div class="field"><label>진척률</label>${pctBar(r.progress)}</div>` : ''}
    ${r.issue ? `<div class="field"><label>이슈 / 협조 요청</label><div class="pre">${nl2(r.issue)}</div></div>` : ''}`,
    `<button class="btn btn-ghost" onclick="closeModal()">닫기</button>
     <button class="btn btn-primary" onclick="closeModal();editReport('${r.id}')">수정</button>`);
}

/* =========================================================
   [관리자] 사람별 모니터링
   ========================================================= */
let AU = { user: null };
PAGES['adm-person'] = () => {
  if (!guard()) return;
  const users = DB().users.slice().sort((a, b) => (a.team || '').localeCompare(b.team || '') || a.name.localeCompare(b.name));
  head('사람별 모니터링', '구성원별 제출 이력과 담당 프로젝트를 확인합니다.');
  if (!AU.user || !userById(AU.user)) AU.user = users[0].id;
  const u = userById(AU.user);
  const rows = DB().reports.filter(r => r.userId === u.id).sort((a, b) => b.week.localeCompare(a.week));
  const weeks = [...new Set(rows.map(r => r.week))];
  const projs = [...new Set(rows.map(r => r.projectId))];
  const recent = weekOptions(7, 0).map(w => w.key);
  const done = recent.filter(k => rows.some(r => r.week === k)).length;

  actions(`<button class="btn btn-ghost" onclick="downloadCsv(DB().reports.filter(r=>r.userId==='${u.id}'),'개인_${u.name}.csv')">CSV 내보내기</button>`);

  let h = `<div class="toolbar"><label class="small mute" style="font-weight:600">구성원</label>
    <select onchange="AU.user=this.value;go('adm-person')" style="min-width:250px">
      ${users.map(x => `<option value="${x.id}" ${x.id === AU.user ? 'selected' : ''}>${esc(x.team)} · ${esc(x.name)} (${esc(x.empNo)})</option>`).join('')}
    </select><span class="sp"></span></div>`;

  h += `<div class="stats">
    <div class="stat"><div class="k">구성원</div><div class="v" style="font-size:21px;padding-top:5px">${esc(u.name)}</div><div class="d">${esc(u.team)} · ${esc(u.empNo)} · ${u.role === 'admin' ? '관리자' : '입력자'}</div></div>
    <div class="stat"><div class="k">최근 8주 제출률</div><div class="v">${Math.round(done / recent.length * 100)}<small>%</small></div>
      <div class="bar" style="margin-top:7px"><i style="width:${done / recent.length * 100}%"></i></div></div>
    <div class="stat"><div class="k">담당 프로젝트</div><div class="v">${projs.length}<small> 개</small></div><div class="d">기록 기준</div></div>
    <div class="stat"><div class="k">누적 작성</div><div class="v">${rows.length}<small> 건</small></div><div class="d">${weeks.length}개 주차</div></div>
  </div>`;

  h += `<div class="card"><div class="card-h"><h3>최근 8주 제출 현황</h3></div><div class="card-b">
    <div style="display:flex;gap:7px;flex-wrap:wrap">${recent.slice().reverse().map(k => {
    const n = rows.filter(r => r.week === k).length;
    return `<div style="border:1px solid var(--line);border-radius:7px;padding:8px 11px;min-width:88px;text-align:center;background:${n ? 'var(--moss-soft)' : 'var(--bg-sub)'}">
        <div class="small mute">${esc(k.slice(5))}</div><div style="font-weight:800;font-size:16px;color:${n ? 'var(--moss)' : 'var(--text-mute)'}">${n || '·'}</div></div>`;
  }).join('')}</div></div></div>`;

  if (!rows.length) { h += emptyBox('작성 이력이 없습니다', ''); $('#pgBody').innerHTML = h; return; }
  const byW = {}; rows.forEach(r => (byW[r.week] ||= []).push(r));
  h += Object.entries(byW).map(([wk, list]) => `<div class="card"><div class="card-h">
    <h3>${esc(wk)}</h3><span class="small mute">${weekLabel(weekByKey(wk))} · ${list.length}건</span></div>
    <div class="card-b">${list.map(r => `<div style="margin-bottom:4px"><div class="small"><b>${esc(projName(r.projectId))}</b>
      <span class="chip">${esc((projById(r.projectId) || {}).code || '-')}</span></div>${reportBlock(r, false)}</div>`).join('')}</div></div>`).join('');
  $('#pgBody').innerHTML = h;
};

/* =========================================================
   [관리자] 팀별 모니터링
   ========================================================= */
PAGES['adm-team'] = () => {
  if (!guard()) return;
  const wk = AW.week || curWeek().key;
  head('팀별 모니터링', '팀 단위 제출률과 작성량을 비교합니다.');
  const wks = weekOptions(20, 1);
  const rows = reportsOfWeek(wk);
  const teams = [...new Set(DB().users.map(u => u.team || '미지정'))].sort();

  let h = `<div class="toolbar"><label class="small mute" style="font-weight:600">조회 주차</label>
    <select onchange="AW.week=this.value;go('adm-team')">
      ${wks.map(x => `<option value="${x.key}" ${x.key === wk ? 'selected' : ''}>${weekLabel(x)}</option>`).join('')}
    </select></div>`;

  h += `<div class="t-wrap"><table><thead><tr><th>팀</th><th style="width:88px">인원</th>
    <th style="width:88px">제출</th><th style="width:170px">제출률</th><th style="width:88px">작성 건수</th>
    <th style="width:90px">이슈</th><th>미제출자</th></tr></thead><tbody>`;
  for (const t of teams) {
    const mem = DB().users.filter(u => (u.team || '미지정') === t);
    const sub = mem.filter(u => rows.some(r => r.userId === u.id));
    const cnt = rows.filter(r => mem.some(u => u.id === r.userId)).length;
    const iss = rows.filter(r => r.issue && mem.some(u => u.id === r.userId)).length;
    const pct = Math.round(sub.length / mem.length * 100);
    h += `<tr><td><b>${esc(t)}</b></td><td class="num">${mem.length}</td><td class="num">${sub.length}</td>
      <td><div class="flexc"><span class="num" style="width:38px">${pct}%</span><div class="bar" style="flex:1">
        <i style="width:${pct}%;background:${pct === 100 ? 'var(--moss)' : pct >= 50 ? 'var(--ink)' : 'var(--amber)'}"></i></div></div></td>
      <td class="num">${cnt}</td><td>${iss ? `<span class="tag tag-amber">${iss}</span>` : '<span class="mute">-</span>'}</td>
      <td class="small">${mem.filter(u => !sub.includes(u)).map(u => esc(u.name)).join(', ') || '<span class="mute">없음</span>'}</td></tr>`;
  }
  h += `</tbody></table></div>`;

  // 프로젝트 상태 요약
  h += `<div class="card"><div class="card-h"><h3>프로젝트 상태 요약</h3></div><div class="card-b">
    <div class="stats" style="margin:0">${PSTATUS.map(s => {
    const n = DB().projects.filter(p => p.status === s).length;
    return `<div class="stat"><div class="k">${s}</div><div class="v">${n}<small> 개</small></div></div>`;
  }).join('')}
    <div class="stat"><div class="k">기한 초과</div><div class="v" style="color:var(--rose)">${DB().projects.filter(p => p.status !== '완료' && dday(p.dueDate) < 0).length}<small> 개</small></div></div>
    </div></div></div>`;
  $('#pgBody').innerHTML = h;
};

/* =========================================================
   [관리자] 보고서 취합
   ========================================================= */
let ADR = { week: null, by: 'proj', showIssue: true, showOwner: true, onlyActive: false };
PAGES['adm-report'] = () => {
  if (!guard()) return;
  if (!ADR.week) ADR.week = curWeek().key;
  const wks = weekOptions(20, 1);
  const w = weekByKey(ADR.week);
  head('보고서 취합', '주차별 내용을 하나의 보고 문서로 묶습니다. 인쇄·PDF 저장·마크다운 복사를 지원합니다.');
  actions(`<button class="btn btn-ghost" onclick="copyMd()">마크다운 복사</button>
           <button class="btn btn-ghost" onclick="downloadCsv(reportsOfWeek(ADR.week),'주간보고_${ADR.week}.csv')">CSV</button>
           <button class="btn btn-primary" onclick="window.print()">인쇄 · PDF 저장</button>`);

  let h = `<div class="toolbar no-print">
    <select onchange="ADR.week=this.value;go('adm-report')">
      ${wks.map(x => `<option value="${x.key}" ${x.key === ADR.week ? 'selected' : ''}>${weekLabel(x)}</option>`).join('')}
    </select>
    <div class="seg">
      <button class="${ADR.by === 'proj' ? 'on' : ''}" onclick="ADR.by='proj';go('adm-report')">프로젝트 기준</button>
      <button class="${ADR.by === 'team' ? 'on' : ''}" onclick="ADR.by='team';go('adm-report')">팀 기준</button>
      <button class="${ADR.by === 'person' ? 'on' : ''}" onclick="ADR.by='person';go('adm-report')">개인 기준</button>
    </div>
    <label class="small flexc"><input type="checkbox" style="width:auto" ${ADR.showIssue ? 'checked' : ''} onchange="ADR.showIssue=this.checked;go('adm-report')"> 이슈 포함</label>
    <label class="small flexc"><input type="checkbox" style="width:auto" ${ADR.showOwner ? 'checked' : ''} onchange="ADR.showOwner=this.checked;go('adm-report')"> 작성자 표기</label>
  </div>`;

  h += `<div class="card"><div class="card-b"><div class="report-doc" id="reportDoc">${buildReportHtml()}</div></div></div>`;
  $('#pgBody').innerHTML = h;
};
function reportGroups() {
  const rows = reportsOfWeek(ADR.week);
  const g = {};
  for (const r of rows) {
    let k;
    if (ADR.by === 'proj') k = projName(r.projectId);
    else if (ADR.by === 'team') k = (userById(r.userId) || {}).team || '미지정';
    else k = userName(r.userId);
    (g[k] ||= []).push(r);
  }
  return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
}
function buildReportHtml() {
  const w = weekByKey(ADR.week);
  const rows = reportsOfWeek(ADR.week);
  if (!rows.length) return emptyBox('해당 주차에 취합할 내용이 없습니다', '');
  const groups = reportGroups();
  let h = `<h2>주간업무 보고</h2>
    <div class="report-meta">${weekLabel(w)} · 기준일 ${fmtFull(w.wed)}(수) · 작성 ${rows.length}건 · 참여 ${new Set(rows.map(r => r.userId)).size}명 · 출력 ${fmtFull(iso(new Date()))}</div>`;
  for (const [name, list] of groups) {
    const p = ADR.by === 'proj' ? DB().projects.find(x => x.name === name) : null;
    h += `<h3>${esc(name)}${p ? ` <span class="chip">${esc(p.code)}</span>` : ''}</h3>`;
    if (p) h += `<div class="report-meta">상태 ${esc(p.status)} · 주관 ${esc(p.team || '-')} · PM ${esc(p.owner || '-')} · 완료 예정 ${fmtFull(p.dueDate)}${dday(p.dueDate) < 0 && p.status !== '완료' ? ` (지연 ${-dday(p.dueDate)}일)` : ''}</div>`;
    for (const r of list) {
      const label = ADR.by === 'proj' ? userName(r.userId) : projName(r.projectId);
      h += `<h4>${esc(ADR.showOwner || ADR.by !== 'proj' ? label : '진행사항')}${r.progress != null ? ` (${r.progress}%)` : ''}</h4>
        <ul><li><b>금주</b> ${nl2(r.thisWeek)}</li><li><b>차주</b> ${nl2(r.nextWeek)}</li>
        ${ADR.showIssue && r.issue ? `<li><b>이슈</b> ${nl2(r.issue)}</li>` : ''}</ul>`;
    }
  }
  return h;
}
function buildReportMd() {
  const w = weekByKey(ADR.week);
  const rows = reportsOfWeek(ADR.week);
  if (!rows.length) return '';
  let m = `# 주간업무 보고\n\n${weekLabel(w)} · 기준일 ${fmtFull(w.wed)}(수)\n작성 ${rows.length}건 · 참여 ${new Set(rows.map(r => r.userId)).size}명\n`;
  for (const [name, list] of reportGroups()) {
    const p = ADR.by === 'proj' ? DB().projects.find(x => x.name === name) : null;
    m += `\n## ${name}${p ? ` (${p.code})` : ''}\n`;
    if (p) m += `> 상태 ${p.status} · 주관 ${p.team || '-'} · PM ${p.owner || '-'} · 완료 예정 ${fmtFull(p.dueDate)}\n`;
    for (const r of list) {
      const label = ADR.by === 'proj' ? userName(r.userId) : projName(r.projectId);
      m += `\n### ${label}${r.progress != null ? ` (${r.progress}%)` : ''}\n`;
      m += `- **금주**: ${r.thisWeek.replace(/\n/g, ' / ')}\n- **차주**: ${r.nextWeek.replace(/\n/g, ' / ')}\n`;
      if (ADR.showIssue && r.issue) m += `- **이슈**: ${r.issue}\n`;
    }
  }
  return m;
}
async function copyMd() {
  const md = buildReportMd();
  if (!md) return toast('복사할 내용이 없습니다.');
  try { await navigator.clipboard.writeText(md); toast('마크다운을 클립보드에 복사했습니다.'); }
  catch {
    openModal('마크다운 복사', `<textarea style="width:100%;min-height:320px;font-family:var(--mono);font-size:12px">${esc(md)}</textarea>
      <div class="hint">직접 선택해서 복사하세요.</div>`);
  }
}

/* =========================================================
   [관리자] 사용자 · 권한
   ========================================================= */
PAGES['adm-users'] = () => {
  if (!guard()) return;
  head('사용자 · 권한', '가입된 구성원의 권한을 관리합니다. 비밀번호는 해시로만 저장되어 평문 확인은 불가능하며, 필요 시 초기화할 수 있습니다.');
  actions(`<button class="btn btn-primary" onclick="addUserForm()">＋ 사용자 직접 추가</button>`);
  const wk = curWeek().key;
  const users = DB().users.slice().sort((a, b) => (b.role === 'admin') - (a.role === 'admin') || (a.team || '').localeCompare(b.team || ''));
  let h = `<div class="t-wrap"><table><thead><tr>
    <th style="width:110px">이름</th><th style="width:104px">사번</th><th style="width:130px">팀명</th>
    <th style="width:96px">권한</th><th style="width:100px">이번 주</th><th style="width:96px">누적</th>
    <th>비밀번호 (SHA-256 해시)</th><th style="width:200px"></th></tr></thead><tbody>`;
  h += users.map(u => {
    const thisWk = DB().reports.filter(r => r.userId === u.id && r.week === wk).length;
    const total = DB().reports.filter(r => r.userId === u.id).length;
    return `<tr>
      <td><b>${esc(u.name)}</b></td><td class="num">${esc(u.empNo)}</td><td>${esc(u.team)}</td>
      <td>${u.role === 'admin' ? '<span class="tag tag-ink">관리자</span>' : '<span class="tag tag-grey">입력자</span>'}</td>
      <td>${thisWk ? `<span class="tag tag-moss">${thisWk}건</span>` : '<span class="tag tag-rose">미제출</span>'}</td>
      <td class="num">${total}건</td>
      <td class="num small mute" style="word-break:break-all">${esc(u.pw.slice(0, 24))}…</td>
      <td class="nowrap">
        <button class="btn btn-ghost btn-sm" onclick="toggleRole('${u.id}')">${u.role === 'admin' ? '입력자로' : '관리자로'}</button>
        <button class="btn btn-ghost btn-sm" onclick="resetPw('${u.id}')">비번 초기화</button>
        <button class="btn btn-danger btn-sm" onclick="delUser('${u.id}')">삭제</button></td></tr>`;
  }).join('') + `</tbody></table></div>
  <div class="card"><div class="card-b small mute">
    비밀번호는 사용자별 무작위 솔트를 붙여 SHA-256으로 단방향 해시 처리합니다. 원본 문자열은 저장되지 않으므로 관리자도 조회할 수 없고, 분실 시 초기화 후 재설정하는 방식으로 처리합니다.
  </div></div>`;
  $('#pgBody').innerHTML = h;
};
function toggleRole(id) {
  const u = userById(id);
  if (u.role === 'admin' && DB().users.filter(x => x.role === 'admin').length === 1) return toast('관리자가 최소 1명은 있어야 합니다.');
  u.role = u.role === 'admin' ? 'user' : 'admin'; Store.save();
  if (u.id === ME.id) { buildNav(); $('#sbMeta').textContent = `${ME.team} · ${ME.empNo} · ${isAdmin() ? '관리자' : '입력자'}`; }
  toast(`${u.name} 님의 권한을 ${u.role === 'admin' ? '관리자' : '입력자'}로 변경했습니다.`); go('adm-users');
}
function resetPw(id) {
  const u = userById(id);
  openModal(`비밀번호 초기화 — ${u.name}`, `
    <div class="alert err" id="rpAlert"></div>
    <div class="field"><label>새 비밀번호</label><input type="password" id="rp_pw" placeholder="6자 이상"></div>
    <div class="hint">설정한 비밀번호를 본인에게 전달하고, 첫 로그인 후 ‘내 정보’에서 변경하도록 안내하세요.</div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">취소</button>
     <button class="btn btn-primary" onclick="doResetPw('${id}')">초기화</button>`);
}
async function doResetPw(id) {
  const pw = $('#rp_pw').value;
  if (pw.length < 6) return showAlert('#rpAlert', '6자 이상 입력하세요.');
  const u = userById(id); u.salt = salt(); u.pw = await hashPw(pw, u.salt); Store.save();
  closeModal(); toast(`${u.name} 님의 비밀번호를 초기화했습니다.`); go('adm-users');
}
function delUser(id) {
  const u = userById(id);
  if (u.id === ME.id) return toast('본인 계정은 삭제할 수 없습니다.');
  if (u.role === 'admin' && DB().users.filter(x => x.role === 'admin').length === 1) return toast('마지막 관리자는 삭제할 수 없습니다.');
  const n = DB().reports.filter(r => r.userId === id).length;
  if (!confirm(`${u.name} 님을 삭제할까요?${n ? `\n작성한 주간업무 ${n}건도 함께 삭제됩니다.` : ''}`)) return;
  DB().users = DB().users.filter(x => x.id !== id);
  DB().reports = DB().reports.filter(r => r.userId !== id);
  Store.save(); toast('삭제되었습니다.'); go('adm-users');
}
function addUserForm() {
  openModal('사용자 추가', `
    <div class="alert err" id="auAlert"></div>
    <div class="row2">
      <div class="field"><label>이름</label><input id="nu_name"></div>
      <div class="field"><label>사번</label><input id="nu_emp"></div>
    </div>
    <div class="row2">
      <div class="field"><label>팀명</label><input id="nu_team" list="teamList2b">
        <datalist id="teamList2b">${[...new Set(DB().users.map(u => u.team))].map(t => `<option value="${esc(t)}">`).join('')}</datalist></div>
      <div class="field"><label>권한</label><select id="nu_role"><option value="user">입력자</option><option value="admin">관리자</option></select></div>
    </div>
    <div class="field"><label>초기 비밀번호</label><input type="password" id="nu_pw" placeholder="6자 이상"></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">취소</button>
     <button class="btn btn-primary" onclick="doAddUser()">추가</button>`);
}
async function doAddUser() {
  const name = $('#nu_name').value.trim(), emp = $('#nu_emp').value.trim(),
    team = $('#nu_team').value.trim(), role = $('#nu_role').value, pw = $('#nu_pw').value;
  if (!name || !emp || !team) return showAlert('#auAlert', '이름·사번·팀명을 모두 입력하세요.');
  if (pw.length < 6) return showAlert('#auAlert', '초기 비밀번호는 6자 이상이어야 합니다.');
  if (DB().users.some(u => u.empNo.toLowerCase() === emp.toLowerCase())) return showAlert('#auAlert', '이미 등록된 사번입니다.');
  const s = salt();
  DB().users.push({ id: uid(), name, empNo: emp, team, role, salt: s, pw: await hashPw(pw, s), createdAt: Date.now() });
  Store.save(); closeModal(); toast('사용자를 추가했습니다.'); go('adm-users');
}

/* =========================================================
   [관리자] 데이터 백업 · 복원
   ========================================================= */
PAGES['adm-data'] = () => {
  if (!guard()) return;
  head('데이터 백업', '데이터는 브라우저(localStorage)에 저장됩니다. 정기적으로 JSON 파일로 내려받아 보관하세요.');
  const d = DB();
  $('#pgBody').innerHTML = `
    <div class="stats">
      <div class="stat"><div class="k">사용자</div><div class="v">${d.users.length}<small> 명</small></div></div>
      <div class="stat"><div class="k">프로젝트</div><div class="v">${d.projects.length}<small> 개</small></div></div>
      <div class="stat"><div class="k">주간업무</div><div class="v">${d.reports.length}<small> 건</small></div></div>
      <div class="stat"><div class="k">저장 용량</div><div class="v">${(new Blob([JSON.stringify(d)]).size / 1024).toFixed(1)}<small> KB</small></div></div>
    </div>
    <div class="card"><div class="card-h"><h3>내보내기 · 가져오기</h3></div><div class="card-b">
      <div class="btn-row">
        <button class="btn btn-primary btn-sm" onclick="exportJson()">전체 데이터 JSON 내보내기</button>
        <button class="btn btn-ghost btn-sm" onclick="$('#impFile').click()">JSON 가져오기</button>
        <button class="btn btn-ghost btn-sm" onclick="downloadCsv(DB().reports,'전체주간업무.csv')">전체 주간업무 CSV</button>
        <input type="file" id="impFile" accept=".json" style="display:none">
      </div>
      <div class="hint" style="margin-top:10px">가져오기를 실행하면 현재 데이터를 모두 덮어씁니다. 먼저 내보내기로 백업하세요.</div>
    </div></div>
    <div class="card"><div class="card-h"><h3>샘플 데이터</h3></div><div class="card-b">
      <p class="small mute" style="margin-bottom:10px">기능을 둘러보기 위한 예시 프로젝트와 주간업무를 넣습니다. 기존 데이터는 유지됩니다.</p>
      <button class="btn btn-ghost btn-sm" onclick="seedDemo()">샘플 데이터 넣기</button>
    </div></div>
    <div class="card"><div class="card-h"><h3>초기화</h3></div><div class="card-b">
      <p class="small mute" style="margin-bottom:10px">모든 사용자·프로젝트·주간업무를 삭제합니다. 삭제 후에는 관리자 계정 만들기 화면부터 다시 시작합니다.</p>
      <button class="btn btn-danger btn-sm" onclick="wipeAll()">전체 데이터 삭제</button>
    </div></div>`;
  $('#impFile').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        if (!j.users || !j.projects || !j.reports) throw 0;
        if (!confirm('현재 데이터를 모두 덮어씁니다. 계속할까요?')) return;
        Store.db = j; Store.save(); clearSession();
        alert('가져오기가 완료되었습니다. 다시 로그인해 주세요.');
        location.reload();
      } catch { toast('올바른 백업 파일이 아닙니다.'); }
    };
    rd.readAsText(f);
  };
};
function exportJson() {
  const blob = new Blob([JSON.stringify(DB(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `주간업무백업_${iso(new Date())}.json`; a.click();
  URL.revokeObjectURL(a.href); toast('백업 파일을 내려받았습니다.');
}
function wipeAll() {
  if (!confirm('정말 모든 데이터를 삭제할까요? 되돌릴 수 없습니다.')) return;
  if (!confirm('마지막 확인입니다. 백업은 받으셨나요?')) return;
  Store.reset(); clearSession(); location.reload();
}
async function seedDemo() {
  const d = DB();
  const t = new Date();
  const plus = n => { const x = new Date(t); x.setDate(x.getDate() + n); return iso(x); };
  const demoP = [
    { code: 'PRJ-01', name: '차세대 그룹웨어 구축', team: '플랫폼개발팀', owner: '김도현', status: '진행중', startDate: plus(-70), dueDate: plus(45) },
    { code: 'PRJ-02', name: 'ERP 고도화 2차', team: '경영정보팀', owner: '박서연', status: '진행중', startDate: plus(-120), dueDate: plus(-5) },
    { code: 'PRJ-03', name: '데이터 표준화 체계 수립', team: '데이터팀', owner: '이준호', status: '준비', startDate: plus(-10), dueDate: plus(120) }
  ];
  const ids = [];
  for (const p of demoP) {
    if (d.projects.some(x => x.code === p.code)) { ids.push(d.projects.find(x => x.code === p.code).id); continue; }
    const id = uid(); d.projects.push({ id, ...p, desc: '', createdAt: Date.now(), updatedAt: Date.now() }); ids.push(id);
  }
  const names = [['최민서', '20250101', '플랫폼개발팀'], ['정하늘', '20250102', '데이터팀']];
  const uids = [];
  for (const [n, e, tm] of names) {
    let u = d.users.find(x => x.empNo === e);
    if (!u) { const s = salt(); u = { id: uid(), name: n, empNo: e, team: tm, role: 'user', salt: s, pw: await hashPw('test1234', s), createdAt: Date.now() }; d.users.push(u); }
    uids.push(u.id);
  }
  const wk = curWeek().key;
  const samples = [
    [ids[0], uids[0], '로그인/SSO 모듈 개발 완료, 통합 테스트 1차 수행', '권한 관리 화면 개발 착수, QA 이슈 대응', 45, ''],
    [ids[0], ME.id, '요구사항 정의서 v2 검토 및 확정', '설계 산출물 리뷰 회의 주관', 40, ''],
    [ids[1], uids[1], '재무 모듈 마이그레이션 스크립트 검증', '운영 이관 리허설 진행', 80, '검수 인력 1명 추가 필요']
  ];
  for (const [pid, u, tw, nw, pg, is] of samples) {
    if (d.reports.some(r => r.week === wk && r.projectId === pid && r.userId === u)) continue;
    d.reports.push({ id: uid(), week: wk, projectId: pid, userId: u, thisWeek: tw, nextWeek: nw, progress: pg, issue: is, createdAt: Date.now(), updatedAt: Date.now() });
  }
  Store.save(); toast('샘플 데이터를 넣었습니다. (테스트 계정 비밀번호: test1234)'); go('adm-data');
}

/* =========================================================
   앱 시작
   ========================================================= */
(function start() {
  Store.load();
  const u = currentUser();
  if (!u) return location.replace(PAGE_LOGIN);          // 세션 만료
  if (!DB().users.length) return location.replace(PAGE_SETUP);
  ME = u;
  $('#sbName').textContent = ME.name;
  $('#sbMeta').textContent = `${ME.team} · ${ME.empNo} · ${isAdmin() ? '관리자' : '입력자'}`;
  $('#btnLogout').onclick = () => logout();
  buildNav();
  go(isAdmin() ? 'adm-week' : 'my-home');
})();
