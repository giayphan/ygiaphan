// Rate limiting via PropertiesService + admin fail tracking

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
