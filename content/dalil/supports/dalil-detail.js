/* =============================================
   DALIL-DETAIL.JS — Halaman Detail Dalil FathlyWeb
   ES5, vanilla
============================================= */

(function() {
    'use strict';

    var DATA_URL = '../data/dalil.json';

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : str;
        return div.innerHTML;
    }

    function getIdFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    function gradeLabel(grade) {
        var map = { quran: "AL-QUR'AN", shahih: 'HADITS SHAHIH', hasan: 'HADITS HASAN', dhaif: 'HADITS DHAIF' };
        return map[grade] || grade.toUpperCase();
    }

    function renderAnchor(item, temaList) {
        var temaNama = item.tema.map(function(id) {
            for (var i = 0; i < temaList.length; i++) {
                if (temaList[i].temaId === id) return temaList[i].nama;
            }
            return id;
        });
        var temaHtml = temaNama.map(function(t) {
            return '<span class="dd-tema-pill">' + escapeHtml(t) + '</span>';
        }).join('');

        return (
            '<div class="dd-anchor">' +
                '<span class="dd-grade ' + item.grade + '">' + gradeLabel(item.grade) + '</span>' +
                '<div class="dd-rujukan">' + escapeHtml(item.rujukan) + '</div>' +
                '<div class="dd-arab">' + escapeHtml(item.arab) + '</div>' +
                '<div class="dd-terjemahan">"' + escapeHtml(item.terjemahan) + '"</div>' +
                (temaHtml ? '<div class="dd-tema-row">' + temaHtml + '</div>' : '') +
            '</div>'
        );
    }

    function jenisLabel(jenis) {
        var map = { tafsir: 'Tafsir', qiraah: 'Qira\u2019ah', faedah: 'Faedah' };
        return map[jenis] || 'Tafsir';
    }

    function jenisIcon(jenis) {
        var map = { tafsir: '📖', qiraah: '🔤', faedah: '💡' };
        return map[jenis] || '📖';
    }

    function renderBanding(item) {
        if (!item.tafsirBanding || item.tafsirBanding.length === 0) return '';

        var kolom = item.tafsirBanding.map(function(t) {
            var jenis = t.jenis || 'tafsir';
            return (
                '<div class="dd-compare-col">' +
                    '<div class="dd-ulama">' +
                        '<span class="dd-avatar">' + jenisIcon(jenis) + '</span>' +
                        '<div>' +
                            '<div class="dd-nama-ulama">' + escapeHtml(t.ulama) + '</div>' +
                            (t.kitab ? '<div class="dd-kitab-ulama">' + escapeHtml(t.kitab) + '</div>' : '') +
                        '</div>' +
                        '<span class="dd-jenis-badge dd-jenis-' + jenis + '">' + jenisLabel(jenis) + '</span>' +
                    '</div>' +
                    '<div class="dd-konten">' + escapeHtml(t.isi) + '</div>' +
                '</div>'
            );
        }).join('');

        return (
            '<div class="dd-section-label">Geser untuk membandingkan penjelasan tiap ulama →</div>' +
            '<div class="dd-compare-scroll">' + kolom + '</div>'
        );
    }

    function renderTakhrij(item) {
        if (!item.takhrij || item.takhrij.length === 0) return '';
        var baris = item.takhrij.map(function(t) {
            return (
                '<div class="dd-takhrij-row">' +
                    '<span class="dd-kitab-nama">' + escapeHtml(t.kitab) + '</span>' +
                    '<span class="dd-no-hadits">no. ' + escapeHtml(t.no) + '</span>' +
                    '<span class="dd-status">Ada</span>' +
                '</div>'
            );
        }).join('');
        return (
            '<div class="dd-section-label" style="margin-top:1.6rem;">Takhrij / sumber riwayat</div>' +
            '<div class="dd-takhrij-table">' + baris + '</div>'
        );
    }

    function render(item, temaList) {
        var main = document.getElementById('ddMain');
        var adaBanding = item.tafsirBanding && item.tafsirBanding.length > 0;
        var adaTakhrij = item.takhrij && item.takhrij.length > 0;

        var html = renderAnchor(item, temaList);
        html += renderBanding(item);
        html += renderTakhrij(item);

        if (!adaBanding && !adaTakhrij) {
            html += '<div class="dd-kosong-hint">📊 Data perbandingan tafsir &amp; takhrij untuk dalil ini belum tersedia.</div>';
        }

        main.innerHTML = html;
        document.title = item.rujukan + ' | FathlyWeb';
    }

    function init() {
        var id = getIdFromUrl();
        var main = document.getElementById('ddMain');
        if (!id) {
            main.innerHTML = '<div class="dd-error">⚠️ Dalil tidak ditemukan (id kosong).</div>';
            return;
        }
        fetch(DATA_URL)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var item = null;
                for (var i = 0; i < data.dalilList.length; i++) {
                    if (data.dalilList[i].id === id) { item = data.dalilList[i]; break; }
                }
                if (!item) {
                    main.innerHTML = '<div class="dd-error">⚠️ Dalil dengan id "' + escapeHtml(id) + '" tidak ditemukan.</div>';
                    return;
                }
                render(item, data.temaList || []);
            })
            .catch(function(err) {
                main.innerHTML = '<div class="dd-error">⚠️ Gagal memuat data dalil.</div>';
                console.error('Gagal memuat dalil.json:', err);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
