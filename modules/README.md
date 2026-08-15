# Pendahuluan

Ini adalah file untuk menyimpan beberapa informasi tentang website FathlyWeb.

---

## Akun Claude

| No | Email | Peran |
|----|-------|-------|
| 1 | danisuryaanugrah12345@gmail.com | Fitur |
| 2 | danisuryaanugrah123456789@gmail.com | Fitur |
| 3 | dzsuper123456789@gmail.com | Konten |
| 4 | santriprogrammer2023@gmail.com | CMS |
| 5 | article.writter123@gmail.com | E-book panduan |
| 6 | article.writter12345@gmail.com | — |
| 7 | tholibdesign@gmail.com | CMS |

---

## Peraturan Update Website

> Aturan-aturan ini ditujukan kepada Claude yang akan terus-menerus update website FathlyWeb.

### A. Fitur

1. UI & UX sangat diharapkan maksimal untuk para pengguna
2. Jangan ada tombol, pencarian, link, dll yang tidak berguna atau tidak efisien
3. Harus sangat memperhatikan kebutuhan pengguna dalam memakai website
4. Struktur modul wajib mengikuti pola `content/{modul}/{data,pages,supports}` — semua modul (dalil, doa, matan, materi, ceramah, kutipan) konsisten memisahkan data mentah, halaman render, dan pendukung. Modul baru wajib ikut pola ini.
5. Konvensi ID per modul harus tetap dipertahankan: prefix pendek + nomor urut (`d1`, `d2`... untuk dalil; `c001`... untuk ceramah; `ds01`... untuk dzikir sholat). Jangan ganti pola ID di tengah jalan tanpa migrasi data.
6. CMS (Sveltia) wajib sinkron 1:1 dengan skema JSON aktual. Setiap perubahan skema JSON harus diikuti update `admin/config.yml` di commit yang sama.
7. Fitur baru wajib defensif terhadap array/objek kosong (`tafsirBanding`, `takhrij`, `subBab` legal berisi `[]`) — UI harus menangani kondisi kosong dengan baik.

### B. Konten

1. Website ini adalah website islami dengan konsep harga mati terhadap pemahaman para salaf
2. Tidak boleh ada ceramah, penjelasan dalil, kutipan yang bertentangan dengan pemahaman salafus sholeh
3. Tidak boleh ada doa-doa atau dzikir yang bersumber dari hadits-hadits dhoif
4. Tidak boleh ada kutipan dari ulama-ulama NU, Sufi, Syiah, Hizbut Tahrir, Ikhwanul Muslimin dan kelompok-kelompok menyimpang lainnya
5. Wajib menyertakan sumber rujukan (minimal kitab) pada setiap kutipan
6. Standar sitasi `dalil.json` (kitab + nomor + grade) harus jadi baseline untuk semua modul, termasuk ceramah dan matan — bukan hanya teks bebas seperti "(HR. Tirmidzi)" tanpa nomor hadits maupun grade.
7. Ayat/hadits dalam matan yang memakai macro `[[ayat:...]]` / `[[hadits:...]]` harus tetap disertai rujukan eksplisit di `keterangan` (pola yang sudah dipakai di `qawaidul-arba.json`).
8. Field `kitab: null` untuk ayat Al-Qur'an dan `kitab: "<Nama>"` untuk hadits harus konsisten di seluruh modul.
9. Setiap penambahan tafsir/faedah wajib mencantumkan nama ulama + judul kitab rujukan, sesuai pola `tafsirBanding`. Larang menulis "menurut sebagian ulama" tanpa nama & kitab spesifik.
10. Tema/kategori (`temaId`, `pembahasan`) harus dari daftar terkontrol (controlled vocabulary), bukan teks bebas.

### C. Style

1. Website ini dikembangkan menggunakan tablet (device layar lebar) tapi hendaknya lebih mengutamakan penggunaan HP (device layar kecil) karena banyaknya pengguna yang akan memakai HP (Mobile First)
2. Gaya website lebih mengedepankan kenyamanan mata sehingga defaultnya ber-tema gelap
3. Tema gelap default (`#0b0c0e`) dan seluruh warna UI wajib pakai token warna terpusat, bukan hardcode hex di banyak file.
4. Setiap fitur baru wajib diuji dulu di lebar layar HP sebelum ke tablet.
5. PWA harus tetap terjaga (manifest.json, sw.js, favicon, og-image) — setiap penambahan halaman/rute baru wajib dicek dampaknya ke service worker caching.

### D. Data & CMS

> Kategori baru — hampir semua isu di bagian *Masalah* sebenarnya soal ketidaksinkronan skema data JSON vs skema CMS, sehingga dikelompokkan eksplisit di sini agar tidak jadi bug berulang di tiap akun Claude yang mengerjakan.

1. Setiap perubahan skema data JSON wajib diikuti update `admin/config.yml` pada commit yang sama (lihat A-6).
2. Field opsional di data harus opsional juga di CMS, dan sebaliknya — jangan ada field wajib di CMS yang sebenarnya tidak wajib di data.
3. Standar sitasi (kitab, nomor, grade) wajib konsisten lintas modul (lihat B-6 s/d B-8), termasuk representasinya di form CMS.
4. Daftar tema/kategori terkontrol (lihat B-10) wajib direpresentasikan sebagai pilihan dropdown/relation di CMS, bukan input teks bebas, supaya tidak terjadi duplikasi tema.

---

## Masalah

- [x] Jadikan tema dalil semua tentang sholat menjadi 1 tema saja (tidak terpisah-pisah) *(dikerjakan di akun-3)*
- [ ] CMS sangat banyak masalah saat ingin digunakan terutama pada bagian dalil, sebagian wajib diisi seperti nama kitab di bagian faedah padahal tidak perlu, dll
- [ ] Sveltia CMS tidak bisa digunakan di browser bawaan Huawei karena tidak update
- [ ] E-book FathlyWeb belum selesai dikerjakan
- [ ] Claude app mengizinkan akses GitHub untuk update otomatis
- [x] Update tampilan mobile pada bagian matan detail belum selesai *(dikerjakan di akun-1)*
- [x] Angka/nomor bait pada matan ditampilan CMS Sveltia belum selesai *(dikerjakan di akun-4)*
- [x] WordPress CMS *(dikerjakan di akun-7)* — **{Batal}**

---

## Workflow

> Di sini ditulis apa yang akan diupdate ke depannya untuk website FathlyWeb ini.
