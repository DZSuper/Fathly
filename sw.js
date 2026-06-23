// ─────────────────────────────────────────────
//  FathlyWeb — Service Worker
//  Strategi: Cache-First untuk aset statis,
//            Network-First untuk konten JSON
// ─────────────────────────────────────────────

const CACHE_NAME = 'fathlyweb-v1.3.3';

// File yang langsung di-cache saat pertama install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/menu.css',
  '/script/main.js',
  '/manifest.json',
  '/favicon.svg',
  '/catatan/editor.html',
  // Halaman materi
  '/tema/abu-syuja.html',
  '/tema/bidah.html',
  '/tema/coming.html',
  '/tema/iman.html',
  '/tema/jurumiyah.html',
  '/tema/mutammimah.html',
  '/tema/sifat.html',
  '/tema/siroh-nabawi.html',
  '/tema/siroh-sahabat.html',
  '/tema/tashrif.html',
  '/tema/tauhid.html',
  '/tema/umdatul-ahkam.html',
  '/tema/wazan.html',
  '/tema/tema.js',
  '/tema/tema.css',
  // Konten JSON
  '/konten/index.json',
  '/konten/abu-syuja.json',
  '/konten/bidah.json',
  '/konten/iman.json',
  '/konten/jurumiyah.json',
  '/konten/mutammimah.json',
  '/konten/sifat.json',
  '/konten/siroh-nabawi.json',
  '/konten/siroh-sahabat.json',
  '/konten/tashrif.json',
  '/konten/tauhid.json',
  '/konten/umdatul-ahkam.json',
  '/konten/wazan.json',
  '/konten/coming-soon.json',
  '/konten/seo.json',
  '/kutipan.css',
  '/script/kutipan.js',
  '/konten/kutipan.json',
];

// ── INSTALL: cache semua aset penting ─────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Pre-caching aset...');
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      console.log('[SW] Install selesai');
      return self.skipWaiting(); // langsung aktif tanpa nunggu tab ditutup
    })
  );
});

// ── ACTIVATE: hapus cache versi lama ──────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) {
            console.log('[SW] Menghapus cache lama:', key);
            return caches.delete(key);
          })
      );
    }).then(function() {
      console.log('[SW] Aktif & siap');
      return self.clients.claim(); // ambil kendali semua tab sekarang
    })
  );
});

// ── FETCH: strategi sesuai jenis file ─────────
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Abaikan request selain GET dan yang bukan origin sendiri
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // JSON konten → Network-First (agar konten selalu fresh jika ada koneksi)
  if (url.pathname.startsWith('/konten/')) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Semua lainnya → Cache-First (cepat, offline-ready)
  e.respondWith(cacheFirst(e.request));
});

// Cache-First: coba cache dulu, fallback ke network
function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(response) {
      // Simpan ke cache untuk berikutnya
      if (response && response.status === 200) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, copy);
        });
      }
      return response;
    });
  });
}

// Network-First: coba network dulu, fallback ke cache
function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(request, copy);
      });
    }
    return response;
  }).catch(function() {
    // Tidak ada koneksi → pakai cache
    return caches.match(request);
  });
}
