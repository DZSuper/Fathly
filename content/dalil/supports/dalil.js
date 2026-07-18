/* =============================================
   DALIL.JS — Tab Dalil FathlyWeb
   Konsep: Pencarian & Filter (Preview 2)
   ES5, vanilla, mengikuti pola matan.js
============================================= */

(function() {
    'use strict';

    var DATA_URL = 'content/dalil/data/dalil.json';
    var DETAIL_PAGE = 'content/dalil/pages/detail.html';

    var state = {
        dalilList: [],
        temaList: [],
        query: '',
        filterSumber: 'semua',
        filterDerajat: 'semua',
        filterTema: 'semua'
    };

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

    // ===== FILTER & SEARCH =====
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
            if (state.filterSumber !== 'semua' && item.sumber !== state.filterSumber) return false;
            if (state.filterDerajat !== 'semua' && item.grade !== state.filterDerajat) return false;
            if (state.filterTema !== 'semua' && item.tema.indexOf(state.filterTema) === -1) return false;
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

    // ===== RENDER =====
    function renderChips() {
        var temaWrap = document.getElementById('dalilFilterTema');
        if (!temaWrap) return;
        var html = '<span class="dalil-chip ' + (state.filterTema === 'semua' ? 'aktif' : '') + '" data-tema="semua">Semua</span>';
        for (var i = 0; i < state.temaList.length; i++) {
            var t = state.temaList[i];
            html += '<span class="dalil-chip ' + (state.filterTema === t.temaId ? 'aktif' : '') + '" data-tema="' + t.temaId + '">' + escapeHtml(t.nama) + '</span>';
        }
        temaWrap.innerHTML = html;
    }

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
                        '<span class="dalil-grade ' + item.grade + '">' + gradeLabel(item.grade) + '</span>' +
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
        renderChips();
        renderHasil();
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
            var chip = e.target.closest('.dalil-chip[data-sumber]');
            if (chip) {
                state.filterSumber = chip.getAttribute('data-sumber');
                var wrap = chip.parentElement;
                var chips = wrap.querySelectorAll('.dalil-chip');
                for (var i = 0; i < chips.length; i++) chips[i].classList.remove('aktif');
                chip.classList.add('aktif');
                renderHasil();
                return;
            }
            var chipD = e.target.closest('.dalil-chip[data-derajat]');
            if (chipD) {
                state.filterDerajat = chipD.getAttribute('data-derajat');
                var wrapD = chipD.parentElement;
                var chipsD = wrapD.querySelectorAll('.dalil-chip');
                for (var j = 0; j < chipsD.length; j++) chipsD[j].classList.remove('aktif');
                chipD.classList.add('aktif');
                renderHasil();
                return;
            }
            var chipT = e.target.closest('.dalil-chip[data-tema]');
            if (chipT) {
                state.filterTema = chipT.getAttribute('data-tema');
                renderChips();
                renderHasil();
                return;
            }
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
        if (!tabDalil) return; // halaman lain (mis. detail) tidak perlu load ini

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
