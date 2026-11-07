/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================

 *
 * Fungsi File :
 * - Menerima URI foto lokal hasil pemilihan gambar.
 * - Menentukan MIME type berdasarkan ekstensi file.
 * - Mengunggah foto secara multipart ke Cloudinary.
 * - Mengirim unsigned upload preset.
 * - Memeriksa HTTP status, header error, dan response JSON.
 * - Memvalidasi secure_url sebelum hasil dikembalikan.
 * - Mengembalikan publicId, secureUrl, ukuran, dan format gambar.
 *
 * Catatan Pembelajaran:
 * File ini merupakan bagian dari source code pembelajaran
 * Project 07 — PPNPCourseRegistration.
 *
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan sebelum proses dilanjutkan
 * [SECURITY]      Hal penting terkait konfigurasi upload
 * [ERROR]         Penanganan kegagalan
 * [TEST POINT]    Titik penting untuk pengujian mahasiswa
 *
 * ================================================================
 *
 * ALUR UTAMA:
 *
 * expo-image-picker
 *       ↓
 * file:// URI
 *       ↓
 * getMimeType()
 *       ↓
 * expo-file-system multipart upload
 *       ↓
 * Cloudinary
 *       ↓
 * HTTP + JSON validation
 *       ↓
 * secure_url
 *
 * ERROR MUSEUM:
 *
 * Percobaan sebelumnya:
 * 1. FormData + { uri, type, name }
 *    → Unsupported FormDataPart implementation
 *
 * 2. fetch(file://...)
 *    → HTTP 404
 *
 * Solusi FINAL:
 * file lokal hasil ImagePicker dikirim langsung menggunakan
 * FileSystem multipart upload.
 *
 * ================================================================
 */

import {
  FileSystemUploadType,
  uploadAsync,
} from 'expo-file-system/legacy';

import {
  CLOUDINARY_CONFIG,
  CLOUDINARY_UPLOAD_URL,
} from '../config/cloudinary';

/**
 * Data yang dikembalikan kepada ProfileScreen.
 */
/**
 * INTERFACE: CloudinaryUploadResult
 * ----------------------------------------------------------------
 * Bentuk data sukses yang dikembalikan service kepada pemanggil,
 * misalnya ProfileScreen.
 */
export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
}


/**
 * Struktur response JSON dari Cloudinary.
 */
/**
 * INTERFACE: CloudinaryApiResponse
 * ----------------------------------------------------------------
 * Bentuk response JSON yang relevan dari Cloudinary.
 * Field dibuat optional karena response sukses dan gagal dapat berbeda.
 */
interface CloudinaryApiResponse {
  public_id?: string;
  secure_url?: string;
  width?: number;
  height?: number;
  format?: string;

  error?: {
    message?: string;
  };
}


/**
 * ============================================================
 * MENENTUKAN MIME TYPE
 * ============================================================
 *
 * ImagePicker dapat menghasilkan JPG, JPEG, PNG, WEBP,
 * dan format gambar lainnya.
 *
 * Untuk praktikum ini kita tangani format umum.
 */
/**
 * FUNGSI: getMimeType
 * ----------------------------------------------------------------
 * Input  : URI foto lokal.
 * Proses : Hilangkan query string, ubah ke lowercase, cek ekstensi.
 * Output : MIME type untuk multipart upload.
 *
 * [FLOW] PNG/WEBP/HEIC/HEIF dikenali secara eksplisit.
 * [VALIDASI] Format lain menggunakan default image/jpeg.
 */
function getMimeType(
  photoUri: string
): string {

  const cleanUri =
    photoUri
      .split('?')[0]
      .toLowerCase();


  if (
    cleanUri.endsWith('.png')
  ) {
    return 'image/png';
  }


  if (
    cleanUri.endsWith('.webp')
  ) {
    return 'image/webp';
  }


  if (
    cleanUri.endsWith('.heic')
  ) {
    return 'image/heic';
  }


  if (
    cleanUri.endsWith('.heif')
  ) {
    return 'image/heif';
  }


  /*
   * Default:
   * JPG / JPEG
   */
  return 'image/jpeg';
}


/**
 * ============================================================
 * UPLOAD FOTO PROFILE
 * ============================================================
 */
/**
 * FUNGSI: uploadProfilePhoto
 * ----------------------------------------------------------------
 * Input  : photoUri dari file lokal hasil ImagePicker.
 * Proses : Validasi → MIME → multipart upload → parse response
 *          → validasi HTTP → validasi secure_url.
 * Output : CloudinaryUploadResult.
 *
 * [SECURITY] Upload menggunakan unsigned upload preset dari konfigurasi.
 * API Secret tidak digunakan pada aplikasi mobile.
 * [TEST POINT] Uji URI kosong, HTTP gagal, JSON tidak valid, secure_url
 * tidak tersedia, dan upload sukses.
 */
export const uploadProfilePhoto =
  async (
    photoUri: string
  ): Promise<CloudinaryUploadResult> => {

    /* --------------------------------------------------------
       VALIDASI URI
       -------------------------------------------------------- */

    // [VALIDASI] URI lokal wajib tersedia sebelum upload dimulai.
    if (!photoUri) {
      throw new Error(
        'URI foto tidak tersedia.'
      );
    }


    // [FLOW] Tentukan MIME type yang dikirim pada multipart upload.
    const mimeType =
      getMimeType(photoUri);


    console.log(
      '=== CLOUDINARY UPLOAD START ==='
    );

    console.log(
      'Cloud Name:',
      CLOUDINARY_CONFIG.cloudName
    );

    console.log(
      'Upload Preset:',
      CLOUDINARY_CONFIG.uploadPreset
    );

    console.log(
      'Upload URL:',
      CLOUDINARY_UPLOAD_URL
    );

    console.log(
      'Photo URI:',
      photoUri
    );

    console.log(
      'MIME Type:',
      mimeType
    );


    try {

      /* ======================================================
         STEP 1
         FILESYSTEM MULTIPART UPLOAD
         ====================================================== */

      console.log(
        'STEP 1: Upload multipart menggunakan Expo FileSystem...'
      );


      // [FLOW] Kirim file lokal langsung sebagai multipart/form-data.
      const uploadResult =
        await uploadAsync(
          CLOUDINARY_UPLOAD_URL,
          photoUri,
          {
            httpMethod: 'POST',

            /*
             * MULTIPART:
             *
             * FileSystem akan membuat multipart/form-data
             * termasuk boundary secara otomatis.
             */
            uploadType:
              FileSystemUploadType.MULTIPART,


            /*
             * Nama field file yang diharapkan Cloudinary.
             */
            fieldName:
              'file',


            /*
             * MIME type file.
             */
            mimeType,


            /*
             * Parameter tambahan pada multipart.
             *
             * Untuk unsigned upload Cloudinary,
             * upload_preset wajib dikirim.
             */
            // [SECURITY] Unsigned upload memakai upload_preset;
            // jangan menaruh Cloudinary API Secret di aplikasi client.
            parameters: {
              upload_preset:
                CLOUDINARY_CONFIG.uploadPreset,

              asset_folder:
                CLOUDINARY_CONFIG.assetFolder,
            },
          }
        );


      console.log(
        'STEP 1 PASS'
      );

      console.log(
        'Cloudinary HTTP Status:',
        uploadResult.status
      );


      /* ======================================================
         STEP 2
         HEADER ERROR CLOUDINARY
         ====================================================== */

      const headers =
        uploadResult.headers || {};


      // [ERROR] Cloudinary dapat mengirim detail error melalui header.
      const cloudinaryHeaderError =
        headers['x-cld-error'] ||
        headers['X-Cld-Error'];


      if (cloudinaryHeaderError) {

        console.log(
          'Cloudinary X-Cld-Error:',
          cloudinaryHeaderError
        );

      }


      /* ======================================================
         STEP 3
         RESPONSE BODY
         ====================================================== */

      // [FLOW] Ambil body mentah sebelum proses JSON.parse().
      const responseText =
        uploadResult.body;


      console.log(
        'Cloudinary Response:',
        responseText
      );


      let result:
        CloudinaryApiResponse;


      try {

        // [VALIDASI] Response harus berupa JSON yang dapat diproses.
        result =
          JSON.parse(
            responseText
          ) as CloudinaryApiResponse;

      } catch {

        throw new Error(
          `Response Cloudinary bukan JSON yang valid. HTTP ${uploadResult.status}.`
        );

      }


      /* ======================================================
         STEP 4
         FAILURE HANDLING
         ====================================================== */

      // [VALIDASI] Hanya HTTP 2xx yang dianggap upload berhasil.
      if (
        uploadResult.status < 200 ||
        uploadResult.status >= 300
      ) {

        throw new Error(
          result.error?.message ||
          cloudinaryHeaderError ||
          `Upload gagal. HTTP ${uploadResult.status}.`
        );

      }


      /* ======================================================
         STEP 5
         VALIDASI secure_url
         ====================================================== */

      // [VALIDASI] Upload belum dianggap sukses tanpa secure_url.
      if (!result.secure_url) {

        throw new Error(
          'Cloudinary tidak mengembalikan secure_url.'
        );

      }


      /* ======================================================
         SUCCESS
         ====================================================== */

      console.log(
        'STEP 2 PASS'
      );

      console.log(
        'Cloudinary Upload Success:',
        result.secure_url
      );

      console.log(
        'Public ID:',
        result.public_id
      );

      console.log(
        'Format:',
        result.format
      );

      console.log(
        'Ukuran:',
        result.width,
        'x',
        result.height
      );

      console.log(
        '=== CLOUDINARY UPLOAD END ==='
      );


      // [FLOW] Kembalikan metadata yang diperlukan aplikasi.
      return {

        publicId:
          result.public_id || '',

        secureUrl:
          result.secure_url,

        width:
          result.width,

        height:
          result.height,

        format:
          result.format,

      };


    } catch (error: unknown) {

      // [ERROR] Pertahankan Error asli agar pesan diagnosis tidak hilang.

      /* ======================================================
         ERROR DIAGNOSIS
         ====================================================== */

      console.log(
        '=== CLOUDINARY RAW ERROR ==='
      );

      console.log(
        error
      );


      if (
        error instanceof Error
      ) {

        console.log(
          'Error Name:',
          error.name
        );

        console.log(
          'Error Message:',
          error.message
        );

        throw error;

      }


      throw new Error(
        'Terjadi kesalahan yang tidak diketahui saat upload ke Cloudinary.'
      );

    }
  };