/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * Nama File   : firestore.ts
 * Lokasi      : src/services/firestore.ts
 *
 * Teknologi   : React Native + TypeScript + Expo
 * Backend     : Firebase Cloud Firestore
 *
 * Pembuat     : Amrizal, S.Kom, M.Kom
 *
 * Fungsi File :
 * Menjadi service layer untuk seluruh operasi Cloud Firestore,
 * meliputi pengguna, program kursus, instruktur, kelas,
 * pendaftaran, seed data, dan transaksi verifikasi pendaftaran.
 *
 * Collection yang digunakan:
 * 1. users
 * 2. programs
 * 3. instructors
 * 4. classes
 * 5. registrations
 *
 * Konsep penting:
 * - CRUD Cloud Firestore
 * - Query berdasarkan participantId / classId
 * - Business Rule sebelum delete / update status
 * - Firestore Transaction untuk menjaga konsistensi data
 * - serverTimestamp() untuk waktu dari server Firebase
 *
 * Catatan Pembelajaran:
 * File ini merupakan bagian dari source code pembelajaran
 * Project 07 — PPNPCourseRegistration.
 *
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan data sebelum proses dilanjutkan
 * [BUSINESS RULE] Aturan bisnis aplikasi
 * [SECURITY]      Batas akses yang terkait role / Firestore Rules
 * [TEST POINT]    Titik penting yang harus diuji mahasiswa
 *
 * ================================================================
 */


import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';

import {
  AppUser,
  CourseClass,
  CourseProgram,
  Instructor,
  Registration,
  RegistrationStatus,
} from '../types';

import { demoPrograms } from '../data/demo';

/* ============================================================
   USER
   ============================================================ */


/**
 * Mengambil satu pengguna berdasarkan UID Firebase Auth.
 *
 * UID Firebase Authentication juga digunakan sebagai
 * Document ID pada collection users.
 */
export const getUser = async (
  uid: string,
): Promise<AppUser | null> => {
  const userRef = doc(db, 'users', uid);

  // UID Authentication harus sama dengan Document ID di collection users.
  const snapshot = await getDocFromServer(userRef);
  if (!snapshot.exists()) return null;
  return { uid: snapshot.id, ...snapshot.data() } as AppUser;
};


/**
 * Menyimpan data pengguna.
 *
 * merge:true digunakan agar data lama tidak seluruhnya
 * ditimpa ketika hanya sebagian data diperbarui.
 */
export const saveUser = async (
  user: AppUser,
) => {
  return setDoc(
    doc(
      db,
      'users',
      user.uid,
    ),
    {
      ...user,
      createdAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );
};


/**
 * Mengambil seluruh pengguna.
 *
 * Berdasarkan Firestore Security Rules, fungsi ini
 * hanya digunakan Administrator.
 */
export const listUsers = async () => {
  const snapshot = await getDocs(
    collection(
      db,
      'users',
    ),
  );

  return snapshot.docs.map(
    item =>
      ({
        uid: item.id,
        ...item.data(),
      } as AppUser),
  );
};


/**
 * Mengaktifkan atau menonaktifkan akun pengguna.
 */
export const updateUserStatus = async (
  uid: string,
  status: 'ACTIVE' | 'INACTIVE',
) => {
  return updateDoc(
    doc(
      db,
      'users',
      uid,
    ),
    {
      status,
    },
  );
};


/**
 * [VALIDASI] [SECURITY] [TEST POINT]
 * ============================================================
 * P07.24G
 * UPDATE FOTO PROFIL PARTICIPANT
 * ============================================================
 *
 * Fungsi ini menyimpan URL foto hasil upload Cloudinary
 * ke document:
 *
 * users/{uid}
 *
 * Field:
 *
 * photoUrl: "https://res.cloudinary.com/..."
 *
 * Catatan:
 * File gambar TIDAK disimpan di Cloud Firestore.
 *
 * Cloudinary:
 *   menyimpan file gambar
 *
 * Firestore:
 *   hanya menyimpan URL gambar
 */
export const updateUserPhoto = async (
  uid: string,
  photoUrl: string,
) => {

  /* ----------------------------------------------------------
     1. VALIDASI UID
     ---------------------------------------------------------- */

  if (!uid) {
    throw new Error(
      'UID pengguna tidak valid.',
    );
  }


  /* ----------------------------------------------------------
     2. VALIDASI URL FOTO
     ---------------------------------------------------------- */

  if (!photoUrl) {
    throw new Error(
      'URL foto tidak tersedia.',
    );
  }


  /*
   * Untuk Project 07, foto profil harus berasal dari
   * Cloudinary melalui HTTPS.
   */
  if (
    !photoUrl.startsWith(
      'https://res.cloudinary.com/',
    )
  ) {
    throw new Error(
      'URL foto Cloudinary tidak valid.',
    );
  }


  /* ----------------------------------------------------------
     3. REFERENSI DOCUMENT USER
     ---------------------------------------------------------- */

  const userRef = doc(
    db,
    'users',
    uid,
  );


  /* ----------------------------------------------------------
     4. PASTIKAN USER ADA
     ---------------------------------------------------------- */

  const snapshot =
    await getDoc(
      userRef,
    );


  if (!snapshot.exists()) {
    throw new Error(
      'Data pengguna tidak ditemukan.',
    );
  }


  /* ----------------------------------------------------------
     5. SIMPAN URL FOTO
     ----------------------------------------------------------
     
     Hanya field photoUrl yang diperbarui.

     Field berikut TIDAK disentuh:
     
     - role
     - status
     - email
     - name
     - phone
     - createdAt
     ---------------------------------------------------------- */

  await updateDoc(
    userRef,
    {
      photoUrl,
    },
  );


  /* ----------------------------------------------------------
     6. RETURN
     ---------------------------------------------------------- */

  return {
    uid,
    photoUrl,
  };
};

/* ============================================================
   PROGRAM KURSUS
   ============================================================ */


/**
 * Mengambil seluruh program kursus.
 */
export const listPrograms = async () => {
  const snapshot = await getDocs(
    collection(
      db,
      'programs',
    ),
  );

  return snapshot.docs.map(
    item =>
      ({
        id: item.id,
        ...item.data(),
      } as CourseProgram),
  );
};


/**
 * Menambahkan program kursus baru.
 */
export const addProgram = async (
  program: Omit<
    CourseProgram,
    'id'
  >,
) => {
  return addDoc(
    collection(
      db,
      'programs',
    ),
    program,
  );
};


/**
 * Memperbarui program kursus.
 */
export const updateProgram = async (
  id: string,
  program: Partial<CourseProgram>,
) => {
  return updateDoc(
    doc(
      db,
      'programs',
      id,
    ),
    program,
  );
};


/* ============================================================
   MASTER INSTRUKTUR
   ============================================================ */


/**
 * Mengambil seluruh data instruktur.
 */
export const listInstructors =
  async () => {
    const snapshot =
      await getDocs(
        collection(
          db,
          'instructors',
        ),
      );

    return snapshot.docs.map(
      item =>
        ({
          id: item.id,
          ...item.data(),
        } as Instructor),
    );
  };


/**
 * Menambahkan instruktur baru.
 *
 * createdAt dibuat otomatis menggunakan waktu
 * server Firebase.
 */
export const addInstructor = async (
  instructor: Omit<
    Instructor,
    'id' | 'createdAt'
  >,
) => {
  return addDoc(
    collection(
      db,
      'instructors',
    ),
    {
      ...instructor,
      createdAt: serverTimestamp(),
    },
  );
};


/**
 * Memperbarui data instruktur.
 *
 * Digunakan untuk:
 * - Edit data
 * - Mengaktifkan instruktur
 * - Menonaktifkan instruktur
 */
export const updateInstructor = async (
  id: string,
  instructor: Partial<Instructor>,
) => {
  return updateDoc(
    doc(
      db,
      'instructors',
      id,
    ),
    instructor,
  );
};


/**
 * Membuat data awal instruktur.
 *
 * Seed hanya dilakukan apabila collection instructors
 * masih kosong.
 */
export const seedInstructors =
  async () => {
    const existing =
      await listInstructors();

    if (existing.length > 0) {
      return false;
    }

    const samples = [
      {
        code: 'INS-001',

        name:
          'Amrizal, S.Kom., M.Kom.',

        expertise:
          'Mobile Development',

        email:
          'amrizal@ppnp.ac.id',

        phone:
          '081267890001',

        status:
          'ACTIVE' as const,
      },

      {
        code: 'INS-002',

        name:
          'Dr. Hendra',

        expertise:
          'Internet of Things',

        email:
          'hendra@ppnp.ac.id',

        phone:
          '081267890002',

        status:
          'ACTIVE' as const,
      },

      {
        code: 'INS-003',

        name:
          'Putri Andriani, S.Kom.',

        expertise:
          'Web Development',

        email:
          'putri.andriani@ppnp.ac.id',

        phone:
          '081267890003',

        status:
          'ACTIVE' as const,
      },
    ];

    for (
      const instructor of samples
    ) {
      await addInstructor(
        instructor,
      );
    }

    return true;
  };


/* ============================================================
   KELAS KURSUS
   ============================================================ */


/**
 * Mengambil seluruh kelas kursus.
 */
export const listClasses = async () => {
  const snapshot = await getDocs(
    collection(
      db,
      'classes',
    ),
  );

  return snapshot.docs.map(
    item =>
      ({
        id: item.id,
        ...item.data(),
      } as CourseClass),
  );
};


/**
 * Menambahkan kelas baru.
 */
export const addClass = async (
  courseClass: Omit<
    CourseClass,
    'id'
  >,
) => {
  return addDoc(
    collection(
      db,
      'classes',
    ),
    courseClass,
  );
};


/**
 * Memperbarui data kelas.
 *
 * Status kelas:
 * OPEN
 * FULL
 * CLOSED
 */
export const updateClass = async (
  id: string,
  courseClass: Partial<CourseClass>,
) => {
  return updateDoc(
    doc(
      db,
      'classes',
      id,
    ),
    courseClass,
  );
};

/* ============================================================
   P07.21
   HAPUS KELAS DENGAN BUSINESS RULE
   ============================================================ */

/**
 * [BUSINESS RULE] [VALIDASI] [TEST POINT]
 * Menghapus kelas secara aman.
 *
 * BUSINESS RULE:
 *
 * Kelas hanya boleh dihapus apabila BELUM PERNAH mempunyai
 * histori pendaftaran.
 *
 * Yang diperiksa bukan nilai enrolled.
 *
 * Mengapa?
 * Karena kelas dengan:
 *
 * enrolled = 0
 *
 * masih mungkin mempunyai histori:
 *
 * - PENDING
 * - REJECTED
 * - CANCELLED
 *
 * Data histori tersebut harus tetap mempunyai referensi kelas
 * yang valid.
 *
 * Apabila histori ditemukan, kelas tidak dihapus.
 * Administrator disarankan mengubah status menjadi CLOSED.
 */
export const deleteClassSafely = async (
  classId: string,
) => {

  /* ----------------------------------------------------------
     1. VALIDASI CLASS ID
     ---------------------------------------------------------- */

  if (!classId) {
    throw new Error(
      'ID kelas tidak valid.',
    );
  }


  /* ----------------------------------------------------------
     2. REFERENSI DOCUMENT KELAS
     ---------------------------------------------------------- */

  const classRef = doc(
    db,
    'classes',
    classId,
  );


  /* ----------------------------------------------------------
     3. PASTIKAN KELAS MASIH ADA
     ---------------------------------------------------------- */

  const classSnapshot =
    await getDoc(classRef);

  if (!classSnapshot.exists()) {
    throw new Error(
      'Kelas tidak ditemukan.',
    );
  }


  /* ----------------------------------------------------------
     4. CARI SEMUA REGISTRATION YANG MENGGUNAKAN CLASS ID

     Penting:
     Kita memeriksa seluruh status registration.

     Tidak hanya:
     APPROVED

     tetapi juga:
     PENDING
     REJECTED
     CANCELLED
     COMPLETED
     ---------------------------------------------------------- */

  const registrationQuery = query(
    collection(
      db,
      'registrations',
    ),

    where(
      'classId',
      '==',
      classId,
    ),
  );


  const registrationSnapshot =
    await getDocs(
      registrationQuery,
    );


  /* ----------------------------------------------------------
     5. JIKA ADA HISTORI → DELETE DITOLAK
     ---------------------------------------------------------- */

  if (
    !registrationSnapshot.empty
  ) {

    throw new Error(
      'Kelas tidak dapat dihapus karena sudah mempunyai histori pendaftaran. Gunakan status CLOSED untuk menutup kelas.',
    );
  }


  /* ----------------------------------------------------------
     6. TIDAK ADA HISTORI → KELAS BOLEH DIHAPUS
     ---------------------------------------------------------- */

  await deleteDoc(
    classRef,
  );


  /* ----------------------------------------------------------
     7. RETURN HASIL
     ---------------------------------------------------------- */

  return {
    success: true,
    classId,
  };
};

/* ============================================================
   PENDAFTARAN KURSUS
   ============================================================ */


/**
 * [SECURITY] [FLOW]
 * Mengambil data pendaftaran.
 *
 * ADMIN:
 * uid tidak diberikan sehingga seluruh pendaftaran
 * dapat dibaca.
 *
 * PARTICIPANT:
 * uid diberikan sehingga query hanya membaca
 * pendaftaran milik peserta tersebut.
 *
 * Pola ini harus dipertahankan karena berkaitan dengan
 * Firestore Security Rules dan RBAC.
 */
export const listRegistrations = async (
  uid?: string,
) => {
  const registrationCollection =
    collection(
      db,
      'registrations',
    );

  const reference = uid
    ? query(
        registrationCollection,
        where(
          'participantId',
          '==',
          uid,
        ),
      )
    : registrationCollection;

  const snapshot =
    await getDocs(
      reference,
    );

  return snapshot.docs.map(
    item =>
      ({
        id: item.id,
        ...item.data(),
      } as Registration),
  );
};


/**
 * Menambahkan pendaftaran baru.
 *
 * Waktu pendaftaran dibuat otomatis oleh Firebase.
 */
export const addRegistration = async (
  registration: Omit<
    Registration,
    'id' | 'registeredAt'
  >,
) => {
  return addDoc(
    collection(
      db,
      'registrations',
    ),
    {
      ...registration,

      registeredAt:
        serverTimestamp(),
    },
  );
};


/* ============================================================
   UPDATE STATUS PENDAFTARAN - VERSI DASAR

   Fungsi ini tetap dipertahankan untuk kompatibilitas
   dengan kode lama.

   Untuk proses APPROVE P07.19 kita akan menggunakan
   approveRegistration() dengan Firestore Transaction.
   ============================================================ */

export const updateRegistrationStatus =
  async (
    id: string,
    status: RegistrationStatus,
  ) => {
    return updateDoc(
      doc(
        db,
        'registrations',
        id,
      ),
      {
        status,
      },
    );
  };


/* ============================================================
   P07.19
   APPROVE PENDAFTARAN
   FIRESTORE TRANSACTION
   ============================================================ */


/**
 * [BUSINESS RULE] [VALIDASI] [TEST POINT]
 * Menyetujui pendaftaran peserta menggunakan
 * Firestore Transaction.
 *
 * Alur:
 *
 * 1. Baca registration.
 * 2. Pastikan masih PENDING.
 * 3. Baca kelas.
 * 4. Pastikan kelas OPEN.
 * 5. Pastikan kapasitas tersedia.
 * 6. Registration → APPROVED.
 * 7. enrolled → enrolled + 1.
 * 8. Jika kapasitas penuh → FULL.
 *
 * Semua perubahan merupakan satu transaksi.
 */
export const approveRegistration =
  async (
    registrationId: string,
  ) => {
    const registrationRef =
      doc(
        db,
        'registrations',
        registrationId,
      );

    return runTransaction(
      db,

      async transaction => {
        /* ----------------------------------------------------
           1. BACA REGISTRATION
           ---------------------------------------------------- */

        const registrationSnapshot =
          await transaction.get(
            registrationRef,
          );

        if (
          !registrationSnapshot.exists()
        ) {
          throw new Error(
            'Data pendaftaran tidak ditemukan.',
          );
        }

        const registration =
          registrationSnapshot.data() as Registration;


        /* ----------------------------------------------------
           2. STATUS HARUS PENDING

           Mencegah pendaftaran yang sudah diproses
           di-APPROVE kembali.
           ---------------------------------------------------- */

        if (
          registration.status !==
          'PENDING'
        ) {
          throw new Error(
            'Pendaftaran sudah diproses sebelumnya.',
          );
        }


        /* ----------------------------------------------------
           3. VALIDASI CLASS ID
           ---------------------------------------------------- */

        if (
          !registration.classId
        ) {
          throw new Error(
            'Referensi kelas pada pendaftaran tidak valid.',
          );
        }


        /* ----------------------------------------------------
           4. BACA KELAS
           ---------------------------------------------------- */

        const classRef =
          doc(
            db,
            'classes',
            registration.classId,
          );

        const classSnapshot =
          await transaction.get(
            classRef,
          );

        if (
          !classSnapshot.exists()
        ) {
          throw new Error(
            'Kelas tidak ditemukan.',
          );
        }

        const courseClass =
          classSnapshot.data() as CourseClass;


        /* ----------------------------------------------------
           5. STATUS KELAS HARUS OPEN
           ---------------------------------------------------- */

        if (
          courseClass.status !==
          'OPEN'
        ) {
          throw new Error(
            'Kelas sudah ditutup atau penuh.',
          );
        }


        /* ----------------------------------------------------
           6. BACA KAPASITAS
           ---------------------------------------------------- */

        const enrolled =
          Number(
            courseClass.enrolled
            || 0,
          );

        const capacity =
          Number(
            courseClass.capacity
            || 0,
          );


        /* ----------------------------------------------------
           7. VALIDASI KAPASITAS
           ---------------------------------------------------- */

        if (
          capacity <= 0
          || enrolled >= capacity
        ) {
          throw new Error(
            'Kapasitas kelas sudah penuh.',
          );
        }


        /* ----------------------------------------------------
           8. HITUNG JUMLAH PESERTA BARU
           ---------------------------------------------------- */

        const newEnrolled =
          enrolled + 1;


        /* ----------------------------------------------------
           9. TENTUKAN STATUS KELAS

           Jika peserta baru mengisi kursi terakhir,
           kelas otomatis menjadi FULL.
           ---------------------------------------------------- */

        const newClassStatus:
          CourseClass['status'] =
          newEnrolled >= capacity
            ? 'FULL'
            : 'OPEN';


        /* ----------------------------------------------------
           10. REGISTRATION → APPROVED
           ---------------------------------------------------- */

        transaction.update(
          registrationRef,
          {
            status:
              'APPROVED',
          },
        );


        /* ----------------------------------------------------
           11. UPDATE KELAS

           enrolled bertambah satu.

           Jika kapasitas sudah tercapai,
           status berubah menjadi FULL.
           ---------------------------------------------------- */

        transaction.update(
          classRef,
          {
            enrolled:
              newEnrolled,

            status:
              newClassStatus,
          },
        );


        /* ----------------------------------------------------
           12. RETURN HASIL TRANSAKSI
           ---------------------------------------------------- */

        return {
          registrationId,

          classId:
            registration.classId,

          enrolled:
            newEnrolled,

          capacity,

          classStatus:
            newClassStatus,
        };
      },
    );
  };


/* ============================================================
   P07.19
   REJECT PENDAFTARAN
   ============================================================ */


/**
 * [BUSINESS RULE] [VALIDASI] [TEST POINT]
 * Menolak pendaftaran peserta.
 *
 * Hanya registration PENDING yang dapat ditolak.
 *
 * REJECT tidak menambah atau mengurangi enrolled kelas.
 */
export const rejectRegistration =
  async (
    registrationId: string,
  ) => {
    const registrationRef =
      doc(
        db,
        'registrations',
        registrationId,
      );

    return runTransaction(
      db,

      async transaction => {
        /* ----------------------------------------------------
           1. BACA REGISTRATION
           ---------------------------------------------------- */

        const snapshot =
          await transaction.get(
            registrationRef,
          );

        if (!snapshot.exists()) {
          throw new Error(
            'Data pendaftaran tidak ditemukan.',
          );
        }

        const registration =
          snapshot.data() as Registration;


        /* ----------------------------------------------------
           2. HANYA PENDING YANG DAPAT DITOLAK
           ---------------------------------------------------- */

        if (
          registration.status !==
          'PENDING'
        ) {
          throw new Error(
            'Pendaftaran sudah diproses sebelumnya.',
          );
        }


        /* ----------------------------------------------------
           3. STATUS → REJECTED
           ---------------------------------------------------- */

        transaction.update(
          registrationRef,
          {
            status:
              'REJECTED',
          },
        );

        return true;
      },
    );
  };


/* ============================================================
   P07.19
   CANCEL PENDAFTARAN
   ============================================================ */


/**
 * [BUSINESS RULE] [VALIDASI] [TEST POINT]
 * Membatalkan pendaftaran oleh Participant.
 *
 * Hanya pendaftaran PENDING yang dapat dibatalkan.
 *
 * Karena participant belum disetujui, enrolled kelas
 * tidak berubah.
 */
export const cancelRegistration =
  async (
    registrationId: string,
  ) => {
    const registrationRef =
      doc(
        db,
        'registrations',
        registrationId,
      );

    return runTransaction(
      db,

      async transaction => {
        /* ----------------------------------------------------
           1. BACA REGISTRATION
           ---------------------------------------------------- */

        const snapshot =
          await transaction.get(
            registrationRef,
          );

        if (!snapshot.exists()) {
          throw new Error(
            'Data pendaftaran tidak ditemukan.',
          );
        }

        const registration =
          snapshot.data() as Registration;


        /* ----------------------------------------------------
           2. HANYA PENDING YANG DAPAT DIBATALKAN
           ---------------------------------------------------- */

        if (
          registration.status !==
          'PENDING'
        ) {
          throw new Error(
            'Hanya pendaftaran PENDING yang dapat dibatalkan.',
          );
        }


        /* ----------------------------------------------------
           3. STATUS → CANCELLED
           ---------------------------------------------------- */

        transaction.update(
          registrationRef,
          {
            status:
              'CANCELLED',
          },
        );

        return true;
      },
    );
  };


/* ============================================================
   SEED PROGRAM KURSUS
   ============================================================ */


/**
 * [FLOW] [TEST POINT]
 * Membuat data awal Program Kursus.
 *
 * Seed hanya dilakukan apabila collection programs
 * masih kosong.
 *
 * Fitur ini dipertahankan sebagai bagian pembelajaran
 * Project 07.
 */
export const seedDemo = async () => {
  const existing =
    await listPrograms();

  /*
   * Jangan membuat data demo kembali jika collection
   * programs sudah mempunyai data.
   */
  if (existing.length > 0) {
    return false;
  }

  /*
   * Simpan seluruh program demo ke Cloud Firestore.
   */
  for (
    const program of demoPrograms
  ) {
    await addDoc(
      collection(
        db,
        'programs',
      ),
      program,
    );
  }

  return true;
};