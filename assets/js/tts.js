// Shared cross-platform TTS — Google Translate audio + local fallback
(function(){
  let voices = [];
  function load(){
    voices = (window.speechSynthesis ? speechSynthesis.getVoices() : []) || [];
    if (window.speechSynthesis && !voices.length){
      speechSynthesis.onvoiceschanged = () => { voices = speechSynthesis.getVoices()||[]; };
    }
  }
  load();
  function pick(lang){
    const p = lang.toLowerCase();
    return voices.find(v => v.lang.toLowerCase().startsWith(p+'-'))
        || voices.find(v => v.lang.toLowerCase().startsWith(p)) || null;
  }
  function detect(text){
    return /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(text) ? 'vi' : 'th';
  }
  function speakLocal(text, l, onend){
    try{
      if (!voices.length) load();
      const u = new SpeechSynthesisUtterance(text);
      const v = pick(l); if (v) u.voice = v;
      u.lang = l === 'vi' ? 'vi-VN' : 'th-TH';
      u.rate = .85;
      if (onend) u.onend = onend;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }catch(_){ onend && onend(); }
  }
  let curAudio = null;
  function stop(){
    if (curAudio){ try{ curAudio.pause(); curAudio.src=''; }catch(_){} curAudio = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  function speak(text, lang, onend){
    if (!text){ onend && onend(); return; }
    const l = lang || detect(text);
    stop();
    if (!navigator.onLine){ speakLocal(text, l, onend); return; }
    const code = l === 'vi' ? 'vi' : 'th';
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${code}&q=${encodeURIComponent(text.slice(0,200))}`;
      curAudio = new Audio(url);
      let fell = false;
      const fb = () => { if (fell) return; fell = true; speakLocal(text, l, onend); };
      curAudio.onerror = fb;
      curAudio.onended = () => { if (onend) onend(); };
      const t = setTimeout(fb, 2500);
      curAudio.oncanplay = () => clearTimeout(t);
      curAudio.play().catch(fb);
    } catch(_){ speakLocal(text, l, onend); }
  }
  // Read a long text in sentence chunks; returns a stop function
  function speakChunks(text, lang){
    const parts = String(text||'').split(/(?<=[.!?。！？\n])\s+|—|;\s/).map(s=>s.trim()).filter(Boolean);
    if (!parts.length){ speak(text, lang); return stop; }
    let i = 0, cancelled = false;
    const next = () => {
      if (cancelled || i >= parts.length){ if (typeof window.YP_TTS.onfinish==='function') window.YP_TTS.onfinish(); return; }
      speak(parts[i++], lang, next);
    };
    next();
    return () => { cancelled = true; stop(); };
  }
  window.YP_TTS = { speak, speakChunks, stop, detect, onfinish:null };
})();
