(async () => {
  if (window.YP_API && window.YP_API.on) {
    try { await window.YP_API.loadPosts(); } catch(e){ console.warn('API load failed', e); }
  }
  const T = window.YP_T || {};
  const slides = window.YP_SLIDES || [];
  const posts = window.POSTS || [];
  const courses = window.YP_COURSES || [];

  // Slider
  const slider = document.querySelector('[data-slider]');
  slider.innerHTML = slides.map((s, i) => `
    <div class="slide${i===0?' is-active':''}">
      <div class="slide__text">
        <span class="slide__eyebrow">${s.eyebrow||''}</span>
        <h2 class="slide__title">${window.pickL(s,'title')}</h2>
        <p class="slide__sub">${window.pickL(s,'sub')}</p>
        <div class="slide__cta">
          <a class="btn btn--primary" href="${s.ctaUrl||'#'}">${window.pickL(s,'cta')}</a>
          ${s.cta2_vi || s.cta2_th ? `<a class="btn" href="${s.cta2Url||'#'}">${window.pickL(s,'cta2')}</a>` : ''}
        </div>
      </div>
    </div>`).join('') + `<div class="slider__dots">${slides.map((_,i)=>`<button data-dot="${i}"${i===0?' class="is-active"':''}></button>`).join('')}</div>`;
  let idx = 0, timer;
  const slidesEls = slider.querySelectorAll('.slide');
  const dots = slider.querySelectorAll('[data-dot]');
  const show = n => { slidesEls.forEach((s,k)=>s.classList.toggle('is-active', k===n)); dots.forEach((d,k)=>d.classList.toggle('is-active', k===n)); idx=n; };
  const next = () => show((idx+1) % slidesEls.length);
  dots.forEach((d,k) => d.addEventListener('click', () => { show(k); reset(); }));
  const reset = () => { clearInterval(timer); timer = setInterval(next, 5000); };
  if (slidesEls.length > 1) reset();

  // Section labels
  const head = document.querySelector('[data-section-daily]');
  if (head){
    head.querySelector('h2').textContent = T.daily_post||'Daily';
    head.querySelector('.hint').textContent = T.daily_hint||'';
  }
  const ch = document.querySelector('[data-section-courses]');
  if (ch) ch.querySelector('h2').textContent = T.courses_title||'Courses';

  // Filters
  const cats = [...new Set(posts.flatMap(p => p.categories))].sort();
  const filters = document.querySelector('[data-filters]');
  filters.innerHTML = `<a href="#" class="is-active" data-f="">${T.all||'All'}</a>` +
    cats.map(c => `<a href="#" data-f="${c}">${c}</a>`).join('');

  const grid = document.querySelector('[data-posts]');
  const render = (filter) => {
    const list = filter ? posts.filter(p => p.categories.includes(filter)) : posts;
    grid.innerHTML = list.map(window.postCard).join('');
  };
  render('');
  filters.addEventListener('click', e => {
    const a = e.target.closest('[data-f]');
    if (!a) return;
    e.preventDefault();
    filters.querySelectorAll('a').forEach(x => x.classList.toggle('is-active', x === a));
    render(a.dataset.f);
  });

  // Courses
  document.querySelector('[data-courses]').innerHTML = courses.map(c => `
    <a class="course" href="courses.html#${c.id}">
      <div class="course__icon">${c.icon}</div>
      <h3>${window.pickL(c,'title')}</h3>
      <p>${window.pickL(c,'desc')}</p>
    </a>`).join('');
})();