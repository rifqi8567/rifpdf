# Python Office Conversion Service

## Target

Service ini menggantikan jalur Gotenberg langsung dari Node untuk konversi:

- `DOCX -> PDF`
- `XLSX -> PDF`
- `PPTX -> PDF`

Engine utama adalah Python + LibreOffice headless. Node.js hanya menjadi API gateway/auth layer dan tidak menjalankan rendering Office.

## Arsitektur

```
Browser
  -> Nginx /api
  -> Node API requireAuth
  -> Python conversion-api /v1/conversions/sync
  -> LibreOffice conversion-worker via Redis queue for async jobs
  -> PDF response/download
```

Container:

- `documind-api`: Express API, auth, proxy upload Office.
- `documind-conversion-api`: FastAPI untuk upload, status, download, cleanup.
- `documind-conversion-worker`: RQ worker yang menjalankan LibreOffice headless.
- `documind-redis`: queue Redis DB 1 untuk conversion jobs.
- `conversion_data`: shared Docker volume untuk upload sementara, output PDF, metadata job.

## Struktur Folder

```
conversion-service/
  Dockerfile
  requirements.txt
  worker.py
  app/
    main.py          # FastAPI endpoints
    converter.py     # LibreOffice command, timeout, validation
    settings.py      # env config
    storage.py       # metadata job JSON
```

## Endpoint

Python service:

- `GET /health`
- `POST /v1/conversions`
  - async upload, return `job_id`.
- `GET /v1/conversions/{job_id}`
  - status dan `download_url` saat completed.
- `GET /v1/conversions/{job_id}/download`
  - download PDF.
- `POST /v1/conversions/sync`
  - upload dan tunggu PDF, dipakai Node route saat ini.
- `POST /admin/cleanup`
  - hapus file lebih tua dari retention.

Node API:

- `POST /api/convert/office-to-pdf`
- `POST /api/convert/word-to-pdf`

Keduanya menerima `multipart/form-data` field `file`. Alias `word-to-pdf` dipertahankan agar frontend lama tidak rusak.

## Conversion Command

Worker menjalankan LibreOffice dengan profil terisolasi per job:

```bash
soffice --headless --invisible --nodefault --nofirststartwizard --nolockcheck --norestore \
  -env:UserInstallation=file:///data/conversions/tmp/<job>/lo-profile \
  --convert-to pdf:writer_pdf_Export \
  --outdir /data/conversions/tmp/<job>/out \
  /data/conversions/uploads/<job>.<ext>
```

Proteksi yang sudah diterapkan:

- allowlist extension hanya `docx`, `xlsx`, `pptx`.
- validasi OOXML via ZIP container sebelum render.
- upload streaming 1 MB chunk, limit default 50 MB.
- timeout LibreOffice default 120 detik.
- temp profile per job untuk menghindari lock/corrupt user profile.
- output dipindah ke `outputs/<job_id>.pdf`.
- temp workdir dihapus setelah conversion sukses.

## VPS 2GB Strategy

Konfigurasi default di `docker-compose.yml`:

- Node API: `300m`.
- Node worker AI/PDF parsing: `400m`.
- Redis: `150m`.
- Conversion API: `180m`.
- Conversion worker: `700m`.
- Nginx: `100m`.

Aturan production:

- Jangan naikkan worker conversion lebih dari 1 replica pada VPS 2GB.
- Jangan jalankan conversion LibreOffice di Node worker.
- Batasi upload Office ke 50 MB sampai ada benchmark real user.
- Gunakan timeout 120 detik untuk file normal; naikkan ke 180 detik hanya jika dokumen PPTX besar sering valid tapi lambat.
- Jika Ollama aktif di host yang sama, jangan proses embedding besar bersamaan dengan conversion batch.

## Font Fidelity

Docker image memasang:

- `fonts-dejavu`
- `fonts-liberation`
- `fonts-noto-core`
- `fonts-noto-cjk`
- `fonts-noto-color-emoji`

Untuk dokumen bisnis Indonesia/Office umum, Liberation membantu substitusi Arial/Times/Calibri-like. Untuk fidelity enterprise, mount font perusahaan:

```yaml
volumes:
  - ./fonts:/usr/local/share/fonts/custom:ro
```

Lalu rebuild image atau jalankan `fc-cache -f` saat startup. Font Microsoft proprietary tidak boleh diasumsikan tersedia di Ubuntu; kalau layout harus identik dengan Windows Office, lisensi dan instal font harus disiapkan eksplisit.

## Error Handling

Kategori error:

- `415`: ekstensi bukan `docx/xlsx/pptx`.
- `413`: file melebihi limit.
- `400`: file rusak atau bukan OOXML ZIP valid.
- `409`: download diminta saat job belum completed.
- `410`: output sudah dibersihkan cleanup.
- `422`: LibreOffice gagal render atau timeout.
- `500`: error gateway Node/Python yang tidak terklasifikasi.

Metadata job disimpan di `conversion_data/jobs/<job_id>.json` dengan `status`, `error`, `duration_ms`, dan `output_path`.

## Queue Strategy

Mode async tersedia di Python API melalui `POST /v1/conversions`. RQ memakai Redis DB 1 dan worker tunggal. Untuk integrasi frontend jangka panjang:

1. Node menerima upload dan auth.
2. Node forward ke `POST /v1/conversions`.
3. Node return `job_id`.
4. Frontend polling `/api/convert/jobs/:jobId`.
5. Download setelah status completed.

Route sync saat ini tetap disediakan untuk kompatibilitas dan UX sederhana, tetapi async lebih aman untuk file besar.

## Deployment

Build dan jalankan:

```bash
docker compose build conversion-api conversion-worker api
docker compose up -d
docker compose ps
```

Health check:

```bash
docker compose exec conversion-api python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read())"
docker compose logs --tail=100 conversion-worker
```

Smoke test dari host:

```bash
curl -f -H "Authorization: Bearer <token>" \
  -F "file=@sample.docx" \
  http://localhost/api/convert/office-to-pdf \
  -o sample.pdf
```

## Validation Checklist

- DOCX dengan tabel, header/footer, image, dan font berbeda.
- PPTX dengan shape, chart, image besar, dan slide 16:9.
- XLSX multi-sheet dengan print area dan orientasi landscape.
- File corrupt yang berekstensi `.docx` tapi bukan ZIP.
- Upload lebih dari `CONVERSION_MAX_UPLOAD_MB`.
- Dua request conversion bersamaan; worker harus memproses serial.
- Pantau `docker stats` saat conversion PPTX besar.
- Bandingkan PDF output terhadap LibreOffice desktop versi sama bila ada mismatch.

## Bottleneck yang Perlu Dipantau

- LibreOffice cold start: normal di container low-resource.
- PPTX dengan banyak gambar: RAM worker bisa menyentuh ratusan MB.
- XLSX tanpa print area: hasil PDF mengikuti interpretasi LibreOffice, bukan Excel Windows.
- Missing fonts: penyebab utama layout berubah.
- Embedded OLE/ActiveX/macro: tidak dijamin render identik di Linux headless.

## Rollout Plan

1. Deploy service baru dengan worker 1 replica.
2. Test internal 20 file nyata user.
3. Catat durasi, output size, dan peak RAM.
4. Turunkan `CONVERSION_MAX_UPLOAD_MB` jika OOM muncul.
5. Aktifkan route frontend ke `/api/convert/office-to-pdf`.
6. Setelah stabil, tambahkan route async di Node untuk job polling.
