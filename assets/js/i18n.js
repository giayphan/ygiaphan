// OG meta tags helper
window.YP_setOG = function(opts){
  const site = window.YP_SITE||{};
  const meta = Object.assign({
    title: document.title,
    description: site.tagline_vi || site.tagline_th || 'ygiaphan',
    image: location.origin + (location.pathname.replace(/[^/]*$/, '')) + 'assets/img/logo.png',
    url: location.href,
    type: 'website'
  }, opts||{});
  const set = (key, val, attr) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el){ el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute('content', val);
  };
  set('og:title', meta.title, 'property');
  set('og:description', meta.description, 'property');
  set('og:image', meta.image, 'property');
  set('og:url', meta.url, 'property');
  set('og:type', meta.type, 'property');
  set('og:site_name', site.title||'ygiaphan', 'property');
  set('twitter:card', 'summary_large_image', 'name');
  set('twitter:title', meta.title, 'name');
  set('twitter:description', meta.description, 'name');
  set('twitter:image', meta.image, 'name');
  set('description', meta.description, 'name');
};

// Language setup: YP_LANG, YP_T, pickL, POSTS
(function(){
  const LS = 'yp:lang';
  const DEFAULT_LANG = 'vi';

  window.YP_LANG = localStorage.getItem(LS) || DEFAULT_LANG;
  window.YP_T = window.YP_LANG === 'th' ? (window.YP_I18N_TH||{}) : (window.YP_I18N_VI||{});

  window.YP_setLang = function(l){
    localStorage.setItem(LS, l);
    location.reload();
  };

  window.pickL = function(o, f){
    if (!o) return '';
    if (!f) return o[window.YP_LANG] ?? o.vi ?? o.th ?? '';
    return o[f+'_'+window.YP_LANG] ?? o[f+'_vi'] ?? o[f] ?? '';
  };

  // แปลชื่อหมวด (ไทย→ภาษาปัจจุบัน) — ถ้าไม่มีใน map ให้คืนค่าเดิม
  window.tCat = function(c){
    const m = (window.YP_T && window.YP_T.cats) || {};
    return m[c] || c;
  };

  window.POSTS = (window.YP_POST_LIST || []).map(s => window.YP_POSTS && window.YP_POSTS[s]).filter(Boolean);

  document.documentElement.lang = window.YP_LANG;
})();
