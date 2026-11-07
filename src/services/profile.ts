/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * N
 * Fungsi File :
 * - Menangani edit profil mandiri milik Participant.
 * - Membersihkan UID, nama, dan nomor HP sebelum validasi.
 * - Memvalidasi nama dan format nomor HP.
 * - Memastikan dokumen pengguna tersedia di Firestore.
 * - Memastikan pengguna ber-role participant dan berstatus ACTIVE.
 * - Membatasi field update hanya pada name dan phone.
 *
 * Catatan Pembelajaran:
 * File ini merupakan bagian dari source code pembelajaran
 * Project 07 — PPNPCourseRegistration.
 *
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan input/data
 * [BUSINESS RULE] Aturan bisnis edit profil
 * [SECURITY]      Pembatasan field dan hak perubahan data
 * [TEST POINT]    Titik penting untuk pengujian mahasiswa
 *
 * ================================================================
 */

import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../config/firebase';

/**
 * FUNGSI: updateParticipantProfile
 * ----------------------------------------------------------------
 * Tujuan:
 * Memperbarui data profil yang memang boleh diedit sendiri oleh
 * Participant.
 *
 * Input  : uid, name, phone.
 * Proses : Trim → validasi input → baca user → validasi role/status
 *          → update hanya name dan phone.
 * Output : uid, name, phone yang sudah dibersihkan.
 *
 * [BUSINESS RULE]
 * Edit mandiri Participant hanya boleh mengubah name dan phone.
 *
 * [SECURITY]
 * Email, role, status, UID, photoUrl, dan createdAt tidak dikirim
 * pada operasi update ini.
 */
export const updateParticipantProfile = async (
  uid: string,
  name: string,
  phone: string,
) => {
  // [FLOW] Normalisasi input untuk menghindari spasi di awal/akhir.
  const cleanUid = uid.trim();
  const cleanName = name.trim();
  const cleanPhone = phone.trim();

  // [VALIDASI] UID wajib tersedia agar dokumen user dapat dituju.
  if (!cleanUid) {
    throw new Error('UID pengguna tidak valid.');
  }

  // [VALIDASI] Nama lengkap minimal tiga karakter.
  if (cleanName.length < 3) {
    throw new Error(
      'Nama lengkap minimal terdiri dari 3 karakter.'
    );
  }

  // [VALIDASI] Nomor HP harus 10–15 digit angka tanpa karakter lain.
  if (!/^\d{10,15}$/.test(cleanPhone)) {
    throw new Error(
      'Nomor HP harus berupa 10 sampai 15 digit angka.'
    );
  }

  // [FLOW] Bentuk referensi ke dokumen users/{uid}.
  const userRef = doc(
    db,
    'users',
    cleanUid,
  );

  // [FLOW] Baca data terbaru sebelum memberikan izin edit.
  const snapshot =
    await getDoc(userRef);

  // [VALIDASI] Edit tidak boleh dilanjutkan jika user tidak ditemukan.
  if (!snapshot.exists()) {
    throw new Error(
      'Data pengguna tidak ditemukan.'
    );
  }

  const currentData =
    snapshot.data();

  // [BUSINESS RULE] Edit profil mandiri hanya untuk Participant.
  if (currentData.role !== 'participant') {
    throw new Error(
      'Edit profil mandiri hanya diperbolehkan untuk Participant.'
    );
  }

  // [BUSINESS RULE] Akun nonaktif tidak boleh mengubah profil.
  if (currentData.status !== 'ACTIVE') {
    throw new Error(
      'Akun nonaktif tidak dapat mengubah profil.'
    );
  }

  /**
   * [SECURITY]
   * Field whitelist: operasi update HANYA mengirim name dan phone.
   * Field sensitif/terkontrol seperti role, status, email, UID,
   * photoUrl, dan createdAt tidak ikut dikirim.
   */
  await updateDoc(
    userRef,
    {
      name: cleanName,
      phone: cleanPhone,
    },
  );

  // [TEST POINT] Hasil sukses mengembalikan data yang sudah dinormalisasi.
  return {
    uid: cleanUid,
    name: cleanName,
    phone: cleanPhone,
  };
};
