// Donations: log + public thanks list

function donateLog_(b){
  const fp = String(b.fp||'').slice(0,128);
  const amount = Number(b.amount)||0;
  const channel = String(b.channel||'');
  const allowedCh = ['promptpay','paypal','bank'];
  if (!allowedCh.includes(channel)) return {error:'invalid channel'};
  if (amount < 1 || amount > 1000000) return {error:'invalid amount'};
  const props = PropertiesService.getScriptProperties();
  const k = 'donate_'+sha256_(fp).slice(0,16);
  const rec = JSON.parse(props.getProperty(k)||'{"n":0,"ts":0}');
  if (now_() - rec.ts < 3600*1000 && rec.n >= DONATE_MAX_PER_FP_HOUR) return {error:'rate limit'};
  rec.n = (now_()-rec.ts < 3600*1000) ? rec.n+1 : 1;
  rec.ts = now_();
  props.setProperty(k, JSON.stringify(rec));
  sheet_(SH.donations).appendRow([now_(),
    maskEmails_(String(b.name||'').slice(0,50)),
    amount, channel,
    'pending: ' + maskEmails_(String(b.note||'').slice(0,500))
  ]);
  return {ok:true};
}

function thanksList_(){
  const rows = rowsAsObjects_(sheet_(SH.donations))
    .filter(d => d.name && String(d.name).trim() !== '')
    .map(d => ({name:String(d.name).trim(), amount:Number(d.amount)||0, ts:Number(d.ts)||0}))
    .sort((a,b) => b.amount - a.amount || b.ts - a.ts)
    .slice(0,50);
  return {ok:true, list: rows};
}
