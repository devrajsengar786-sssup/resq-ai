const CACHE='resq-event-v6-bonus';const FILES=['./','./index.html','./style.css','./theme.css','./logo.svg','./bonus.js','./app.js','./engine.js','./mission-engine.js','./mission-ui.js','./mission-actions.js','./scenarios/lost-signal.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('resq-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===self.location.origin)e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});
