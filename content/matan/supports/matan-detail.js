(function() {
    'use strict';

    // =============================================
    // 0. GENERATOR DOM DARI content.json
    //    (bait, tafsir/keterangan, dan sidebar daftar bab
    //    dirender dinamis di sini SEBELUM initApp() dipanggil,
    //    supaya struktur DOM yang dihasilkan identik dengan
    //    markup statis lama — seluruh logic initApp() di bawah
    //    tidak perlu tahu bahwa datanya berasal dari JSON.)
    // =============================================

    // URL data bait diambil dari atribut data-content pada <body>, supaya satu
    // file JS ini bisa dipakai ulang untuk matan lain (mis. data-content="../data/abu-syuja.json").
    // Fallback ke Al-Jurumiyyah jika atribut tidak diset.
    var CONTENT_URL = (document.body && document.body.getAttribute('data-content')) || '../data/jurumiyah.json';
    var BAITS_PER_PAGE = 10;

    // ID matan ini, HARUS sama dengan id-nya di dataMatan (content/matan/supports/matan.js),
    // supaya progres hafalan yang ditandai di halaman detail ini bisa sinkron real-time
    // dengan statistik & badge progres di halaman daftar Matan.
    var MATAN_ID = (document.body && document.body.getAttribute('data-matan-id')) || null;
    // Key localStorage ini SENGAJA sama persis dengan yang dipakai matan.js (daftar Matan),
    // supaya keduanya baca/tulis ke sumber data yang sama — bukan dua sistem yang terpisah.
    var HAFALAN_SHARED_KEY = 'fw_matan_hafalan';

    function getSharedStorage(key, defaultValue) {
        try {
            var val = localStorage.getItem(key);
            if (val === null) return defaultValue;
            return JSON.parse(val);
        } catch (e) {
            return defaultValue;
        }
    }

    function setSharedStorage(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderBaitsAndTafsir(contentData) {
        var teksBaitEl = document.getElementById('teksBait');
        var tabKeteranganEl = document.getElementById('tabKeterangan');
        if (!teksBaitEl || !tabKeteranganEl) return;

        var baitsData = contentData.baits;
        var fragBait = document.createDocumentFragment();
        var fragTafsir = document.createDocumentFragment();

        for (var i = 0; i < baitsData.length; i++) {
            var b = baitsData[i];

            var baitEl = document.createElement('div');
            baitEl.className = 'bait';
            baitEl.setAttribute('data-bait', String(i));
            baitEl.innerHTML =
                '<span class="no">' + (i + 1) + '</span>' +
                '<span class="arab">' + escapeHtml(b.arab) + '</span>';
            fragBait.appendChild(baitEl);

            if (b.keterangan) {
                var tafsirEl = document.createElement('div');
                tafsirEl.className = 'tafsir-item';
                tafsirEl.setAttribute('data-target', String(i));
                var baitRefEl = document.createElement('div');
                baitRefEl.className = 'bait-ref';
                baitRefEl.textContent = b.arab;
                var ketEl = document.createElement('div');
                ketEl.className = 'keterangan';
                // keterangan lama mengandung tag inline (strong/span/em) yang sudah
                // diverifikasi aman berasal dari data internal, bukan input pengguna
                ketEl.innerHTML = b.keterangan;
                tafsirEl.appendChild(baitRefEl);
                tafsirEl.appendChild(ketEl);
                fragTafsir.appendChild(tafsirEl);
            }
        }

        teksBaitEl.appendChild(fragBait);
        tabKeteranganEl.appendChild(fragTafsir);
    }

    // Hitung daftar index bait yang menjadi AWAL setiap halaman.
    // Aturan: maksimal BAITS_PER_PAGE bait per halaman, DAN halaman baru
    // wajib dimulai setiap kali bab ATAU sub-bab berganti — jadi satu
    // halaman tidak pernah mencampur dua bab/sub-bab yang berbeda,
    // meskipun jumlah baitnya jadi kurang dari 10.
    function computePageStarts(contentData) {
        var baitsData = contentData.baits;
        var starts = [];
        var countOnPage = 0;

        for (var i = 0; i < baitsData.length; i++) {
            var isNewPage = false;

            if (i === 0) {
                isNewPage = true;
            } else {
                var prev = baitsData[i - 1];
                var cur = baitsData[i];
                var babChanged = prev.babId !== cur.babId;
                var subChanged = prev.subBabId !== cur.subBabId;
                if (babChanged || subChanged || countOnPage >= BAITS_PER_PAGE) {
                    isNewPage = true;
                }
            }

            if (isNewPage) {
                starts.push(i);
                countOnPage = 1;
            } else {
                countOnPage++;
            }
        }

        if (starts.length === 0) starts.push(0);
        return starts;
    }

    // Cari index halaman (0-based) yang memuat bait ke-`baitIndex`,
    // berdasarkan array pageStarts hasil computePageStarts().
    function findPageForBait(pageStarts, baitIndex) {
        var page = 0;
        for (var p = 0; p < pageStarts.length; p++) {
            if (pageStarts[p] <= baitIndex) page = p;
            else break;
        }
        return page;
    }

    // Hitung, untuk tiap bab, halaman pertama & terakhir yang ia tempati
    // (berdasarkan urutan bait GLOBAL, bukan per-bab), sesuai kaidah:
    // satu halaman bisa berisi ekor satu sub-bab + awal sub-bab berikutnya.
    function computeBabPageRanges(contentData, pageStarts) {
        var ranges = {}; // babId -> {first, last}
        var baitsData = contentData.baits;
        for (var i = 0; i < baitsData.length; i++) {
            var page = findPageForBait(pageStarts, i);
            var babId = baitsData[i].babId;
            if (!ranges[babId]) ranges[babId] = { first: page, last: page };
            else ranges[babId].last = page;
        }
        return ranges;
    }

    // Hitung halaman pertama untuk setiap sub-bab (key: babId + '|' + subBabId),
    // berdasarkan bait pertama yang memiliki kombinasi babId/subBabId tersebut.
    // Ini valid karena computePageStarts() menjamin pergantian sub-bab selalu
    // memulai halaman baru.
    function computeSubBabPageStarts(contentData, pageStarts) {
        var starts = {};
        var baitsData = contentData.baits;
        for (var i = 0; i < baitsData.length; i++) {
            var b = baitsData[i];
            if (!b.subBabId) continue;
            var key = b.babId + '|' + b.subBabId;
            if (!(key in starts)) {
                starts[key] = findPageForBait(pageStarts, i);
            }
        }
        return starts;
    }

    function renderSidebarBab(contentData, pageStarts) {
        var container = document.getElementById('babListContainer');
        if (!container) return;

        var pageRanges = computeBabPageRanges(contentData, pageStarts);
        var subBabPageStarts = computeSubBabPageStarts(contentData, pageStarts);
        var frag = document.createDocumentFragment();

        for (var i = 0; i < contentData.babList.length; i++) {
            var bab = contentData.babList[i];
            var range = pageRanges[bab.babId] || { first: 0, last: 0 };
            var hasSub = bab.subBab && bab.subBab.length > 0;

            var group = document.createElement('div');
            group.className = 'bab-group';

            var item = document.createElement('div');
            item.className = 'item' + (i === 0 ? ' aktif' : '') + (hasSub ? ' has-sub' : '');
            item.setAttribute('data-bab-id', bab.babId);
            item.setAttribute('data-first-page', String(range.first));

            var titleSpan = document.createElement('span');
            titleSpan.className = 'item-title';
            titleSpan.textContent = bab.title;
            item.appendChild(titleSpan);

            if (hasSub) {
                var arrowSpan = document.createElement('span');
                arrowSpan.className = 'dropdown-arrow';
                arrowSpan.textContent = '›';
                item.appendChild(arrowSpan);
            } else {
                var markerSpan = document.createElement('span');
                markerSpan.className = 'marker';
                markerSpan.textContent = '●';
                item.appendChild(markerSpan);
            }

            group.appendChild(item);

            if (hasSub) {
                var subList = document.createElement('div');
                subList.className = 'sub-bab-list';
                for (var s = 0; s < bab.subBab.length; s++) {
                    var sub = bab.subBab[s];
                    var subKey = bab.babId + '|' + sub.subBabId;
                    var subFirstPage = (subKey in subBabPageStarts) ? subBabPageStarts[subKey] : range.first;
                    var subEl = document.createElement('div');
                    subEl.className = 'sub-item';
                    subEl.setAttribute('data-bab-id', bab.babId);
                    subEl.setAttribute('data-sub-bab-id', sub.subBabId);
                    subEl.setAttribute('data-first-page', String(subFirstPage));
                    subEl.textContent = sub.title;
                    subList.appendChild(subEl);
                }
                group.appendChild(subList);
            }

            frag.appendChild(group);
        }

        container.appendChild(frag);
    }

    // Bootstrap: ambil content.json, generate DOM, baru jalankan seluruh aplikasi
    fetch(CONTENT_URL)
        .then(function(res) {
            if (!res.ok) throw new Error('Gagal memuat content.json: ' + res.status);
            return res.json();
        })
        .then(function(contentData) {
            var pageStarts = computePageStarts(contentData);
            renderBaitsAndTafsir(contentData);
            renderSidebarBab(contentData, pageStarts);
            initApp(contentData, pageStarts);
        })
        .catch(function(err) {
            console.error('❌ FathlyWeb: gagal memuat konten:', err);
            var teksBaitEl = document.getElementById('teksBait');
            if (teksBaitEl) {
                teksBaitEl.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">Gagal memuat konten. Periksa apakah file content.json tersedia di direktori yang sama.</div>';
            }
        });

    function initApp(contentData, pageStarts) {
            // =============================================
            // 1. SETUP & PAGINATION
            // =============================================
            var baits = document.querySelectorAll('.teks-bait .bait');
            var keteranganItems = document.querySelectorAll('.tafsir-item');
            var halamanNavEl = document.getElementById('halamanNav');

            // =============================================
            // SINKRONISASI PROGRES HAFALAN — REAL-TIME
            // Bait yang ditandai "hafalan" (posisi terakhir dihafal) dipakai untuk
            // menghitung persentase progres, lalu ditulis ke localStorage yang SAMA
            // dipakai halaman daftar Matan — sehingga statistik "Sedang Dihafal" /
            // "Selesai" dan badge progres di sana otomatis sinkron tanpa refresh manual.
            // =============================================
            function syncHafalanProgress() {
                if (!MATAN_ID) return;
                var hafalanData = getSharedStorage(HAFALAN_SHARED_KEY, {});
                var markedIdx = -1;
                for (var i = 0; i < baits.length; i++) {
                    if (baits[i].classList.contains('has-hafalan')) { markedIdx = i; break; }
                }
                if (markedIdx === -1) {
                    // Tidak ada bait yang ditandai lagi → keluarkan matan ini dari daftar hafalan
                    delete hafalanData[MATAN_ID];
                } else {
                    var percent = Math.round(((markedIdx + 1) / baits.length) * 100);
                    hafalanData[MATAN_ID] = percent;
                }
                setSharedStorage(HAFALAN_SHARED_KEY, hafalanData);
            }

            // Pulihkan posisi hafalan terakhir (jika sebelumnya sudah pernah ditandai),
            // supaya saat halaman ini dibuka ulang tampilannya tetap konsisten dengan
            // angka progres yang sudah tersimpan di daftar Matan.
            function restoreHafalanProgress() {
                if (!MATAN_ID || baits.length === 0) return;
                var hafalanData = getSharedStorage(HAFALAN_SHARED_KEY, {});
                var percent = hafalanData[MATAN_ID];
                if (percent === undefined) return;
                var idx = Math.round((percent / 100) * baits.length) - 1;
                if (idx < 0) idx = 0;
                if (idx >= baits.length) idx = baits.length - 1;
                baits[idx].classList.add('has-hafalan');
            }
            restoreHafalanProgress();
            var currentPage = 0;
            var totalPages = pageStarts.length;
            var activeBaitIndex = 0;

            function showPage(page) {
                currentPage = Math.max(0, Math.min(page, totalPages - 1));
                var start = pageStarts[currentPage];
                var end = (currentPage + 1 < pageStarts.length) ? pageStarts[currentPage + 1] : baits.length;

                for (var b = 0; b < baits.length; b++) {
                    baits[b].style.display = (b >= start && b < end) ? '' : 'none';
                }

                // Aktifkan bait pertama di halaman jika bait aktif tidak ada di halaman ini
                if (activeBaitIndex < start || activeBaitIndex >= end) {
                    setActiveBait(start);
                }

                updateBabHeader(start, end);
                updateSidebarActiveState(start);
                updatePosisi();
            }

            // Perbarui judul bab & info statistik di atas daftar bait, berdasarkan
            // bab dari BAIT PERTAMA yang tampil di halaman ini (karena satu halaman
            // bisa berisi campuran ekor sub-bab lama + awal sub-bab baru, judul yang
            // ditampilkan adalah milik bait teratas yang terlihat).
            function updateBabHeader(start, end) {
                var judulEl = document.getElementById('babJudul');
                var infoStatEl = document.getElementById('babInfoStat');
                var baitStatEl = document.getElementById('babBaitStat');
                if (!judulEl) return;

                var firstBait = contentData.baits[start];
                if (!firstBait) return;

                var bab = null;
                var babIndex = -1;
                for (var i = 0; i < contentData.babList.length; i++) {
                    if (contentData.babList[i].babId === firstBait.babId) {
                        bab = contentData.babList[i];
                        babIndex = i;
                        break;
                    }
                }
                if (!bab) return;

                var title = bab.title;
                if (firstBait.subBabId) {
                    var sub = bab.subBab.filter(function(s) { return s.subBabId === firstBait.subBabId; })[0];
                    if (sub) title += ' — ' + sub.title;
                }
                judulEl.textContent = title;

                if (infoStatEl) infoStatEl.textContent = 'Bab ' + (babIndex + 1) + ' dari ' + contentData.babList.length;

                // Hitung total bait milik bab ini (seluruh sub-bab), bukan hanya halaman ini
                var totalBaitBab = 0;
                for (var k = 0; k < contentData.baits.length; k++) {
                    if (contentData.baits[k].babId === firstBait.babId) totalBaitBab++;
                }
                if (baitStatEl) baitStatEl.textContent = totalBaitBab + ' Bait';
            }

            // Tandai .aktif pada item sidebar bab (dan buka sub-bab-nya jika ada)
            // sesuai bab dari bait pertama yang sedang tampil.
            function updateSidebarActiveState(start) {
                var firstBait = contentData.baits[start];
                if (!firstBait) return;

                var babItems = document.querySelectorAll('.sidebar-bab .item');
                for (var i = 0; i < babItems.length; i++) {
                    var isActive = babItems[i].getAttribute('data-bab-id') === firstBait.babId;
                    babItems[i].classList.toggle('aktif', isActive);

                    if (isActive && babItems[i].classList.contains('has-sub')) {
                        var group = babItems[i].closest('.bab-group');
                        if (group) {
                            var allGroups = document.querySelectorAll('.sidebar-bab .bab-group.expanded');
                            for (var g = 0; g < allGroups.length; g++) {
                                if (allGroups[g] !== group) allGroups[g].classList.remove('expanded');
                            }
                            group.classList.add('expanded');
                        }
                    }
                }

                var subItems = document.querySelectorAll('.sidebar-bab .sub-item');
                for (var s = 0; s < subItems.length; s++) {
                    var subMatch = subItems[s].getAttribute('data-bab-id') === firstBait.babId &&
                        subItems[s].getAttribute('data-sub-bab-id') === firstBait.subBabId;
                    subItems[s].classList.toggle('aktif', subMatch);
                }
            }

            function updatePosisi() {
                renderHalamanNav();
            }

            // Bangun tombol nomor halaman bulat dengan elipsis untuk lompat jauh
            function renderHalamanNav() {
                if (!halamanNavEl) return;
                halamanNavEl.innerHTML = '';

                if (totalPages <= 1) return;

                var current = currentPage + 1; // 1-indexed untuk tampilan
                var pages = [];
                var delta = 1; // jumlah tetangga kiri/kanan current yang selalu tampil

                pages.push(1);
                for (var p = current - delta; p <= current + delta; p++) {
                    if (p > 1 && p < totalPages) pages.push(p);
                }
                if (totalPages > 1) pages.push(totalPages);

                // Urutkan & hapus duplikat
                pages = pages.filter(function(v, i, arr) { return arr.indexOf(v) === i; }).sort(function(a, b) { return a - b; });

                var prev = null;
                for (var k = 0; k < pages.length; k++) {
                    var pg = pages[k];
                    if (prev !== null && pg - prev > 1) {
                        var ell = document.createElement('span');
                        ell.className = 'hal-ellipsis';
                        ell.textContent = '···';
                        halamanNavEl.appendChild(ell);
                    }
                    (function(pageNum) {
                        var btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'hal-btn' + (pageNum === current ? ' aktif' : '');
                        btn.textContent = String(pageNum);
                        btn.setAttribute('aria-label', 'Ke halaman ' + pageNum);
                        btn.addEventListener('click', function() {
                            showPage(pageNum - 1);
                        });
                        halamanNavEl.appendChild(btn);
                    })(pg);
                    prev = pg;
                }
            }

            var pressHighlightTimers = {};
            var currentlyHighlightedIndex = null;

            function clearPressHighlight(index) {
                var el = baits[index];
                if (!el) return;
                if (pressHighlightTimers[index]) {
                    clearTimeout(pressHighlightTimers[index].cleanupTimer);
                    delete pressHighlightTimers[index];
                }
                el.classList.remove('just-pressed', 'fading-out');
            }

            function flashPressHighlight(index) {
                var el = baits[index];
                if (!el) return;

                // Hanya satu bait yang boleh memiliki animasi aktif — matikan langsung bait sebelumnya
                if (currentlyHighlightedIndex !== null && currentlyHighlightedIndex !== index) {
                    clearPressHighlight(currentlyHighlightedIndex);
                }
                currentlyHighlightedIndex = index;

                // Batalkan timer sebelumnya jika bait ini sedang dalam proses memudar
                if (pressHighlightTimers[index]) {
                    clearTimeout(pressHighlightTimers[index].cleanupTimer);
                    delete pressHighlightTimers[index];
                }

                // Lepas kedua class dulu supaya browser benar-benar mereset state sebelumnya
                el.classList.remove('just-pressed', 'fading-out');

                // Paksa reflow agar penghapusan class di atas benar-benar diproses browser
                void el.offsetWidth;

                // Nyalakan highlight instan (transition: none pada .just-pressed)
                el.classList.add('just-pressed');

                // Tunggu 2 frame agar browser benar-benar merender background solid
                // sebelum transisi memudar dimulai, baru kemudian tambahkan .fading-out
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        el.classList.add('fading-out');
                    });
                });

                var cleanupTimer = setTimeout(function() {
                    el.classList.remove('just-pressed', 'fading-out');
                    delete pressHighlightTimers[index];
                    if (currentlyHighlightedIndex === index) currentlyHighlightedIndex = null;
                }, 2700);

                pressHighlightTimers[index] = { cleanupTimer: cleanupTimer };
            }

            function setActiveBait(index) {
                activeBaitIndex = index;

                for (var b = 0; b < baits.length; b++) {
                    baits[b].classList.remove('aktif');
                }
                if (baits[index]) baits[index].classList.add('aktif');

                flashPressHighlight(index);

                // Sync keterangan — CSS handle show/hide via .aktif class
                for (var t = 0; t < keteranganItems.length; t++) {
                    keteranganItems[t].classList.remove('aktif');
                }
                for (var t2 = 0; t2 < keteranganItems.length; t2++) {
                    if (parseInt(keteranganItems[t2].getAttribute('data-target'), 10) === index) {
                        keteranganItems[t2].classList.add('aktif');
                        break;
                    }
                }

                updateSidebarBab(index);
                updatePosisi();
            }

            // Sembunyikan semua keterangan awalnya via JS (CSS sudah default none)
            // tidak perlu loop — CSS sudah menangani

            function refreshKeteranganTab() {
                for (var t = 0; t < keteranganItems.length; t++) {
                    keteranganItems[t].classList.remove('aktif');
                }
                for (var t2 = 0; t2 < keteranganItems.length; t2++) {
                    if (parseInt(keteranganItems[t2].getAttribute('data-target'), 10) === activeBaitIndex) {
                        keteranganItems[t2].classList.add('aktif');
                        break;
                    }
                }
            }

            // Klik singkat → aktifkan bait. Tekan-lama (khusus sentuhan) / klik kanan (mouse) → buka popup aksi
            var HOLD_DURATION = 450; // ms
            var HOLD_MOVE_TOLERANCE = 10; // px

            for (var i = 0; i < baits.length; i++) {
                (function(idx) {
                    var holdTimer = null;
                    var holdTriggered = false;
                    var startX = 0, startY = 0;

                    function clearHold() {
                        if (holdTimer) {
                            clearTimeout(holdTimer);
                            holdTimer = null;
                        }
                        baits[idx].classList.remove('pressing');
                    }

                    function playClickFlash() {
                        baits[idx].classList.remove('click-flash');
                        // Force reflow supaya animasi bisa diulang jika diklik cepat berturut-turut
                        void baits[idx].offsetWidth;
                        baits[idx].classList.add('click-flash');
                    }

                    var lastTouchTime = 0;

                    // ---- Mouse: klik kiri langsung aktifkan + animasi, tidak ada tekan-lama sama sekali ----
                    baits[idx].addEventListener('click', function(e) {
                        // Abaikan synthetic click yang ditembak browser setelah event touch
                        if (Date.now() - lastTouchTime < 700) return;
                        if (e.target.closest('.bait-action-popup') || e.target.closest('.highlight-popup')) return;
                        setActiveBait(idx);
                        playClickFlash();
                    });

                    // Klik kanan mouse → langsung buka popup aksi, seperti tekan-lama di layar sentuh
                    baits[idx].addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        if (e.target.closest('.bait-action-popup') || e.target.closest('.highlight-popup')) return;
                        setActiveBait(idx);
                        openBaitActionPopup(baits[idx]);
                    });

                    // ---- Sentuhan: tekan-lama membuka popup aksi, tap singkat aktifkan bait ----
                    function onTouchStart(e) {
                        if (e.target.closest('.bait-action-popup') || e.target.closest('.highlight-popup')) return;
                        lastTouchTime = Date.now();
                        holdTriggered = false;
                        var point = e.touches[0];
                        startX = point.clientX;
                        startY = point.clientY;
                        baits[idx].classList.add('pressing');
                        holdTimer = setTimeout(function() {
                            holdTriggered = true;
                            baits[idx].classList.remove('pressing');
                            setActiveBait(idx);
                            openBaitActionPopup(baits[idx]);
                        }, HOLD_DURATION);
                    }

                    function onTouchMove(e) {
                        if (!holdTimer) return;
                        var point = e.touches[0];
                        var dx = Math.abs(point.clientX - startX);
                        var dy = Math.abs(point.clientY - startY);
                        if (dx > HOLD_MOVE_TOLERANCE || dy > HOLD_MOVE_TOLERANCE) {
                            clearHold();
                        }
                    }

                    function onTouchEnd(e) {
                        lastTouchTime = Date.now();
                        clearHold();
                        if (!holdTriggered) {
                            setActiveBait(idx);
                            playClickFlash();
                        }
                    }

                    baits[idx].addEventListener('touchstart', onTouchStart, { passive: true });
                    baits[idx].addEventListener('touchmove', onTouchMove, { passive: true });
                    baits[idx].addEventListener('touchend', onTouchEnd);
                    baits[idx].addEventListener('touchcancel', clearHold);
                })(i);
            }

            // Init halaman pertama
            showPage(0);

            // =============================================
            // 2. UPDATE SIDEBAR BAB
            // =============================================
            function updateSidebarBab(baitIndex) {
                // Gunakan babId/subBabId asli dari data (bukan asumsi rata N bait/bab)
                updateSidebarActiveState(baitIndex);
            }

            // =============================================
            // 3. NAVIGASI HALAMAN (SEBELUMNYA / SELANJUTNYA)
            // =============================================
            var btnPrev = document.getElementById('btnPrev');
            var btnNext = document.getElementById('btnNext');

            if (btnPrev) {
                btnPrev.addEventListener('click', function() {
                    if (currentPage > 0) showPage(currentPage - 1);
                });
            }
            if (btnNext) {
                btnNext.addEventListener('click', function() {
                    if (currentPage < totalPages - 1) showPage(currentPage + 1);
                });
            }

            // =============================================
            // 4. KLIK SIDEBAR BAB → PINDAH KE HALAMAN AWAL BAB/SUB-BAB TERKAIT
            //    - Klik bab tanpa sub-bab: langsung pindah ke halaman awal bab.
            //    - Klik bab yang punya sub-bab: toggle buka/tutup dropdown saja
            //      (tidak ikut pindah halaman), dan menekan ulang bab yang
            //      dropdown-nya sedang terbuka akan menutupnya kembali.
            //    - Klik sub-bab: pindah tepat ke halaman awal sub-bab itu
            //      sendiri (bukan halaman awal bab induknya).
            // =============================================
            var babItems = document.querySelectorAll('.sidebar-bab .item');
            for (var j = 0; j < babItems.length; j++) {
                (function(itemEl) {
                    itemEl.addEventListener('click', function() {
                        var group = itemEl.closest('.bab-group');
                        var hasSub = itemEl.classList.contains('has-sub');

                        if (hasSub && group) {
                            var willExpand = !group.classList.contains('expanded');
                            // Tutup grup lain yang sedang terbuka (hanya satu dropdown terbuka pada satu waktu)
                            var allGroups = document.querySelectorAll('.sidebar-bab .bab-group.expanded');
                            for (var g = 0; g < allGroups.length; g++) {
                                allGroups[g].classList.remove('expanded');
                            }
                            if (willExpand) {
                                group.classList.add('expanded');
                            }
                            // Bab dengan sub-bab: klik hanya mengatur expand/collapse,
                            // tidak berpindah halaman.
                            return;
                        }

                        var firstPage = parseInt(itemEl.getAttribute('data-first-page'), 10);
                        if (!isNaN(firstPage)) showPage(firstPage);
                    });
                })(babItems[j]);
            }

            // Klik sub-bab → pindah ke halaman awal sub-bab itu sendiri
            var subBabItems = document.querySelectorAll('.sidebar-bab .sub-item');
            for (var s = 0; s < subBabItems.length; s++) {
                (function(subEl) {
                    subEl.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var firstPage = parseInt(subEl.getAttribute('data-first-page'), 10);
                        if (!isNaN(firstPage)) showPage(firstPage);
                    });
                })(subBabItems[s]);
            }

            // =============================================
            // 5. TOMBOL AKSI BAIT (CATATAN, HIGHLIGHT, HAFALAN)
            // =============================================
            var selectedColor = '#ffd54f';

            // Filter warna (sidebar tab Highlight) — klik warna untuk menyaring
            // daftar highlight di bawahnya; klik lagi warna yang sama untuk menampilkan semua.
            var activeHighlightFilter = null;
            var colorOpts = document.querySelectorAll('#colorFilterArea .color-opt');

            function applyHighlightFilter() {
                var items = document.querySelectorAll('#highlightList .note-item');
                var visibleCount = 0;
                for (var n = 0; n < items.length; n++) {
                    var itemColor = (items[n].getAttribute('data-color') || '').toLowerCase();
                    var match = !activeHighlightFilter || itemColor === activeHighlightFilter.toLowerCase();
                    items[n].style.display = match ? '' : 'none';
                    if (match) visibleCount++;
                }
                var highlightEmpty = document.getElementById('highlightEmpty');
                if (highlightEmpty) {
                    if (items.length > 0 && visibleCount === 0) {
                        highlightEmpty.style.display = 'block';
                        highlightEmpty.textContent = 'Tidak ada highlight dengan warna ini.';
                    } else if (items.length === 0) {
                        highlightEmpty.style.display = 'block';
                        highlightEmpty.textContent = 'Belum ada bait yang di-highlight.';
                    } else {
                        highlightEmpty.style.display = 'none';
                    }
                }
            }

            for (var c = 0; c < colorOpts.length; c++) {
                (function(opt) {
                    opt.addEventListener('click', function() {
                        var color = opt.getAttribute('data-color');
                        var isSameActive = opt.classList.contains('aktif');

                        for (var co = 0; co < colorOpts.length; co++) {
                            colorOpts[co].classList.remove('aktif');
                        }

                        if (isSameActive) {
                            // Klik warna yang sama lagi → matikan filter, tampilkan semua
                            activeHighlightFilter = null;
                        } else {
                            opt.classList.add('aktif');
                            activeHighlightFilter = color;
                        }

                        applyHighlightFilter();
                    });
                })(colorOpts[c]);
            }

            // Fungsi toggle status (dipakai untuk note & hafalan)
            function toggleBaitStatus(bait, type) {
                var classes = {
                    'note': 'has-note',
                    'hafalan': 'has-hafalan'
                };
                var cls = classes[type];

                if (type === 'hafalan') {
                    var willActivate = !bait.classList.contains(cls);
                    // Maksimal 1 bait yang ditandai hafalan — hapus tanda dari bait lain
                    for (var h = 0; h < baits.length; h++) {
                        if (baits[h] !== bait) {
                            baits[h].classList.remove(cls);
                        }
                    }
                    if (willActivate) {
                        bait.classList.add(cls);
                    } else {
                        bait.classList.remove(cls);
                    }
                    syncHafalanProgress();
                } else {
                    // Toggle class pada bait
                    bait.classList.toggle(cls);
                }

                // Hentikan animasi "just-pressed" pada bait ini juga (jika masih berjalan)
                // supaya background status barunya (mis. hijau hafalan) langsung terlihat
                // jelas, tidak tertutup/tersamarkan oleh sisa glow animasi klik.
                var baitIdx = Array.prototype.indexOf.call(baits, bait);
                if (baitIdx !== -1) {
                    clearPressHighlight(baitIdx);
                }

                // Update sidebar bab marker
                updateSidebarMarkers();
            }

            // Terapkan warna highlight tertentu ke bait (instan, tanpa animasi)
            function applyHighlight(bait, color) {
                bait.classList.add('has-highlight');
                bait.style.transition = 'none';
                bait.style.borderRight = '3px solid ' + color;
                bait.style.background = color + '12'; // ~7% opacity hex
                bait.setAttribute('data-highlight-color', color);
                // Paksa reflow lalu kembalikan transition supaya interaksi lain (hover, klik) tetap animatif
                void bait.offsetWidth;
                bait.style.transition = '';
                updateSidebarMarkers();
                updateHighlightTab();
                if (typeof updateHeaderStats === 'function') updateHeaderStats();
            }

            // Hapus highlight dari bait (instan, tanpa animasi)
            function removeHighlight(bait) {
                bait.classList.remove('has-highlight');
                bait.style.transition = 'none';
                bait.style.borderRight = '';
                bait.style.background = '';
                bait.removeAttribute('data-highlight-color');
                void bait.offsetWidth;
                bait.style.transition = '';
                updateSidebarMarkers();
                updateHighlightTab();
                if (typeof updateHeaderStats === 'function') updateHeaderStats();
            }

            // Palet warna highlight yang tersedia
            var HIGHLIGHT_COLORS = ['#ffd54f', '#4fc3f7', '#81c784', '#ff8a65', '#ce93d8'];

            var activeHighlightPopup = null;

            function closeHighlightPopup() {
                if (activeHighlightPopup) {
                    activeHighlightPopup.remove();
                    activeHighlightPopup = null;
                    document.removeEventListener('click', onDocClickCloseHighlightPopup, true);
                }
            }

            function onDocClickCloseHighlightPopup(e) {
                if (activeHighlightPopup && !activeHighlightPopup.contains(e.target)) {
                    closeHighlightPopup();
                }
            }

            // Buka popup pemilih warna highlight, diposisikan relatif terhadap bait
            // Posisikan popup secara responsif relatif terhadap sebuah rect (bait):
            // muncul di bawah jika cukup ruang, kalau tidak muncul di atas.
            function positionPopupNearRect(popup, rect) {
                var popupRect = popup.getBoundingClientRect();
                var margin = 6;
                var viewportHeight = window.innerHeight;

                var spaceBelow = viewportHeight - rect.bottom;
                var spaceAbove = rect.top;

                var top;
                if (spaceBelow >= popupRect.height + margin || spaceBelow >= spaceAbove) {
                    // Cukup ruang di bawah (atau ruang bawah masih lebih luas dari atas) → tampil di bawah bait
                    top = window.scrollY + rect.bottom + margin;
                } else {
                    // Ruang bawah tidak cukup dan ruang atas lebih luas → tampil di atas bait
                    top = window.scrollY + rect.top - popupRect.height - margin;
                }

                // Jaga agar popup tidak keluar dari batas atas/bawah viewport dokumen
                var minTop = window.scrollY + 8;
                var maxTop = window.scrollY + viewportHeight - popupRect.height - 8;
                if (top < minTop) top = minTop;
                if (top > maxTop && maxTop > minTop) top = maxTop;

                var left = window.scrollX + rect.right - popupRect.width;
                if (left < 8) left = 8;
                var maxLeft = window.scrollX + document.documentElement.clientWidth - popupRect.width - 8;
                if (left > maxLeft) left = maxLeft;

                popup.style.top = top + 'px';
                popup.style.left = left + 'px';
            }

            function openHighlightPopupOnBait(bait) {
                closeHighlightPopup();

                var currentColor = bait.classList.contains('has-highlight')
                    ? (bait.getAttribute('data-highlight-color') || selectedColor)
                    : selectedColor;

                var popup = document.createElement('div');
                popup.className = 'highlight-popup';
                popup._forBait = bait;

                for (var i = 0; i < HIGHLIGHT_COLORS.length; i++) {
                    (function(color) {
                        var swatch = document.createElement('button');
                        swatch.type = 'button';
                        swatch.className = 'color-opt';
                        swatch.style.background = color;
                        if (bait.classList.contains('has-highlight') && currentColor.toLowerCase() === color.toLowerCase()) {
                            swatch.classList.add('aktif');
                        }
                        swatch.addEventListener('click', function(e) {
                            e.stopPropagation();
                            selectedColor = color;
                            applyHighlight(bait, color);
                            closeHighlightPopup();
                        });
                        popup.appendChild(swatch);
                    })(HIGHLIGHT_COLORS[i]);
                }

                // Opsi hapus highlight — hanya tampil jika bait sedang di-highlight
                if (bait.classList.contains('has-highlight')) {
                    var removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'color-opt remove-opt';
                    removeBtn.title = 'Hapus highlight';
                    removeBtn.textContent = '✕';
                    removeBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        removeHighlight(bait);
                        closeHighlightPopup();
                    });
                    popup.appendChild(removeBtn);
                }

                document.body.appendChild(popup);

                // Posisikan popup secara responsif (atas/bawah) relatif terhadap bait
                var rect = bait.getBoundingClientRect();
                positionPopupNearRect(popup, rect);

                activeHighlightPopup = popup;

                // Tutup popup jika klik di luar
                setTimeout(function() {
                    document.addEventListener('click', onDocClickCloseHighlightPopup, true);
                }, 0);
            }

            // Popup pilihan aksi (Catatan / Highlight) setelah tekan-lama bait
            var activeActionPopup = null;

            function closeActionPopup() {
                if (activeActionPopup) {
                    activeActionPopup.remove();
                    activeActionPopup = null;
                    document.removeEventListener('click', onDocClickCloseActionPopup, true);
                }
            }

            function onDocClickCloseActionPopup(e) {
                if (activeActionPopup && !activeActionPopup.contains(e.target)) {
                    closeActionPopup();
                }
            }

            function openBaitActionPopup(bait) {
                closeActionPopup();
                closeHighlightPopup();

                var popup = document.createElement('div');
                popup.className = 'bait-action-popup';

                var noteLabel = bait.classList.contains('has-note') ? '📝 Ubah/Tambah Catatan' : '📝 Tambah Catatan';
                var btnNote = document.createElement('button');
                btnNote.type = 'button';
                btnNote.textContent = noteLabel;
                btnNote.addEventListener('click', function(e) {
                    e.stopPropagation();
                    closeActionPopup();
                    openNoteModal(bait);
                });
                popup.appendChild(btnNote);

                var highlightLabel = bait.classList.contains('has-highlight') ? '🟡 Ubah Highlight' : '🟡 Highlight';
                var btnHighlight = document.createElement('button');
                btnHighlight.type = 'button';
                btnHighlight.textContent = highlightLabel;
                btnHighlight.addEventListener('click', function(e) {
                    e.stopPropagation();
                    closeActionPopup();
                    openHighlightPopupOnBait(bait);
                });
                popup.appendChild(btnHighlight);

                var hafalanLabel = bait.classList.contains('has-hafalan') ? '✅ Batalkan Selesai' : '✅ Selesai';
                var btnHafalan = document.createElement('button');
                btnHafalan.type = 'button';
                btnHafalan.textContent = hafalanLabel;
                btnHafalan.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleBaitStatus(bait, 'hafalan');
                    closeActionPopup();
                });
                popup.appendChild(btnHafalan);

                document.body.appendChild(popup);

                // Posisikan popup secara responsif (atas/bawah) relatif terhadap bait
                var rect = bait.getBoundingClientRect();
                positionPopupNearRect(popup, rect);

                activeActionPopup = popup;

                setTimeout(function() {
                    document.addEventListener('click', onDocClickCloseActionPopup, true);
                }, 0);
            }

            // =============================================
            // 6. UPDATE SIDEBAR MARKERS
            // =============================================
            function updateSidebarMarkers() {
                var babItems = document.querySelectorAll('.sidebar-bab .item');
                var baitsData = contentData.baits;

                for (var i = 0; i < babItems.length; i++) {
                    var babId = babItems[i].getAttribute('data-bab-id');
                    var hasNote = false;
                    var hasHighlight = false;
                    var hasHafalan = false;

                    for (var b = 0; b < baits.length; b++) {
                        if (baitsData[b] && baitsData[b].babId === babId) {
                            if (baits[b].classList.contains('has-note')) hasNote = true;
                            if (baits[b].classList.contains('has-highlight')) hasHighlight = true;
                            if (baits[b].classList.contains('has-hafalan')) hasHafalan = true;
                        }
                    }

                    babItems[i].classList.remove('has-note', 'has-highlight', 'has-hafalan');
                    if (hasNote) babItems[i].classList.add('has-note');
                    if (hasHighlight) babItems[i].classList.add('has-highlight');
                    if (hasHafalan) babItems[i].classList.add('has-hafalan');

                    // Marker sidebar bab tetap berupa titik polos (tidak ada simbol buku)
                    var marker = babItems[i].querySelector('.marker');
                    if (marker) {
                        marker.textContent = '●';
                    }
                }
            }

            // =============================================
            // 7. UPDATE TAB HIGHLIGHT
            // =============================================
            function updateHighlightTab() {
                var highlightList = document.getElementById('highlightList');
                var highlightEmpty = document.getElementById('highlightEmpty');
                if (!highlightList) return;

                // Hapus item lama (kecuali empty notice)
                var oldItems = highlightList.querySelectorAll('.note-item');
                for (var r = 0; r < oldItems.length; r++) { oldItems[r].remove(); }

                // Tambahkan highlight yang ada
                var highlightedBaits = document.querySelectorAll('.teks-bait .bait.has-highlight');

                if (highlightedBaits.length === 0) {
                    if (highlightEmpty) highlightEmpty.style.display = 'block';
                    return;
                }
                if (highlightEmpty) highlightEmpty.style.display = 'none';

                for (var b = 0; b < highlightedBaits.length; b++) {
                    var bait = highlightedBaits[b];
                    var arabText = bait.querySelector('.arab').textContent;
                    var noEl = bait.querySelector('.no');
                    var baitNo = noEl ? noEl.textContent : '';
                    var color = bait.getAttribute('data-highlight-color') || '#ffd54f';
                    var item = document.createElement('div');
                    item.className = 'note-item';
                    item.style.borderColor = color;
                    item.style.borderLeft = '3px solid ' + color;
                    item.style.background = color + '12'; // ~7% opacity, sama seperti tampilan bait
                    item.setAttribute('data-bait-ref', arabText.substring(0, 40));
                    item.setAttribute('data-color', color);
                    item.innerHTML =
                        '<div class="note-text">' +
                            '<span class="bait-ref" style="color:' + color + ';">' +
                                '<span class="bait-no-badge" style="background:' + color + ';">' + baitNo + '</span> ' +
                                arabText.substring(0, 40) + (arabText.length > 40 ? '...' : '') +
                            '</span>' +
                        '</div>' +
                        '<button class="note-delete">✕</button>';
                    highlightList.appendChild(item);

                    // Delete handler
                    (function(baitEl) {
                        item.querySelector('.note-delete').addEventListener('click', function () {
                            removeHighlight(baitEl);
                        });
                    })(bait);
                }

                // Terapkan kembali filter warna yang sedang aktif (jika ada) ke daftar yang baru dibangun
                if (typeof applyHighlightFilter === 'function') applyHighlightFilter();
            }

            // =============================================
            // 8. TAB NAVIGATION
            // =============================================
            function switchTab(tabId) {
                var tabs = document.querySelectorAll('.tab-nav button');
                var contents = document.querySelectorAll('.tab-content');

                for (var i = 0; i < tabs.length; i++) {
                    tabs[i].classList.remove('aktif');
                    if (tabs[i].getAttribute('data-tab') === tabId) {
                        tabs[i].classList.add('aktif');
                    }
                }

                for (var c = 0; c < contents.length; c++) {
                    contents[c].classList.remove('aktif');
                    if (contents[c].id === 'tab' + tabId.charAt(0).toUpperCase() + tabId.slice(1)) {
                        contents[c].classList.add('aktif');
                    }
                }
            }

            var tabBtns = document.querySelectorAll('.tab-nav button');
            for (var tb = 0; tb < tabBtns.length; tb++) {
                (function(btn) {
                    btn.addEventListener('click', function() {
                        var tabId = btn.getAttribute('data-tab');
                        switchTab(tabId);
                        // Saat kembali ke tab keterangan, refresh isi keterangan
                        if (tabId === 'keterangan') {
                            refreshKeteranganTab();
                        }
                    });
                })(tabBtns[tb]);
            }

            // =============================================
            // 9. TAMBAH CATATAN
            // =============================================
            var noteEmpty = document.getElementById('noteEmpty');

            // Fungsi bersama untuk menyimpan catatan pada sebuah bait
            function saveNoteForBait(bait, text) {
                text = text.trim();
                if (!text || !bait) return;

                var arabText = bait.querySelector('.arab').textContent;

                // Tambahkan ke tab catatan
                var container = document.getElementById('tabCatatan');
                var noteItem = document.createElement('div');
                noteItem.className = 'note-item';
                noteItem.innerHTML = `
                    <div class="note-text">
                        <span class="bait-ref">${arabText.substring(0, 40)}${arabText.length > 40 ? '...' : ''}</span>
                        ${text}
                    </div>
                    <button class="note-delete">✕</button>
                `;
                container.appendChild(noteItem);

                // Tandai bait
                bait.classList.add('has-note');

                // Update sidebar
                updateSidebarMarkers();
                if (typeof updateHeaderStats === 'function') updateHeaderStats();

                if (noteEmpty) noteEmpty.style.display = 'none';

                // Hapus event delete
                var delBtn = noteItem.querySelector('.note-delete');
                delBtn.addEventListener('click', function() {
                    noteItem.remove();
                    var checkEmpty = container.querySelectorAll('.note-item:not(.note-empty)');
                    if (checkEmpty.length === 0 && noteEmpty) {
                        noteEmpty.style.display = 'block';
                    }
                    // Hapus status note dari bait jika tidak ada catatan lagi
                    var baitRef = noteItem.querySelector('.bait-ref');
                    if (baitRef) {
                        var refText = baitRef.textContent;
                        var allBaits = document.querySelectorAll('.teks-bait .bait');
                        for (var i = 0; i < allBaits.length; i++) {
                            var arab = allBaits[i].querySelector('.arab').textContent;
                            if (arab.substring(0, 40) === refText.substring(0, 40)) {
                                // Cek apakah masih ada catatan lain untuk bait ini
                                var otherNotes = container.querySelectorAll('.note-item .bait-ref');
                                var stillHasNote = false;
                                for (var n = 0; n < otherNotes.length; n++) {
                                    if (otherNotes[n].textContent === refText) {
                                        stillHasNote = true;
                                        break;
                                    }
                                }
                                if (!stillHasNote) {
                                    allBaits[i].classList.remove('has-note');
                                }
                                break;
                            }
                        }
                    }
                    updateSidebarMarkers();
                    if (typeof updateHeaderStats === 'function') updateHeaderStats();
                });
            }

            // =============================================
            // 9b. MODAL TAMBAH CATATAN (dari tekan-lama bait)
            // =============================================
            var modalCatatan = document.getElementById('modalCatatan');
            var modalCatatanInput = document.getElementById('modalCatatanInput');
            var modalCatatanBaitRef = document.getElementById('modalCatatanBaitRef');
            var modalCatatanSave = document.getElementById('modalCatatanSave');
            var modalCatatanCancel = document.getElementById('modalCatatanCancel');
            var modalCatatanClose = document.getElementById('modalCatatanClose');
            var noteModalTargetBait = null;

            function openNoteModal(bait) {
                noteModalTargetBait = bait;
                var arabText = bait.querySelector('.arab').textContent;
                if (modalCatatanBaitRef) modalCatatanBaitRef.textContent = arabText;
                if (modalCatatanInput) modalCatatanInput.value = '';
                if (modalCatatan) {
                    modalCatatan.classList.add('aktif');
                    document.body.style.overflow = 'hidden';
                }
                setTimeout(function() {
                    if (modalCatatanInput) modalCatatanInput.focus();
                }, 50);
            }

            function closeNoteModal() {
                noteModalTargetBait = null;
                if (modalCatatan) {
                    modalCatatan.classList.remove('aktif');
                    document.body.style.overflow = '';
                }
            }

            if (modalCatatanSave) {
                modalCatatanSave.addEventListener('click', function() {
                    var text = modalCatatanInput ? modalCatatanInput.value.trim() : '';
                    if (!text || !noteModalTargetBait) {
                        closeNoteModal();
                        return;
                    }
                    saveNoteForBait(noteModalTargetBait, text);
                    closeNoteModal();
                });
            }

            if (modalCatatanCancel) {
                modalCatatanCancel.addEventListener('click', closeNoteModal);
            }
            if (modalCatatanClose) {
                modalCatatanClose.addEventListener('click', closeNoteModal);
            }
            if (modalCatatan) {
                modalCatatan.addEventListener('click', function(e) {
                    if (e.target === modalCatatan) closeNoteModal();
                });
            }
            if (modalCatatanInput) {
                modalCatatanInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        modalCatatanSave.click();
                    } else if (e.key === 'Escape') {
                        closeNoteModal();
                    }
                });
            }

            // =============================================
            // 10. MODAL INFO KITAB
            // =============================================
            var modal = document.getElementById('modalInfoKitab');
            var btnInfo = document.getElementById('btnInfoKitab');
            var btnClose = document.getElementById('modalClose');

            btnInfo.addEventListener('click', function() {
                modal.classList.add('aktif');
                document.body.style.overflow = 'hidden';
            });

            btnClose.addEventListener('click', function() {
                modal.classList.remove('aktif');
                document.body.style.overflow = '';
            });

            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.remove('aktif');
                    document.body.style.overflow = '';
                }
            });

            // =============================================
            // 11. KEYBOARD NAVIGATION (← →)
            // =============================================
            document.addEventListener('keydown', function(e) {
                if (modal.classList.contains('aktif')) return;
                if (modalCatatan && modalCatatan.classList.contains('aktif')) return;
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                if (e.key === 'ArrowRight') {
                    btnNext.click();
                } else if (e.key === 'ArrowLeft') {
                    btnPrev.click();
                }
            });

            // =============================================
            // 12. UPDATE STATS DI HEADER
            // =============================================
            function updateHeaderStats() {
                var bookmarkCount = document.querySelector('.actions .active .badge');
                var hafalanCount = document.querySelector('.actions button:nth-child(2) .badge');

                var totalBookmarks = document.querySelectorAll('.bait.has-note').length +
                    document.querySelectorAll('.bait.has-highlight').length;
                var totalHafalan = document.querySelectorAll('.bait.has-hafalan').length;

                if (bookmarkCount) bookmarkCount.textContent = totalBookmarks;
                if (hafalanCount) hafalanCount.textContent = totalHafalan;
            }

            // Override toggleBaitStatus untuk update stats
            var originalToggle = toggleBaitStatus;
            toggleBaitStatus = function(bait, type) {
                originalToggle(bait, type);
                updateHeaderStats();
            };

            // =============================================
            // 13. INIT
            // =============================================
            // Set active bait pertama
            setActiveBait(0);

            // Update sidebar markers
            updateSidebarMarkers();

            // Update header stats
            updateHeaderStats();

            // =============================================
            // 14. FONT SWITCHER ARAB (header)
            // =============================================
            var FONT_STORAGE_KEY = 'fw_arabicFont';
            var btnFontArab = document.getElementById('btnFontArab');
            var fontSwitcher = document.getElementById('fontSwitcher');
            var fontMenu = document.getElementById('fontSwitcherMenu');
            var fontOptions = fontMenu ? fontMenu.querySelectorAll('.font-option') : [];

            function applyArabicFont(fontValue) {
                document.documentElement.style.setProperty('--font-arabic', fontValue);
                fontOptions.forEach(function (opt) {
                    opt.classList.toggle('active', opt.getAttribute('data-font') === fontValue);
                });
            }

            function closeFontMenu() {
                if (fontSwitcher) fontSwitcher.classList.remove('open');
                if (btnFontArab) btnFontArab.setAttribute('aria-expanded', 'false');
            }

            if (btnFontArab && fontSwitcher) {
                btnFontArab.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var isOpen = fontSwitcher.classList.toggle('open');
                    btnFontArab.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                });
            }

            fontOptions.forEach(function (opt) {
                opt.addEventListener('click', function () {
                    var fontValue = opt.getAttribute('data-font');
                    applyArabicFont(fontValue);
                    try { localStorage.setItem(FONT_STORAGE_KEY, fontValue); } catch (e) {}
                    closeFontMenu();
                });
            });

            document.addEventListener('click', function (e) {
                if (fontSwitcher && !fontSwitcher.contains(e.target)) closeFontMenu();
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') closeFontMenu();
            });

            // Terapkan font tersimpan (jika ada) saat load
            try {
                var savedFont = localStorage.getItem(FONT_STORAGE_KEY);
                if (savedFont) applyArabicFont(savedFont);
            } catch (e) {}

            console.log('✅ FathlyWeb · Matan loaded');

    } // end of initApp()

})();
