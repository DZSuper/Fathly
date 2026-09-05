## Integrasi Obsidian (Sumber Catatan Konten)

> Ditambahkan: 22 Agustus 2026. Alur ini menghubungkan vault Obsidian Dani dengan Claude, sebagai persiapan menggantikan sebagian peran Sveltia CMS dalam pengelolaan konten.

### Setup

| Komponen | Detail |
|---|---|
| Vault | `FathlyWeb` |
| Device edit | Tablet |
| Lokasi vault | `[Penyimpanan internal]/Obsidian/FathlyWeb` |
| Mode penyimpanan | **Device storage** (wajib, bukan App storage — agar bisa diakses app lain) |
| App sync | **DriveSync** (Autosync for Google Drive, oleh ttxapps/MetaCtrl) |
| Folder pair | `Obsidian/FathlyWeb` (lokal) ↔ `/DriveSyncFiles` (Google Drive) |
| Mode sync | Dua-arah, sinkronisasi otomatis aktif |
| Dikecualikan dari sync | `.trash`, `.obsidian` (file tersembunyi) |
| Koneksi ke Claude | Konektor **Google Drive** (bukan plugin Obsidian Local REST API — plugin tsb tidak didukung di Android/tablet, hanya jalan di Obsidian desktop) |

### Alur kerja

```
Obsidian (edit, tablet) → DriveSync (auto-sync dua arah) → Google Drive (/DriveSyncFiles) → Claude (baca via konektor Drive)
```

Setelah baca, Claude menyusun ulang konten jadi JSON sesuai skema modul terkait, lalu file hasil diberikan ke Dani untuk diunggah manual ke GitHub (sesuai kebiasaan: semua write ke GitHub dilakukan manual oleh Dani, bukan otomatis oleh Claude).

### Catatan bila pindah device

1. Buat vault baru dengan opsi **Device storage** (bukan App storage), atau vault lama tidak akan bisa diakses app lain.
2. Install & setup ulang **DriveSync**, arahkan folder pair ke lokasi vault yang sama (`/DriveSyncFiles` di Drive).
3. Jika device baru berbasis desktop (bukan Android/tablet), plugin **Obsidian Local REST API** + MCP bisa jadi alternatif langsung, tanpa perlu DriveSync.

### Status

- [x] Vault dibuat & disinkronkan ke Google Drive
- [x] Konektor Google Drive terhubung, Claude berhasil membaca isi vault
- [ ] Skema/aturan konversi Markdown (Obsidian) → JSON (per modul) — belum dirancang, menyusul
- [ ] Rencana: struktur materi (mis. Tauhid) akan dirombak dari pola `kelompok[]` (perbandingan antar aliran) menjadi struktur lebih luas: definisi, pembagian, syarat, keyakinan antar kelompok, dll — mengikuti gaya natural catatan di Obsidian
