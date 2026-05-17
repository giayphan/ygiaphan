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
    if (!vocab.length){
      const lines = md.split('\n');
      let inTable = false, isViTable = false, headerCols = [];
      for (let i = 0; i < lines.length; i++){
        const ln = lines[i].trim();
        if (ln.startsWith('|') && ln.endsWith('|')){
          const cells = ln.slice(1,-1).split('|').map(s => s.trim());
          if (!inTable){
            inTable = true; headerCols = cells;
            isViTable = /เวียดนาม|Việt|Tiếng Việt/i.test(cells[0]);
            continue;
          }
          if (/^[-:|\s]+$/.test(ln.replace(/\|/g,''))) continue; // separator row
          if (isViTable && cells.length >= 2){
            const vi = cells[0], th = cells[cells.length-1];
            if (vi && th && vi !== th && !/^[-:\s]+$/.test(vi)) vocab.push({vi, th});
          }
        } else { inTable = false; isViTable = false; }
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
    const isLogin = window.YP_AUTH && window.YP_AUTH.isLogin();
    return `<section class="vocab-block">
      <h3>📚 ศัพท์ในบทนี้ <small class="muted">(${items.length})</small></h3>
      <div class="vocab-grid">
        ${items.map(v => `
          <div class="vocab-card" data-vi="${escapeAttr(v.vi)}" data-th="${escapeAttr(v.th)}">
            <div class="vocab-card__vi vn">${escapeHtml(v.vi)}</div>
            <div class="vocab-card__th">${escapeHtml(v.th)}</div>
            ${isLogin ? `<button class="vocab-card__save" title="บันทึกศัพท์" aria-label="บันทึก">+</button>` : ''}
          </div>`).join('')}
      </div>
      ${isLogin ? `<p class="muted" style="text-align:center;font-size:.85em">💡 บันทึกแล้ว → ทบทวนที่ <a href="me.html#vocab">โปรไฟล์</a></p>` : `<p class="muted" style="text-align:center;font-size:.85em">🔒 <a href="login.html">เข้าสู่ระบบ</a> เพื่อบันทึกและทบทวนศัพท์</p>`}
    </section>`;
  };

  window.YP_bindVocab = function(root, slug){
    root.querySelectorAll('.vocab-card__save').forEach(btn => {
      btn.onclick = async () => {
        const card = btn.closest('.vocab-card');
        btn.disabled = true;
        const r = await window.YP_API.vocabSave(card.dataset.vi, card.dataset.th, slug);
        if (r.ok){ btn.textContent='✓'; btn.classList.add('is-saved'); btn.title = r.dup?'มีอยู่แล้ว':'บันทึกแล้ว'; }
        else { btn.textContent='!'; btn.title='ผิดพลาด: '+r.error; }
      };
    });
  };

  // Render quiz block
  window.YP_renderQuiz = function(items, slug){
    if (!items.length) return '';
    return `<section class="quiz-block" data-quiz-slug="${escapeAttr(slug)}">
      <h3>📝 ลองทำแบบฝึกหัด <small class="muted">(${items.length} ข้อ)</small></h3>
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
        <button type="submit" class="btn btn--primary">✓ ตรวจคำตอบ</button>
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
