// Admin dashboard: stats + list all data

function adminStats_(b){
  if (!guardAdmin_(b, 'stats', '')) return {error:'unauthorized'};
  const day = 24*60*60*1000;
  const T = now_();
  const users    = rowsAsObjects_(sheet_(SH.users));
  const comments = rowsAsObjects_(sheet_(SH.comments));
  const orders   = rowsAsObjects_(sheet_(SH.orders));
  const posts    = rowsAsObjects_(sheet_(SH.posts));

  const usersByDay = {}, signups7 = [], signups30 = [];
  users.forEach(u => {
    const t = Number(u.created_at)||0; if (!t) return;
    const d = new Date(t).toISOString().slice(0,10);
    usersByDay[d] = (usersByDay[d]||0)+1;
    if (T-t < 7*day) signups7.push(u);
    if (T-t < 30*day) signups30.push(u);
  });

  const cmtCount = {};
  comments.forEach(c => { cmtCount[c.slug] = (cmtCount[c.slug]||0)+1; });
  const topPosts = Object.entries(cmtCount).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([slug,n]) => {
      const p = posts.find(x=>x.slug===slug);
      return {slug, comments:n, title: p?(p.title_vi||p.title_th||slug):slug};
    });

  const recent = [
    ...users.slice(-10).map(u => ({type:'signup', ts:Number(u.created_at)||0, label:`👤 ${u.email||u.name||''} signed up via ${u.provider}`})),
    ...comments.slice(-10).map(c => ({type:'comment', ts:Number(c.ts)||0, label:`💬 ${c.name} commented on ${c.slug}`})),
    ...orders.slice(-10).map(o => ({type:'order', ts:Number(o.created_at)||0, label:`🛒 ${o.email} ordered ${o.item_title} (${o.status})`}))
  ].filter(x=>x.ts).sort((a,b)=>b.ts-a.ts).slice(0,20);

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

function adminListAll_(b){
  if (!guardAdmin_(b, 'list_all', '')) return {error:'unauthorized'};
  const limit = Math.min(Number(b.limit)||100, 500);
  const users = rowsAsObjects_(sheet_(SH.users));
  const userMap = {};
  users.forEach(u => { if (u.user_id) userMap[u.user_id] = {email:u.email, name:u.name}; });
  const posts = rowsAsObjects_(sheet_(SH.posts));
  const comments = rowsAsObjects_(sheet_(SH.comments))
    .sort((a,b)=>b.ts-a.ts).slice(0,limit)
    .map(c => ({
      ts:c.ts, slug:c.slug, name:c.name, msg:c.msg, approved:c.approved,
      user_email: c.user_id && userMap[c.user_id] ? userMap[c.user_id].email : ''
    }));
  const orders = rowsAsObjects_(sheet_(SH.orders))
    .sort((a,b)=>b.created_at-a.created_at).slice(0,limit)
    .map(o => ({
      order_id:o.order_id, email:o.email, item_title:o.item_title,
      amount:o.amount, currency:o.currency, status:o.status,
      slip_url:o.slip_url, created_at:o.created_at, paid_at:o.paid_at
    }));
  const usersOut = users.slice(-limit).map(u => ({
    user_id:u.user_id, email:u.email, name:u.name||'',
    avatar:u.avatar||'', provider:u.provider,
    created_at:u.created_at, last_login:u.last_login
  }));
  const donations = rowsAsObjects_(sheet_(SH.donations))
    .sort((a,b)=>b.ts-a.ts).slice(0,limit);
  return {ok:true, posts, comments, orders, users:usersOut, donations};
}
