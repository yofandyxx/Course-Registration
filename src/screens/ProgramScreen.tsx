/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * 
 * Fungsi File :
 * - Menampilkan katalog program kursus untuk Admin dan Participant.
 * - Menampilkan statistik program ACTIVE dan INACTIVE.
 * - Menangani pencarian serta filter program.
 * - Menambahkan program baru oleh Admin.
 * - Memvalidasi data dan mencegah duplikasi kode program.
 * - Mengaktifkan atau menonaktifkan program oleh Admin.
 * - Membatasi Participant agar hanya melihat program ACTIVE.
 *
 * Catatan Pembelajaran:
 * Biaya program hanya bersifat informasi.
 * Project 07 tidak terintegrasi dengan sistem pembayaran.
 *
 * Penanda:
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan input/data
 * [BUSINESS RULE] Aturan bisnis aplikasi
 * [SECURITY]      Pembatasan berdasarkan role
 * [TEST POINT]    Titik penting pengujian
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
  Pressable,
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
  Input,
} from '../components/UI';

import { useAuth } from '../contexts/AuthContext';

import {
  addProgram,
  listPrograms,
  updateProgram,
} from '../services/firestore';

import { CourseProgram } from '../types';

/* ============================================================
   WARNA KHUSUS PROJECT 07
   ============================================================ */

const ADMIN = {
  primary: '#173B67',
  secondary: '#2F6BFF',
  soft: '#EAF2FF',
  soft2: '#F4F7FC',
  text: '#172033',
  muted: '#687386',
  border: '#E3E9F2',
  success: '#16845B',
  danger: '#C43D4D',
  warning: '#B66A00',
};

const PARTICIPANT = {
  primary: '#5546C8',
  secondary: '#0F9D8A',
  soft: '#EFEDFF',
  softTeal: '#E5F8F4',
  text: '#1D2135',
  muted: '#70758A',
  border: '#E7E5F3',
  warning: '#D57A00',
};


/* ============================================================
   TIPE FILTER
   ============================================================ */

type ProgramFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'INACTIVE';


/* ============================================================
   FORM AWAL
   ============================================================ */

const emptyForm = {
  code: '',
  name: '',
  description: '',
  duration: '',
  level: 'Pemula',
  fee: '',
};


/* ============================================================
   FORMAT RUPIAH
   ============================================================ */

const formatRupiah = (
  value: number,
) => {
  return `Rp ${Number(
    value || 0,
  ).toLocaleString('id-ID')}`;
};


/* ============================================================
   PROGRAM SCREEN
   ============================================================ */

export default function ProgramScreen() {
  const { profile } = useAuth();

  // [SECURITY] Role menentukan fitur manajemen yang boleh digunakan.
  const isAdmin =
    profile?.role === 'admin';

  const theme = isAdmin
    ? ADMIN
    : PARTICIPANT;


  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */

  const [
    data,
    setData,
  ] = useState<CourseProgram[]>([]);

  const [
    q,
    setQ,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] = useState<ProgramFilter>(
    'ALL',
  );

  const [
    form,
    setForm,
  ] = useState(emptyForm);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(
    null,
  );


  /* ==========================================================
     LOAD PROGRAM
     ========================================================== */

  /**
   * FUNGSI: load
   * --------------------------------------------------------------
   * Tujuan : Mengambil seluruh program dari service Firestore.
   * Proses : Aktifkan loading → listPrograms() → simpan ke state.
   * Output : State data berisi daftar program terbaru.
   */
  const load = async () => {
    setLoading(true);

    try {
      // [FLOW] Service Firestore menjadi sumber data program.
      const result =
        await listPrograms();

      setData(result);
    } catch (error: any) {
      console.log(
        'PROGRAM LOAD ERROR:',
        error?.code,
        error?.message,
      );

      Alert.alert(
        'Gagal Memuat Program',
        error?.message ||
          'Data program tidak dapat dimuat.',
      );
    } finally {
      setLoading(false);
    }
  };


  // [FLOW] Muat ulang data setiap screen kembali memperoleh fokus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );


  /* ==========================================================
     STATISTIK
     ========================================================== */

  // [FLOW] Statistik dihitung dari state data, tanpa query tambahan.
  const stats =
    useMemo(() => {
      const active =
        data.filter(
          item =>
            item.status ===
            'ACTIVE',
        ).length;

      const inactive =
        data.filter(
          item =>
            item.status ===
            'INACTIVE',
        ).length;

      return {
        total: data.length,
        active,
        inactive,
      };
    }, [data]);


  /* ==========================================================
     DATA YANG DITAMPILKAN

     Participant:
     Hanya program ACTIVE.

     Admin:
     Bisa melihat ACTIVE dan INACTIVE.
     ========================================================== */

  const shown =
    useMemo(() => {
      const keyword =
        q.trim().toLowerCase();

      return data.filter(
        item => {
          /*
           * Participant tidak perlu melihat
           * program yang sudah dinonaktifkan.
           */
          // [BUSINESS RULE] Participant hanya boleh melihat program ACTIVE.
          if (
            !isAdmin &&
            item.status !==
              'ACTIVE'
          ) {
            return false;
          }

          /*
           * Filter Admin.
           */
          // [FLOW] Filter status hanya digunakan pada tampilan Admin.
          if (
            isAdmin &&
            filter !== 'ALL' &&
            item.status !== filter
          ) {
            return false;
          }

          /*
           * Pencarian.
           */
          if (!keyword) {
            return true;
          }

          const searchable =
            [
              item.code,
              item.name,
              item.description,
              item.level,
              item.duration,
            ]
              .join(' ')
              .toLowerCase();

          return searchable.includes(
            keyword,
          );
        },
      );
    }, [
      data,
      q,
      filter,
      isAdmin,
    ]);


  /* ==========================================================
     SIMPAN PROGRAM
     ========================================================== */

  /**
   * FUNGSI: save
   * --------------------------------------------------------------
   * Tujuan : Menambahkan program kursus baru.
   * Akses  : Admin saja.
   * Proses : Normalisasi → validasi → cek duplikat → addProgram()
   *          → reload daftar.
   * Output : Program baru selalu dibuat dengan status ACTIVE.
   */
  const save = async () => {
    // [SECURITY] Participant tidak boleh menambahkan program.
    if (!isAdmin) {
      return;
    }

    // [FLOW] Normalisasi kode agar pemeriksaan duplikat konsisten.
    const code =
      form.code
        .trim()
        .toUpperCase();

    const name =
      form.name.trim();

    const description =
      form.description.trim();

    const duration =
      form.duration.trim();

    const level =
      form.level.trim();

    const fee =
      Number(form.fee || 0);


    /* --------------------------------------------------------
       VALIDASI WAJIB
       -------------------------------------------------------- */

    // [VALIDASI] Kode dan nama adalah field wajib.
    if (!code || !name) {
      Alert.alert(
        'Validasi',
        'Kode dan nama program wajib diisi.',
      );

      return;
    }


    // [VALIDASI] Durasi program wajib tersedia.
    if (!duration) {
      Alert.alert(
        'Validasi',
        'Durasi program wajib diisi.',
      );

      return;
    }


    // [VALIDASI] Level program wajib tersedia.
    if (!level) {
      Alert.alert(
        'Validasi',
        'Level program wajib diisi.',
      );

      return;
    }


    // [VALIDASI] Biaya tidak boleh NaN atau bernilai negatif.
    if (
      Number.isNaN(fee) ||
      fee < 0
    ) {
      Alert.alert(
        'Validasi',
        'Biaya program tidak valid.',
      );

      return;
    }


    /* --------------------------------------------------------
       CEK DUPLIKAT KODE
       -------------------------------------------------------- */

    // [BUSINESS RULE] Kode program harus unik pada data yang telah dimuat.
    const duplicate =
      data.some(
        item =>
          item.code
            .trim()
            .toUpperCase() ===
          code,
      );

    if (duplicate) {
      Alert.alert(
        'Kode Sudah Digunakan',
        `Program dengan kode ${code} sudah tersedia.`,
      );

      return;
    }


    try {
      setSaving(true);

      // [BUSINESS RULE] Program baru dibuat ACTIVE.
      await addProgram({
        code,
        name,
        description,
        duration,
        level,
        fee,
        status: 'ACTIVE',
      });

      setForm(emptyForm);

      setShowForm(false);

      await load();

      Alert.alert(
        'Program Tersimpan',
        `${name} berhasil ditambahkan sebagai program ACTIVE.`,
      );
    } catch (error: any) {
      console.log(
        'PROGRAM SAVE ERROR:',
        error?.code,
        error?.message,
      );

      Alert.alert(
        'Gagal Menyimpan',
        error?.message ||
          'Program tidak dapat disimpan.',
      );
    } finally {
      setSaving(false);
    }
  };


  /* ==========================================================
     UBAH STATUS PROGRAM
     ========================================================== */

  /**
   * FUNGSI: changeStatus
   * --------------------------------------------------------------
   * Tujuan : Mengubah status ACTIVE ↔ INACTIVE.
   * Akses  : Admin saja.
   * Proses : Tentukan status berikutnya → konfirmasi → updateProgram()
   *          → reload daftar.
   */
  const changeStatus = (
    program: CourseProgram,
  ) => {
    // [SECURITY] Participant tidak boleh mengubah status program.
    if (!isAdmin) {
      return;
    }

    // [FLOW] Toggle status program.
    const nextStatus =
      program.status ===
      'ACTIVE'
        ? 'INACTIVE'
        : 'ACTIVE';

    const action =
      nextStatus === 'ACTIVE'
        ? 'Aktifkan'
        : 'Nonaktifkan';

    Alert.alert(
      `${action} Program`,

      `${action} program "${program.name}"?`,

      [
        {
          text: 'Batal',
          style: 'cancel',
        },

        {
          text: action,

          style:
            nextStatus ===
            'INACTIVE'
              ? 'destructive'
              : 'default',

          onPress: async () => {
            try {
              setProcessingId(
                program.id,
              );

              // [FLOW] Simpan status baru melalui service Firestore.
              await updateProgram(
                program.id,
                {
                  status:
                    nextStatus,
                },
              );

              await load();

              Alert.alert(
                'Status Diperbarui',
                `${program.name} sekarang berstatus ${nextStatus}.`,
              );
            } catch (
              error: any
            ) {
              console.log(
                'PROGRAM STATUS ERROR:',
                error?.code,
                error?.message,
              );

              Alert.alert(
                'Gagal Memperbarui',
                error?.message ||
                  'Status program tidak dapat diperbarui.',
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
     RENDER
     ========================================================== */

  return (
    <Layout
      title="Program Kursus"
      subtitle={
        isAdmin
          ? 'Kelola katalog program pelatihan dan status publikasinya.'
          : 'Temukan program pelatihan yang sesuai dengan kebutuhan belajar Anda.'
      }
      refreshing={loading}
      onRefresh={load}
    >

      {/* =====================================================
          HERO
          ===================================================== */}

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
                ? 'grid-outline'
                : 'sparkles-outline'
            }
            size={29}
            color="#FFFFFF"
          />
        </View>

        <View
          style={
            styles.heroContent
          }
        >
          <Text
            style={
              styles.heroOverline
            }
          >
            {isAdmin
              ? 'COURSE MANAGEMENT'
              : 'COURSE CATALOG'}
          </Text>

          <Text
            style={
              styles.heroTitle
            }
          >
            {isAdmin
              ? 'Kelola Program Kursus'
              : 'Belajar & Tingkatkan Skill'}
          </Text>

          <Text
            style={
              styles.heroDescription
            }
          >
            {isAdmin
              ? 'Atur program yang tersedia untuk proses pendaftaran peserta.'
              : 'Pilih program aktif, lihat level dan durasi, kemudian lanjutkan ke kelas yang tersedia.'}
          </Text>
        </View>
      </View>


      {/* =====================================================
          STATISTIK
          ===================================================== */}

      <View
        style={
          styles.statGrid
        }
      >
        <ProgramStat
          icon="library-outline"
          value={
            isAdmin
              ? stats.total
              : stats.active
          }
          label={
            isAdmin
              ? 'Total Program'
              : 'Program Tersedia'
          }
          background={
            isAdmin
              ? ADMIN.soft
              : PARTICIPANT.soft
          }
          iconColor={
            theme.primary
          }
        />

        <ProgramStat
          icon="checkmark-circle-outline"
          value={
            stats.active
          }
          label="Aktif"
          background={
            PARTICIPANT.softTeal
          }
          iconColor="#0F8A78"
        />

        {isAdmin && (
          <ProgramStat
            icon="pause-circle-outline"
            value={
              stats.inactive
            }
            label="Nonaktif"
            background="#FFF0ED"
            iconColor="#C4513C"
          />
        )}
      </View>


      {/* =====================================================
          SEARCH
          ===================================================== */}

      <View
        style={
          styles.searchTitleRow
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
            {isAdmin
              ? 'Daftar Program'
              : 'Jelajahi Program'}
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
            {shown.length} program ditampilkan
          </Text>
        </View>

        <Ionicons
          name="search-outline"
          size={21}
          color={theme.primary}
        />
      </View>


      <Input
        label="Pencarian"
        placeholder="Cari kode, nama, level..."
        value={q}
        onChangeText={setQ}
      />


      {/* =====================================================
          FILTER ADMIN
          ===================================================== */}

      {isAdmin && (
        <View
          style={
            styles.filterRow
          }
        >
          <FilterChip
            label="Semua"
            icon="apps-outline"
            active={
              filter === 'ALL'
            }
            onPress={() =>
              setFilter('ALL')
            }
            activeColor={
              ADMIN.primary
            }
          />

          <FilterChip
            label="Aktif"
            icon="checkmark-circle-outline"
            active={
              filter ===
              'ACTIVE'
            }
            onPress={() =>
              setFilter(
                'ACTIVE',
              )
            }
            activeColor={
              ADMIN.success
            }
          />

          <FilterChip
            label="Nonaktif"
            icon="pause-circle-outline"
            active={
              filter ===
              'INACTIVE'
            }
            onPress={() =>
              setFilter(
                'INACTIVE',
              )
            }
            activeColor={
              ADMIN.danger
            }
          />
        </View>
      )}


      {/* =====================================================
          ADMIN - TOMBOL TAMBAH PROGRAM
          ===================================================== */}

      {isAdmin && (
        <Pressable
          style={[
            styles.addProgramButton,
            {
              backgroundColor:
                showForm
                  ? '#EEF2F7'
                  : ADMIN.primary,
            },
          ]}
          onPress={() =>
            setShowForm(
              current =>
                !current,
            )
          }
        >
          <View
            style={[
              styles.addProgramIcon,
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
              size={22}
              color={
                showForm
                  ? ADMIN.text
                  : '#FFFFFF'
              }
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.addProgramTitle,
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
                : 'Tambah Program Baru'}
            </Text>

            <Text
              style={[
                styles.addProgramSubtitle,
                {
                  color:
                    showForm
                      ? ADMIN.muted
                      : 'rgba(255,255,255,0.75)',
                },
              ]}
            >
              {showForm
                ? 'Kembali ke daftar program'
                : 'Buat program kursus baru'}
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


      {/* =====================================================
          ADMIN - FORM TAMBAH
          ===================================================== */}

      {isAdmin &&
        showForm && (
        <Card>
          <View
            style={
              styles.formHeader
            }
          >
            <View
              style={[
                styles.formHeaderIcon,
                {
                  backgroundColor:
                    ADMIN.soft,
                },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={
                  ADMIN.primary
                }
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.formTitle
                }
              >
                Program Baru
              </Text>

              <Text
                style={
                  styles.formSubtitle
                }
              >
                Lengkapi informasi program kursus.
              </Text>
            </View>
          </View>


          <Input
            label="Kode Program"
            placeholder="Contoh: CRS-RN"
            value={
              form.code
            }
            onChangeText={(
              value: string,
            ) =>
              setForm({
                ...form,
                code: value,
              })
            }
          />

          <Input
            label="Nama Program"
            placeholder="Contoh: React Native Fundamental"
            value={
              form.name
            }
            onChangeText={(
              value: string,
            ) =>
              setForm({
                ...form,
                name: value,
              })
            }
          />

          <Input
            label="Deskripsi"
            placeholder="Deskripsi singkat program..."
            value={
              form.description
            }
            onChangeText={(
              value: string,
            ) =>
              setForm({
                ...form,
                description:
                  value,
              })
            }
          />

          <Input
            label="Durasi"
            placeholder="Contoh: 8 Pertemuan"
            value={
              form.duration
            }
            onChangeText={(
              value: string,
            ) =>
              setForm({
                ...form,
                duration:
                  value,
              })
            }
          />

          <Input
            label="Level"
            placeholder="Pemula / Menengah / Lanjut"
            value={
              form.level
            }
            onChangeText={(
              value: string,
            ) =>
              setForm({
                ...form,
                level: value,
              })
            }
          />

          <Input
            label="Biaya (Informasi Saja)"
            placeholder="750000"
            value={
              form.fee
            }
            onChangeText={(
              value: string,
            ) =>
              setForm({
                ...form,
                fee: value,
              })
            }
            keyboardType="numeric"
          />


          <View
            style={
              styles.infoNote
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={
                ADMIN.secondary
              }
            />

            <Text
              style={
                styles.infoNoteText
              }
            >
              Biaya hanya ditampilkan sebagai informasi. Project 07 tidak terintegrasi dengan sistem pembayaran.
            </Text>
          </View>


          <Button
            title={
              saving
                ? 'Menyimpan...'
                : 'Simpan Program'
            }
            onPress={save}
            icon="save-outline"
          />
        </Card>
      )}


      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {shown.length ===
        0 && (
        <Card>
          <View
            style={
              styles.empty
            }
          >
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor:
                    isAdmin
                      ? ADMIN.soft
                      : PARTICIPANT.soft,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
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
              Program Tidak Ditemukan
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
              Coba gunakan kata kunci atau filter yang berbeda.
            </Text>
          </View>
        </Card>
      )}


      {/* =====================================================
          PROGRAM CARDS
          ===================================================== */}

      {shown.map(
        (
          program,
          index,
        ) => {
          const active =
            program.status ===
            'ACTIVE';

          return (
            <View
              key={
                program.id
              }
              style={[
                styles.programCard,
                {
                  borderColor:
                    isAdmin
                      ? ADMIN.border
                      : PARTICIPANT.border,
                },
              ]}
            >
              {/* Accent bar */}

              <View
                style={[
                  styles.cardAccent,
                  {
                    backgroundColor:
                      getAccentColor(
                        index,
                        isAdmin,
                      ),
                  },
                ]}
              />


              {/* Header */}

              <View
                style={
                  styles.programHeader
                }
              >
                <View
                  style={[
                    styles.programIcon,
                    {
                      backgroundColor:
                        isAdmin
                          ? ADMIN.soft
                          : PARTICIPANT.soft,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      getProgramIcon(
                        program,
                      )
                    }
                    size={23}
                    color={
                      theme.primary
                    }
                  />
                </View>

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={[
                      styles.programCode,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    {program.code}
                  </Text>

                  <Text
                    style={[
                      styles.programName,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {program.name}
                  </Text>
                </View>


                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        active
                          ? '#E4F7EE'
                          : '#FCE9E9',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          active
                            ? '#16845B'
                            : '#C43D4D',
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          active
                            ? '#16845B'
                            : '#C43D4D',
                      },
                    ]}
                  >
                    {active
                      ? 'AKTIF'
                      : 'NONAKTIF'}
                  </Text>
                </View>
              </View>


              {/* Description */}

              <Text
                style={[
                  styles.description,
                  {
                    color:
                      theme.muted,
                  },
                ]}
              >
                {program.description ||
                  'Belum ada deskripsi program.'}
              </Text>


              {/* Meta */}

              <View
                style={
                  styles.metaGrid
                }
              >
                <MetaItem
                  icon="speedometer-outline"
                  label="Level"
                  value={
                    program.level ||
                    '-'
                  }
                  color={
                    theme.primary
                  }
                />

                <MetaItem
                  icon="time-outline"
                  label="Durasi"
                  value={
                    program.duration ||
                    '-'
                  }
                  color={
                    isAdmin
                      ? ADMIN.secondary
                      : PARTICIPANT.secondary
                  }
                />
              </View>


              {/* Fee */}

              <View
                style={[
                  styles.feeBox,
                  {
                    backgroundColor:
                      isAdmin
                        ? ADMIN.soft2
                        : PARTICIPANT.softTeal,
                  },
                ]}
              >
                <View
                  style={
                    styles.feeIcon
                  }
                >
                  <Ionicons
                    name="wallet-outline"
                    size={19}
                    color={
                      isAdmin
                        ? ADMIN.primary
                        : PARTICIPANT.secondary
                    }
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.feeLabel,
                      {
                        color:
                          theme.muted,
                      },
                    ]}
                  >
                    Biaya Program
                  </Text>

                  <Text
                    style={[
                      styles.feeValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {formatRupiah(
                      program.fee,
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.infoOnlyBadge
                  }
                >
                  <Text
                    style={
                      styles.infoOnlyText
                    }
                  >
                    INFORMASI
                  </Text>
                </View>
              </View>


              {/* Participant info */}

              {!isAdmin && (
                <View
                  style={
                    styles.participantHint
                  }
                >
                  <Ionicons
                    name="arrow-forward-circle-outline"
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
                    Buka menu Kelas untuk melihat jadwal dan melakukan pendaftaran.
                  </Text>
                </View>
              )}


              {/* Admin action */}

              {isAdmin && (
                <View
                  style={
                    styles.adminAction
                  }
                >
                  <Button
                    title={
                      processingId ===
                      program.id
                        ? 'Memproses...'
                        : active
                          ? 'Nonaktifkan Program'
                          : 'Aktifkan Program'
                    }
                    kind="light"
                    icon={
                      active
                        ? 'pause-circle-outline'
                        : 'checkmark-circle-outline'
                    }
                    onPress={() =>
                      changeStatus(
                        program,
                      )
                    }
                  />
                </View>
              )}
            </View>
          );
        },
      )}


      {/* =====================================================
          PARTICIPANT FOOTER
          ===================================================== */}

      {!isAdmin &&
        shown.length > 0 && (
        <View
          style={
            styles.participantFooter
          }
        >
          <Ionicons
            name="school-outline"
            size={24}
            color={
              PARTICIPANT.primary
            }
          />

          <View style={{ flex: 1 }}>
            <Text
              style={
                styles.participantFooterTitle
              }
            >
              Sudah menemukan program?
            </Text>

            <Text
              style={
                styles.participantFooterText
              }
            >
              Lanjutkan ke menu Kelas untuk memilih jadwal yang masih OPEN dan memiliki kursi tersedia.
            </Text>
          </View>
        </View>
      )}

    </Layout>
  );
}


/* ============================================================
   COMPONENT - STAT
   ============================================================ */

function ProgramStat({
  icon,
  value,
  label,
  background,
  iconColor,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  background: string;
  iconColor: string;
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
   COMPONENT - FILTER
   ============================================================ */

function FilterChip({
  label,
  icon,
  active,
  onPress,
  activeColor,
}: {
  label: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  activeColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,

        active && {
          backgroundColor:
            activeColor,

          borderColor:
            activeColor,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={15}
        color={
          active
            ? '#FFFFFF'
            : '#697386'
        }
      />

      <Text
        style={[
          styles.filterText,

          active && {
            color:
              '#FFFFFF',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}


/* ============================================================
   COMPONENT - META
   ============================================================ */

function MetaItem({
  icon,
  label,
  value,
  color,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={
        styles.metaItem
      }
    >
      <View
        style={
          styles.metaIcon
        }
      >
        <Ionicons
          name={icon}
          size={18}
          color={color}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={
            styles.metaLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.metaValue
          }
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


/* ============================================================
   HELPER - ICON PROGRAM
   ============================================================ */

function getProgramIcon(
  program: CourseProgram,
): keyof typeof Ionicons.glyphMap {
  const text =
    `${program.name} ${program.code}`
      .toLowerCase();

  if (
    text.includes('iot') ||
    text.includes('esp')
  ) {
    return 'hardware-chip-outline';
  }

  if (
    text.includes('web')
  ) {
    return 'globe-outline';
  }

  if (
    text.includes('mobile') ||
    text.includes('react')
  ) {
    return 'phone-portrait-outline';
  }

  if (
    text.includes('data')
  ) {
    return 'analytics-outline';
  }

  return 'book-outline';
}


/* ============================================================
   HELPER - ACCENT CARD
   ============================================================ */

function getAccentColor(
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
    index %
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
      marginBottom: 15,
    },

    heroIcon: {
      width: 57,
      height: 57,
      borderRadius: 18,
      backgroundColor:
        'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    heroContent: {
      flex: 1,
    },

    heroOverline: {
      color:
        'rgba(255,255,255,0.72)',
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

    heroDescription: {
      color:
        'rgba(255,255,255,0.86)',
      fontSize: 11,
      lineHeight: 17,
      marginTop: 4,
    },

    statGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 18,
    },

    statCard: {
      flex: 1,
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        '#EBEEF3',
      padding: 11,
    },

    statIcon: {
      width: 35,
      height: 35,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 7,
    },

    statValue: {
      color: '#1D2433',
      fontSize: 20,
      fontWeight: '900',
    },

    statLabel: {
      color: '#70798A',
      fontSize: 9,
      fontWeight: '700',
      marginTop: 2,
    },

    searchTitleRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
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

    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginBottom: 12,
    },

    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor:
        '#E1E6EE',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 20,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },

    filterText: {
      color: '#697386',
      fontSize: 10,
      fontWeight: '800',
    },

    addProgramButton: {
      minHeight: 66,
      borderRadius: 17,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },

    addProgramIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    addProgramTitle: {
      fontSize: 13,
      fontWeight: '900',
    },

    addProgramSubtitle: {
      fontSize: 9,
      marginTop: 2,
    },

    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },

    formHeaderIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    formTitle: {
      color: ADMIN.text,
      fontSize: 16,
      fontWeight: '900',
    },

    formSubtitle: {
      color: ADMIN.muted,
      fontSize: 10,
      marginTop: 2,
    },

    infoNote: {
      backgroundColor:
        '#EEF5FF',
      borderRadius: 12,
      padding: 10,
      flexDirection: 'row',
      gap: 7,
      alignItems:
        'flex-start',
      marginBottom: 11,
    },

    infoNoteText: {
      flex: 1,
      color: '#53647C',
      fontSize: 10,
      lineHeight: 15,
    },

    programCard: {
      backgroundColor:
        '#FFFFFF',
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

    programHeader: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 9,
    },

    programIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    programCode: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },

    programName: {
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

    description: {
      fontSize: 11,
      lineHeight: 18,
      marginTop: 12,
      marginBottom: 11,
    },

    metaGrid: {
      flexDirection: 'row',
      gap: 8,
    },

    metaItem: {
      flex: 1,
      backgroundColor:
        '#F8F9FC',
      borderRadius: 13,
      padding: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    metaIcon: {
      width: 29,
      height: 29,
      borderRadius: 9,
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    metaLabel: {
      color: '#8A91A1',
      fontSize: 8,
      fontWeight: '700',
    },

    metaValue: {
      color: '#303849',
      fontSize: 10,
      fontWeight: '900',
      marginTop: 2,
    },

    feeBox: {
      borderRadius: 14,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 9,
    },

    feeIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor:
        'rgba(255,255,255,0.75)',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    feeLabel: {
      fontSize: 8,
      fontWeight: '700',
    },

    feeValue: {
      fontSize: 13,
      fontWeight: '900',
      marginTop: 1,
    },

    infoOnlyBadge: {
      backgroundColor:
        'rgba(255,255,255,0.75)',
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius: 8,
    },

    infoOnlyText: {
      color: '#657083',
      fontSize: 7,
      fontWeight: '900',
    },

    participantHint: {
      backgroundColor:
        '#F0FBF8',
      borderRadius: 12,
      padding: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 9,
    },

    participantHintText: {
      flex: 1,
      color: '#31776D',
      fontSize: 9,
      fontWeight: '700',
      lineHeight: 14,
    },

    adminAction: {
      marginTop: 10,
    },

    empty: {
      alignItems: 'center',
      paddingVertical: 17,
    },

    emptyIcon: {
      width: 55,
      height: 55,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent:
        'center',
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

    participantFooter: {
      backgroundColor:
        PARTICIPANT.soft,
      borderRadius: 17,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 3,
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
  });