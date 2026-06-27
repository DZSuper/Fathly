// =============================================
// DOA & DZIKIR — Logika Halaman Kategori
// Dipakai bersama oleh semua halaman di /doa/*.html
// Setiap halaman cukup punya:
//   <main id="doaMain" data-konten="dzikir-pagi">
// dan logika ini otomatis fetch konten/dzikir-pagi.json
// =============================================

(function () {

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var main = document.getElementById('doaMain');
    if (!main) return;
    var slug = main.getAttribute('data-konten');
    if (!slug) return;

    fetch('../konten/' + slug + '.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { render(data); })
      .catch(function () {
        main.innerHTML = '<div class="doa-empty">⚠️ Gagal memuat konten. Pastikan file konten/' + esc(slug) + '.json tersedia.</div>';
      });

    function render(data) {
      var titleEl = document.getElementById('doaPageTitle');
      var waktuEl = document.getElementById('doaPageWaktu');
      if (titleEl) titleEl.textContent = data.kategori || '';
      if (waktuEl) waktuEl.textContent = data.waktu || '';

      var list = data.doa || [];
      if (list.length === 0) {
        main.innerHTML = '<div class="doa-empty">Belum ada konten di kategori ini.</div>';
        return;
      }

      var html = '';
      list.forEach(function (d, i) {
        var hasJumlah = !!d.jumlah;
        html +=
          '<div class="doa-item" id="ditem-' + esc(d.id) + '">' +
            '<button class="doa-item-header" data-id="' + esc(d.id) + '">' +
              '<span class="doa-item-num">' + (i + 1) + '</span>' +
              '<span class="doa-item-judul">' + esc(d.judul) + '</span>' +
              (hasJumlah ? '<span class="doa-item-jumlah">' + esc(d.jumlah) + '</span>' : '') +
              '<span class="doa-item-arrow">›</span>' +
            '</button>' +
            '<div class="doa-item-body">' +
              '<div class="doa-arab-box"><p class="doa-arab-text">' + esc(d.arab) + '</p></div>' +
              '<p class="doa-latin">' + esc(d.latin) + '</p>' +
              '<p class="doa-terjemahan">"' + esc(d.terjemahan) + '"</p>' +
              (d.sumber ? '<div class="doa-meta-row"><span class="doa-meta-label">Sumber</span><span class="doa-meta-val">' + esc(d.sumber) + '</span></div>' : '') +
              (d.keterangan ? '<div class="doa-keterangan"><span class="doa-keterangan-icon">💡</span><span class="doa-keterangan-text">' + esc(d.keterangan) + '</span></div>' : '') +
              (hasJumlah ? buildCounterHtml(d.id, d.jumlah) : '') +
            '</div>' +
          '</div>';
      });

      main.innerHTML = html;

      // Toggle buka/tutup tiap item (independen, bisa lebih dari satu terbuka)
      main.querySelectorAll('.doa-item-header').forEach(function (btn) {
        btn.addEventListener('click', function () {
          btn.closest('.doa-item').classList.toggle('open');
        });
      });

      initCounters(main);
    }

    function buildCounterHtml(id, jumlahLabel) {
      var target = parseInt(String(jumlahLabel).replace(/[^0-9]/g, ''), 10) || 0;
      return (
        '<div class="doa-counter" data-target="' + target + '" id="counter-' + esc(id) + '">' +
          '<button class="doa-counter-btn minus" data-id="' + esc(id) + '" aria-label="Kurangi">−</button>' +
          '<div class="doa-counter-display" id="counterNum-' + esc(id) + '">0 <span>/ ' + (target || '?') + 'x</span></div>' +
          '<button class="doa-counter-btn plus" data-id="' + esc(id) + '" aria-label="Tambah">+</button>' +
        '</div>'
      );
    }

    function initCounters(scope) {
      scope.querySelectorAll('.doa-counter').forEach(function (counterEl) {
        var target = parseInt(counterEl.getAttribute('data-target'), 10) || 0;
        var count = 0;

        function update() {
          var numEl = counterEl.querySelector('.doa-counter-display');
          numEl.innerHTML = count + ' <span>/ ' + (target || '?') + 'x</span>';
          var done = target > 0 && count >= target;
          counterEl.classList.toggle('done', done);
          var itemEl = counterEl.closest('.doa-item');
          if (itemEl) itemEl.classList.toggle('counter-done', done);
        }

        counterEl.querySelectorAll('.doa-counter-btn.plus').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            count++;
            update();
          });
        });
        counterEl.querySelectorAll('.doa-counter-btn.minus').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            count = Math.max(0, count - 1);
            update();
          });
        });
      });
    }
  });

})();
