const BASE = new URL("./", self.location.href);
const PREFIX = `home-app-shell-${BASE.pathname}-`;
const ASSETS = [/* BUILD_ASSETS */];
const CACHE = PREFIX + ASSETS.join("|");
const shell = ["", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"].map(path => new URL(path, BASE).href);
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...shell, ...ASSETS])));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname) || url.pathname.startsWith("/v1/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL("index.html", BASE).href)));
  } else if (ASSETS.includes(url.pathname) || shell.includes(url.href)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
