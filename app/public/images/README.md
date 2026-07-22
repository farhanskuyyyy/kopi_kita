# Public Images

Drop image files here. Everything in `app/public/` is served as-is at the site root — this folder maps to the public URL path **`/images/...`**.

## Cara pakai

1. Taruh file di sini, contoh: `app/public/images/latte.jpg`
2. Akses public: `https://<your-domain>/images/latte.jpg`
3. Referensi di kode / data:
   - Di JSX: `<img src="/images/latte.jpg" />`
   - Di mock seed data (`app/src/mocks/db.ts`): ganti URL `https://picsum.photos/...` jadi `/images/latte.jpg`

> Pakai path absolut `/images/...` (diawali slash), **jangan** relatif — biar bener di semua route.

## Ganti gambar produk (mock) ke lokal

Seed sekarang pakai `https://picsum.photos/seed/...`. Buat ganti ke gambar sendiri:
- Edit `app/src/mocks/db.ts`, cari field `imageUrl` / image di tiap produk, ganti ke `/images/<nama-file>.jpg`.
- Naming saran: `espresso-singolo.jpg`, `cappuccino.jpg`, dst — biar gampang di-map.

## CSP (penting)

`vercel.json` + `nginx.conf` punya `Content-Security-Policy` dengan `img-src 'self' data: https://picsum.photos`.
- Gambar **lokal** (`/images/...`) = same-origin → udah ke-cover `'self'`. Aman, ga perlu ubah apa-apa.
- Kalau nanti pakai **host eksternal** lain (bukan picsum), tambahin domainnya ke `img-src` di `app/vercel.json`.
- Kalau udah **ga pakai picsum** sama sekali, boleh hapus `https://picsum.photos` dari `img-src`.

## Format & ukuran saran

- Format: `.webp` (paling kecil) / `.jpg` untuk foto, `.png`/`.svg` untuk logo/ikon.
- Foto produk: ~800×800px cukup buat kartu + detail.
- Nama file: huruf kecil, tanpa spasi (pakai `-`), contoh `kopi-susu-gula-aren.webp`.
