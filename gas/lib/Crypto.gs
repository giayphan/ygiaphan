// Cryptographic utilities

function rid_(p){ return (p||'') + Utilities.getUuid().replace(/-/g,'').slice(0,16); }
function now_(){ return Date.now(); }
function trimKey_(k){ return String(k||'').replace(/\s+/g,''); }

// Timing-safe string comparison (กัน timing attack บน secret key/OTP)
function safeEq_(a, b){
  a = String(a||''); b = String(b||'');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i=0;i<a.length;i++) r |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  return r === 0;
}

function sha256_(s){
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s));
  return bytes.map(b => ('0'+(b<0?b+256:b).toString(16)).slice(-2)).join('');
}

function b64decode_(s){
  s = String(s).replace(/-/g,'+').replace(/_/g,'/');
  while (s.length % 4) s += '=';
  return Utilities.newBlob(Utilities.base64Decode(s)).getDataAsString('UTF-8');
}

// Mask email addresses before logging
function redact_(s){
  return String(s||'').replace(/[\w.+-]+@[\w.-]+/g, '<email>');
}

// Mask emails in user-submitted text
function maskEmails_(s){
  return String(s||'').replace(/([\w.+-]{1,3})[\w.+-]*@([\w-]+\.[\w.-]+)/g, '$1***@***');
}
