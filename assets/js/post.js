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
  let md = window.pickL(meta, 'body');
  // Extract vocab/quiz blocks before markdown
  const learn = window.YP_parseLearn ? window.YP_parseLearn(md) : {md, vocab:[], quiz:[]};
  md = learn.md;
  // Premium / members_only: ตัด body แสดงเฉพาะ teaser ถ้าไม่ได้ login
  const membersOnly = meta.members_only === true || String(meta.members_only).toLowerCase() === 'true';
  const isLogin = window.YP_AUTH && window.YP_AUTH.isLogin();
  if (membersOnly && !isLogin){
    const teaser = (md||'').split('\n\n').slice(0,2).join('\n\n');
    md = teaser + `\n\n---\n\n> 🔒 **${T.members_only_teaser||'Members only'}**\n>\n> [${T.login||'Login'} →](login.html)`;
  }
  let body = window.marked ? marked.parse(md) : md;
  // Inject vocab/quiz UI at placeholders (may be wrapped in <p> by marked)
  const slotRe = tok => new RegExp(`(<p>\\s*)?${tok}(\\s*</p>)?`);
  body = body.replace(slotRe('YP_VOCAB_SLOT'), () => window.YP_renderVocab ? window.YP_renderVocab(learn.vocab, slug) : '');
  body = body.replace(slotRe('YP_QUIZ_SLOT'),  () => window.YP_renderQuiz  ? window.YP_renderQuiz(learn.quiz, slug)   : '');
  // Fallback: auto-vocab with no slot in source — append at end
  if (learn.vocab.length && !/YP_VOCAB_SLOT/.test(body) && !/vocab-block/.test(body)){
    body += window.YP_renderVocab ? window.YP_renderVocab(learn.vocab, slug) : '';
  }
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
  if (window.YP_setOG) window.YP_setOG({
    title, type:'article',
    description: window.pickL(meta, 'desc') || (md||'').slice(0,160),
    image: meta.cover || (location.origin + (location.pathname.replace(/[^/]*$/, '')) + 'assets/img/logo.png')
  });

  // captcha state
  const captcha = makeCaptcha();
  const startedAt = Date.now();

  root.innerHTML = `
    <header class="post__header">
      <button class="post__bookmark" data-bookmark="${slug}" title="${T.bookmark_save||'Bookmark'}" aria-label="${T.bookmark_save||'Bookmark'}" hidden>☆</button>
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
        ${(window.YP_AUTH && window.YP_AUTH.isLogin()) ? '' : `<input type="text" name="name" placeholder="${T.comment_name||'Your name'}" required maxlength="50">`}
        <textarea name="msg" placeholder="${T.comment_msg||'Comment…'}" required rows="3" maxlength="2000"></textarea>
        <!-- honeypot field (hidden) — bots fill it, humans don't -->
        <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" aria-hidden="true">
        ${(window.YP_AUTH && window.YP_AUTH.isLogin()) ? '' : `<label class="captcha">
          <span>${T.captcha_q||'Verify:'} <strong>${captcha.q}</strong></span>
          <input type="text" name="answer" required inputmode="numeric" pattern="-?[0-9]+" autocomplete="off" style="width:80px">
        </label>`}
        <button type="submit" class="btn btn--primary">${T.comment_send||'Send'}</button>
        <p class="form-error" data-err hidden></p>
      </form>
      <div class="comments__list" data-comments></div>
    </section>`;

  await renderComments(slug);

  // Bind vocab + quiz
  if (window.YP_bindVocab) window.YP_bindVocab(root, slug);
  if (window.YP_bindQuiz)  window.YP_bindQuiz(root, slug);

  // Bookmark (member only)
  if (window.YP_AUTH && window.YP_AUTH.isLogin()){
    const bmBtn = root.querySelector('[data-bookmark]');
    if (bmBtn){
      bmBtn.hidden = false;
      const updBtn = on => { bmBtn.classList.toggle('is-on', on); bmBtn.textContent = on?'★':'☆'; bmBtn.title = on?(T.bookmark_unsave||'Unsave'):(T.bookmark_save||'Bookmark'); };
      try {
        const list = await window.YP_API.bookmarkList();
        if (list.ok) updBtn(list.slugs.includes(slug));
      } catch(_){}
      bmBtn.onclick = async () => {
        bmBtn.disabled = true;
        try {
          const r = await window.YP_API.bookmarkToggle(slug);
          if (r.ok) updBtn(r.bookmarked);
        } finally { bmBtn.disabled = false; }
      };
    }
  }

  root.querySelector('[data-form]').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.currentTarget;
    const errEl = f.querySelector('[data-err]');
    errEl.hidden = true;

    const isLogin = window.YP_AUTH && window.YP_AUTH.isLogin();
    if (f.website.value.trim() !== '') return;
    if (Date.now() - startedAt < 2000) { showErr(errEl, '⏱'); return; }
    if (!isLogin && parseInt(f.answer.value,10) !== captcha.a){ showErr(errEl, T.captcha_wrong||'Wrong'); return; }

    const name = isLogin
      ? ((await window.YP_AUTH.me())?.user?.name || 'Member')
      : f.name.value.trim().slice(0,50);
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
    if (!isLogin){
      const c2 = makeCaptcha();
      const capEl = f.querySelector('.captcha strong');
      if (capEl) capEl.textContent = c2.q;
      captcha.q = c2.q; captcha.a = c2.a;
    }
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
      list = (remote||[]).map(c => ({name:c.name, msg:c.msg, ts:Number(c.ts)||Date.now(), avatar:c.avatar||'', is_member:!!c.is_member, parent_ts:Number(c.parent_ts)||0}));
    } catch(_){}
  }
  const T = window.YP_T||{};
  if (!list.length){ el.innerHTML = `<p class="muted">${T.comment_empty||'No comments yet'}</p>`; return; }
  // build tree
  const byParent = {0:[]};
  list.forEach(c => { const k = c.parent_ts||0; if (!byParent[k]) byParent[k]=[]; byParent[k].push(c); });
  function renderOne(c, parentName){
    const av = c.avatar ? `<img class="comment__avatar" src="${escapeHtml(c.avatar)}" alt="">` : `<span class="comment__avatar comment__avatar--ph">${escapeHtml((c.name||'?')[0])}</span>`;
    const badge = c.is_member ? `<span class="comment__badge" title="สมาชิก">✓</span>` : '';
    const replies = (byParent[c.ts]||[]).map(r => renderOne(r, c.name)).join('');
    const replyTo = parentName ? `<div class="comment__reply-badge">↩ ${T.reply||'Reply'} <strong>${escapeHtml(parentName)}</strong></div>` : '';
    return `<div class="comment yp-fade-in">
      ${av}
      <div class="comment__main">
        <div class="comment__head"><strong>${escapeHtml(c.name)}</strong>${badge} · <span class="muted">${new Date(c.ts).toLocaleString()}</span></div>
        ${replyTo}
        <div class="comment__body">${escapeHtml(c.msg).replace(/\n/g,'<br>')}</div>
        <div class="comment__actions"><button class="comment__action" data-reply="${c.ts}">↩ ${T.reply||'Reply'}</button></div>
        ${replies?`<div class="comment__replies">${replies}</div>`:''}
      </div>
    </div>`;
  }
  el.innerHTML = (byParent[0]||[]).map(c => renderOne(c, null)).join('');
  // bind reply buttons
  el.querySelectorAll('[data-reply]').forEach(btn => {
    btn.onclick = () => {
      el.querySelectorAll('.comment__reply-form').forEach(f => f.remove());
      const main = btn.closest('.comment__main');
      const replyToName = main.querySelector('.comment__head strong').textContent;
      const isLogin = window.YP_AUTH && window.YP_AUTH.isLogin();
      const cap = makeCaptcha();
      const startedAt = Date.now();
      const form = document.createElement('form');
      form.className = 'comment__reply-form';
      const parentTs = btn.dataset.reply;
      form.innerHTML = `
        <input type="hidden" name="parent_ts" value="${escapeHtml(parentTs)}">
        <div class="comment__replying-to">↩ ${T.reply||'Reply'} <strong>${escapeHtml(replyToName)}</strong></div>
        ${isLogin ? '' : `<input name="name" placeholder="${T.comment_name||'Name'}" required maxlength="50">`}
        <textarea name="msg" required maxlength="2000" placeholder="${T.reply||'Reply'} ${escapeHtml(replyToName)}…"></textarea>
        <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" aria-hidden="true">
        ${isLogin ? '' : `<label class="captcha"><span>Verify: <strong>${cap.q}</strong></span><input name="answer" required inputmode="numeric" pattern="-?[0-9]+" autocomplete="off"></label>`}
        <div><button type="button" class="btn btn--ghost" data-cancel>${T.cancel||'Cancel'}</button><button type="submit" class="btn btn--primary">${T.send||T.comment_send||'Send'}</button></div>
        <p class="form-error" hidden></p>`;
      main.querySelector('.comment__actions').after(form);
      form.querySelector('textarea').focus();
      form.querySelector('[data-cancel]').onclick = () => form.remove();
      form.onsubmit = async e => {
        e.preventDefault();
        const errEl = form.querySelector('.form-error');
        errEl.hidden = true;
        // honeypot
        if (form.website.value.trim() !== '') return;
        // min 2s (bot ส่งเร็วเกิน)
        if (Date.now() - startedAt < 2000){ errEl.hidden=false; errEl.textContent='⏱ '+(T.too_fast||'too fast'); return; }
        if (!isLogin){
          if (parseInt(form.answer.value,10) !== cap.a){ errEl.hidden=false; errEl.textContent='✗ '+(T.captcha_wrong||'wrong'); return; }
        }
        const msg = form.msg.value.trim();
        if (!msg) return;
        const name = isLogin
          ? ((await window.YP_AUTH.me())?.user?.name || 'Member')
          : form.name.value.trim().slice(0,50);
        const sb = form.querySelector('button[type=submit]');
        sb.disabled = true; sb.textContent = '...';
        try {
          const r = await window.YP_API.addComment(slug, name, msg, form.parent_ts.value);
          if (r && r.error){ errEl.hidden=false; errEl.textContent='✗ '+r.error; sb.disabled=false; sb.textContent=T.send||T.comment_send||'Send'; return; }
          await renderComments(slug);
        } catch(err){ errEl.hidden=false; errEl.textContent='✗ '+err.message; sb.disabled=false; sb.textContent=T.send||T.comment_send||'Send'; }
      };
    };
  });
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
