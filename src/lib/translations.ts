// src/lib/translations.ts

export type Language = 'en' | 'id';

export const translations = {
  // Navigation & Auth
  nav_tools: { en: 'Tools', id: 'Alat' },
  nav_admin: { en: 'SaaS Admin', id: 'Admin SaaS' },
  nav_signin: { en: 'Sign In', id: 'Masuk' },
  nav_signout: { en: 'Sign Out', id: 'Keluar' },
  nav_changepass: { en: 'Change Password', id: 'Ganti Password' },
  nav_active: { en: 'Active Member', id: 'Anggota Aktif' },
  nav_all: { en: 'All Tools', id: 'Semua Alat' },
  nav_merge: { en: 'Merge PDF', id: 'Gabung PDF' },
  nav_secure: { en: 'Secure PDF', id: 'Amankan PDF' },
  nav_sponsor: { en: 'Support Us (Ads)', id: 'Dukung Kami (Iklan)' },
  nav_back: { en: '← Back to All Utilities', id: '← Kembali ke Semua Utilitas' },

  // Hero & General
  hero_badge: { en: 'Local Typesetting Press Active', id: 'Mesin Cetak Lokal Aktif' },
  hero_title: { en: 'Typeset & Convert Documents', id: 'Tata Letak & Konversi Dokumen' },
  hero_title_italic: { en: 'With Absolute Security', id: 'Dengan Keamanan Mutlak' },
  hero_subtitle: { 
    en: "No system telemetry. No database transfers. No network leakage. Every stream-buffer operation executes strictly inside your browser's local sandbox memory.", 
    id: 'Tanpa telemetri sistem. Tanpa transfer database. Tanpa kebocoran jaringan. Setiap operasi stream-buffer berjalan sepenuhnya di memori sandbox lokal peramban Anda.' 
  },
  
  // Sponsored
  sponsor_badge: { en: 'Sponsored Link', id: 'Link Sponsor' },
  sponsor_desc: { 
    en: 'Support our free sandbox converters by visiting our sponsor site today!', 
    id: 'Dukung konverter sandbox gratis kami dengan mengunjungi situs sponsor hari ini!' 
  },
  sponsor_btn: { en: 'Visit Sponsor', id: 'Kunjungi Sponsor' },

  // Search & Categories
  search_placeholder: { en: 'Search for utilities (e.g. merge, compress)...', id: 'Cari utilitas (contoh: merge, compress)...' },
  cat_all: { en: 'All Utilities', id: 'Semua Utilitas' },
  cat_pdf: { en: 'PDF Utilities', id: 'Alat PDF' },
  cat_image: { en: 'Image Tools', id: 'Alat Gambar' },
  cat_security: { en: 'Security & Lock', id: 'Keamanan & Kunci' },
  cat_ai: { en: 'AI Assisted', id: 'Bantuan AI' },

  // Lock Screen
  lock_title: { en: 'Authentication Required', id: 'Otentikasi Diperlukan' },
  lock_subtitle: { 
    en: "To use OCR Scanner and AI Text Fix services powered by Gemini API, please sign in to your UtilDoc account first.", 
    id: 'Untuk menggunakan layanan OCR Scanner dan AI Text Fix yang didukung oleh API server Gemini, silakan masuk ke akun UtilDoc Anda terlebih dahulu.' 
  },
  lock_signin: { en: 'Sign In / Register', id: 'Masuk / Daftar' },
  lock_back: { en: 'Kembali ke Katalog', id: 'Back to Catalog' },

  // Trust & Empty States
  no_match_title: { en: 'No Matching Utilities', id: 'Tidak Ada Utilitas yang Cocok' },
  no_match_desc: { 
    en: 'Please adjust your layout index filter, clear your active query buffer, or review our general categories index above.', 
    id: 'Silakan sesuaikan filter indeks tata letak Anda, bersihkan buffer kueri aktif, atau tinjau indeks kategori umum kami di atas.' 
  },
  trust_title: { en: 'Absolute Secure Offline Buffer', id: 'Buffer Offline Aman Mutlak' },
  trust_desc: { 
    en: 'Virtual files run directly inside local tab memory blocks. Network telemetry is disabled.', 
    id: 'File virtual diproses langsung di dalam blok memori tab lokal. Telemetri jaringan dinonaktifkan.' 
  },
  trust_btn: { en: 'Begin Merge PDF', id: 'Mulai Gabung PDF' },

  // Footer Specific
  footer_desc: { 
    en: 'A high-performance, browser-local digital printing press. Files are processed client-side with absolute security inside your active tab context. No server records, no diagnostic footprints.', 
    id: 'Mesin pemrosesan dokumen lokal berkinerja tinggi. File diproses di sisi klien dengan keamanan mutlak di dalam konteks tab aktif Anda. Tanpa catatan server, tanpa jejak diagnostik.' 
  },
  footer_status: { en: 'Typesetting Service Online', id: 'Layanan Pemrosesan Online' },
  footer_security_title: { en: 'Typeset Security', id: 'Keamanan Pemrosesan' },
  footer_security_desc: { 
    en: 'Our offline model ensures files remain strictly local. No metadata headers are serialized or transmitted across client buffers.', 
    id: 'Model offline kami memastikan file tetap lokal sepenuhnya. Tidak ada header metadata yang diserialisasi atau dikirim melalui buffer klien.' 
  },
  footer_copyright: { en: 'All documents processed on local paper.', id: 'Semua dokumen diproses di memori lokal.' },
  footer_protocol: { en: 'Security Protocol', id: 'Protokol Keamanan' },
  footer_charter: { en: 'Security Charter', id: 'Piagam Keamanan' },

  // Keyboard Shortcuts
  kb_badge_title: { en: 'Click to view all keyboard shortcuts', id: 'Klik untuk melihat semua pintasan keyboard' },
  kb_save: { en: 'Save / Compile', id: 'Simpan / Gabung' },
  kb_close: { en: 'Close Utility', id: 'Tutup Utilitas' },
  kb_keys: { en: 'Keys', id: 'Tombol' },
  kb_title: { en: 'UtilDoc Keyboard Shortcuts', id: 'Pintasan Keyboard UtilDoc' },
  kb_close_panel: { en: 'Close [Esc]', id: 'Tutup [Esc]' },
  kb_global: { en: 'Global Actions', id: 'Tindakan Global' },
  kb_close_desc: { en: 'Close Active Modal or Return to Catalog', id: 'Tutup Modal Aktif atau Kembali ke Katalog' },
  kb_toggle_desc: { en: 'Toggle Shortcut Legend Overlay', id: 'Buka/Tutup Panduan Pintasan' },
  kb_contextual: { en: 'Contextual Actions', id: 'Tindakan Kontekstual' },
  kb_merge_split_desc: { en: 'Run compilation or download finalized PDF.', id: 'Jalankan kompilasi atau unduh PDF yang sudah selesai.' },
  kb_rotate_watermark_desc: { en: 'Apply page orientation / overlays, or download output file.', id: 'Terapkan orientasi halaman / tanda air, atau unduh file hasil.' },
  kb_raster_desc: { en: 'Rasterize page structures into ZIP collections.', id: 'Ubah halaman menjadi koleksi file gambar ZIP.' },
  kb_image_to_pdf_desc: { en: 'Assemble image files into single A4 or Letter publication.', id: 'Gabungkan file gambar menjadi dokumen PDF tunggal A4 atau Letter.' },
  kb_ai_desc: { en: 'Compile AI scan / correction rules, or download text file.', id: 'Jalankan pemindaian AI / aturan koreksi, atau unduh file teks.' },
  kb_metadata_desc: { en: 'Hydrate Tax Review sample, or export report schema as JSON.', id: 'Muat sampel Tinjauan Pajak, atau ekspor skema laporan sebagai JSON.' },
  kb_studio_footer: { en: 'UtilDoc Studio • Interactive Typography Core', id: 'UtilDoc Studio • Pemrosesan Dokumen Interaktif' },

  // Security Protocol Modal
  sp_title: { en: 'Security Protocol', id: 'Protokol Keamanan' },
  sp_subtitle: { en: 'UtilDoc Local Sandboxed Execution Standards', id: 'Standar Eksekusi Sandbox Lokal UtilDoc' },
  sp_p1: { 
    en: 'All core PDF and image compiler functions run 100% inside your browser\'s virtual machine. We do not use remote servers to serialize or stream document buffers.', 
    id: 'Semua fungsi kompilasi inti PDF dan gambar berjalan 100% di dalam mesin virtual browser Anda. Kami tidak menggunakan server jarak jauh untuk menserialisasi atau mengalirkan buffer dokumen.' 
  },
  sp_p2: { 
    en: 'For AI services (OCR Scan & Smart Fix), files are processed securely through temporary API gateway channels. Files are never stored on disk and are destroyed immediately post-execution.', 
    id: 'Untuk layanan kecerdasan buatan (Pindai OCR & Perbaikan Cerdas AI), file diproses secara aman melalui saluran gateway API sementara. File tidak pernah disimpan di disk dan segera dimusnahkan setelah eksekusi.' 
  },
  sp_p3: { 
    en: 'Client-side sandbox boundaries prevent cross-site scripting (XSS) and keep all telemetry metrics disabled.', 
    id: 'Batasan sandbox di sisi klien mencegah cross-site scripting (XSS) dan menonaktifkan semua metrik telemetri.' 
  },

  // Security Charter Modal
  sc_title: { en: 'Security Charter', id: 'Piagam Keamanan' },
  sc_subtitle: { en: 'Our Commitment to Absolute Privacy', id: 'Komitmen Kami untuk Privasi Mutlak' },
  sc_p1: { 
    en: 'Zero Data Custody: We have no central storage databases for user documents. Your records are yours alone.', 
    id: 'Tanpa Penitipan Data: Kami tidak memiliki database penyimpanan pusat untuk dokumen pengguna. Dokumen Anda sepenuhnya milik Anda sendiri.' 
  },
  sc_p2: { 
    en: 'Verifiable Operations: The processing environment is transparent and can be inspected locally using standard browser development tools.', 
    id: 'Operasi yang Dapat Diverifikasi: Lingkungan pemrosesan transparan dan dapat diperiksa secara lokal menggunakan alat pengembang browser standar.' 
  },
  sc_p3: { 
    en: 'Cryptographic Hardening: Protected documents use industry-grade AES-256 encryption. We support fully local password salting.', 
    id: 'Pengerasan Kriptografis: Dokumen yang dilindungi menggunakan enkripsi standar industri AES-256. Kami mendukung salting kata sandi lokal sepenuhnya.' 
  },

  // Changelog Modal
  cl_title: { en: 'Release Changelog', id: 'Catatan Rilis' },
  cl_subtitle: { en: 'UtilDoc v4.2-Editorial Version History', id: 'Riwayat Versi UtilDoc v4.2-Editorial' },
  cl_i1: { 
    en: 'Localization Suite: Complete English (EN) and Indonesian (ID) bilingual system toggles.', 
    id: 'Suite Lokalisasi: Dukungan penuh dwi-bahasa Inggris (EN) dan Indonesia (ID).' 
  },
  cl_i2: { 
    en: 'Admin SaaS Dashboard: Real-time user database logging, activity metrics, and top tools usage ranking.', 
    id: 'Dasbor Admin SaaS: Logging database pengguna waktu nyata, metrik aktivitas, dan peringkat alat terpopuler.' 
  },
  cl_i3: { 
    en: 'Adsterra Support: Safe ad gateway integrations to keep sandbox tools free for all guest users.', 
    id: 'Dukungan Adsterra: Integrasi gateway iklan yang aman untuk menjaga alat sandbox gratis bagi semua tamu.' 
  },
  cl_i4: { 
    en: 'Interactive Shortcuts: Seamless keyboard triggers for all main compilation pipelines.', 
    id: 'Pintasan Interaktif: Pemicu keyboard cepat untuk seluruh jalur kompilasi utama.' 
  }
};

export const toolTranslations: Record<string, { name: Record<Language, string>; description: Record<Language, string> }> = {
  'merge-pdf': {
    name: { en: 'Merge PDF', id: 'Gabung PDF' },
    description: { en: 'Combine multiple PDF files into one clean document, in any order you choose.', id: 'Gabungkan beberapa file PDF menjadi satu dokumen bersih, dalam urutan pilihan Anda.' }
  },
  'split-pdf': {
    name: { en: 'Split PDF', id: 'Pisah PDF' },
    description: { en: 'Extract specific page ranges or split every page into standalone PDF files.', id: 'Ekstrak rentang halaman tertentu atau pisahkan setiap halaman menjadi file PDF mandiri.' }
  },
  'compress-pdf': {
    name: { en: 'Compress PDF', id: 'Kompres PDF' },
    description: { en: 'Reduce the file size of your PDFs while maintaining maximum resolution quality.', id: 'Kurangi ukuran file PDF Anda dengan tetap menjaga kualitas resolusi maksimum.' }
  },
  'pdf-to-image': {
    name: { en: 'PDF to Image', id: 'PDF ke Gambar' },
    description: { en: 'Extract all pages inside a PDF and save them as high-quality PNG or JPG files.', id: 'Ekstrak semua halaman di dalam PDF dan simpan sebagai file PNG atau JPG berkualitas tinggi.' }
  },
  'image-to-pdf': {
    name: { en: 'Image to PDF', id: 'Gambar ke PDF' },
    description: { en: 'Convert JPG, PNG, or WebP images into a single professional PDF document.', id: 'Konversikan gambar JPG, PNG, atau WebP menjadi satu dokumen PDF profesional.' }
  },
  'image-converter': {
    name: { en: 'Image Converter', id: 'Konverter Gambar' },
    description: { en: 'Instantly convert images between PNG, JPG, WebP, SVG, and other popular formats.', id: 'Konversikan gambar secara instan antara format PNG, JPG, WebP, SVG, dan format populer lainnya.' }
  },
  'encrypt-pdf': {
    name: { en: 'Password Protect & Decrypt', id: 'Proteksi Sandi & Dekripsi' },
    description: { en: 'Protect files with passwords (AES-256) or unlock already encrypted secure PDFs.', id: 'Lindungi file dengan kata sandi (AES-256) atau buka kunci PDF aman yang terenkripsi.' }
  },
  'ocr-scan': {
    name: { en: 'OCR Scan', id: 'AI Pindai OCR' },
    description: { en: 'Extract copyable text from scanned PDFs, invoices, and physical screenshots.', id: 'Ekstrak teks yang dapat disalin dari PDF pindaian, faktur, dan tangkapan layar fisik.' }
  },
  'ai-fix': {
    name: { en: 'AI Smart Fix', id: 'Perbaikan Cerdas AI' },
    description: { en: 'Correct typos, proofread, and automatically reformat documents using Gemini AI.', id: 'Koreksi salah ketik, periksa ejaan, dan reformat dokumen secara otomatis menggunakan Gemini AI.' }
  },
  'view-metadata': {
    name: { en: 'View Metadata', id: 'Lihat Metadata' },
    description: { en: 'Inspect internal document properties, authors, titles, creation dates, and format specifications.', id: 'Periksa properti dokumen internal, penulis, judul, tanggal pembuatan, dan spesifikasi format.' }
  },
  'rotate-pdf': {
    name: { en: 'Rotate Pages', id: 'Putar Halaman' },
    description: { en: 'Rotate specific pages or all pages of a PDF document by 90, 180, or 270 degrees.', id: 'Putar halaman tertentu atau semua halaman dokumen PDF sebesar 90, 180, atau 270 derajat.' }
  },
  'watermark-pdf': {
    name: { en: 'Watermark', id: 'Tanda Air (Watermark)' },
    description: { en: 'Overlay custom styled text strings or logo graphic layers onto target document page structures.', id: 'Tambahkan teks khusus atau logo grafis ke atas struktur halaman dokumen target.' }
  }
};
