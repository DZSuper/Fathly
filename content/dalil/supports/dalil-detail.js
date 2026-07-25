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

    function sumberLabel(sumber) {
        return sumber === 'quran' ? "AL-QUR'AN" : 'HADITS';
    }

    function derajatLabel(grade) {
        var map = { shahih: 'SHAHIH', hasan: 'HASAN', dhaif: 'DHAIF' };
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
                '<span class="dd-badge-sumber ' + item.sumber + '">' + sumberLabel(item.sumber) + '</span>' +
                (item.sumber === 'hadits' ? ' <span class="dd-badge-derajat ' + item.grade + '">' + derajatLabel(item.grade) + '</span>' : '') +
                '<div class="dd-rujukan">' + escapeHtml(item.rujukan) + '</div>' +
                '<div class="dd-arab">' + escapeHtml(item.arab) + '</div>' +
                '<div class="dd-terjemahan">"' + escapeHtml(item.terjemahan) + '"</div>' +
                (temaHtml ? '<div class="dd-tema-row">' + temaHtml + '</div>' : '') +
            '</div>'
        );
    }

    // Metadata tampilan per jenis penjelasan: ikon dan label kelas warna.
    // Dipetakan dari field `jenis` pada tiap entri tafsirBanding, sehingga
    // tafsir, qiraah, dan faedah punya identitas visual yang berbeda.
    var JENIS_META = {
        tafsir: { ikon: '📖', label: 'Tafsir', kelas: 'jenis-tafsir' },
        qiraah: { ikon: '🎙️', label: 'Qira\u2019at', kelas: 'jenis-qiraah' },
        faedah: { ikon: '💡', label: 'Faedah', kelas: 'jenis-faedah' }
    };
    function getJenisMeta(jenis) {
        return JENIS_META[jenis] || { ikon: '📖', label: 'Penjelasan', kelas: 'jenis-tafsir' };
    }

    // Kartu perbandingan tafsir. Indikator titik HANYA dirender kalau ada
    // lebih dari 1 kartu (kalau cuma 1, tidak perlu dot sama sekali).
    function renderBanding(item) {
        if (!item.tafsirBanding || item.tafsirBanding.length === 0) return '';

        var kolom = item.tafsirBanding.map(function(t) {
            var meta = getJenisMeta(t.jenis);
            return (
                '<div class="dd-compare-col ' + meta.kelas + '">' +
                    '<div class="dd-ulama">' +
                        '<span class="dd-avatar">' + meta.ikon + '</span>' +
                        '<div>' +
                            '<div class="dd-nama-ulama">' + escapeHtml(t.ulama) + '</div>' +
                            '<div class="dd-kitab-ulama">' + (t.kitab ? escapeHtml(t.kitab) : meta.label) + '</div>' +
                        '</div>' +
                        '<span class="dd-jenis-badge">' + meta.label + '</span>' +
                    '</div>' +
                    '<div class="dd-konten">' + escapeHtml(t.isi) + '</div>' +
                '</div>'
            );
        }).join('');

        var hintHtml = item.tafsirBanding.length > 1
            ? '<div class="dd-section-label">Geser untuk membandingkan penjelasan tiap ulama →</div>'
            : '<div class="dd-section-label">Penjelasan ulama</div>';

        var dotsHtml = '';
        if (item.tafsirBanding.length > 1) {
            var titik = item.tafsirBanding.map(function(_, i) {
                return '<span class="' + (i === 0 ? 'aktif' : '') + '" data-idx="' + i + '"></span>';
            }).join('');
            dotsHtml = '<div class="dd-indikator" id="ddIndikatorBanding">' + titik + '</div>';
        }

        return (
            hintHtml +
            '<div class="dd-compare-scroll" id="ddCompareScroll">' + kolom + '</div>' +
            dotsHtml
        );
    }

    function renderQiroah(item) {
        if (!item.qiroah || item.qiroah.length === 0) return '';
        var baris = item.qiroah.map(function(q) {
            return (
                '<div class="dd-qiroah-item">' +
                    '<div class="dd-qiroah-head">' +
                        '<span class="dd-imam">' + escapeHtml(q.imam) + '</span>' +
                        '<span class="dd-riwayat">' + escapeHtml(q.riwayat) + '</span>' +
                    '</div>' +
                    '<div class="dd-bacaan">' + escapeHtml(q.bacaan) + '</div>' +
                    '<div class="dd-qiroah-ket">' + escapeHtml(q.keterangan) + '</div>' +
                '</div>'
            );
        }).join('');
        return (
            '<div class="dd-section-label" style="margin-top:1.6rem;">Perbedaan qira\'at (bacaan)</div>' +
            '<div class="dd-qiroah-list">' + baris + '</div>'
        );
    }

    function renderFaedah(item) {
        if (!item.faedah || item.faedah.length === 0) return '';
        var baris = item.faedah.map(function(f) {
            return '<li>' + escapeHtml(f) + '</li>';
        }).join('');
        return (
            '<div class="dd-section-label" style="margin-top:1.6rem;">Faedah</div>' +
            '<div class="dd-faedah-box"><ul class="dd-faedah-list">' + baris + '</ul></div>'
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

    // Sinkronkan dot indikator dengan posisi scroll horizontal kartu tafsir,
    // dan buat dot bisa diklik untuk lompat ke kartu tertentu.
    function bindCompareScrollSync() {
        var scroller = document.getElementById('ddCompareScroll');
        var indikator = document.getElementById('ddIndikatorBanding');
        if (!scroller || !indikator) return;

        var kolom = scroller.querySelectorAll('.dd-compare-col');
        var dots = indikator.querySelectorAll('span');

        function updateActiveDot() {
            var scrollLeft = scroller.scrollLeft;
            var terdekat = 0;
            var jarakTerkecil = Infinity;
            for (var i = 0; i < kolom.length; i++) {
                var jarak = Math.abs(kolom[i].offsetLeft - scroller.offsetLeft - scrollLeft);
                if (jarak < jarakTerkecil) { jarakTerkecil = jarak; terdekat = i; }
            }
            for (var j = 0; j < dots.length; j++) {
                dots[j].classList.toggle('aktif', j === terdekat);
            }
        }

        scroller.addEventListener('scroll', function() {
            window.requestAnimationFrame(updateActiveDot);
        });

        indikator.addEventListener('click', function(e) {
            var dot = e.target.closest('span[data-idx]');
            if (!dot) return;
            var idx = parseInt(dot.getAttribute('data-idx'), 10);
            if (kolom[idx]) {
                scroller.scrollTo({ left: kolom[idx].offsetLeft - scroller.offsetLeft, behavior: 'smooth' });
            }
        });
    }

    function render(item, temaList) {
        var main = document.getElementById('ddMain');
        var adaBanding = item.tafsirBanding && item.tafsirBanding.length > 0;
        var adaQiroah = item.qiroah && item.qiroah.length > 0;
        var adaFaedah = item.faedah && item.faedah.length > 0;
        var adaTakhrij = item.takhrij && item.takhrij.length > 0;

        var html = renderAnchor(item, temaList);
        html += renderBanding(item);
        html += renderQiroah(item);
        html += renderFaedah(item);
        html += renderTakhrij(item);

        if (!adaBanding && !adaQiroah && !adaFaedah && !adaTakhrij) {
            html += '<div class="dd-kosong-hint">📊 Data perbandingan tafsir, qira\'at, faedah, dan takhrij untuk dalil ini belum tersedia.</div>';
        }

        main.innerHTML = html;
        document.title = item.rujukan + ' | FathlyWeb';

        bindCompareScrollSync();
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
