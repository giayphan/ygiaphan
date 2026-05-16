// ygiaphan — auth helper
(function(){
  const KEY = 'yp:session';
  const cfg = window.YP_CONFIG||{};
  // fingerprint per browser (sessionStorage = หาย เมื่อปิดบราวเซอร์ → กัน token theft cross-tab/device)
  function getFp(){
    let fp = sessionStorage.getItem('yp:fp');
    if (!fp){
      const seed = navigator.userAgent + '|' + navigator.language + '|' + screen.width;
      let h = 0; for (let i=0;i<seed.length;i++) h = ((h<<5)-h+seed.charCodeAt(i))|0;
      fp = 'fp_'+Math.abs(h).toString(36)+'_'+Math.random().toString(36).slice(2,10);
      sessionStorage.setItem('yp:fp', fp);
    }
    return fp;
  }
  const post = (body) => {
    body.fp = getFp();
    return fetch(cfg.API_URL, {
      method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify(body)
    }).then(r=>r.json());
  };

  window.YP_AUTH = {
    token(){ return localStorage.getItem(KEY) || ''; },
    setToken(t){ if(t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); },
    isLogin(){ return !!this.token(); },
    async me(){
      const t = this.token(); if (!t) return null;
      if (!cfg.API_URL) return null;
      try {
        const r = await fetch(cfg.API_URL+'?action=me&token='+encodeURIComponent(t));
        if (!r.ok) return null;
        return await r.json();
      } catch(_){ return null; }
    },
    magicSend(email){ return post({action:'magic_send', email}); },
    magicVerify(email, otp){ return post({action:'magic_verify', email, otp}); },
    fbLogin(access_token){ return post({action:'fb_login', access_token}); },
    googleLogin(id_token){ return post({action:'google_login', id_token}); },
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
