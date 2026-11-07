/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 *
 *
 * Fungsi File :
 * Mengelola transaksi pendaftaran kursus dari sisi antarmuka:
 * - Participant melihat kelas yang masih tersedia;
 * - Participant mengirim pendaftaran dengan status PENDING;
 * - Participant membatalkan pendaftaran PENDING;
 * - Admin melihat seluruh pendaftaran;
 * - Admin menyetujui atau menolak pendaftaran;
 * - Menampilkan statistik, kapasitas, status, dan riwayat pendaftaran.
 *
 * Catatan Pembelajaran:
 * File ini merupakan bagian dari source code pembelajaran
 * Project 07 — PPNPCourseRegistration.
 *
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan sebelum proses dilanjutkan
 * [BUSINESS RULE] Aturan bisnis pendaftaran kursus
 * [SECURITY]      Pembatasan berdasarkan role pengguna
 * [TEST POINT]    Titik penting untuk pengujian mahasiswa
 *
 * ================================================================
 */

import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';

import Layout from '../components/Layout';

import {
  Button,
  Card,
} from '../components/UI';

import { useAuth } from '../contexts/AuthContext';

import {
  addRegistration,
  approveRegistration,
  cancelRegistration,
  listClasses,
  listRegistrations,
  rejectRegistration,
} from '../services/firestore';

import {
  CourseClass,
  Registration,
  RegistrationStatus,
} from '../types';

import { colors } from '../utils/theme';


/* ============================================================
   PROJECT 07
   REGISTRATION SCREEN

   P07.19
   ------------------------------------------------------------

   PARTICIPANT:
   - Melihat kelas OPEN.
   - Mengirim pendaftaran.
   - Status awal PENDING.
   - Membatalkan pendaftaran PENDING.
   - Melihat riwayat/status.

   ADMIN:
   - Melihat seluruh pendaftaran.
   - APPROVE menggunakan Firestore Transaction.
   - REJECT pendaftaran.
   - Memantau status.

   APPROVE:
   Registration → APPROVED
   Class.enrolled → +1

   REJECT / CANCEL:
   Tidak mengubah enrolled.
   ============================================================ */


/* ============================================================
   WARNA STATUS
   ============================================================ */

const STATUS_STYLE: Record<
  RegistrationStatus,
  {
    background: string;
    text: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  PENDING: {
    background: '#FFF3D9',
    text: '#A66300',
    icon: 'time-outline',
    label: 'MENUNGGU',
  },

  APPROVED: {
    background: '#E2F7E9',
    text: '#15753A',
    icon: 'checkmark-circle-outline',
    label: 'DISETUJUI',
  },

  REJECTED: {
    background: '#FDE7E7',
    text: '#B42318',
    icon: 'close-circle-outline',
    label: 'DITOLAK',
  },

  COMPLETED: {
    background: '#E7F0FF',
    text: '#245EAA',
    icon: 'ribbon-outline',
    label: 'SELESAI',
  },

  CANCELLED: {
    background: '#EEF0F3',
    text: '#626C7A',
    icon: 'ban-outline',
    label: 'DIBATALKAN',
  },
};


/* ============================================================
   REGISTRATION SCREEN
   ============================================================ */

export default function RegistrationScreen() {
  const { profile } = useAuth();


  /* ----------------------------------------------------------
     STATE DATA
     ---------------------------------------------------------- */

  const [
    registrations,
    setRegistrations,
  ] = useState<Registration[]>([]);

  const [
    classes,
    setClasses,
  ] = useState<CourseClass[]>([]);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(
    null,
  );


  /* ==========================================================
     LOAD DATA

     PENTING:
     Jangan query sebelum profile tersedia.

     Participant hanya membaca registration berdasarkan UID.
     Ini mempertahankan perbaikan RBAC sebelumnya.
     ========================================================== */

  /**
   * FUNGSI: load
   * ----------------------------------------------------------------
   * Memuat data kelas dan pendaftaran sesuai role pengguna.
   *
   * [SECURITY] Participant hanya meminta registration miliknya
   * menggunakan profile.uid; Admin meminta seluruh registration.
   *
   * [TEST POINT] Pastikan query tidak dijalankan sebelum profile tersedia.
   */
  const load = async () => {
    // [VALIDASI] Hindari race-condition ketika profile belum tersedia.
    if (!profile) {
      return;
    }

    setRefreshing(true);

    try {
      /*
       * Classes boleh dibaca user yang sudah login.
       */
      const classData =
        await listClasses();


      /*
       * Registration harus dibaca berdasarkan role.
       */
      let registrationData:
        Registration[] = [];

      // [SECURITY] Query registration dibedakan secara eksplisit menurut role.
      if (
        profile.role ===
        'participant'
      ) {
        registrationData =
          await listRegistrations(
            profile.uid,
          );
      } else if (
        profile.role ===
        'admin'
      ) {
        registrationData =
          await listRegistrations();
      } else {
        throw new Error(
          'Role pengguna tidak dikenali.',
        );
      }

      setClasses(
        classData,
      );

      setRegistrations(
        registrationData,
      );
    } catch (error: any) {
      console.log(
        'REGISTRATION LOAD ERROR:',
        error?.code,
        error?.message,
      );

      Alert.alert(
        'Gagal Memuat Data',
        error?.message ||
          'Data pendaftaran tidak dapat dimuat.',
      );
    } finally {
      setRefreshing(false);
    }
  };


  /* ==========================================================
     REFRESH SAAT SCREEN FOCUS
     ========================================================== */

  useFocusEffect(
    useCallback(() => {
      if (profile) {
        load();
      }
    }, [
      profile?.uid,
      profile?.role,
    ]),
  );


  /* ==========================================================
     KELAS YANG TERSEDIA

     Hanya:
     - status OPEN
     - enrolled < capacity
     ========================================================== */

  /**
   * [BUSINESS RULE]
   * Kelas dapat ditawarkan kepada Participant hanya jika:
   * status OPEN dan enrolled masih di bawah capacity.
   */
  const availableClasses =
    useMemo(() => {
      return classes.filter(
        item =>
          item.status === 'OPEN' &&
          Number(item.enrolled || 0) <
            Number(item.capacity || 0),
      );
    }, [classes]);


  /* ==========================================================
     STATISTIK ADMIN
     ========================================================== */

  const adminStats =
    useMemo(() => {
      return {
        total:
          registrations.length,

        pending:
          registrations.filter(
            item =>
              item.status ===
              'PENDING',
          ).length,

        approved:
          registrations.filter(
            item =>
              item.status ===
              'APPROVED',
          ).length,

        rejected:
          registrations.filter(
            item =>
              item.status ===
              'REJECTED',
          ).length,
      };
    }, [registrations]);


  /* ==========================================================
     CEK APAKAH PESERTA SUDAH MEMILIKI PENDAFTARAN AKTIF
     PADA KELAS YANG SAMA
     ========================================================== */

  /**
   * FUNGSI: hasActiveRegistration
   * ----------------------------------------------------------------
   * Mencegah pendaftaran aktif ganda pada kelas yang sama.
   * REJECTED dan CANCELLED tidak dianggap sebagai pendaftaran aktif.
   */
  const hasActiveRegistration = (
    classId: string,
  ) => {
    return registrations.some(
      item =>
        item.classId === classId &&
        ![
          'REJECTED',
          'CANCELLED',
        ].includes(
          item.status,
        ),
    );
  };


  /* ==========================================================
     PARTICIPANT:
     KIRIM PENDAFTARAN
     ========================================================== */

  /**
   * FUNGSI: applyToClass
   * ----------------------------------------------------------------
   * [FLOW]
   * Cek role → status kelas → kapasitas → duplikat → konfirmasi
   * → addRegistration(PENDING) → reload.
   *
   * [BUSINESS RULE]
   * Pendaftaran baru selalu dimulai dengan status PENDING.
   */
  const applyToClass = (
    courseClass: CourseClass,
  ) => {
    // [SECURITY] Hanya Participant yang boleh mengirim pendaftaran.
    if (
      !profile ||
      profile.role !==
        'participant'
    ) {
      Alert.alert(
        'Akses Ditolak',
        'Pendaftaran kelas hanya dapat dilakukan peserta.',
      );

      return;
    }


    /* --------------------------------------------------------
       VALIDASI STATUS KELAS
       -------------------------------------------------------- */

    if (
      courseClass.status !==
      'OPEN'
    ) {
      Alert.alert(
        'Kelas Tidak Tersedia',
        'Kelas sudah ditutup atau penuh.',
      );

      return;
    }


    /* --------------------------------------------------------
       VALIDASI KAPASITAS
       -------------------------------------------------------- */

    const enrolled =
      Number(
        courseClass.enrolled ||
          0,
      );

    const capacity =
      Number(
        courseClass.capacity ||
          0,
      );

    // [VALIDASI] Kelas harus memiliki kapasitas dan kursi tersisa.
    if (
      capacity <= 0 ||
      enrolled >= capacity
    ) {
      Alert.alert(
        'Kelas Penuh',
        'Tidak ada kursi yang tersedia pada kelas ini.',
      );

      return;
    }


    /* --------------------------------------------------------
       CEK DUPLIKAT
       -------------------------------------------------------- */

    // [BUSINESS RULE] Tolak duplikasi registration aktif pada kelas yang sama.
    if (
      hasActiveRegistration(
        courseClass.id,
      )
    ) {
      Alert.alert(
        'Sudah Terdaftar',
        'Anda sudah memiliki pendaftaran aktif pada kelas ini.',
      );

      return;
    }


    /* --------------------------------------------------------
       KONFIRMASI
       -------------------------------------------------------- */

    Alert.alert(
      'Konfirmasi Pendaftaran',

      `Daftar pada kelas "${courseClass.name}"?`,

      [
        {
          text: 'Batal',
          style: 'cancel',
        },

        {
          text: 'Daftar',

          onPress: async () => {
            try {
              setProcessingId(
                courseClass.id,
              );

              // [FLOW] Simpan transaksi baru dengan status awal PENDING.
              await addRegistration({
                participantId:
                  profile.uid,

                participantName:
                  profile.name,

                participantEmail:
                  profile.email,

                programId:
                  courseClass.programId,

                programName:
                  courseClass.programName,

                classId:
                  courseClass.id,

                className:
                  courseClass.name,

                status:
                  'PENDING',

                note:
                  '',
              });

              Alert.alert(
                'Pendaftaran Berhasil',
                'Pendaftaran telah dikirim dan menunggu verifikasi Administrator.',
              );

              await load();
            } catch (error: any) {
              console.log(
                'APPLY ERROR:',
                error?.code,
                error?.message,
              );

              Alert.alert(
                'Pendaftaran Gagal',
                error?.message ||
                  'Pendaftaran tidak dapat disimpan.',
              );
            } finally {
              setProcessingId(
                null,
              );
            }
          },
        },
      ],
    );
  };


  /* ==========================================================
     ADMIN:
     APPROVE PENDAFTARAN

     approveRegistration() menggunakan Firestore Transaction.

     Registration:
     PENDING → APPROVED

     Class:
     enrolled → enrolled + 1
     status → FULL jika kapasitas tercapai
     ========================================================== */

  /**
   * FUNGSI: approve
   * ----------------------------------------------------------------
   * [SECURITY] Hanya Admin yang dapat melakukan approval.
   * [BUSINESS RULE] approveRegistration() menggunakan Firestore Transaction:
   * Registration PENDING → APPROVED dan Class.enrolled bertambah 1.
   * Status Class dapat menjadi FULL jika kapasitas tercapai.
   */
  const approve = (
    registration: Registration,
  ) => {
    if (
      !profile ||
      profile.role !==
        'admin'
    ) {
      return;
    }

    Alert.alert(
      'Setujui Pendaftaran',

      `Setujui pendaftaran ${registration.participantName} pada kelas "${registration.className}"?`,

      [
        {
          text: 'Batal',
          style: 'cancel',
        },

        {
          text: 'Setujui',

          onPress: async () => {
            try {
              setProcessingId(
                registration.id,
              );

              // [FLOW] Business rule atomik dijalankan di service Firestore.
              const result =
                await approveRegistration(
                  registration.id,
                );

              Alert.alert(
                'Pendaftaran Disetujui',
                `Status berhasil menjadi APPROVED.\n\nKapasitas kelas: ${result.enrolled}/${result.capacity}`,
              );

              await load();
            } catch (error: any) {
              console.log(
                'APPROVE ERROR:',
                error?.code,
                error?.message,
              );

              Alert.alert(
                'Gagal Menyetujui',
                error?.message ||
                  'Pendaftaran tidak dapat disetujui.',
              );

              await load();
            } finally {
              setProcessingId(
                null,
              );
            }
          },
        },
      ],
    );
  };


  /* ==========================================================
     ADMIN:
     REJECT PENDAFTARAN
     ========================================================== */

  /**
   * FUNGSI: reject
   * ----------------------------------------------------------------
   * [SECURITY] Hanya Admin yang dapat menolak pendaftaran.
   * [BUSINESS RULE] REJECT tidak menambah/mengurangi Class.enrolled.
   */
  const reject = (
    registration: Registration,
  ) => {
    if (
      !profile ||
      profile.role !==
        'admin'
    ) {
      return;
    }

    Alert.alert(
      'Tolak Pendaftaran',

      `Tolak pendaftaran ${registration.participantName} pada kelas "${registration.className}"?`,

      [
        {
          text: 'Batal',
          style: 'cancel',
        },

        {
          text: 'Tolak',
          style: 'destructive',

          onPress: async () => {
            try {
              setProcessingId(
                registration.id,
              );

              await rejectRegistration(
                registration.id,
              );

              Alert.alert(
                'Pendaftaran Ditolak',
                'Status pendaftaran berhasil menjadi REJECTED.',
              );

              await load();
            } catch (error: any) {
              console.log(
                'REJECT ERROR:',
                error?.code,
                error?.message,
              );

              Alert.alert(
                'Gagal Menolak',
                error?.message ||
                  'Pendaftaran tidak dapat ditolak.',
              );

              await load();
            } finally {
              setProcessingId(
                null,
              );
            }
          },
        },
      ],
    );
  };


  /* ==========================================================
     PARTICIPANT:
     CANCEL PENDAFTARAN

     Hanya PENDING yang dapat dibatalkan.
     enrolled tidak berubah.
     ========================================================== */

  /**
   * FUNGSI: cancel
   * ----------------------------------------------------------------
   * [SECURITY] Hanya Participant yang dapat membatalkan pendaftarannya.
   * [BUSINESS RULE] Hanya PENDING yang dapat dibatalkan oleh service;
   * pembatalan tidak mengubah Class.enrolled.
   */
  const cancel = (
    registration: Registration,
  ) => {
    if (
      !profile ||
      profile.role !==
        'participant'
    ) {
      return;
    }

    Alert.alert(
      'Batalkan Pendaftaran',

      `Batalkan pendaftaran kelas "${registration.className}"?`,

      [
        {
          text: 'Tidak',
          style: 'cancel',
        },

        {
          text: 'Ya, Batalkan',
          style: 'destructive',

          onPress: async () => {
            try {
              setProcessingId(
                registration.id,
              );

              await cancelRegistration(
                registration.id,
              );

              Alert.alert(
                'Pendaftaran Dibatalkan',
                'Status pendaftaran berhasil menjadi CANCELLED.',
              );

              await load();
            } catch (error: any) {
              console.log(
                'CANCEL ERROR:',
                error?.code,
                error?.message,
              );

              Alert.alert(
                'Gagal Membatalkan',
                error?.message ||
                  'Pendaftaran tidak dapat dibatalkan.',
              );

              await load();
            } finally {
              setProcessingId(
                null,
              );
            }
          },
        },
      ],
    );
  };


  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <Layout
      title={
        profile?.role ===
        'admin'
          ? 'Pendaftaran Peserta'
          : 'Pendaftaran Kursus'
      }
      subtitle={
        profile?.role ===
        'admin'
          ? 'Verifikasi pendaftaran peserta dan pantau kapasitas kelas.'
          : 'Pilih kelas yang tersedia dan pantau status pendaftaran Anda.'
      }
      refreshing={
        refreshing
      }
      onRefresh={
        load
      }
    >

      {/* =====================================================
          ADMIN SUMMARY
          ===================================================== */}

      {profile?.role ===
        'admin' && (
        <>
          <View style={styles.heroAdmin}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="clipboard-outline"
                size={28}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroSmall}>
                VERIFIKASI PENDAFTARAN
              </Text>

              <Text style={styles.heroTitle}>
                Kelola Peserta Kursus
              </Text>

              <Text style={styles.heroText}>
                Setujui atau tolak pendaftaran peserta yang masih menunggu verifikasi.
              </Text>
            </View>
          </View>


          <Text style={styles.section}>
            Ringkasan Pendaftaran
          </Text>

          <View style={styles.statGrid}>
            <MiniStat
              icon="documents-outline"
              label="Total"
              value={adminStats.total}
              background="#EAF2FF"
              iconColor="#245EAA"
            />

            <MiniStat
              icon="time-outline"
              label="Pending"
              value={adminStats.pending}
              background="#FFF3D9"
              iconColor="#A66300"
            />

            <MiniStat
              icon="checkmark-circle-outline"
              label="Approved"
              value={adminStats.approved}
              background="#E2F7E9"
              iconColor="#15753A"
            />

            <MiniStat
              icon="close-circle-outline"
              label="Rejected"
              value={adminStats.rejected}
              background="#FDE7E7"
              iconColor="#B42318"
            />
          </View>
        </>
      )}


      {/* =====================================================
          PARTICIPANT:
          KELAS TERSEDIA
          ===================================================== */}

      {profile?.role ===
        'participant' && (
        <>
          <View style={styles.heroParticipant}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="school-outline"
                size={28}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroSmall}>
                PENDAFTARAN KURSUS
              </Text>

              <Text style={styles.heroTitle}>
                Pilih Kelas Anda
              </Text>

              <Text style={styles.heroText}>
                Pilih kelas OPEN yang masih memiliki kursi tersedia.
              </Text>
            </View>
          </View>


          <Text style={styles.section}>
            Kelas Tersedia
          </Text>


          {availableClasses.length ===
            0 && (
            <Card>
              <View style={styles.empty}>
                <Ionicons
                  name="calendar-outline"
                  size={34}
                  color={colors.muted}
                />

                <Text style={styles.emptyTitle}>
                  Belum Ada Kelas
                </Text>

                <Text style={styles.emptyText}>
                  Saat ini belum ada kelas OPEN dengan kursi tersedia.
                </Text>
              </View>
            </Card>
          )}


          {availableClasses.map(
            courseClass => {
              const enrolled =
                Number(
                  courseClass.enrolled ||
                    0,
                );

              const capacity =
                Number(
                  courseClass.capacity ||
                    0,
                );

              const remaining =
                Math.max(
                  0,
                  capacity -
                    enrolled,
                );

              const alreadyRegistered =
                hasActiveRegistration(
                  courseClass.id,
                );

              return (
                <Card
                  key={
                    courseClass.id
                  }
                >
                  <View style={styles.classHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.program}>
                        {courseClass.programName}
                      </Text>

                      <Text style={styles.heading}>
                        {courseClass.name}
                      </Text>
                    </View>

                    <View style={styles.openBadge}>
                      <Text style={styles.openBadgeText}>
                        OPEN
                      </Text>
                    </View>
                  </View>


                  <InfoRow
                    icon="person-outline"
                    text={
                      courseClass.instructorName ||
                      courseClass.instructor ||
                      'Instruktur belum ditentukan'
                    }
                  />

                  <InfoRow
                    icon="calendar-outline"
                    text={
                      courseClass.schedule ||
                      '-'
                    }
                  />

                  <InfoRow
                    icon="location-outline"
                    text={
                      courseClass.room ||
                      '-'
                    }
                  />


                  <View style={styles.capacityBox}>
                    <View>
                      <Text style={styles.capacityLabel}>
                        Kapasitas
                      </Text>

                      <Text style={styles.capacityValue}>
                        {enrolled}
                        {' / '}
                        {capacity}
                      </Text>
                    </View>

                    <View style={styles.remainingBox}>
                      <Text style={styles.remainingValue}>
                        {remaining}
                      </Text>

                      <Text style={styles.remainingLabel}>
                        kursi tersisa
                      </Text>
                    </View>
                  </View>


                  {alreadyRegistered ? (
                    <View style={styles.registeredBox}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#15753A"
                      />

                      <Text style={styles.registeredText}>
                        Anda sudah memiliki pendaftaran aktif pada kelas ini.
                      </Text>
                    </View>
                  ) : (
                    <Button
                      title={
                        processingId ===
                        courseClass.id
                          ? 'Memproses...'
                          : 'Daftar Kelas'
                      }
                      icon="send-outline"
                      onPress={() =>
                        applyToClass(
                          courseClass,
                        )
                      }
                    />
                  )}
                </Card>
              );
            },
          )}
        </>
      )}


      {/* =====================================================
          DAFTAR / RIWAYAT PENDAFTARAN
          ===================================================== */}

      <Text style={styles.section}>
        {profile?.role ===
        'admin'
          ? 'Semua Pendaftaran'
          : 'Riwayat Pendaftaran'}
      </Text>


      {registrations.length ===
        0 && (
        <Card>
          <View style={styles.empty}>
            <Ionicons
              name="document-text-outline"
              size={34}
              color={colors.muted}
            />

            <Text style={styles.emptyTitle}>
              Belum Ada Pendaftaran
            </Text>

            <Text style={styles.emptyText}>
              {profile?.role ===
              'admin'
                ? 'Belum ada peserta yang mengirim pendaftaran.'
                : 'Anda belum memiliki riwayat pendaftaran kursus.'}
            </Text>
          </View>
        </Card>
      )}


      {registrations.map(
        registration => {
          const status =
            STATUS_STYLE[
              registration.status
            ];

          return (
            <Card
              key={
                registration.id
              }
            >
              <View style={styles.registrationHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.program}>
                    {registration.programName}
                  </Text>

                  <Text style={styles.heading}>
                    {registration.className}
                  </Text>
                </View>


                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        status.background,
                    },
                  ]}
                >
                  <Ionicons
                    name={status.icon}
                    size={13}
                    color={status.text}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          status.text,
                      },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              </View>


              {profile?.role ===
                'admin' && (
                <View style={styles.participantBox}>
                  <View style={styles.avatar}>
                    <Ionicons
                      name="person"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.participantName}>
                      {registration.participantName}
                    </Text>

                    <Text style={styles.participantEmail}>
                      {registration.participantEmail}
                    </Text>
                  </View>
                </View>
              )}


              {/* ADMIN ACTION */}

              {profile?.role ===
                'admin' &&
                registration.status ===
                  'PENDING' && (
                  <View style={styles.actionArea}>
                    <Button
                      title={
                        processingId ===
                        registration.id
                          ? 'Memproses...'
                          : 'Setujui'
                      }
                      kind="secondary"
                      icon="checkmark-circle-outline"
                      onPress={() =>
                        approve(
                          registration,
                        )
                      }
                    />

                    <Button
                      title="Tolak"
                      kind="danger"
                      icon="close-circle-outline"
                      onPress={() =>
                        reject(
                          registration,
                        )
                      }
                    />
                  </View>
                )}


              {/* PARTICIPANT ACTION */}

              {profile?.role ===
                'participant' &&
                registration.status ===
                  'PENDING' && (
                  <View style={styles.actionArea}>
                    <Button
                      title={
                        processingId ===
                        registration.id
                          ? 'Memproses...'
                          : 'Batalkan Pendaftaran'
                      }
                      kind="light"
                      icon="close-circle-outline"
                      onPress={() =>
                        cancel(
                          registration,
                        )
                      }
                    />
                  </View>
                )}


              {/* INFORMASI STATUS */}

              {registration.status ===
                'APPROVED' && (
                <View style={styles.successInfo}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#15753A"
                  />

                  <Text style={styles.successInfoText}>
                    Pendaftaran telah disetujui Administrator.
                  </Text>
                </View>
              )}


              {registration.status ===
                'REJECTED' && (
                <View style={styles.rejectInfo}>
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color="#B42318"
                  />

                  <Text style={styles.rejectInfoText}>
                    Pendaftaran tidak disetujui Administrator.
                  </Text>
                </View>
              )}


              {registration.status ===
                'CANCELLED' && (
                <View style={styles.cancelInfo}>
                  <Ionicons
                    name="ban-outline"
                    size={18}
                    color="#626C7A"
                  />

                  <Text style={styles.cancelInfoText}>
                    Pendaftaran telah dibatalkan.
                  </Text>
                </View>
              )}
            </Card>
          );
        },
      )}

    </Layout>
  );
}


/* ============================================================
   COMPONENT:
   MINI STAT ADMIN
   ============================================================ */

function MiniStat({
  icon,
  label,
  value,
  background,
  iconColor,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  background: string;
  iconColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor:
              background,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={iconColor}
        />
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}


/* ============================================================
   COMPONENT:
   INFORMASI KELAS
   ============================================================ */

function InfoRow({
  icon,
  text,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={16}
        color={colors.muted}
      />

      <Text style={styles.infoText}>
        {text}
      </Text>
    </View>
  );
}


/* ============================================================
   STYLE
   ============================================================ */

const styles = StyleSheet.create({
  heroAdmin: {
    backgroundColor:
      colors.primary,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 12,
  },

  heroParticipant: {
    backgroundColor:
      colors.primary,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 12,
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor:
      'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroContent: {
    flex: 1,
  },

  heroSmall: {
    color:
      'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
  },

  heroText: {
    color:
      'rgba(255,255,255,0.88)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  section: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 12,
    marginBottom: 10,
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 6,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#EDF0F4',
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statValue: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },

  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },

  registrationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },

  program: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },

  heading: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },

  openBadge: {
    backgroundColor: '#DFF7E7',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  openBadgeText: {
    color: '#15753A',
    fontSize: 9,
    fontWeight: '900',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 9,
    fontWeight: '900',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },

  infoText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  capacityBox: {
    backgroundColor: '#F6F9FD',
    borderRadius: 13,
    padding: 11,
    marginTop: 8,
    marginBottom: 11,
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  capacityLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },

  capacityValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },

  remainingBox: {
    alignItems: 'flex-end',
  },

  remainingValue: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },

  remainingLabel: {
    color: colors.muted,
    fontSize: 9,
  },

  registeredBox: {
    backgroundColor: '#EAF8EF',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  registeredText: {
    flex: 1,
    color: '#15753A',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },

  participantBox: {
    backgroundColor: '#F6F9FD',
    borderRadius: 13,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 3,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E7F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  participantName: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 13,
  },

  participantEmail: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },

  actionArea: {
    marginTop: 11,
    gap: 7,
  },

  successInfo: {
    backgroundColor: '#EAF8EF',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },

  successInfoText: {
    flex: 1,
    color: '#15753A',
    fontSize: 11,
    fontWeight: '700',
  },

  rejectInfo: {
    backgroundColor: '#FDECEC',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },

  rejectInfoText: {
    flex: 1,
    color: '#B42318',
    fontSize: 11,
    fontWeight: '700',
  },

  cancelInfo: {
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },

  cancelInfoText: {
    flex: 1,
    color: '#626C7A',
    fontSize: 11,
    fontWeight: '700',
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 15,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 7,
  },

  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
});