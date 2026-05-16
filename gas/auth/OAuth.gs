// Facebook + Google OAuth login

function fbLogin_(b){
  const accessToken = String(b.access_token||'');
  if (!accessToken) return {error:'no token'};
  try {
    const res = UrlFetchApp.fetch('https://graph.facebook.com/me?fields=id,name,email,picture&access_token='+encodeURIComponent(accessToken));
    const fb = JSON.parse(res.getContentText());
    if (!fb.id) return {error:'fb verify failed'};
    const user = upsertUser_({
      email: fb.email || ('fb_'+fb.id+'@noemail.local'),
      name: fb.name||'',
      provider: 'facebook',
      fb_id: fb.id,
      avatar: fb.picture && fb.picture.data ? fb.picture.data.url : ''
    });
    const s = createSession_(user.user_id);
    return {ok:true, session: s.token, user: pickUser_(user)};
  } catch(e){ return {error:'fb error: '+e}; }
}

function googleLogin_(b){
  const idToken = String(b.id_token||'');
  if (!idToken) return {error:'no token'};
  try {
    const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(idToken));
    const g = JSON.parse(res.getContentText());
    if (!g.sub || !g.email) return {error:'google verify failed'};
    const user = upsertUser_({
      email: g.email,
      name: g.name||'',
      provider: 'google',
      google_id: g.sub,
      avatar: g.picture||''
    });
    const s = createSession_(user.user_id);
    return {ok:true, session: s.token, user: pickUser_(user)};
  } catch(e){ return {error:'google error: '+e}; }
}
