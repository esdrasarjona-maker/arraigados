// Arraigados: funciona sin conexión
const CACHE='arraigados-v20';
const FILES=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!=='arraigandonos-biblia').map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api'))return;
  if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put('./index.html',c));return res;}).catch(()=>caches.match('./index.html')));return;}
  if(new URL(e.request.url).pathname.startsWith('/bible/')){e.respondWith(caches.open('arraigandonos-biblia').then(c=>c.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{if(res.ok)c.put(e.request,res.clone());return res;}))));return;}
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
    const copy=res.clone();
    if(res.ok&&(e.request.url.startsWith(self.location.origin)||e.request.url.includes('fonts.g')))caches.open(CACHE).then(c=>c.put(e.request,copy));
    return res;}).catch(()=>caches.match('./index.html'))));
});

self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{};}catch(_){d={body:e.data&&e.data.text()};}
  e.waitUntil(self.registration.showNotification(d.title||'Arraigados',{body:d.body||'Tu tiempo con Dios de hoy te espera.',icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'arraigados-diario',renotify:true}));});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c)return c.focus();}return clients.openWindow('./');}));});
