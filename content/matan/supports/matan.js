document.addEventListener('DOMContentLoaded', function () {
  var matanData = [
    { id: 'ajurumiyah', judul: 'Al-Ajurumiyah', kategori: 'Nahwu', penulis: 'Ibnu Ajurum', bab: 21, bait: 60 },
    { id: 'arbain', judul: "Al-Arba'in An-Nawawiyah", kategori: 'Hadits', penulis: 'Imam Nawawi', bab: 42, bait: 42 },
    { id: 'waraqat', judul: 'Al-Waraqat', kategori: 'Ushul Fiqh', penulis: 'Al-Juwaini', bab: 12, bait: 80 },
    { id: 'abu-syuja', judul: "Matan Abi Syuja'", kategori: 'Fiqih', penulis: "Abu Syuja'", bab: 17, bait: 129 },
    { id: 'baiquniyah', judul: 'Al-Baiquniyah', kategori: 'Mustholah Hadits', penulis: 'Al-Baiquni', bab: 1, bait: 34 },
    { id: 'usul-tsalasah', judul: 'Al-Ushul Ats-Tsalatsah', kategori: 'Aqidah', penulis: 'Ibnu Abdul Wahhab', bab: 3, bait: 0 }
  ];

  var bookmarkedMatan   = JSON.parse(localStorage.getItem('fw_matan_bookmarks') || '[]');
  var memorizationList  = JSON.parse(localStorage.getItem('fw_matan_hafalan')   || '{}');

  var matanBookmarkGrid = document.getElementById('matanBookmarkGrid');
  var matanProgressList = document.getElementById('matanProgressList');
  var matanListGrid     = document.getElementById('matanListGrid');
  var bookmarkSection   = document.getElementById('matanBookmarkSection');
  var progressSection   = document.getElementById('matanProgressSection');

  function saveBookmarks() {
    localStorage.setItem('fw_matan_bookmarks', JSON.stringify(bookmarkedMatan));
  }

  function saveMemorizationList() {
    localStorage.setItem('fw_matan_hafalan', JSON.stringify(memorizationList));
  }

  function renderBookmarks() {
    matanBookmarkGrid.innerHTML = '';
    if (bookmarkedMatan.length === 0) {
      bookmarkSection.classList.add('hidden');
      return;
    }
    bookmarkSection.classList.remove('hidden');
    bookmarkedMatan.forEach(function (matanId) {
      var matan = matanData.find(function (m) { return m.id === matanId; });
      if (!matan) return;
      var card = document.createElement('div');
      card.className = 'matan-bookmark-card';
      card.innerHTML =
        '<div class="matan-bookmark-card-title">' + matan.judul + '</div>' +
        '<div class="matan-bookmark-card-category">' + matan.kategori + '</div>';
      card.addEventListener('click', function () {
        // TODO: navigate to detail page
      });
      matanBookmarkGrid.appendChild(card);
    });
  }

  function renderMemorizationProgress() {
    matanProgressList.innerHTML = '';
    var ids = Object.keys(memorizationList);
    if (ids.length === 0) {
      progressSection.classList.add('hidden');
      return;
    }
    progressSection.classList.remove('hidden');
    ids.forEach(function (matanId) {
      var matan = matanData.find(function (m) { return m.id === matanId; });
      if (!matan) return;
      var progress   = memorizationList[matanId].progress || 0;
      var total      = matan.bait > 0 ? matan.bait : (matan.bab > 0 ? matan.bab : 1);
      var percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
      var item = document.createElement('div');
      item.className = 'matan-progress-item';
      item.innerHTML =
        '<div class="matan-progress-item-header">' +
          '<div class="matan-progress-item-title">' + matan.judul + '</div>' +
          '<div class="matan-progress-percentage">' + percentage + '%</div>' +
        '</div>' +
        '<div class="matan-progress-bar-wrapper">' +
          '<div class="matan-progress-bar" style="width:' + percentage + '%;"></div>' +
        '</div>';
      item.addEventListener('click', function () {
        // TODO: navigate to detail page
      });
      matanProgressList.appendChild(item);
    });
  }

  function renderMatanList() {
    matanListGrid.innerHTML = '';
    matanData.forEach(function (matan) {
      var isBookmarked     = bookmarkedMatan.indexOf(matan.id) > -1;
      var isInMemorization = memorizationList.hasOwnProperty(matan.id);
      var card = document.createElement('div');
      card.className = 'matan-card';
      card.innerHTML =
        '<div class="matan-card-header">' +
          '<div class="matan-card-title">' + matan.judul + '</div>' +
          '<div class="matan-card-actions">' +
            '<button class="matan-action-btn bookmark-btn' + (isBookmarked ? ' active' : '') + '" data-id="' + matan.id + '" title="Bookmark">' +
              '<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>' +
            '</button>' +
            '<button class="matan-action-btn memorize-btn' + (isInMemorization ? ' active' : '') + '" data-id="' + matan.id + '" title="' + (isInMemorization ? 'Hapus dari Hafalan' : 'Tambah ke Hafalan') + '">' +
              '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="matan-card-details">' +
          '<span>Kategori: ' + matan.kategori + '</span>' +
          '<span>Penulis: ' + matan.penulis + '</span>' +
          '<span>Bab: ' + matan.bab + '</span>' +
          (matan.bait > 0 ? '<span>Bait: ' + matan.bait + '</span>' : '') +
        '</div>';
      matanListGrid.appendChild(card);
    });

    document.querySelectorAll('.bookmark-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var id    = e.currentTarget.getAttribute('data-id');
        var index = bookmarkedMatan.indexOf(id);
        if (index > -1) {
          bookmarkedMatan.splice(index, 1);
        } else {
          bookmarkedMatan.push(id);
        }
        saveBookmarks();
        renderBookmarks();
        renderMatanList();
      });
    });

    document.querySelectorAll('.memorize-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var id = e.currentTarget.getAttribute('data-id');
        if (memorizationList.hasOwnProperty(id)) {
          delete memorizationList[id];
        } else {
          memorizationList[id] = { progress: 0 };
        }
        saveMemorizationList();
        renderMemorizationProgress();
        renderMatanList();
      });
    });
  }

  renderBookmarks();
  renderMemorizationProgress();
  renderMatanList();
});
