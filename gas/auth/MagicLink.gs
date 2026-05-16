// Magic Link (email OTP) authentication

function magicSend_(b){
  try {
    const email = String(b.email||'').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return {error:'invalid email'};

    let sh = sheet_(SH.magic);
    if (!sh){
      ss_().insertSheet(SH.magic).appendRow(['token','email','created_at','expires_at','used']);
      sh = sheet_(SH.magic);
    }

    const hourAgo = now_() - 60*60*1000;
    const r = sh.getDataRange().getValues(); const h = r.shift();
    const recentForEmail = r.filter(x => x[h.indexOf('email')] === email && x[h.indexOf('created_at')] > hourAgo).length;
    if (recentForEmail >= USER_OTP_MAX_PER_EMAIL_HOUR){
      adminLog_('otp_rate_limit', email, b.fp, false, '');
      return {error:'ขอ OTP ถี่เกินไป กรุณารอ 1 ชั่วโมง'};
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
        '<p style="color:#888;font-size:12px">ถ้าคุณไม่ได้ขอรหัสนี้ ไม่ต้องทำอะไร</p></div>'
    });
    return {ok:true};
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

  const failKey = 'otp_fail_'+sha256_(email+'|'+fp).slice(0,32);
  const props = PropertiesService.getScriptProperties();
  const rec = JSON.parse(props.getProperty(failKey) || '{"n":0,"until":0}');
  if (rec.until > now_()) return {error:'ลองผิดเกินกำหนด รอ '+Math.ceil((rec.until-now_())/60000)+' นาที'};

  const sh = sheet_(SH.magic);
  const r = sh.getDataRange().getValues(); const h = r.shift();
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
