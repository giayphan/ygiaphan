// Comments: list, add, moderate

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
  if (/<script|<iframe|javascript:/i.test(name+msg)) return {error:'blocked'};
  const u = b.token ? sessionUser_(b.token) : null;
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

function adminPendingComments_(b){
  if (!guardAdmin_(b, 'list_pending', '')) return {error:'unauthorized'};
  const list = rowsAsObjects_(sheet_(SH.comments))
    .filter(c => String(c.approved).toLowerCase()==='false' || c.approved===false)
    .sort((a,b)=>b.ts-a.ts).slice(0,50);
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
