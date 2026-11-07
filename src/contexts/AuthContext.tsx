/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 
 * Fungsi File :
 * Mengelola autentikasi pengguna secara global menggunakan
 * React Context, Firebase Authentication, dan data profil
 * pengguna yang tersimpan pada Cloud Firestore.
 *
 * File ini menyediakan proses:
 * - memantau status autentikasi;
 * - login;
 * - registrasi peserta;
 * - logout;
 * - memuat ulang profil pengguna.
 *
 * Catatan Pembelajaran:
 * File ini merupakan bagian dari source code pembelajaran
 * Project 07 — PPNPCourseRegistration.
 *
 * ================================================================
 */

/* =================================================================
   IMPORT
   ================================================================= */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { AppUser } from '../types';
import {
  getUser,
  saveUser,
} from '../services/firestore';

/* =================================================================
   TYPE AUTH CONTEXT
   ================================================================= */
/**
 * Ctx
 * -----------------------------------------------------------------
 * Mendefinisikan struktur data dan fungsi yang tersedia melalui
 * AuthContext.
 *
 * firebaseUser :
 * User yang berasal dari Firebase Authentication.
 *
 * profile :
 * Data profil aplikasi yang berasal dari Cloud Firestore.
 *
 * loading :
 * Menandakan apakah pemeriksaan status autentikasi masih berlangsung.
 *
 * login :
 * Melakukan proses login menggunakan email dan password.
 *
 * register :
 * Membuat akun peserta baru.
 *
 * logout :
 * Mengakhiri sesi autentikasi pengguna.
 *
 * refresh :
 * Memuat ulang data profil pengguna dari Firestore.
 */
type Ctx = {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  login: (
    e: string,
    p: string
  ) => Promise<void>;
  register: (
    n: string,
    e: string,
    p: string,
    phone: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

/* =================================================================
   AUTH CONTEXT
   ================================================================= */
/**
 * Membuat React Context yang nantinya digunakan untuk menyediakan
 * data autentikasi kepada komponen lain di dalam aplikasi.
 */
const AuthContext = createContext<Ctx>({} as Ctx);

/**
 * FUNGSI: useAuth
 * -----------------------------------------------------------------
 * Tujuan :
 * Mempermudah komponen lain dalam mengakses AuthContext.
 *
 * Output :
 * Data dan fungsi autentikasi yang tersedia pada AuthContext.
 */
export const useAuth = () => useContext(AuthContext);

/* =================================================================
   AUTH PROVIDER
   ================================================================= */
/**
 * FUNGSI: AuthProvider
 * -----------------------------------------------------------------
 * Tujuan :
 * Menjadi provider utama untuk seluruh proses autentikasi aplikasi.
 *
 * Input :
 * children — komponen React yang berada di dalam AuthProvider.
 *
 * Proses :
 * 1. Menyimpan Firebase User.
 * 2. Menyimpan profil pengguna dari Firestore.
 * 3. Memantau perubahan status Authentication.
 * 4. Menyediakan login, register, logout, dan refresh.
 *
 * Output :
 * AuthContext.Provider yang dapat digunakan oleh komponen aplikasi.
 */
export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  /* ===============================================================
     STATE AUTENTIKASI
     =============================================================== */

  /**
   * firebaseUser
   * Menyimpan user yang berasal dari Firebase Authentication.
   */
  const [firebaseUser, setFirebaseUser] =
    useState<User | null>(null);

  /**
   * profile
   * Menyimpan data profil aplikasi yang berasal dari Firestore.
   */
  const [profile, setProfile] =
    useState<AppUser | null>(null);

  /**
   * loading
   * Bernilai true selama aplikasi masih memeriksa status
   * autentikasi pengguna.
   */
  const [loading, setLoading] = useState(true);

  /* ===============================================================
     LOAD AUTHENTICATION PROFILE
     =============================================================== */

  /**
   * FUNGSI: load
   * ----------------------------------------------------------------
   * Tujuan :
   * Menyinkronkan Firebase User dengan profil pengguna
   * yang tersimpan di Cloud Firestore.
   *
   * Input :
   * u — Firebase User atau null.
   *
   * Proses :
   * 1. Menyimpan Firebase User.
   * 2. Jika user tersedia, mengambil profil berdasarkan UID.
   * 3. Jika user tidak tersedia, profile menjadi null.
   * 4. Mengakhiri status loading.
   *
   * Output :
   * State firebaseUser, profile, dan loading diperbarui.
   */
  const load = async (u: User | null) => {
    setFirebaseUser(u);
    try {
      if (!u) {
        setProfile(null);
        return;
      }
      const userProfile = await getUser(u.uid);
      setProfile(userProfile);
    } catch (error) {
      console.error(
        '[AUTH] Gagal membaca profil Firestore:',
        error
      );
      setProfile(null);
    } finally {
      // Loading harus berakhir meskipun pembacaan profil gagal.
      setLoading(false);
    }
  };

  /* ===============================================================
     AUTH STATE LISTENER
     =============================================================== */

  /**
   * Memantau perubahan status Firebase Authentication.
   *
   * Ketika pengguna login atau logout, Firebase akan memanggil
   * fungsi load() sehingga state aplikasi dapat disinkronkan.
   */
  useEffect(
    () => onAuthStateChanged(auth, load),
    []
  );

  /* ===============================================================
     LOGIN
     =============================================================== */

  /**
   * FUNGSI: login
   * ----------------------------------------------------------------
   * Tujuan :
   * Melakukan login menggunakan Firebase Authentication kemudian
   * mengambil profil pengguna dari Cloud Firestore.
   *
   * Input :
   * e — email pengguna.
   * p — password pengguna.
   *
   * Proses :
   * 1. Login ke Firebase Authentication.
   * 2. Mengambil profil berdasarkan UID.
   * 3. Memeriksa status akun.
   * 4. Jika INACTIVE, logout dan tolak akses.
   * 5. Jika diperbolehkan, simpan profil ke state.
   *
   * Output :
   * Profile pengguna tersimpan pada AuthContext jika login
   * diperbolehkan.
   */
  const login = async (
    e: string,
    p: string
  ) => {
    // [FLOW] Langkah 1 — Login melalui Firebase Authentication.
    const c = await signInWithEmailAndPassword(
      auth,
      e.trim(),
      p
    );

    // [FLOW] Langkah 2 — Ambil profil pengguna dari Firestore
    // menggunakan UID hasil Authentication.
    const pr = await getUser(c.user.uid);

    // [BUSINESS RULE]
    // Akun berstatus INACTIVE tidak boleh menggunakan aplikasi.
    //
    // [SECURITY]
    // Jika akun INACTIVE, sesi Firebase Authentication dihentikan.
    if (pr?.status === 'INACTIVE') {
      await signOut(auth);

      // [TEST POINT]
      // Login akun INACTIVE harus menghasilkan pesan berikut.
      throw new Error(
        'Akun dinonaktifkan oleh admin.'
      );
    }

    // [FLOW] Langkah 3 — Simpan profil pengguna yang diizinkan.
    setProfile(pr);
  };

  /* ===============================================================
     REGISTER
     =============================================================== */

  /**
   * FUNGSI: register
   * ----------------------------------------------------------------
   * Tujuan :
   * Membuat akun peserta baru menggunakan Firebase Authentication
   * dan menyimpan profilnya ke Cloud Firestore.
   *
   * Input :
   * n     — nama peserta.
   * e     — email peserta.
   * p     — password peserta.
   * phone — nomor telepon peserta.
   *
   * Proses :
   * 1. Membuat akun pada Firebase Authentication.
   * 2. Mendapatkan UID pengguna baru.
   * 3. Membentuk data AppUser.
   * 4. Menetapkan role participant.
   * 5. Menetapkan status ACTIVE.
   * 6. Menyimpan profil ke Firestore.
   * 7. Menyimpan profil ke AuthContext.
   *
   * Output :
   * Akun Firebase dan profil peserta baru berhasil dibuat.
   */
  const register = async (
    n: string,
    e: string,
    p: string,
    phone: string
  ) => {
    // [FLOW] Langkah 1 — Membuat akun pada Firebase Authentication.
    const c = await createUserWithEmailAndPassword(
      auth,
      e.trim(),
      p
    );

    // [FLOW] Langkah 2 — Bentuk profil aplikasi berdasarkan
    // UID yang diberikan oleh Firebase Authentication.
    const u: AppUser = {
      uid: c.user.uid,
      email: e.trim(),
      name: n.trim(),
      phone: phone.trim(),

      // [BUSINESS RULE]
      // Registrasi mandiri selalu menghasilkan role participant.
      role: 'participant',

      // [BUSINESS RULE]
      // Akun peserta baru dibuat dengan status ACTIVE.
      status: 'ACTIVE',
    };

    // [FLOW] Langkah 3 — Simpan profil peserta ke Cloud Firestore.
    await saveUser(u);

    // [FLOW] Langkah 4 — Simpan profil ke state AuthContext.
    setProfile(u);
  };

  /* ===============================================================
     LOGOUT
     =============================================================== */

  /**
   * FUNGSI: logout
   * ----------------------------------------------------------------
   * Tujuan :
   * Mengakhiri sesi Firebase Authentication pengguna.
   *
   * Output :
   * Promise dari proses signOut Firebase Authentication.
   */
  const logout = () => {
    // [FLOW] Akhiri sesi pengguna pada Firebase Authentication.
    return signOut(auth);
  };

  /* ===============================================================
     REFRESH PROFILE
     =============================================================== */

  /**
   * FUNGSI: refresh
   * ----------------------------------------------------------------
   * Tujuan :
   * Memuat ulang profil pengguna dari Cloud Firestore.
   *
   * Proses :
   * Jika Firebase User tersedia, ambil kembali profil berdasarkan
   * UID kemudian perbarui state profile.
   *
   * Output :
   * State profile diperbarui dengan data terbaru dari Firestore.
   */
  const refresh = async () => {
    // [FLOW] Keputusan — hanya muat profil jika Firebase User ada.
    if (firebaseUser) {
      setProfile(
        await getUser(firebaseUser.uid)
      );
    }
  };

  /* ===============================================================
     CONTEXT PROVIDER
     =============================================================== */

  /**
   * Menyediakan state dan fungsi autentikasi kepada seluruh
   * komponen yang berada di dalam AuthProvider.
   */
  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
