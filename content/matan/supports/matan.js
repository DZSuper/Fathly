/* ============================================
   MATAN.JS - FathlyWeb Tab Matan (REVISI)
   ES5, localStorage, data dummy
   ============================================ */

(function() {
    'use strict';

    // ===== DATA DUMMY =====
    var dataMatan = [
        { id: 1, nama: 'الأجرومية', namaLatin: 'Al-Ajurrumiyyah', penulis: 'ابن آجروم', kategori: 'nahwu', bab: 12, bait: 45, popularitas: 98 },
        { id: 2, nama: 'متن أبي شجاع', namaLatin: 'Matn Abi Syuja\'', penulis: 'أبو شجاع', kategori: 'fiqih', bab: 14, bait: 68, popularitas: 95 },
        { id: 3, nama: 'الورقات', namaLatin: 'Al-Waraqat', penulis: 'الجويني', kategori: 'ushul', bab: 8, bait: 32, popularitas: 88 },
        { id: 4, nama: 'العقيدة الطحاوية', namaLatin: 'Al-Aqidah At-Tahawiyyah', penulis: 'الطحاوي', kategori: 'tauhid', bab: 10, bait: 56, popularitas: 92 },
        { id: 5, nama: 'الأربعون النووية', namaLatin: 'Al-Arba\'in An-Nawawiyyah', penulis: 'النووي', kategori: 'hadits', bab: 42, bait: 42, popularitas: 96 },
        { id: 6, nama: 'قطر الندى', namaLatin: 'Qatr an-Nada', penulis: 'ابن هشام', kategori: 'nahwu', bab: 15, bait: 72, popularitas: 85 },
        { id: 7, nama: 'الحكم العطائية', namaLatin: 'Al-Hikam Al-‘Atha\'iyyah', penulis: 'ابن عطاء الله', kategori: 'tasawuf', bab: 7, bait: 264, popularitas: 90 },
        { id: 8, nama: 'عمدة الأحكام', namaLatin: 'Umdah al-Ahkam', penulis: 'ابن دقيق العيد', kategori: 'hadits', bab: 16, bait: 120, popularitas: 80 },
        { id: 9, nama: 'متن الغاية والتقريب', namaLatin: 'Matn Al-Ghayah wa At-Taqrib', penulis: 'أبو شجاع', kategori: 'fiqih', bab: 20, bait: 95, popularitas: 78 },
        { id: 10, nama: 'ألفية ابن مالك', namaLatin: 'Alfiyyah Ibn Malik', penulis: 'ابن مالك', kategori: 'nahwu', bab: 0, bait: 1002, popularitas: 93 },
        { id: 11, nama: 'نظم الجزرية', namaLatin: 'Nazm Al-Jazariyyah', penulis: 'ابن الجزري', kategori: 'tajwid', bab: 0, bait: 108, popularitas: 82 },
        { id: 12, nama: 'الآجرومية', namaLatin: 'Al-Ajurrumiyyah', penulis: 'ابن آجروم', kategori: 'nahwu', bab: 12, bait: 45, popularitas: 70 }
    ];

    var currentFilter = 'semua';
    var currentSort = 'populer';

    // ===== HELPERS =====
    function findMatan(id) {
        for (var i = 0; i < dataMatan.length; i++) {
            if (dataMatan[i].id === id) return dataMatan[i];
        }
        return null;
    }

    function getStorage(key, defaultValue) {
        try {
            var val = localStorage.getItem(key);
            if (val === null) return defaultValue;
            return JSON.parse(val);
        } catch (e) {
            return defaultValue;
        }
    }

    function setStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getBookmarks() {
        return getStorage('fw_matan_bookmarks', []);
    }

    function setBookmarks(bookmarks) {
        setStorage('fw_matan_bookmarks', bookmarks);
    }

    function getHafalan() {
        return getStorage('fw_matan_hafalan', {});
    }

    function setHafalan(hafalan) {
        setStorage('fw_matan_hafalan', hafalan);
    }

    function toggleBookmark(id) {
        var bookmarks = getBookmarks();
        var index = bookmarks.indexOf(id);
        if (index > -1) {
            bookmarks.splice(index, 1);
        } else {
            bookmarks.push(id);
        }
        setBookmarks(bookmarks);
        renderAll();
        return bookmarks;
    }

    function isBookmarked(id) {
        var bookmarks = getBookmarks();
        return bookmarks.indexOf(id) > -1;
    }

    function toggleHafalan(id) {
        var hafalan = getHafalan();
        if (hafalan[id] !== undefined) {
            // Jika sudah ada, hapus
            delete hafalan[id];
        } else {
            // Tambahkan dengan progress 0
            hafalan[id] = 0;
        }
        setHafalan(hafalan);
        renderAll();
        return hafalan;
    }

    function isInHafalan(id) {
        var hafalan = getHafalan();
        return hafalan[id] !== undefined;
    }

    function getProgress(id) {
        var hafalan = getHafalan();
        return hafalan[id] || 0;
    }

    function setProgress(id, value) {
        var hafalan = getHafalan();
        if (value < 0) value = 0;
        if (value > 100) value = 100;
        hafalan[id] = value;
        setHafalan(hafalan);
        renderAll();
    }

    function getKategoriLabel(kat) {
        var map = {
            'nahwu': 'Nahwu',
            'fiqih': 'Fiqih',
            'ushul': 'Ushul',
            'tauhid': 'Tauhid',
            'hadits': 'Hadits',
            'tasawuf': 'Tasawuf',
            'tajwid': 'Tajwid'
        };
        return map[kat] || kat;
    }

    // ===== FILTER & SORT =====
    function getFilteredData() {
        var result = [];
        for (var i = 0; i < dataMatan.length; i++) {
            result.push(dataMatan[i]);
        }

        // Filter
        if (currentFilter !== 'semua') {
            var filtered = [];
            for (var j = 0; j < result.length; j++) {
                if (result[j].kategori === currentFilter) {
                    filtered.push(result[j]);
                }
            }
            result = filtered;
        }

        // Sort
        if (currentSort === 'populer') {
            result.sort(function(a, b) { return b.popularitas - a.popularitas; });
        } else if (currentSort === 'az') {
            result.sort(function(a, b) { return a.namaLatin.localeCompare(b.namaLatin); });
        } else if (currentSort === 'progress') {
            result.sort(function(a, b) {
                return getProgress(b.id) - getProgress(a.id);
            });
        }

        return result;
    }

    function getKategoriCount() {
        var counts = { semua: dataMatan.length };
        for (var i = 0; i < dataMatan.length; i++) {
            var kat = dataMatan[i].kategori;
            if (!counts[kat]) counts[kat] = 0;
            counts[kat]++;
        }
        return counts;
    }

    // ===== UPDATE STATISTIK =====
    function updateStatistik() {
        var bookmarks = getBookmarks();
        var hafalan = getHafalan();
        
        var totalEl = document.getElementById('stat-total');
        var favoritEl = document.getElementById('stat-favorit');
        var hafalanEl = document.getElementById('stat-hafalan');
        var selesaiEl = document.getElementById('stat-selesai');
        
        // Total Matan
        if (totalEl) totalEl.textContent = dataMatan.length;
        
        // Favorit
        if (favoritEl) favoritEl.textContent = bookmarks.length;
        
        // Sedang Dihafal (progress < 100)
        var hafalanCount = 0;
        var selesaiCount = 0;
        var keys = Object.keys(hafalan);
        for (var i = 0; i < keys.length; i++) {
            var id = parseInt(keys[i], 10);
            var progress = hafalan[id];
            if (findMatan(id)) {
                if (progress >= 100) {
                    selesaiCount++;
                } else {
                    hafalanCount++;
                }
            }
        }
        
        if (hafalanEl) hafalanEl.textContent = hafalanCount;
        if (selesaiEl) selesaiEl.textContent = selesaiCount;
    }

    // ===== RENDER FUNCTIONS =====
    function renderFavorit() {
        var bookmarks = getBookmarks();
        var container = document.getElementById('favorit-scroll');
        var countEl = document.getElementById('favorit-count');
        var desktopCount = document.getElementById('desktop-favorit-count');
        var desktopList = document.getElementById('desktop-favorit-list');

        if (!container) return;

        var items = [];
        for (var i = 0; i < bookmarks.length; i++) {
            var matan = findMatan(bookmarks[i]);
            if (matan) items.push(matan);
        }

        var count = items.length;
        if (countEl) countEl.textContent = count;
        if (desktopCount) desktopCount.textContent = count;

        // Mobile
        if (items.length === 0) {
            container.innerHTML = '<div class="favorit-empty">Belum ada favorit</div>';
        } else {
            var html = '';
            for (var j = 0; j < items.length; j++) {
                var m = items[j];
                html += '<div class="favorit-item" data-id="' + m.id + '">';
                html += '<div class="nama-arab">' + m.nama + '</div>';
                html += '<div class="nama-penulis">' + m.penulis + '</div>';
                html += '<span class="badge-kat">' + getKategoriLabel(m.kategori) + '</span>';
                html += '</div>';
            }
            container.innerHTML = html;
        }

        // Desktop - tampilkan SEMUA item dengan scroll
        if (desktopList) {
            if (items.length === 0) {
                desktopList.innerHTML = '<div class="top-card-empty">Belum ada favorit</div>';
            } else {
                var html2 = '';
                for (var k = 0; k < items.length; k++) {
                    var m2 = items[k];
                    html2 += '<div class="top-card-item">';
                    html2 += '<span class="item-judul">' + m2.nama + '</span>';
                    html2 += '<span class="item-meta">' + m2.penulis + '</span>';
                    html2 += '</div>';
                }
                desktopList.innerHTML = html2;
            }
        }
    }

    function renderHafalan() {
        var hafalan = getHafalan();
        var container = document.getElementById('hafalan-list');
        var countEl = document.getElementById('hafalan-count');
        var desktopCount = document.getElementById('desktop-hafalan-count');
        var desktopList = document.getElementById('desktop-hafalan-list');

        if (!container) return;

        var items = [];
        var keys = Object.keys(hafalan);
        for (var i = 0; i < keys.length; i++) {
            var id = parseInt(keys[i], 10);
            var progress = hafalan[id];
            var matan = findMatan(id);
            if (matan) {
                items.push({ matan: matan, progress: progress });
            }
        }

        items.sort(function(a, b) {
            return b.progress - a.progress;
        });

        var count = items.length;
        if (countEl) countEl.textContent = count;
        if (desktopCount) desktopCount.textContent = count;

        // Mobile - dengan batasan scroll 4 item
        if (items.length === 0) {
            container.innerHTML = '<div class="favorit-empty">Belum ada progres hafalan</div>';
        } else {
            var html = '';
            for (var j = 0; j < items.length; j++) {
                var item = items[j];
                var m = item.matan;
                var prog = item.progress;
                html += '<div class="hafalan-item" data-id="' + m.id + '">';
                html += '<div class="hafalan-top">';
                html += '<span class="hafalan-judul">' + m.nama + '</span>';
                html += '<span class="hafalan-persen">' + prog + '%</span>';
                html += '</div>';
                html += '<div class="hafalan-bar"><div class="fill" style="width:' + prog + '%;"></div></div>';
                html += '<div class="hafalan-meta">';
                html += '<span>' + getKategoriLabel(m.kategori) + '</span>';
                html += '<span>' + m.penulis + '</span>';
                html += '<span>' + m.bab + ' bab</span>';
                html += '</div>';
                html += '</div>';
            }
            container.innerHTML = html;
        }

        // Desktop - tampilkan SEMUA item dengan scroll (6 item visible)
        if (desktopList) {
            if (items.length === 0) {
                desktopList.innerHTML = '<div class="top-card-empty">Belum ada progres hafalan</div>';
            } else {
                var html2 = '';
                for (var k = 0; k < items.length; k++) {
                    var item2 = items[k];
                    var m2 = item2.matan;
                    var prog2 = item2.progress;
                    html2 += '<div class="top-card-item">';
                    html2 += '<span class="item-judul">' + m2.nama + '</span>';
                    html2 += '<span class="item-progress">' + prog2 + '%</span>';
                    html2 += '</div>';
                }
                desktopList.innerHTML = html2;
            }
        }
    }

    function renderSemua() {
        var data = getFilteredData();
        var container = document.getElementById('semua-list');
        var countEl = document.getElementById('semua-count');
        var desktopContainer = document.getElementById('desktop-semua-list');
        var desktopCount = document.getElementById('desktop-semua-count');

        if (!container) return;

        var count = data.length;
        if (countEl) countEl.textContent = count;
        if (desktopCount) desktopCount.textContent = count;

        // Update filter counts
        var counts = getKategoriCount();
        for (var kat in counts) {
            var el = document.getElementById('filter-' + kat);
            if (el) el.textContent = counts[kat];
        }

        // Mobile
        if (data.length === 0) {
            container.innerHTML = '<div class="favorit-empty">Tidak ada matan</div>';
        } else {
            var html = '';
            for (var i = 0; i < data.length; i++) {
                var m = data[i];
                var isFav = isBookmarked(m.id);
                var isHaf = isInHafalan(m.id);
                html += '<div class="semua-item" data-id="' + m.id + '">';
                html += '<div class="semua-left">';
                html += '<div class="semua-judul">' + m.nama + '</div>';
                html += '<div class="semua-meta">';
                html += '<span class="badge-kat">' + getKategoriLabel(m.kategori) + '</span>';
                html += '<span>' + m.penulis + '</span>';
                html += '<span>' + m.bab + ' bab</span>';
                html += '<span>' + m.bait + ' bait</span>';
                html += '</div>';
                html += '</div>';
                html += '<div class="semua-actions">';
                html += '<button class="btn-action bookmark-btn ' + (isFav ? 'active-bookmark' : '') + '" data-id="' + m.id + '" data-action="bookmark">⭐</button>';
                html += '<button class="btn-action hafalan-btn ' + (isHaf ? 'active-hafalan' : '') + '" data-id="' + m.id + '" data-action="hafalan">📖</button>';
                html += '</div>';
                html += '</div>';
            }
            container.innerHTML = html;
        }

        // Desktop
        if (desktopContainer) {
            if (data.length === 0) {
                desktopContainer.innerHTML = '<div class="favorit-empty">Tidak ada matan</div>';
            } else {
                var html2 = '';
                for (var j = 0; j < data.length; j++) {
                    var m2 = data[j];
                    var isFav2 = isBookmarked(m2.id);
                    var isHaf2 = isInHafalan(m2.id);
                    html2 += '<div class="desktop-list-item" data-id="' + m2.id + '">';
                    html2 += '<div class="item-left">';
                    html2 += '<div class="item-judul">' + m2.nama + '</div>';
                    html2 += '<div class="item-penulis">' + m2.penulis + '</div>';
                    html2 += '</div>';
                    html2 += '<div class="item-right">';
                    html2 += '<span class="item-badge">' + getKategoriLabel(m2.kategori) + '</span>';
                    html2 += '<div class="item-stats">';
                    html2 += '<span>' + m2.bab + ' bab</span>';
                    html2 += '<span>' + m2.bait + ' bait</span>';
                    html2 += '</div>';
                    html2 += '</div>';
                    html2 += '<div class="item-actions">';
                    html2 += '<button class="btn-action bookmark-btn ' + (isFav2 ? 'active-bookmark' : '') + '" data-id="' + m2.id + '" data-action="bookmark">⭐</button>';
                    html2 += '<button class="btn-action hafalan-btn ' + (isHaf2 ? 'active-hafalan' : '') + '" data-id="' + m2.id + '" data-action="hafalan">📖</button>';
                    html2 += '</div>';
                    html2 += '</div>';
                }
                desktopContainer.innerHTML = html2;
            }
        }

        // Bind event listeners untuk tombol aksi
        bindActionButtons();
        
        // Update statistik
        updateStatistik();
    }

    function renderAll() {
        renderFavorit();
        renderHafalan();
        renderSemua();
    }

    // ===== BIND ACTION BUTTONS =====
    function bindActionButtons() {
        // Bookmark buttons
        var bookmarkBtns = document.querySelectorAll('.bookmark-btn');
        for (var i = 0; i < bookmarkBtns.length; i++) {
            (function(btn) {
                btn.removeEventListener('click', handleBookmarkClick);
                btn.addEventListener('click', handleBookmarkClick);
            })(bookmarkBtns[i]);
        }

        // Hafalan buttons
        var hafalanBtns = document.querySelectorAll('.hafalan-btn');
        for (var j = 0; j < hafalanBtns.length; j++) {
            (function(btn) {
                btn.removeEventListener('click', handleHafalanClick);
                btn.addEventListener('click', handleHafalanClick);
            })(hafalanBtns[j]);
        }
    }

    function handleBookmarkClick(e) {
        e.stopPropagation();
        var btn = e.currentTarget;
        var id = parseInt(btn.getAttribute('data-id'), 10);
        toggleBookmark(id);
    }

    function handleHafalanClick(e) {
        e.stopPropagation();
        var btn = e.currentTarget;
        var id = parseInt(btn.getAttribute('data-id'), 10);
        toggleHafalan(id);
    }

    // ===== FAVORIT SCROLL TOUCH HANDLER =====
    function setupFavoritScroll() {
        var container = document.getElementById('favorit-scroll');
        if (!container) return;

        // Prevent touch events from propagating to parent (tab swipe)
        container.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });

        container.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        }, { passive: true });
    }

    // ===== EVENT BINDING =====
    function bindEvents() {
        // Filter items (desktop)
        var filterItems = document.querySelectorAll('.filter-item[data-filter]');
        for (var i = 0; i < filterItems.length; i++) {
            (function(el) {
                el.addEventListener('click', function(e) {
                    var filter = el.getAttribute('data-filter');
                    // Update active
                    var siblings = el.parentNode.querySelectorAll('.filter-item');
                    for (var s = 0; s < siblings.length; s++) {
                        siblings[s].classList.remove('aktif');
                    }
                    el.classList.add('aktif');
                    currentFilter = filter;
                    renderAll();
                });
            })(filterItems[i]);
        }

        // Sort items (desktop)
        var sortItems = document.querySelectorAll('.filter-item[data-sort]');
        for (var j = 0; j < sortItems.length; j++) {
            (function(el) {
                el.addEventListener('click', function(e) {
                    var sort = el.getAttribute('data-sort');
                    var siblings = el.parentNode.querySelectorAll('.filter-item');
                    for (var s = 0; s < siblings.length; s++) {
                        siblings[s].classList.remove('aktif');
                    }
                    el.classList.add('aktif');
                    currentSort = sort;
                    renderAll();
                });
            })(sortItems[j]);
        }
    }

    // ===== INIT =====
    function initMatan() {
        renderAll();
        bindEvents();
        setupFavoritScroll();
    }

    // Tunggu DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMatan);
    } else {
        initMatan();
    }

})();