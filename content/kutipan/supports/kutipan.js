// =============================================
// KUTIPAN TAB — LOGIKA UTAMA
// Dijalankan setelah main.js
// =============================================

(function () {

  var _kutipanData   = null;   // { ulama:[], kutipan:[], tema_list:[] }
  var _kutipanLoaded = false;
  var _aktifTemaList  = [];     // array tema id aktif (kosong = semua)
  var _aktifUlamaList = [];     // array ulama id aktif (kosong = semua)
  var _aktifVerifList = [];     // array status verifikasi aktif (kosong = semua)
  var _querySearch   = '';      // kata kunci pencarian
  var _showBookmark  = false;   // mode tampilkan favorit saja

  var VERIF_META = {
    terverifikasi:      { cls: 'verified',    icon: '✓', label: 'Terverifikasi' },
    perlu_ditinjau:      { cls: 'review',      icon: '⚠', label: 'Perlu Ditinjau' },
    tidak_benar:         { cls: 'invalid',     icon: '✗', label: 'Tidak Benar' },
    tidak_ditemukan:     { cls: 'notfound',    icon: '∅', label: 'Tidak Ditemukan' },
    belum_diverifikasi:  { cls: 'unverified',  icon: '?', label: 'Belum Diverifikasi' },
  };
  var VERIF_ORDER = ['terverifikasi','perlu_ditinjau','tidak_benar','tidak_ditemukan','belum_diverifikasi'];

  // Toggle satu nilai dalam array filter (multiselect)
  function toggleInArray(arr, val) {
    var idx = arr.indexOf(val);
    if (idx === -1) arr.push(val); else arr.splice(idx, 1);
    return arr;
  }

  // ── BOOKMARK supports (localStorage) ──────────
  var BOOKMARK_KEY = 'fathly_bookmarks';
  function getBookmarks() {
    try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]'); } catch(e) { return []; }
  }
  function isBookmarked(id) { return getBookmarks().indexOf(id) !== -1; }
  function toggleBookmark(id) {
    var bm = getBookmarks();
    var idx = bm.indexOf(id);
    if (idx === -1) bm.push(id); else bm.splice(idx, 1);
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bm));
    return idx === -1; // true = baru ditambah
  }

  // TEMA_LIST & TEMA_LABEL_MAP dibangun DINAMIS dari data JSON (tema_list)
  // setelah kutipan.json berhasil dimuat — lihat buildTemaList().
  // Daftar di bawah ini hanya fallback darurat jika tema_list kosong/gagal dimuat.
  var TEMA_LIST = [
    { id: 'semua', label: 'Semua', icon: '📋' },
  ];

  // Nama tema untuk label badge di entry
  var TEMA_LABEL_MAP = {};

  function buildTemaList() {
    TEMA_LIST = [{ id: 'semua', label: 'Semua', icon: '📋' }];
    var src = (_kutipanData && _kutipanData.tema_list) || [];
    src.forEach(function (t) {
      if (!t || !t.id) return;
      TEMA_LIST.push({ id: t.id, label: t.label || t.id, icon: t.icon || '🏷️' });
    });
    TEMA_LABEL_MAP = {};
    TEMA_LIST.forEach(function (t) { TEMA_LABEL_MAP[t.id] = t.label; });
  }

  // ── supports ─────────────────────────────────
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getUlama(id) {
    if (!_kutipanData) return null;
    return _kutipanData.ulama.find(function (u) { return u.id === id; }) || null;
  }

  // ── GUARD: cegah swipe horizontal child naik ke tab-switcher ──
  // Dipasang pada elemen yang punya overflow-x scroll agar swipe
  // pada elemen tersebut tidak menutup/membuka tab lain.
  function attachHScrollGuard(el) {
    if (!el) return;
    var gStartX = 0, gStartY = 0, gIsH = false;
    el.addEventListener('touchstart', function (e) {
      gStartX = e.touches[0].clientX;
      gStartY = e.touches[0].clientY;
      gIsH    = false;
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      var dx = Math.abs(e.touches[0].clientX - gStartX);
      var dy = Math.abs(e.touches[0].clientY - gStartY);
      if (!gIsH && dx > 4) gIsH = dx > dy;
      if (gIsH) e.stopPropagation();
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (gIsH) e.stopPropagation();
    }, { passive: true });
  }

  // ── INISIALISASI ─────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {

    // Pasang listener pada tombol tab Kutipan
    var tabBtn = document.querySelector('.tab-btn[data-tab="kutipan"]');
    if (tabBtn) {
      tabBtn.addEventListener('click', function () {
        if (!_kutipanLoaded) loadKutipan();
      });
    }

    // Jika halaman dibuka langsung di tab kutipan (dari localStorage)
    try {
      if (localStorage.getItem('iai_active_tab') === 'kutipan') {
        if (!_kutipanLoaded) loadKutipan();
      }
    } catch (e) {}

    // ── Cegah HANYA elemen chrome tertentu memicu scroll halaman ──
    // Daripada mengunci body sepenuhnya (itu mematikan pull-to-refresh
    // bawaan browser), kita tandai status "tab Kutipan aktif" lewat
    // MutationObserver (akurat utk semua cara pindah tab), lalu pakai
    // status itu untuk membatalkan drag HANYA kalau berasal dari tab
    // navigasi global — bukan mengunci seluruh halaman.
    var kutipanTabEl = document.getElementById('tab-kutipan');
    var isKutipanActive = false;
    if (kutipanTabEl) {
      var syncActiveFlag = function () {
        isKutipanActive = kutipanTabEl.classList.contains('active');
        document.body.classList.toggle('kutipan-tab-active', isKutipanActive); // dipakai utk styling, bukan lagi utk lock
      };
      syncActiveFlag();
      new MutationObserver(syncActiveFlag).observe(kutipanTabEl, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    var stickyHeaderEl = document.querySelector('.sticky-header');
    if (stickyHeaderEl) {
      var headerStartY = 0;
      stickyHeaderEl.addEventListener('touchstart', function (e) {
        headerStartY = e.touches[0].clientY;
      }, { passive: true });
      stickyHeaderEl.addEventListener('touchmove', function (e) {
        if (isKutipanActive && e.touches[0].clientY < headerStartY) e.preventDefault();
      }, { passive: false });
    }

    // Ulama panel back button
    var backBtn = document.getElementById('kutipanUlamaPanelBack');
    if (backBtn) {
      backBtn.addEventListener('click', closeUlamaPanel);
    }
  });

  // ── MUAT DATA JSON ───────────────────────────
  function loadKutipan() {
    var entriesEl = document.getElementById('kutipanEntries');
    if (!entriesEl) return;
    entriesEl.innerHTML = '<div class="kutipan-loading">Memuat kutipan...</div>';

    fetch('content/kutipan/data/kutipan.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _kutipanData   = data;
        _kutipanLoaded = true;
        buildKutipanUI();
      })
      .catch(function () {
        var el = document.getElementById('kutipanEntries');
        if (el) el.innerHTML = '<div class="kutipan-empty"><div class="kutipan-empty-icon">⚠️</div><div class="kutipan-empty-title">Gagal memuat kutipan</div><div class="kutipan-empty-desc">Pastikan file konten/kutipan.json tersedia.</div></div>';
      });
  }

  // ── BANGUN UI LENGKAP ────────────────────────
  function buildKutipanUI() {
    buildTemaList();
    renderTopbar();
    renderEntries();
    initSearch();
    initFilterControls();
  }

  // ── TOPBAR (info bar + badge filter) ─────────
  function renderTopbar() {
    var infoBar = document.getElementById('kutipanInfoBar');
    if (!infoBar || !_kutipanData) return;

    var filtered = filterKutipan();
    var parts = [filtered.length + ' kutipan'];
    if (_showBookmark) parts.push('⭐ Favorit');

    if (_aktifTemaList.length === 1) {
      parts.push(TEMA_LABEL_MAP[_aktifTemaList[0]] || _aktifTemaList[0]);
    } else if (_aktifTemaList.length > 1) {
      parts.push(_aktifTemaList.length + ' tema');
    }

    if (_aktifUlamaList.length === 1) {
      var uObj = getUlama(_aktifUlamaList[0]);
      if (uObj) parts.push(uObj.nama.replace(/^(Syaikh|Imam|Syaikhul Islam)\s+/i, ''));
    } else if (_aktifUlamaList.length > 1) {
      parts.push(_aktifUlamaList.length + ' ulama');
    }

    if (_aktifVerifList.length === 1) {
      parts.push((VERIF_META[_aktifVerifList[0]] || {}).label || _aktifVerifList[0]);
    } else if (_aktifVerifList.length > 1) {
      parts.push(_aktifVerifList.length + ' status');
    }

    if (_querySearch) parts.push('"' + _querySearch + '"');
    infoBar.textContent = parts.join(' · ');

    updateFilterButton();
  }

  // Update badge angka & state aktif pada tombol Filter & Favorit
  function updateFilterButton() {
    var badge = document.getElementById('kutipanFilterBadge');
    var filterBtn = document.getElementById('kutipanFilterBtn');
    var bmBtn = document.getElementById('kutipanBookmarkBtn');
    var count = _aktifTemaList.length + _aktifUlamaList.length + _aktifVerifList.length;
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    }
    if (filterBtn) filterBtn.classList.toggle('active', count > 0);
    if (bmBtn) bmBtn.classList.toggle('active', _showBookmark);
  }

  // ── KONTROL: tombol Favorit & tombol Filter ──
  function initFilterControls() {
    var bmBtn = document.getElementById('kutipanBookmarkBtn');
    if (bmBtn) {
      bmBtn.addEventListener('click', function () {
        _showBookmark = !_showBookmark;
        renderTopbar();
        renderEntries();
        var main = document.querySelector('.kutipan-main');
        if (main) main.scrollTop = 0;
      });
    }

    var filterBtn = document.getElementById('kutipanFilterBtn');
    if (filterBtn) {
      filterBtn.addEventListener('click', openFilterSheet);
    }

    // Cegah sentuhan yang dimulai dari toolbar ikut menggeser halaman
    // (body tidak overflow:hidden, jadi browser bisa "mencari" elemen
    // scroll lain ke atas kalau drag dimulai dari area yang sendirinya
    // tidak punya scroll, seperti toolbar ini). Hanya blokir arah ke ATAS
    // (yang menyebabkan bug toolbar hilang) — geser ke BAWAH dibiarkan
    // lewat supaya pull-to-refresh bawaan browser tetap berfungsi.
    var topbarEl = document.querySelector('.kutipan-topbar');
    if (topbarEl) {
      var topbarStartY = 0;
      topbarEl.addEventListener('touchstart', function (e) {
        topbarStartY = e.touches[0].clientY;
      }, { passive: true });
      topbarEl.addEventListener('touchmove', function (e) {
        if (e.touches[0].clientY < topbarStartY) e.preventDefault();
      }, { passive: false });
    }
  }

  // ── FILTER SHEET (bottom sheet: Tema + Ulama + Verifikasi, semua multiselect) ──
  function openFilterSheet() {
    var old = document.getElementById('kutipanFilterModal');
    if (old) old.remove();

    // ── DRAFT STATE ───────────────────────────────────────────
    // Salinan terpisah dari state asli. Semua tap di dalam sheet
    // hanya mengubah salinan ini. State asli (_aktifTemaList dst)
    // HANYA diperbarui saat tombol "Terapkan" ditekan. Kalau sheet
    // ditutup tanpa Terapkan, salinan ini dibuang begitu saja dan
    // state asli tidak pernah tersentuh.
    var draftTema  = _aktifTemaList.slice();
    var draftUlama = _aktifUlamaList.slice();
    var draftVerif = _aktifVerifList.slice();

    // Hitung jumlah hasil filter berdasarkan DRAFT (bukan state asli),
    // tanpa mengubah state asli sama sekali.
    function previewCount() {
      var savedTema = _aktifTemaList, savedUlama = _aktifUlamaList, savedVerif = _aktifVerifList;
      _aktifTemaList = draftTema; _aktifUlamaList = draftUlama; _aktifVerifList = draftVerif;
      var n = filterKutipan().length;
      _aktifTemaList = savedTema; _aktifUlamaList = savedUlama; _aktifVerifList = savedVerif;
      return n;
    }

    // Daftar ulama yg muncul di kutipan (urut sesuai kemunculan pertama)
    var ulamaIds = [];
    _kutipanData.kutipan.forEach(function (k) {
      if (ulamaIds.indexOf(k.ulama) === -1) ulamaIds.push(k.ulama);
    });

    function chipRow(items, getKey, getLabel, activeArr, dataAttr) {
      return items.map(function (item) {
        var key = getKey(item);
        var active = activeArr.indexOf(key) !== -1;
        return '<button class="kfilter-chip' + (active ? ' active' : '') + '" data-' + dataAttr + '="' + esc(key) + '">' +
          esc(getLabel(item)) +
        '</button>';
      }).join('');
    }

    var temaChips = chipRow(
      TEMA_LIST.filter(function (t) { return t.id !== 'semua'; }),
      function (t) { return t.id; },
      function (t) { return t.icon + ' ' + t.label; },
      draftTema, 'tema'
    );

    var ulamaChips = chipRow(
      ulamaIds, function (id) { return id; },
      function (id) { var u = getUlama(id); return u ? u.nama.replace(/^(Syaikh|Imam|Syaikhul Islam)\s+/i, '') : id; },
      draftUlama, 'ulama'
    );

    var verifChips = VERIF_ORDER.map(function (v) {
      var info = VERIF_META[v];
      var active = draftVerif.indexOf(v) !== -1;
      var vc = verifColor(v);
      var styleAttr = active ? ' style="border-color:' + vc + ';color:' + vc + ';background:' + hexAlpha(vc, 0.16) + '"' : '';
      return '<button class="kfilter-chip kfilter-chip-verif' + (active ? ' active' : '') + '" data-verif="' + v + '"' + styleAttr + '>' +
        info.icon + ' ' + info.label +
      '</button>';
    }).join('');

    var modal = document.createElement('div');
    modal.id = 'kutipanFilterModal';
    modal.className = 'kfilter-modal';
    modal.innerHTML =
      '<div class="kfilter-backdrop"></div>' +
      '<div class="kfilter-sheet">' +
        '<div class="kfilter-drag-handle-zone" id="kfilterDragZone"><div class="kfilter-drag-handle"></div></div>' +
        '<div class="kfilter-header">' +
          '<span class="kfilter-title">Filter Kutipan</span>' +
          '<button class="kfilter-reset" id="kfilterReset">Reset semua</button>' +
        '</div>' +
        '<div class="kfilter-body">' +
          '<div class="kfilter-section-label">STATUS VERIFIKASI</div>' +
          '<div class="kfilter-chip-grid">' + verifChips + '</div>' +

          '<div class="kfilter-section-label">TEMA</div>' +
          '<div class="kfilter-chip-grid">' + temaChips + '</div>' +

          '<div class="kfilter-section-label">ULAMA</div>' +
          '<div class="kfilter-chip-grid">' + ulamaChips + '</div>' +
        '</div>' +
        '<div class="kfilter-actions">' +
          '<button class="kfilter-apply-btn" id="kfilterApply">Terapkan</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    requestAnimationFrame(function () { modal.classList.add('open'); });

    // Tutup TANPA menerapkan apapun — draft dibuang, state asli tetap.
    function closeWithoutApply() {
      modal.classList.remove('open');
      setTimeout(function () { modal.remove(); }, 280);
    }

    modal.querySelector('.kfilter-backdrop').addEventListener('click', closeWithoutApply);

    // ── Geser ke bawah untuk menutup secara manual ──────────
    var sheetEl = modal.querySelector('.kfilter-sheet');
    var bodyEl  = modal.querySelector('.kfilter-body');
    var dragStartY = 0, dragDelta = 0, isDragging = false, canDrag = false;

    sheetEl.addEventListener('touchstart', function (e) {
      dragStartY = e.touches[0].clientY;
      // Kalau sentuhan dimulai dari area chip (.kfilter-body) yang punya
      // scroll sendiri, geser-tutup hanya boleh aktif kalau area itu
      // sedang di posisi paling atas. Kalau dimulai dari header/pegangan
      // (yang tidak punya scroll sendiri), selalu boleh.
      var startedInBody = bodyEl && bodyEl.contains(e.target);
      canDrag = startedInBody ? (bodyEl.scrollTop <= 0) : true;
      isDragging = true;
      sheetEl.style.transition = 'none';
    }, { passive: true });

    sheetEl.addEventListener('touchmove', function (e) {
      if (!isDragging) return;
      var currentY = e.touches[0].clientY;
      var delta = currentY - dragStartY;

      if (!canDrag || delta <= 0) {
        // Bukan geser-tutup yang valid (geser ke atas, atau dimulai saat
        // area chip belum di posisi paling atas) — biarkan native scroll
        // jalan seperti biasa, jangan ganggu apapun.
        dragDelta = 0;
        return;
      }

      // Kalau area chip baru sampai paling atas DI TENGAH gesture (misal
      // mulai geser dari tengah list, lalu list-nya habis discroll ke atas
      // sebelum jari berhenti), baru di titik itu geser-tutup ikut aktif.
      if (bodyEl && bodyEl.contains(e.target) && bodyEl.scrollTop > 0) {
        dragDelta = 0;
        return;
      }

      e.preventDefault();
      dragDelta = delta;
      sheetEl.style.transform = 'translateY(' + dragDelta + 'px)';
    }, { passive: false });

    sheetEl.addEventListener('touchend', function () {
      if (!isDragging) return;
      isDragging = false;

      if (dragDelta > 80) {
        // Lanjutkan turun dari posisi geser saat ini — JANGAN bersihkan
        // transform dulu (itu yang bikin sheet melompat balik ke posisi
        // terbuka sebelum animasi tutup berjalan). Animasikan langsung
        // menuju keluar layar sepenuhnya, sambil modal mulai memudar.
        modal.classList.remove('open'); // mulai fade opacity backdrop+modal
        sheetEl.style.transition = 'transform 0.22s cubic-bezier(0.4,0,1,1)';
        var offscreen = sheetEl.offsetHeight + 40;
        // Paksa browser mendaftarkan transition sebelum ganti target,
        // supaya animasinya benar2 dari posisi geser saat ini, bukan lompat.
        requestAnimationFrame(function () {
          sheetEl.style.transform = 'translateY(' + offscreen + 'px)';
        });
        setTimeout(function () { modal.remove(); }, 280);
      } else {
        // Batal — kembali mulus ke posisi terbuka penuh
        sheetEl.style.transition = '';
        sheetEl.style.transform = '';
      }
      dragDelta = 0;
    });

    // Tutup DENGAN menerapkan — commit draft ke state asli, baru render ulang.
    modal.querySelector('#kfilterApply').addEventListener('click', function () {
      _aktifTemaList  = draftTema;
      _aktifUlamaList = draftUlama;
      _aktifVerifList = draftVerif;
      renderTopbar();
      renderEntries();
      var main = document.querySelector('.kutipan-main');
      if (main) main.scrollTop = 0;
      closeWithoutApply();
    });

    modal.querySelector('#kfilterReset').addEventListener('click', function () {
      draftTema = []; draftUlama = []; draftVerif = [];
      modal.querySelectorAll('.kfilter-chip').forEach(function (c) {
        c.classList.remove('active');
        // Chip verifikasi pakai inline style warna — harus dibersihkan manual
        if (c.hasAttribute('data-verif')) {
          c.style.borderColor = '';
          c.style.color = '';
          c.style.background = '';
        }
      });
      updateApplyLabel();
    });

    modal.querySelectorAll('.kfilter-chip[data-tema]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        toggleInArray(draftTema, chip.getAttribute('data-tema'));
        chip.classList.toggle('active');
        updateApplyLabel();
      });
    });
    modal.querySelectorAll('.kfilter-chip[data-ulama]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        toggleInArray(draftUlama, chip.getAttribute('data-ulama'));
        chip.classList.toggle('active');
        updateApplyLabel();
      });
    });
    modal.querySelectorAll('.kfilter-chip[data-verif]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var v = chip.getAttribute('data-verif');
        toggleInArray(draftVerif, v);
        var nowActive = chip.classList.toggle('active');
        if (nowActive) {
          var vc = verifColor(v);
          chip.style.borderColor = vc;
          chip.style.color = vc;
          chip.style.background = hexAlpha(vc, 0.16);
        } else {
          chip.style.borderColor = '';
          chip.style.color = '';
          chip.style.background = '';
        }
        updateApplyLabel();
      });
    });

    function updateApplyLabel() {
      var applyBtn = modal.querySelector('#kfilterApply');
      if (applyBtn) applyBtn.textContent = 'Terapkan (' + previewCount() + ' kutipan)';
    }
    updateApplyLabel();
  }


  function verifColor(v) {
    var map = {
      terverifikasi: '#3abf80', perlu_ditinjau: '#eba523', tidak_benar: '#e84646',
      tidak_ditemukan: '#b48ee8', belum_diverifikasi: '#9ba3b8',
    };
    return map[v] || '#9ba3b8';
  }

  // ── FILTER HELPER (multiselect: OR di tiap kategori, AND antar kategori) ──
  function filterKutipan() {
    if (!_kutipanData) return [];
    var list = _kutipanData.kutipan;

    if (_showBookmark) {
      var bm = getBookmarks();
      list = list.filter(function (k) { return bm.indexOf(k.id) !== -1; });
    }

    if (_aktifTemaList.length) {
      list = list.filter(function (k) { return _aktifTemaList.indexOf(k.tema) !== -1; });
    }

    if (_aktifUlamaList.length) {
      list = list.filter(function (k) { return _aktifUlamaList.indexOf(k.ulama) !== -1; });
    }

    if (_aktifVerifList.length) {
      list = list.filter(function (k) { return _aktifVerifList.indexOf(k.verifikasi || 'belum_diverifikasi') !== -1; });
    }

    if (_querySearch) {
      var q = _querySearch.toLowerCase();
      list = list.filter(function (k) {
        var u = getUlama(k.ulama);
        return (
          k.teks.toLowerCase().includes(q) ||
          k.arab.includes(_querySearch) ||
          k.kitab.toLowerCase().includes(q) ||
          (u && u.nama.toLowerCase().includes(q)) ||
          (TEMA_LABEL_MAP[k.tema] || '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }

  // ── RENDER ENTRIES ───────────────────────────
  function renderEntries() {
    var container = document.getElementById('kutipanEntries');
    if (!container || !_kutipanData) return;

    var list = filterKutipan();
    if (list.length === 0) {
      if (_showBookmark && getBookmarks().length === 0) {
        container.innerHTML =
          '<div class="kutipan-empty-search">' +
            '<div class="kutipan-empty-search-icon">🔖</div>' +
            '<div class="kutipan-empty-search-title">Favorit kosong</div>' +
            '<div class="kutipan-empty-search-desc">Tap ☆ pada kutipan manapun untuk menyimpannya di sini.</div>' +
          '</div>';
      } else if (_showBookmark) {
        container.innerHTML =
          '<div class="kutipan-empty-search">' +
            '<div class="kutipan-empty-search-icon">🔖</div>' +
            '<div class="kutipan-empty-search-title">Tidak ada favorit di sini</div>' +
            '<div class="kutipan-empty-search-desc">Tidak ada kutipan favorit yang cocok dengan filter aktif. Coba ubah tema, ulama, atau kata kunci.</div>' +
          '</div>';
      } else if (_querySearch) {
        container.innerHTML =
          '<div class="kutipan-empty-search">' +
            '<div class="kutipan-empty-search-icon">🔍</div>' +
            '<div class="kutipan-empty-search-title">Tidak ditemukan</div>' +
            '<div class="kutipan-empty-search-desc">Tidak ada kutipan yang cocok dengan kata kunci <span class="kutipan-empty-search-query">"' + esc(_querySearch) + '"</span>. Coba kata lain atau hapus filter tema.</div>' +
          '</div>';
      } else {
        container.innerHTML = '<div class="kutipan-empty"><div class="kutipan-empty-icon">📭</div><div class="kutipan-empty-title">Belum ada kutipan</div><div class="kutipan-empty-desc">Tema ini belum memiliki kutipan yang tersedia.</div></div>';
      }
      return;
    }

    var html = '';
    list.forEach(function (k) {
      var u = getUlama(k.ulama);
      var uNama = u ? u.nama : k.ulama;
      var temaLabel = TEMA_LABEL_MAP[k.tema] || k.tema;
      var keterangan = [];
      if (k.jilid && k.jilid !== '—') keterangan.push(k.jilid);
      if (k.halaman && k.halaman !== '—') keterangan.push(k.halaman);

      // Badge status verifikasi (4 status)
      var verif = k.verifikasi || 'belum_diverifikasi';
      var VERIF_MAP = {
        terverifikasi:      { cls: 'verified',    icon: '✓', label: 'Terverifikasi' },
        perlu_ditinjau:      { cls: 'review',      icon: '⚠', label: 'Perlu Ditinjau' },
        tidak_benar:         { cls: 'invalid',     icon: '✗', label: 'Tidak Benar' },
        tidak_ditemukan:     { cls: 'notfound',    icon: '∅', label: 'Tidak Ditemukan' },
        belum_diverifikasi:  { cls: 'unverified',  icon: '?', label: 'Belum Diverifikasi' },
      };
      var vInfo = VERIF_MAP[verif] || VERIF_MAP.belum_diverifikasi;
      var verifBadgeHtml = '<span class="kutipan-verif-badge ' + vInfo.cls + '" title="' + esc(vInfo.label) + '">' + vInfo.icon + ' ' + esc(vInfo.label) + '</span>';
      var verifNoteHtml  = '';
      if (k.catatan_verifikasi) {
        var noteCls = (verif === 'terverifikasi') ? 'ok' : (verif === 'perlu_ditinjau') ? 'review' : (verif === 'tidak_benar') ? 'invalid' : (verif === 'tidak_ditemukan') ? 'notfound' : 'pending';
        verifNoteHtml =
          '<div class="kutipan-verif-note ' + noteCls + '">' +
            '<span class="kutipan-verif-note-icon">' + vInfo.icon + '</span>' +
            '<span class="kutipan-verif-note-text">' + esc(k.catatan_verifikasi) + '</span>' +
          '</div>';
      }

      // Nomor urut (berdasarkan ID, stabil meski difilter)
      var kNum = parseInt(k.id.replace(/[^0-9]/g, ''), 10) || 0;
      var numBadgeHtml = '<span class="kutipan-num-badge">No. ' + kNum + '</span>';

      html +=
        '<div class="kutipan-entry" id="kentry-' + esc(k.id) + '" data-tema="' + esc(k.tema) + '">' +
          '<div class="kutipan-entry-header">' +
            numBadgeHtml +
            '<div class="kutipan-tema-badge" data-tema="' + esc(k.tema) + '">' + esc(temaLabel) + '</div>' +
            verifBadgeHtml +
            '<button class="kutipan-bookmark-star' + (isBookmarked(k.id) ? ' saved' : '') + '" data-id="' + esc(k.id) + '" title="' + (isBookmarked(k.id) ? 'Hapus dari favorit' : 'Simpan ke favorit') + '">' +
              '<span class="kutipan-bm-star">⭐</span>' +
            '</button>' +
          '</div>' +
          verifNoteHtml +

          // Teks Arab (langsung tampil)
          '<div class="kutipan-arab-box open" id="karab-' + esc(k.id) + '">' +
            '<p class="kutipan-arab-text">' + esc(k.arab) + '</p>' +
          '</div>' +

          // Kutipan terjemah
          '<div class="kutipan-blockquote"><p>&#8220;' + esc(k.teks) + '&#8221;</p></div>' +

          // Kartu sumber
          '<div class="kutipan-source-card">' +
            '<div class="kutipan-ulama-row">' +
              '<div class="kutipan-ulama-icon">📜</div>' +
              '<div>' +
                '<button class="kutipan-ulama-btn" data-ulama="' + esc(k.ulama) + '">' + esc(uNama) + '</button>' +
                '<span class="kutipan-ulama-hint">Tap untuk biografi lengkap →</span>' +
              '</div>' +
            '</div>' +
            '<div class="kutipan-source-rows">' +
              '<div class="kutipan-source-row"><span class="kutipan-source-key">Kitab</span><span class="kutipan-source-val main">' + esc(k.kitab) + '</span></div>' +
              ((k.bab && k.bab !== '—') ? '<div class="kutipan-source-row"><span class="kutipan-source-key">Bab/Pembahasan</span><span class="kutipan-source-val">' + esc(k.bab) + '</span></div>' : '') +
              (keterangan.length ? '<div class="kutipan-source-row"><span class="kutipan-source-key">Keterangan</span><span class="kutipan-source-val">' + esc(keterangan.join(' · ')) + '</span></div>' : '') +
            '</div>' +
          '</div>' +

          // Faedah accordion
          '<button class="kutipan-faedah-toggle" data-id="' + esc(k.id) + '">' +
            '<span class="kutipan-faedah-icon">✦</span>' +
            '<span class="kutipan-faedah-label">Faedah dari kutipan ini</span>' +
            '<span class="kutipan-faedah-arrow">›</span>' +
          '</button>' +
          '<div class="kutipan-faedah-list" id="kfaedah-' + esc(k.id) + '">' +
            k.faedah.map(function (f) {
              return '<div class="kutipan-faedah-item"><span class="kutipan-faedah-dot">✦</span><span class="kutipan-faedah-text">' + esc(f) + '</span></div>';
            }).join('') +
          '</div>' +

          // Tombol generate gambar
          '<div class="kutipan-actions">' +
            '<button class="kutipan-btn-generate" data-id="' + esc(k.id) + '">Kartu Kutipan</button>' +
          '</div>' +

        '</div>';
    });

    container.innerHTML = html;

    // Pasang event: toggle Faedah
    container.querySelectorAll('.kutipan-faedah-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id     = btn.getAttribute('data-id');
        var list   = document.getElementById('kfaedah-' + id);
        var isOpen = btn.classList.contains('open');
        btn.classList.toggle('open', !isOpen);
        if (list) list.classList.toggle('open', !isOpen);
      });
    });

    // Pasang event: tap nama ulama
    container.querySelectorAll('.kutipan-ulama-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openUlamaPanel(btn.getAttribute('data-ulama'));
      });
    });

    // Pasang event: bookmark star
    container.querySelectorAll('.kutipan-bookmark-star').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kid = btn.getAttribute('data-id');
        var added = toggleBookmark(kid);
        btn.classList.toggle('saved', added);
        btn.title = added ? 'Hapus dari favorit' : 'Simpan ke favorit';
        // Update info bar jika mode favorit sedang aktif
        if (_showBookmark) renderTopbar();
        // Jika mode favorit aktif dan dihapus, hapus kartu dari DOM
        if (_showBookmark && !added) {
          var entry = document.getElementById('kentry-' + kid);
          if (entry) {
            entry.style.transition = 'opacity 0.3s, transform 0.3s';
            entry.style.opacity = '0';
            entry.style.transform = 'scale(0.97)';
            setTimeout(function() {
              entry.remove();
              // Cek apakah masih ada entry
              if (!container.querySelector('.kutipan-entry')) {
                container.innerHTML =
                  '<div class="kutipan-empty-search">' +
                    '<div class="kutipan-empty-search-icon">🔖</div>' +
                    '<div class="kutipan-empty-search-title">Favorit kosong</div>' +
                    '<div class="kutipan-empty-search-desc">Tap ☆ pada kutipan manapun untuk menyimpannya di sini.</div>' +
                  '</div>';
              }
            }, 300);
          }
        }
      });
    });

    // Pasang event: generate gambar
    container.querySelectorAll('.kutipan-btn-generate').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kid = btn.getAttribute('data-id');
        var k = _kutipanData.kutipan.find(function(q){ return q.id === kid; });
        var u = k ? getUlama(k.ulama) : null;
        if (k && u) generateKutipanImage(k, u);
      });
    });
  }

  // ── ULAMA PANEL ──────────────────────────────
  var _activeUlamaTab = 'bio';

  function openUlamaPanel(ulamaId) {
    var panel = document.getElementById('kutipanUlamaPanel');
    if (!panel || !_kutipanData) return;

    var u = getUlama(ulamaId);
    if (!u) return;

    _activeUlamaTab = 'bio';

    // Sembunyikan hamburger agar tidak menimpa tombol Kembali
    var hbBtn = document.getElementById('hamburgerBtn');
    if (hbBtn) hbBtn.style.display = 'none';

    var milik = _kutipanData.kutipan.filter(function (k) { return k.ulama === ulamaId; });

    // Bangun konten panel
    var headerHtml =
      '<button class="kup-back-btn" id="kutipanUlamaPanelBack">← Kembali</button>' +

      // Identity card
      '<div class="kup-id-card">' +
        '<div class="kup-id-row">' +
          '<div class="kup-id-icon">📜</div>' +
          '<div>' +
            '<div class="kup-id-nama">' + esc(u.nama) + '</div>' +
            '<div class="kup-id-info">' + esc(u.kuniyah) + ' · ' + esc(u.nama_lengkap) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="kup-dates">' +
          '<div class="kup-date-chip"><span>Lahir </span><span>' + esc(u.lahir) + '</span></div>' +
          '<div class="kup-date-chip"><span>Wafat </span><span>' + esc(u.wafat) + '</span></div>' +
        '</div>' +
      '</div>' +

      // Tab bar
      '<div class="kup-tabs">' +
        '<button class="kup-tab-btn active" data-tab="bio">Biografi</button>' +
        '<button class="kup-tab-btn" data-tab="kitab">Kitab (' + u.kitab_karangan.length + ')</button>' +
        '<button class="kup-tab-btn" data-tab="kutipan">Kutipan (' + milik.length + ')</button>' +
      '</div>';

    // Pane: Biografi
    var bioHtml =
      '<p class="kup-bio-text">' + esc(u.bio) + '</p>' +
      '<div class="kup-section-label gold">GURU-GURU</div>' +
      u.guru.map(function (g) {
        return '<div class="kup-list-item"><span class="kup-list-dot gold">•</span><span class="kup-list-text">' + esc(g) + '</span></div>';
      }).join('') +
      '<div class="kup-divider"></div>' +
      '<div class="kup-section-label green">MURID-MURID</div>' +
      u.murid.map(function (m) {
        return '<div class="kup-list-item"><span class="kup-list-dot green">•</span><span class="kup-list-text">' + esc(m) + '</span></div>';
      }).join('');

    // Pane: Kitab
    var kitabHtml = u.kitab_karangan.map(function (k) {
      return '<div class="kup-kitab-card"><div class="kup-kitab-judul">' + esc(k.judul) + '</div><div class="kup-kitab-topik">' + esc(k.topik) + '</div></div>';
    }).join('');

    // Pane: Kutipan milik ulama ini
    var kutipanHtml = milik.length === 0
      ? '<div class="kutipan-empty"><div class="kutipan-empty-icon">📭</div><div class="kutipan-empty-title">Belum ada kutipan</div></div>'
      : milik.map(function (k) {
          var tl = TEMA_LABEL_MAP[k.tema] || k.tema;
          var kVerif = k.verifikasi || 'belum_diverifikasi';
          var MINI_MAP = {
            terverifikasi:      { cls: 'verified',   icon: '✓' },
            perlu_ditinjau:      { cls: 'review',     icon: '⚠' },
            tidak_benar:         { cls: 'invalid',    icon: '✗' },
            tidak_ditemukan:     { cls: 'notfound',   icon: '∅' },
            belum_diverifikasi:  { cls: 'unverified', icon: '?' },
          };
          var mInfo = MINI_MAP[kVerif] || MINI_MAP.belum_diverifikasi;
          var kVerifMini = '<span class="kutipan-verif-mini ' + mInfo.cls + '">' + mInfo.icon + '</span>';
          var kNumMini = parseInt(k.id.replace(/[^0-9]/g, ''), 10) || 0;
          return '<button class="kup-quote-card" data-kutipan-id="' + esc(k.id) + '" data-tema="' + esc(k.tema) + '" data-ulama-id="' + esc(k.ulama) + '">' +
            '<span class="kutipan-num-badge mini">No. ' + kNumMini + '</span>' +
            '<span class="kutipan-tema-badge">' + esc(tl) + '</span>' +
            kVerifMini +
            '<div class="kup-quote-preview">"' + esc(k.teks.substring(0, 100)) + (k.teks.length > 100 ? '…' : '') + '"</div>' +
            '<div class="kup-quote-meta">' + esc(k.kitab) + ' · ' + esc(k.halaman) + '</div>' +
          '</button>';
        }).join('');

    // Render
    var headerEl = document.getElementById('kutipanUlamaPanelHeader');
    var bodyEl   = document.getElementById('kutipanUlamaPanelBody');
    if (!headerEl || !bodyEl) return;

    headerEl.innerHTML = headerHtml;
    bodyEl.innerHTML =
      '<div class="kup-pane active" id="kupPane-bio">'    + bioHtml    + '</div>' +
      '<div class="kup-pane"        id="kupPane-kitab">'  + kitabHtml  + '</div>' +
      '<div class="kup-pane"        id="kupPane-kutipan">' + kutipanHtml + '</div>';

    panel.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Back button
    document.getElementById('kutipanUlamaPanelBack').addEventListener('click', closeUlamaPanel);

    // Tab switching
    headerEl.querySelectorAll('.kup-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab');
        headerEl.querySelectorAll('.kup-tab-btn').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-tab') === target);
        });
        bodyEl.querySelectorAll('.kup-pane').forEach(function (pane) {
          pane.classList.remove('active');
        });
        var targetPane = document.getElementById('kupPane-' + target);
        if (targetPane) targetPane.classList.add('active');
        bodyEl.scrollTop = 0;
      });
    });

    // Tap kutipan → tutup panel, scroll ke entry, highlight
    bodyEl.querySelectorAll('.kup-quote-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var kid   = card.getAttribute('data-kutipan-id');
        var tema  = card.getAttribute('data-tema');
        var uid   = card.getAttribute('data-ulama-id');
        closeUlamaPanel();

        // Pastikan kutipan target tidak tersembunyi oleh filter aktif
        var akanTersembunyi =
          (_aktifTemaList.length && _aktifTemaList.indexOf(tema) === -1) ||
          (_aktifUlamaList.length && uid && _aktifUlamaList.indexOf(uid) === -1) ||
          (_aktifVerifList.length) || _querySearch || _showBookmark;
        if (akanTersembunyi) {
          _aktifTemaList = []; _aktifUlamaList = []; _aktifVerifList = [];
          _querySearch = ''; _showBookmark = false;
          var searchInput = document.getElementById('kutipanSearch');
          if (searchInput) searchInput.value = '';
          renderTopbar();
          renderEntries();
        }

        // Scroll & highlight
        setTimeout(function () {
          var entry = document.getElementById('kentry-' + kid);
          if (entry) {
            entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
            entry.classList.add('highlighted');
            setTimeout(function () { entry.classList.remove('highlighted'); }, 2200);
          }
        }, 120);
      });
    });
  }

  function closeUlamaPanel() {
    var panel = document.getElementById('kutipanUlamaPanel');
    if (panel) panel.classList.remove('show');
    document.body.style.overflow = '';
    // Tampilkan kembali hamburger
    var hbBtn = document.getElementById('hamburgerBtn');
    if (hbBtn) hbBtn.style.display = '';
  }


  // ── GENERATE GAMBAR KUTIPAN ──────────────────
  var TEMA_PALETTE = {
    tauhid:  { accent: '#38bdf8', bg1: '#0a1628', bg2: '#0d2040', text: '#e0f2fe' },
    hati:    { accent: '#fb7185', bg1: '#1a0a10', bg2: '#2a0f18', text: '#ffe4e6' },
    ilmu:    { accent: '#facc15', bg1: '#141008', bg2: '#221a0a', text: '#fef9c3' },
    sunnah:  { accent: '#4ade80', bg1: '#081410', bg2: '#0d2018', text: '#dcfce7' },
    zuhud:   { accent: '#c8975a', bg1: '#120d06', bg2: '#1e1508', text: '#fde8c8' },
    akhlak:  { accent: '#c084fc', bg1: '#100818', bg2: '#1a0d28', text: '#f3e8ff' },
    ikhlas:  { accent: '#2dd4bf', bg1: '#071412', bg2: '#0c1e1c', text: '#ccfbf1' },
    taubat:  { accent: '#fb923c', bg1: '#150a04', bg2: '#221208', text: '#ffedd5' },
    ibadah:  { accent: '#818cf8', bg1: '#090a18', bg2: '#10122a', text: '#e0e7ff' },
    nasihat: { accent: '#a3e635', bg1: '#0c1204', bg2: '#141c06', text: '#ecfccb' },
    sabar:   { accent: '#94a3b8', bg1: '#0c0e12', bg2: '#14181e', text: '#e2e8f0' },
    tawakal: { accent: '#22d3ee', bg1: '#061214', bg2: '#0a1e22', text: '#cffafe' },
    syukur:  { accent: '#34d399', bg1: '#071210', bg2: '#0c1e18', text: '#d1fae5' },
    akhirat: { accent: '#cbd5e1', bg1: '#0c0e12', bg2: '#141820', text: '#f1f5f9' },
    doa:     { accent: '#f43f5e', bg1: '#140608', bg2: '#200c10', text: '#ffe4e6' },
    quran:         { accent: '#eab308', bg1: '#120e02', bg2: '#1e1604', text: '#fef9c3' },
    tawadhu:       { accent: '#7ec8a8', bg1: '#051210', bg2: '#0a1e18', text: '#d4f5e8' },
    ukhuwah:       { accent: '#f0a858', bg1: '#140900', bg2: '#201400', text: '#fff0d8' },
    birulwalidain: { accent: '#e888b0', bg1: '#120608', bg2: '#1e0c14', text: '#ffe8f4' },
    wara:          { accent: '#98b8d8', bg1: '#080c10', bg2: '#10161e', text: '#d8e8f8' },
  };

  var TEMA_LABEL_LOCAL = {
    tauhid:'Tauhid & Aqidah', hati:'Hati & Jiwa', ilmu:'Ilmu & Belajar',
    sunnah:'Sunnah & Bid\'ah', zuhud:'Zuhud & Dunia', akhlak:'Akhlak & Adab',
    ikhlas:'Ikhlas & Niat', taubat:'Taubat', ibadah:'Ibadah',
    nasihat:'Nasihat', sabar:'Sabar', tawakal:'Tawakkal',
    syukur:'Syukur', akhirat:'Akhirat & Maut', doa:'Doa & Dzikir', quran:"Al-Qur'an",
    tawadhu:"Tawadhu'", ukhuwah:'Ukhuwah', birulwalidain:'Birrul Walidain', wara:"Wara'"
  };

  function generateKutipanImage(k, u) {
    var pal = TEMA_PALETTE[k.tema] || { accent:'#ffd700', bg1:'#0b0c0e', bg2:'#141618', text:'#f2f2f2' };

    // Canvas dimensions — rasio 4:5 (cocok Instagram/WA)
    var W = 1080, H = 1350;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');

    // ── Background: diagonal gradient kaya ──
    var bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0,   pal.bg1);
    bgGrad.addColorStop(0.4, pal.bg2);
    bgGrad.addColorStop(1,   pal.bg1);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Cahaya aksen: sudut kiri atas ──
    var radTL = ctx.createRadialGradient(W * 0.05, H * 0.05, 0, W * 0.05, H * 0.05, W * 0.55);
    radTL.addColorStop(0, hexAlpha(pal.accent, 0.08));
    radTL.addColorStop(1, 'transparent');
    ctx.fillStyle = radTL;
    ctx.fillRect(0, 0, W, H);

    // ── Cahaya aksen: sudut kanan bawah ──
    var radBR = ctx.createRadialGradient(W * 0.95, H * 0.92, 0, W * 0.95, H * 0.92, W * 0.55);
    radBR.addColorStop(0, hexAlpha(pal.accent, 0.07));
    radBR.addColorStop(1, 'transparent');
    ctx.fillStyle = radBR;
    ctx.fillRect(0, 0, W, H);

    // ── Bintang-bintang kecil ──
    drawStars(ctx, W, H, pal.accent);

    // ── Garis aksen kiri ──
    ctx.fillStyle = pal.accent;
    ctx.fillRect(60, 90, 5, H - 180);

    // ── Badge tema ──
    var temaLabel = TEMA_LABEL_LOCAL[k.tema] || k.tema;
    ctx.font = 'bold 30px serif';
    var badgeW = ctx.measureText(temaLabel).width + 40;
    roundRect(ctx, 90, 90, badgeW, 52, 10);
    ctx.fillStyle = hexAlpha(pal.accent, 0.15);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(pal.accent, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.textBaseline = 'middle';
    ctx.fillText(temaLabel, 110, 116);

    // ── Teks Arab ──
    var arabY = 200;
    ctx.font = '52px serif';
    ctx.fillStyle = pal.text;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    var arabLines = wrapText(ctx, k.arab, W - 100, 90, 800);
    arabLines.forEach(function(line, i) {
      ctx.fillText(line, W - 90, arabY + i * 76);
    });
    arabY += arabLines.length * 76 + 20;

    // ── Garis pemisah ──
    var sepY = arabY + 18;
    ctx.strokeStyle = hexAlpha(pal.accent, 0.35);
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(90, sepY); ctx.lineTo(W - 90, sepY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Terjemahan ──
    var terjY = sepY + 36;
    ctx.font = 'italic 36px serif';
    ctx.fillStyle = pal.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.92;
    // Tanda kutip pembuka
    ctx.font = 'bold 72px serif';
    ctx.fillStyle = hexAlpha(pal.accent, 0.4);
    ctx.fillText('\u201C', 88, terjY - 10);
    ctx.font = 'italic 36px serif';
    ctx.fillStyle = pal.text;
    var terjLines = wrapText(ctx, k.teks, ctx, 110, 900);
    terjLines.forEach(function(line, i) {
      ctx.fillText(line, 110, terjY + 52 + i * 54);
    });
    terjY += 52 + terjLines.length * 54 + 20;
    ctx.globalAlpha = 1;

    // ── Atribusi (nama ulama + kitab) ──
    var attrY = Math.max(terjY + 40, H - 280);

    // Garis aksen sebelum atribusi
    ctx.fillStyle = pal.accent;
    ctx.fillRect(90, attrY, 60, 3);

    ctx.font = 'bold 38px serif';
    ctx.fillStyle = pal.accent;
    ctx.textAlign = 'left';
    ctx.fillText('— ' + u.nama, 90, attrY + 24);

    ctx.font = '28px serif';
    ctx.fillStyle = hexAlpha(pal.text, 0.65);
    ctx.fillText(k.kitab, 90, attrY + 76);

    // ── Footer: nama app ──
    ctx.font = 'bold 26px serif';
    ctx.fillStyle = hexAlpha(pal.accent, 0.5);
    ctx.textAlign = 'center';
    ctx.fillText('FathlyWeb · Kutipan Ulama Salaf', W / 2, H - 60);

    // ── Modal preview ──
    showImageModal(canvas, k, pal);
  }

  function drawStars(ctx, W, H, accentColor) {
    // Seed pseudo-random agar bintang konsisten per render
    var stars = [
      // [x_ratio, y_ratio, radius, alpha]
      // Zona tepi kiri atas
      [0.04, 0.06, 2.5, 0.55], [0.08, 0.13, 1.5, 0.35], [0.03, 0.19, 2.0, 0.45],
      [0.12, 0.08, 1.2, 0.30], [0.06, 0.27, 1.8, 0.40],
      // Zona tepi kanan atas
      [0.88, 0.04, 2.2, 0.50], [0.93, 0.11, 1.6, 0.38], [0.96, 0.18, 2.8, 0.45],
      [0.84, 0.09, 1.3, 0.28], [0.91, 0.22, 1.7, 0.42], [0.97, 0.29, 1.4, 0.32],
      // Zona tepi kanan tengah
      [0.95, 0.42, 2.0, 0.35], [0.98, 0.50, 1.5, 0.28], [0.93, 0.58, 1.8, 0.38],
      // Zona tepi kiri tengah
      [0.02, 0.38, 1.6, 0.32], [0.05, 0.46, 2.2, 0.42], [0.03, 0.55, 1.4, 0.30],
      // Zona tepi kiri bawah
      [0.04, 0.70, 2.0, 0.38], [0.07, 0.78, 1.5, 0.30], [0.03, 0.86, 2.4, 0.45],
      [0.10, 0.83, 1.2, 0.25], [0.06, 0.92, 1.8, 0.35],
      // Zona tepi kanan bawah
      [0.92, 0.72, 1.6, 0.32], [0.96, 0.80, 2.2, 0.42], [0.89, 0.88, 1.4, 0.30],
      [0.94, 0.93, 2.0, 0.38], [0.97, 0.87, 1.5, 0.28],
      // Zona atas tengah (jauh dari teks)
      [0.35, 0.02, 1.8, 0.35], [0.52, 0.015, 2.2, 0.45], [0.68, 0.025, 1.5, 0.30],
      [0.25, 0.04, 1.2, 0.28], [0.78, 0.03, 1.9, 0.38],
      // Zona bawah tengah (di atas footer)
      [0.30, 0.97, 1.5, 0.30], [0.50, 0.975, 1.8, 0.38], [0.70, 0.968, 1.4, 0.28],
    ];

    stars.forEach(function(s) {
      var x = s[0] * W, y = s[1] * H, r = s[2], a = s[3];
      // Bintang 4 titik (cross/diamond lebih elegan dari lingkaran)
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = accentColor;
      // Titik besar di tengah
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // Glow samar
      var glow = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      glow.addColorStop(0, hexAlpha(accentColor, 0.3));
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Beberapa bintang lebih besar berbentuk "+"/salib kecil
    var bigStars = [
      [0.96, 0.14, 5, 0.5], [0.04, 0.65, 4, 0.45], [0.93, 0.67, 4.5, 0.4],
      [0.07, 0.10, 4, 0.4], [0.50, 0.01, 3.5, 0.45]
    ];
    bigStars.forEach(function(s) {
      var x = s[0]*W, y = s[1]*H, r = s[2], a = s[3];
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r*2.5, y); ctx.lineTo(x + r*2.5, y);
      ctx.moveTo(x, y - r*2.5); ctx.lineTo(x, y + r*2.5);
      ctx.stroke();
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, _dummy, x, maxWidth) {
    // Split by space (for translation) or char chunks (for Arab)
    var isArab = /[\u0600-\u06FF]/.test(text);
    var words = isArab ? text.split(' ') : text.split(' ');
    var lines = [], current = '';
    words.forEach(function(w) {
      var test = current ? current + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function hexAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1,3),16);
    var g = parseInt(hex.slice(3,5),16);
    var b = parseInt(hex.slice(5,7),16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function showImageModal(canvas, k, pal) {
    // Hapus modal lama jika ada
    var old = document.getElementById('kutipanImgModal');
    if (old) old.remove();

    var dataUrl = canvas.toDataURL('image/png');

    var modal = document.createElement('div');
    modal.id = 'kutipanImgModal';
    modal.className = 'kimg-modal';
    modal.innerHTML =
      '<div class="kimg-backdrop"></div>' +
      '<div class="kimg-sheet">' +
        '<div class="kimg-header">' +
          '<span class="kimg-title">Gambar Siap Posting</span>' +
          '<button class="kimg-close" id="kimg-close-btn">✕</button>' +
        '</div>' +
        '<div class="kimg-preview">' +
          '<img src="' + dataUrl + '" class="kimg-img" alt="kutipan" />' +
        '</div>' +
        '<div class="kimg-actions">' +
          '<a class="kimg-btn kimg-btn-dl" download="kutipan-' + k.id + '.png" href="' + dataUrl + '">Unduh PNG</a>' +
          '<button class="kimg-btn kimg-btn-share" id="kimg-share-btn">Bagikan</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    requestAnimationFrame(function() { modal.classList.add('open'); });

    // Close
    modal.querySelector('#kimg-close-btn').addEventListener('click', function() {
      modal.classList.remove('open');
      setTimeout(function() { modal.remove(); }, 300);
    });
    modal.querySelector('.kimg-backdrop').addEventListener('click', function() {
      modal.classList.remove('open');
      setTimeout(function() { modal.remove(); }, 300);
    });

    // Share (Web Share API jika tersedia)
    modal.querySelector('#kimg-share-btn').addEventListener('click', function() {
      canvas.toBlob(function(blob) {
        if (navigator.share && navigator.canShare) {
          var file = new File([blob], 'kutipan-' + k.id + '.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'Kutipan Ulama Salaf' });
            return;
          }
        }
        // Fallback: download
        var a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'kutipan-' + k.id + '.png';
        a.click();
      });
    });
  }


  // ── SEARCH ───────────────────────────────────
  function initSearch() {
    var input = document.getElementById('kutipanSearch');
    var clearBtn = document.getElementById('kutipanSearchClear');
    if (!input) return;

    // Debounce agar tidak render tiap huruf
    var debounceTimer;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        _querySearch = input.value.trim();
        clearBtn.classList.toggle('visible', _querySearch.length > 0);
        // Semua filter aktif tetap — search hanya mempersempit hasil
        var main = document.querySelector('.kutipan-main');
        if (main) main.scrollTop = 0;
        renderTopbar();
        renderEntries();
      }, 250);
    });

    clearBtn.addEventListener('click', function () {
      input.value = '';
      _querySearch = '';
      clearBtn.classList.remove('visible');
      input.focus();
      renderTopbar();
      renderEntries();
    });

    // Saat tema/ulama berganti, clear search jika ingin fresh — tidak wajib, tapi UX lebih bersih
    // Kita biarkan search tetap aktif agar bisa kombinasi filter + search
  }

})();