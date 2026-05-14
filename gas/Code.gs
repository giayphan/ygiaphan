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
const SITE_URL  = 'https://yourname.github.io/ygiaphan'; // ใช้ใน magic link
const FB_APP_ID = '';                                    // optional
const MAGIC_TTL_MIN = 15;
const SESSION_TTL_DAYS = 30;

const SH = {
  posts:'posts', comments:'comments', users:'users',
  sessions:'sessions', orders:'orders', donations:'donations',
  magic:'magic_tokens', courses:'courses'
};

// รันฟังก์ชันนี้ครั้งเดียวเพื่อขอ permission ส่งอีเมล
function authorizeMail(){
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'ygiaphan auth test', 'permissions granted ✓');
}

function setup(){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ensureSheet_(ss, SH.posts, ['slug','date','categories','icon','cover','video',
    'title_vi','title_th','desc_vi','desc_th','body_vi','body_th','published','members_only']);
  ensureSheet_(ss, SH.comments, ['ts','slug','name','msg','user_id','approved']);
  ensureSheet_(ss, SH.users, ['user_id','email','name','provider','fb_id','avatar','created_at','last_login']);
  ensureSheet_(ss, SH.sessions, ['token','user_id','created_at','expires_at']);
  ensureSheet_(ss, SH.orders, ['order_id','user_id','email','item_id','item_title','amount','currency','status','slip_url','created_at','paid_at','note']);
  ensureSheet_(ss, SH.donations, ['ts','name','amount','channel','note']);
  ensureSheet_(ss, SH.magic, ['token','email','created_at','expires_at','used']);
  ensureSheet_(ss, SH.courses, ['id','price','currency','title_vi','title_th','desc_vi','desc_th','active']);
}
function ensureSheet_(ss, name, headers){
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
}

/* ===== Router ===== */
function doGet(e){
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
    if (a === 'logout')        return json_(logout_(b));
    if (a === 'order_create')  return json_(orderCreate_(b));
    if (a === 'order_slip')    return json_(orderSubmitSlip_(b));
    if (a === 'order_status')  return json_(adminOrderStatus_(b));
    if (a === 'donate_log')    return json_(donateLog_(b));
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
function isAdmin_(k){ return trimKey_(k) === trimKey_(ADMIN_KEY); }
function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ===== Posts ===== */
function listPosts_(token){
  const u = token ? sessionUser_(token) : null;
  return rowsAsObjects_(sheet_(SH.posts))
    .filter(p => p.slug && p.published !== false && p.published !== 'false' && String(p.published).toLowerCase() !== 'false')
    .map(p => ({
      ...p,
      categories: String(p.categories||'').split(',').map(s=>s.trim()).filter(Boolean),
      members_only: p.members_only === true || String(p.members_only).toLowerCase() === 'true',
      body_vi: (p.members_only && !u) ? '' : p.body_vi,
      body_th: (p.members_only && !u) ? '' : p.body_th,
    }))
    .sort((a,b)=> String(b.date).localeCompare(String(a.date)));
}
function adminUpsertPost_(b){
  if (!isAdmin_(b.key)) return {error:'unauthorized'};
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
  if (!isAdmin_(b.key)) return {error:'unauthorized'};
  const sh = sheet_(SH.posts);
  const {idx} = findRow_(sh, 'slug', b.slug);
  if (idx<0) return {error:'not found'};
  sh.deleteRow(idx);
  return {ok:true};
}

/* ===== Comments ===== */
function listComments_(slug){
  if (!slug) return [];
  return rowsAsObjects_(sheet_(SH.comments))
    .filter(c => c.slug === slug && (c.approved !== false && String(c.approved).toLowerCase() !== 'false'))
    .map(c => ({ts:c.ts, name:c.name, msg:c.msg}))
    .sort((a,b)=> a.ts - b.ts);
}
function addComment_(b){
  const name = String(b.name||'').slice(0,50).trim();
  const msg  = String(b.msg ||'').slice(0,2000).trim();
  const slug = String(b.slug||'').trim();
  if (!name || !msg || !slug) return {error:'invalid'};
  const u = b.token ? sessionUser_(b.token) : null;
  sheet_(SH.comments).appendRow([now_(), slug, name, msg, u?u.user_id:'', true]);
  return {ok:true};
}
function adminDelComment_(b){
  if (!isAdmin_(b.key)) return {error:'unauthorized'};
  const sh = sheet_(SH.comments);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const idx = r.findIndex(x => String(x[h.indexOf('ts')]) === String(b.ts) && x[h.indexOf('slug')] === b.slug);
  if (idx<0) return {error:'not found'};
  sh.deleteRow(idx+2); return {ok:true};
}
function adminApprove_(b){
  if (!isAdmin_(b.key)) return {error:'unauthorized'};
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

    // ensure sheet exists (กันลืม run setup)
    let sh = sheet_(SH.magic);
    if (!sh) {
      ss_().insertSheet(SH.magic).appendRow(['token','email','created_at','expires_at','used']);
      sh = sheet_(SH.magic);
    }

    const otp = String(Math.floor(100000 + Math.random()*900000));
    const exp = now_() + MAGIC_TTL_MIN*60*1000;
    sh.appendRow([otp, email, now_(), exp, false]);

    // check Gmail quota ก่อนส่ง
    const remaining = MailApp.getRemainingDailyQuota();
    if (remaining < 1) return {error:'mail quota exceeded (try again tomorrow)'};

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
    return {ok:true, quota_left: remaining-1};
  } catch(e){
    return {error: 'magic_send error: ' + (e.message||e)};
  }
}
function magicVerifyApi_(b){
  const email = String(b.email||'').trim().toLowerCase();
  const otp = String(b.otp||'').trim();
  if (!email || !otp) return {error:'missing'};
  const sh = sheet_(SH.magic);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const i = r.findIndex(x => x[h.indexOf('token')] == otp && x[h.indexOf('email')] === email);
  if (i<0) return {error:'รหัสไม่ถูกต้อง'};
  if (r[i][h.indexOf('used')] === true) return {error:'รหัสถูกใช้ไปแล้ว'};
  if (r[i][h.indexOf('expires_at')] < now_()) return {error:'รหัสหมดอายุ'};
  sh.getRange(i+2, h.indexOf('used')+1).setValue(true);
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
  if (!token) return null;
  const sh = sheet_(SH.sessions);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const i = r.findIndex(x => x[h.indexOf('token')] === token);
  if (i<0) return null;
  if (r[i][h.indexOf('expires_at')] < now_()) return null;
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
function pickUser_(u){ return {user_id:u.user_id, email:u.email, name:u.name, avatar:u.avatar, provider:u.provider}; }

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
  return {ok:true, order};
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
  if (!isAdmin_(b.key)) return {error:'unauthorized'};
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
  sheet_(SH.donations).appendRow([now_(), String(b.name||'').slice(0,50), Number(b.amount)||0, String(b.channel||''), String(b.note||'').slice(0,500)]);
  return {ok:true};
}

/* ===== Admin: list all (posts/comments/orders/users) ===== */
function adminListAll_(b){
  if (!isAdmin_(b.key)) return {error:'unauthorized'};
  const users = rowsAsObjects_(sheet_(SH.users));
  const userMap = {};
  users.forEach(u => { if (u.user_id) userMap[u.user_id] = {email:u.email, name:u.name, avatar:u.avatar}; });
  const comments = rowsAsObjects_(sheet_(SH.comments))
    .sort((a,b)=>b.ts-a.ts).slice(0,200)
    .map(c => ({...c, user_email: c.user_id && userMap[c.user_id] ? userMap[c.user_id].email : ''}));
  return {
    ok:true,
    posts: rowsAsObjects_(sheet_(SH.posts)),
    comments,
    orders: rowsAsObjects_(sheet_(SH.orders)).sort((a,b)=>b.created_at-a.created_at).slice(0,200),
    users: users.slice(-200),
    donations: rowsAsObjects_(sheet_(SH.donations)).sort((a,b)=>b.ts-a.ts).slice(0,200)
  };
}
