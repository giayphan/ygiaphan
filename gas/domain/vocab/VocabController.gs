// Vocabulary SRS (Leitner 6-box) + Quiz

const SRS_INTERVALS = [0, 1, 3, 7, 14, 30]; // days per box (0=now, 5=30 days)

function vocabSave_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const vi = String(b.vi||'').trim(), th = String(b.th||'').trim();
  const slug = String(b.slug||''), ph = String(b.ph||'').trim();
  if (!vi || !th) return {error:'invalid'};
  const sh = sheet_(SH.vocab);
  const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  if (head.indexOf('ph') < 0){ sh.getRange(1, head.length+1).setValue('ph'); }
  const all = rowsAsObjects_(sh);
  const exists = all.find(x => String(x.user_id) === String(u.user_id) && String(x.vi).trim() === vi);
  if (exists){
    if (ph && !String(exists.ph||'').trim()){ // backfill phonetic if missing
      const r = sh.getDataRange().getValues(); const h2 = r.shift();
      const pi = h2.indexOf('ph'), ui = h2.indexOf('user_id'), vii = h2.indexOf('vi');
      const idx = r.findIndex(x => String(x[ui])===String(u.user_id) && String(x[vii]).trim()===vi);
      if (idx>=0 && pi>=0) sh.getRange(idx+2, pi+1).setValue(ph);
    }
    return {ok:true, dup:true};
  }
  sh.appendRow([u.user_id, vi, th, slug, 0, now_(), now_(), ph]);
  const lr = sh.getLastRow();
  sh.getRange(lr, 6, 1, 2).setNumberFormat('0');
  return {ok:true};
}

function vocabDue_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const T = now_();
  const toMs = v => {
    if (v instanceof Date) return v.getTime();
    const n = Number(v); return isNaN(n) ? 0 : n;
  };
  const list = rowsAsObjects_(sheet_(SH.vocab))
    .filter(x => String(x.user_id) === String(u.user_id) && toMs(x.due_at) <= T)
    .sort((a,b) => toMs(a.due_at) - toMs(b.due_at))
    .slice(0,30)
    .map(x => ({vi:x.vi, th:x.th, ph:x.ph||'', slug:x.slug, box:Number(x.box)||0}));
  return {ok:true, items:list};
}

function vocabList_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const toMs = v => v instanceof Date ? v.getTime() : (Number(v)||0);
  const rows = rowsAsObjects_(sheet_(SH.vocab))
    .filter(x => String(x.user_id) === String(u.user_id))
    .map(x => ({
      vi:x.vi, th:x.th, ph:x.ph||'', slug:x.slug||'',
      box:Number(x.box)||0,
      due_at:toMs(x.due_at), created_at:toMs(x.created_at)
    }));
  const stats = {total:rows.length, byBox:[0,0,0,0,0,0], due:0};
  const T = now_();
  rows.forEach(r => { stats.byBox[r.box]++; if (r.due_at <= T) stats.due++; });
  return {ok:true, items:rows, stats:stats};
}

function vocabDelete_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const vi = String(b.vi||'').trim(); if (!vi) return {error:'invalid'};
  const sh = sheet_(SH.vocab);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const ui = h.indexOf('user_id'), vii = h.indexOf('vi');
  const idx = r.findIndex(x => String(x[ui])===String(u.user_id) && String(x[vii]).trim()===vi);
  if (idx < 0) return {error:'not found'};
  sh.deleteRow(idx+2);
  return {ok:true};
}

function vocabReview_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const vi = String(b.vi||'').trim(); const correct = !!b.correct;
  const sh = sheet_(SH.vocab);
  const r = sh.getDataRange().getValues(); const h = r.shift();
  const ui = h.indexOf('user_id'), vii = h.indexOf('vi'), bi = h.indexOf('box'), di = h.indexOf('due_at');
  const idx = r.findIndex(x => String(x[ui]) === String(u.user_id) && String(x[vii]).trim() === vi);
  if (idx < 0) return {error:'not found'};
  const cur = Number(r[idx][bi])||0;
  const next = correct ? Math.min(5, cur+1) : 0;
  const due = now_() + SRS_INTERVALS[next]*24*60*60*1000;
  sh.getRange(idx+2, bi+1).setValue(next);
  const dueCell = sh.getRange(idx+2, di+1);
  dueCell.setNumberFormat('0'); dueCell.setValue(due);
  return {ok:true, box:next};
}

function quizSubmit_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const slug = String(b.slug||''), score = Number(b.score)||0, total = Number(b.total)||0;
  if (!slug || !total) return {error:'invalid'};
  sheet_(SH.quiz_log).appendRow([u.user_id, slug, score, total, now_()]);
  return {ok:true};
}

function leaderboard_(b){
  const days = Number(b.days)||30;
  const cutoff = now_() - days*24*60*60*1000;
  const users = rowsAsObjects_(sheet_(SH.users));
  const uMap = {}; users.forEach(u => uMap[u.user_id] = {name:u.name||'', avatar:u.avatar||''});
  const tally = {};
  rowsAsObjects_(sheet_(SH.quiz_log))
    .filter(x => Number(x.ts)||0 >= cutoff)
    .forEach(x => {
      if (!tally[x.user_id]) tally[x.user_id] = {pts:0, n:0};
      tally[x.user_id].pts += Number(x.score)||0;
      tally[x.user_id].n += 1;
    });
  const top = Object.entries(tally)
    .map(([uid,v]) => ({user_id:uid, points:v.pts, attempts:v.n, name:(uMap[uid]||{}).name||'(unknown)', avatar:(uMap[uid]||{}).avatar||''}))
    .sort((a,b)=>b.points-a.points).slice(0,20);
  return {ok:true, leaderboard:top, days};
}
