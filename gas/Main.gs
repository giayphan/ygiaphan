/**
 * ygiaphan — Google Apps Script API v2
 *
 * Setup (ทำครั้งเดียว):
 *  1. Project Settings → Script Properties → เพิ่ม:
 *       SHEET_ID   = <id ของ Google Sheet>
 *       ADMIN_KEY  = <รหัสผ่าน admin ที่ต้องการ>
 *       ADMIN_EMAIL = <อีเมล admin>
 *       SITE_URL   = https://yourname.github.io/ygiaphan
 *       FB_APP_ID  = <Facebook App ID (ถ้าใช้)>
 *  2. Run setup() ครั้งเดียว (สร้าง sheet tabs)
 *  3. Deploy → New deployment → Web app
 *       Execute as: Me  |  Access: Anyone
 *  4. Copy /exec URL → ใส่ใน content/config.js
 */

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
  ensureSheet_(ss, SH.admin_log, ['ts','action','target','fingerprint','ok','detail']);
  ensureSheet_(ss, SH.admin_fails, ['ts','fingerprint','reason']);
}

/* ===== Router ===== */
function doGet(e){
  try { return doGet_inner_(e); }
  catch(err){ return json_({error:'server error'}); }
}

function doGet_inner_(e){
  const a = (e.parameter.action||'posts').toLowerCase();
  if (e.parameter.p) {
    let b = {};
    try { b = JSON.parse(b64decode_(e.parameter.p)); } catch(_) {}
    return doPostBody_(b);
  }
  if (a === 'magic_verify') return htmlMagicVerify_(e.parameter.token);
  if (a === 'posts')      return json_(listPosts_(e.parameter.token));
  if (a === 'comments')   return json_(listComments_(e.parameter.slug||''));
  if (a === 'courses')    return json_(listCourses_());
  if (a === 'me')         return json_(getMe_(e.parameter.token));
  if (a === 'thanks_list') return json_(thanksList_());
  return json_({error:'unknown action'});
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
    if (a === 'comment')          return json_(addComment_(b));
    if (a === 'post')             return json_(adminUpsertPost_(b));
    if (a === 'delete')           return json_(adminDeletePost_(b));
    if (a === 'admin_listall')    return json_(adminListAll_(b));
    if (a === 'admin_delcomment') return json_(adminDelComment_(b));
    if (a === 'admin_approve')    return json_(adminApprove_(b));
    if (a === 'magic_send')       return json_(magicSend_(b));
    if (a === 'magic_verify')     return json_(magicVerifyApi_(b));
    if (a === 'fb_login')         return json_(fbLogin_(b));
    if (a === 'google_login')     return json_(googleLogin_(b));
    if (a === 'bookmark_toggle')  return json_(bookmarkToggle_(b));
    if (a === 'bookmark_list')    return json_(bookmarkList_(b));
    if (a === 'my_orders')        return json_(myOrders_(b));
    if (a === 'vocab_save')       return json_(vocabSave_(b));
    if (a === 'vocab_review')     return json_(vocabReview_(b));
    if (a === 'vocab_due')        return json_(vocabDue_(b));
    if (a === 'quiz_submit')      return json_(quizSubmit_(b));
    if (a === 'leaderboard')      return json_(leaderboard_(b));
    if (a === 'thanks_list')      return json_(thanksList_());
    if (a === 'logout')           return json_(logout_(b));
    if (a === 'order_create')     return json_(orderCreate_(b));
    if (a === 'order_slip')       return json_(orderSubmitSlip_(b));
    if (a === 'order_status')     return json_(adminOrderStatus_(b));
    if (a === 'donate_log')       return json_(donateLog_(b));
    if (a === 'admin_login')      return json_(adminLogin_(b));
    if (a === 'admin_login_otp')  return json_(adminLoginOtp_(b));
    if (a === 'admin_google')     return json_(adminGoogleLogin_(b));
    if (a === 'admin_logout')     return json_(adminLogoutCall_(b));
    if (a === 'admin_check')      return json_({ok: !!requireAdmin_(b)});
    if (a === 'admin_stats')      return json_(adminStats_(b));
    if (a === 'admin_pending')    return json_(adminPendingComments_(b));
    return json_({error:'unknown action: ' + a});
  } catch(e){
    return json_({error: 'server: ' + (e.message||e), stack: String(e.stack||'').slice(0,500)});
  }
}
