// Arraigados: funciona sin conexión
const CACHE='arraigados-v7';
const FILES=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api'))return;
  if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put('./index.html',c));return res;}).catch(()=>caches.match('./index.html')));return;}
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
    const copy=res.clone();
    if(res.ok&&(e.request.url.startsWith(self.location.origin)||e.request.url.includes('fonts.g')))caches.open(CACHE).then(c=>c.put(e.request,copy));
    return res;}).catch(()=>caches.match('./index.html'))));
});
