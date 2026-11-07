/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * a
 * Fungsi File :
 * - Mengelola master data instruktur kursus.
 * - Menampilkan statistik instruktur ACTIVE dan INACTIVE.
 * - Menangani pencarian dan filter data instruktur.
 * - Menambahkan serta memperbarui data instruktur.
 * - Memvalidasi kode, email, dan duplikasi data.
 * - Mengaktifkan atau menonaktifkan instruktur.
 * - Menyediakan seed data instruktur contoh.
 *
 * Catatan Pembelajaran:
 * Instruktur merupakan MASTER DATA, bukan role/akun login aplikasi.
 * Role aplikasi tetap hanya admin dan participant.
 *
 * Penanda:
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan input/data
 * [BUSINESS RULE] Aturan bisnis aplikasi
 * [SECURITY]      Batas akses/fungsi
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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import Layout from '../components/Layout';

import {
  Button,
  Input,
} from '../components/UI';

import {
  addInstructor,
  listInstructors,
  seedInstructors,
  updateInstructor,
} from '../services/firestore';

import { Instructor } from '../types';

type InstructorForm = {
  code: string;
  name: string;
  expertise: string;
  email: string;
  phone: string;
};

type InstructorFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'INACTIVE';

const emptyForm: InstructorForm = {
  code: '',
  name: '',
  expertise: '',
  email: '',
  phone: '',
};

/* ============================================================
   TEMA ADMIN

   Menu Instruktur hanya dikelola oleh Admin.
   Warna dibuat konsisten dengan dashboard Admin:
   Navy + Blue.
   ============================================================ */

const theme = {
  primary: '#1D4ED8',
  primaryDark: '#172554',
  primarySoft: '#EFF6FF',

  success: '#16A34A',
  successSoft: '#DCFCE7',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',

  warning: '#D97706',
  warningSoft: '#FEF3C7',

  purple: '#7C3AED',
  purpleSoft: '#F3E8FF',

  cyan: '#0891B2',
  cyanSoft: '#CFFAFE',

  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  background: '#F8FAFC',
};

/* ============================================================
   SCREEN
   ============================================================ */

export default function InstructorScreen() {
  const [
    instructors,
    setInstructors,
  ] = useState<Instructor[]>([]);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] = useState<InstructorFilter>('ALL');

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] = useState<Instructor | null>(null);

  const [
    form,
    setForm,
  ] = useState<InstructorForm>(
    emptyForm
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  /* ==========================================================
     LOAD DATA
     ========================================================== */

  /**
   * FUNGSI: load
   * --------------------------------------------------------------
   * Tujuan : Mengambil master data instruktur dari Firestore.
   * Proses : Aktifkan refreshing → listInstructors() → urutkan kode
   *          → simpan ke state.
   * Output : Daftar instruktur terbaru pada state instructors.
   */
  const load = async () => {
    setRefreshing(true);

    try {
      // [FLOW] Ambil seluruh master instruktur melalui service Firestore.
      const data =
        await listInstructors();

      // [FLOW] Data diurutkan berdasarkan kode instruktur.
      data.sort(
        (
          a: Instructor,
          b: Instructor
        ) =>
          a.code.localeCompare(
            b.code
          )
      );

      setInstructors(data);
    } catch (error: any) {
      console.log(
        'LOAD INSTRUCTOR ERROR:',
        error?.code,
        error?.message
      );

      Alert.alert(
        'Gagal Memuat Instruktur',
        error?.message ||
          'Data instruktur tidak dapat dimuat.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  // [FLOW] Muat ulang data setiap screen memperoleh fokus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  /* ==========================================================
     STATISTIK
     ========================================================== */

  // [FLOW] Statistik diturunkan dari state instructors.
  const activeCount = useMemo(
    () =>
      instructors.filter(
        (item: Instructor) =>
          item.status === 'ACTIVE'
      ).length,
    [instructors]
  );

  const inactiveCount = useMemo(
    () =>
      instructors.filter(
        (item: Instructor) =>
          item.status === 'INACTIVE'
      ).length,
    [instructors]
  );

  /* ==========================================================
     SEARCH + FILTER
     ========================================================== */

  // [FLOW] Search dan filter bekerja pada data yang sudah dimuat.
  const filteredData = useMemo(
    () => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return instructors.filter(
        (item: Instructor) => {
          const matchStatus =
            filter === 'ALL' ||
            item.status === filter;

          const matchSearch =
            !keyword ||
            item.code
              .toLowerCase()
              .includes(keyword) ||
            item.name
              .toLowerCase()
              .includes(keyword) ||
            item.expertise
              .toLowerCase()
              .includes(keyword) ||
            item.email
              .toLowerCase()
              .includes(keyword) ||
            (item.phone || '')
              .toLowerCase()
              .includes(keyword);

          return (
            matchStatus &&
            matchSearch
          );
        }
      );
    },
    [
      instructors,
      search,
      filter,
    ]
  );

  /* ==========================================================
     FORM
     ========================================================== */

  const updateForm = (
    field: keyof InstructorForm,
    value: string
  ) => {
    setForm(
      (
        previous:
          InstructorForm
      ) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  // [FLOW] Mode tambah: kosongkan form dan buka modal.
  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  // [FLOW] Mode edit: isi form dengan data instruktur terpilih.
  const openEdit = (
    instructor: Instructor
  ) => {
    setEditing(instructor);

    setForm({
      code: instructor.code,
      name: instructor.name,
      expertise:
        instructor.expertise,
      email: instructor.email,
      phone: instructor.phone || '',
    });

    setModalVisible(true);
  };

  // [VALIDASI] Modal tidak ditutup saat proses penyimpanan berlangsung.
  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setEditing(null);
    setForm(emptyForm);
  };

  /* ==========================================================
     SIMPAN
     ========================================================== */

  /**
   * FUNGSI: save
   * --------------------------------------------------------------
   * Tujuan : Menambah atau memperbarui master instruktur.
   * Input  : code, name, expertise, email, phone.
   * Proses : Normalisasi → validasi → cek duplikat → add/update.
   * Output : Data tersimpan dan daftar dimuat ulang.
   */
  const save = async () => {
    // [FLOW] Normalisasi dilakukan sebelum validasi.
    const code =
      form.code
        .trim()
        .toUpperCase();

    const name =
      form.name.trim();

    const expertise =
      form.expertise.trim();

    const email =
      form.email
        .trim()
        .toLowerCase();

    const phone =
      form.phone.trim();

    /* --------------------------------------------------------
       FIELD WAJIB
       -------------------------------------------------------- */

    // [VALIDASI] Empat field utama wajib diisi.
    if (
      !code ||
      !name ||
      !expertise ||
      !email
    ) {
      Alert.alert(
        'Validasi Data',
        'Kode, nama, bidang keahlian, dan email wajib diisi.'
      );

      return;
    }

    /* --------------------------------------------------------
       FORMAT KODE
       -------------------------------------------------------- */

    // [BUSINESS RULE] Kode harus mengikuti pola INS-001, INS-002, dst.
    if (
      !/^INS-\d{3,}$/.test(code)
    ) {
      Alert.alert(
        'Format Kode Tidak Valid',
        'Gunakan format kode seperti INS-001.'
      );

      return;
    }

    /* --------------------------------------------------------
       FORMAT EMAIL
       -------------------------------------------------------- */

    // [VALIDASI] Email harus mempunyai format alamat email yang benar.
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      Alert.alert(
        'Email Tidak Valid',
        'Masukkan alamat email dengan format yang benar.'
      );

      return;
    }

    /* --------------------------------------------------------
       DUPLIKAT KODE
       -------------------------------------------------------- */

    // [BUSINESS RULE] Kode instruktur harus unik, termasuk saat edit.
    const duplicateCode =
      instructors.some(
        (item: Instructor) =>
          item.code
            .toUpperCase() ===
            code &&
          item.id !== editing?.id
      );

    if (duplicateCode) {
      Alert.alert(
        'Kode Sudah Digunakan',
        `Kode instruktur ${code} sudah digunakan oleh instruktur lain.`
      );

      return;
    }

    /* --------------------------------------------------------
       DUPLIKAT EMAIL
       -------------------------------------------------------- */

    // [BUSINESS RULE] Email instruktur juga harus unik.
    const duplicateEmail =
      instructors.some(
        (item: Instructor) =>
          item.email
            .toLowerCase() ===
            email &&
          item.id !== editing?.id
      );

    if (duplicateEmail) {
      Alert.alert(
        'Email Sudah Digunakan',
        'Email tersebut sudah digunakan oleh instruktur lain.'
      );

      return;
    }

    setSaving(true);

    try {
      if (editing) {
        // [FLOW] Jika editing tersedia, perbarui dokumen yang sudah ada.
        await updateInstructor(
          editing.id,
          {
            code,
            name,
            expertise,
            email,
            phone,
          }
        );

        Alert.alert(
          'Berhasil',
          'Data instruktur berhasil diperbarui.'
        );
      } else {
        // [BUSINESS RULE] Instruktur baru selalu dibuat ACTIVE.
        await addInstructor({
          code,
          name,
          expertise,
          email,
          phone,
          status: 'ACTIVE',
        });

        Alert.alert(
          'Berhasil',
          'Instruktur baru berhasil ditambahkan.'
        );
      }

      setModalVisible(false);
      setEditing(null);
      setForm(emptyForm);

      await load();
    } catch (error: any) {
      console.log(
        'SAVE INSTRUCTOR ERROR:',
        error?.code,
        error?.message
      );

      Alert.alert(
        'Gagal Menyimpan',
        error?.message ||
          'Data instruktur tidak dapat disimpan.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================
     ACTIVE / INACTIVE
     ========================================================== */

  /**
   * FUNGSI: toggleStatus
   * --------------------------------------------------------------
   * Tujuan : Mengubah status ACTIVE ↔ INACTIVE.
   * Proses : Tentukan status baru → konfirmasi → updateInstructor()
   *          → muat ulang data.
   */
  const toggleStatus = (
    instructor: Instructor
  ) => {
    const nextStatus:
      | 'ACTIVE'
      | 'INACTIVE' =
      instructor.status ===
      'ACTIVE'
        ? 'INACTIVE'
        : 'ACTIVE';

    const action =
      nextStatus === 'ACTIVE'
        ? 'mengaktifkan'
        : 'menonaktifkan';

    Alert.alert(
      nextStatus === 'ACTIVE'
        ? 'Aktifkan Instruktur'
        : 'Nonaktifkan Instruktur',
      `Apakah Anda yakin ingin ${action} ${instructor.name}?`,
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text:
            nextStatus === 'ACTIVE'
              ? 'Aktifkan'
              : 'Nonaktifkan',

          style:
            nextStatus === 'INACTIVE'
              ? 'destructive'
              : 'default',

          onPress: async () => {
            try {
              await updateInstructor(
                instructor.id,
                {
                  status:
                    nextStatus,
                }
              );

              await load();
            } catch (
              error: any
            ) {
              console.log(
                'UPDATE STATUS ERROR:',
                error?.code,
                error?.message
              );

              Alert.alert(
                'Gagal',
                error?.message ||
                  'Status instruktur tidak dapat diubah.'
              );
            }
          },
        },
      ]
    );
  };

  /* ==========================================================
     SEED DATA
     ========================================================== */

  /**
   * FUNGSI: handleSeed
   * --------------------------------------------------------------
   * Tujuan : Membuat data instruktur contoh jika master masih kosong.
   * Output : Pesan berhasil / data sudah tersedia, lalu reload.
   */
  const handleSeed = async () => {
    try {
      const success =
        await seedInstructors();

      if (success) {
        Alert.alert(
          'Seed Berhasil',
          'Tiga data instruktur contoh berhasil ditambahkan.'
        );
      } else {
        Alert.alert(
          'Data Sudah Tersedia',
          'Seed tidak dijalankan karena data instruktur sudah tersedia.'
        );
      }

      await load();
    } catch (error: any) {
      console.log(
        'SEED INSTRUCTOR ERROR:',
        error?.code,
        error?.message
      );

      Alert.alert(
        'Seed Gagal',
        error?.message ||
          'Data contoh instruktur tidak dapat dibuat.'
      );
    }
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <Layout
      title="Instruktur"
      subtitle="Master data tenaga pengajar kursus."
      refreshing={refreshing}
      onRefresh={load}
    >
      {/* ======================================================
          HERO
          ====================================================== */}

      <View style={styles.hero}>
        <View style={styles.heroDecorationOne} />
        <View style={styles.heroDecorationTwo} />

        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="school-outline"
              size={30}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.heroBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color="#DBEAFE"
            />

            <Text style={styles.heroBadgeText}>
              ADMIN
            </Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>
          Manajemen Instruktur
        </Text>

        <Text style={styles.heroText}>
          Kelola tenaga pengajar,
          bidang keahlian, kontak,
          serta status instruktur
          untuk setiap kelas kursus.
        </Text>

        <View style={styles.heroInfo}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color="#BFDBFE"
          />

          <Text style={styles.heroInfoText}>
            Instruktur merupakan
            master data, bukan akun
            login aplikasi.
          </Text>
        </View>
      </View>

      {/* ======================================================
          STATISTIK
          ====================================================== */}

      <View style={styles.statRow}>
        <StatCard
          icon="people-outline"
          value={instructors.length}
          label="Total"
          background="#EFF6FF"
          iconColor="#2563EB"
        />

        <StatCard
          icon="checkmark-circle-outline"
          value={activeCount}
          label="Aktif"
          background="#F0FDF4"
          iconColor="#16A34A"
        />

        <StatCard
          icon="pause-circle-outline"
          value={inactiveCount}
          label="Nonaktif"
          background="#FEF2F2"
          iconColor="#DC2626"
        />
      </View>

      {/* ======================================================
          ACTION PANEL
          ====================================================== */}

      <View style={styles.actionPanel}>
        <View style={styles.actionPanelHeader}>
          <View style={styles.actionPanelIcon}>
            <Ionicons
              name="people-circle-outline"
              size={24}
              color={theme.primary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.actionPanelTitle}>
              Master Instruktur
            </Text>

            <Text style={styles.actionPanelText}>
              Tambahkan dan kelola
              tenaga pengajar kursus.
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={openAdd}
        >
          <Ionicons
            name="person-add-outline"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.addButtonText}>
            Tambah Instruktur
          </Text>
        </Pressable>

        {instructors.length === 0 && (
          <Pressable
            style={styles.seedButton}
            onPress={handleSeed}
          >
            <Ionicons
              name="sparkles-outline"
              size={19}
              color={theme.purple}
            />

            <Text style={styles.seedButtonText}>
              Seed Instruktur Demo
            </Text>
          </Pressable>
        )}
      </View>

      {/* ======================================================
          SEARCH
          ====================================================== */}

      <View style={styles.searchSection}>
        <View style={styles.searchTitleRow}>
          <Ionicons
            name="search-outline"
            size={19}
            color={theme.primary}
          />

          <Text style={styles.searchTitle}>
            Cari Instruktur
          </Text>
        </View>

        <Input
          label=""
          value={search}
          onChangeText={(
            value: string
          ) => setSearch(value)}
          placeholder="Nama, kode, keahlian, email, atau HP..."
          autoCapitalize="none"
        />
      </View>

      {/* ======================================================
          FILTER
          ====================================================== */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          styles.filterContainer
        }
      >
        <FilterButton
          label="Semua"
          count={instructors.length}
          active={filter === 'ALL'}
          onPress={() =>
            setFilter('ALL')
          }
        />

        <FilterButton
          label="Aktif"
          count={activeCount}
          active={
            filter === 'ACTIVE'
          }
          onPress={() =>
            setFilter('ACTIVE')
          }
        />

        <FilterButton
          label="Nonaktif"
          count={inactiveCount}
          active={
            filter === 'INACTIVE'
          }
          onPress={() =>
            setFilter('INACTIVE')
          }
        />
      </ScrollView>

      {/* ======================================================
          HASIL
          ====================================================== */}

      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.resultTitle}>
            Daftar Instruktur
          </Text>

          <Text style={styles.resultSubtitle}>
            {filteredData.length}{' '}
            instruktur ditemukan
          </Text>
        </View>

        <View style={styles.resultIcon}>
          <Ionicons
            name="list-outline"
            size={20}
            color={theme.primary}
          />
        </View>
      </View>

      {/* ======================================================
          EMPTY STATE
          ====================================================== */}

      {filteredData.length === 0 && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="school-outline"
              size={34}
              color={theme.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Instruktur Tidak Ditemukan
          </Text>

          <Text style={styles.emptyText}>
            Tidak ada data yang sesuai
            dengan pencarian atau filter
            yang dipilih.
          </Text>

          {instructors.length === 0 && (
            <Pressable
              style={styles.emptySeedButton}
              onPress={handleSeed}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.emptySeedButtonText
                }
              >
                Isi Data Contoh
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ======================================================
          INSTRUCTOR CARDS
          ====================================================== */}

      {filteredData.map(
        (
          instructor: Instructor
        ) => (
          <View
            key={instructor.id}
            style={styles.instructorCard}
          >
            {/* HEADER */}

            <View style={styles.cardHeader}>
              <View
                style={
                  styles.avatarContainer
                }
              >
                <Text style={styles.avatarText}>
                  {getInitials(
                    instructor.name
                  )}
                </Text>
              </View>

              <View style={styles.cardIdentity}>
                <View
                  style={
                    styles.codeContainer
                  }
                >
                  <Ionicons
                    name="id-card-outline"
                    size={14}
                    color={theme.primary}
                  />

                  <Text
                    style={
                      styles.instructorCode
                    }
                  >
                    {instructor.code}
                  </Text>
                </View>

                <Text
                  style={
                    styles.instructorName
                  }
                >
                  {instructor.name}
                </Text>
              </View>

              <StatusBadge
                status={
                  instructor.status
                }
              />
            </View>

            {/* EXPERTISE */}

            <View style={styles.expertiseBox}>
              <View
                style={
                  styles.expertiseIcon
                }
              >
                <Ionicons
                  name="ribbon-outline"
                  size={20}
                  color={theme.purple}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.infoMiniLabel
                  }
                >
                  BIDANG KEAHLIAN
                </Text>

                <Text
                  style={
                    styles.expertiseText
                  }
                >
                  {instructor.expertise}
                </Text>
              </View>
            </View>

            {/* CONTACT */}

            <View style={styles.contactGrid}>
              <InfoBox
                icon="mail-outline"
                label="Email"
                value={
                  instructor.email
                }
                background="#EFF6FF"
                iconColor="#2563EB"
              />

              <InfoBox
                icon="call-outline"
                label="No. HP"
                value={
                  instructor.phone ||
                  '-'
                }
                background="#ECFDF5"
                iconColor="#059669"
              />
            </View>

            {/* DIVIDER */}

            <View style={styles.divider} />

            {/* ACTION */}

            <View style={styles.cardActions}>
              <Pressable
                style={styles.editButton}
                onPress={() =>
                  openEdit(instructor)
                }
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={theme.primary}
                />

                <Text
                  style={
                    styles.editButtonText
                  }
                >
                  Edit
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.statusButton,

                  instructor.status ===
                  'ACTIVE'
                    ? styles.disableButton
                    : styles.enableButton,
                ]}
                onPress={() =>
                  toggleStatus(
                    instructor
                  )
                }
              >
                <Ionicons
                  name={
                    instructor.status ===
                    'ACTIVE'
                      ? 'power-outline'
                      : 'checkmark-circle-outline'
                  }
                  size={18}
                  color={
                    instructor.status ===
                    'ACTIVE'
                      ? theme.danger
                      : theme.success
                  }
                />

                <Text
                  style={[
                    styles.statusButtonText,
                    {
                      color:
                        instructor.status ===
                        'ACTIVE'
                          ? theme.danger
                          : theme.success,
                    },
                  ]}
                >
                  {instructor.status ===
                  'ACTIVE'
                    ? 'Nonaktifkan'
                    : 'Aktifkan'}
                </Text>
              </Pressable>
            </View>
          </View>
        )
      )}

      {/* ======================================================
          MODAL ADD / EDIT
          ====================================================== */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.overlay}>
          <View
            style={
              styles.modalContainer
            }
          >
            {/* MODAL HANDLE */}

            <View
              style={styles.modalHandle}
            />

            {/* HEADER */}

            <View
              style={styles.modalHeader}
            >
              <View
                style={
                  styles.modalTitleArea
                }
              >
                <View
                  style={
                    styles.modalIcon
                  }
                >
                  <Ionicons
                    name={
                      editing
                        ? 'create-outline'
                        : 'person-add-outline'
                    }
                    size={23}
                    color={theme.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {editing
                      ? 'Edit Instruktur'
                      : 'Tambah Instruktur'}
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {editing
                      ? 'Perbarui informasi tenaga pengajar.'
                      : 'Lengkapi data tenaga pengajar baru.'}
                  </Text>
                </View>
              </View>

              <Pressable
                style={
                  styles.closeButton
                }
                onPress={closeModal}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={theme.text}
                />
              </Pressable>
            </View>

            {/* FORM */}

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.modalContent
              }
            >
              <View style={styles.formInfo}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={theme.primary}
                />

                <Text
                  style={
                    styles.formInfoText
                  }
                >
                  Kode instruktur harus
                  unik dengan format
                  INS-001, INS-002, dan
                  seterusnya.
                </Text>
              </View>

              <Input
                label="Kode Instruktur"
                value={form.code}
                onChangeText={(
                  value: string
                ) =>
                  updateForm(
                    'code',
                    value
                  )
                }
                placeholder="Contoh: INS-004"
                autoCapitalize="characters"
              />

              <Input
                label="Nama Lengkap"
                value={form.name}
                onChangeText={(
                  value: string
                ) =>
                  updateForm(
                    'name',
                    value
                  )
                }
                placeholder="Nama lengkap instruktur"
              />

              <Input
                label="Bidang Keahlian"
                value={
                  form.expertise
                }
                onChangeText={(
                  value: string
                ) =>
                  updateForm(
                    'expertise',
                    value
                  )
                }
                placeholder="Contoh: Mobile Development"
              />

              <Input
                label="Email"
                value={form.email}
                onChangeText={(
                  value: string
                ) =>
                  updateForm(
                    'email',
                    value
                  )
                }
                placeholder="nama@ppnp.ac.id"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="No. HP"
                value={form.phone}
                onChangeText={(
                  value: string
                ) =>
                  updateForm(
                    'phone',
                    value
                  )
                }
                placeholder="08xxxxxxxxxx"
                keyboardType="phone-pad"
              />

              <View
                style={
                  styles.modalActions
                }
              >
                <Button
                  title={
                    saving
                      ? 'Menyimpan...'
                      : editing
                      ? 'Simpan Perubahan'
                      : 'Simpan Instruktur'
                  }
                  icon="save-outline"
                  onPress={save}
                  disabled={saving}
                />

                <Button
                  title="Batal"
                  icon="close-outline"
                  kind="light"
                  onPress={closeModal}
                  disabled={saving}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

/* ============================================================
   HELPER
   ============================================================ */

function getInitials(
  name: string
) {
  const words =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (words.length === 0) {
    return 'IN';
  }

  if (words.length === 1) {
    return words[0]
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    words[0][0] +
    words[1][0]
  ).toUpperCase();
}

/* ============================================================
   STAT CARD
   ============================================================ */

function StatCard({
  icon,
  value,
  label,
  background,
  iconColor,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >['name'];
  value: number;
  label: string;
  background: string;
  iconColor: string;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor:
            background,
        },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor:
              '#FFFFFF',
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <Text style={styles.statNumber}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

/* ============================================================
   FILTER BUTTON
   ============================================================ */

function FilterButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterButton,
        active &&
          styles.filterButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          active &&
            styles.filterTextActive,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.filterCount,
          active &&
            styles.filterCountActive,
        ]}
      >
        <Text
          style={[
            styles.filterCountText,
            active &&
              styles.filterCountTextActive,
          ]}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

/* ============================================================
   STATUS BADGE
   ============================================================ */

function StatusBadge({
  status,
}: {
  status: 'ACTIVE' | 'INACTIVE';
}) {
  const active =
    status === 'ACTIVE';

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: active
            ? theme.successSoft
            : theme.dangerSoft,
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: active
              ? theme.success
              : theme.danger,
          },
        ]}
      />

      <Text
        style={[
          styles.statusBadgeText,
          {
            color: active
              ? theme.success
              : theme.danger,
          },
        ]}
      >
        {active
          ? 'AKTIF'
          : 'NONAKTIF'}
      </Text>
    </View>
  );
}

/* ============================================================
   INFO BOX
   ============================================================ */

function InfoBox({
  icon,
  label,
  value,
  background,
  iconColor,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >['name'];
  label: string;
  value: string;
  background: string;
  iconColor: string;
}) {
  return (
    <View
      style={[
        styles.infoBox,
        {
          backgroundColor:
            background,
        },
      ]}
    >
      <View
        style={styles.infoBoxHeader}
      >
        <Ionicons
          name={icon}
          size={16}
          color={iconColor}
        />

        <Text
          style={styles.infoBoxLabel}
        >
          {label}
        </Text>
      </View>

      <Text
        style={styles.infoBoxValue}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
   STYLE
   ============================================================ */

const styles = StyleSheet.create({
  /* HERO */

  hero: {
    backgroundColor:
      theme.primaryDark,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },

  heroDecorationOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor:
      'rgba(59,130,246,0.20)',
    right: -45,
    top: -55,
  },

  heroDecorationTwo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor:
      'rgba(14,165,233,0.14)',
    right: 55,
    bottom: -60,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 18,
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor:
      'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor:
      'rgba(255,255,255,0.10)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },

  heroBadgeText: {
    color: '#DBEAFE',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.8,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  heroText: {
    color: '#CBD5E1',
    lineHeight: 21,
    marginTop: 7,
    maxWidth: '92%',
  },

  heroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor:
      'rgba(255,255,255,0.12)',
  },

  heroInfoText: {
    flex: 1,
    color: '#BFDBFE',
    fontSize: 12,
    lineHeight: 17,
  },

  /* STAT */

  statRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    minHeight: 124,
    borderRadius: 19,
    padding: 13,
    borderWidth: 1,
    borderColor:
      'rgba(226,232,240,0.8)',
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  statNumber: {
    fontSize: 25,
    fontWeight: '900',
    color: theme.text,
  },

  statLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  /* ACTION PANEL */

  actionPanel: {
    backgroundColor:
      theme.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 14,
  },

  actionPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 15,
  },

  actionPanelIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor:
      theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionPanelTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.text,
  },

  actionPanelText: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 3,
  },

  addButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor:
      theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  seedButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor:
      theme.purpleSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 9,
  },

  seedButtonText: {
    color: theme.purple,
    fontWeight: '900',
  },

  /* SEARCH */

  searchSection: {
    backgroundColor:
      theme.surface,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },

  searchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 3,
  },

  searchTitle: {
    fontWeight: '900',
    color: theme.text,
  },

  /* FILTER */

  filterContainer: {
    gap: 8,
    paddingVertical: 5,
    paddingRight: 10,
    marginBottom: 12,
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: 999,
    backgroundColor:
      '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
  },

  filterButtonActive: {
    backgroundColor:
      theme.primaryDark,
    borderColor:
      theme.primaryDark,
  },

  filterText: {
    color: theme.muted,
    fontWeight: '800',
    fontSize: 12,
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor:
      '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterCountActive: {
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  filterCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.text,
  },

  filterCountTextActive: {
    color: '#FFFFFF',
  },

  /* RESULT */

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginTop: 3,
    marginBottom: 10,
  },

  resultTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.text,
  },

  resultSubtitle: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 2,
  },

  resultIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor:
      theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* CARD */

  instructorCard: {
    backgroundColor:
      theme.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor:
      theme.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  cardIdentity: {
    flex: 1,
    paddingRight: 6,
  },

  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },

  instructorCode: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '900',
  },

  instructorName: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },

  /* EXPERTISE */

  expertiseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 15,
    padding: 12,
    borderRadius: 16,
    backgroundColor:
      theme.purpleSoft,
  },

  expertiseIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor:
      '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoMiniLabel: {
    color: theme.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  expertiseText: {
    color: theme.purple,
    fontWeight: '900',
    marginTop: 2,
  },

  /* CONTACT */

  contactGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 9,
  },

  infoBox: {
    flex: 1,
    minHeight: 76,
    borderRadius: 15,
    padding: 10,
  },

  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  infoBoxLabel: {
    color: theme.muted,
    fontSize: 9,
    fontWeight: '900',
  },

  infoBoxValue: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 7,
    lineHeight: 15,
  },

  divider: {
    height: 1,
    backgroundColor:
      theme.border,
    marginVertical: 14,
  },

  /* CARD ACTION */

  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },

  editButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    backgroundColor:
      theme.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  editButtonText: {
    color: theme.primary,
    fontWeight: '900',
  },

  statusButton: {
    flex: 1.4,
    minHeight: 44,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  disableButton: {
    backgroundColor:
      theme.dangerSoft,
  },

  enableButton: {
    backgroundColor:
      theme.successSoft,
  },

  statusButtonText: {
    fontWeight: '900',
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor:
      '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 26,
    alignItems: 'center',
    marginBottom: 12,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor:
      theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 13,
  },

  emptyText: {
    color: theme.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 5,
  },

  emptySeedButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor:
      theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 15,
  },

  emptySeedButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  /* MODAL */

  overlay: {
    flex: 1,
    backgroundColor:
      'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor:
      theme.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '90%',
  },

  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor:
      '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 14,
  },

  modalTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor:
      theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '900',
  },

  modalSubtitle: {
    color: theme.muted,
    fontSize: 11,
    marginTop: 2,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  modalContent: {
    paddingBottom: 28,
  },

  formInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor:
      theme.primarySoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },

  formInfoText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 12,
    lineHeight: 18,
  },

  modalActions: {
    marginTop: 5,
    gap: 4,
  },
});