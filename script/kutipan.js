// =============================================
// KUTIPAN TAB — LOGIKA UTAMA
// Dijalankan setelah main.js
// =============================================

(function () {

  var _kutipanData   = null;   // { ulama:[], kutipan:[] }
  var _kutipanLoaded = false;
  var _aktifTema     = 'semua';
  var _aktifUlama    = 'semua'; // filter ulama aktif
  var _querySearch   = '';      // kata kunci pencarian

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
    initSearch();
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
    var infoText = filtered.length + ' kutipan · ' + temaLabel;
    if (_querySearch) infoText += ' · "' + _querySearch + '"';
    infoBar.textContent = infoText;

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

    // Guard: geser chips tidak memicu swipe tab
    attachHScrollGuard(chipsEl);

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
  }

  // ── FILTER HELPER ────────────────────────────
  function filterKutipan(tema, ulama) {
    if (!_kutipanData) return [];
    var list = _kutipanData.kutipan;
    if (tema && tema !== 'semua') list = list.filter(function (k) { return k.tema === tema; });
    if (ulama && ulama !== 'semua') list = list.filter(function (k) { return k.ulama === ulama; });
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
  function renderEntries(tema) {
    var container = document.getElementById('kutipanEntries');
    if (!container || !_kutipanData) return;

    var list = filterKutipan(tema, _aktifUlama);
    if (list.length === 0) {
      if (_querySearch) {
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

      html +=
        '<div class="kutipan-entry" id="kentry-' + esc(k.id) + '" data-tema="' + esc(k.tema) + '">' +
          '<div class="kutipan-tema-badge" data-tema="' + esc(k.tema) + '">' + esc(temaLabel) + '</div>' +

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
    quran:   { accent: '#eab308', bg1: '#120e02', bg2: '#1e1604', text: '#fef9c3' },
  };

  var TEMA_LABEL_LOCAL = {
    tauhid:'Tauhid & Aqidah', hati:'Hati & Jiwa', ilmu:'Ilmu & Belajar',
    sunnah:'Sunnah & Bid\'ah', zuhud:'Zuhud & Dunia', akhlak:'Akhlak & Adab',
    ikhlas:'Ikhlas & Niat', taubat:'Taubat', ibadah:'Ibadah',
    nasihat:'Nasihat', sabar:'Sabar', tawakal:'Tawakkal',
    syukur:'Syukur', akhirat:'Akhirat & Maut', doa:'Doa & Dzikir', quran:'Al-Qur\'an'
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
        // Tampilkan/sembunyikan tombol clear
        clearBtn.classList.toggle('visible', _querySearch.length > 0);
        // Reset scroll
        var main = document.querySelector('.kutipan-main');
        if (main) main.scrollTop = 0;
        renderTopbar();
        renderEntries(_aktifTema);
      }, 250);
    });

    clearBtn.addEventListener('click', function () {
      input.value = '';
      _querySearch = '';
      clearBtn.classList.remove('visible');
      input.focus();
      renderTopbar();
      renderEntries(_aktifTema);
    });

    // Saat tema/ulama berganti, clear search jika ingin fresh — tidak wajib, tapi UX lebih bersih
    // Kita biarkan search tetap aktif agar bisa kombinasi filter + search
  }

})();