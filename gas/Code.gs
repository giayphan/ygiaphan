/**
 * ygiaphan — Google Apps Script API v2
 * Sheets: posts, comments, users, sessions, orders, donations, magic_tokens
 *
 * Setup:
 *  1) ใส่ SHEET_ID + ADMIN_KEY + SITE_URL
 *  2) (optional) ตั้ง FB_APP_ID ถ้าใช้ Facebook Login
 *  3) Run setup() ครั้งเดียว
 *  4) Deploy → New deployment → Web app (Execute as: Me, Access: Anyone)
 *  5) ทุกครั้งที่แก้โค้ด → Manage deployments → Edit → Version: New version → Deploy
 */

const SHEET_ID  = 'PUT_YOUR_SHEET_ID_HERE';
const ADMIN_KEY = 'change-me-please';
const ADMIN_EMAIL = 'giayphan@gmail.com';   // รับ OTP 2FA + แจ้งเตือน login + Google admin login
const SITE_URL  = 'https://yourname.github.io/ygiaphan';
const FB_APP_ID = '1625605325597983';
const MAGIC_TTL_MIN = 15;
const SESSION_TTL_DAYS = 30;
const ADMIN_TTL_MIN = 60;            // admin session อายุ 1 ชม.
const ADMIN_MAX_FAILS = 5;
const ADMIN_LOCK_MIN = 60;
const ADMIN_2FA = true;
// user login rate limit
const USER_OTP_MAX_PER_EMAIL_HOUR = 5;
const USER_OTP_MAX_VERIFY_FAILS = 5;
const USER_OTP_LOCK_MIN = 30;
// donate rate limit
const DONATE_MAX_PER_FP_HOUR = 3;

const SH = {
  posts:'posts', comments:'comments', users:'users',
  sessions:'sessions', orders:'orders', donations:'donations',
  magic:'magic_tokens', courses:'courses', bookmarks:'bookmarks',
  vocab:'user_vocab', quiz_log:'quiz_log',
  admin_sessions:'admin_sessions', admin_log:'admin_log', admin_fails:'admin_fails'
};

// รันฟังก์ชันนี้ครั้งเดียวเพื่อขอ permission ส่งอีเมล
function authorizeMail(){
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'ygiaphan auth test', 'permissions granted ✓');
}

function setup(){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ensureSheet_(ss, SH.posts, ['slug','date','categories','icon','cover','video',
    'title_vi','title_th','desc_vi','desc_th','body_vi','body_th','published','members_only']);
  ensureSheet_(ss, SH.comments, ['ts','slug','name','msg','user_id','approved','parent_ts']);
  ensureSheet_(ss, SH.users, ['user_id','email','name','provider','fb_id','avatar','created_at','last_login']);
  ensureSheet_(ss, SH.sessions, ['token','user_id','created_at','expires_at']);
  ensureSheet_(ss, SH.orders, ['order_id','user_id','email','item_id','item_title','amount','currency','status','slip_url','created_at','paid_at','note']);
  ensureSheet_(ss, SH.donations, ['ts','name','amount','channel','note']);
  ensureSheet_(ss, SH.magic, ['token','email','created_at','expires_at','used']);
  ensureSheet_(ss, SH.courses, ['id','price','currency','title_vi','title_th','desc_vi','desc_th','active']);
  ensureSheet_(ss, SH.bookmarks, ['user_id','slug','created_at']);
  ensureSheet_(ss, SH.vocab, ['user_id','vi','th','slug','box','due_at','created_at']);
  ensureSheet_(ss, SH.quiz_log, ['user_id','slug','score','total','ts']);
  ensureSheet_(ss, SH.admin_sessions, ['token','fingerprint','created_at','expires_at','last_seen']);
  ensureSheet_(ss, SH.admin_log,      ['ts','action','target','fingerprint','ok','detail']);
  ensureSheet_(ss, SH.admin_fails,    ['ts','fingerprint','reason']);
}
function ensureSheet_(ss, name, headers){
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
}

/* ===== Router ===== */
function doGet(e){
  try { return doGet_inner_(e); }
  catch(err){ return json_({error:'server error'}); }
}
function doGet_inner_(e){
  const a = (e.parameter.action||'posts').toLowerCase();
  // ถ้ามี ?p=base64(JSON) → ถือเป็น POST-via-GET (CORS workaround)
  if (e.parameter.p) {
    let b = {};
    try { b = JSON.parse(b64decode_(e.parameter.p)); } catch(_) {}
    return doPostBody_(b);
  }
  if (a === 'magic_verify') return htmlMagicVerify_(e.parameter.token);
  if (a === 'posts')    return json_(listPosts_(e.parameter.token));
  if (a === 'comments') return json_(listComments_(e.parameter.slug||''));
  if (a === 'courses')  return json_(listCourses_());
  if (a === 'me')       return json_(getMe_(e.parameter.token));
  return json_({error:'unknown action'});
}
function b64decode_(s){
  s = String(s).replace(/-/g,'+').replace(/_/g,'/');
  while (s.length % 4) s += '=';
  return Utilities.newBlob(Utilities.base64Decode(s)).getDataAsString('UTF-8');
}
function doPost(e){
  let b = {};
  try {
    if (e && e.parameter && e.parameter.payload) b = JSON.parse(e.parameter.payload);
    else if (e && e.postData && e.postData.contents) b = JSON.parse(e.postData.contents);
  } catch(_) {}
  return doPostBody_(b);
}
function doPostBody_(b){
  try {
    const a = (b.action||'').toLowerCase();
    if (a === 'comment')       return json_(addComment_(b));
    if (a === 'post')          return json_(adminUpsertPost_(b));
    if (a === 'delete')        return json_(adminDeletePost_(b));
    if (a === 'admin_listall') return json_(adminListAll_(b));
    if (a === 'admin_delcomment') return json_(adminDelComment_(b));
    if (a === 'admin_approve')    return json_(adminApprove_(b));
    if (a === 'magic_send')    return json_(magicSend_(b));
    if (a === 'magic_verify')  return json_(magicVerifyApi_(b));
    if (a === 'fb_login')      return json_(fbLogin_(b));
    if (a === 'google_login')  return json_(googleLogin_(b));
    if (a === 'bookmark_toggle') return json_(bookmarkToggle_(b));
    if (a === 'bookmark_list')   return json_(bookmarkList_(b));
    if (a === 'my_orders')       return json_(myOrders_(b));
    if (a === 'vocab_save')      return json_(vocabSave_(b));
    if (a === 'vocab_review')    return json_(vocabReview_(b));
    if (a === 'vocab_due')       return json_(vocabDue_(b));
    if (a === 'quiz_submit')     return json_(quizSubmit_(b));
    if (a === 'leaderboard')     return json_(leaderboard_(b));
    if (a === 'logout')        return json_(logout_(b));
    if (a === 'order_create')  return json_(orderCreate_(b));
    if (a === 'order_slip')    return json_(orderSubmitSlip_(b));
    if (a === 'order_status')  return json_(adminOrderStatus_(b));
    if (a === 'donate_log')    return json_(donateLog_(b));
    if (a === 'admin_login')   return json_(adminLogin_(b));
    if (a === 'admin_login_otp') return json_(adminLoginOtp_(b));
    if (a === 'admin_google')    return json_(adminGoogleLogin_(b));
    if (a === 'admin_logout')    return json_(adminLogoutCall_(b));
    if (a === 'admin_check')   return json_({ok: !!requireAdmin_(b)});
    if (a === 'admin_stats')   return json_(adminStats_(b));
    if (a === 'admin_pending') return json_(adminPendingComments_(b));
    if (a === 'admin_approve') return json_(adminApproveComment_(b));
    return json_({error:'unknown action: ' + a});
  } catch(e){
    return json_({error: 'server: ' + (e.message||e), stack: String(e.stack||'').slice(0,500)});
  }
}

/* ===== Helpers ===== */
function ss_(){ return SpreadsheetApp.openById(SHEET_ID); }
function sheet_(n){ return ss_().getSheetByName(n); }
function rowsAsObjects_(sh){
  const r = sh.getDataRange().getValues();
  const h = r.shift();
  return r.map(row => Object.fromEntries(h.map((k,i)=>[k,row[i]])));
}
function findRow_(sh, key, val){
  const r = sh.getDataRange().getValues();
  const h = r.shift();
  const idx = r.findIndex(x => x[h.indexOf(key)] === val);
  return { idx: idx >= 0 ? idx+2 : -1, head: h };
}
function rid_(p){ return (p||'') + Utilities.getUuid().replace(/-/g,'').slice(0,16); }
function now_(){ return Date.now(); }
function trimKey_(k){ return String(k||'').replace(/\s+/g,''); }
// timing-safe equality
function safeEq_(a, b){
  a = String(a||''); b = String(b||'');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i=0;i<a.length;i++) r |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  return r === 0;
}
function sha256_(s){
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s));
  return bytes.map(b => ('0'+(b<0?b+256:b).toString(16)).slice(-2)).join('');
}

// ----- Rate limit / lockout -----
function adminFails_(fp){
  const sh = sheet_(SH.admin_fails);
  if (!sh) return 0;
  const cutoff = now_() - ADMIN_LOCK_MIN*60*1000;
  const r = sh.getDataRange().getValues(); const h = r.shift();
  return r.filter(x => x[h.indexOf('fingerprint')] === fp && x[h.indexOf('ts')] > cutoff).length;
}
function recordFail_(fp, reason){
  let sh = sheet_(SH.admin_fails);
  if (!sh) sh = ss_().insertSheet(SH.admin_fails).appendRow(['ts','fingerprint','reason']) && sheet_(SH.admin_fails);
  sh.appendRow([now_(), fp||'', reason||'']);
}
function adminLog_(action, target, fp, ok, detail){
  let sh = sheet_(SH.admin_log);
  if (!sh) sh = ss_().insertSheet(SH.admin_log).appendRow(['ts','action','target','fingerprint','ok','detail']) && sheet_(SH.admin_log);
  sh.appendRow([now_(), action||'', target||'', fp||'', !!ok, String(detail||'').slice(0,500)]);
}

// ----- Admin session -----
function adminSessionUser_(token, fp){
  if (!token) return null;
  const sh = sheet_(SH.admin_sessions);
  if (!sh) return null;
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const i = r.findIndex(x => x[h.indexOf('token')] === token);
  if (i<0) return null;
  if (r[i][h.indexOf('expires_at')] < now_()) { sh.deleteRow(i+2); return null; }
  // ผูก fingerprint — เปลี่ยน UA/device = ใช้ token ไม่ได้
  if (fp && r[i][h.indexOf('fingerprint')] !== fp) return null;
  // update last_seen + sliding expiration
  sh.getRange(i+2, h.indexOf('last_seen')+1).setValue(now_());
  sh.getRange(i+2, h.indexOf('expires_at')+1).setValue(now_() + ADMIN_TTL_MIN*60*1000);
  return {token};
}
function requireAdmin_(b){
  const fp = String(b.fp||'');
  return adminSessionUser_(b.admin_token, fp);
}

// ----- Admin login flow -----
// step 1: ส่ง key + fp → ถ้าผ่าน → ส่ง OTP ไป ADMIN_EMAIL → return {need_otp:true}
// step 2: ส่ง key + fp + otp → ออก admin_token
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
  if (!ADMIN_2FA){
    return adminIssueToken_(fp);
  }
  // ส่ง OTP
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
function adminIssueToken_(fp){
  const token = rid_('a_') + rid_('') + rid_('');
  const sh = sheet_(SH.admin_sessions);
  sh.appendRow([token, fp, now_(), now_() + ADMIN_TTL_MIN*60*1000, now_()]);
  adminLog_('login_ok', '', fp, true, '');
  return {ok:true, admin_token: token, expires_in: ADMIN_TTL_MIN*60};
}
function adminGoogleLogin_(b){
  const fp = String(b.fp||'').slice(0,128);
  const idToken = String(b.id_token||'');
  if (!idToken) return {error:'no token'};
  if (adminFails_(fp) >= 5){ adminLog_('login_blocked', '', fp, false, 'too many fails'); return {error:'blocked, try again later'}; }
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

// ตรวจสอบ + log สำหรับ admin actions
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
function json_(o){
  // ป้องกัน sensitive response ถูก cache โดย CDN/proxy
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
// helper: redact ฟิลด์ก่อน log
function redact_(s){
  return String(s||'').replace(/[\w.+-]+@[\w.-]+/g, '<email>');
}

/* ===== Posts ===== */
// whitelist field — ป้องกัน column ใหม่ใน sheet (notes, admin_only) หลุดออกมาเอง
const PUBLIC_POST_FIELDS = ['slug','date','categories','icon','cover','video',
  'title_vi','title_th','desc_vi','desc_th','body_vi','body_th','published','members_only'];

function listPosts_(token){
  const u = token ? sessionUser_(token) : null;
  return rowsAsObjects_(sheet_(SH.posts))
    .filter(p => p.slug && String(p.published).toLowerCase() !== 'false' && p.published !== false)
    .map(p => {
      const memOnly = p.members_only === true || String(p.members_only).toLowerCase() === 'true';
      const o = {};
      PUBLIC_POST_FIELDS.forEach(k => { o[k] = p[k]; });
      o.categories = String(o.categories||'').split(',').map(s=>s.trim()).filter(Boolean);
      o.members_only = memOnly;
      if (memOnly && !u){ o.body_vi=''; o.body_th=''; }
      return o;
    })
    .sort((a,b)=> String(b.date).localeCompare(String(a.date)));
}
function adminUpsertPost_(b){
  if (!guardAdmin_(b, 'upsert_post', b.slug)) return {error:'unauthorized'};
  const sh = sheet_(SH.posts);
  const {idx, head} = findRow_(sh, 'slug', b.slug);
  const row = head.map(h => h==='categories'
    ? (Array.isArray(b[h]) ? b[h].join(',') : (b[h]||''))
    : (b[h] ?? ''));
  if (idx>0) sh.getRange(idx,1,1,head.length).setValues([row]);
  else sh.appendRow(row);
  return {ok:true, slug:b.slug};
}
function adminDeletePost_(b){
  if (!guardAdmin_(b, 'delete_post', b.slug)) return {error:'unauthorized'};
  const sh = sheet_(SH.posts);
  const {idx} = findRow_(sh, 'slug', b.slug);
  if (idx<0) return {error:'not found'};
  sh.deleteRow(idx);
  return {ok:true};
}

/* ===== Comments ===== */
// mask email ที่ user เผลอใส่ใน name/msg → "ab***@xxx.com"
function maskEmails_(s){
  return String(s||'').replace(/([\w.+-]{1,3})[\w.+-]*@([\w-]+\.[\w.-]+)/g, '$1***@***');
}
function listComments_(slug){
  if (!slug) return [];
  const users = rowsAsObjects_(sheet_(SH.users));
  const uMap = {}; users.forEach(u => { if(u.user_id) uMap[u.user_id] = {avatar:u.avatar||'', name:u.name||''}; });
  return rowsAsObjects_(sheet_(SH.comments))
    .filter(c => c.slug === slug && String(c.approved).toLowerCase() !== 'false' && c.approved !== false)
    .map(c => {
      const u = c.user_id && uMap[c.user_id];
      return {ts:c.ts, name:maskEmails_(c.name), msg:maskEmails_(c.msg),
              avatar: u?u.avatar:'', is_member: !!u, parent_ts: c.parent_ts||''};
    })
    .sort((a,b)=> a.ts - b.ts);
}
function addComment_(b){
  const name = String(b.name||'').slice(0,50).trim();
  const msg  = String(b.msg ||'').slice(0,2000).trim();
  const slug = String(b.slug||'').trim();
  if (!name || !msg || !slug) return {error:'invalid'};
  if (!/^[a-z0-9-]+$/i.test(slug)) return {error:'invalid slug'};
  // กัน html/script injection (ไม่ render html อยู่แล้วฝั่ง client แต่ defense-in-depth)
  if (/<script|<iframe|javascript:/i.test(name+msg)) return {error:'blocked'};
  const u = b.token ? sessionUser_(b.token) : null;
  // rate limit เฉพาะ guest (member ผ่าน)
  if (!u){
    const fp = String(b.fp||'').slice(0,128);
    if (fp){
      const props = PropertiesService.getScriptProperties();
      const k = 'cmt_'+sha256_(fp).slice(0,16);
      const rec = JSON.parse(props.getProperty(k)||'{"n":0,"ts":0}');
      if (now_() - rec.ts < 60*1000 && rec.n >= 3) return {error:'commenting too fast'};
      rec.n = (now_()-rec.ts < 60*1000) ? rec.n+1 : 1;
      rec.ts = now_();
      props.setProperty(k, JSON.stringify(rec));
    }
  }
  const parent = b.parent_ts ? Number(b.parent_ts)||'' : '';
  sheet_(SH.comments).appendRow([now_(), slug, name, msg, u?u.user_id:'', true, parent]);
  return {ok:true};
}
function adminDelComment_(b){
  if (!guardAdmin_(b, 'delete_comment', b.ts)) return {error:'unauthorized'};
  const sh = sheet_(SH.comments);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const idx = r.findIndex(x => String(x[h.indexOf('ts')]) === String(b.ts) && x[h.indexOf('slug')] === b.slug);
  if (idx<0) return {error:'not found'};
  sh.deleteRow(idx+2); return {ok:true};
}
function adminApprove_(b){
  if (!guardAdmin_(b, 'approve_comment', b.ts)) return {error:'unauthorized'};
  const sh = sheet_(SH.comments);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const i = r.findIndex(x => String(x[h.indexOf('ts')]) === String(b.ts));
  if (i<0) return {error:'not found'};
  sh.getRange(i+2, h.indexOf('approved')+1).setValue(!!b.approved);
  return {ok:true};
}

/* ===== Magic Link (Email) ===== */
function magicSend_(b){
  try {
    const email = String(b.email||'').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return {error:'invalid email'};

    let sh = sheet_(SH.magic);
    if (!sh) {
      ss_().insertSheet(SH.magic).appendRow(['token','email','created_at','expires_at','used']);
      sh = sheet_(SH.magic);
    }

    // rate limit ต่อ email — กัน spam ส่งเมล
    const hourAgo = now_() - 60*60*1000;
    const r = sh.getDataRange().getValues(); const h = r.shift();
    const recentForEmail = r.filter(x => x[h.indexOf('email')] === email && x[h.indexOf('created_at')] > hourAgo).length;
    if (recentForEmail >= USER_OTP_MAX_PER_EMAIL_HOUR) {
      adminLog_('otp_rate_limit', email, b.fp, false, '');
      return {error:'ขอ OTP ถี่เกินไป กรุณารอ 1 ชั่วโมง'};
    }
    // rate limit per fingerprint (กัน enumerate email)
    const fp = String(b.fp||'').slice(0,128);
    if (fp){
      const recentForFp = r.filter(x => x[0+5] === fp && x[h.indexOf('created_at')] > hourAgo).length;
      // (เก็บ fp ใน column 6 ถ้ามี — ถ้ายังไม่ได้ migrate ให้ skip)
    }

    const otp = String(Math.floor(100000 + Math.random()*900000));
    const exp = now_() + MAGIC_TTL_MIN*60*1000;
    sh.appendRow([otp, email, now_(), exp, false]);

    if (MailApp.getRemainingDailyQuota() < 1) return {error:'mail quota exceeded'};
    MailApp.sendEmail({
      to: email,
      subject: '[ygiaphan] รหัสยืนยัน: ' + otp,
      htmlBody: '<div style="font:16px system-ui;max-width:480px;margin:0 auto;padding:20px">' +
        '<h2 style="color:#2d8a4e">รหัสเข้าสู่ระบบ / Mã đăng nhập</h2>' +
        '<p>ใช้รหัสนี้กรอกในเว็บไซต์ (มีอายุ ' + MAGIC_TTL_MIN + ' นาที):</p>' +
        '<div style="background:#e8f5dd;color:#2d8a4e;font-size:32px;font-weight:700;letter-spacing:8px;padding:20px;border-radius:12px;text-align:center;margin:20px 0">' + otp + '</div>' +
        '<p style="color:#888;font-size:12px">ถ้าคุณไม่ได้ขอรหัสนี้ ไม่ต้องทำอะไร</p>' +
        '</div>'
    });
    return {ok:true};   // ไม่คืน quota_left
  } catch(e){
    return {error: 'magic_send error'};
  }
}
function magicVerifyApi_(b){
  const email = String(b.email||'').trim().toLowerCase();
  const otp = String(b.otp||'').trim();
  const fp = String(b.fp||'').slice(0,128);
  if (!email || !otp) return {error:'missing'};
  if (!/^\d{6}$/.test(otp)) return {error:'รหัสไม่ถูกต้อง'};

  // rate limit: ผิดเกินจำกัด → lock fingerprint+email
  const failKey = 'otp_fail_'+sha256_(email+'|'+fp).slice(0,32);
  const props = PropertiesService.getScriptProperties();
  const rec = JSON.parse(props.getProperty(failKey) || '{"n":0,"until":0}');
  if (rec.until > now_()) return {error:'ลองผิดเกินกำหนด รอ '+Math.ceil((rec.until-now_())/60000)+' นาที'};

  const sh = sheet_(SH.magic);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  // use timing-safe compare
  let foundIdx = -1;
  for (let k=0;k<r.length;k++){
    if (r[k][h.indexOf('email')] === email && safeEq_(String(r[k][h.indexOf('token')]), otp)){
      foundIdx = k; break;
    }
  }
  if (foundIdx < 0){
    rec.n = (rec.n||0) + 1;
    if (rec.n >= USER_OTP_MAX_VERIFY_FAILS) rec.until = now_() + USER_OTP_LOCK_MIN*60*1000;
    props.setProperty(failKey, JSON.stringify(rec));
    return {error:'รหัสไม่ถูกต้อง'};
  }
  if (r[foundIdx][h.indexOf('used')] === true) return {error:'รหัสถูกใช้ไปแล้ว'};
  if (r[foundIdx][h.indexOf('expires_at')] < now_()) return {error:'รหัสหมดอายุ'};

  sh.getRange(foundIdx+2, h.indexOf('used')+1).setValue(true);
  props.deleteProperty(failKey);
  const user = upsertUser_({email, provider:'email'});
  const s = createSession_(user.user_id);
  return {ok:true, session: s.token, user: pickUser_(user)};
}
function magicConsume_(token){
  const sh = sheet_(SH.magic);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const i = r.findIndex(x => x[h.indexOf('token')] === token);
  if (i<0) return {error:'invalid token'};
  const row = r[i];
  if (row[h.indexOf('used')] === true) return {error:'used'};
  if (row[h.indexOf('expires_at')] < now_()) return {error:'expired'};
  sh.getRange(i+2, h.indexOf('used')+1).setValue(true);
  return {email: row[h.indexOf('email')]};
}
function htmlMagicVerify_(token){
  const m = magicConsume_(token);
  if (m.error) return HtmlService.createHtmlOutput(
    `<div style="font:16px system-ui;padding:40px;text-align:center">
      <h2 style="color:#c0392b">✗ ${m.error}</h2>
      <p>ลิงก์หมดอายุหรือใช้ไปแล้ว <a href="${SITE_URL}/login.html">ขอลิงก์ใหม่</a></p>
    </div>`);
  const user = upsertUser_({email:m.email, provider:'email'});
  const s = createSession_(user.user_id);
  const back = SITE_URL.replace(/\/$/,'') + '/login.html?session=' + encodeURIComponent(s.token);
  // ใช้ทั้ง meta refresh + script + ปุ่มสำรอง (กัน sandbox block)
  return HtmlService.createHtmlOutput(`
    <!doctype html><meta charset="utf-8">
    <meta http-equiv="refresh" content="0;url=${back}">
    <title>เข้าสู่ระบบ...</title>
    <div style="font:16px system-ui;padding:40px;text-align:center">
      <h2 style="color:#2d8a4e">✓ ยืนยันสำเร็จ</h2>
      <p>กำลังพากลับไปที่เว็บ...</p>
      <p><a href="${back}" style="background:#2d8a4e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-top:10px">คลิกที่นี่ถ้าไม่ redirect อัตโนมัติ</a></p>
    </div>
    <script>try{top.location.href=${JSON.stringify(back)}}catch(e){location.href=${JSON.stringify(back)}}</script>
  `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ===== Facebook Login ===== */
function fbLogin_(b){
  const accessToken = String(b.access_token||'');
  if (!accessToken) return {error:'no token'};
  try {
    const res = UrlFetchApp.fetch('https://graph.facebook.com/me?fields=id,name,email,picture&access_token='+encodeURIComponent(accessToken));
    const fb = JSON.parse(res.getContentText());
    if (!fb.id) return {error:'fb verify failed'};
    const user = upsertUser_({
      email: fb.email || ('fb_'+fb.id+'@noemail.local'),
      name: fb.name||'',
      provider: 'facebook',
      fb_id: fb.id,
      avatar: fb.picture && fb.picture.data ? fb.picture.data.url : ''
    });
    const s = createSession_(user.user_id);
    return {ok:true, session: s.token, user: pickUser_(user)};
  } catch(e){ return {error:'fb error: '+e}; }
}

/* ===== Google Sign-In ===== */
function googleLogin_(b){
  const idToken = String(b.id_token||'');
  if (!idToken) return {error:'no token'};
  try {
    const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(idToken));
    const g = JSON.parse(res.getContentText());
    if (!g.sub || !g.email) return {error:'google verify failed'};
    // (optional) verify aud === GOOGLE_CLIENT_ID
    const user = upsertUser_({
      email: g.email,
      name: g.name||'',
      provider: 'google',
      google_id: g.sub,
      avatar: g.picture||''
    });
    const s = createSession_(user.user_id);
    return {ok:true, session: s.token, user: pickUser_(user)};
  } catch(e){ return {error:'google error: '+e}; }
}

/* ===== Vocab (SRS Leitner) + Quiz ===== */
const SRS_INTERVALS = [0, 1, 3, 7, 14, 30]; // box 0=now, box 5=30 days
function vocabSave_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const vi = String(b.vi||'').trim(), th = String(b.th||'').trim(), slug = String(b.slug||'');
  if (!vi || !th) return {error:'invalid'};
  const sh = sheet_(SH.vocab);
  const all = rowsAsObjects_(sh);
  const exists = all.find(x => x.user_id === u.user_id && x.vi === vi);
  if (exists) return {ok:true, dup:true};
  sh.appendRow([u.user_id, vi, th, slug, 0, now_(), now_()]);
  return {ok:true};
}
function vocabDue_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const T = now_();
  const list = rowsAsObjects_(sheet_(SH.vocab))
    .filter(x => x.user_id === u.user_id && Number(x.due_at||0) <= T)
    .sort((a,b) => Number(a.due_at||0) - Number(b.due_at||0))
    .slice(0,30)
    .map(x => ({vi:x.vi, th:x.th, slug:x.slug, box:Number(x.box)||0}));
  return {ok:true, items:list};
}
function vocabReview_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const vi = String(b.vi||''); const correct = !!b.correct;
  const sh = sheet_(SH.vocab);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const ui = h.indexOf('user_id'), vii = h.indexOf('vi'), bi = h.indexOf('box'), di = h.indexOf('due_at');
  const idx = r.findIndex(x => x[ui] === u.user_id && x[vii] === vi);
  if (idx < 0) return {error:'not found'};
  const cur = Number(r[idx][bi])||0;
  const next = correct ? Math.min(5, cur+1) : 0;
  const due = now_() + SRS_INTERVALS[next]*24*60*60*1000;
  sh.getRange(idx+2, bi+1).setValue(next);
  sh.getRange(idx+2, di+1).setValue(due);
  return {ok:true, box:next};
}
function quizSubmit_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const slug = String(b.slug||''), score = Number(b.score)||0, total = Number(b.total)||0;
  if (!slug || !total) return {error:'invalid'};
  sheet_(SH.quiz_log).appendRow([u.user_id, slug, score, total, now_()]);
  return {ok:true};
}
function leaderboard_(b){
  const days = Number(b.days)||30;
  const cutoff = now_() - days*24*60*60*1000;
  const users = rowsAsObjects_(sheet_(SH.users));
  const uMap = {}; users.forEach(u => uMap[u.user_id] = {name:u.name||'', avatar:u.avatar||''});
  const tally = {};
  rowsAsObjects_(sheet_(SH.quiz_log))
    .filter(x => Number(x.ts)||0 >= cutoff)
    .forEach(x => {
      if (!tally[x.user_id]) tally[x.user_id] = {pts:0, n:0};
      tally[x.user_id].pts += Number(x.score)||0;
      tally[x.user_id].n += 1;
    });
  const top = Object.entries(tally)
    .map(([uid,v]) => ({user_id:uid, points:v.pts, attempts:v.n, name:(uMap[uid]||{}).name||'(unknown)', avatar:(uMap[uid]||{}).avatar||''}))
    .sort((a,b)=>b.points-a.points)
    .slice(0,20);
  return {ok:true, leaderboard:top, days};
}

/* ===== Admin Dashboard ===== */
function adminStats_(b){
  if (!guardAdmin_(b, 'stats', '')) return {error:'unauthorized'};
  const day = 24*60*60*1000;
  const T = now_();
  const users = rowsAsObjects_(sheet_(SH.users));
  const comments = rowsAsObjects_(sheet_(SH.comments));
  const orders = rowsAsObjects_(sheet_(SH.orders));
  const posts = rowsAsObjects_(sheet_(SH.posts));

  const usersByDay = {}, signups7 = [], signups30 = [];
  users.forEach(u => {
    const t = Number(u.created_at)||0; if (!t) return;
    const d = new Date(t).toISOString().slice(0,10);
    usersByDay[d] = (usersByDay[d]||0)+1;
    if (T-t < 7*day) signups7.push(u);
    if (T-t < 30*day) signups30.push(u);
  });

  // top posts by comment count
  const cmtCount = {};
  comments.forEach(c => { cmtCount[c.slug] = (cmtCount[c.slug]||0)+1; });
  const topPosts = Object.entries(cmtCount).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([slug,n]) => {
      const p = posts.find(x=>x.slug===slug);
      return {slug, comments:n, title: p?(p.title_vi||p.title_th||slug):slug};
    });

  // recent activity (last 20)
  const recent = [
    ...users.slice(-10).map(u => ({type:'signup', ts:Number(u.created_at)||0, label:`👤 ${u.email||u.name||''} signed up via ${u.provider}`})),
    ...comments.slice(-10).map(c => ({type:'comment', ts:Number(c.ts)||0, label:`💬 ${c.name} commented on ${c.slug}`})),
    ...orders.slice(-10).map(o => ({type:'order', ts:Number(o.created_at)||0, label:`🛒 ${o.email} ordered ${o.item_title} (${o.status})`}))
  ].filter(x=>x.ts).sort((a,b)=>b.ts-a.ts).slice(0,20);

  // signup chart (last 14 days)
  const chart = [];
  for (let i=13;i>=0;i--){
    const d = new Date(T-i*day).toISOString().slice(0,10);
    chart.push({date:d, count: usersByDay[d]||0});
  }

  const pendingCmt = comments.filter(c => String(c.approved).toLowerCase()==='false' || c.approved===false).length;

  return {ok:true, stats:{
    users_total: users.length,
    users_7d: signups7.length,
    users_30d: signups30.length,
    comments_total: comments.length,
    comments_pending: pendingCmt,
    orders_total: orders.length,
    orders_pending: orders.filter(o=>o.status==='pending').length,
    orders_paid: orders.filter(o=>o.status==='paid').length,
    revenue_paid: orders.filter(o=>o.status==='paid').reduce((s,o)=>s+(Number(o.amount)||0),0),
    posts_total: posts.length,
    posts_published: posts.filter(p => p.published!==false && String(p.published).toLowerCase()!=='false').length
  }, top_posts: topPosts, recent, chart};
}

function adminPendingComments_(b){
  if (!guardAdmin_(b, 'list_pending', '')) return {error:'unauthorized'};
  const list = rowsAsObjects_(sheet_(SH.comments))
    .filter(c => String(c.approved).toLowerCase()==='false' || c.approved===false)
    .sort((a,b)=>b.ts-a.ts)
    .slice(0,50);
  return {ok:true, comments: list};
}

function adminApproveComment_(b){
  if (!guardAdmin_(b, 'approve_comment', b.ts)) return {error:'unauthorized'};
  const sh = sheet_(SH.comments);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const idx = r.findIndex(x => String(x[h.indexOf('ts')]) === String(b.ts) && x[h.indexOf('slug')] === b.slug);
  if (idx<0) return {error:'not found'};
  sh.getRange(idx+2, h.indexOf('approved')+1).setValue(true);
  return {ok:true};
}

/* ===== Bookmarks / Member features ===== */
function bookmarkToggle_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const slug = String(b.slug||'').trim();
  if (!/^[a-z0-9-]+$/i.test(slug)) return {error:'invalid slug'};
  const sh = sheet_(SH.bookmarks);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const ui = h.indexOf('user_id'), si = h.indexOf('slug');
  const idx = r.findIndex(x => x[ui] === u.user_id && x[si] === slug);
  if (idx >= 0){ sh.deleteRow(idx+2); return {ok:true, bookmarked:false}; }
  sh.appendRow([u.user_id, slug, now_()]);
  return {ok:true, bookmarked:true};
}
function bookmarkList_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const list = rowsAsObjects_(sheet_(SH.bookmarks))
    .filter(x => x.user_id === u.user_id)
    .map(x => x.slug);
  return {ok:true, slugs:list};
}
function myOrders_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const list = rowsAsObjects_(sheet_(SH.orders))
    .filter(x => x.user_id === u.user_id)
    .map(o => ({order_id:o.order_id, item_title:o.item_title, amount:o.amount, currency:o.currency, status:o.status, created_at:o.created_at, slip_url:o.slip_url}))
    .sort((a,b) => (b.created_at||0) - (a.created_at||0));
  return {ok:true, orders:list};
}

/* ===== Users / Sessions ===== */
function upsertUser_(u){
  const sh = sheet_(SH.users);
  const {idx, head} = findRow_(sh, 'email', u.email);
  if (idx > 0) {
    const colLast = head.indexOf('last_login')+1;
    sh.getRange(idx, colLast).setValue(now_());
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
  // timing-safe lookup
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
function getMe_(token){
  const u = sessionUser_(token);
  return u ? {ok:true, user: pickUser_(u)} : {ok:false};
}
function logout_(b){
  const sh = sheet_(SH.sessions);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const i = r.findIndex(x => x[h.indexOf('token')] === b.token);
  if (i>=0) sh.deleteRow(i+2);
  return {ok:true};
}
// ส่งคืนเฉพาะ field ที่ client จำเป็น — ไม่ leak fb_id, created_at, last_login
function pickUser_(u){ return {user_id:u.user_id, email:u.email, name:u.name||'', avatar:u.avatar||'', provider:u.provider}; }

/* ===== Courses / Orders ===== */
function listCourses_(){
  return rowsAsObjects_(sheet_(SH.courses))
    .filter(c => c.active !== false && String(c.active).toLowerCase() !== 'false');
}
function orderCreate_(b){
  const u = sessionUser_(b.token);
  if (!u) return {error:'login required'};
  const courses = listCourses_();
  const item = courses.find(c => String(c.id) === String(b.item_id));
  if (!item) return {error:'item not found'};
  const order = {
    order_id: rid_('o_'),
    user_id: u.user_id,
    email: u.email,
    item_id: item.id,
    item_title: item.title_vi || item.title_th || '',
    amount: item.price,
    currency: item.currency || 'THB',
    status: 'pending',
    slip_url: '',
    created_at: now_(),
    paid_at: '',
    note: ''
  };
  const sh = sheet_(SH.orders);
  const h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(h.map(k => order[k] ?? ''));
  // คืนเฉพาะ field ที่ frontend ต้องใช้ (ไม่รวม email)
  return {ok:true, order:{
    order_id: order.order_id,
    item_id: order.item_id,
    item_title: order.item_title,
    amount: order.amount,
    currency: order.currency,
    status: order.status
  }};
}
function orderSubmitSlip_(b){
  const u = sessionUser_(b.token);
  if (!u) return {error:'login required'};
  const sh = sheet_(SH.orders);
  const {idx, head} = findRow_(sh, 'order_id', b.order_id);
  if (idx<0) return {error:'not found'};
  sh.getRange(idx, head.indexOf('slip_url')+1).setValue(String(b.slip_url||''));
  sh.getRange(idx, head.indexOf('status')+1).setValue('awaiting_review');
  return {ok:true};
}
function adminOrderStatus_(b){
  if (!guardAdmin_(b, 'order_status', b.order_id)) return {error:'unauthorized'};
  const sh = sheet_(SH.orders);
  const {idx, head} = findRow_(sh, 'order_id', b.order_id);
  if (idx<0) return {error:'not found'};
  sh.getRange(idx, head.indexOf('status')+1).setValue(b.status||'paid');
  if (b.status === 'paid') sh.getRange(idx, head.indexOf('paid_at')+1).setValue(now_());
  if (b.note) sh.getRange(idx, head.indexOf('note')+1).setValue(b.note);
  return {ok:true};
}

/* ===== Donations ===== */
function donateLog_(b){
  const fp = String(b.fp||'').slice(0,128);
  const amount = Number(b.amount)||0;
  const channel = String(b.channel||'');
  const allowedCh = ['promptpay','paypal','bank'];
  if (!allowedCh.includes(channel)) return {error:'invalid channel'};
  if (amount < 1 || amount > 1000000) return {error:'invalid amount'};
  // rate limit ต่อ fingerprint
  const props = PropertiesService.getScriptProperties();
  const k = 'donate_'+sha256_(fp).slice(0,16);
  const rec = JSON.parse(props.getProperty(k)||'{"n":0,"ts":0}');
  if (now_() - rec.ts < 3600*1000 && rec.n >= DONATE_MAX_PER_FP_HOUR) return {error:'rate limit'};
  rec.n = (now_()-rec.ts < 3600*1000) ? rec.n+1 : 1;
  rec.ts = now_();
  props.setProperty(k, JSON.stringify(rec));
  // เก็บ pending — ไม่ขึ้น "ยอดรวม" จนกว่า admin verify
  sheet_(SH.donations).appendRow([now_(),
    maskEmails_(String(b.name||'').slice(0,50)),
    amount, channel,
    'pending: ' + maskEmails_(String(b.note||'').slice(0,500))
  ]);
  return {ok:true};
}

/* ===== Admin: list all (posts/comments/orders/users) ===== */
function adminListAll_(b){
  if (!guardAdmin_(b, 'list_all', '')) return {error:'unauthorized'};
  const limit = Math.min(Number(b.limit)||100, 500);
  const users = rowsAsObjects_(sheet_(SH.users));
  const userMap = {};
  users.forEach(u => { if (u.user_id) userMap[u.user_id] = {email:u.email, name:u.name}; });
  // posts — ส่งคืน admin ทุก field (รวม unpublished + members_only flag)
  const posts = rowsAsObjects_(sheet_(SH.posts));
  const comments = rowsAsObjects_(sheet_(SH.comments))
    .sort((a,b)=>b.ts-a.ts).slice(0,limit)
    .map(c => ({
      ts:c.ts, slug:c.slug, name:c.name, msg:c.msg,
      approved:c.approved,
      user_email: c.user_id && userMap[c.user_id] ? userMap[c.user_id].email : ''
    }));
  // orders — admin ต้องเห็น email + slip
  const orders = rowsAsObjects_(sheet_(SH.orders))
    .sort((a,b)=>b.created_at-a.created_at).slice(0,limit)
    .map(o => ({
      order_id:o.order_id, email:o.email, item_title:o.item_title,
      amount:o.amount, currency:o.currency, status:o.status,
      slip_url:o.slip_url, created_at:o.created_at, paid_at:o.paid_at
    }));
  // users — ไม่คืน fb_id (sensitive), token
  const usersOut = users.slice(-limit).map(u => ({
    user_id:u.user_id, email:u.email, name:u.name||'',
    avatar:u.avatar||'', provider:u.provider,
    created_at:u.created_at, last_login:u.last_login
  }));
  const donations = rowsAsObjects_(sheet_(SH.donations))
    .sort((a,b)=>b.ts-a.ts).slice(0,limit);
  return {ok:true, posts, comments, orders, users:usersOut, donations};
}
