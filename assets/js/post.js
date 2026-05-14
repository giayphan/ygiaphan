(async () => {
  const slug = new URLSearchParams(location.search).get('slug');
  const root = document.querySelector('[data-post]');
  const T = window.YP_T || {};
  if (!slug){ root.innerHTML = `<p>${T.not_found||'Not found'}</p>`; return; }

  if (window.YP_API && window.YP_API.on) {
    root.innerHTML = `
      <div class="yp-skel yp-skel--title"></div>
      <div class="yp-skel yp-skel--line"></div>
      <div class="yp-skel yp-skel--line" style="width:90%"></div>
      <div class="yp-skel yp-skel--line" style="width:70%"></div>
      <div class="yp-skel yp-skel--card" style="margin-top:16px"></div>`;
    try { await window.YP_API.loadPosts(); } catch(e){ console.warn('API load failed', e); }
  }
  const meta = (window.YP_POSTS||{})[slug];
  if (!meta){ root.innerHTML = `<p>${T.not_found||'Not found'}</p>`; return; }

  const title = window.pickL(meta, 'title');
  const md = window.pickL(meta, 'body');
  let body = window.marked ? marked.parse(md) : md;
  // wrap Vietnamese tokens in serif when current lang is Thai
  if (window.YP_LANG === 'th') body = window.wrapVN(body);

  const d = new Date(meta.date);
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const dateStr = window.YP_LANG === 'th'
    ? `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()+543}`
    : d.toLocaleDateString('vi-VN');
  const cats = (meta.categories||[]).map(c => `<a class="tag tag--${c}" href="category.html?c=${encodeURIComponent(c)}">${c}</a>`).join('');
  const views = window.bumpView(slug);

  document.title = `${title} · ${(window.YP_SITE||{}).title||''}`;

  // captcha state
  const captcha = makeCaptcha();
  const startedAt = Date.now();

  root.innerHTML = `
    <header class="post__header">
      <div class="post__cats">${cats}</div>
      <h1>${title}</h1>
      <div class="post__meta">
        <time>${dateStr}</time>
        <span>·</span>
        <span class="views"><span class="ico-eye"></span> ${views.toLocaleString()} ${T.views||''}</span>
        <span>·</span>
        <button class="like ${window.isLiked(slug)?'is-on':''}" data-like="${slug}">♥ <span class="like__n">${window.getLikes(slug)}</span></button>
      </div>
      ${meta.cover ? `<img class="post__cover" src="${meta.cover}" alt="">` : ''}
    </header>
    <div class="post__body">${body}</div>
    ${meta.video ? `<div class="post__video"><iframe src="${meta.video}" loading="lazy" allowfullscreen></iframe></div>` : ''}
    <footer class="post__footer">
      <a class="post__back" href="index.html">${T.back_home||'← Home'}</a>
    </footer>
    <section class="comments">
      <h2>${T.comments||'Comments'}</h2>
      <form class="comment-form" data-form>
        <input type="text" name="name" placeholder="${T.comment_name||'Your name'}" required maxlength="50">
        <textarea name="msg" placeholder="${T.comment_msg||'Comment…'}" required rows="3" maxlength="2000"></textarea>
        <!-- honeypot field (hidden) — bots fill it, humans don't -->
        <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" aria-hidden="true">
        <label class="captcha">
          <span>${T.captcha_q||'Verify:'} <strong>${captcha.q}</strong></span>
          <input type="text" name="answer" required inputmode="numeric" pattern="-?[0-9]+" autocomplete="off" style="width:80px">
        </label>
        <button type="submit" class="btn btn--primary">${T.comment_send||'Send'}</button>
        <p class="form-error" data-err hidden></p>
      </form>
      <div class="comments__list" data-comments></div>
    </section>`;

  await renderComments(slug);
  root.querySelector('[data-form]').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.currentTarget;
    const errEl = f.querySelector('[data-err]');
    errEl.hidden = true;

    if (f.website.value.trim() !== '') return;
    if (Date.now() - startedAt < 2000) { showErr(errEl, '⏱'); return; }
    if (parseInt(f.answer.value,10) !== captcha.a){ showErr(errEl, T.captcha_wrong||'Wrong'); return; }

    const name = f.name.value.trim().slice(0,50);
    const msg  = f.msg.value.trim().slice(0,2000);
    const btn  = f.querySelector('button[type=submit]');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="yp-spinner"></span> …`;
    try {
      if (window.YP_API && window.YP_API.on) {
        await window.YP_API.addComment(slug, name, msg);
      } else {
        addComment(slug, { name, msg, ts: Date.now() });
      }
      f.reset();
      await renderComments(slug);
    } catch(_){ showErr(errEl, 'Network'); }
    finally { btn.disabled = false; btn.innerHTML = orig; }
    const c2 = makeCaptcha();
    f.querySelector('.captcha strong').textContent = c2.q;
    captcha.q = c2.q; captcha.a = c2.a;
  });
})();

function showErr(el, msg){ el.textContent = msg; el.hidden = false; }
function makeCaptcha(){
  const a = 1 + Math.floor(Math.random()*9);
  const b = 1 + Math.floor(Math.random()*9);
  const op = Math.random() < .5 ? '+' : '-';
  const q = `${a} ${op} ${b} = ?`;
  return { q, a: op === '+' ? a+b : a-b };
}
function commentsKey(slug){ return `yp:c:${slug}`; }
function getComments(slug){ try{return JSON.parse(localStorage.getItem(commentsKey(slug))||'[]');}catch{return [];} }
function addComment(slug, c){ const a=getComments(slug); a.push(c); localStorage.setItem(commentsKey(slug), JSON.stringify(a)); }
async function renderComments(slug){
  const el = document.querySelector('[data-comments]');
  let list = getComments(slug);
  if (window.YP_API && window.YP_API.on) {
    if (el) el.innerHTML = `<p class="yp-loading"><span class="yp-spinner"></span> …</p>`;
    try {
      const remote = await window.YP_API.listComments(slug);
      list = (remote||[]).map(c => ({name:c.name, msg:c.msg, ts:Number(c.ts)||Date.now()}));
    } catch(_){}
  }
  const T = window.YP_T||{};
  if (!list.length){ el.innerHTML = `<p class="muted">${T.comment_empty||'No comments yet'}</p>`; return; }
  el.innerHTML = list.map(c => `
    <div class="comment yp-fade-in">
      <div class="comment__head"><strong>${escapeHtml(c.name)}</strong> · <span class="muted">${new Date(c.ts).toLocaleString()}</span></div>
      <div class="comment__body">${escapeHtml(c.msg).replace(/\n/g,'<br>')}</div>
    </div>`).join('');
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
