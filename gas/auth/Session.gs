// User session management

function createSession_(user_id){
  const token = rid_('s_') + rid_('');
  const exp = now_() + SESSION_TTL_DAYS*86400*1000;
  sheet_(SH.sessions).appendRow([token, user_id, now_(), exp]);
  return {token, expires_at: exp};
}

function sessionUser_(token){
  if (!token || typeof token !== 'string' || token.length < 16) return null;
  const sh = sheet_(SH.sessions);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  let i = -1;
  for (let k=0;k<r.length;k++){
    if (safeEq_(String(r[k][h.indexOf('token')]), token)){ i = k; break; }
  }
  if (i<0) return null;
  if (r[i][h.indexOf('expires_at')] < now_()){ sh.deleteRow(i+2); return null; }
  const uid = r[i][h.indexOf('user_id')];
  const ush = sheet_(SH.users);
  const {idx, head} = findRow_(ush, 'user_id', uid);
  if (idx<0) return null;
  const rec = ush.getRange(idx,1,1,head.length).getValues()[0];
  return Object.fromEntries(head.map((k,i)=>[k,rec[i]]));
}

function logout_(b){
  const sh = sheet_(SH.sessions);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const i = r.findIndex(x => x[h.indexOf('token')] === b.token);
  if (i>=0) sh.deleteRow(i+2);
  return {ok:true};
}

// ส่งเฉพาะ field ที่ client ต้องใช้ + is_admin ตรวจ server-side
function pickUser_(u){
  return {
    user_id: u.user_id,
    email: u.email,
    name: u.name||'',
    avatar: u.avatar||'',
    provider: u.provider,
    is_admin: String(u.email||'').toLowerCase() === String(ADMIN_EMAIL).toLowerCase()
  };
}

function upsertUser_(u){
  const sh = sheet_(SH.users);
  const {idx, head} = findRow_(sh, 'email', u.email);
  if (idx > 0) {
    sh.getRange(idx, head.indexOf('last_login')+1).setValue(now_());
    const rec = sh.getRange(idx,1,1,head.length).getValues()[0];
    return Object.fromEntries(head.map((k,i)=>[k,rec[i]]));
  }
  const user = {
    user_id: rid_('u_'),
    email: u.email,
    name: u.name||'',
    provider: u.provider||'email',
    fb_id: u.fb_id||'',
    avatar: u.avatar||'',
    created_at: now_(),
    last_login: now_()
  };
  sh.appendRow(head.map(k => user[k] ?? ''));
  return user;
}

function getMe_(token){
  const u = sessionUser_(token);
  return u ? {ok:true, user: pickUser_(u)} : {ok:false};
}
