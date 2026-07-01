// =============================================
// LOADER KONTEN DARI JSON (Decap CMS)
// =============================================
(function() {
  var kontenKey = document.body.getAttribute('data-konten');
  if (!kontenKey) return; // Halaman tanpa JSON (misal coming.html)

  function renderKelompok(data) {
    var kelompok = data.kelompok || [];

    // Update judul halaman
    var temaTitle = document.querySelector('.tema-title');
    if (temaTitle && data.judul) temaTitle.textContent = data.judul;

    // Update title tag
    document.title = data.judul + ' | Aqidah Salafiyah';

    // Render kelompok buttons & content untuk page1 dan page2
    [1, 2].forEach(function(pageNum) {
      var page = document.getElementById('page' + pageNum);
      if (!page) return;

      // Render sidebar buttons
      var btnContainer = page.querySelector('.kelompok-buttons');
      var dropdown     = page.querySelector('.kelompok-dropdown');
      var content      = page.querySelector('.penjelasan-content');

      if (!btnContainer || !content) return;

      btnContainer.innerHTML = '';
      if (dropdown) dropdown.innerHTML = '';
      content.innerHTML = '';

      kelompok.forEach(function(k, i) {
        // Button
        var btn = document.createElement('button');
        btn.className = 'kelompok-btn' + (i === 0 ? ' active' : '');
        btn.setAttribute('data-kelompok', k.id);
        btn.setAttribute('data-page', pageNum);
        btn.textContent = k.nama;
        btnContainer.appendChild(btn);

        // Dropdown option
        if (dropdown) {
          var opt = document.createElement('option');
          opt.value = k.id;
          opt.textContent = k.nama;
          dropdown.appendChild(opt);
        }

        // Konten (markdown → HTML via marked.js)
        var div = document.createElement('div');
        div.className = 'penjelasan-item' + (i === 0 ? ' active' : '');
        div.setAttribute('data-kelompok', k.id);

        var html = '';
        html += '<h3>' + k.nama + '</h3>';
        if (window.marked) {
          html += marked.parse(k.konten || '');
        } else {
          // Fallback tanpa marked: tampilkan sebagai paragraf biasa
          html += '<p>' + (k.konten || '').replace(/\n/g, '</p><p>') + '</p>';
        }
        div.innerHTML = html;
        content.appendChild(div);
      });
    });
  }

  // Fetch JSON konten
  fetch('../data/' + kontenKey + '.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      renderKelompok(data);
      // Dispatch event supaya materi.js tahu konten sudah siap
      document.dispatchEvent(new Event('kontenLoaded'));
    })
    .catch(function(e) {
      console.warn('[materi.js] Gagal memuat JSON konten:', e);
      document.dispatchEvent(new Event('kontenLoaded'));
    });
})();

// Interaktivitas untuk halaman tema dengan toolbar formatting dan semua fix
document.addEventListener('DOMContentLoaded', function() {
  var kontenKey = document.body.getAttribute('data-konten');
  if (kontenKey) {
    // Tunggu konten JSON selesai di-render baru init
    document.addEventListener('kontenLoaded', initTema);
  } else {
    initTema();
  }
});

function initTema() {
  
  // ===================================
  // AMBIL ELEMEN-ELEMEN
  // ===================================
  const pageButtons = document.querySelectorAll('.page-btn');
  const pageContainers = document.querySelectorAll('.page-container');
  const defaultBtn = document.getElementById('defaultBtn');
  const editBtn = document.getElementById('editBtn');
  const catatanContent = document.getElementById('catatanContent');
  const catatanModeBtn = document.getElementById('catatanModeBtn');
  const formatToolbar = document.getElementById('formatToolbar');
  
  // Dapatkan nama halaman untuk key localStorage yang unik
  const pageName = document.title.split('|')[0].trim();
  const storageKeyEditing = `aqidah_editing_${pageName.toLowerCase().replace(/\s+/g, '_')}`;
  const storageKeyCatatan = `aqidah_catatan_${pageName.toLowerCase().replace(/\s+/g, '_')}`;
  const storageKeyFormat = `aqidah_format_${pageName.toLowerCase().replace(/\s+/g, '_')}`;
  
  // State management
  let currentPage = 1;
  let isEditing = false;
  let isCatatanEditMode = false;
  let currentKelompok = {1: 'ahlussunnah', 2: 'ahlussunnah'};
  let lastFormatSettings = {
    color: '#b8b8b8',
    size: '4',
    bold: false,
    italic: false,
    underline: false
  };
  
  // ===================================
  // BUAT INDIKATOR TERSIMPAN
  // ===================================
  const saveIndicator = document.createElement('div');
  saveIndicator.className = 'save-indicator';
  saveIndicator.textContent = '✓ Tersimpan';
  document.body.appendChild(saveIndicator);
  
  function showSaveIndicator() {
    saveIndicator.classList.add('show');
    setTimeout(() => {
      saveIndicator.classList.remove('show');
    }, 2000);
  }
  
  // ===================================
  // SIMPAN KONTEN ORIGINAL
  // ===================================
  const originalContent = {};
  document.querySelectorAll('#page2 .penjelasan-item').forEach(item => {
    const kelompok = item.getAttribute('data-kelompok');
    originalContent[kelompok] = item.innerHTML;
  });
  
  // ===================================
  // FUNGSI: Load & Save localStorage
  // ===================================
  function loadFromStorage() {
    const savedEditing = localStorage.getItem(storageKeyEditing);
    if (savedEditing) {
      try {
        const data = JSON.parse(savedEditing);
        document.querySelectorAll('#page2 .penjelasan-item').forEach(item => {
          const kelompok = item.getAttribute('data-kelompok');
          if (data[kelompok]) {
            item.innerHTML = data[kelompok];
          }
        });
      } catch (e) {
        console.error('Error loading editing content:', e);
      }
    }
    
    const savedCatatan = localStorage.getItem(storageKeyCatatan);
    if (savedCatatan && catatanContent) {
      catatanContent.innerHTML = savedCatatan;
    }
    
    // Load format settings
    const savedFormat = localStorage.getItem(storageKeyFormat);
    if (savedFormat) {
      try {
        lastFormatSettings = JSON.parse(savedFormat);
      } catch (e) {
        console.error('Error loading format settings:', e);
      }
    }
  }
  
  function saveEditingToStorage() {
    const data = {};
    document.querySelectorAll('#page2 .penjelasan-item').forEach(item => {
      const kelompok = item.getAttribute('data-kelompok');
      data[kelompok] = item.innerHTML;
    });
    localStorage.setItem(storageKeyEditing, JSON.stringify(data));
    // HANYA tampilkan indikator saat keluar dari edit mode
  }
  
  function saveCatatanToStorage() {
    if (catatanContent) {
      localStorage.setItem(storageKeyCatatan, catatanContent.innerHTML);
    }
  }
  
  function saveFormatSettings() {
    localStorage.setItem(storageKeyFormat, JSON.stringify(lastFormatSettings));
  }
  
  // ===================================
  // FUNGSI: Reset ke default
  // ===================================
  function resetToDefault() {
    if (confirm('Apakah Anda yakin ingin mengembalikan semua penjelasan ke kondisi awal? Semua perubahan yang Anda buat akan hilang.')) {
      document.querySelectorAll('#page2 .penjelasan-item').forEach(item => {
        const kelompok = item.getAttribute('data-kelompok');
        item.innerHTML = originalContent[kelompok];
        item.contentEditable = false;
      });
      localStorage.removeItem(storageKeyEditing);
      isEditing = false;
      editBtn.textContent = 'EDIT';
      editBtn.classList.remove('editing');
      alert('Semua penjelasan telah dikembalikan ke kondisi awal!');
    }
  }
  
  // ===================================
  // FUNGSI: Toggle Edit Mode (Halaman 2)
  // ===================================
  function toggleEditMode() {
    isEditing = !isEditing;
    
    if (isEditing) {
      editBtn.textContent = 'SAVE';
      editBtn.classList.add('editing');
      const activeItem = document.querySelector('#page2 .penjelasan-item.active');
      if (activeItem) {
        activeItem.contentEditable = true;
        activeItem.focus();
      }
    } else {
      editBtn.textContent = 'EDIT';
      editBtn.classList.remove('editing');
      document.querySelectorAll('#page2 .penjelasan-item').forEach(item => {
        item.contentEditable = false;
      });
      saveEditingToStorage();
      showSaveIndicator(); // Tampilkan saat keluar dari edit mode
    }
  }
  
  // ===================================
  // FUNGSI: Apply Default Format
  // ===================================
  function applyDefaultFormat() {
    // Apply default: Abu, size 16, no bold/italic/underline
    applyFormat('foreColor', lastFormatSettings.color);
    applyFormat('fontSize', lastFormatSettings.size);
    
    // Remove bold/italic/underline if previously set
    if (lastFormatSettings.bold) applyFormat('bold');
    if (lastFormatSettings.italic) applyFormat('italic');
    if (lastFormatSettings.underline) applyFormat('underline');
  }
  
  // ===================================
  // FUNGSI: Toggle Mode Catatan (Halaman 3)
  // ===================================
  function toggleCatatanMode() {
    if (!catatanModeBtn || !catatanContent) return;
    
    isCatatanEditMode = !isCatatanEditMode;
    
    if (isCatatanEditMode) {
      catatanModeBtn.textContent = 'MODE: EDIT';
      catatanModeBtn.classList.add('active');
      catatanContent.contentEditable = true;
      formatToolbar.classList.add('show');
      catatanContent.focus();
      
      // Apply format terakhir atau default
      setTimeout(() => {
        applyDefaultFormat();
        updateToolbarState();
      }, 100);
    } else {
      catatanModeBtn.textContent = 'MODE: BACA';
      catatanModeBtn.classList.remove('active');
      catatanContent.contentEditable = false;
      formatToolbar.classList.remove('show');
      
      // Save format settings
      saveFormatSettings();
      saveCatatanToStorage();
      showSaveIndicator(); // Tampilkan saat kembali ke mode baca
    }
  }
  
  // ===================================
  // FUNGSI: Apply Format
  // ===================================
  function applyFormat(command, value = null) {
    if (!isCatatanEditMode) return;
    
    document.execCommand(command, false, value);
    catatanContent.focus();
    
    // Update lastFormatSettings
    if (command === 'foreColor') {
      lastFormatSettings.color = value;
    } else if (command === 'fontSize') {
      lastFormatSettings.size = value;
    } else if (command === 'bold') {
      lastFormatSettings.bold = document.queryCommandState('bold');
    } else if (command === 'italic') {
      lastFormatSettings.italic = document.queryCommandState('italic');
    } else if (command === 'underline') {
      lastFormatSettings.underline = document.queryCommandState('underline');
    }
    
    updateToolbarState();
  }
  
  // ===================================
  // FUNGSI: Update Toolbar State
  // ===================================
  function updateToolbarState() {
    // Update bold, italic, underline buttons
    document.getElementById('boldBtn')?.classList.toggle('active', document.queryCommandState('bold'));
    document.getElementById('italicBtn')?.classList.toggle('active', document.queryCommandState('italic'));
    document.getElementById('underlineBtn')?.classList.toggle('active', document.queryCommandState('underline'));
    
    // Update color buttons
    const currentColor = document.queryCommandValue('foreColor');
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (currentColor) {
      const rgb = currentColor.toLowerCase();
      if (rgb.includes('184, 184, 184') || rgb.includes('b8b8b8')) {
        document.querySelector('.color-btn.gray')?.classList.add('active');
      } else if (rgb.includes('255, 107, 107') || rgb.includes('ff6b6b')) {
        document.querySelector('.color-btn.red')?.classList.add('active');
      } else if (rgb.includes('77, 171, 247') || rgb.includes('4dabf7')) {
        document.querySelector('.color-btn.blue')?.classList.add('active');
      } else if (rgb.includes('255, 212, 59') || rgb.includes('ffd43b')) {
        document.querySelector('.color-btn.yellow')?.classList.add('active');
      } else if (rgb.includes('0, 255, 136') || rgb.includes('00ff88')) {
        document.querySelector('.color-btn.green')?.classList.add('active');
      }
    }
  }
  
  // ===================================
  // FUNGSI: Ganti Halaman
  // ===================================
  function gantiHalaman(pageNum) {
    currentPage = pageNum;
    
    // FIX: Auto non-aktifkan mode edit catatan saat keluar dari halaman 3
    if (currentPage !== 3 && isCatatanEditMode) {
      isCatatanEditMode = false;
      catatanModeBtn.textContent = 'MODE: BACA';
      catatanModeBtn.classList.remove('active');
      catatanContent.contentEditable = false;
      formatToolbar.classList.remove('show'); // FIX: Toolbar hilang otomatis
      saveFormatSettings();
      saveCatatanToStorage();
    }
    
    pageContainers.forEach(container => {
      container.classList.remove('active');
    });
    document.getElementById(`page${pageNum}`).classList.add('active');
    
    pageButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`.page-btn[data-page="${pageNum}"]`).classList.add('active');
    
    if (pageNum === 2) {
      defaultBtn.style.display = 'inline-block';
    } else {
      defaultBtn.style.display = 'none';
    }
    
    if (pageNum !== 2 && isEditing) {
      isEditing = false;
      editBtn.textContent = 'EDIT';
      editBtn.classList.remove('editing');
      document.querySelectorAll('#page2 .penjelasan-item').forEach(item => {
        item.contentEditable = false;
      });
    }
  }
  
  // ===================================
  // FUNGSI: Ganti Penjelasan
  // ===================================
  function gantiPenjelasan(kelompok, pageNum) {
    currentKelompok[pageNum] = kelompok;
    
    const container = document.getElementById(`page${pageNum}`);
    const items = container.querySelectorAll('.penjelasan-item');
    const buttons = container.querySelectorAll('.kelompok-btn');
    const dropdown = container.querySelector('.kelompok-dropdown');
    
    items.forEach(item => {
      item.classList.remove('active');
      item.contentEditable = false;
    });
    
    buttons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeItem = container.querySelector(`.penjelasan-item[data-kelompok="${kelompok}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
      if (pageNum === 2 && isEditing) {
        activeItem.contentEditable = true;
      }
    }
    
    const activeButton = container.querySelector(`.kelompok-btn[data-kelompok="${kelompok}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
    
    if (dropdown) {
      dropdown.value = kelompok;
    }
    
    if (window.innerWidth <= 768) {
      const penjelasanSection = container.querySelector('.penjelasan-section');
      if (penjelasanSection) {
        penjelasanSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
  
  // ===================================
  // EVENT LISTENERS
  // ===================================
  pageButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const pageNum = parseInt(this.getAttribute('data-page'));
      gantiHalaman(pageNum);
    });
  });
  
  document.querySelectorAll('.kelompok-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const kelompok = this.getAttribute('data-kelompok');
      const pageNum = parseInt(this.getAttribute('data-page'));
      gantiPenjelasan(kelompok, pageNum);
    });
  });
  
  document.querySelectorAll('.kelompok-dropdown').forEach(dropdown => {
    dropdown.addEventListener('change', function() {
      const kelompok = this.value;
      const pageNum = parseInt(this.id.replace('kelompokSelect', ''));
      gantiPenjelasan(kelompok, pageNum);
    });
  });
  
  if (editBtn) {
    editBtn.addEventListener('click', toggleEditMode);
  }
  
  if (defaultBtn) {
    defaultBtn.addEventListener('click', resetToDefault);
  }
  
  if (catatanModeBtn) {
    catatanModeBtn.addEventListener('click', toggleCatatanMode);
  }
  
  // ===================================
  // FORMAT TOOLBAR BUTTONS
  // ===================================
  
  // Bold
  const boldBtn = document.getElementById('boldBtn');
  if (boldBtn) {
    boldBtn.addEventListener('click', () => applyFormat('bold'));
  }
  
  // Italic
  const italicBtn = document.getElementById('italicBtn');
  if (italicBtn) {
    italicBtn.addEventListener('click', () => applyFormat('italic'));
  }
  
  // Underline
  const underlineBtn = document.getElementById('underlineBtn');
  if (underlineBtn) {
    underlineBtn.addEventListener('click', () => applyFormat('underline'));
  }
  
  // Color Buttons
  const colorButtons = {
    'colorGray': '#b8b8b8',
    'colorRed': '#ff6b6b',
    'colorBlue': '#4dabf7',
    'colorYellow': '#ffd43b',
    'colorGreen': '#00ff88'
  };
  
  Object.keys(colorButtons).forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', function() {
        applyFormat('foreColor', colorButtons[btnId]);
      });
    }
  });
  
  // Size Buttons
  const sizeButtons = {
    'size1': '1',
    'size2': '3',
    'size3': '4',
    'size4': '5',
    'size5': '7'
  };
  
  Object.keys(sizeButtons).forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', function() {
        applyFormat('fontSize', sizeButtons[btnId]);
      });
    }
  });
  
  // Update toolbar state saat selection berubah
  if (catatanContent) {
    catatanContent.addEventListener('mouseup', updateToolbarState);
    catatanContent.addEventListener('keyup', updateToolbarState);
  }
  
  // ===================================
  // HORIZONTAL SCROLL untuk Toolbar (Desktop dengan Mouse)
  // ===================================
  if (formatToolbar) {
    const toolbarScroll = formatToolbar.querySelector('.toolbar-scroll');
    
    if (toolbarScroll) {
      // Deteksi hover pada toolbar
      formatToolbar.addEventListener('mouseenter', function() {
        // Nonaktifkan scroll halaman sementara
        document.body.style.overflow = 'hidden';
      });
      
      formatToolbar.addEventListener('mouseleave', function() {
        // Aktifkan kembali scroll halaman
        document.body.style.overflow = 'auto';
      });
      
      // Scroll horizontal dengan wheel
      formatToolbar.addEventListener('wheel', function(e) {
        if (Math.abs(e.deltaY) > 0) {
          e.preventDefault();
          toolbarScroll.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }
  }
  
  // AUTO-SAVE untuk Halaman 2 (TANPA INDIKATOR)
  let autoSaveTimeout;
  document.querySelectorAll('#page2 .penjelasan-item').forEach(item => {
    item.addEventListener('input', function() {
      if (isEditing) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
          saveEditingToStorage();
          // TIDAK ADA showSaveIndicator() di sini
        }, 2000);
      }
    });
  });
  
  // AUTO-SAVE untuk Halaman 3 (TANPA INDIKATOR)
  let catatanSaveTimeout;
  if (catatanContent) {
    catatanContent.addEventListener('input', function() {
      if (isCatatanEditMode) {
        clearTimeout(catatanSaveTimeout);
        catatanSaveTimeout = setTimeout(() => {
          saveCatatanToStorage();
          // TIDAK ADA showSaveIndicator() di sini
        }, 2000);
      }
    });
  }
  
  // INISIALISASI
  loadFromStorage();
  gantiHalaman(1);
  
} // end initTema
