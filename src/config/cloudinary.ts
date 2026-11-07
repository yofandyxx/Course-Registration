/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * q
 * Fungsi File :
 * - Menyimpan konfigurasi publik Cloudinary yang dibutuhkan client.
 * - Menentukan Cloud Name dan Unsigned Upload Preset.
 * - Menentukan folder penyimpanan foto profil Participant.
 * - Membentuk endpoint REST API untuk proses upload gambar.
 *
 * Catatan Pembelajaran:
 * Aplikasi mobile TIDAK menyimpan API Secret Cloudinary.
 * Client menggunakan Unsigned Upload Preset sehingga hanya konfigurasi
 * publik yang diperlukan pada aplikasi.
 *
 * Alur Konseptual:
 * Image Picker
 *      ↓
 * URI Foto Lokal
 *      ↓
 * Cloudinary Upload API
 *      ↓
 * secure_url
 *      ↓
 * Cloud Firestore
 *
 * Penanda:
 * [CONFIG]       Konfigurasi layanan eksternal
 * [SECURITY]     Catatan keamanan
 * [FLOW]         Alur integrasi
 * [ENDPOINT]     URL layanan REST API
 * [TEST POINT]   Titik pemeriksaan konfigurasi
 *
 * ================================================================
 */

/**
 * [CONFIG] Konfigurasi publik Cloudinary.
 *
 * [SECURITY]
 * Jangan menambahkan API Secret ke source code aplikasi mobile.
 * Unsigned upload hanya membutuhkan Cloud Name dan Upload Preset.
 */
export const CLOUDINARY_CONFIG = {
  // [CONFIG] Identitas Cloudinary Cloud yang digunakan Project 07.
  cloudName: 'nwgbjff7',

  // [CONFIG] Unsigned Upload Preset untuk upload foto profil.
  uploadPreset: 'ppnp_course_profiles',

  // [CONFIG] Folder tujuan asset foto profil Participant.
  assetFolder: 'PPNPCourseRegistration/profiles',
} as const;

/**
 * [ENDPOINT] Endpoint REST API Cloudinary untuk upload image.
 *
 * Format:
 * https://api.cloudinary.com/v1_1/{cloud_name}/image/upload
 *
 * [FLOW]
 * CLOUDINARY_CONFIG.cloudName
 *      ↓
 * CLOUDINARY_UPLOAD_URL
 *      ↓
 * Digunakan service upload foto profil
 */
export const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
