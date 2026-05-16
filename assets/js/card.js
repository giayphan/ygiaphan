// Post card renderer
window.postCard = function(p) {
  const title = window.pickL(p, 'title');
  const tc = window.tCat || (x=>x);
  const cats = (p.categories || []).map(c => `<span class="tag tag--${c}">${tc(c)}</span>`).join('');
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

// Wrap Latin/Vietnamese words for styling
window.wrapVN = function(html){
  try {
    return html.replace(/(<[^>]+>)|([A-Za-zÀ-ɏḀ-ỿ][A-Za-zÀ-ɏḀ-ỿ''\-]*)/g,
      (_, tag, word) => tag ? tag : `<span class="vn">${word}</span>`);
  } catch(e){ return html; }
};
