/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 *
 *
 * Fungsi File :
 * - Mendefinisikan tipe dan interface utama aplikasi.
 * - Menjadi kontrak struktur data antara screen, service, dan Firestore.
 * - Mendefinisikan role/status pengguna dan status pendaftaran.
 * - Mendefinisikan struktur Program, Instructor, CourseClass,
 *   dan Registration.
 * - Menjaga kompatibilitas data kelas versi lama dan versi baru.
 *
 * Catatan Pembelajaran:
 * File ini tidak menjalankan proses CRUD.
 * File ini mendefinisikan bentuk data yang digunakan aplikasi.
 * Dengan TypeScript, kesalahan struktur data dapat diketahui lebih awal
 * ketika proses pengembangan dan pemeriksaan tipe dilakukan.
 *
 * Penanda:
 * [TYPE]          Tipe nilai yang diperbolehkan
 * [DATA MODEL]    Struktur entitas aplikasi
 * [RELATION]      Hubungan antar-entitas
 * [COMPATIBILITY] Dukungan data versi lama
 * [TEST POINT]    Titik penting untuk pemeriksaan tipe
 *
 * ================================================================
 */

// [TYPE] Aplikasi hanya mengenal dua role pengguna.
export type UserRole = 'admin' | 'participant';

// [TYPE] Status akses akun pada aplikasi.
export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE';

// [TYPE] Siklus status transaksi pendaftaran kursus.
export type RegistrationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';


/* =========================================================
   USER
   ========================================================= */

/**
 * [DATA MODEL] AppUser
 * Profil aplikasi yang terkait dengan UID Firebase Authentication.
 */
export interface AppUser {
  uid: string;
  email: string;
  name: string;
  phone: string;

  role: UserRole;
  status: UserStatus;
  photoUrl?: string; 
  createdAt?: any;
}


/* =========================================================
   PROGRAM KURSUS
   ========================================================= */

/**
 * [DATA MODEL] CourseProgram
 * Master data program kursus yang ditawarkan.
 */
export interface CourseProgram {
  id: string;

  code: string;
  name: string;
  description: string;

  duration: string;
  level: string;

  fee: number;

  status:
    | 'ACTIVE'
    | 'INACTIVE';
}


/* =========================================================
   INSTRUKTUR
   ========================================================= */

/**
 * [DATA MODEL] Instructor
 * Master data tenaga pengajar. Instructor bukan role login aplikasi.
 */
export interface Instructor {
  id: string;

  code: string;
  name: string;

  expertise: string;

  email: string;
  phone: string;

  status:
    | 'ACTIVE'
    | 'INACTIVE';

  createdAt?: any;
}


/* =========================================================
   KELAS KURSUS

   Mulai P07.17 data jadwal dibuat lebih terstruktur.

   Field lama seperti:
   - instructor
   - schedule

   tetap dipertahankan agar data kelas yang dibuat pada
   tahap sebelumnya masih dapat dibaca aplikasi.
   ========================================================= */

/**
 * [DATA MODEL] CourseClass
 * Kelas menghubungkan Program, Instructor, jadwal, ruang,
 * periode, kapasitas, jumlah peserta, dan status kelas.
 */
export interface CourseClass {
  id: string;

  /* Relasi ke Program Kursus */
  // [RELATION] Snapshot relasi ke program kursus.
  programId: string;
  programName: string;

  /* Nama kelas */
  name: string;


  /* -------------------------------------------------------
     RELASI INSTRUKTUR
     ------------------------------------------------------- */

  /*
   * ID document dari collection instructors.
   * Optional agar data lama tetap kompatibel.
   */
  // [RELATION] Referensi opsional ke document instructors.
  instructorId?: string;

  /*
   * Nama instruktur yang disimpan untuk kebutuhan display.
   */
  instructorName?: string;

  /*
   * Field versi lama.
   * Tetap dipertahankan untuk backward compatibility.
   */
  // [COMPATIBILITY] Field lama dipertahankan agar data lama tetap terbaca.
  instructor: string;


  /* -------------------------------------------------------
     JADWAL
     ------------------------------------------------------- */

  /*
   * Contoh:
   * ['Senin', 'Rabu']
   */
  days?: string[];

  /*
   * Format HH:mm
   * Contoh: 16:00
   */
  startTime?: string;

  /*
   * Format HH:mm
   * Contoh: 18:00
   */
  endTime?: string;

  /*
   * Versi display jadwal.
   *
   * Contoh:
   * Senin & Rabu, 16:00 s/d 18:00
   */
  schedule: string;


  /* -------------------------------------------------------
     RUANG DAN PERIODE
     ------------------------------------------------------- */

  room: string;

  /*
   * Disimpan menggunakan format YYYY-MM-DD
   */
  startDate: string;
  endDate: string;


  /* -------------------------------------------------------
     KAPASITAS
     ------------------------------------------------------- */

  capacity: number;
  enrolled: number;


  /* -------------------------------------------------------
     STATUS KELAS
     ------------------------------------------------------- */

  status:
    | 'OPEN'
    | 'FULL'
    | 'CLOSED';
}


/* =========================================================
   PENDAFTARAN KURSUS
   ========================================================= */

/**
 * [DATA MODEL] Registration
 * Transaksi yang menghubungkan Participant dengan Program dan Kelas.
 * Nama/email disimpan sebagai snapshot untuk kebutuhan tampilan/riwayat.
 */
export interface Registration {
  id: string;

  // [RELATION] Participant yang melakukan pendaftaran.
  participantId: string;
  participantName: string;
  participantEmail: string;

  // [RELATION] Snapshot Program dan Kelas pada transaksi pendaftaran.
  programId: string;
  programName: string;

  classId: string;
  className: string;

  registeredAt?: any;

  status: RegistrationStatus;

  note?: string;
}