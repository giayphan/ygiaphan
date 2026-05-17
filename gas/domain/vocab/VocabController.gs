// Vocabulary SRS (Leitner 6-box) + Quiz

const SRS_INTERVALS = [0, 1, 3, 7, 14, 30]; // days per box (0=now, 5=30 days)

function vocabSave_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const vi = String(b.vi||'').trim(), th = String(b.th||'').trim(), slug = String(b.slug||'');
  if (!vi || !th) return {error:'invalid'};
  const sh = sheet_(SH.vocab);
  const all = rowsAsObjects_(sh);
  const exists = all.find(x => String(x.user_id) === String(u.user_id) && String(x.vi).trim() === vi);
  if (exists) return {ok:true, dup:true};
  sh.appendRow([u.user_id, vi, th, slug, 0, now_(), now_()]);
  return {ok:true};
}

function vocabDue_(b){
  const u = sessionUser_(b.token); if (!u) return {error:'login required'};
  const T = now_();
  const list = rowsAsObjects_(sheet_(SH.vocab))
    .filter(x => String(x.user_id) === String(u.user_id) && Number(x.due_at||0) <= T)
    .sort((a,b) => Number(a.due_at||0) - Number(b.due_at||0))
    .slice(0,30)
    .map(x => ({vi:x.vi, th:x.th, slug:x.slug, box:Number(x.box)||0}));
  return {ok:true, items:list};
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
  sh.getRange(idx+2, di+1).setValue(due);
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
