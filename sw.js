// ─────────────────────────────────────────────
//  FathlyWeb — Service Worker
//  Strategi: Cache-First untuk aset statis,
//            Network-First untuk konten JSON
//
//  ⚠️ PENTING — WAJIB DIBACA SEBELUM DEPLOY:
//  Setiap kali ada perubahan file apa pun di
//  situs ini (HTML, CSS, JS, ATAU JSON konten),
//  angka versi di CACHE_NAME di bawah ini HARUS
//  dinaikkan (contoh: v1.7.0 → v1.7.1).
//
//  Inilah SATU-SATUNYA penanda yang membuat
//  browser pengunjung lama sadar ada versi baru,
//  lalu memicu popup "Sudah ada versi terbaru..."
//  di index.html. Jika CACHE_NAME tidak diubah,
//  Service Worker menganggap tidak ada yang baru
//  dan popup TIDAK akan muncul, walau file sudah
//  di-deploy ke server.
// ─────────────────────────────────────────────

const CACHE_NAME = 'fathlyweb-v1.9.5';

// File yang langsung di-cache saat pertama install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/menu.css',
  '/main.js',
  '/update-notice.css',
  '/update-notice.js',
  '/static/manifest.json',
  '/static/favicon.svg',
  '/content/catatan/pages/editor.html',
  // Halaman materi
  '/content/materi/pages/abu-syuja.html',
  '/content/materi/pages/bidah.html',
  '/content/materi/pages/coming.html',
  '/content/materi/pages/iman.html',
  '/content/materi/pages/jurumiyah.html',
  '/content/materi/pages/mutammimah.html',
  '/content/materi/pages/sifat.html',
  '/content/materi/pages/siroh-nabawi.html',
  '/content/materi/pages/siroh-sahabat.html',
  '/content/materi/pages/tashrif.html',
  '/content/materi/pages/tauhid.html',
  '/content/materi/pages/umdatul-ahkam.html',
  '/content/materi/pages/wazan.html',
  '/content/materi/supports/materi.js',
  '/content/materi/supports/materi.css',
  // Konten JSON
  '/content/_data/index.json',
  '/content/materi/data/abu-syuja.json',
  '/content/materi/data/bidah.json',
  '/content/materi/data/iman.json',
  '/content/materi/data/jurumiyah.json',
  '/content/materi/data/mutammimah.json',
  '/content/materi/data/sifat.json',
  '/content/materi/data/siroh-nabawi.json',
  '/content/materi/data/siroh-sahabat.json',
  '/content/materi/data/tashrif.json',
  '/content/materi/data/tauhid.json',
  '/content/materi/data/umdatul-ahkam.json',
  '/content/materi/data/wazan.json',
  '/content/_data/coming-soon.json',
  '/content/_data/seo.json',
  '/content/kutipan/supports/kutipan.css',
  '/content/kutipan/supports/kutipan.js',
  '/content/kutipan/data/kutipan.json',
  '/content/doa/pages/doa-harian.html',
  '/content/doa/pages/doa-munajat.html',
  '/content/doa/pages/dzikir-pagi.html',
  '/content/doa/pages/dzikir-petang.html',
  '/content/doa/pages/dzikir-sholat.html',
  '/content/doa/supports/doa.css',
  '/content/doa/supports/doa.js',
  '/content/doa/data/doa-harian.json',
  '/content/doa/data/doa-munajat.json',
  '/content/doa/data/dzikir-pagi.json',
  '/content/doa/data/dzikir-petang.json',
  '/content/doa/data/dzikir-sholat.json',
  // Tab Matan
  '/content/matan/supports/matan.js',
  '/content/matan/supports/matan.css',
  '/content/matan/supports/matan-detail.js',
  '/content/matan/supports/matan-detail.css',
  '/content/matan/pages/jurumiyah.html',
  '/content/matan/data/jurumiyah.json',
  '/content/matan/pages/qawaidul-arba.html',
  '/content/matan/data/qawaidul-arba.json',
  '/content/matan/pages/arbain.html',
  '/content/matan/data/arbain.json',
  // Tab Dalil
  '/content/dalil/supports/dalil.css',
  '/content/dalil/supports/dalil.js',
  '/content/dalil/supports/dalil-detail.css',
  '/content/dalil/supports/dalil-detail.js',
  '/content/dalil/pages/detail.html',
  '/content/dalil/data/dalil.json',
];

// ── INSTALL: cache semua aset penting ─────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Pre-caching aset...');
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      console.log('[SW] Install selesai, menunggu konfirmasi user untuk aktif');
      // TIDAK skipWaiting() otomatis — SW baru menunggu (state "waiting")
      // sampai user memilih "Ya" di popup update, supaya versi lama tetap
      // dipakai selama user belum menyetujui pembaruan.
    })
  );
});

// ── PESAN DARI HALAMAN: user menyetujui update ─
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
  if (url.pathname.startsWith("/content/")) {
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
