// Course orders + bookmarks + my profile

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

function myOrders_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const list = rowsAsObjects_(sheet_(SH.orders))
    .filter(x => x.user_id === u.user_id)
    .map(o => ({order_id:o.order_id, item_title:o.item_title, amount:o.amount, currency:o.currency, status:o.status, created_at:o.created_at, slip_url:o.slip_url}))
    .sort((a,b) => (b.created_at||0) - (a.created_at||0));
  return {ok:true, orders:list};
}

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
