/* =========================================================
   signup.js — 회원가입 페이지 (signup.html)
   ========================================================= */
'use strict';

Store.load();
refreshTeamList();

$('#btnSignup').onclick = async () => {
  const name = $('#su_name').value.trim(),
    emp = $('#su_emp').value.trim(),
    team = $('#su_team').value.trim(),
    pw = $('#su_pw').value,
    pw2 = $('#su_pw2').value;

  if (!name || !emp || !team || !pw) return showAlert('#suAlert', '모든 항목을 입력하세요.');
  if (pw.length < 6) return showAlert('#suAlert', '비밀번호는 6자 이상이어야 합니다.');
  if (pw !== pw2) return showAlert('#suAlert', '비밀번호 확인이 일치하지 않습니다.');
  if (DB().users.some(u => u.empNo.toLowerCase() === emp.toLowerCase()))
    return showAlert('#suAlert', '이미 등록된 사번입니다. 로그인하거나 관리자에게 문의하세요.');

  const s = salt();
  const u = {
    id: uid(), name, empNo: emp, team, role: 'user',
    salt: s, pw: await hashPw(pw, s), createdAt: Date.now()
  };
  DB().users.push(u);
  Store.save();

  showAlert('#suAlert', '');
  setSession(u.id);
  location.replace(PAGE_APP);
};

chainEnter(['#su_name', '#su_emp', '#su_team', '#su_pw', '#su_pw2'], '#btnSignup');
$('#su_name').focus();
