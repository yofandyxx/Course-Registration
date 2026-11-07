/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * Nama File   : HomeScreens.tsx
 * Lokasi      : src/screens/HomeScreens.tsx
 *
 * Teknologi   : React Native + TypeScript + Expo
 * Backend     : Cloud Firestore
 * Context     : AuthContext
 *
 * Pembuat     : Amrizal, S.Kom, M.Kom
 *
 * Fungsi File :
 * Menampilkan Dashboard aplikasi berdasarkan role pengguna.
 *
 * Catatan Pembelajaran:
 * - [FLOW]          Menandai alur proses utama.
 * - [VALIDASI]      Menandai pemeriksaan data/kondisi.
 * - [BUSINESS RULE] Menandai aturan aplikasi.
 * - [SECURITY]      Menandai pembatasan akses berdasarkan role.
 * - [TEST POINT]    Menandai bagian penting untuk pengujian.
 *
 * PENTING:
 * Source ini mempertahankan logika FINAL Teaching Baseline.
 * Perapian hanya menambah struktur dan komentar pembelajaran.
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
  Stat,
} from '../components/UI';

import { useAuth } from '../contexts/AuthContext';

import {
  listClasses,
  listInstructors,
  listPrograms,
  listRegistrations,
  listUsers,
  seedDemo,
} from '../services/firestore';

import {
  CourseClass,
  CourseProgram,
  Instructor,
  Registration,
} from '../types';

import { colors } from '../utils/theme';


/* ============================================================
   MASTER RUANGAN

   Harus sama dengan pilihan ruangan pada ClassScreen.
   ============================================================ */

const ROOMS = [
  'Laboratorium Komputer 1',
  'Laboratorium Komputer 2',
  'Laboratorium Jaringan',
  'Ruang Multimedia',
  'Ruang Pelatihan',
];


/* ============================================================
   TYPE STATISTIK
   ============================================================ */

interface DashboardStats {
  programs: number;
  classes: number;
  regs: number;
  users: number;

  openClasses: number;
  fullClasses: number;
  pendingRegs: number;
  activeInstructors: number;
}


/* ============================================================
   NILAI AWAL STATISTIK
   ============================================================ */

const INITIAL_STATS: DashboardStats = {
  programs: 0,
  classes: 0,
  regs: 0,
  users: 0,

  openClasses: 0,
  fullClasses: 0,
  pendingRegs: 0,
  activeInstructors: 0,
};


/* ============================================================
   DASHBOARD SCREEN
   ============================================================ */

export function DashboardScreen() {
  const { profile } = useAuth();


  /* ----------------------------------------------------------
     DATA DASHBOARD
     ---------------------------------------------------------- */

  const [
    stats,
    setStats,
  ] = useState<DashboardStats>(
    INITIAL_STATS,
  );

  const [
    classes,
    setClasses,
  ] = useState<CourseClass[]>([]);

  const [
    programs,
    setPrograms,
  ] = useState<CourseProgram[]>([]);

  const [
    registrations,
    setRegistrations,
  ] = useState<Registration[]>([]);

  const [
    instructors,
    setInstructors,
  ] = useState<Instructor[]>([]);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  /* ==========================================================
     LOAD DATA DASHBOARD

     PENTING:
     Jangan melakukan query sebelum profile tersedia.

     Ini mempertahankan perbaikan race-condition dari
     pengujian sebelumnya.
     ========================================================== */

  const load = async () => {
    // [VALIDASI] Jangan query sebelum profile tersedia.
    // [TEST POINT] Guard ini mencegah race-condition saat profile belum siap.
    if (!profile) {
      return;
    }

    setRefreshing(true);

    try {

      /* ------------------------------------------------------
         Program, kelas, dan instruktur dapat dibaca oleh
         pengguna yang sudah login sesuai Firestore Rules.
         ------------------------------------------------------ */

      const [
        programData,
        classData,
        instructorData,
      ] = await Promise.all([
        listPrograms(),
        listClasses(),
        listInstructors(),
      ]);


      /* ------------------------------------------------------
         PENDAFTARAN BERDASARKAN ROLE

         Participant:
         hanya query registration miliknya.

         Admin:
         membaca seluruh registration.

         Bagian ini TIDAK BOLEH dikembalikan ke query
         tanpa filter untuk participant.
         ------------------------------------------------------ */

      let registrationData:
        Registration[] = [];

      // [BUSINESS RULE] Participant hanya mengambil registration miliknya.
      if (
        profile.role ===
        'participant'
      ) {
        registrationData =
          await listRegistrations(
            profile.uid,
          );
      // [SECURITY] Admin menggunakan query seluruh registration.
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


      /* ------------------------------------------------------
         USER MANAGEMENT HANYA ADMIN
         ------------------------------------------------------ */

      let totalUsers = 0;

      // [BUSINESS RULE] Data seluruh pengguna hanya dibutuhkan Dashboard Admin.
      if (
        profile.role ===
        'admin'
      ) {
        const userData =
          await listUsers();

        totalUsers =
          userData.length;
      }


      /* ------------------------------------------------------
         HITUNG STATISTIK
         ------------------------------------------------------ */

      const openClasses =
        classData.filter(
          item =>
            item.status ===
            'OPEN',
        ).length;

      const fullClasses =
        classData.filter(
          item =>
            item.status ===
            'FULL',
        ).length;

      const pendingRegs =
        registrationData.filter(
          item =>
            item.status ===
            'PENDING',
        ).length;

      const activeInstructors =
        instructorData.filter(
          item =>
            item.status ===
            'ACTIVE',
        ).length;


      /* ------------------------------------------------------
         SIMPAN DATA KE STATE
         ------------------------------------------------------ */

      setPrograms(
        programData,
      );

      setClasses(
        classData,
      );

      setRegistrations(
        registrationData,
      );

      setInstructors(
        instructorData,
      );

      setStats({
        programs:
          programData.length,

        classes:
          classData.length,

        regs:
          registrationData.length,

        users:
          totalUsers,

        openClasses,

        fullClasses,

        pendingRegs,

        activeInstructors,
      });

    } catch (error: any) {

      console.log(
        'DASHBOARD LOAD ERROR:',
        error?.code,
        error?.message,
      );

      Alert.alert(
        'Gagal Memuat Dashboard',
        error?.message
          || 'Data dashboard tidak dapat dimuat.',
      );

    } finally {

      // [FLOW] Refresh dihentikan baik proses berhasil maupun gagal.
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
     SEED PROGRAM DEMO
     ========================================================== */

  const handleSeedDemo =
    async () => {

      // [SECURITY] Seed demo hanya boleh dijalankan Administrator.
      if (
        !profile
        || profile.role !==
        'admin'
      ) {
        Alert.alert(
          'Akses Ditolak',
          'Fitur ini hanya dapat digunakan Administrator.',
        );

        return;
      }

      try {

        // [FLOW] Jalankan service pembuatan data demo.
        const success =
          await seedDemo();

        if (success) {

          Alert.alert(
            'Berhasil',
            'Data program kursus demo berhasil ditambahkan.',
          );

        } else {

          Alert.alert(
            'Informasi',
            'Program kursus sudah memiliki data.',
          );

        }

        await load();

      } catch (error: any) {

        Alert.alert(
          'Gagal',
          error?.message
            || 'Data demo tidak dapat ditambahkan.',
        );

      }
    };


  /* ==========================================================
     PENGGUNAAN RUANGAN

     Menghitung berapa kelas yang menggunakan setiap ruangan.
     ========================================================== */

  const roomUsage =
    useMemo(() => {

      return ROOMS.map(room => {

        const total =
          classes.filter(
            item =>
              item.room === room,
          ).length;

        return {
          room,
          total,
        };
      });

    }, [classes]);


  /* ==========================================================
     NILAI TERBESAR PENGGUNAAN RUANG

     Digunakan untuk menentukan panjang progress bar.
     ========================================================== */

  const maxRoomUsage =
    useMemo(() => {

      const values =
        roomUsage.map(
          item =>
            item.total,
        );

      return Math.max(
        1,
        ...values,
      );

    }, [roomUsage]);


  /* ==========================================================
     KELAS AKTIF / TERSEDIA

     Untuk sementara menampilkan maksimal 3 kelas yang
     berstatus OPEN.
     ========================================================== */

  const activeClasses =
    useMemo(() => {

      return classes
        .filter(
          item =>
            item.status ===
            'OPEN',
        )
        .slice(0, 3);

    }, [classes]);


  /* ==========================================================
     PROGRAM AKTIF UNTUK PARTICIPANT
     ========================================================== */

  const activePrograms =
    useMemo(() => {

      return programs
        .filter(
          item =>
            item.status ===
            'ACTIVE',
        )
        .slice(0, 3);

    }, [programs]);


  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <Layout
      title={
        `Halo, ${
          profile?.name
          || 'Pengguna'
        }`
      }
      subtitle={
        profile?.role ===
        'admin'
          ? 'Dashboard Administrator • PPNP Course Registration'
          : 'Temukan kelas dan pantau pendaftaran kursus Anda.'
      }
      refreshing={
        refreshing
      }
      onRefresh={
        load
      }
    >

      {/* =====================================================
          HERO
          ===================================================== */}

      <View style={styles.hero}>

        <View style={styles.heroIcon}>
          <Ionicons
            name="school"
            size={29}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.heroContent}>

          <Text style={styles.heroSmall}>
            PPNP COURSE REGISTRATION
          </Text>

          <Text style={styles.heroTitle}>
            {profile?.role ===
            'admin'
              ? 'Pusat Kendali Kursus'
              : 'Portal Peserta Kursus'}
          </Text>

          <Text style={styles.heroDescription}>
            {profile?.role ===
            'admin'
              ? 'Pantau program, kelas, instruktur, peserta, dan pendaftaran dari satu dashboard.'
              : 'Pilih kelas yang tersedia dan pantau proses pendaftaran Anda.'}
          </Text>

        </View>

      </View>


      {/* =====================================================
          STATISTIK UTAMA
          ===================================================== */}

      <Text style={styles.sectionTitle}>
        Ringkasan
      </Text>

      <View style={styles.grid}>

        <Stat
          icon="school-outline"
          value={stats.programs}
          label="Program Kursus"
        />

        <Stat
          icon="calendar-outline"
          value={stats.classes}
          label="Kelas"
        />

        <Stat
          icon="clipboard-outline"
          value={stats.regs}
          label={
            profile?.role ===
            'admin'
              ? 'Pendaftaran'
              : 'Pendaftaran Saya'
          }
        />

        {profile?.role ===
          'admin' && (

          <Stat
            icon="people-outline"
            value={stats.users}
            label="Pengguna"
          />

        )}

      </View>


      {/* =====================================================
          DASHBOARD KHUSUS ADMIN
          ===================================================== */}

      {profile?.role ===
        'admin' && (
        <>

          {/* STATUS OPERASIONAL */}

          <Text style={styles.sectionTitle}>
            Status Operasional
          </Text>

          <Card>

            <OperationalRow
              icon="checkmark-circle"
              label="Kelas Open"
              value={
                stats.openClasses
              }
              iconColor="#16803A"
              background="#E6F7EC"
            />

            <OperationalRow
              icon="alert-circle"
              label="Kelas Full"
              value={
                stats.fullClasses
              }
              iconColor="#B86A00"
              background="#FFF3DD"
            />

            <OperationalRow
              icon="time"
              label="Menunggu Verifikasi"
              value={
                stats.pendingRegs
              }
              iconColor="#B05B00"
              background="#FFF0E1"
            />

            <OperationalRow
              icon="person"
              label="Instruktur Aktif"
              value={
                stats.activeInstructors
              }
              iconColor="#1D63C6"
              background="#E8F1FF"
              last
            />

          </Card>


          {/* PENGGUNAAN RUANG */}

          <Text style={styles.sectionTitle}>
            Penggunaan Ruangan
          </Text>

          <Card>

            <View style={styles.cardTitleRow}>

              <View style={styles.cardIcon}>
                <Ionicons
                  name="business-outline"
                  size={21}
                  color={colors.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heading}>
                  Distribusi Kelas
                </Text>

                <Text style={styles.descriptionSmall}>
                  Jumlah kelas berdasarkan ruangan.
                </Text>
              </View>

            </View>


            {roomUsage.map(
              item => {

                const width =
                  `${
                    (
                      item.total
                      / maxRoomUsage
                    )
                    * 100
                  }%`;

                return (
                  <View
                    key={item.room}
                    style={
                      styles.roomItem
                    }
                  >

                    <View
                      style={
                        styles.roomHeader
                      }
                    >
                      <Text
                        style={
                          styles.roomName
                        }
                      >
                        {item.room}
                      </Text>

                      <Text
                        style={
                          styles.roomCount
                        }
                      >
                        {item.total}
                      </Text>
                    </View>


                    <View
                      style={
                        styles.progressTrack
                      }
                    >
                      {item.total >
                        0 && (

                        <View
                          style={[
                            styles.progressFill,
                            {
                              width:
                                width as any,
                            },
                          ]}
                        />

                      )}
                    </View>

                  </View>
                );
              },
            )}

          </Card>


          {/* SEED DATA */}

          <Text style={styles.sectionTitle}>
            Data Praktikum
          </Text>

          <Card>

            <View style={styles.cardTitleRow}>

              <View style={styles.seedIcon}>
                <Ionicons
                  name="sparkles-outline"
                  size={21}
                  color="#B86A00"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heading}>
                  Seed Program Demo
                </Text>

                <Text style={styles.descriptionSmall}>
                  Membuat tiga program kursus contoh jika collection program masih kosong.
                </Text>
              </View>

            </View>

            <Button
              title="Seed Program Demo"
              icon="sparkles-outline"
              onPress={
                handleSeedDemo
              }
            />

          </Card>

        </>
      )}


      {/* =====================================================
          KELAS TERSEDIA
          ADMIN DAN PARTICIPANT
          ===================================================== */}

      <Text style={styles.sectionTitle}>
        {profile?.role ===
        'admin'
          ? 'Kelas Aktif'
          : 'Kelas Tersedia'}
      </Text>


      {activeClasses.length ===
        0 ? (

        <Card>
          <Text style={styles.emptyText}>
            Belum ada kelas berstatus OPEN.
          </Text>
        </Card>

      ) : (

        activeClasses.map(
          item => (

          <Card key={item.id}>

            <View style={styles.classHeader}>

              <View style={{ flex: 1 }}>

                <Text style={styles.classProgram}>
                  {item.programName}
                </Text>

                <Text style={styles.heading}>
                  {item.name}
                </Text>

              </View>


              <View style={styles.openBadge}>
                <Text style={styles.openBadgeText}>
                  OPEN
                </Text>
              </View>

            </View>


            <DashboardInfoRow
              icon="person-outline"
              text={
                item.instructorName
                || item.instructor
                || '-'
              }
            />

            <DashboardInfoRow
              icon="calendar-outline"
              text={
                item.schedule
                || '-'
              }
            />

            <DashboardInfoRow
              icon="location-outline"
              text={
                item.room
                || '-'
              }
            />


            <View style={styles.capacityRow}>

              <Text style={styles.capacityText}>
                Peserta
              </Text>

              <Text style={styles.capacityValue}>
                {item.enrolled}
                {' / '}
                {item.capacity}
              </Text>

            </View>

          </Card>

        ))

      )}


      {/* =====================================================
          PROGRAM UNTUK PARTICIPANT
          ===================================================== */}

      {profile?.role ===
        'participant' && (
        <>

          <Text style={styles.sectionTitle}>
            Program Kursus
          </Text>

          {activePrograms.map(
            item => (

            <Card key={item.id}>

              <Text style={styles.classProgram}>
                {item.code}
              </Text>

              <Text style={styles.heading}>
                {item.name}
              </Text>

              <Text style={styles.description}>
                {item.description}
              </Text>

              <View style={styles.programMeta}>

                <View style={styles.metaPill}>
                  <Ionicons
                    name="bar-chart-outline"
                    size={14}
                    color={colors.primary}
                  />

                  <Text style={styles.metaText}>
                    {item.level}
                  </Text>
                </View>


                <View style={styles.metaPill}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={colors.primary}
                  />

                  <Text style={styles.metaText}>
                    {item.duration}
                  </Text>
                </View>

              </View>

            </Card>

          ))}

        </>
      )}


      {/* =====================================================
          ALUR PROJECT
          ===================================================== */}

      <Text style={styles.sectionTitle}>
        Alur Sistem
      </Text>

      <Card>

        <View style={styles.flowRow}>

          <FlowStep
            number="1"
            label="Pilih Kelas"
          />

          <FlowArrow />

          <FlowStep
            number="2"
            label="Daftar"
          />

          <FlowArrow />

          <FlowStep
            number="3"
            label="Verifikasi"
          />

          <FlowArrow />

          <FlowStep
            number="4"
            label="Selesai"
          />

        </View>

      </Card>

    </Layout>
  );
}


/* ============================================================
   COMPONENT KECIL:
   STATUS OPERASIONAL
   ============================================================ */

function OperationalRow({
  icon,
  label,
  value,
  iconColor,
  background,
  last = false,
}: {
  icon: any;
  label: string;
  value: number;
  iconColor: string;
  background: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.operationalRow,
        last
        && styles.operationalRowLast,
      ]}
    >

      <View
        style={[
          styles.operationalIcon,
          {
            backgroundColor:
              background,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <Text style={styles.operationalLabel}>
        {label}
      </Text>

      <Text style={styles.operationalValue}>
        {value}
      </Text>

    </View>
  );
}


/* ============================================================
   COMPONENT KECIL:
   INFORMASI KELAS
   ============================================================ */

function DashboardInfoRow({
  icon,
  text,
}: {
  icon: any;
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
   COMPONENT KECIL:
   ALUR SISTEM
   ============================================================ */

function FlowStep({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <View style={styles.flowStep}>

      <View style={styles.flowCircle}>
        <Text style={styles.flowNumber}>
          {number}
        </Text>
      </View>

      <Text style={styles.flowLabel}>
        {label}
      </Text>

    </View>
  );
}


function FlowArrow() {
  return (
    <Ionicons
      name="chevron-forward"
      size={16}
      color="#AAB4C2"
    />
  );
}


/* ============================================================
   STYLE
   ============================================================ */

const styles = StyleSheet.create({

  /* ----------------------------------------------------------
     HERO
     ---------------------------------------------------------- */

  hero: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    marginBottom: 17,
  },

  heroIcon: {
    width: 55,
    height: 55,
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
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
  },

  heroDescription: {
    color:
      'rgba(255,255,255,0.88)',
    lineHeight: 18,
    fontSize: 12,
    marginTop: 4,
  },


  /* ----------------------------------------------------------
     SECTION
     ---------------------------------------------------------- */

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
    marginTop: 5,
    marginBottom: 9,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 13,
  },

  heading: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },

  description: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 6,
  },

  descriptionSmall: {
    color: colors.muted,
    lineHeight: 18,
    marginTop: 3,
    fontSize: 12,
  },


  /* ----------------------------------------------------------
     CARD TITLE
     ---------------------------------------------------------- */

  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 13,
  },

  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  seedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF2D9',
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ----------------------------------------------------------
     STATUS OPERASIONAL
     ---------------------------------------------------------- */

  operationalRow: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF0F4',
  },

  operationalRowLast: {
    borderBottomWidth: 0,
  },

  operationalIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  operationalLabel: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
  },

  operationalValue: {
    minWidth: 30,
    textAlign: 'right',
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },


  /* ----------------------------------------------------------
     RUANGAN
     ---------------------------------------------------------- */

  roomItem: {
    marginBottom: 13,
  },

  roomHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginBottom: 6,
  },

  roomName: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    paddingRight: 10,
  },

  roomCount: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
  },

  progressTrack: {
    height: 7,
    backgroundColor: '#EDF1F6',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 10,
  },


  /* ----------------------------------------------------------
     KELAS
     ---------------------------------------------------------- */

  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },

  classProgram: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 11,
    marginBottom: 3,
  },

  openBadge: {
    backgroundColor: '#DFF7E7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  openBadgeText: {
    color: '#15753A',
    fontWeight: '900',
    fontSize: 9,
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

  capacityRow: {
    marginTop: 7,
    backgroundColor: '#F6F9FD',
    borderRadius: 11,
    padding: 10,
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  capacityText: {
    color: colors.muted,
    fontSize: 11,
  },

  capacityValue: {
    color: colors.text,
    fontWeight: '900',
  },


  /* ----------------------------------------------------------
     PROGRAM
     ---------------------------------------------------------- */

  programMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 11,
  },

  metaPill: {
    backgroundColor: '#EEF4FF',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  metaText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },


  /* ----------------------------------------------------------
     FLOW
     ---------------------------------------------------------- */

  flowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
  },

  flowStep: {
    width: 54,
    alignItems: 'center',
  },

  flowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },

  flowNumber: {
    color: colors.primary,
    fontWeight: '900',
  },

  flowLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },


  /* ----------------------------------------------------------
     EMPTY
     ---------------------------------------------------------- */

  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },

});