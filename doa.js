// =============================================
// DOA & DZIKIR — Logika Halaman Kategori
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

  // ── STATE COUNTER TERSENTRALISASI ─────────────────────────
  // Satu sumber kebenaran untuk semua hitungan, terlepas dari mode
  // tampilan (akordeon vs 2-kolom). Setiap kali counter berubah,
  // SEMUA elemen yang menampilkan id itu (bisa ada di kedua mode
  // sekaligus dalam DOM) ikut diperbarui. State ini hanya direset
  // saat halaman benar-benar dimuat ulang (sesuai permintaan: hanya
  // hilang jika user keluar lalu masuk lagi ke halaman).
  var _counterState = {}; // { [id]: currentCount }

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

      // Inisialisasi state counter untuk semua dzikir yang punya jumlah
      _allDoa.forEach(function (d) {
        if (d.jumlah) _counterState[d.id] = 0;
      });

      var bodyHtml = '';

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

  function targetOf(jumlahLabel) {
    return parseInt(String(jumlahLabel).replace(/[^0-9]/g, ''), 10) || 0;
  }

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
    var target = targetOf(jumlahLabel);
    return (
      '<div class="doa-counter" data-id="' + esc(id) + '" data-target="' + target + '">' +
        '<button class="doa-counter-btn reset" data-id="' + esc(id) + '" aria-label="Ulangi dari awal">↺</button>' +
        '<button class="doa-counter-btn minus" data-id="' + esc(id) + '" aria-label="Kurangi">−</button>' +
        '<div class="doa-counter-display js-counter-display">0 <span>/ ' + (target || '?') + 'x</span></div>' +
        '<button class="doa-counter-btn plus" data-id="' + esc(id) + '" aria-label="Tambah">+</button>' +
      '</div>'
    );
  }

  // ── Pasang event counter, baca/tulis dari _counterState ───
  // (dipanggil ulang setiap kali bagian DOM yang berisi counter
  // dirender, baik di mode akordeon maupun mode 2-kolom)
  function initCounters(scope) {
    scope.querySelectorAll('.doa-counter').forEach(function (counterEl) {
      var id = counterEl.getAttribute('data-id');
      var target = parseInt(counterEl.getAttribute('data-target'), 10) || 0;

      counterEl.querySelectorAll('.doa-counter-btn.plus').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var cur = _counterState[id] || 0;
          // Poin 1: tidak bisa melewati batas target
          if (target > 0 && cur >= target) return;
          _counterState[id] = cur + 1;
          refreshCounterUI(id);
        });
      });
      counterEl.querySelectorAll('.doa-counter-btn.minus').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var cur = _counterState[id] || 0;
          _counterState[id] = Math.max(0, cur - 1);
          refreshCounterUI(id);
        });
      });
      counterEl.querySelectorAll('.doa-counter-btn.reset').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          _counterState[id] = 0;
          refreshCounterUI(id);
        });
      });
    });

    // Render awal sesuai state yang sudah ada (penting saat pindah mode
    // tampilan — angka yang sudah berjalan harus langsung tampil benar,
    // bukan mulai dari 0 lagi).
    scope.querySelectorAll('.doa-counter').forEach(function (counterEl) {
      refreshCounterUI(counterEl.getAttribute('data-id'));
    });
  }

  // Perbarui SEMUA elemen counter & centang utk id ini, di manapun
  // posisinya di DOM (mobile view & desktop view bisa sama-sama ada).
  function refreshCounterUI(id) {
    var cur = _counterState[id] || 0;
    document.querySelectorAll('.doa-counter[data-id="' + id + '"]').forEach(function (counterEl) {
      var target = parseInt(counterEl.getAttribute('data-target'), 10) || 0;
      var displayEl = counterEl.querySelector('.js-counter-display');
      if (displayEl) displayEl.innerHTML = cur + ' <span>/ ' + (target || '?') + 'x</span>';

      var done = target > 0 && cur >= target;
      counterEl.classList.toggle('done', done);

      var plusBtn = counterEl.querySelector('.doa-counter-btn.plus');
      if (plusBtn) plusBtn.disabled = done; // Poin 1: nonaktifkan tombol + saat sudah mentok

      var itemEl = counterEl.closest('.doa-item');
      if (itemEl) itemEl.classList.toggle('counter-done', done);
    });

    // Poin 3: perbarui tanda centang di judul, baik di akordeon
    // maupun di daftar sidebar mode 2-kolom.
    var target2 = (_allDoa.find(function (d) { return d.id === id; }) || {}).jumlah;
    var done2 = targetOf(target2) > 0 && cur >= targetOf(target2);
    document.querySelectorAll('.js-check-icon[data-id="' + id + '"]').forEach(function (chk) {
      chk.classList.toggle('checked', done2);
      chk.textContent = done2 ? '✓' : '';
    });
  }

  function checkIconHtml(id) {
    return '<span class="doa-check-icon js-check-icon" data-id="' + esc(id) + '"></span>';
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
            (hasJumlah ? checkIconHtml(d.id) : '') +
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
      var hasJumlah = !!d.jumlah;
      html +=
        '<button class="doa-desktop-list-item" data-id="' + esc(d.id) + '">' +
          '<span class="doa-item-num">' + (i + 1) + '</span>' +
          '<span class="doa-item-judul">' + esc(d.judul) + '</span>' +
          (hasJumlah ? checkIconHtml(d.id) : '') +
        '</button>';
    });
    sidebar.innerHTML = html;

    sidebar.querySelectorAll('.doa-desktop-list-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectDesktopItem(btn.getAttribute('data-id'));
      });
    });

    // Centang di sidebar harus diperbarui begitu dirender (tidak ada
    // .doa-counter di sini, jadi panggil langsung per item).
    list.forEach(function (d) {
      if (d.jumlah) refreshCounterUI(d.id);
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
