// Header/footer injection, navigation, search modal, auth nav
(function init(){
  const site = window.YP_SITE || {};
  const nav  = window.YP_NAV  || [];
  const T = window.YP_T;

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

  // Nav toggle (mobile) — delegated; survives header re-injects + race conditions
  document.addEventListener('click', e => {
    const navEl = document.querySelector('.nav');
    if (!navEl) return;
    const btn = e.target.closest('.nav-toggle');
    if (btn){
      e.preventDefault(); e.stopPropagation();
      const open = navEl.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
      return;
    }
    // tap inside menu link → close after navigation triggers
    if (e.target.closest('.nav__link') && navEl.classList.contains('is-open')){
      navEl.classList.remove('is-open');
      document.querySelector('.nav-toggle')?.setAttribute('aria-expanded','false');
      return;
    }
    // tap outside → close
    if (navEl.classList.contains('is-open') && !e.target.closest('.nav')){
      navEl.classList.remove('is-open');
      document.querySelector('.nav-toggle')?.setAttribute('aria-expanded','false');
    }
  }, true); // capture phase: fires before any stopPropagation downstream

  // Language switch — delegated too
  document.addEventListener('click', e => {
    if (e.target.closest('.lang-switch')){
      window.YP_setLang(window.YP_LANG === 'vi' ? 'th' : 'vi');
    }
  });

  window.YP_setOG();

  // Search modal
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

  document.addEventListener('click', e => {
    if (e.target.closest('#searchBtn')) { e.preventDefault(); openSearch(); return; }
    if (e.target.closest('#searchClose')) { e.preventDefault(); closeSearch(); return; }
    if (e.target === sm) closeSearch();
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

  // Admin shortcut — ตรวจ flag จาก session ก่อน (ก่อน me() กลับมา)
  (function showAdminLink(){
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

  // Auth nav: อัปเดต avatar + dropdown เมื่อ login แล้ว
  (async () => {
    const navAuth = document.getElementById('navAuth');
    if (!navAuth || !window.YP_AUTH || !window.YP_AUTH.isLogin()) return;
    navAuth.href = 'me.html';
    navAuth.title = 'โปรไฟล์';
    try {
      const r = await window.YP_AUTH.me();
      if (r && r.ok && r.user){
        const u = r.user;
        // is_admin ตรวจ server-side แล้ว — ไม่ hardcode email ฝั่ง client
        if (u.is_admin){
          localStorage.setItem('yp:isAdmin','1');
          if (!document.getElementById('navAdmin')){
            const navEl = document.querySelector('.nav');
            if (navEl){
              const aa = document.createElement('a');
              aa.id = 'navAdmin'; aa.href = 'admin.html'; aa.className = 'nav__link nav__admin';
              aa.title = 'Admin'; aa.textContent = '🛡 Admin';
              navEl.insertBefore(aa, navEl.querySelector('.search-btn') || navEl.lastElementChild);
            }
          }
        }
        const initials = ((u.name||u.email||'?').trim()[0]||'?').toUpperCase();
        const name = (u.name||u.email||'').split(/[\s@]/)[0];
        const av = u.avatar
          ? `<img class="nav__avatar" src="${u.avatar}" alt="" referrerpolicy="no-referrer">`
          : `<span class="nav__avatar nav__avatar--ph">${initials}</span>`;
        navAuth.innerHTML = `${av}<span class="nav__avatar-name">${name}</span><button class="nav__caret" id="navCaret" title="เมนู" aria-label="เมนู">▾</button>`;
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
        const caret = document.getElementById('navCaret');
        caret.onclick = e => { e.preventDefault(); e.stopPropagation(); menu.hidden = !menu.hidden; };
        document.addEventListener('click', e => {
          if (!menu.contains(e.target) && e.target !== caret) menu.hidden = true;
        });
        menu.querySelector('#navLogout').onclick = async () => {
          await window.YP_AUTH.logout();
          localStorage.removeItem('yp:isAdmin');
          location.href = 'index.html';
        };
      } else {
        navAuth.innerHTML = `<span class="nav__avatar nav__avatar--ph">👤</span>`;
        navAuth.href = 'login.html';
      }
    } catch(_){}
  })();
})();
