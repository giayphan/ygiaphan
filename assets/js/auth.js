// ygiaphan — auth helper
(function(){
  const KEY = 'yp:session';
  const cfg = window.YP_CONFIG||{};
  const post = (body) => fetch(cfg.API_URL, {
    method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify(body)
  }).then(r=>r.json());

  window.YP_AUTH = {
    token(){ return localStorage.getItem(KEY) || ''; },
    setToken(t){ if(t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); },
    isLogin(){ return !!this.token(); },
    async me(){
      const t = this.token(); if (!t) return null;
      try { return await fetch(cfg.API_URL+'?action=me&token='+encodeURIComponent(t)).then(r=>r.json()); }
      catch(_){ return null; }
    },
    magicSend(email){ return post({action:'magic_send', email}); },
    magicVerify(email, otp){ return post({action:'magic_verify', email, otp}); },
    fbLogin(access_token){ return post({action:'fb_login', access_token}); },
    async logout(){
      const t = this.token(); this.setToken('');
      if (t) try { await post({action:'logout', token:t}); } catch(_){}
    },
    requireLogin(){
      if (this.isLogin()) return true;
      sessionStorage.setItem('yp:back', location.pathname+location.search);
      location.href = 'login.html';
      return false;
    }
  };
})();
