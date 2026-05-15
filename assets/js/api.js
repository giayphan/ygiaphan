// ygiaphan — API client (Google Apps Script)
(function(){
  const cfg = window.YP_CONFIG || {};
  const ON  = !!(cfg.USE_API && cfg.API_URL);

  async function getJSON(url){
    const r = await fetch(url, {method:'GET'});
    return r.json();
  }
  async function postJSON(body){
    // text/plain + body JSON = simple request → ไม่ trigger CORS preflight
    const r = await fetch(cfg.API_URL, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify(body)
    });
    return r.json();
  }

  window.YP_API = {
    on: ON,
    async loadPosts(){
      if (!ON) return null;
      const token = window.YP_AUTH ? window.YP_AUTH.token() : '';
      const list = await getJSON(cfg.API_URL + '?action=posts' + (token?'&token='+encodeURIComponent(token):''));
      // map → window.YP_POSTS + window.YP_POST_LIST
      window.YP_POSTS = {};
      list.forEach(p => window.YP_POSTS[p.slug] = p);
      window.YP_POST_LIST = list.map(p => p.slug);
      window.POSTS = list;
      return list;
    },
    listComments(slug){ return getJSON(cfg.API_URL + '?action=comments&slug=' + encodeURIComponent(slug)); },
    addComment(slug, name, msg){
      const token = window.YP_AUTH ? window.YP_AUTH.token() : '';
      const parent_ts = arguments[3] || '';
      return postJSON({action:'comment', slug, name, msg, token, parent_ts});
    },
    listCourses(){ return getJSON(cfg.API_URL + '?action=courses'); },
    orderCreate(item_id){ return postJSON({action:'order_create', token: window.YP_AUTH.token(), item_id}); },
    orderSubmitSlip(order_id, slip_url){ return postJSON({action:'order_slip', token: window.YP_AUTH.token(), order_id, slip_url}); },
    donateLog(name, amount, channel, note){ return postJSON({action:'donate_log', name, amount, channel, note}); },
    bookmarkToggle(slug){ return postJSON({action:'bookmark_toggle', token: window.YP_AUTH.token(), slug}); },
    bookmarkList(){ return postJSON({action:'bookmark_list', token: window.YP_AUTH.token()}); },
    myOrders(){ return postJSON({action:'my_orders', token: window.YP_AUTH.token()}); },
    vocabSave(vi,th,slug){ return postJSON({action:'vocab_save', token: window.YP_AUTH.token(), vi, th, slug}); },
    vocabDue(){ return postJSON({action:'vocab_due', token: window.YP_AUTH.token()}); },
    vocabReview(vi, correct){ return postJSON({action:'vocab_review', token: window.YP_AUTH.token(), vi, correct}); },
    quizSubmit(slug, score, total){ return postJSON({action:'quiz_submit', token: window.YP_AUTH.token(), slug, score, total}); },
    leaderboard(days){ return postJSON({action:'leaderboard', days: days||30}); },
    thanksList(){ return getJSON(cfg.API_URL + '?action=thanks_list'); },
    upsertPost(key, post){ return postJSON({action:'post', key, ...post}); },
    deletePost(key, slug){ return postJSON({action:'delete', key, slug}); }
  };
})();
