# Panduan Pola "Coming Soon" — FathlyWeb

> Simpan file ini sebagai referensi setiap kali ingin menambahkan tab baru yang belum siap.
> CSS-nya sudah permanen di `menu.css` — tidak perlu tambah CSS baru, cukup copy HTML template di bawah.

---

## Tampilan

- Terpusat secara vertikal & horizontal di area konten
- Ikon besar dengan efek glow emas
- Badge "SEGERA HADIR" dengan border emas transparan
- Judul tab besar
- Deskripsi singkat fitur yang akan datang
- Daftar fitur rencana dalam kartu-kartu kecil (bisa hover)

---

## HTML Template

Salin blok ini ke `index.html`, di dalam `<main class="tab-content" id="tab-NAMATAB">`:

```html
<!-- TAB: NAMA TAB (coming soon) -->
<main class="tab-content" id="tab-NAMATAB">
  <div class="coming-soon-wrap">
    <div class="coming-soon-icon">EMOJI</div>
    <div class="coming-soon-badge">Segera Hadir</div>
    <div class="coming-soon-title">Nama Tab</div>
    <div class="coming-soon-desc">
      Deskripsi singkat tentang tab ini — apa isinya dan manfaatnya bagi pengguna.
    </div>
    <div class="coming-soon-features">
      <div class="csf-item">EMOJI Fitur pertama</div>
      <div class="csf-item">EMOJI Fitur kedua</div>
      <div class="csf-item">EMOJI Fitur ketiga</div>
      <div class="csf-item">EMOJI Dan lainnya...</div>
    </div>
  </div>
</main>
```

---

## Contoh Nyata — Tab Dalil

```html
<main class="tab-content" id="tab-dalil">
  <div class="coming-soon-wrap">
    <div class="coming-soon-icon">📚</div>
    <div class="coming-soon-badge">Segera Hadir</div>
    <div class="coming-soon-title">Dalil</div>
    <div class="coming-soon-desc">
      Referensi dalil dari Al-Qur'an, Hadits Shahih, dan Ijma' Ulama —
      dikelompokkan per tema fiqih dan aqidah, lengkap dengan teks Arab dan terjemahan.
    </div>
    <div class="coming-soon-features">
      <div class="csf-item">📖 Dalil dari Al-Qur'an</div>
      <div class="csf-item">📜 Hadits Shahih pilihan</div>
      <div class="csf-item">🤝 Ijma' Ulama per masalah</div>
      <div class="csf-item">🔎 Cari dalil berdasarkan tema</div>
    </div>
  </div>
</main>
```

---

## Contoh Nyata — Tab Matan

```html
<main class="tab-content" id="tab-matan">
  <div class="coming-soon-wrap">
    <div class="coming-soon-icon">📖</div>
    <div class="coming-soon-badge">Segera Hadir</div>
    <div class="coming-soon-title">Matan</div>
    <div class="coming-soon-desc">
      Kumpulan matan (teks inti) kitab-kitab klasik yang dipelajari dalam halaqah dan pesantren —
      lengkap dengan syakal, terjemahan baris per baris, dan penjelasan ringkas per bait.
    </div>
    <div class="coming-soon-features">
      <div class="csf-item">📝 Matan Ajurumiyah</div>
      <div class="csf-item">📝 Matan Al-Baiquniyah</div>
      <div class="csf-item">📝 Matan Abi Syuja'</div>
      <div class="csf-item">📝 Matan Al-Waraqat</div>
      <div class="csf-item">📝 Matan Al-Arba'in An-Nawawiyah</div>
      <div class="csf-item">📝 Dan lainnya...</div>
    </div>
  </div>
</main>
```

---

## CSS (sudah ada di `menu.css`, tidak perlu diubah)

Kelas yang dipakai:
- `.coming-soon-wrap` — container utama, flex column, centered, max-width 380px
- `.coming-soon-icon` — emoji besar (3.5rem) dengan glow emas
- `.coming-soon-badge` — pill "SEGERA HADIR", border emas transparan, uppercase
- `.coming-soon-title` — judul besar (1.6rem, font-weight 800)
- `.coming-soon-desc` — deskripsi muted, line-height 1.8
- `.coming-soon-features` — container daftar fitur, full width
- `.csf-item` — kartu fitur individual, opacity 0.7 → 1 saat hover

**Warna yang dipakai:** `var(--gold)`, `var(--bg-card)`, `var(--border)`, `var(--text-light)`, `var(--text-muted)` — semua sudah terdefinisi di variabel global.

---

## Checklist saat tambah tab baru sebagai coming soon

- [ ] Tambah `<main class="tab-content" id="tab-NAMATAB">` di `index.html`
- [ ] Tambah tombol di sidebar navigasi (ikuti pola tombol tab lain)
- [ ] Tidak perlu tambah CSS baru
- [ ] Tidak perlu tambah JS baru
- [ ] Saat tab siap dibangun: hapus blok `coming-soon-wrap`, isi dengan konten sesungguhnya
