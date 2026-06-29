// =============================================
// DOA & DZIKIR — Logika Halaman Kategori
// Dipakai bersama oleh semua halaman di /doa/*.html
//
// Struktur yang diharapkan di HTML:
//   <div class="doa-sticky-header">
//     <a class="back-btn">...</a>
//     <button id="doaToggleAllBtn" class="doa-toggle-all-btn">...</button>
//   </div>
//   <main id="doaMain" data-konten="dzikir-pagi" data-searchable="true">
//     (data-searchable opsional — hanya untuk halaman Doa, bukan Dzikir)
// =============================================

(function () {

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var _allDoa = [];
  var _isSearchable = false;

  document.addEventListener('DOMContentLoaded', function () {
    var main = document.getElementById('doaMain');
    if (!main) return;
    var slug = main.getAttribute('data-konten');
    if (!slug) return;
    _isSearchable = main.hasAttribute('data-searchable');

    fetch('../konten/' + slug + '.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { init(data); })
      .catch(function () {
        main.innerHTML = '<div class="doa-empty">⚠️ Gagal memuat konten. Pastikan file konten/' + esc(slug) + '.json tersedia.</div>';
      });

    function init(data) {
      var titleEl = document.getElementById('doaPageTitle');
      var waktuEl = document.getElementById('doaPageWaktu');
      if (titleEl) titleEl.textContent = data.kategori || '';
      if (waktuEl) waktuEl.textContent = data.waktu || '';

      _allDoa = data.doa || [];
      if (_allDoa.length === 0) {
        main.innerHTML = '<div class="doa-empty">Belum ada konten di kategori ini.</div>';
        return;
      }

      var bodyHtml = '';

      // ── Kotak pencarian (hanya utk halaman yang ditandai searchable) ──
      if (_isSearchable) {
        bodyHtml +=
          '<div class="doa-search-wrap">' +
            '<span class="doa-search-icon">🔍</span>' +
            '<input type="search" id="doaSearchInput" class="doa-search-input" ' +
              'placeholder="Cari doa..." autocomplete="off" spellcheck="false">' +
          '</div>' +
          '<div class="doa-search-count" id="doaSearchCount"></div>';
      }

      bodyHtml +=
        '<div class="doa-mobile-view" id="doaMobileView"></div>' +
        '<div class="doa-desktop-view" id="doaDesktopView">' +
          '<div class="doa-desktop-sidebar" id="doaDesktopSidebar"></div>' +
          '<div class="doa-desktop-content" id="doaDesktopContent"></div>' +
        '</div>';

      main.innerHTML = bodyHtml;

      renderMobileView(_allDoa);
      renderDesktopView(_allDoa);
      if (_allDoa.length) selectDesktopItem(_allDoa[0].id);

      initToggleAllButton();
      if (_isSearchable) initSearch();
    }
  });

  // ── Bangun isi detail satu doa (dipakai mobile & desktop) ──
  function buildDetailHtml(d) {
    var hasJumlah = !!d.jumlah;
    return (
      '<div class="doa-arab-box"><p class="doa-arab-text">' + esc(d.arab) + '</p></div>' +
      '<p class="doa-latin">' + esc(d.latin) + '</p>' +
      '<p class="doa-terjemahan">"' + esc(d.terjemahan) + '"</p>' +
      (d.sumber ? '<div class="doa-meta-row"><span class="doa-meta-label">Sumber</span><span class="doa-meta-val">' + esc(d.sumber) + '</span></div>' : '') +
      (d.keterangan ? '<div class="doa-keterangan"><span class="doa-keterangan-icon">💡</span><span class="doa-keterangan-text">' + esc(d.keterangan) + '</span></div>' : '') +
      (hasJumlah ? buildCounterHtml(d.id, d.jumlah) : '')
    );
  }

  function buildCounterHtml(id, jumlahLabel) {
    var target = parseInt(String(jumlahLabel).replace(/[^0-9]/g, ''), 10) || 0;
    return (
      '<div class="doa-counter" data-target="' + target + '" id="counter-' + esc(id) + '">' +
        '<button class="doa-counter-btn reset" data-id="' + esc(id) + '" aria-label="Ulangi dari awal">↺</button>' +
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
      counterEl.querySelectorAll('.doa-counter-btn.reset').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          count = 0;
          update();
        });
      });
    });
  }

  // ── MOBILE: render akordeon ──
  function renderMobileView(list) {
    var wrap = document.getElementById('doaMobileView');
    if (!wrap) return;

    if (list.length === 0) {
      wrap.innerHTML = '<div class="doa-empty">Tidak ada doa yang cocok dengan pencarian.</div>';
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
          '<div class="doa-item-body">' + buildDetailHtml(d) + '</div>' +
        '</div>';
    });
    wrap.innerHTML = html;

    wrap.querySelectorAll('.doa-item-header').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.closest('.doa-item').classList.toggle('open');
      });
    });

    initCounters(wrap);
  }

  // ── DESKTOP: render daftar kiri + konten kanan ──
  function renderDesktopView(list) {
    var sidebar = document.getElementById('doaDesktopSidebar');
    if (!sidebar) return;

    if (list.length === 0) {
      sidebar.innerHTML = '<div class="doa-empty">Tidak ada hasil.</div>';
      var contentEl = document.getElementById('doaDesktopContent');
      if (contentEl) contentEl.innerHTML = '';
      return;
    }

    var html = '';
    list.forEach(function (d, i) {
      html +=
        '<button class="doa-desktop-list-item" data-id="' + esc(d.id) + '">' +
          '<span class="doa-item-num">' + (i + 1) + '</span>' +
          '<span class="doa-item-judul">' + esc(d.judul) + '</span>' +
        '</button>';
    });
    sidebar.innerHTML = html;

    sidebar.querySelectorAll('.doa-desktop-list-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectDesktopItem(btn.getAttribute('data-id'));
      });
    });
  }

  function selectDesktopItem(id) {
    var d = _allDoa.find(function (x) { return x.id === id; });
    var contentEl = document.getElementById('doaDesktopContent');
    if (!d || !contentEl) return;

    contentEl.innerHTML =
      '<h2 style="margin:0 0 4px;font-size:1.05rem;color:var(--text-light)">' + esc(d.judul) + '</h2>' +
      buildDetailHtml(d);
    initCounters(contentEl);

    document.querySelectorAll('.doa-desktop-list-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-id') === id);
    });
  }

  // ── Tombol Buka Semua / Tutup Semua ──
  function initToggleAllButton() {
    var btn = document.getElementById('doaToggleAllBtn');
    if (!btn) return;
    var allOpen = false;

    btn.addEventListener('click', function () {
      allOpen = !allOpen;
      document.querySelectorAll('#doaMobileView .doa-item').forEach(function (item) {
        item.classList.toggle('open', allOpen);
      });
      btn.innerHTML = allOpen ? '⊟ Tutup Semua' : '⊞ Buka Semua';
    });
  }

  // ── Pencarian (khusus halaman doa, bukan dzikir) ──
  function initSearch() {
    var input = document.getElementById('doaSearchInput');
    var countEl = document.getElementById('doaSearchCount');
    if (!input) return;

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var filtered = !q ? _allDoa : _allDoa.filter(function (d) {
        return (
          d.judul.toLowerCase().includes(q) ||
          d.terjemahan.toLowerCase().includes(q) ||
          d.arab.includes(input.value.trim()) ||
          (d.sumber && d.sumber.toLowerCase().includes(q))
        );
      });

      if (countEl) countEl.textContent = q ? filtered.length + ' doa ditemukan' : '';

      renderMobileView(filtered);
      renderDesktopView(filtered);
      if (filtered.length) selectDesktopItem(filtered[0].id);
    });
  }

})();
