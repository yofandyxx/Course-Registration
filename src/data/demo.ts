/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 *
 * 
 * Fungsi File :
 * - Menyediakan data contoh Program Kursus.
 * - Digunakan sebagai seed/demo data pada proses pembelajaran.
 * - Menyediakan contoh struktur data program sebelum disimpan
 *   atau digunakan oleh service aplikasi.
 *
 * Catatan Pembelajaran:
 * File ini berisi data statis, bukan fungsi CRUD dan bukan Security Rules.
 * Setiap objek mewakili satu program kursus.
 * `as const` mempertahankan nilai literal agar TypeScript mengenali
 * data demo secara lebih spesifik.
 *
 * Penanda:
 * [DATA DEMO]  Data contoh untuk kebutuhan pembelajaran
 * [FIELD]      Penjelasan field penting
 * [TEST POINT] Titik pemeriksaan data
 *
 * ================================================================
 */

// [DATA DEMO] Daftar program kursus awal untuk simulasi aplikasi.
export const demoPrograms = [
  {
    code: 'CRS-RN',
    name: 'React Native Fundamental',
    description:
      'Membangun aplikasi mobile modern menggunakan React Native dan Expo.',
    duration: '8 Pertemuan',
    level: 'Pemula',
    fee: 750000,
    status: 'ACTIVE',
  },
  {
    code: 'CRS-WEB',
    name: 'Web Programming',
    description:
      'HTML, CSS, JavaScript, PHP dan dasar pengembangan web.',
    duration: '10 Pertemuan',
    level: 'Pemula',
    fee: 650000,
    status: 'ACTIVE',
  },
  {
    code: 'CRS-IOT',
    name: 'IoT dengan ESP32',
    description:
      'ESP32, sensor, MQTT dan integrasi cloud untuk proyek IoT.',
    duration: '8 Pertemuan',
    level: 'Menengah',
    fee: 850000,
    status: 'ACTIVE',
  },
] as const;
