# RANCANGAN: Arena Bilangan Bulat
**Koleksi media interaktif digital — Matematika SD–SMP (condong SMP)**
Disusun: 2026-10-03 • Status: rancangan, menunggu persetujuan Pak Gun

## 1. Tujuan Pembelajaran (TP)

**TP 1.** Menjelaskan, menyatakan, membandingkan, mengurutkan, dan menentukan
hasil operasi hitung (penjumlahan, pengurangan, perkalian, dan pembagian)
bilangan bulat.

**TP 2.** Menyelesaikan permasalahan keseharian yang melibatkan konsep
bilangan bulat, termasuk berkaitan dengan penguatan literasi finansial.

## 2. Arsitektur Koleksi

- **1 file `index.html`** sebagai portal: halaman pembuka berisi 4 kartu media
  (judul, deskripsi, TP yang dicakup, tombol "Mainkan", dan perolehan bintang).
- Setiap media tinggal di **subfolder** sendiri (`jelajah/`, `urutkan/`,
  `duel/`, `warung/`), masing-masing dengan `index.html` + `css/` + `js/`
  seperti pola Rasio Rush & Kartu Persamaan.
- **100% statis** (HTML/CSS/JS murni, tanpa build, tanpa server) → siap deploy
  ke GitHub Pages via GitHub Actions, dalam **1 repo**.
- Tema visual konsisten (gelap ungu). Progres bintang tiap media disimpan di
  `localStorage` dengan kunci berbeda per media (tidak tabrakan).
- Pola kode dipakai ulang: HUD (nyawa/kombo/skor), timer, efek suara WebAudio,
  sistem level & buka-kunci.

## 3. Media 1 — 🔍 Jelajah Garis Bilangan (Eksplorasi interaktif)

- **Jenis:** media eksplorasi (bukan game bernyawa).
- **TP:** TP 1 — *menjelaskan, menyatakan, membandingkan.*
- **Interaksi:**
  - Garis bilangan interaktif rentang −50…50, bisa digeser/di-zoom.
  - Ketuk sebuah bilangan → kartu info: lawan bilangan, nilai mutlak,
    "lebih dari / kurang dari nol", dan kalimat penjelas
    ("−7 terletak 7 satuan di kiri 0, jadi −7 < 0").
  - **Mode Bandingkan:** dua penanda (A dan B) bisa digeser; sistem menampilkan
    simbol `<`, `>`, `=` yang benar beserta alasan visual (posisi & jarak dari nol).
  - **Mode Latihan Urutan:** 5 bilangan acak → drag untuk mengurutkan → tombol
    Periksa (tanpa timer, fokus pemahaman).
- **Mengapa:** menanamkan intuisi "makna" bilangan bulat sebelum berhitung.

## 4. Media 2 — 🔢 Urutkan Kilat (Game)

- **Jenis:** game susun/drag, mekanik tap-to-place seperti Kartu Persamaan.
- **TP:** TP 1 — *membandingkan, mengurutkan.*
- **Gameplay:**
  - 6 kartu bilangan muncul acak (negatif, positif, dan hasil operasi sederhana
    seperti `−3 × 4` atau `20 ÷ −5` yang harus dihitung dulu).
  - Susun ke 6 slot dari **terkecil ke terbesar**, berpacu dengan waktu.
  - 3 nyawa, timer 60 detik/soal, kombo & skor seperti game sebelumnya.
  - **5 level:** L1: −10…10; L2: −50…50; L3: termasuk hasil operasi;
    L4: −100…100 + pecahan sederhana sebagai pengecoh visual;
    L5 (bos): campuran + waktu 40 detik.
- **Mengapa:** mengurutkan bilangan negatif adalah titik lemah klasik siswa;
  format kilat melatih kefasihan.

## 5. Media 3 — ⚔️ Duel Operasi (Game)

- **Jenis:** game duel vs komputer.
- **TP:** TP 1 — *menentukan hasil operasi hitung* (+, −, ×, ÷ bilangan bulat).
- **Gameplay:**
  - Pemain vs "Bot Hitung". Masing-masing punya HP bar 100.
  - Tiap soal operasi bilangan bulat (termasuk negatif, mis. `−12 ÷ 3`,
    `−5 × −4`): jawab benar → serangan ke bot; salah/waktu habis → diserang.
  - Best-of-3 ronde; tiap ronde 8 soal. Ronde 3: operasi campuran + timer 15 detik.
  - Animasi serangan & efek suara; pilihan ganda 4 opsi.
- **Mengapa:** operasi bilangan negatif butuh banyak latihan; kemasan duel
  membuat drill terasa seperti bermain, bukan mengerjakan soal.

## 6. Media 4 — 🏪 Warung Pintar (Simulasi)

- **Jenis:** simulasi manajemen (bukan kuis cepat).
- **TP:** TP 2 — *permasalahan keseharian bilangan bulat + literasi finansial.*
- **Gameplay (5 "hari" permainan):**
  1. **Belanja stok:** 3 jenis barang (mis. roti, minuman, alat tulis) dengan
     harga kulak berbeda; modal awal Rp150.000.
  2. **Tentukan harga jual** tiap barang (keputusan bermakna: terlalu mahal →
     sedikit pembeli; terlalu murah → untung tipis).
  3. **Simulasi penjualan** harian (acak, dipengaruhi harga).
  4. **Kejadian acak:** ada pelanggan berutang (piutang), barang kedaluwarsa
     (rugi), teman meminjam uang (utang → saldo negatif).
  5. **Laporan harian:** pemasukan, pengeluaran, untung/rugi, saldo, utang.
  - **Bank mini:** sisa uang bisa ditabung dengan bunga 2%/hari (literasi finansial).
  - **Skor akhir:** total aset (saldo + tabungan − utang) → predikat
    ("Juragan Kantin 🏆", "Pedagang Cermat 🙂", dst).
- **Mengapa:** TP 2 menuntut konteks nyata; simulasi membuat untung/rugi/utang
  *dirasakan* sebagai bilangan positif/negatif, bukan sekadar dihitung.

## 7. Peta TP → Media

| TP | Unsur | Media |
|----|-------|-------|
| TP 1 | menjelaskan, menyatakan | 🔍 Jelajah Garis Bilangan |
| TP 1 | membandingkan | 🔍 Jelajah Garis Bilangan, 🔢 Urutkan Kilat |
| TP 1 | mengurutkan | 🔍 Jelajah (latihan), 🔢 Urutkan Kilat |
| TP 1 | hasil operasi hitung | ⚔️ Duel Operasi |
| TP 2 | masalah keseharian + literasi finansial | 🏪 Warung Pintar |

## 8. Usulan Tahap Pembangunan

1. Portal `index.html` (daftar 4 media + bintang progres).
2. 🔍 Jelajah Garis Bilangan.
3. 🔢 Urutkan Kilat.
4. ⚔️ Duel Operasi.
5. 🏪 Warung Pintar (paling kompleks, terakhir).

Urutan bisa diubah sesuai prioritas Pak Gun. Setiap media diuji seperti
sebelumnya (uji logika + simulasi main headless) sebelum diserahkan.

## 9. Catatan

- Semua media berjalan offline dari file statis; bisa dibuka dari HP siswa.
- Teks & angka seluruhnya Bahasa Indonesia.
- Estimasi repo: `pakgun10/gezymuse-arena-bilangan` (nama bisa diganti).
