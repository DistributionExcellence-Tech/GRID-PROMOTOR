# Panduan Deployment & Cara Live Web - GRID Promoter

Aplikasi **GRID Promoter** dibangun dengan arsitektur modern full-stack menggunakan **Node.js / Express**, **TypeScript**, dan **React + Vite + Tailwind CSS**, terintegrasi dengan database file berbasis folder di `/database/folders/`.

---

## 1. Akses Live Langsung Saat Ini (Google Cloud Run)

Aplikasi ini sudah aktif dan dapat langsung diakses melalui URL:

- **Preview / Production URL**:
  `https://ais-pre-ksh7zq5hqrtjxps4smwgjd-608673839885.asia-east1.run.app`
- **Development URL**:
  `https://ais-dev-ksh7zq5hqrtjxps4smwgjd-608673839885.asia-east1.run.app`

Tautan di atas sudah dilengkapi enkripsi HTTPS/SSL otomatis dari Google Cloud.

---

## 2. Deploy 1-Klik Resmi via Google AI Studio

Untuk mempublikasikan versi terbaru secara permanen di Cloud Run:

1. Buka halaman antarmuka **Google AI Studio Build**.
2. Di pojok kanan atas, klik tombol **"Deploy"** atau **"Share"**.
3. Pilih opsi deploy ke **Cloud Run**.
4. Sistem akan secara otomatis:
   - Menjalankan `npm run build`
   - Membundel backend Express ke `dist/server.cjs` menggunakan `esbuild`
   - Men-generate static assets frontend Vite ke `dist/`
   - Meluncurkan container Cloud Run yang siap melayani jutaan request.

---

## 3. Ekspor Source Code ke GitHub atau Unduh ZIP

Jika Anda ingin mengelola source code di Git atau komputer lokal:

1. Klik menu **Settings** (ikon roda gigi) di pojok kanan atas AI Studio.
2. Pilih:
   - **"Export to GitHub"**: Menghubungkan langsung ke repository GitHub Anda.
   - **"Export to ZIP"**: Mengunduh seluruh source code ke komputer Anda.

---

## 4. Hosting Mandiri (Self-Hosted / VPS / Cloud Server)

Aplikasi ini dapat dijalankan di server VPS apa pun (Ubuntu, Debian, CentOS, AWS EC2, DigitalOcean, Hetzner) atau platform PaaS seperti **Railway**, **Render**, atau **Fly.io**.

### Langkah-langkah:

```bash
# 1. Masuk ke direktori aplikasi
cd react-example

# 2. Pasang dependensi
npm install

# 3. Build bundle frontend dan backend
npm run build

# 4. Jalankan server production
npm start
```

Server akan otomatis berjalan di host `0.0.0.0` dan port `3000`.

### Menggunakan PM2 (Process Manager di VPS):

```bash
# Pasang PM2 global
npm install -g pm2

# Jalankan server di background dengan auto-restart
pm2 start dist/server.cjs --name "grid-promoter"

# Simpan konfigurasi restart otomatis saat server reboot
pm2 startup
pm2 save
```

---

## 5. Menjalankan Menggunakan Docker

Tersedia `Dockerfile` siap pakai. Anda dapat membangun dan menjalankan kontainer dengan perintah:

```bash
# Build image Docker
docker build -t grid-promoter .

# Jalankan kontainer pada port 3000
docker run -d -p 3000:3000 --name grid-promoter-app grid-promoter
```

---

## 6. Akun Pengguna / Demo Login

| Role | Username | Hak Akses |
|---|---|---|
| **Super Admin** | `admin` | Akses penuh CMS, Manajemen Folder, Tambah/Edit/Hapus Grid & BTS |
| **Regional Manager** | `balinusra` | Akses Wilayah Regional Bali Nusra |
| **City Specialist** | `bangkalan` | Akses Wilayah Kab. Bangkalan |
| **Sales Promoter** | `promoter` | Akses Read-only operasional promoter |
