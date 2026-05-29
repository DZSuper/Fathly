// =============================================
// KUTIPAN TAB — LOGIKA UTAMA
// Dijalankan setelah main.js
// =============================================

(function () {

  var _kutipanData   = null;   // { ulama:[], kutipan:[] }
  var _kutipanLoaded = false;
  var _aktifTema     = 'semua';
  var _aktifUlama    = 'semua'; // filter ulama aktif

  var TEMA_LIST = [
    { id: 'semua',   label: 'Semua',           icon: '📋' },
    { id: 'tauhid',  label: 'Tauhid & Aqidah', icon: '☀️' },
    { id: 'hati',    label: 'Hati & Jiwa',     icon: '🫀' },
    { id: 'ilmu',    label: 'Ilmu & Belajar',  icon: '📚' },
    { id: 'sunnah',  label: 'Sunnah & Bid\'ah',icon: '🔆' },
    { id: 'ibadah',  label: 'Ibadah',           icon: '🕌' },
    { id: 'akhlak',  label: 'Akhlak & Adab',   icon: '✨' },
    { id: 'ikhlas',  label: 'Ikhlas & Niat',   icon: '💎' },
    { id: 'taubat',  label: 'Taubat',           icon: '🌿' },
    { id: 'sabar',   label: 'Sabar',            icon: '⚓' },
    { id: 'zuhud',   label: 'Zuhud & Dunia',   icon: '🍃' },
    { id: 'nasihat', label: 'Nasihat',          icon: '🗒️' },
    { id: 'quran',   label: 'Al-Qur\'an',      icon: '📖' },
    { id: 'akhirat', label: 'Akhirat & Maut',  icon: '🌙' },
    { id: 'doa',     label: 'Doa & Dzikir',    icon: '🤲' },
    { id: 'syukur',  label: 'Syukur',           icon: '🌟' },
    { id: 'tawakal', label: 'Tawakkal',         icon: '🏹' },
  ];

  // Nama tema untuk label badge di entry
  var TEMA_LABEL_MAP = {};
  TEMA_LIST.forEach(function (t) { TEMA_LABEL_MAP[t.id] = t.label; });

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

  // ── HELPERS ─────────────────────────────────
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

    fetch('konten/kutipan.json')
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
    renderSidebar();
    renderTopbar();
    renderEntries(_aktifTema);
  }

  // ── SIDEBAR TEMA ─────────────────────────────
  function renderSidebar() {
    var sidebar = document.getElementById('kutipanSidebar');
    if (!sidebar || !_kutipanData) return;

    var html = '<div class="kutipan-sidebar-label">TEMA</div>';
    TEMA_LIST.forEach(function (t) {
      var count = t.id === 'semua'
        ? _kutipanData.kutipan.length
        : _kutipanData.kutipan.filter(function (k) { return k.tema === t.id; }).length;
      if (t.id !== 'semua' && count === 0) return; // sembunyikan tema kosong

      html += '<button class="kutipan-tema-btn' + (t.id === _aktifTema ? ' active' : '') + '" data-tema="' + t.id + '">' +
        '<span class="ktb-icon">' + t.icon + '</span>' +
        '<span class="ktb-text">' +
          '<span class="ktb-nama">' + esc(t.label) + '</span>' +
          '<span class="ktb-count">' + count + ' kutipan</span>' +
        '</span>' +
      '</button>';
    });

    sidebar.innerHTML = html;
    // Pasang guard agar sidebar tidak memicu swipe tab
    attachHScrollGuard(sidebar);

    sidebar.querySelectorAll('.kutipan-tema-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _aktifTema = btn.getAttribute('data-tema');
        _aktifUlama = 'semua'; // reset filter ulama saat tema berganti
        // Update active state
        sidebar.querySelectorAll('.kutipan-tema-btn').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-tema') === _aktifTema);
        });
        renderTopbar();
        renderEntries(_aktifTema);
        // Scroll main ke atas
        var main = document.querySelector('.kutipan-main');
        if (main) main.scrollTop = 0;
      });
    });
  }

  // ── TOPBAR (chips ulama + info) ──────────────
  function renderTopbar() {
    var infoBar = document.getElementById('kutipanInfoBar');
    var chipsEl = document.getElementById('kutipanChips');
    if (!infoBar || !chipsEl || !_kutipanData) return;

    var filtered = filterKutipan(_aktifTema, _aktifUlama);
    var temaLabel = _aktifTema === 'semua' ? 'Semua Tema' : (TEMA_LABEL_MAP[_aktifTema] || _aktifTema);
    infoBar.textContent = filtered.length + ' kutipan · ' + temaLabel;

    // Himpun ulama yang punya kutipan di tema ini (tanpa filter ulama agar semua chip tampil)
    var baseFiltered = filterKutipan(_aktifTema, 'semua');
    var ulamaIds = [];
    baseFiltered.forEach(function (k) {
      if (ulamaIds.indexOf(k.ulama) === -1) ulamaIds.push(k.ulama);
    });

    // Chip "Semua Ulama"
    var chipsHtml = '<button class="kutipan-chip' + (_aktifUlama === 'semua' ? ' active' : '') + '" data-ulama="semua">\u{1F465} Semua Ulama</button>';

    ulamaIds.forEach(function (uid) {
      var u = getUlama(uid);
      if (!u) return;
      var cnt = baseFiltered.filter(function (k) { return k.ulama === uid; }).length;
      var namaChip = u.nama.replace(/^(Syaikh|Imam|Syaikhul Islam)\s+/i, '');
      chipsHtml += '<button class="kutipan-chip' + (_aktifUlama === uid ? ' active' : '') + '" data-ulama="' + esc(uid) + '">\u{1F4DC} ' + esc(namaChip) + ' <span style="opacity:0.6">(' + cnt + ')</span></button>';
    });
    chipsEl.innerHTML = chipsHtml;

    chipsEl.querySelectorAll('.kutipan-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var uid = chip.getAttribute('data-ulama');
        if (_aktifUlama === uid) return;
        _aktifUlama = uid;
        chipsEl.querySelectorAll('.kutipan-chip').forEach(function (c) {
          c.classList.toggle('active', c.getAttribute('data-ulama') === _aktifUlama);
        });
        var newFiltered = filterKutipan(_aktifTema, _aktifUlama);
        infoBar.textContent = newFiltered.length + ' kutipan · ' + temaLabel;
        renderEntries(_aktifTema);
        var main = document.querySelector('.kutipan-main');
        if (main) main.scrollTop = 0;
      });
    });
    // Guard: geser chips tidak memicu swipe tab
    attachHScrollGuard(chipsEl);
  }

  // ── FILTER HELPER ────────────────────────────
  function filterKutipan(tema, ulama) {
    if (!_kutipanData) return [];
    var list = _kutipanData.kutipan;
    if (tema && tema !== 'semua') list = list.filter(function (k) { return k.tema === tema; });
    if (ulama && ulama !== 'semua') list = list.filter(function (k) { return k.ulama === ulama; });
    return list;
  }

  // ── RENDER ENTRIES ───────────────────────────
  function renderEntries(tema) {
    var container = document.getElementById('kutipanEntries');
    if (!container || !_kutipanData) return;

    var list = filterKutipan(tema, _aktifUlama);
    if (list.length === 0) {
      container.innerHTML = '<div class="kutipan-empty"><div class="kutipan-empty-icon">🔍</div><div class="kutipan-empty-title">Belum ada kutipan</div><div class="kutipan-empty-desc">Tema ini belum memiliki kutipan yang tersedia.</div></div>';
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

      html +=
        '<div class="kutipan-entry" id="kentry-' + esc(k.id) + '">' +
          '<div class="kutipan-tema-badge">' + esc(temaLabel) + '</div>' +

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
              '<div class="kutipan-source-row"><span class="kutipan-source-key">Bab/Pembahasan</span><span class="kutipan-source-val">' + esc(k.bab) + '</span></div>' +
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
          return '<button class="kup-quote-card" data-kutipan-id="' + esc(k.id) + '" data-tema="' + esc(k.tema) + '">' +
            '<span class="kutipan-tema-badge">' + esc(tl) + '</span>' +
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
        closeUlamaPanel();

        // Ganti tema jika perlu
        if (_aktifTema !== 'semua' && _aktifTema !== tema) {
          _aktifTema = tema;
          renderSidebar();
          renderTopbar();
          renderEntries(_aktifTema);
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

})();
