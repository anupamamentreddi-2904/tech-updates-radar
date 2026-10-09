// Offline support: app shell cache-first, update feed network-first (falls back to the last saved copy).
// Background check (Android, installed app): Periodic Background Sync fetches the feed about once a day and
// shows a notification when a newer batch of updates exists than this device has already seen.
const VERSION = "radar-v3";
const META = "radar-meta";              // what this device has seen; kept across versions
const META_KEY = "/__meta/latest";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== META).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  if (url.pathname.endsWith("/data/updates.json")) {
    const key = new Request(url.origin + url.pathname);
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(key, copy)); }
          return res;
        })
        .catch(() => caches.match(key))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && url.pathname.match(/\.(html|js|css|png|svg|webmanifest)$|\/$/)) {
        const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return res;
    }))
  );
});

const sortKey = (u) => {
  if (u.sent_sort) return u.sent_sort;
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(u.sent_date || "");
  return m ? m[3] + m[2] + m[1] : "";
};

async function checkForUpdates() {
  const res = await fetch(new URL("data/updates.json", self.registration.scope).href + "?bg=" + Date.now(), { cache: "no-store" });
  if (!res.ok) return;
  const data = await res.json();
  const items = (data.updates || []).filter((u) => u && u.id);
  const latest = items.reduce((m, u) => (sortKey(u) > m ? sortKey(u) : m), "");
  const meta = await caches.open(META);
  const seenRes = await meta.match(META_KEY);
  const seen = seenRes ? await seenRes.text() : "";
  if (!latest || latest <= seen) return;

  const fresh = items.filter((u) => sortKey(u) > seen);
  const high = fresh.filter((u) => u.relevance === "High").length;
  const top = fresh.sort((a, b) => (a.relevance === "High" ? -1 : 0) - (b.relevance === "High" ? -1 : 0)).slice(0, 3);
  await self.registration.showNotification(`${fresh.length} new tech update${fresh.length > 1 ? "s" : ""}${high ? ` · ${high} high impact` : ""}`, {
    body: top.map((u) => `• ${u.product}: ${u.title}`).join("\n"),
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: "tech-updates",
    renotify: true,
    data: { url: self.registration.scope }
  });
  try { await self.navigator.setAppBadge?.(fresh.length); } catch { /* unsupported */ }
  await meta.put(META_KEY, new Response(latest));
}

self.addEventListener("periodicsync", (e) => {
  if (e.tag === "check-updates") e.waitUntil(checkForUpdates().catch(() => {}));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = all.find((c) => c.url.startsWith(self.registration.scope));
    if (open) { await open.focus(); open.postMessage("open-bell"); return; }
    await self.clients.openWindow(self.registration.scope);
  })());
});
