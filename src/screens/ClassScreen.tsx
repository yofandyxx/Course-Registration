/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 *
 *
 * Fungsi File :
 * - Menampilkan daftar jadwal dan kelas kursus.
 * - Memisahkan hak akses Admin dan Participant.
 * - Mengelola tambah, edit, buka/tutup, dan hapus kelas untuk Admin.
 * - Melakukan validasi jadwal, periode, ruangan, instruktur, dan kapasitas.
 * - Menampilkan statistik, pencarian, filter, serta ketersediaan kursi.
 *
 * Catatan Pembelajaran:
 * File ini merupakan bagian dari source code pembelajaran
 * Project 07 — PPNPCourseRegistration.
 *
 * Fokus pembelajaran:
 * [FLOW] alur data dan proses layar
 * [VALIDASI] pemeriksaan input sebelum penyimpanan
 * [BUSINESS RULE] aturan bisnis kelas dan kapasitas
 * [SECURITY] pembatasan aksi berdasarkan role
 * [TEST POINT] titik penting untuk pengujian
 *
 */

import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
} from '@react-navigation/native';

import Layout from '../components/Layout';

import {
  Button,
  Card,
  Input,
} from '../components/UI';

import {
  useAuth,
} from '../contexts/AuthContext';

import {
  addClass,
  deleteClassSafely,
  listClasses,
  listInstructors,
  listPrograms,
  updateClass,
} from '../services/firestore';

import {
  CourseClass,
  CourseProgram,
  Instructor,
} from '../types';


/* ============================================================
   MASTER DATA
   ============================================================ */

const DAYS = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

const ROOMS = [
  'Laboratorium Komputer 1',
  'Laboratorium Komputer 2',
  'Laboratorium Jaringan',
  'Ruang Multimedia',
  'Ruang Pelatihan',
];


/* ============================================================
   WARNA BERDASARKAN ROLE

   Admin:
   Navy + Blue

   Participant:
   Indigo + Teal
   ============================================================ */

const ADMIN = {
  primary: '#173B67',
  secondary: '#2F6BFF',
  soft: '#EAF2FF',

  text: '#172033',
  muted: '#687386',

  success: '#16845B',
  warning: '#B66A00',
  danger: '#C43D4D',

  border: '#E3E9F2',
};

const PARTICIPANT = {
  primary: '#5546C8',
  secondary: '#0F9D8A',

  soft: '#EFEDFF',
  softTeal: '#E5F8F4',

  text: '#1D2135',
  muted: '#70758A',

  border: '#E7E5F3',
};


/* ============================================================
   TYPE
   ============================================================ */

type FilterStatus =
  | 'ALL'
  | 'OPEN'
  | 'FULL'
  | 'CLOSED';

type SelectorType =
  | 'PROGRAM'
  | 'INSTRUCTOR'
  | 'ROOM'
  | null;


/* ============================================================
   FORM
   ============================================================ */

interface ClassForm {
  programId: string;

  name: string;

  instructorId: string;

  days: string[];

  startTime: string;

  endTime: string;

  room: string;

  capacity: string;
}


const INITIAL_FORM: ClassForm = {
  programId: '',

  name: '',

  instructorId: '',

  days: [],

  startTime: '08:00',

  endTime: '10:00',

  room: '',

  capacity: '20',
};


/* ============================================================
   HELPER TANGGAL
   ============================================================ */

function toDateString(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}


/* ------------------------------------------------------------
   Mengubah:
   2026-10-15

   menjadi object Date.
   ------------------------------------------------------------ */

function fromDateString(
  value?: string,
) {
  if (!value) {
    return new Date();
  }

  const parts =
    value
      .split('-')
      .map(Number);

  if (
    parts.length !== 3
    || parts.some(
      Number.isNaN,
    )
  ) {
    return new Date();
  }

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2],
  );
}


/* ------------------------------------------------------------
   Format tanggal Indonesia
   ------------------------------------------------------------ */

function formatDateDisplay(
  date: Date,
) {
  return date.toLocaleDateString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
}


/* ============================================================
   VALIDASI JAM
   ============================================================ */

function isValidTime(
  value: string,
) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/
    .test(value);
}


/* ============================================================
   SCREEN
   ============================================================ */

export default function ClassScreen() {

  const {
    profile,
  } = useAuth();


  /* ----------------------------------------------------------
     ROLE

     Penting:
     Participant tidak mendapatkan tombol administrasi.
     ---------------------------------------------------------- */

  // [SECURITY] Hak administrasi UI hanya diberikan kepada role admin.
  const isAdmin =
    profile?.role === 'admin';

  const theme =
    isAdmin
      ? ADMIN
      : PARTICIPANT;


  /* ==========================================================
     DATA FIRESTORE
     ========================================================== */

  const [
    classes,
    setClasses,
  ] = useState<CourseClass[]>(
    [],
  );

  const [
    programs,
    setPrograms,
  ] = useState<CourseProgram[]>(
    [],
  );

  const [
    instructors,
    setInstructors,
  ] = useState<Instructor[]>(
    [],
  );


  /* ==========================================================
     FORM
     ========================================================== */

  const [
    form,
    setForm,
  ] = useState<ClassForm>(
    INITIAL_FORM,
  );


  /* ==========================================================
     TANGGAL
     ========================================================== */

  const [
    startDate,
    setStartDate,
  ] = useState<Date>(
    new Date(),
  );

  const [
    endDate,
    setEndDate,
  ] = useState<Date>(
    new Date(),
  );


  /* ==========================================================
     DATE PICKER
     ========================================================== */

  const [
    showStartDate,
    setShowStartDate,
  ] = useState(false);

  const [
    showEndDate,
    setShowEndDate,
  ] = useState(false);


  /* ==========================================================
     UI STATE
     ========================================================== */

  const [
    selector,
    setSelector,
  ] = useState<SelectorType>(
    null,
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );

  const [
    queryText,
    setQueryText,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] = useState<FilterStatus>(
    'ALL',
  );

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(
    null,
  );


  /* ==========================================================
     LOAD DATA
     ========================================================== */

  // [FLOW] Memuat kelas, program aktif, dan instruktur aktif dari Firestore.
  // [TEST POINT] Pastikan data tidak di-query sebelum profile tersedia.
  const load = async () => {

    /*
     * Guard ini penting.
     *
     * Jangan melakukan query sebelum profile tersedia.
     */

    if (!profile) {
      return;
    }

    setLoading(true);

    try {

      const [
        classData,
        programData,
        instructorData,
      ] = await Promise.all([

        listClasses(),

        listPrograms(),

        listInstructors(),

      ]);


      setClasses(
        classData,
      );


      /*
       * Hanya program ACTIVE yang dapat
       * dipakai membuat kelas.
       */

      setPrograms(
        programData.filter(
          item =>
            item.status === 'ACTIVE',
        ),
      );


      /*
       * Hanya instruktur ACTIVE yang dapat
       * dipilih untuk kelas.
       */

      setInstructors(
        instructorData.filter(
          item =>
            item.status === 'ACTIVE',
        ),
      );

    } catch (error: any) {

      console.log(
        'LOAD CLASS ERROR:',
        error?.code,
        error?.message,
      );

      Alert.alert(
        'Gagal',
        error?.message
        || 'Data kelas tidak dapat dimuat.',
      );

    } finally {

      setLoading(false);

    }
  };


  /* ==========================================================
     REFRESH SAAT SCREEN AKTIF
     ========================================================== */

  useFocusEffect(

    useCallback(() => {

      load();

    }, [
      profile?.uid,
      profile?.role,
    ]),

  );


  /* ==========================================================
     STATISTIK
     ========================================================== */

  const stats =
    useMemo(() => {

      const open =
        classes.filter(
          item =>
            item.status === 'OPEN',
        ).length;


      const full =
        classes.filter(
          item =>
            item.status === 'FULL',
        ).length;


      const closed =
        classes.filter(
          item =>
            item.status === 'CLOSED',
        ).length;


      const enrolled =
        classes.reduce(
          (
            total,
            item,
          ) =>
            total
            + Number(
              item.enrolled || 0,
            ),
          0,
        );


      const capacity =
        classes.reduce(
          (
            total,
            item,
          ) =>
            total
            + Number(
              item.capacity || 0,
            ),
          0,
        );


      return {

        total:
          classes.length,

        open,

        full,

        closed,

        enrolled,

        capacity,

      };

    }, [
      classes,
    ]);


  /* ==========================================================
     SEARCH + FILTER
     ========================================================== */

  // [FLOW] Search dan filter status dijalankan di sisi client dengan useMemo.
  const shown =
    useMemo(() => {

      const keyword =
        queryText
          .trim()
          .toLowerCase();


      return classes.filter(
        item => {

          /*
           * Filter status.
           */

          if (
            filter !== 'ALL'
            && item.status !== filter
          ) {
            return false;
          }


          /*
           * Tanpa keyword berarti semua data
           * yang lolos filter status ditampilkan.
           */

          if (!keyword) {
            return true;
          }


          const instructor =
            item.instructorName
            || item.instructor
            || '';


          const source = [

            item.name,

            item.programName,

            instructor,

            item.room,

            item.schedule,

            item.status,

          ]
            .join(' ')
            .toLowerCase();


          return source.includes(
            keyword,
          );

        },
      );

    }, [
      classes,
      queryText,
      filter,
    ]);


  /* ==========================================================
     DATA TERPILIH
     ========================================================== */

  const selectedProgram =
    programs.find(
      item =>
        item.id ===
        form.programId,
    );


  const selectedInstructor =
    instructors.find(
      item =>
        item.id ===
        form.instructorId,
    );


  /* ==========================================================
     RESET FORM
     ========================================================== */

  const resetForm = () => {

    setForm(
      INITIAL_FORM,
    );

    setStartDate(
      new Date(),
    );

    setEndDate(
      new Date(),
    );

    setEditingId(
      null,
    );

  };


  const closeForm = () => {

    resetForm();

    setShowForm(
      false,
    );

  };


  /* ==========================================================
     PILIH HARI
     ========================================================== */

  const toggleDay = (
    day: string,
  ) => {

    setForm(
      current => ({

        ...current,

        days:
          current.days.includes(
            day,
          )

            ? current.days.filter(
                item =>
                  item !== day,
              )

            : [
                ...current.days,
                day,
              ],

      }),
    );

  };


  /* ==========================================================
     VALIDASI
     ========================================================== */

  // [VALIDASI] Semua aturan input kelas diperiksa sebelum add/update.
  const validate = () => {

    if (!selectedProgram) {

      Alert.alert(
        'Validasi',
        'Silakan pilih program kursus.',
      );

      return false;
    }


    if (!form.name.trim()) {

      Alert.alert(
        'Validasi',
        'Nama kelas wajib diisi.',
      );

      return false;
    }


    if (!selectedInstructor) {

      Alert.alert(
        'Validasi',
        'Silakan pilih instruktur.',
      );

      return false;
    }


    if (
      form.days.length === 0
    ) {

      Alert.alert(
        'Validasi',
        'Pilih minimal satu hari pertemuan.',
      );

      return false;
    }


    if (
      !isValidTime(
        form.startTime,
      )
      ||
      !isValidTime(
        form.endTime,
      )
    ) {

      Alert.alert(
        'Validasi',
        'Jam harus menggunakan format HH:mm.',
      );

      return false;
    }


    if (
      form.endTime <=
      form.startTime
    ) {

      Alert.alert(
        'Validasi',
        'Jam selesai harus lebih besar dari jam mulai.',
      );

      return false;
    }


    if (!form.room) {

      Alert.alert(
        'Validasi',
        'Silakan pilih ruangan.',
      );

      return false;
    }


    if (
      endDate.getTime()
      <
      startDate.getTime()
    ) {

      Alert.alert(
        'Validasi',
        'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
      );

      return false;
    }


    const capacity =
      Number(
        form.capacity,
      );


    if (
      !Number.isInteger(
        capacity,
      )
      ||
      capacity <= 0
    ) {

      Alert.alert(
        'Validasi',
        'Kapasitas harus berupa bilangan bulat lebih dari 0.',
      );

      return false;
    }


    /*
     * Ketika EDIT:
     *
     * Kapasitas baru tidak boleh lebih kecil
     * dari peserta yang sudah APPROVED.
     */

    // [BUSINESS RULE] Saat edit, kapasitas tidak boleh di bawah peserta terdaftar.
    if (editingId) {

      const oldClass =
        classes.find(
          item =>
            item.id === editingId,
        );


      if (
        oldClass
        &&
        capacity <
        Number(
          oldClass.enrolled || 0,
        )
      ) {

        Alert.alert(
          'Kapasitas Tidak Valid',
          `Kapasitas tidak boleh lebih kecil dari jumlah peserta saat ini (${oldClass.enrolled}).`,
        );

        return false;
      }

    }


    return true;

  };


  /* ==========================================================
     SIMPAN / EDIT KELAS
     ========================================================== */

  // [FLOW] Admin -> validasi -> bentuk payload -> ADD/EDIT -> refresh data.
  // [SECURITY] Participant berhenti di guard isAdmin.
  const save = async () => {

    if (
      !isAdmin
      ||
      !validate()
      ||
      !selectedProgram
      ||
      !selectedInstructor
    ) {
      return;
    }


    const capacity =
      Number(
        form.capacity,
      );


    const schedule =
      `${form.days.join(' & ')}, `
      + `${form.startTime} s/d ${form.endTime}`;


    /*
     * Payload umum untuk ADD maupun EDIT.
     */

    const payload = {

      programId:
        selectedProgram.id,

      programName:
        selectedProgram.name,

      name:
        form.name.trim(),

      instructorId:
        selectedInstructor.id,

      instructorName:
        selectedInstructor.name,


      /*
       * Field lama tetap disimpan agar screen
       * yang masih membaca instructor tetap
       * kompatibel.
       */

      instructor:
        selectedInstructor.name,


      days:
        form.days,

      startTime:
        form.startTime,

      endTime:
        form.endTime,

      schedule,

      room:
        form.room,

      startDate:
        toDateString(
          startDate,
        ),

      endDate:
        toDateString(
          endDate,
        ),

      capacity,

    };


    try {

      setSaving(
        true,
      );


      /* ------------------------------------------------------
         EDIT
         ------------------------------------------------------ */

      if (editingId) {

        const current =
          classes.find(
            item =>
              item.id ===
              editingId,
          );


        const enrolled =
          Number(
            current?.enrolled || 0,
          );


        /*
         * Jika kelas sedang CLOSED,
         * edit data tidak otomatis membukanya.
         *
         * Selain itu status mengikuti kapasitas.
         */

        // [BUSINESS RULE] CLOSED dipertahankan; selain itu status mengikuti kapasitas.
        const status:
          CourseClass['status'] =

          current?.status ===
          'CLOSED'

            ? 'CLOSED'

            : enrolled >= capacity

              ? 'FULL'

              : 'OPEN';


        await updateClass(
          editingId,
          {
            ...payload,
            status,
          },
        );


        Alert.alert(
          'Berhasil',
          'Data kelas berhasil diperbarui.',
        );

      } else {

        /* ----------------------------------------------------
           ADD
           ---------------------------------------------------- */

        await addClass({

          ...payload,

          enrolled: 0,

          status: 'OPEN',

        });


        Alert.alert(
          'Berhasil',
          'Kelas baru berhasil disimpan.',
        );

      }


      closeForm();

      await load();

    } catch (error: any) {

      console.log(
        'SAVE CLASS ERROR:',
        error?.code,
        error?.message,
      );


      Alert.alert(
        'Gagal',
        error?.message
        || 'Data kelas tidak berhasil disimpan.',
      );

    } finally {

      setSaving(
        false,
      );

    }

  };


  /* ==========================================================
     MULAI EDIT
     ========================================================== */

  // [FLOW] Memindahkan data kelas terpilih kembali ke form edit.
  const startEdit = (
    item: CourseClass,
  ) => {

    /*
     * Data lama mungkin belum mempunyai instructorId.
     *
     * Karena itu kita coba cari berdasarkan nama.
     */

    const instructorId =

      item.instructorId

      ||

      instructors.find(
        instructor =>
          instructor.name ===
          (
            item.instructorName
            ||
            item.instructor
          ),
      )?.id

      ||

      '';


    setForm({

      programId:
        item.programId,

      name:
        item.name,

      instructorId,


      /*
       * Backward compatibility:
       *
       * Data lama mungkin hanya mempunyai
       * schedule string.
       */

      days:

        item.days
        &&
        item.days.length > 0

          ? item.days

          : DAYS.filter(
              day =>
                (
                  item.schedule
                  || ''
                ).includes(
                  day,
                ),
            ),


      startTime:
        item.startTime
        || '08:00',

      endTime:
        item.endTime
        || '10:00',

      room:
        item.room
        || '',

      capacity:
        String(
          item.capacity
          || 20,
        ),

    });


    setStartDate(
      fromDateString(
        item.startDate,
      ),
    );


    setEndDate(
      fromDateString(
        item.endDate,
      ),
    );


    setEditingId(
      item.id,
    );


    setShowForm(
      true,
    );

  };


  /* ==========================================================
     OPEN / CLOSED
     ========================================================== */

  // [BUSINESS RULE] FULL tidak dibuka manual; kapasitas harus dinaikkan melalui Edit.
  const toggleClassStatus = (
    item: CourseClass,
  ) => {

    if (!isAdmin) {
      return;
    }


    /*
     * FULL bukan status yang dibuka secara manual.
     *
     * Admin perlu menaikkan kapasitas lewat Edit.
     */

    if (
      item.status === 'FULL'
    ) {

      Alert.alert(
        'Kelas Penuh',
        'Status FULL ditentukan oleh kapasitas. Tambah kapasitas melalui Edit Kelas jika kelas perlu dibuka kembali.',
      );

      return;
    }


    const nextStatus:
      CourseClass['status'] =

      item.status === 'OPEN'
        ? 'CLOSED'
        : 'OPEN';


    const action =
      nextStatus === 'OPEN'
        ? 'Buka'
        : 'Tutup';


    Alert.alert(

      `${action} Kelas`,

      `${action} kelas "${item.name}"?`,

      [

        {
          text: 'Batal',
          style: 'cancel',
        },

        {
          text: action,

          onPress:
            async () => {

              try {

                setProcessingId(
                  item.id,
                );


                await updateClass(
                  item.id,
                  {
                    status:
                      nextStatus,
                  },
                );


                await load();

              } catch (
                error: any
              ) {

                Alert.alert(
                  'Gagal',
                  error?.message
                  || 'Status kelas tidak dapat diubah.',
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
     DELETE KELAS
     ========================================================== */

  // [BUSINESS RULE] Penghapusan memakai deleteClassSafely agar histori registrasi terlindungi.
  // [TEST POINT] Kelas dengan histori pendaftaran harus gagal dihapus.
  const removeClass = (
    item: CourseClass,
  ) => {

    if (!isAdmin) {
      return;
    }


    Alert.alert(

      'Hapus Kelas',

      `Apakah Anda yakin ingin menghapus "${item.name}"?\n\nKelas hanya dapat dihapus apabila belum mempunyai histori pendaftaran.`,

      [

        {
          text: 'Batal',
          style: 'cancel',
        },

        {
          text: 'Hapus',
          style: 'destructive',

          onPress:
            async () => {

              try {

                setProcessingId(
                  item.id,
                );


                /*
                 * Service akan memeriksa collection
                 * registrations berdasarkan classId.
                 */

                await deleteClassSafely(
                  item.id,
                );


                Alert.alert(
                  'Berhasil',
                  'Kelas berhasil dihapus.',
                );


                await load();

              } catch (
                error: any
              ) {

                console.log(
                  'DELETE CLASS ERROR:',
                  error?.code,
                  error?.message,
                );


                /*
                 * Jika kelas mempunyai histori,
                 * pesan dari service akan muncul di sini.
                 */

                Alert.alert(
                  'Kelas Tidak Dapat Dihapus',
                  error?.message
                  || 'Kelas gagal dihapus.',
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
     DATE PICKER
     ========================================================== */

  // [VALIDASI] Jika tanggal mulai melewati tanggal selesai, tanggal selesai ikut disesuaikan.
  const onStartDateChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {

    setShowStartDate(
      false,
    );


    if (
      event.type === 'set'
      &&
      selected
    ) {

      setStartDate(
        selected,
      );


      if (
        endDate.getTime()
        <
        selected.getTime()
      ) {

        setEndDate(
          selected,
        );

      }

    }

  };


  const onEndDateChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {

    setShowEndDate(
      false,
    );


    if (
      event.type === 'set'
      &&
      selected
    ) {

      setEndDate(
        selected,
      );

    }

  };


  /* ==========================================================
     RENDER
     ========================================================== */

  return (

    <Layout

      title="Jadwal & Kelas"

      subtitle={
        isAdmin

          ? 'Kelola jadwal, instruktur, ruang, kapasitas, dan status kelas.'

          : 'Lihat kelas tersedia, jadwal belajar, instruktur, dan ketersediaan kursi.'
      }

      refreshing={
        loading
      }

      onRefresh={
        load
      }

    >


      {/* ======================================================
          HERO
          ====================================================== */}

      <View
        style={[
          styles.hero,
          {
            backgroundColor:
              theme.primary,
          },
        ]}
      >

        <View
          style={
            styles.heroIcon
          }
        >

          <Ionicons

            name={
              isAdmin
                ? 'calendar-number-outline'
                : 'school-outline'
            }

            size={29}

            color="#FFFFFF"

          />

        </View>


        <View
          style={{
            flex: 1,
          }}
        >

          <Text
            style={
              styles.heroOverline
            }
          >

            {isAdmin
              ? 'CLASS MANAGEMENT'
              : 'LEARNING SCHEDULE'}

          </Text>


          <Text
            style={
              styles.heroTitle
            }
          >

            {isAdmin
              ? 'Jadwal & Kelas Kursus'
              : 'Temukan Kelas Anda'}

          </Text>


          <Text
            style={
              styles.heroText
            }
          >

            {isAdmin

              ? 'Pantau kelas aktif dan kelola jadwal dari satu layar.'

              : 'Periksa jadwal, instruktur, ruangan, dan kursi sebelum melakukan pendaftaran.'}

          </Text>

        </View>

      </View>


      {/* ======================================================
          STATISTIK
          ====================================================== */}

      <View
        style={
          styles.statRow
        }
      >

        <StatCard

          icon="layers-outline"

          value={
            stats.total
          }

          label="Total"

          iconColor={
            theme.primary
          }

          background={
            isAdmin
              ? ADMIN.soft
              : PARTICIPANT.soft
          }

        />


        <StatCard

          icon="checkmark-circle-outline"

          value={
            stats.open
          }

          label="Open"

          iconColor="#16845B"

          background="#E5F8F0"

        />


        <StatCard

          icon="people-outline"

          value={
            stats.enrolled
          }

          label="Peserta"

          iconColor="#B66A00"

          background="#FFF3DE"

        />


        <StatCard

          icon="lock-closed-outline"

          value={
            stats.closed
            +
            stats.full
          }

          label="Tutup/Full"

          iconColor="#C43D4D"

          background="#FCEBEC"

        />

      </View>


      {/* ======================================================
          JUDUL DAFTAR
          ====================================================== */}

      <View
        style={
          styles.sectionHeader
        }
      >

        <View>

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Daftar Kelas
          </Text>


          <Text
            style={[
              styles.sectionSubtitle,
              {
                color:
                  theme.muted,
              },
            ]}
          >

            {shown.length}
            {' dari '}
            {classes.length}
            {' kelas ditampilkan'}

          </Text>

        </View>


        <Ionicons

          name="options-outline"

          size={22}

          color={
            theme.primary
          }

        />

      </View>


      {/* ======================================================
          SEARCH
          ====================================================== */}

      <Input

        label="Pencarian"

        placeholder="Cari kelas, program, instruktur, ruangan..."

        value={
          queryText
        }

        onChangeText={
          setQueryText
        }

      />


      {/* ======================================================
          FILTER
          ====================================================== */}

      <ScrollView

        horizontal

        showsHorizontalScrollIndicator={
          false
        }

        style={
          styles.filterScroll
        }

      >

        {(
          [
            'ALL',
            'OPEN',
            'FULL',
            'CLOSED',
          ] as FilterStatus[]
        ).map(
          item => (

            <Pressable

              key={
                item
              }

              onPress={() =>
                setFilter(
                  item,
                )
              }

              style={[

                styles.filterChip,

                filter === item
                &&
                {
                  backgroundColor:
                    theme.primary,

                  borderColor:
                    theme.primary,
                },

              ]}

            >

              <Text
                style={[

                  styles.filterText,

                  filter === item
                  &&
                  styles.filterTextActive,

                ]}
              >

                {item === 'ALL'
                  ? 'SEMUA'
                  : item}

              </Text>

            </Pressable>

          ),
        )}

      </ScrollView>


      {/* ======================================================
          TOMBOL FORM ADMIN
          ====================================================== */}

      {isAdmin && (

        <Pressable

          style={[

            styles.addButton,

            {
              backgroundColor:
                showForm
                  ? '#EEF2F7'
                  : ADMIN.primary,
            },

          ]}

          onPress={() => {

            if (showForm) {

              closeForm();

            } else {

              resetForm();

              setShowForm(
                true,
              );

            }

          }}

        >

          <View
            style={[

              styles.addIcon,

              {
                backgroundColor:
                  showForm

                    ? '#DDE4EE'

                    : 'rgba(255,255,255,0.16)',
              },

            ]}
          >

            <Ionicons

              name={
                showForm
                  ? 'close'
                  : 'add'
              }

              size={23}

              color={
                showForm
                  ? ADMIN.text
                  : '#FFFFFF'
              }

            />

          </View>


          <View
            style={{
              flex: 1,
            }}
          >

            <Text
              style={[
                styles.addTitle,
                {
                  color:
                    showForm
                      ? ADMIN.text
                      : '#FFFFFF',
                },
              ]}
            >

              {showForm
                ? 'Tutup Form'
                : 'Tambah Kelas Baru'}

            </Text>


            <Text
              style={[
                styles.addSubtitle,
                {
                  color:
                    showForm

                      ? ADMIN.muted

                      : 'rgba(255,255,255,0.76)',
                },
              ]}
            >

              {showForm
                ? 'Kembali ke daftar kelas'
                : 'Atur program, jadwal, ruang, dan kapasitas'}

            </Text>

          </View>


          <Ionicons

            name={
              showForm
                ? 'chevron-up'
                : 'chevron-down'
            }

            size={20}

            color={
              showForm
                ? ADMIN.muted
                : '#FFFFFF'
            }

          />

        </Pressable>

      )}


      {/* ======================================================
          FORM ADMIN
          ====================================================== */}

      {isAdmin
      &&
      showForm
      && (

        <Card>


          <View
            style={
              styles.formHeader
            }
          >

            <View
              style={
                styles.formIcon
              }
            >

              <Ionicons

                name={
                  editingId
                    ? 'create-outline'
                    : 'calendar-outline'
                }

                size={22}

                color={
                  ADMIN.primary
                }

              />

            </View>


            <View
              style={{
                flex: 1,
              }}
            >

              <Text
                style={
                  styles.formTitle
                }
              >

                {editingId
                  ? 'Edit Jadwal & Kelas'
                  : 'Kelas Baru'}

              </Text>


              <Text
                style={
                  styles.formHelp
                }
              >

                {editingId

                  ? 'Perbarui data tanpa mengubah jumlah peserta yang sudah terdaftar.'

                  : 'Lengkapi informasi kelas kursus.'}

              </Text>

            </View>

          </View>


          {/* PROGRAM */}

          <Text
            style={
              styles.label
            }
          >
            Program Kursus
          </Text>


          <SelectorButton

            text={
              selectedProgram

                ? `${selectedProgram.code} • ${selectedProgram.name}`

                : 'Pilih program kursus'
            }

            placeholder={
              !selectedProgram
            }

            icon="book-outline"

            onPress={() =>
              setSelector(
                'PROGRAM',
              )
            }

          />


          {/* NAMA */}

          <Input

            label="Nama Kelas"

            placeholder="Contoh: React Native - Kelas A"

            value={
              form.name
            }

            onChangeText={(
              value: string,
            ) =>
              setForm({
                ...form,
                name:
                  value,
              })
            }

          />


          {/* INSTRUKTUR */}

          <Text
            style={
              styles.label
            }
          >
            Instruktur
          </Text>


          <SelectorButton

            text={
              selectedInstructor

                ? `${selectedInstructor.code} • ${selectedInstructor.name}`

                : 'Pilih instruktur aktif'
            }

            placeholder={
              !selectedInstructor
            }

            icon="person-outline"

            onPress={() =>
              setSelector(
                'INSTRUCTOR',
              )
            }

          />


          {/* HARI */}

          <Text
            style={
              styles.label
            }
          >
            Hari Pertemuan
          </Text>


          <View
            style={
              styles.dayContainer
            }
          >

            {DAYS.map(
              day => {

                const selected =
                  form.days.includes(
                    day,
                  );


                return (

                  <Pressable

                    key={
                      day
                    }

                    style={[

                      styles.dayButton,

                      selected
                      &&
                      {
                        backgroundColor:
                          ADMIN.primary,

                        borderColor:
                          ADMIN.primary,
                      },

                    ]}

                    onPress={() =>
                      toggleDay(
                        day,
                      )
                    }

                  >

                    {selected && (

                      <Ionicons

                        name="checkmark"

                        size={14}

                        color="#FFFFFF"

                      />

                    )}


                    <Text
                      style={[

                        styles.dayText,

                        selected
                        &&
                        {
                          color:
                            '#FFFFFF',
                        },

                      ]}
                    >

                      {day.substring(
                        0,
                        3,
                      )}

                    </Text>

                  </Pressable>

                );

              },
            )}

          </View>


          {/* JAM */}

          <View
            style={
              styles.timeRow
            }
          >

            <View
              style={{
                flex: 1,
              }}
            >

              <Input

                label="Jam Mulai"

                placeholder="08:00"

                value={
                  form.startTime
                }

                onChangeText={(
                  value: string,
                ) =>
                  setForm({
                    ...form,
                    startTime:
                      value,
                  })
                }

              />

            </View>


            <Text
              style={
                styles.until
              }
            >
              s/d
            </Text>


            <View
              style={{
                flex: 1,
              }}
            >

              <Input

                label="Jam Selesai"

                placeholder="10:00"

                value={
                  form.endTime
                }

                onChangeText={(
                  value: string,
                ) =>
                  setForm({
                    ...form,
                    endTime:
                      value,
                  })
                }

              />

            </View>

          </View>


          {/* RUANG */}

          <Text
            style={
              styles.label
            }
          >
            Ruangan
          </Text>


          <SelectorButton

            text={
              form.room
              ||
              'Pilih ruangan'
            }

            placeholder={
              !form.room
            }

            icon="business-outline"

            onPress={() =>
              setSelector(
                'ROOM',
              )
            }

          />


          {/* PERIODE */}

          <Text
            style={
              styles.label
            }
          >
            Periode Kelas
          </Text>


          <View
            style={
              styles.dateRow
            }
          >

            <DateButton

              label="Tanggal Mulai"

              value={
                formatDateDisplay(
                  startDate,
                )
              }

              onPress={() =>
                setShowStartDate(
                  true,
                )
              }

            />


            <DateButton

              label="Tanggal Selesai"

              value={
                formatDateDisplay(
                  endDate,
                )
              }

              onPress={() =>
                setShowEndDate(
                  true,
                )
              }

            />

          </View>


          {/* KAPASITAS */}

          <Input

            label="Kapasitas Peserta"

            placeholder="20"

            value={
              form.capacity
            }

            onChangeText={(
              value: string,
            ) =>
              setForm({

                ...form,

                capacity:
                  value.replace(
                    /[^0-9]/g,
                    '',
                  ),

              })
            }

            keyboardType="numeric"

          />


          {editingId && (

            <View
              style={
                styles.editNote
              }
            >

              <Ionicons

                name="shield-checkmark-outline"

                size={18}

                color={
                  ADMIN.secondary
                }

              />


              <Text
                style={
                  styles.editNoteText
                }
              >

                Jumlah peserta tidak di-reset saat kelas diedit.
                Kapasitas tidak boleh lebih kecil dari jumlah
                peserta yang sudah disetujui.

              </Text>

            </View>

          )}


          <Button

            title={
              saving

                ? 'Menyimpan...'

                : editingId

                  ? 'Simpan Perubahan'

                  : 'Simpan Kelas'
            }

            onPress={
              save
            }

            icon={
              editingId
                ? 'checkmark-circle-outline'
                : 'save-outline'
            }

          />


          {editingId && (

            <Button

              title="Batal Edit"

              kind="light"

              icon="close-outline"

              onPress={
                closeForm
              }

            />

          )}

        </Card>

      )}


      {/* ======================================================
          EMPTY
          ====================================================== */}

      {shown.length === 0 && (

        <Card>

          <View
            style={
              styles.emptyState
            }
          >

            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor:
                    theme.soft,
                },
              ]}
            >

              <Ionicons

                name="calendar-outline"

                size={29}

                color={
                  theme.primary
                }

              />

            </View>


            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Kelas Tidak Ditemukan
            </Text>


            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    theme.muted,
                },
              ]}
            >
              Gunakan pencarian atau filter status yang berbeda.
            </Text>

          </View>

        </Card>

      )}


      {/* ======================================================
          CARD KELAS
          ====================================================== */}

      {shown.map(
        (
          item,
          index,
        ) => {

          const instructorDisplay =
            item.instructorName
            ||
            item.instructor
            ||
            '-';


          const enrolled =
            Number(
              item.enrolled || 0,
            );


          const capacity =
            Number(
              item.capacity || 0,
            );


          const percent =
            capacity > 0

              ? Math.min(
                  100,
                  (
                    enrolled
                    /
                    capacity
                  )
                  * 100,
                )

              : 0;


          const remaining =
            Math.max(
              0,
              capacity
              -
              enrolled,
            );


          return (

            <View

              key={
                item.id
              }

              style={[
                styles.classCard,
                {
                  borderColor:
                    isAdmin
                      ? ADMIN.border
                      : PARTICIPANT.border,
                },
              ]}

            >


              {/* ACCENT */}

              <View
                style={[
                  styles.cardAccent,
                  {
                    backgroundColor:
                      getAccent(
                        index,
                        isAdmin,
                      ),
                  },
                ]}
              />


              {/* HEADER */}

              <View
                style={
                  styles.classHeader
                }
              >

                <View
                  style={[
                    styles.classIcon,
                    {
                      backgroundColor:
                        theme.soft,
                    },
                  ]}
                >

                  <Ionicons

                    name="school-outline"

                    size={22}

                    color={
                      theme.primary
                    }

                  />

                </View>


                <View
                  style={{
                    flex: 1,
                  }}
                >

                  <Text
                    style={[
                      styles.programName,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    {item.programName}
                  </Text>


                  <Text
                    style={[
                      styles.className,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>

                </View>


                <StatusBadge
                  status={
                    item.status
                  }
                />

              </View>


              {/* INFO */}

              <View
                style={
                  styles.infoGrid
                }
              >

                <InfoBox

                  icon="person-outline"

                  label="Instruktur"

                  value={
                    instructorDisplay
                  }

                  color={
                    theme.primary
                  }

                />


                <InfoBox

                  icon="location-outline"

                  label="Ruangan"

                  value={
                    item.room
                    ||
                    '-'
                  }

                  color={
                    isAdmin
                      ? ADMIN.secondary
                      : PARTICIPANT.secondary
                  }

                />

              </View>


              {/* JADWAL */}

              <View
                style={
                  styles.scheduleBox
                }
              >

                <Ionicons

                  name="calendar-number-outline"

                  size={20}

                  color={
                    theme.primary
                  }

                />


                <View
                  style={{
                    flex: 1,
                  }}
                >

                  <Text
                    style={
                      styles.scheduleLabel
                    }
                  >
                    Jadwal Pertemuan
                  </Text>


                  <Text
                    style={[
                      styles.scheduleValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {item.schedule || '-'}
                  </Text>


                  <Text
                    style={
                      styles.periodText
                    }
                  >

                    {item.startDate || '-'}

                    {' s/d '}

                    {item.endDate || '-'}

                  </Text>

                </View>

              </View>


              {/* KAPASITAS */}

              <View
                style={
                  styles.capacityHeader
                }
              >

                <View>

                  <Text
                    style={
                      styles.capacityLabel
                    }
                  >
                    Kapasitas Kelas
                  </Text>


                  <Text
                    style={[
                      styles.capacityValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >

                    {enrolled}

                    {' / '}

                    {capacity}

                    {' peserta'}

                  </Text>

                </View>


                <View
                  style={[
                    styles.remainingBadge,
                    {
                      backgroundColor:
                        theme.soft,
                    },
                  ]}
                >

                  <Text
                    style={[
                      styles.remainingText,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >

                    Sisa {remaining}

                  </Text>

                </View>

              </View>


              {/* PROGRESS */}

              <View
                style={
                  styles.progressTrack
                }
              >

                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        `${percent}%`,

                      backgroundColor:

                        item.status === 'FULL'

                          ? '#D17B16'

                          : item.status === 'CLOSED'

                            ? '#87909F'

                            : theme.secondary,
                    },
                  ]}
                />

              </View>


              {/* PARTICIPANT INFO */}

              {!isAdmin
              &&
              item.status === 'OPEN'
              &&
              remaining > 0
              && (

                <View
                  style={
                    styles.participantHint
                  }
                >

                  <Ionicons

                    name="information-circle-outline"

                    size={18}

                    color={
                      PARTICIPANT.secondary
                    }

                  />


                  <Text
                    style={
                      styles.participantHintText
                    }
                  >

                    Kelas masih tersedia. Pendaftaran dilakukan
                    melalui menu Pendaftaran.

                  </Text>

                </View>

              )}


              {/* ADMIN ACTION */}

              {isAdmin && (

                <View
                  style={
                    styles.adminActions
                  }
                >

                  {/* EDIT */}

                  <Pressable

                    style={[
                      styles.actionButton,
                      styles.editButton,
                    ]}

                    onPress={() =>
                      startEdit(
                        item,
                      )
                    }

                  >

                    <Ionicons

                      name="create-outline"

                      size={17}

                      color={
                        ADMIN.secondary
                      }

                    />

                    <Text
                      style={[
                        styles.actionText,
                        {
                          color:
                            ADMIN.secondary,
                        },
                      ]}
                    >
                      Edit
                    </Text>

                  </Pressable>


                  {/* OPEN / CLOSE */}

                  <Pressable

                    style={[

                      styles.actionButton,

                      item.status === 'OPEN'

                        ? styles.closeButton

                        : styles.openButton,

                    ]}

                    onPress={() =>
                      toggleClassStatus(
                        item,
                      )
                    }

                  >

                    <Ionicons

                      name={
                        item.status === 'OPEN'
                          ? 'lock-closed-outline'
                          : 'lock-open-outline'
                      }

                      size={17}

                      color={
                        item.status === 'OPEN'
                          ? ADMIN.danger
                          : ADMIN.success
                      }

                    />


                    <Text
                      style={[
                        styles.actionText,
                        {
                          color:
                            item.status === 'OPEN'
                              ? ADMIN.danger
                              : ADMIN.success,
                        },
                      ]}
                    >

                      {processingId === item.id

                        ? 'Proses...'

                        : item.status === 'OPEN'

                          ? 'Tutup'

                          : 'Buka'}

                    </Text>

                  </Pressable>


                  {/* DELETE */}

                  <Pressable

                    style={[
                      styles.deleteButton,
                    ]}

                    onPress={() =>
                      removeClass(
                        item,
                      )
                    }

                  >

                    <Ionicons

                      name="trash-outline"

                      size={17}

                      color={
                        ADMIN.danger
                      }

                    />

                  </Pressable>

                </View>

              )}

            </View>

          );

        },
      )}


      {/* ======================================================
          INFO PARTICIPANT
          ====================================================== */}

      {!isAdmin
      &&
      shown.length > 0
      && (

        <View
          style={
            styles.participantFooter
          }
        >

          <Ionicons

            name="navigate-circle-outline"

            size={25}

            color={
              PARTICIPANT.primary
            }

          />


          <View
            style={{
              flex: 1,
            }}
          >

            <Text
              style={
                styles.participantFooterTitle
              }
            >
              Ingin mengikuti kelas?
            </Text>


            <Text
              style={
                styles.participantFooterText
              }
            >
              Gunakan menu Pendaftaran untuk memilih kelas OPEN
              dan mengirim permohonan.
            </Text>

          </View>

        </View>

      )}


      {/* ======================================================
          DATE PICKER
          ====================================================== */}

      {showStartDate && (

        <DateTimePicker

          value={
            startDate
          }

          mode="date"

          display="default"

          onChange={
            onStartDateChange
          }

        />

      )}


      {showEndDate && (

        <DateTimePicker

          value={
            endDate
          }

          mode="date"

          display="default"

          minimumDate={
            startDate
          }

          onChange={
            onEndDateChange
          }

        />

      )}


      {/* ======================================================
          MODAL SELECTOR
          ====================================================== */}

      <Modal

        visible={
          selector !== null
        }

        transparent

        animationType="fade"

        onRequestClose={() =>
          setSelector(
            null,
          )
        }

      >

        <View
          style={
            styles.modalOverlay
          }
        >

          <View
            style={
              styles.modalBox
            }
          >

            <View
              style={
                styles.modalHeader
              }
            >

              <View>

                <Text
                  style={
                    styles.modalOverline
                  }
                >
                  PILIH DATA
                </Text>


                <Text
                  style={
                    styles.modalTitle
                  }
                >

                  {selector === 'PROGRAM'

                    ? 'Program Kursus'

                    : selector === 'INSTRUCTOR'

                      ? 'Instruktur'

                      : 'Ruangan'}

                </Text>

              </View>


              <Pressable

                style={
                  styles.modalClose
                }

                onPress={() =>
                  setSelector(
                    null,
                  )
                }

              >

                <Ionicons

                  name="close"

                  size={22}

                  color={
                    ADMIN.text
                  }

                />

              </Pressable>

            </View>


            <ScrollView
              style={
                styles.modalScroll
              }
            >


              {/* PROGRAM */}

              {selector === 'PROGRAM'
              &&
              programs.map(
                item => (

                  <Option

                    key={
                      item.id
                    }

                    icon="book-outline"

                    title={
                      `${item.code} • ${item.name}`
                    }

                    subtitle={
                      `${item.level} • ${item.duration}`
                    }

                    onPress={() => {

                      setForm(
                        current => ({
                          ...current,
                          programId:
                            item.id,
                        }),
                      );

                      setSelector(
                        null,
                      );

                    }}

                  />

                ),
              )}


              {/* INSTRUCTOR */}

              {selector === 'INSTRUCTOR'
              &&
              instructors.map(
                item => (

                  <Option

                    key={
                      item.id
                    }

                    icon="person-outline"

                    title={
                      item.name
                    }

                    subtitle={
                      `${item.code} • ${item.expertise}`
                    }

                    onPress={() => {

                      setForm(
                        current => ({
                          ...current,
                          instructorId:
                            item.id,
                        }),
                      );

                      setSelector(
                        null,
                      );

                    }}

                  />

                ),
              )}


              {/* ROOM */}

              {selector === 'ROOM'
              &&
              ROOMS.map(
                room => (

                  <Option

                    key={
                      room
                    }

                    icon="business-outline"

                    title={
                      room
                    }

                    subtitle="Ruangan tersedia"

                    onPress={() => {

                      setForm(
                        current => ({
                          ...current,
                          room,
                        }),
                      );

                      setSelector(
                        null,
                      );

                    }}

                  />

                ),
              )}

            </ScrollView>

          </View>

        </View>

      </Modal>

    </Layout>

  );

}


/* ============================================================
   COMPONENT STATISTIK
   ============================================================ */

function StatCard({

  icon,
  value,
  label,
  iconColor,
  background,

}: {

  icon:
    keyof typeof Ionicons.glyphMap;

  value:
    number;

  label:
    string;

  iconColor:
    string;

  background:
    string;

}) {

  return (

    <View
      style={
        styles.statCard
      }
    >

      <View
        style={[
          styles.statIcon,
          {
                 backgroundColor: background,
          },
        ]}
      >

        <Ionicons

          name={
            icon
          }

          size={19}

          color={
            iconColor
          }

        />

      </View>


      <Text
        style={
          styles.statValue
        }
      >
        {value}
      </Text>


      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>

    </View>

  );

}


/* ============================================================
   COMPONENT SELECTOR
   ============================================================ */

function SelectorButton({

  text,
  placeholder,
  icon,
  onPress,

}: {

  text:
    string;

  placeholder:
    boolean;

  icon:
    keyof typeof Ionicons.glyphMap;

  onPress:
    () => void;

}) {

  return (

    <Pressable

      style={
        styles.selectorButton
      }

      onPress={
        onPress
      }

    >

      <View
        style={
          styles.selectorIcon
        }
      >

        <Ionicons

          name={
            icon
          }

          size={18}

          color={
            ADMIN.primary
          }

        />

      </View>


      <Text
        style={[

          styles.selectorText,

          placeholder
          &&
          styles.placeholder,

        ]}
      >
        {text}
      </Text>


      <Ionicons

        name="chevron-down"

        size={19}

        color={
          ADMIN.muted
        }

      />

    </Pressable>

  );

}


/* ============================================================
   COMPONENT DATE
   ============================================================ */

function DateButton({

  label,
  value,
  onPress,

}: {

  label:
    string;

  value:
    string;

  onPress:
    () => void;

}) {

  return (

    <Pressable

      style={
        styles.dateButton
      }

      onPress={
        onPress
      }

    >

      <View
        style={
          styles.dateIcon
        }
      >

        <Ionicons

          name="calendar-outline"

          size={18}

          color={
            ADMIN.primary
          }

        />

      </View>


      <View
        style={{
          flex: 1,
        }}
      >

        <Text
          style={
            styles.dateSmall
          }
        >
          {label}
        </Text>


        <Text
          style={
            styles.dateText
          }
        >
          {value}
        </Text>

      </View>

    </Pressable>

  );

}


/* ============================================================
   COMPONENT INFO
   ============================================================ */

function InfoBox({

  icon,
  label,
  value,
  color,

}: {

  icon:
    keyof typeof Ionicons.glyphMap;

  label:
    string;

  value:
    string;

  color:
    string;

}) {

  return (

    <View
      style={
        styles.infoBox
      }
    >

      <Ionicons

        name={
          icon
        }

        size={18}

        color={
          color
        }

      />


      <View
        style={{
          flex: 1,
        }}
      >

        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>


        <Text

          style={
            styles.infoValue
          }

          numberOfLines={2}

        >
          {value}
        </Text>

      </View>

    </View>

  );

}


/* ============================================================
   STATUS BADGE
   ============================================================ */

function StatusBadge({

  status,

}: {

  status:
    CourseClass['status'];

}) {

  const background =

    status === 'OPEN'

      ? '#E4F7EE'

      : status === 'FULL'

        ? '#FFF0D8'

        : '#EEF0F4';


  const color =

    status === 'OPEN'

      ? '#16845B'

      : status === 'FULL'

        ? '#B66A00'

        : '#667080';


  return (

    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            background,
        },
      ]}
    >

      <View
        style={[
          styles.statusDot,
          {
            backgroundColor:
              color,
          },
        ]}
      />


      <Text
        style={[
          styles.statusText,
          {
            color,
          },
        ]}
      >
        {status}
      </Text>

    </View>

  );

}


/* ============================================================
   OPTION MODAL
   ============================================================ */

function Option({

  icon,
  title,
  subtitle,
  onPress,

}: {

  icon:
    keyof typeof Ionicons.glyphMap;

  title:
    string;

  subtitle:
    string;

  onPress:
    () => void;

}) {

  return (

    <Pressable

      style={
        styles.option
      }

      onPress={
        onPress
      }

    >

      <View
        style={
          styles.optionIcon
        }
      >

        <Ionicons

          name={
            icon
          }

          size={20}

          color={
            ADMIN.primary
          }

        />

      </View>


      <View
        style={{
          flex: 1,
        }}
      >

        <Text
          style={
            styles.optionTitle
          }
        >
          {title}
        </Text>


        <Text
          style={
            styles.optionSubtitle
          }
        >
          {subtitle}
        </Text>

      </View>


      <Ionicons

        name="chevron-forward"

        size={18}

        color="#98A1B1"

      />

    </Pressable>

  );

}


/* ============================================================
   WARNA AKSEN CARD
   ============================================================ */

function getAccent(
  index: number,
  isAdmin: boolean,
) {

  const adminColors = [
    '#2F6BFF',
    '#0F9D8A',
    '#E58B28',
    '#7B61D1',
  ];


  const participantColors = [
    '#5546C8',
    '#0F9D8A',
    '#E58B28',
    '#D4557A',
  ];


  const palette =
    isAdmin
      ? adminColors
      : participantColors;


  return palette[
    index
    %
    palette.length
  ];

}


/* ============================================================
   STYLE
   ============================================================ */

const styles =
  StyleSheet.create({

    hero: {
      borderRadius: 22,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      marginBottom: 14,
    },

    heroIcon: {
      width: 57,
      height: 57,
      borderRadius: 18,
      backgroundColor:
        'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    heroOverline: {
      color:
        'rgba(255,255,255,0.70)',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },

    heroTitle: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight: '900',
      marginTop: 3,
    },

    heroText: {
      color:
        'rgba(255,255,255,0.85)',
      fontSize: 10,
      lineHeight: 16,
      marginTop: 4,
    },


    /* STAT */

    statRow: {
      flexDirection: 'row',
      gap: 7,
      marginBottom: 17,
    },

    statCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 15,
      borderWidth: 1,
      borderColor: '#E8ECF2',
      padding: 9,
    },

    statIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },

    statValue: {
      fontSize: 19,
      fontWeight: '900',
      color: '#1D2433',
    },

    statLabel: {
      fontSize: 8,
      fontWeight: '700',
      color: '#70798A',
      marginTop: 1,
    },


    /* SECTION */

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
    },

    sectionSubtitle: {
      fontSize: 10,
      marginTop: 2,
    },


    /* FILTER */

    filterScroll: {
      marginBottom: 12,
    },

    filterChip: {
      borderWidth: 1,
      borderColor: '#E1E6EE',
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      paddingHorizontal: 13,
      paddingVertical: 8,
      marginRight: 7,
    },

    filterText: {
      color: '#697386',
      fontSize: 9,
      fontWeight: '900',
    },

    filterTextActive: {
      color: '#FFFFFF',
    },


    /* ADD */

    addButton: {
      minHeight: 65,
      borderRadius: 17,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },

    addIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },

    addTitle: {
      fontSize: 13,
      fontWeight: '900',
    },

    addSubtitle: {
      fontSize: 9,
      marginTop: 2,
    },


    /* FORM */

    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 15,
    },

    formIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor:
        ADMIN.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    formTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: ADMIN.text,
    },

    formHelp: {
      fontSize: 9,
      lineHeight: 14,
      color: ADMIN.muted,
      marginTop: 2,
    },

    label: {
      color: ADMIN.text,
      fontWeight: '800',
      fontSize: 12,
      marginBottom: 7,
      marginTop: 4,
    },


    /* SELECTOR */

    selectorButton: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: '#DDE4ED',
      borderRadius: 14,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      backgroundColor: '#FFFFFF',
      marginBottom: 13,
    },

    selectorIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor:
        ADMIN.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    selectorText: {
      flex: 1,
      color: ADMIN.text,
      fontSize: 12,
      fontWeight: '700',
    },

    placeholder: {
      color: '#8C98A8',
      fontWeight: '500',
    },


    /* DAY */

    dayContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 14,
    },

    dayButton: {
      minWidth: 51,
      height: 37,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#D9E1EC',
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 7,
      gap: 2,
    },

    dayText: {
      fontSize: 11,
      fontWeight: '800',
      color: ADMIN.text,
    },


    /* TIME */

    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    until: {
      fontWeight: '800',
      color: ADMIN.muted,
      marginTop: 7,
    },


    /* DATE */

    dateRow: {
      gap: 8,
      marginBottom: 13,
    },

    dateButton: {
      borderWidth: 1,
      borderColor: '#DDE4ED',
      borderRadius: 14,
      padding: 10,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    dateIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor:
        ADMIN.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    dateSmall: {
      fontSize: 8,
      color: ADMIN.muted,
    },

    dateText: {
      fontSize: 12,
      fontWeight: '900',
      color: ADMIN.text,
      marginTop: 2,
    },


    /* EDIT INFO */

    editNote: {
      backgroundColor: '#EEF5FF',
      borderRadius: 12,
      padding: 10,
      flexDirection: 'row',
      gap: 7,
      alignItems: 'flex-start',
      marginBottom: 11,
    },

    editNoteText: {
      flex: 1,
      color: '#53647C',
      fontSize: 9,
      lineHeight: 14,
    },


    /* EMPTY */

    emptyState: {
      alignItems: 'center',
      paddingVertical: 17,
    },

    emptyIcon: {
      width: 55,
      height: 55,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },

    emptyTitle: {
      fontSize: 14,
      fontWeight: '900',
    },

    emptyText: {
      fontSize: 10,
      marginTop: 4,
      textAlign: 'center',
    },


    /* CLASS CARD */

    classCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1,
      padding: 15,
      marginBottom: 12,
      overflow: 'hidden',
    },

    cardAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },

    classHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      marginBottom: 12,
    },

    classIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },

    programName: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.3,
    },

    className: {
      fontSize: 16,
      fontWeight: '900',
      marginTop: 3,
      lineHeight: 20,
    },

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    statusText: {
      fontSize: 8,
      fontWeight: '900',
    },


    /* INFO GRID */

    infoGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },

    infoBox: {
      flex: 1,
      minHeight: 60,
      borderRadius: 13,
      backgroundColor: '#F8F9FC',
      padding: 9,
      flexDirection: 'row',
      gap: 7,
      alignItems: 'flex-start',
    },

    infoLabel: {
      fontSize: 8,
      color: '#8A91A1',
      fontWeight: '700',
    },

    infoValue: {
      fontSize: 9,
      lineHeight: 13,
      color: '#303849',
      fontWeight: '800',
      marginTop: 2,
    },


    /* SCHEDULE */

    scheduleBox: {
      borderRadius: 13,
      backgroundColor: '#F8F9FC',
      padding: 10,
      flexDirection: 'row',
      gap: 9,
      alignItems: 'flex-start',
      marginBottom: 11,
    },

    scheduleLabel: {
      fontSize: 8,
      color: '#8A91A1',
      fontWeight: '700',
    },

    scheduleValue: {
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '900',
      marginTop: 2,
    },

    periodText: {
      fontSize: 8,
      color: '#7C8595',
      marginTop: 3,
    },


    /* CAPACITY */

    capacityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    capacityLabel: {
      fontSize: 8,
      color: '#8A91A1',
      fontWeight: '700',
    },

    capacityValue: {
      fontSize: 13,
      fontWeight: '900',
      marginTop: 2,
    },

    remainingBadge: {
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    remainingText: {
      fontSize: 8,
      fontWeight: '900',
    },

    progressTrack: {
      height: 7,
      backgroundColor: '#EDF0F4',
      borderRadius: 20,
      overflow: 'hidden',
      marginTop: 8,
    },

    progressFill: {
      height: '100%',
      borderRadius: 20,
    },


    /* PARTICIPANT */

    participantHint: {
      backgroundColor:
        PARTICIPANT.softTeal,
      borderRadius: 12,
      padding: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 10,
    },

    participantHintText: {
      flex: 1,
      color: '#31776D',
      fontSize: 9,
      lineHeight: 14,
      fontWeight: '700',
    },

    participantFooter: {
      backgroundColor:
        PARTICIPANT.soft,
      borderRadius: 17,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },

    participantFooterTitle: {
      color:
        PARTICIPANT.primary,
      fontSize: 12,
      fontWeight: '900',
    },

    participantFooterText: {
      color:
        PARTICIPANT.muted,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 2,
    },


    /* ADMIN ACTION */

    adminActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },

    actionButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    editButton: {
      backgroundColor: '#EEF5FF',
      borderColor: '#D8E7FF',
    },

    closeButton: {
      backgroundColor: '#FFF0F1',
      borderColor: '#F7DADD',
    },

    openButton: {
      backgroundColor: '#EAF8F1',
      borderColor: '#D3F0E2',
    },

    actionText: {
      fontSize: 10,
      fontWeight: '900',
    },

    deleteButton: {
      width: 42,
      minHeight: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F7DADD',
      backgroundColor: '#FFF0F1',
      alignItems: 'center',
      justifyContent: 'center',
    },


    /* MODAL */

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(16,24,40,0.48)',
      justifyContent: 'center',
      padding: 20,
    },

    modalBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 22,
      padding: 16,
      maxHeight: '72%',
    },

    modalHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },

    modalOverline: {
      color:
        ADMIN.secondary,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: '900',
      color:
        ADMIN.text,
      marginTop: 2,
    },

    modalClose: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: '#F1F3F7',
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalScroll: {
      maxHeight: 430,
    },

    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#EEF1F5',
    },

    optionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        ADMIN.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    optionTitle: {
      fontWeight: '900',
      color:
        ADMIN.text,
      fontSize: 12,
    },

    optionSubtitle: {
      color:
        ADMIN.muted,
      marginTop: 3,
      fontSize: 9,
    },

  });