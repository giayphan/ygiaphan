// ygiaphan core — i18n, header/footer, helpers
(function(){
  const LS = 'yp:lang';
  const DEFAULT_LANG = 'vi';

  // Current language
  window.YP_LANG = localStorage.getItem(LS) || DEFAULT_LANG;
  window.YP_T = window.YP_LANG === 'th' ? (window.YP_I18N_TH||{}) : (window.YP_I18N_VI||{});

  window.YP_setLang = function(l){
    localStorage.setItem(LS, l);
    location.reload();
  };

  // pick localized field: pickL(obj, 'title') -> obj.title_vi / obj.title_th
  window.pickL = function(o, f){
    if (!o) return '';
    if (!f) return o[window.YP_LANG] ?? o.vi ?? o.th ?? '';
    return o[f+'_'+window.YP_LANG] ?? o[f+'_vi'] ?? o[f] ?? '';
  };

  // Build posts array (from window.YP_POSTS keyed by slug, ordered by YP_POST_LIST)
  window.POSTS = (window.YP_POST_LIST || []).map(s => window.YP_POSTS && window.YP_POSTS[s]).filter(Boolean);

  // Apply <html lang>
  document.documentElement.lang = window.YP_LANG;
})();

(function init(){
  const site = window.YP_SITE || {};
  const nav  = window.YP_NAV  || [];
  const T = window.YP_T;

  // Header
  const header = `<header class="site-header">
    <div class="container site-header__row">
      <a class="brand" href="index.html">
        <span class="brand__mark">YP</span>
        <span class="brand__name">${site.title || ''}</span>
        <span class="brand__tag">${window.YP_LANG==='th' ? (site.tagline_th||'') : (site.tagline_vi||'')}</span>
      </a>
      <button class="nav-toggle" aria-label="menu" aria-expanded="false">☰</button>
      <nav class="nav">
        ${nav.map(item => {
          const label = window.pickL(item);
          if (item.children) {
            return `<div class="nav__group">
              <button class="nav__link">${label} ▾</button>
              <div class="nav__menu">${item.children.map(c => `<a href="${c.url}">${window.pickL(c)}</a>`).join('')}</div>
            </div>`;
          }
          return `<a class="nav__link" href="${item.url}">${label}</a>`;
        }).join('')}
        <button class="lang-switch" title="Change language">🌐 ${T.switch_lang||'TH'}</button>
        <a class="nav__link nav__login" href="login.html">👤</a>
      </nav>
    </div>
  </header>`;

  const social = [];
  if (site.social?.facebook) social.push(`<a href="${site.social.facebook}">Facebook</a>`);
  if (site.social?.youtube)  social.push(`<a href="${site.social.youtube}">YouTube</a>`);
  if (site.social?.tiktok)   social.push(`<a href="${site.social.tiktok}">TikTok</a>`);
  if (site.email) social.push(`<a href="mailto:${site.email}">Email</a>`);

  const footer = `<footer class="site-footer">
    <div class="container site-footer__row">
      <span>© ${new Date().getFullYear()} ${site.title||''}</span>
      <span class="site-footer__social">${social.join(' · ')}</span>
    </div>
  </footer>`;

  document.querySelectorAll('[data-include]').forEach(el => {
    el.outerHTML = el.dataset.include === 'header' ? header : footer;
  });

  // Nav toggle (mobile)
  const navEl = document.querySelector('.nav');
  document.querySelector('.nav-toggle')?.addEventListener('click', e => {
    const open = navEl.classList.toggle('is-open');
    e.currentTarget.setAttribute('aria-expanded', open);
  });

  // Language switch
  document.querySelector('.lang-switch')?.addEventListener('click', () => {
    window.YP_setLang(window.YP_LANG === 'vi' ? 'th' : 'vi');
  });
})();

// Card renderer
window.postCard = function(p) {
  const title = window.pickL(p, 'title');
  const cats = (p.categories || []).map(c => `<span class="tag tag--${c}">${c}</span>`).join('');
  const d = new Date(p.date);
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const dateStr = window.YP_LANG === 'th'
    ? `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()+543}`
    : d.toLocaleDateString('vi-VN');
  const media = p.cover ? `<img src="${p.cover}" alt="" loading="lazy">` : `<span>${p.icon || '🌸'}</span>`;
  return `<a class="card" href="post.html?slug=${encodeURIComponent(p.slug)}">
    <div class="card__media">${media}</div>
    <div class="card__body">
      <div class="card__cats">${cats}</div>
      <h3 class="card__title">${title}</h3>
      <div class="card__meta">
        <time>${dateStr}</time>
        <span class="views"><span class="ico-eye"></span> <span class="views__n">${getViews(p.slug)}</span> · <span class="like ${isLiked(p.slug)?'is-on':''}" data-like="${p.slug}">♥ <span class="like__n">${getLikes(p.slug)}</span></span></span>
      </div>
    </div></a>`;
};

// localStorage views + likes
function lsKey(k, slug){ return `yp:${k}:${slug}`; }
function getViews(slug){ return +(localStorage.getItem(lsKey('v', slug)) || 0); }
function bumpView(slug){ const k=lsKey('v',slug), n=+(localStorage.getItem(k)||0)+1; localStorage.setItem(k,n); return n; }
function getLikes(slug){ return +(localStorage.getItem(lsKey('l', slug)) || 0); }
function isLiked(slug){ return localStorage.getItem(lsKey('liked', slug)) === '1'; }
function toggleLike(slug){
  const liked = isLiked(slug), kL = lsKey('l', slug);
  const n = Math.max(0, +(localStorage.getItem(kL)||0) + (liked?-1:1));
  localStorage.setItem(kL, n);
  localStorage.setItem(lsKey('liked', slug), liked?'0':'1');
  return { liked: !liked, n };
}
window.bumpView = bumpView; window.toggleLike = toggleLike; window.getLikes = getLikes; window.isLiked = isLiked;

document.addEventListener('click', e => {
  const el = e.target.closest('[data-like]');
  if (!el) return;
  e.preventDefault();
  const { liked, n } = toggleLike(el.dataset.like);
  el.classList.toggle('is-on', liked);
  el.querySelector('.like__n').textContent = n;
});

window.wrapVN = function(html){
  // Wrap Latin/Vietnamese words in .vn — but skip content inside HTML tags
  try {
    return html.replace(/(<[^>]+>)|([A-Za-zÀ-ɏḀ-ỿ][A-Za-zÀ-ɏḀ-ỿ'’\-]*)/g,
      (_, tag, word) => tag ? tag : `<span class="vn">${word}</span>`);
  } catch(e){ return html; }
};
