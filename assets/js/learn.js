// ygiaphan — Vocab + Quiz extensions for post body
(function(){
  // Parse :::vocab / :::quiz blocks BEFORE markdown
  // Returns {md (cleaned), vocab:[{vi,th}], quiz:[{q, options:[{text,correct}]}]}
  window.YP_parseLearn = function(md){
    const vocab = [], quiz = [];
    md = String(md||'').replace(/^:::\s*vocab\s*\n([\s\S]*?)\n:::/gm, (_m, body) => {
      body.split('\n').forEach(line => {
        const [vi, th] = line.split('|').map(s => s.trim());
        if (vi && th) vocab.push({vi, th});
      });
      return 'YP_VOCAB_SLOT';
    });
    // Auto-extract vocab from markdown tables (when no ::: vocab block)
    // Always store {vi, th, ph} where ph = phonetic of target language word
    // Table column 0 is target (the language being taught), last col is native, middle = phonetic
    if (!vocab.length){
      const lines = md.split('\n');
      let inTable = false, dir = 0; // 1=col0 is vi (target), 2=col0 is th (target)
      for (let i = 0; i < lines.length; i++){
        const ln = lines[i].trim();
        if (ln.startsWith('|') && ln.endsWith('|')){
          const cells = ln.slice(1,-1).split('|').map(s => s.trim());
          if (!inTable){
            inTable = true;
            if (/เวียดนาม|Việt|Tiếng Việt/i.test(cells[0])) dir = 1;
            else if (/ภาษาไทย|Tiếng Thái|Thai/i.test(cells[0])) dir = 2;
            else dir = 0;
            continue;
          }
          if (/^[-:|\s]+$/.test(ln.replace(/\|/g,''))) continue;
          if (dir && cells.length >= 2){
            const first = cells[0], last = cells[cells.length-1];
            const ph = cells.length >= 3 ? cells[1] : '';
            // first = target word, last = native translation
            const vi = dir === 1 ? first : last;
            const th = dir === 1 ? last  : first;
            if (vi && th && vi !== th && !/^[-:\s]+$/.test(vi)) vocab.push({vi, th, ph, target: dir===1?'vi':'th'});
          }
        } else { inTable = false; dir = 0; }
      }
      if (vocab.length) md += '\n\nYP_VOCAB_SLOT';
    }
    md = md.replace(/^:::\s*quiz\s*\n([\s\S]*?)\n:::/gm, (_m, body) => {
      const blocks = body.split(/\n(?=Q:)/);
      blocks.forEach(blk => {
        const lines = blk.trim().split('\n');
        const q = (lines.shift()||'').replace(/^Q:\s*/,'').trim();
        if (!q) return;
        const options = lines.filter(l=>/^[-*]\s/.test(l)).map(l => ({
          text: l.replace(/^[-*]\s/,'').trim(),
          correct: l.startsWith('*')
        }));
        if (options.length >= 2) quiz.push({q, options});
      });
      return 'YP_QUIZ_SLOT';
    });
    return {md, vocab, quiz};
  };

  // Render vocab block (cards + save button)
  window.YP_renderVocab = function(items, slug){
    if (!items.length) return '';
    const T = window.YP_T||{};
    const isLogin = window.YP_AUTH && window.YP_AUTH.isLogin();
    return `<section class="vocab-block">
      <h3>📚 ${T.vocab_in_lesson||'Vocab'} <small class="muted">(${items.length})</small></h3>
      <div class="vocab-grid">
        ${items.map(v => {
          const lang = window.YP_LANG||'vi';
          const targetWord = lang==='th' ? v.vi : v.th;
          const nativeWord = lang==='th' ? v.th : v.vi;
          const targetClass = lang==='th' ? 'vn' : '';
          return `
          <div class="vocab-card" data-vi="${escapeAttr(v.vi)}" data-th="${escapeAttr(v.th)}" data-ph="${escapeAttr(v.ph||'')}">
            <div class="vocab-card__vi ${targetClass}">${escapeHtml(targetWord)}</div>
            ${v.ph?`<div class="vocab-card__ph">${escapeHtml(v.ph)}</div>`:''}
            <div class="vocab-card__th">${escapeHtml(nativeWord)}</div>
            ${isLogin ? `<button class="vocab-card__save" title="${T.vocab_save||'Save'}" aria-label="${T.vocab_save||'Save'}">+</button>` : ''}
          </div>`;
        }).join('')}
      </div>
      ${isLogin ? `<p class="muted" style="text-align:center;font-size:.85em">💡 ${T.vocab_member_hint||''} <a href="me.html#vocab">${T.profile||'Profile'}</a></p>` : `<p class="muted" style="text-align:center;font-size:.85em">🔒 <a href="login.html">${T.login||'Login'}</a> — ${T.vocab_login_hint||''}</p>`}
    </section>`;
  };

  window.YP_bindVocab = function(root, slug){
    root.querySelectorAll('.vocab-card__save').forEach(btn => {
      btn.onclick = async () => {
        const card = btn.closest('.vocab-card');
        btn.disabled = true;
        const r = await window.YP_API.vocabSave(card.dataset.vi, card.dataset.th, slug, card.dataset.ph);
        const T = window.YP_T||{};
        if (r.ok){ btn.textContent='✓'; btn.classList.add('is-saved'); btn.title = r.dup?(T.vocab_dup||'Dup'):(T.vocab_saved||'Saved'); }
        else { btn.textContent='!'; btn.title=(T.vocab_err||'Error')+': '+r.error; }
      };
    });
  };

  // Render quiz block
  window.YP_renderQuiz = function(items, slug){
    if (!items.length) return '';
    const T = window.YP_T||{};
    return `<section class="quiz-block" data-quiz-slug="${escapeAttr(slug)}">
      <h3>📝 ${T.quiz_title||'Quiz'} <small class="muted">(${items.length} ${T.quiz_q_count||''})</small></h3>
      <form class="quiz-form">
        ${items.map((q,i) => `
          <div class="quiz-q" data-qi="${i}">
            <p class="quiz-q__text"><strong>Q${i+1}.</strong> ${escapeHtml(q.q)}</p>
            ${q.options.map((o,j) => `
              <label class="quiz-opt">
                <input type="radio" name="q${i}" value="${j}" data-correct="${o.correct?1:0}">
                <span>${escapeHtml(o.text)}</span>
              </label>`).join('')}
          </div>`).join('')}
        <button type="submit" class="btn btn--primary">✓ ${T.quiz_check||'Check'}</button>
        <div class="quiz-result" hidden></div>
      </form>
    </section>`;
  };

  window.YP_bindQuiz = function(root, slug){
    const form = root.querySelector('.quiz-form'); if (!form) return;
    form.onsubmit = async e => {
      e.preventDefault();
      const total = form.querySelectorAll('.quiz-q').length;
      let score = 0;
      form.querySelectorAll('.quiz-q').forEach(qEl => {
        const sel = qEl.querySelector('input:checked');
        const correctEl = qEl.querySelector('input[data-correct="1"]');
        qEl.querySelectorAll('.quiz-opt').forEach(o => o.classList.remove('is-right','is-wrong'));
        if (sel){
          if (sel.dataset.correct === '1'){ score++; sel.parentElement.classList.add('is-right'); }
          else { sel.parentElement.classList.add('is-wrong'); correctEl?.parentElement.classList.add('is-right'); }
        } else {
          correctEl?.parentElement.classList.add('is-right');
        }
      });
      const pct = Math.round(score/total*100);
      const emoji = pct===100?'🎉':pct>=70?'👏':pct>=50?'💪':'📚';
      const res = form.querySelector('.quiz-result');
      res.hidden = false;
      res.innerHTML = `<strong>${emoji} ${score}/${total}</strong> (${pct}%)`;
      // submit เพื่อ leaderboard (member only)
      if (window.YP_AUTH && window.YP_AUTH.isLogin()){
        try { await window.YP_API.quizSubmit(slug, score, total); } catch(_){}
      }
    };
  };

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return escapeHtml(s); }
})();
