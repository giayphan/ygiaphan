// ygiaphan core — i18n, header/footer, helpers

// ---- Offline indicator ----
window.addEventListener('online', () => document.body.classList.remove('is-offline'));
window.addEventListener('offline', () => document.body.classList.add('is-offline'));
if (!navigator.onLine) document.body.classList.add('is-offline');

// ---- PWA: register service worker + install prompt ----
(function setupPWA(){
  // inject manifest link if missing
  if (!document.querySelector('link[rel="manifest"]')){
    const l = document.createElement('link'); l.rel='manifest'; l.href='manifest.json'; document.head.appendChild(l);
  }
  // theme color
  if (!document.querySelector('meta[name="theme-color"]')){
    const m = document.createElement('meta'); m.name='theme-color'; m.content='#2d8a4e'; document.head.appendChild(m);
  }
  // apple touch icon
  if (!document.querySelector('link[rel="apple-touch-icon"]')){
    const l = document.createElement('link'); l.rel='apple-touch-icon'; l.href='assets/img/logo.png'; document.head.appendChild(l);
  }
  // register SW (only on https or localhost)
  if ('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        // check for updates every 60min
        setInterval(() => reg.update(), 60*60*1000);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w.addEventListener('statechange', () => {
            if (w.state==='installed' && navigator.serviceWorker.controller){
              showUpdate();
            }
          });
        });
      }).catch(()=>{});
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    });
  }

  function showUpdate(){
    if (document.getElementById('yp-update-toast')) return;
    const t = document.createElement('div');
    t.id = 'yp-update-toast';
    t.innerHTML = `<span>🔄 มีเวอร์ชันใหม่</span><button>โหลดใหม่</button>`;
    document.body.appendChild(t);
    t.querySelector('button').onclick = () => {
      navigator.serviceWorker.getRegistration().then(r => r?.waiting?.postMessage('SKIP_WAITING'));
    };
  }

  // Install prompt (Chrome/Edge/Android)
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (localStorage.getItem('yp:install-dismissed')) return;
    showInstall();
  });
  function showInstall(){
    if (document.getElementById('yp-install-toast')) return;
    const t = document.createElement('div');
    t.id = 'yp-install-toast';
    t.innerHTML = `<span>📱 ติดตั้ง ygiaphan เป็นแอป</span>
      <button id="ypInstallBtn">ติดตั้ง</button>
      <button id="ypInstallX" aria-label="ปิด">✕</button>`;
    document.body.appendChild(t);
    t.querySelector('#ypInstallBtn').onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      t.remove();
    };
    t.querySelector('#ypInstallX').onclick = () => {
      localStorage.setItem('yp:install-dismissed', Date.now());
      t.remove();
    };
    // auto-hide หลัง 30 วิ (ไม่ flag dismissed → กลับมาขึ้นใหม่ได้)
    setTimeout(() => t.remove(), 30000);
  }
})();

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
        <img class="brand__logo" src="assets/img/logo.png" alt="ygiaphan" width="48" height="48">
        <span class="brand__text">
          <span class="brand__name">${site.title || ''}</span>
          <span class="brand__tag">${window.YP_LANG==='th' ? (site.tagline_th||'') : (site.tagline_vi||'')}</span>
        </span>
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
        <button class="search-btn" title="Search" id="searchBtn">🔍</button>
        <button class="lang-switch" title="Change language">🌐 ${T.switch_lang||'TH'}</button>
        <a class="nav__link nav__login" href="login.html" id="navAuth" title="${T.login||'เข้าสู่ระบบ'}"><span class="nav__avatar nav__avatar--ph">👤</span></a>
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

  // Default OG (page-specific อาจ override ใน post.js)
  window.YP_setOG();

  // ----- Search modal -----
  const searchHtml = `<div id="searchModal" class="search-modal" hidden>
    <div class="search-box">
      <input id="searchInput" type="search" placeholder="${(window.YP_T||{}).search_ph||'ค้นหาบทความ…'}" autocomplete="off">
      <button class="search-close" id="searchClose">✕</button>
      <div id="searchResults" class="search-results"></div>
    </div></div>`;
  document.body.insertAdjacentHTML('beforeend', searchHtml);
  const sm = document.getElementById('searchModal');
  const si = document.getElementById('searchInput');
  const sr = document.getElementById('searchResults');
  function openSearch(){ sm.hidden = false; document.body.style.overflow='hidden'; setTimeout(()=>si.focus(),50); }
  function closeSearch(){ sm.hidden = true; document.body.style.overflow=''; si.value=''; sr.innerHTML=''; lastQ=''; }
  window.YP_closeSearch = closeSearch;
  // delegate clicks (header rebuild ทำให้ direct binding หาย)
  document.addEventListener('click', e => {
    if (e.target.closest('#searchBtn')) { e.preventDefault(); openSearch(); return; }
    if (e.target.closest('#searchClose')) { e.preventDefault(); closeSearch(); return; }
    if (e.target === sm) closeSearch(); // click backdrop
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key === 'k'){ e.preventDefault(); openSearch(); }
    if (e.key === 'Escape' && !sm.hidden) closeSearch();
  });
  let lastQ = '';
  si.addEventListener('input', () => {
    const q = si.value.trim().toLowerCase();
    if (q === lastQ) return; lastQ = q;
    if (!q){ sr.innerHTML=''; return; }
    const posts = window.YP_POSTS || {};
    const hits = Object.entries(posts).map(([slug,p]) => {
      const t = (window.pickL(p,'title')||'').toLowerCase();
      const d = (window.pickL(p,'desc')||'').toLowerCase();
      const b = (window.pickL(p,'body')||'').toLowerCase();
      let score = 0;
      if (t.includes(q)) score += 10;
      if (d.includes(q)) score += 3;
      if (b.includes(q)) score += 1;
      return {slug, p, score};
    }).filter(x => x.score > 0).sort((a,b)=>b.score-a.score).slice(0,8);
    sr.innerHTML = hits.length
      ? hits.map(h => `<a href="post.html?slug=${encodeURIComponent(h.slug)}" class="search-item">
          <strong>${window.pickL(h.p,'title')}</strong>
          <span class="muted">${(window.pickL(h.p,'desc')||'').slice(0,80)}</span></a>`).join('')
      : `<p class="muted" style="padding:20px;text-align:center">${(window.YP_T||{}).search_empty||'ไม่พบ'}</p>`;
  });


  // Admin shortcut — ตรวจ flag หรือ session token (รองรับ user เก่า)
  (function showAdminLink(){
    // ถ้ามี admin token ใน sessionStorage แต่ไม่มี flag → set ให้
    if (sessionStorage.getItem('yp:adminToken') && !localStorage.getItem('yp:isAdmin')){
      localStorage.setItem('yp:isAdmin','1');
    }
    if (!localStorage.getItem('yp:isAdmin')) return;
    const navEl = document.querySelector('.nav');
    if (!navEl || document.getElementById('navAdmin')) return;
    const a = document.createElement('a');
    a.id = 'navAdmin'; a.href = 'admin.html'; a.className = 'nav__link nav__admin';
    a.title = 'Admin'; a.textContent = '🛡 Admin';
    navEl.insertBefore(a, navEl.querySelector('.search-btn') || navEl.lastElementChild);
  })();

  (async () => {
    const navAuth = document.getElementById('navAuth');
    if (!navAuth || !window.YP_AUTH || !window.YP_AUTH.isLogin()) return;
    navAuth.href = 'me.html';
    navAuth.title = 'โปรไฟล์';
    try {
      const r = await window.YP_AUTH.me();
      if (r && r.ok && r.user){
        const u = r.user;
        const initials = ((u.name||u.email||'?').trim()[0]||'?').toUpperCase();
        const name = (u.name||u.email||'').split(/[\s@]/)[0];
        const av = u.avatar
          ? `<img class="nav__avatar" src="${u.avatar}" alt="" referrerpolicy="no-referrer">`
          : `<span class="nav__avatar nav__avatar--ph">${initials}</span>`;
        navAuth.innerHTML = `${av}<span class="nav__avatar-name">${name}</span>`;
        // เปลี่ยนเป็น dropdown menu
        navAuth.removeAttribute('href');
        navAuth.style.cursor = 'pointer';
        const menu = document.createElement('div');
        menu.className = 'me-menu';
        menu.hidden = true;
        menu.innerHTML = `
          <a href="me.html#vocab"><span>🎴</span> ทบทวนศัพท์</a>
          <a href="me.html#bookmarks"><span>⭐</span> Bookmarks</a>
          <a href="me.html#orders"><span>🛒</span> คำสั่งซื้อ</a>
          <a href="me.html#leaderboard"><span>🏆</span> อันดับ</a>
          <hr>
          <a href="me.html"><span>👤</span> โปรไฟล์เต็ม</a>
          <a href="javascript:void(0)" id="navLogout"><span>🚪</span> ออกจากระบบ</a>`;
        navAuth.parentElement.style.position='relative';
        navAuth.after(menu);
        navAuth.onclick = e => { e.preventDefault(); menu.hidden = !menu.hidden; };
        document.addEventListener('click', e => {
          if (!menu.contains(e.target) && e.target !== navAuth && !navAuth.contains(e.target)) menu.hidden = true;
        });
        menu.querySelector('#navLogout').onclick = async () => {
          await window.YP_AUTH.logout();
          location.reload();
        };
      } else {
        navAuth.innerHTML = `<span class="nav__avatar nav__avatar--ph">👤</span>`;
        navAuth.href = 'login.html';
      }
    } catch(_){}
  })();
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
