// =============================================
// UPDATE-NOTICE.JS
// Mendeteksi versi baru website (via Service Worker)
// dan menampilkan popup konfirmasi update.
//
// Popup HANYA dijalankan di index.html (halaman utama),
// sesuai permintaan: berpindah ke halaman lain lalu
// menekan "← Kembali" ke index tidak akan memicu popup
// berulang di tengah sesi yang sama.
// =============================================

(function () {
  if (!('serviceWorker' in navigator)) return;

  // Hanya jalan di halaman utama (index.html / root "/")
  var path = window.location.pathname;
  var isIndexPage = path === '/' || path.endsWith('/index.html');
  if (!isIndexPage) return;

  var overlay, btnUpdate, btnNanti;
  var waitingWorker = null;

  function buildPopup() {
    if (document.getElementById('updateNoticeOverlay')) return;

    overlay = document.createElement('div');
    overlay.className = 'update-notice-overlay';
    overlay.id = 'updateNoticeOverlay';
    overlay.innerHTML =
      '<div class="update-notice-card">' +
        '<span class="update-notice-icon">✨</span>' +
        '<div class="update-notice-title">Versi terbaru tersedia</div>' +
        '<div class="update-notice-desc">Sudah ada pembaruan konten &amp; tampilan FathlyWeb. Perbarui sekarang untuk mendapatkan versi terbaru?</div>' +
        '<div class="update-notice-actions">' +
          '<button type="button" class="update-notice-btn-nanti" id="updateNoticeBtnNanti">Tidak, nanti saja</button>' +
          '<button type="button" class="update-notice-btn-update" id="updateNoticeBtnUpdate">Ya, perbarui</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    btnUpdate = document.getElementById('updateNoticeBtnUpdate');
    btnNanti = document.getElementById('updateNoticeBtnNanti');

    btnNanti.addEventListener('click', function () {
      overlay.classList.remove('aktif');
    });

    btnUpdate.addEventListener('click', function () {
      if (!waitingWorker) return;
      btnUpdate.disabled = true;
      btnUpdate.classList.add('loading');
      btnNanti.disabled = true;

      // Begitu SW baru aktif, reload untuk memakai versi terbaru
      navigator.serviceWorker.addEventListener('controllerchange', function onCtrlChange() {
        navigator.serviceWorker.removeEventListener('controllerchange', onCtrlChange);
        window.location.reload();
      });

      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    });
  }

  function showPopup(reg) {
    buildPopup();
    waitingWorker = reg.waiting;
    overlay.classList.add('aktif');
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      // Kasus 1: sudah ada SW versi baru yang "waiting" saat halaman dimuat
      if (reg.waiting && navigator.serviceWorker.controller) {
        showPopup(reg);
      }

      // Kasus 2: SW baru terdeteksi & selesai install SAAT halaman ini terbuka
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showPopup(reg);
          }
        });
      });

      // Cek update secara aktif tiap kali index.html dibuka
      // (fetch sw.js terbaru dari network, bandingkan dengan yang terdaftar)
      reg.update().catch(function () {});
    }).catch(function (err) {
      console.warn('[UpdateNotice] SW register gagal:', err);
    });
  });
})();
