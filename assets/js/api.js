// ygiaphan — API client (Google Apps Script)
(function(){
  const cfg = window.YP_CONFIG || {};
  const ON  = !!(cfg.USE_API && cfg.API_URL);

  async function getJSON(url){
    const r = await fetch(url, {method:'GET'});
    return r.json();
  }
  async function postJSON(body){
    // ใช้ text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script
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
      const list = await getJSON(cfg.API_URL + '?action=posts');
      // map → window.YP_POSTS + window.YP_POST_LIST
      window.YP_POSTS = {};
      list.forEach(p => window.YP_POSTS[p.slug] = p);
      window.YP_POST_LIST = list.map(p => p.slug);
      window.POSTS = list;
      return list;
    },
    listComments(slug){ return getJSON(cfg.API_URL + '?action=comments&slug=' + encodeURIComponent(slug)); },
    addComment(slug, name, msg){ return postJSON({action:'comment', slug, name, msg}); },
    upsertPost(key, post){ return postJSON({action:'post', key, ...post}); },
    deletePost(key, slug){ return postJSON({action:'delete', key, slug}); }
  };
})();
