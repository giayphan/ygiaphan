// Online/offline indicator
window.addEventListener('online', () => document.body.classList.remove('is-offline'));
window.addEventListener('offline', () => document.body.classList.add('is-offline'));
if (!navigator.onLine) document.body.classList.add('is-offline');

// PWA: service worker + install prompt
(function setupPWA(){
  if (!document.querySelector('link[rel="manifest"]')){
    const l = document.createElement('link'); l.rel='manifest'; l.href='manifest.json'; document.head.appendChild(l);
  }
  if (!document.querySelector('meta[name="theme-color"]')){
    const m = document.createElement('meta'); m.name='theme-color'; m.content='#2d8a4e'; document.head.appendChild(m);
  }
  if (!document.querySelector('link[rel="apple-touch-icon"]')){
    const l = document.createElement('link'); l.rel='apple-touch-icon'; l.href='assets/img/logo.png'; document.head.appendChild(l);
  }

  if ('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        setInterval(() => reg.update(), 60*60*1000);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w.addEventListener('statechange', () => {
            if (w.state==='installed' && navigator.serviceWorker.controller) showUpdate();
          });
        });
      }).catch(()=>{});
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    });
  }

  function showUpdate(){
    if (document.getElementById('yp-update-toast')) return;
    const t = document.createElement('div');
    t.id = 'yp-update-toast';
    t.innerHTML = `<span>🔄 มีเวอร์ชันใหม่</span><button>โหลดใหม่</button>`;
    document.body.appendChild(t);
    t.querySelector('button').onclick = () => {
      navigator.serviceWorker.getRegistration().then(r => r?.waiting?.postMessage('SKIP_WAITING'));
    };
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (localStorage.getItem('yp:install-dismissed')) return;
    showInstall();
  });

  function showInstall(){
    if (document.getElementById('yp-install-toast')) return;
    const t = document.createElement('div');
    t.id = 'yp-install-toast';
    t.innerHTML = `<span>📱 ติดตั้ง ygiaphan เป็นแอป</span>
      <button id="ypInstallBtn">ติดตั้ง</button>
      <button id="ypInstallX" aria-label="ปิด">✕</button>`;
    document.body.appendChild(t);
    t.querySelector('#ypInstallBtn').onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      t.remove();
    };
    t.querySelector('#ypInstallX').onclick = () => {
      localStorage.setItem('yp:install-dismissed', Date.now());
      t.remove();
    };
    setTimeout(() => t.remove(), 30000);
  }
})();
