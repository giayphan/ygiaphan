// ygiaphan — Dictionary logic
(function(){
  const FAVKEY   = 'yp:dict:fav';
  const HISTKEY  = 'yp:dict:hist';
  const CACHEKEY = 'yp:dict:cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

  function loadCache(){
    try {
      const raw = localStorage.getItem(CACHEKEY);
      if (!raw) return null;
      const { ts, words } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return words;
    } catch { return null; }
  }
  function saveCache(words){
    try { localStorage.setItem(CACHEKEY, JSON.stringify({ ts: Date.now(), words })); } catch {}
  }

  // ── helpers ──────────────────────────────────────────────
  function getFavs(){ try{ return new Set(JSON.parse(localStorage.getItem(FAVKEY)||'[]')); }catch{ return new Set(); } }
  function saveFavs(s){ localStorage.setItem(FAVKEY, JSON.stringify([...s])); }
  function toggleFav(id){
    const s = getFavs();
    s.has(id) ? s.delete(id) : s.add(id);
    saveFavs(s);
    return s.has(id);
  }
  function addHistory(q){
    if (!q || q.length < 2) return;
    let h = getHistory();
    h = [q, ...h.filter(x => x !== q)].slice(0, 8);
    localStorage.setItem(HISTKEY, JSON.stringify(h));
  }
  function getHistory(){ try{ return JSON.parse(localStorage.getItem(HISTKEY)||'[]'); }catch{ return []; } }

  function normalize(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(); }

  // ── render word card ─────────────────────────────────────
  function cardHtml(w, favs, mode){
    const isFav = favs.has(w.id);
    const T = window.YP_T || {};
    const lang = window.YP_LANG || 'vi';
    // TH UI: เรียนเวียดนาม → primary=vi, phonetic=pv, secondary=th, example=ex_vi
    // VI UI: เรียนไทย    → primary=th, phonetic=pt, secondary=vi, example=ex_th
    const primary   = lang === 'th' ? w.vi    : w.th;
    const phonetic  = lang === 'th' ? w.pv    : w.pt;
    const secondary = lang === 'th' ? w.th    : w.vi;
    const example   = lang === 'th' ? w.ex_vi : w.ex_th;
    return `<div class="dict-card${mode==='flash'?' dict-card--flash':''}" data-id="${w.id}">
      <div class="dict-card__front">
        <div class="dict-card__cat">${catLabel(w.cat)}</div>
        <div class="dict-card__primary">${esc(primary)}</div>
        <div class="dict-card__phonetic">${esc(phonetic||'')}</div>
        <div class="dict-card__secondary">${esc(secondary)}</div>
        ${example ? `<div class="dict-card__ex">${esc(example)}</div>` : ''}
        <button class="dict-card__fav${isFav?' is-on':''}" data-fav="${w.id}" title="${isFav?'ยกเลิกบันทึก':'บันทึกคำ'}">
          ${isFav?'★':'☆'}
        </button>
      </div>
    </div>`;
  }

  const CAT_TH = {
    greetings:'ทักทาย', numbers:'ตัวเลข', colors:'สี', days:'วัน',
    family:'ครอบครัว', body:'ร่างกาย', transport:'การเดินทาง',
    weather:'สภาพอากาศ', food:'อาหาร', phrases:'ประโยค'
  };
  function catLabel(c){
    const th = CAT_TH[c] || c;
    return window.tCat ? window.tCat(th) : th;
  }
  function esc(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ── search ───────────────────────────────────────────────
  function search(words, q, cat){
    const nq = normalize(q);
    return words.filter(w => {
      if (cat && w.cat !== cat) return false;
      if (!nq) return true;
      return normalize(w.vi).includes(nq) || normalize(w.th).includes(nq) ||
             normalize(w.pv||'').includes(nq) || normalize(w.pt||'').includes(nq);
    });
  }

  // ── loading overlay ──────────────────────────────────────
  function showLoading(on){
    const el = document.getElementById('dict-loading');
    if (el) el.style.display = on ? 'flex' : 'none';
  }

  // ── main init ─────────────────────────────────────────────
  window.YP_DICT_INIT = async function(){
    let words = [];

    // 1. try localStorage cache (24h)
    const cached = loadCache();
    if (cached && cached.length) {
      words = cached;
    } else {
      // 2. fetch from GAS API with 15s timeout
      showLoading(true);
      try {
        if (window.YP_API && window.YP_API.on) {
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('dict timeout')), 15000)
          );
          const remote = await Promise.race([window.YP_API.loadDict(), timeout]);
          if (Array.isArray(remote) && remote.length) {
            words = remote.map(w => ({
              ...w,
              id: +w.id,
              cat: String(w.cat||'').trim()
            }));
            saveCache(words);
          }
        }
      } catch(e){ console.warn('dict API load failed', e); }
    }
    showLoading(false);

    if (!words.length){
      showLoading(false);
      const gridEl = document.getElementById('dict-grid');
      if (gridEl) gridEl.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;padding:2rem">โหลดคำศัพท์ไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง</p>';
      return;
    }
    const favs = getFavs();

    // Categories
    const cats = [...new Set(words.map(w=>w.cat))];
    const catEl = document.getElementById('dict-cats');
    if (catEl){
      catEl.innerHTML = `<button class="pill is-active" data-cat="">${(window.YP_T&&window.YP_T.all)||'ทั้งหมด'}</button>` +
        cats.map(c=>`<button class="pill" data-cat="${c}">${catLabel(c)}</button>`).join('');
    }

    // Grid
    const gridEl = document.getElementById('dict-grid');
    const countEl = document.getElementById('dict-count');
    let currentCat = '', currentQ = '', flashIdx = 0, flashMode = false;

    function renderGrid(){
      const results = search(words, currentQ, currentCat);
      const favs = getFavs();
      if (countEl) countEl.textContent = results.length + ' คำ';
      if (flashMode){
        flashIdx = Math.max(0, Math.min(flashIdx, results.length - 1));
        renderFlash(results, favs);
      } else {
        gridEl.innerHTML = results.length
          ? results.map(w => cardHtml(w, favs)).join('')
          : `<p class="muted" style="grid-column:1/-1;text-align:center;padding:2rem">ไม่พบคำที่ค้นหา</p>`;
        gridEl.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', onFav));
      }
    }

    // Flashcard
    const flashWrap = document.getElementById('dict-flash');
    function renderFlash(results, favs){
      if (!results.length){ flashWrap.innerHTML = `<p class="muted" style="text-align:center;padding:2rem">ไม่มีคำ</p>`; return; }
      const w = results[flashIdx];
      const isFav = favs.has(w.id);
      const lang = window.YP_LANG||'vi';
      // TH UI: เรียนเวียดนาม → front=th (โจทย์), back=vi (เฉลย), phonetic=pv, example=ex_vi
      // VI UI: เรียนไทย    → front=vi (โจทย์), back=th (เฉลย), phonetic=pt, example=ex_th
      const front    = lang==='th' ? w.th    : w.vi;
      const back     = lang==='th' ? w.vi    : w.th;
      const phonetic = lang==='th' ? w.pv    : w.pt;
      const example  = lang==='th' ? w.ex_vi : w.ex_th;
      flashWrap.innerHTML = `
        <div class="flash-card" id="flash-inner">
          <div class="flash-card__side flash-card__front">
            <div class="dict-card__cat">${catLabel(w.cat)}</div>
            <div class="flash-word">${esc(front)}</div>
            <div class="flash-hint">แตะเพื่อดูคำแปล</div>
          </div>
          <div class="flash-card__side flash-card__back">
            <div class="flash-answer">${esc(back)}</div>
            <div class="dict-card__phonetic">${esc(phonetic||'')}</div>
            ${example?`<div class="dict-card__ex">${esc(example)}</div>`:''}
          </div>
        </div>
        <div class="flash-nav">
          <button class="btn btn--ghost" id="flash-prev">← ก่อนหน้า</button>
          <span class="flash-count">${flashIdx+1} / ${results.length}</span>
          <button class="btn btn--ghost" id="flash-next">ถัดไป →</button>
        </div>
        <div class="flash-actions">
          <button class="dict-card__fav${isFav?' is-on':''}" data-fav="${w.id}">${isFav?'★':'☆'} บันทึก</button>
          <button class="btn btn--ghost btn--sm" id="flash-shuffle">🔀 สุ่ม</button>
        </div>`;
      document.getElementById('flash-inner').addEventListener('click', function(){
        this.classList.toggle('is-flipped');
      });
      document.getElementById('flash-prev').addEventListener('click', ()=>{ flashIdx=Math.max(0,flashIdx-1); renderFlash(search(words,currentQ,currentCat),getFavs()); });
      document.getElementById('flash-next').addEventListener('click', ()=>{ flashIdx=Math.min(results.length-1,flashIdx+1); renderFlash(search(words,currentQ,currentCat),getFavs()); });
      document.getElementById('flash-shuffle').addEventListener('click', ()=>{ flashIdx=Math.floor(Math.random()*results.length); renderFlash(search(words,currentQ,currentCat),getFavs()); });
      flashWrap.querySelector('[data-fav]').addEventListener('click', function(){
        const on = toggleFav(+this.dataset.fav); this.classList.toggle('is-on',on); this.textContent=(on?'★':'☆')+' บันทึก';
      });
    }

    // toggle flash mode
    const btnFlash = document.getElementById('dict-flash-toggle');
    if (btnFlash){
      btnFlash.addEventListener('click', ()=>{
        flashMode = !flashMode;
        flashIdx = 0;
        btnFlash.textContent = flashMode ? '📋 โหมดรายการ' : '🃏 โหมดแฟลชการ์ด';
        flashWrap.hidden = !flashMode;
        gridEl.hidden = flashMode;
        renderGrid();
      });
    }

    // search input
    const inp = document.getElementById('dict-search');
    if (inp){
      inp.addEventListener('input', ()=>{
        currentQ = inp.value;
        flashIdx = 0;
        renderGrid();
      });
      inp.addEventListener('keydown', e => { if(e.key==='Enter' && currentQ) addHistory(currentQ); });
    }

    // category pills
    if (catEl){
      catEl.addEventListener('click', e=>{
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        currentCat = b.dataset.cat;
        flashIdx = 0;
        catEl.querySelectorAll('.pill').forEach(p=>p.classList.toggle('is-active', p===b));
        renderGrid();
      });
    }

    // fav toggle (grid)
    function onFav(e){
      const btn = e.currentTarget;
      const on = toggleFav(+btn.dataset.fav);
      btn.classList.toggle('is-on', on);
      btn.textContent = on ? '★' : '☆';
    }

    // favorites shortcut
    const favBtn = document.getElementById('dict-favs-toggle');
    if (favBtn){
      favBtn.addEventListener('click', ()=>{
        const favIds = getFavs();
        if (!favIds.size){ alert('ยังไม่มีคำที่บันทึกไว้'); return; }
        const favWords = words.filter(w=>favIds.has(w.id));
        const favs = getFavs();
        gridEl.innerHTML = favWords.map(w=>cardHtml(w,favs)).join('');
        gridEl.querySelectorAll('[data-fav]').forEach(b=>b.addEventListener('click', onFav));
        if (countEl) countEl.textContent = favWords.length + ' คำโปรด';
      });
    }

    renderGrid();
  };
})();
