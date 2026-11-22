const BASE = new URL("./", self.location.href);
const PREFIX = `home-app-shell-${BASE.pathname}-`;
const ASSETS = [/* BUILD_ASSETS */];
const CACHE = PREFIX + ASSETS.join("|");
const shell = ["", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"].map(path => new URL(path, BASE).href);
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...shell, ...ASSETS])).then(() => self.skipWaiting()));
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
self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() }; }
  const title = typeof payload.title === "string" ? payload.title : "Home AI";
  const body = typeof payload.body === "string" ? payload.body : "Un rappel est arrivé à échéance.";
  event.waitUntil(self.registration.showNotification(title, { body, icon: new URL("icon-192.png", BASE).href, badge: new URL("icon-192.png", BASE).href, tag: "home-ai-reminder", renotify: true, data: { url: typeof payload.url === "string" ? payload.url : "/?view=reminders" } }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/?view=reminders", BASE).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => { const existing = windows.find(window => window.url.startsWith(BASE.href)); if (existing) return existing.focus().then(() => existing.navigate(target)); return clients.openWindow(target); }));
});
