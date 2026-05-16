// Posts CRUD

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
