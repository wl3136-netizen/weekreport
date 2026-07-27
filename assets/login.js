/* =========================================================
   login.js — 로그인 페이지 (index.html)
   ========================================================= */
'use strict';

Store.load();
drawSpine();

$('#btnLogin').onclick = async () => {
  const emp = $('#li_emp').value.trim(), pw = $('#li_pw').value;
  if (!emp || !pw) return showAlert('#loginAlert', '사번과 비밀번호를 모두 입력하세요.');

  const u = DB().users.find(x => x.empNo.toLowerCase() === emp.toLowerCase());
  if (!u) return showAlert('#loginAlert', '등록되지 않은 사번입니다.');
  if (await hashPw(pw, u.salt) !== u.pw) return showAlert('#loginAlert', '비밀번호가 일치하지 않습니다.');

  showAlert('#loginAlert', '');
  setSession(u.id);
  location.replace(PAGE_APP);
};

chainEnter(['#li_emp', '#li_pw'], '#btnLogin');
$('#li_emp').focus();
