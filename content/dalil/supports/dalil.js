/* =============================================
   DALIL.JS — Tab Dalil FathlyWeb
   Filter: Accordion menyatu, multi-select (Filter C)
   ES5, vanilla, mengikuti pola matan.js
============================================= */

(function() {
    'use strict';

    var DATA_URL = 'content/dalil/data/dalil.json';
    var DETAIL_PAGE = 'content/dalil/pages/detail.html';

    // Tiap filter berupa ARRAY (mendukung multi-select). Nilai 'semua' berarti
    // "tidak difilter" pada dimensi itu — begitu ada pilihan spesifik lain
    // yang dipilih, 'semua' otomatis lepas (lihat toggleChip).
    var state = {
        dalilList: [],
        temaList: [],
        query: '',
        filterSumber: ['semua'],
        filterDerajat: ['semua'],
        filterTema: ['semua']
    };

    var DERAJAT_LABEL = { semua: 'Semua', shahih: 'Shahih', hasan: 'Hasan', dhaif: 'Dhaif' };
    var SUMBER_LABEL = { semua: 'Semua', quran: "Al-Qur'an", hadits: 'Hadits' };

    // ===== HELPERS =====
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : str;
        return div.innerHTML;
    }

    function namaTema(temaId) {
        for (var i = 0; i < state.temaList.length; i++) {
            if (state.temaList[i].temaId === temaId) return state.temaList[i].nama;
        }
        return temaId;
    }

    function gradeLabel(grade) {
        var map = { quran: "AL-QUR'AN", shahih: 'SHAHIH', hasan: 'HASAN', dhaif: 'DHAIF' };
        return map[grade] || grade.toUpperCase();
    }

    // Badge utama pada tiap kartu sekarang berbasis SUMBER (Al-Qur'an / Hadits),
    // bukan derajat. Derajat (Shahih/Hasan/Dhaif) jadi badge kedua yang HANYA
    // muncul untuk hadits — karena seluruh ayat Al-Qur'an sudah dianggap
    // berderajat shahih (mutawatir) di data, tidak perlu label derajat berulang.
    function sumberLabel(sumber) {
        return sumber === 'quran' ? "AL-QUR'AN" : 'HADITS';
    }

    function derajatLabel(grade) {
        var map = { shahih: 'SHAHIH', hasan: 'HASAN', dhaif: 'DHAIF' };
        return map[grade] || grade.toUpperCase();
    }

    // Ringkasan nilai terpilih untuk ditampilkan di kepala accordion.
    // 'semua' -> "Semua" | 1 pilihan -> nama pilihan itu | >1 -> "N dipilih"
    function ringkasanFilter(arr, labelFn) {
        if (arr.length === 0 || arr.indexOf('semua') !== -1) return 'Semua';
        if (arr.length === 1) return labelFn(arr[0]);
        return arr.length + ' dipilih';
    }

    // ===== FILTER & SEARCH =====
    function cocokMulti(nilai, arr) {
        if (arr.indexOf('semua') !== -1) return true;
        return arr.indexOf(nilai) !== -1;
    }

    function cocokTema(itemTema, arr) {
        if (arr.indexOf('semua') !== -1) return true;
        for (var i = 0; i < itemTema.length; i++) {
            if (arr.indexOf(itemTema[i]) !== -1) return true;
        }
        return false;
    }

    function cocokQuery(item, q) {
        if (!q) return true;
        q = q.toLowerCase();
        var haystack = [
            item.terjemahan || '',
            item.rujukan || '',
            item.kitab || ''
        ];
        for (var i = 0; i < item.tema.length; i++) {
            haystack.push(namaTema(item.tema[i]));
        }
        var gabung = haystack.join(' ').toLowerCase();
        return gabung.indexOf(q) !== -1;
    }

    function getHasil() {
        return state.dalilList.filter(function(item) {
            if (!cocokMulti(item.sumber, state.filterSumber)) return false;
            if (!cocokMulti(item.grade, state.filterDerajat)) return false;
            if (!cocokTema(item.tema, state.filterTema)) return false;
            if (!cocokQuery(item, state.query)) return false;
            return true;
        });
    }

    function highlightTerjemahan(text, q) {
        var escaped = escapeHtml(text);
        if (!q) return escaped;
        var idx = escaped.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return escaped;
        return escaped.slice(0, idx) + '<mark>' + escaped.slice(idx, idx + q.length) + '</mark>' + escaped.slice(idx + q.length);
    }

    // ===== RENDER FILTER PANEL =====
    function renderFilterOptions() {
        // Sumber
        var sumberWrap = document.getElementById('dalilOptSumber');
        if (sumberWrap) {
            var sumberKeys = ['semua', 'quran', 'hadits'];
            sumberWrap.innerHTML = sumberKeys.map(function(k) {
                var aktif = state.filterSumber.indexOf(k) !== -1;
                return '<span class="dalil-acc-chip ' + (aktif ? 'aktif' : '') + '" data-key="sumber" data-value="' + k + '">' + SUMBER_LABEL[k] + '</span>';
            }).join('');
        }

        // Derajat
        var derajatWrap = document.getElementById('dalilOptDerajat');
        if (derajatWrap) {
            var derajatKeys = ['semua', 'shahih', 'hasan', 'dhaif'];
            derajatWrap.innerHTML = derajatKeys.map(function(k) {
                var aktif = state.filterDerajat.indexOf(k) !== -1;
                return '<span class="dalil-acc-chip ' + (aktif ? 'aktif' : '') + '" data-key="derajat" data-value="' + k + '">' + DERAJAT_LABEL[k] + '</span>';
            }).join('');
        }

        // Tema (dinamis dari data)
        var temaWrap = document.getElementById('dalilOptTema');
        if (temaWrap) {
            var html = '<span class="dalil-acc-chip ' + (state.filterTema.indexOf('semua') !== -1 ? 'aktif' : '') + '" data-key="tema" data-value="semua">Semua</span>';
            for (var i = 0; i < state.temaList.length; i++) {
                var t = state.temaList[i];
                var aktifTema = state.filterTema.indexOf(t.temaId) !== -1;
                html += '<span class="dalil-acc-chip ' + (aktifTema ? 'aktif' : '') + '" data-key="tema" data-value="' + t.temaId + '">' + escapeHtml(t.nama) + '</span>';
            }
            temaWrap.innerHTML = html;
        }

        // Ringkasan di kepala accordion
        var elSumber = document.getElementById('dalilNilaiSumber');
        var elDerajat = document.getElementById('dalilNilaiDerajat');
        var elTema = document.getElementById('dalilNilaiTema');
        if (elSumber) elSumber.textContent = ringkasanFilter(state.filterSumber, function(k) { return SUMBER_LABEL[k]; });
        if (elDerajat) elDerajat.textContent = ringkasanFilter(state.filterDerajat, function(k) { return DERAJAT_LABEL[k]; });
        if (elTema) elTema.textContent = ringkasanFilter(state.filterTema, namaTema);
    }

    // ===== RENDER HASIL =====
    function renderHasil() {
        var hasil = getHasil();
        var listEl = document.getElementById('dalilResultList');
        var infoEl = document.getElementById('dalilHasilInfo');
        if (!listEl) return;

        if (infoEl) {
            if (state.query) {
                infoEl.innerHTML = 'Ditemukan <b>' + hasil.length + ' dalil</b> untuk "' + escapeHtml(state.query) + '"';
            } else {
                infoEl.innerHTML = 'Menampilkan <b>' + hasil.length + ' dalil</b>';
            }
        }

        if (hasil.length === 0) {
            listEl.innerHTML =
                '<div class="dalil-empty">' +
                    '<span class="ikon">🔍</span>' +
                    'Tidak ada dalil yang cocok.<br>Coba ubah kata kunci atau filter.' +
                '</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < hasil.length; i++) {
            var item = hasil[i];
            var temaLabel = item.tema.map(namaTema).map(function(t) { return '#' + t.replace(/\s+/g, ''); }).join(' ');
            var adaBanding = item.tafsirBanding && item.tafsirBanding.length > 0;
            html +=
                '<div class="dalil-result-item" data-id="' + item.id + '">' +
                    '<div class="dalil-top-row">' +
                        '<span class="dalil-badge-sumber ' + item.sumber + '">' + sumberLabel(item.sumber) + '</span>' +
                        (item.sumber === 'hadits' ? '<span class="dalil-badge-derajat ' + item.grade + '">' + derajatLabel(item.grade) + '</span>' : '') +
                        '<span class="dalil-rujukan">' + escapeHtml(item.rujukan) + '</span>' +
                    '</div>' +
                    '<div class="dalil-arab-preview">' + escapeHtml(item.arab) + '</div>' +
                    '<div class="dalil-terjemahan-preview">' + highlightTerjemahan('"' + item.terjemahan + '"', state.query) + '</div>' +
                    (temaLabel ? '<span class="dalil-tema-tag">' + escapeHtml(temaLabel) + '</span>' : '') +
                    (adaBanding ? '<span class="dalil-banding-hint">📊 Ada perbandingan tafsir — ketuk untuk lihat</span>' : '') +
                '</div>';
        }
        listEl.innerHTML = html;
    }

    function renderAll() {
        renderFilterOptions();
        renderHasil();
    }

    // ===== TOGGLE CHIP (multi-select) =====
    // key: 'sumber' | 'derajat' | 'tema'
    function toggleChip(key, value) {
        var stateKey = 'filter' + key.charAt(0).toUpperCase() + key.slice(1);
        var arr = state[stateKey];

        if (value === 'semua') {
            arr.length = 0;
            arr.push('semua');
        } else {
            var idxSemua = arr.indexOf('semua');
            if (idxSemua !== -1) arr.splice(idxSemua, 1);

            var idxValue = arr.indexOf(value);
            if (idxValue !== -1) {
                arr.splice(idxValue, 1);
                if (arr.length === 0) arr.push('semua');
            } else {
                arr.push(value);
            }
        }

        renderFilterOptions();
        renderHasil();
    }

    // ===== ACCORDION (hanya 1 terbuka sekaligus) =====
    function toggleAccordion(item) {
        var sedangTerbuka = item.classList.contains('terbuka');
        var semuaItem = document.querySelectorAll('.dalil-acc-item');
        for (var i = 0; i < semuaItem.length; i++) semuaItem[i].classList.remove('terbuka');
        if (!sedangTerbuka) item.classList.add('terbuka');
    }

    // ===== EVENTS =====
    function bindEvents() {
        var searchInput = document.getElementById('dalilSearchInput');
        var searchClear = document.getElementById('dalilSearchClear');

        if (searchInput) {
            searchInput.addEventListener('input', function() {
                state.query = searchInput.value.trim();
                if (searchClear) searchClear.classList.toggle('tampil', state.query.length > 0);
                renderHasil();
            });
        }
        if (searchClear) {
            searchClear.addEventListener('click', function() {
                state.query = '';
                if (searchInput) searchInput.value = '';
                searchClear.classList.remove('tampil');
                renderHasil();
            });
        }

        document.addEventListener('click', function(e) {
            // Chip filter (multi-select) — dicek lebih dulu supaya klik di
            // dalam body accordion tidak ikut membuka/menutup accordion-nya.
            var chip = e.target.closest('.dalil-acc-chip');
            if (chip) {
                toggleChip(chip.getAttribute('data-key'), chip.getAttribute('data-value'));
                return;
            }

            // Kepala accordion (buka/tutup)
            var head = e.target.closest('.dalil-acc-head');
            if (head) {
                toggleAccordion(head.parentElement);
                return;
            }

            // Kartu hasil -> ke halaman detail
            var card = e.target.closest('.dalil-result-item');
            if (card) {
                var id = card.getAttribute('data-id');
                window.location.href = DETAIL_PAGE + '?id=' + encodeURIComponent(id);
            }
        });
    }

    // ===== INIT =====
    function initDalil() {
        var tabDalil = document.getElementById('tab-dalil');
        if (!tabDalil) return; // halaman lain tidak perlu load ini

        fetch(DATA_URL)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                state.dalilList = data.dalilList || [];
                state.temaList = data.temaList || [];
                bindEvents();
                renderAll();
            })
            .catch(function(err) {
                var listEl = document.getElementById('dalilResultList');
                if (listEl) {
                    listEl.innerHTML = '<div class="dalil-empty"><span class="ikon">⚠️</span>Gagal memuat data dalil.</div>';
                }
                console.error('Gagal memuat dalil.json:', err);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDalil);
    } else {
        initDalil();
    }

})();
