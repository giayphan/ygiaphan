// Admin authentication: key + OTP 2FA + Google Sign-In

function adminSessionUser_(token, fp){
  if (!token) return null;
  const sh = sheet_(SH.admin_sessions);
  if (!sh) return null;
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const i = r.findIndex(x => x[h.indexOf('token')] === token);
  if (i<0) return null;
  if (r[i][h.indexOf('expires_at')] < now_()) { sh.deleteRow(i+2); return null; }
  if (fp && r[i][h.indexOf('fingerprint')] !== fp) return null;
  sh.getRange(i+2, h.indexOf('last_seen')+1).setValue(now_());
  sh.getRange(i+2, h.indexOf('expires_at')+1).setValue(now_() + ADMIN_TTL_MIN*60*1000);
  return {token};
}

function requireAdmin_(b){
  return adminSessionUser_(b.admin_token, String(b.fp||''));
}

function guardAdmin_(b, action, target){
  const sess = requireAdmin_(b);
  if (!sess){
    recordFail_(b.fp, 'no_session');
    adminLog_(action, target, b.fp, false, 'unauthorized');
    return null;
  }
  adminLog_(action, target, b.fp, true, '');
  return sess;
}

function isAdmin_(k){ return safeEq_(trimKey_(k), trimKey_(ADMIN_KEY)); }

function adminIssueToken_(fp){
  const token = rid_('a_') + rid_('') + rid_('');
  const sh = sheet_(SH.admin_sessions);
  sh.appendRow([token, fp, now_(), now_() + ADMIN_TTL_MIN*60*1000, now_()]);
  adminLog_('login_ok', '', fp, true, '');
  return {ok:true, admin_token: token, expires_in: ADMIN_TTL_MIN*60};
}

// Step 1: key → send OTP to ADMIN_EMAIL
function adminLogin_(b){
  const fp = String(b.fp||'').slice(0,128);
  if (!fp) return {error:'no fingerprint'};
  if (adminFails_(fp) >= ADMIN_MAX_FAILS){
    adminLog_('login_blocked', '', fp, false, 'too many fails');
    return {error: 'locked: ลองอีกครั้งภายหลัง'};
  }
  if (!safeEq_(trimKey_(b.key), trimKey_(ADMIN_KEY))){
    recordFail_(fp, 'wrong_key');
    adminLog_('login_fail', '', fp, false, 'wrong key');
    return {error:'unauthorized'};
  }
  if (!ADMIN_2FA) return adminIssueToken_(fp);

  const otp = String(Math.floor(100000 + Math.random()*900000));
  PropertiesService.getScriptProperties().setProperty('admin_otp_'+fp,
    JSON.stringify({otp, exp: now_()+10*60*1000}));
  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: '[ygiaphan ADMIN] OTP: ' + otp,
      htmlBody: '<p>OTP เข้าสู่ระบบ admin (อายุ 10 นาที):</p>' +
        '<div style="background:#fde2e0;color:#a03020;font-size:32px;font-weight:700;letter-spacing:8px;padding:20px;text-align:center;border-radius:8px">' + otp + '</div>' +
        '<p style="color:#888;font-size:12px">ถ้าไม่ใช่คุณ — เปลี่ยน ADMIN_KEY ทันที</p>'
    });
  } catch(e){ return {error:'mail failed: '+e}; }
  adminLog_('login_step1', '', fp, true, 'OTP sent');
  return {ok:true, need_otp:true};
}

// Step 2: OTP verify → issue admin token
function adminLoginOtp_(b){
  const fp = String(b.fp||'');
  if (adminFails_(fp) >= ADMIN_MAX_FAILS) return {error:'locked'};
  const raw = PropertiesService.getScriptProperties().getProperty('admin_otp_'+fp);
  if (!raw) return {error:'no otp'};
  const data = JSON.parse(raw);
  if (data.exp < now_()) return {error:'otp expired'};
  if (!safeEq_(String(b.otp||''), data.otp)){
    recordFail_(fp, 'wrong_otp');
    adminLog_('otp_fail', '', fp, false, '');
    return {error:'wrong otp'};
  }
  PropertiesService.getScriptProperties().deleteProperty('admin_otp_'+fp);
  return adminIssueToken_(fp);
}

// Google Sign-In for admin (must match ADMIN_EMAIL)
function adminGoogleLogin_(b){
  const fp = String(b.fp||'').slice(0,128);
  const idToken = String(b.id_token||'');
  if (!idToken) return {error:'no token'};
  if (adminFails_(fp) >= 5){ adminLog_('login_blocked','',fp,false,'too many fails'); return {error:'blocked, try again later'}; }
  try {
    const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(idToken));
    const g = JSON.parse(res.getContentText());
    if (!g.sub || !g.email){ recordFail_(fp,'invalid_google'); adminLog_('admin_google_fail','',fp,false,'invalid token'); return {error:'invalid token'}; }
    if (String(g.email).toLowerCase() !== String(ADMIN_EMAIL).toLowerCase()){
      recordFail_(fp,'not_admin');
      adminLog_('admin_google_fail', g.email, fp, false, 'not admin email');
      return {error:'not authorized'};
    }
    return adminIssueToken_(fp);
  } catch(e){ return {error:'google error: '+e}; }
}

function adminLogoutCall_(b){
  const sh = sheet_(SH.admin_sessions);
  if (sh){
    const r = sh.getDataRange().getValues(); const h = r.shift();
    const i = r.findIndex(x => x[h.indexOf('token')] === b.admin_token);
    if (i>=0) sh.deleteRow(i+2);
  }
  adminLog_('logout', '', b.fp, true, '');
  return {ok:true};
}
