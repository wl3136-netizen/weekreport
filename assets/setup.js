/* =========================================================
   setup.js — 최초 관리자 계정 만들기 (setup.html)
   계정이 하나도 없을 때만 열립니다. guard.js 가 진입을 통제합니다.
   ========================================================= */
'use strict';

Store.load();

const WEAK = /^(1234|0000|admin|password|qwerty|abcd|asdf)/i;

$('#btnSetup').onclick = async () => {
  const name = $('#st_name').value.trim(),
    emp = $('#st_emp').value.trim(),
    team = $('#st_team').value.trim(),
    pw = $('#st_pw').value,
    pw2 = $('#st_pw2').value;

  if (!name || !emp || !team || !pw) return showAlert('#stAlert', '모든 항목을 입력하세요.');
  if (pw.length < 8) return showAlert('#stAlert', '관리자 비밀번호는 8자 이상이어야 합니다.');
  if (WEAK.test(pw)) return showAlert('#stAlert', '추측하기 쉬운 비밀번호입니다. 다른 값을 사용하세요.');
  if (pw !== pw2) return showAlert('#stAlert', '비밀번호 확인이 일치하지 않습니다.');
  if (DB().users.length) return location.replace(PAGE_LOGIN);   // 그 사이 누가 만들었다면

  const s = salt();
  const u = {
    id: uid(), name, empNo: emp, team, role: 'admin',
    salt: s, pw: await hashPw(pw, s), createdAt: Date.now()
  };
  DB().users.push(u);
  Store.save();

  showAlert('#stAlert', '');
  setSession(u.id);
  location.replace(PAGE_APP);
};

chainEnter(['#st_name', '#st_emp', '#st_team', '#st_pw', '#st_pw2'], '#btnSetup');
$('#st_name').focus();
