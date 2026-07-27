/* =========================================================
   guard.js — 페이지 진입 가드
   렌더 전에 동기 실행되어, 상황에 맞지 않는 페이지면 화면 깜빡임 없이 되돌려보냅니다.
   각 페이지는 이 파일보다 먼저 window.__page 를 지정합니다.
   ========================================================= */
(function () {
  var DBK = 'weekly_report_db_v1';
  var SK = 'weekly_report_session';

  /** 어디로 보낼지 결정합니다. null 이면 현재 페이지에 머뭅니다. */
  function decideRoute(page, hasUsers, hasSession) {
    if (!hasUsers) return page === 'setup' ? null : 'setup.html';   // 계정이 없으면 최초 설정부터
    if (page === 'setup') return hasSession ? 'app.html' : 'index.html'; // 설정은 끝났음
    if (page === 'app') return hasSession ? null : 'index.html';    // 앱은 로그인 필수
    return hasSession ? 'app.html' : null;                          // 로그인·가입에 이미 로그인 상태
  }
  window.__decideRoute = decideRoute;

  var users = 0, sid = null;
  try { var d = JSON.parse(localStorage.getItem(DBK) || 'null'); users = (d && d.users && d.users.length) || 0; } catch (e) { }
  try { sid = sessionStorage.getItem(SK); } catch (e) { }

  var to = decideRoute(window.__page, users > 0, !!sid);
  if (to) location.replace(to);
})();
