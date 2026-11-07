/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 *
 * Fungsi File :
 * - Menampilkan dan mengelola daftar pengguna aplikasi.
 * - Menampilkan statistik berdasarkan role dan status.
 * - Menangani pencarian serta filter role/status.
 * - Mengaktifkan atau menonaktifkan akun Participant.
 * - Melindungi akun Admin dari perubahan status pada screen ini.
 *
 * Catatan Pembelajaran:
 * Aplikasi hanya mempunyai dua role: admin dan participant.
 * Firebase Authentication digunakan untuk autentikasi/login.
 * Collection users di Cloud Firestore menyimpan profil, role,
 * dan status pengguna.
 *
 * Perubahan ACTIVE/INACTIVE pada screen ini hanya memperbarui
 * status dokumen Firestore. Akun Firebase Authentication tidak
 * dihapus.
 *
 * Penanda:
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan kondisi/data
 * [BUSINESS RULE] Aturan bisnis aplikasi
 * [SECURITY]      Batas akses dan perlindungan akun
 * [TEST POINT]    Titik penting untuk pengujian
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
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import Layout from '../components/Layout';
import { Input } from '../components/UI';

import {
  listUsers,
  updateUserStatus,
} from '../services/firestore';

import { AppUser } from '../types';

type RoleFilter =
  | 'ALL'
  | 'admin'
  | 'participant';

type StatusFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'INACTIVE';

/* ============================================================
   TEMA ADMIN
   ============================================================ */

const theme = {
  navy: '#172554',
  blue: '#1D4ED8',
  blueSoft: '#EFF6FF',

  cyan: '#0891B2',
  cyanSoft: '#CFFAFE',

  purple: '#7C3AED',
  purpleSoft: '#F3E8FF',

  green: '#16A34A',
  greenSoft: '#DCFCE7',

  red: '#DC2626',
  redSoft: '#FEE2E2',

  orange: '#D97706',
  orangeSoft: '#FEF3C7',

  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  background: '#F8FAFC',
};

/* ============================================================
   USER SCREEN
   ============================================================ */

export default function UserScreen() {
  const [
    data,
    setData,
  ] = useState<AppUser[]>([]);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    roleFilter,
    setRoleFilter,
  ] = useState<RoleFilter>('ALL');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>('ALL');

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    processingUid,
    setProcessingUid,
  ] = useState<string | null>(
    null
  );

  /* ==========================================================
     LOAD USERS
     ========================================================== */

  /**
   * FUNGSI: load
   * --------------------------------------------------------------
   * Tujuan : Mengambil seluruh profil pengguna dari collection users.
   * Proses : listUsers() → urutkan nama → simpan ke state data.
   * Output : Daftar pengguna terbaru untuk statistik dan tampilan.
   */
  const load = async () => {
    setRefreshing(true);

    try {
      // [FLOW] Ambil data profil/role/status dari Cloud Firestore.
      const users =
        await listUsers();

      /*
       * Urutkan nama supaya daftar lebih konsisten.
       */
      // [FLOW] Urutkan nama agar daftar pengguna konsisten.
      users.sort(
        (
          a: AppUser,
          b: AppUser
        ) =>
          a.name.localeCompare(
            b.name
          )
      );

      setData(users);
    } catch (error: any) {
      console.log(
        'LOAD USERS ERROR:',
        error?.code,
        error?.message
      );

      Alert.alert(
        'Gagal Memuat Pengguna',
        error?.message ||
          'Data pengguna tidak dapat dimuat.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  // [FLOW] Reload saat User Management kembali memperoleh fokus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  /* ==========================================================
     STATISTIK
     ========================================================== */

  // [FLOW] Statistik diturunkan dari state data, tanpa query tambahan.
  const adminCount = useMemo(
    () =>
      data.filter(
        (user: AppUser) =>
          user.role === 'admin'
      ).length,
    [data]
  );

  const participantCount =
    useMemo(
      () =>
        data.filter(
          (user: AppUser) =>
            user.role ===
            'participant'
        ).length,
      [data]
    );

  const activeCount = useMemo(
    () =>
      data.filter(
        (user: AppUser) =>
          user.status === 'ACTIVE'
      ).length,
    [data]
  );

  const inactiveCount =
    useMemo(
      () =>
        data.filter(
          (user: AppUser) =>
            user.status ===
            'INACTIVE'
        ).length,
      [data]
    );

  /* ==========================================================
     SEARCH + FILTER
     ========================================================== */

  /**
   * [FLOW] SEARCH + FILTER
   * Search, filter role, dan filter status digabungkan.
   * Record hanya tampil jika seluruh kondisi yang aktif terpenuhi.
   */
  const shown = useMemo(
    () => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return data.filter(
        (user: AppUser) => {
          const matchSearch =
            !keyword ||
            user.name
              .toLowerCase()
              .includes(keyword) ||
            user.email
              .toLowerCase()
              .includes(keyword) ||
            user.role
              .toLowerCase()
              .includes(keyword) ||
            (user.phone || '')
              .toLowerCase()
              .includes(keyword) ||
            user.status
              .toLowerCase()
              .includes(keyword);

          const matchRole =
            roleFilter === 'ALL' ||
            user.role === roleFilter;

          const matchStatus =
            statusFilter === 'ALL' ||
            user.status ===
              statusFilter;

          return (
            matchSearch &&
            matchRole &&
            matchStatus
          );
        }
      );
    },
    [
      data,
      search,
      roleFilter,
      statusFilter,
    ]
  );

  /* ==========================================================
     ACTIVE / INACTIVE

     PENTING:
     Fungsi ini hanya digunakan untuk participant.

     Admin tidak diberikan tombol untuk mengubah status
     melalui screen ini.
     ========================================================== */

  /**
   * FUNGSI: toggleStatus
   * --------------------------------------------------------------
   * Tujuan : Mengubah ACTIVE ↔ INACTIVE untuk Participant.
   * Security: Admin dilindungi dan tidak dapat diubah dari screen ini.
   * Catatan : Yang diperbarui adalah dokumen users di Firestore,
   *           bukan menghapus akun Firebase Authentication.
   */
  const toggleStatus = (
    user: AppUser
  ) => {
    // [SECURITY] Admin tidak boleh diaktif/nonaktifkan dari menu ini.
    if (user.role === 'admin') {
      Alert.alert(
        'Akun Dilindungi',
        'Status akun Admin tidak dapat diubah melalui User Management.'
      );

      return;
    }

    // [BUSINESS RULE] Participant hanya berpindah ACTIVE ↔ INACTIVE.
    const nextStatus:
      | 'ACTIVE'
      | 'INACTIVE' =
      user.status === 'ACTIVE'
        ? 'INACTIVE'
        : 'ACTIVE';

    const action =
      nextStatus === 'ACTIVE'
        ? 'mengaktifkan'
        : 'menonaktifkan';

    Alert.alert(
      nextStatus === 'ACTIVE'
        ? 'Aktifkan Akun'
        : 'Nonaktifkan Akun',

      `Apakah Anda yakin ingin ${action} akun ${user.name}?`,

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
            nextStatus ===
            'INACTIVE'
              ? 'destructive'
              : 'default',

          onPress: async () => {
            if (processingUid) {
              return;
            }

            setProcessingUid(
              user.uid
            );

            try {
              // [FLOW] Simpan perubahan status Participant ke Firestore.
              await updateUserStatus(
                user.uid,
                nextStatus
              );

              Alert.alert(
                'Berhasil',
                nextStatus === 'ACTIVE'
                  ? 'Akun participant berhasil diaktifkan.'
                  : 'Akun participant berhasil dinonaktifkan.'
              );

              await load();
            } catch (
              error: any
            ) {
              console.log(
                'UPDATE USER STATUS ERROR:',
                error?.code,
                error?.message
              );

              Alert.alert(
                'Gagal Mengubah Status',
                error?.message ||
                  'Status pengguna tidak dapat diubah.'
              );
            } finally {
              setProcessingUid(
                null
              );
            }
          },
        },
      ]
    );
  };

  /* ==========================================================
     RESET FILTER
     ========================================================== */

  // [FLOW] Kembalikan seluruh pencarian/filter ke kondisi awal.
  const resetFilter = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <Layout
      title="User Management"
      subtitle="Kelola participant dan status akses aplikasi."
      refreshing={refreshing}
      onRefresh={load}
    >
      {/* ======================================================
          HERO
          ====================================================== */}

      <View style={styles.hero}>
        <View
          style={
            styles.heroCircleOne
          }
        />

        <View
          style={
            styles.heroCircleTwo
          }
        />

        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="people-outline"
              size={30}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.adminBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color="#DBEAFE"
            />

            <Text
              style={
                styles.adminBadgeText
              }
            >
              ADMIN ONLY
            </Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>
          Manajemen Pengguna
        </Text>

        <Text style={styles.heroText}>
          Pantau akun Admin dan
          Participant serta kelola
          status akses participant
          ke aplikasi.
        </Text>

        <View style={styles.heroInfo}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color="#BFDBFE"
          />

          <Text
            style={
              styles.heroInfoText
            }
          >
            Maksimal 2 role:
            Admin dan Participant.
          </Text>
        </View>
      </View>

      {/* ======================================================
          TOTAL USER
          ====================================================== */}

      <View style={styles.totalCard}>
        <View
          style={
            styles.totalIconContainer
          }
        >
          <Ionicons
            name="people"
            size={25}
            color={theme.blue}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>
            PENGGUNA TERDAFTAR
          </Text>

          <Text style={styles.totalNumber}>
            {data.length}
          </Text>

          <Text style={styles.totalHint}>
            Akun tercatat pada
            collection users
          </Text>
        </View>

        <View
          style={
            styles.roleLimitBadge
          }
        >
          <Text
            style={
              styles.roleLimitNumber
            }
          >
            2
          </Text>

          <Text
            style={
              styles.roleLimitText
            }
          >
            ROLE
          </Text>
        </View>
      </View>

      {/* ======================================================
          STATISTIK ROLE
          ====================================================== */}

      <Text style={styles.groupTitle}>
        Komposisi Pengguna
      </Text>

      <View style={styles.statRow}>
        <StatCard
          icon="shield-outline"
          value={adminCount}
          label="Admin"
          background={
            theme.blueSoft
          }
          iconColor={theme.blue}
        />

        <StatCard
          icon="person-outline"
          value={participantCount}
          label="Participant"
          background={
            theme.purpleSoft
          }
          iconColor={theme.purple}
        />

        <StatCard
          icon="checkmark-circle-outline"
          value={activeCount}
          label="Aktif"
          background={
            theme.greenSoft
          }
          iconColor={theme.green}
        />
      </View>

      {/* ======================================================
          STATUS SUMMARY
          ====================================================== */}

      <View
        style={
          styles.statusSummary
        }
      >
        <View
          style={
            styles.statusSummaryIcon
          }
        >
          <Ionicons
            name="pause-circle-outline"
            size={21}
            color={theme.red}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={
              styles.statusSummaryLabel
            }
          >
            Akun Nonaktif
          </Text>

          <Text
            style={
              styles.statusSummaryText
            }
          >
            Participant yang tidak
            diizinkan mengakses
            aplikasi.
          </Text>
        </View>

        <Text
          style={
            styles.statusSummaryNumber
          }
        >
          {inactiveCount}
        </Text>
      </View>

      {/* ======================================================
          SEARCH
          ====================================================== */}

      <View style={styles.searchCard}>
        <View
          style={
            styles.searchHeader
          }
        >
          <View
            style={
              styles.searchIcon
            }
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={theme.blue}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={
                styles.searchTitle
              }
            >
              Cari Pengguna
            </Text>

            <Text
              style={
                styles.searchSubtitle
              }
            >
              Nama, email, role,
              nomor HP, atau status.
            </Text>
          </View>
        </View>

        <Input
          label=""
          value={search}
          onChangeText={(
            value: string
          ) => setSearch(value)}
          placeholder="Cari pengguna..."
          autoCapitalize="none"
        />
      </View>

      {/* ======================================================
          FILTER ROLE
          ====================================================== */}

      <View style={styles.filterSection}>
        <Text
          style={
            styles.filterSectionTitle
          }
        >
          Filter Role
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >
          <FilterButton
            label="Semua"
            count={data.length}
            active={
              roleFilter === 'ALL'
            }
            onPress={() =>
              setRoleFilter('ALL')
            }
          />

          <FilterButton
            label="Admin"
            count={adminCount}
            active={
              roleFilter === 'admin'
            }
            onPress={() =>
              setRoleFilter('admin')
            }
          />

          <FilterButton
            label="Participant"
            count={
              participantCount
            }
            active={
              roleFilter ===
              'participant'
            }
            onPress={() =>
              setRoleFilter(
                'participant'
              )
            }
          />
        </ScrollView>

        {/* STATUS */}

        <Text
          style={[
            styles.filterSectionTitle,
            {
              marginTop: 12,
            },
          ]}
        >
          Filter Status
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >
          <StatusFilterButton
            label="Semua Status"
            active={
              statusFilter === 'ALL'
            }
            onPress={() =>
              setStatusFilter('ALL')
            }
          />

          <StatusFilterButton
            label="Aktif"
            active={
              statusFilter ===
              'ACTIVE'
            }
            onPress={() =>
              setStatusFilter(
                'ACTIVE'
              )
            }
            type="success"
          />

          <StatusFilterButton
            label="Nonaktif"
            active={
              statusFilter ===
              'INACTIVE'
            }
            onPress={() =>
              setStatusFilter(
                'INACTIVE'
              )
            }
            type="danger"
          />
        </ScrollView>
      </View>

      {/* ======================================================
          RESULT HEADER
          ====================================================== */}

      <View style={styles.resultHeader}>
        <View>
          <Text
            style={
              styles.resultTitle
            }
          >
            Daftar Pengguna
          </Text>

          <Text
            style={
              styles.resultSubtitle
            }
          >
            {shown.length}{' '}
            pengguna ditemukan
          </Text>
        </View>

        {(search ||
          roleFilter !== 'ALL' ||
          statusFilter !==
            'ALL') && (
          <Pressable
            style={
              styles.resetButton
            }
            onPress={resetFilter}
          >
            <Ionicons
              name="refresh-outline"
              size={16}
              color={theme.blue}
            />

            <Text
              style={
                styles.resetButtonText
              }
            >
              Reset
            </Text>
          </Pressable>
        )}
      </View>

      {/* ======================================================
          EMPTY STATE
          ====================================================== */}

      {shown.length === 0 && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="person-remove-outline"
              size={34}
              color={theme.blue}
            />
          </View>

          <Text
            style={
              styles.emptyTitle
            }
          >
            Pengguna Tidak Ditemukan
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Tidak ada pengguna yang
            sesuai dengan pencarian
            atau filter yang dipilih.
          </Text>

          <Pressable
            style={
              styles.emptyResetButton
            }
            onPress={resetFilter}
          >
            <Ionicons
              name="refresh-outline"
              size={17}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.emptyResetText
              }
            >
              Reset Filter
            </Text>
          </Pressable>
        </View>
      )}

      {/* ======================================================
          USER CARDS
          ====================================================== */}

      {shown.map(
        (user: AppUser) => (
          <View
            key={user.uid}
            style={styles.userCard}
          >
            {/* HEADER */}

            <View
              style={
                styles.userHeader
              }
            >
              <UserAvatar
                user={user}
              />

              <View
                style={
                  styles.userIdentity
                }
              >
                <Text
                  style={
                    styles.userName
                  }
                >
                  {user.name}
                </Text>

                <View
                  style={
                    styles.badgeRow
                  }
                >
                  <RoleBadge
                    role={
                      user.role
                    }
                  />

                  <UserStatusBadge
                    status={
                      user.status
                    }
                  />
                </View>
              </View>
            </View>

            {/* CONTACT */}

            <View
              style={
                styles.contactSection
              }
            >
              <ContactRow
                icon="mail-outline"
                label="Email"
                value={user.email}
                iconColor={
                  theme.blue
                }
                iconBackground={
                  theme.blueSoft
                }
              />

              <ContactRow
                icon="call-outline"
                label="No. HP"
                value={
                  user.phone || '-'
                }
                iconColor={
                  theme.green
                }
                iconBackground={
                  theme.greenSoft
                }
              />

              <ContactRow
                icon="finger-print-outline"
                label="User ID"
                value={shortUid(
                  user.uid
                )}
                iconColor={
                  theme.purple
                }
                iconBackground={
                  theme.purpleSoft
                }
              />
            </View>

            {/* ADMIN PROTECTION */}

            {user.role ===
            'admin' ? (
              <View
                style={
                  styles.adminProtection
                }
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={theme.blue}
                />

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.adminProtectionTitle
                    }
                  >
                    Akun Admin
                    Dilindungi
                  </Text>

                  <Text
                    style={
                      styles.adminProtectionText
                    }
                  >
                    Status Admin tidak
                    dapat diubah dari
                    menu ini.
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <View
                  style={
                    styles.divider
                  }
                />

                <Pressable
                  disabled={
                    processingUid ===
                    user.uid
                  }
                  style={[
                    styles.statusButton,

                    user.status ===
                    'ACTIVE'
                      ? styles.deactivateButton
                      : styles.activateButton,

                    processingUid ===
                      user.uid && {
                      opacity: 0.6,
                    },
                  ]}
                  onPress={() =>
                    toggleStatus(user)
                  }
                >
                  <Ionicons
                    name={
                      user.status ===
                      'ACTIVE'
                        ? 'person-remove-outline'
                        : 'person-add-outline'
                    }
                    size={19}
                    color={
                      user.status ===
                      'ACTIVE'
                        ? theme.red
                        : theme.green
                    }
                  />

                  <Text
                    style={[
                      styles.statusButtonText,
                      {
                        color:
                          user.status ===
                          'ACTIVE'
                            ? theme.red
                            : theme.green,
                      },
                    ]}
                  >
                    {processingUid ===
                    user.uid
                      ? 'Memproses...'
                      : user.status ===
                        'ACTIVE'
                      ? 'Nonaktifkan Akun'
                      : 'Aktifkan Akun'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )
      )}

      {/* ======================================================
          SECURITY INFO
          ====================================================== */}

      <View style={styles.securityCard}>
        <View
          style={
            styles.securityIcon
          }
        >
          <Ionicons
            name="lock-closed-outline"
            size={23}
            color={theme.orange}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={
              styles.securityTitle
            }
          >
            Firebase Authentication
          </Text>

          <Text
            style={
              styles.securityText
            }
          >
            Status ACTIVE/INACTIVE
            pada menu ini disimpan
            pada Cloud Firestore.
            Akun Firebase
            Authentication tidak
            dihapus.
          </Text>
        </View>
      </View>
    </Layout>
  );
}

/* ============================================================
   HELPER — UID PENDEK

   UID asli tetap tersimpan penuh.
   Hanya tampilan yang dipendekkan.
   ============================================================ */

/**
 * HELPER: shortUid
 * UID asli tidak diubah. Fungsi ini hanya memendekkan UID untuk UI.
 */
function shortUid(
  uid: string
) {
  if (!uid) {
    return '-';
  }

  if (uid.length <= 14) {
    return uid;
  }

  return `${uid.substring(
    0,
    7
  )}...${uid.substring(
    uid.length - 5
  )}`;
}

/* ============================================================
   USER AVATAR
   ============================================================ */

/**
 * COMPONENT: UserAvatar
 * Menampilkan inisial pengguna dan indikator status ACTIVE/INACTIVE.
 */
function UserAvatar({
  user,
}: {
  user: AppUser;
}) {
  const initials =
    getInitials(user.name);

  const admin =
    user.role === 'admin';

  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: admin
            ? theme.navy
            : theme.purple,
        },
      ]}
    >
      <Text style={styles.avatarText}>
        {initials}
      </Text>

      <View
        style={[
          styles.avatarStatus,
          {
            backgroundColor:
              user.status ===
              'ACTIVE'
                ? theme.green
                : theme.red,
          },
        ]}
      />
    </View>
  );
}

/* ============================================================
   GET INITIALS
   ============================================================ */

// [FLOW] Membentuk maksimal dua huruf inisial untuk avatar.
function getInitials(
  name: string
) {
  const words =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (words.length === 0) {
    return 'US';
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
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <Text
        style={styles.statNumber}
      >
        {value}
      </Text>

      <Text
        style={styles.statLabel}
      >
        {label}
      </Text>
    </View>
  );
}

/* ============================================================
   ROLE BADGE
   ============================================================ */

function RoleBadge({
  role,
}: {
  role: AppUser['role'];
}) {
  const admin =
    role === 'admin';

  return (
    <View
      style={[
        styles.roleBadge,
        {
          backgroundColor: admin
            ? theme.blueSoft
            : theme.purpleSoft,
        },
      ]}
    >
      <Ionicons
        name={
          admin
            ? 'shield-outline'
            : 'person-outline'
        }
        size={12}
        color={
          admin
            ? theme.blue
            : theme.purple
        }
      />

      <Text
        style={[
          styles.roleBadgeText,
          {
            color: admin
              ? theme.blue
              : theme.purple,
          },
        ]}
      >
        {admin
          ? 'ADMIN'
          : 'PARTICIPANT'}
      </Text>
    </View>
  );
}

/* ============================================================
   STATUS BADGE
   ============================================================ */

function UserStatusBadge({
  status,
}: {
  status:
    | 'ACTIVE'
    | 'INACTIVE';
}) {
  const active =
    status === 'ACTIVE';

  return (
    <View
      style={[
        styles.userStatusBadge,
        {
          backgroundColor: active
            ? theme.greenSoft
            : theme.redSoft,
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: active
              ? theme.green
              : theme.red,
          },
        ]}
      />

      <Text
        style={[
          styles.userStatusText,
          {
            color: active
              ? theme.green
              : theme.red,
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
   CONTACT ROW
   ============================================================ */

function ContactRow({
  icon,
  label,
  value,
  iconColor,
  iconBackground,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >['name'];
  label: string;
  value: string;
  iconColor: string;
  iconBackground: string;
}) {
  return (
    <View
      style={styles.contactRow}
    >
      <View
        style={[
          styles.contactIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={iconColor}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={
            styles.contactLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.contactValue
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
          styles.filterButtonText,
          active &&
            styles.filterButtonTextActive,
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
   STATUS FILTER BUTTON
   ============================================================ */

function StatusFilterButton({
  label,
  active,
  onPress,
  type = 'default',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  type?:
    | 'default'
    | 'success'
    | 'danger';
}) {
  let activeColor =
    theme.navy;

  if (type === 'success') {
    activeColor =
      theme.green;
  }

  if (type === 'danger') {
    activeColor =
      theme.red;
  }

  return (
    <Pressable
      style={[
        styles.statusFilterButton,

        active && {
          backgroundColor:
            activeColor,
          borderColor:
            activeColor,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.statusFilterText,

          active && {
            color: '#FFFFFF',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ============================================================
   STYLE
   ============================================================ */

const styles =
  StyleSheet.create({
    /* HERO */

    hero: {
      backgroundColor:
        theme.navy,
      borderRadius: 24,
      padding: 20,
      overflow: 'hidden',
      marginBottom: 14,
    },

    heroCircleOne: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor:
        'rgba(59,130,246,0.20)',
      right: -55,
      top: -60,
    },

    heroCircleTwo: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor:
        'rgba(124,58,237,0.16)',
      right: 55,
      bottom: -60,
    },

    heroTop: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
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

    adminBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor:
        'rgba(255,255,255,0.10)',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
    },

    adminBadgeText: {
      color: '#DBEAFE',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.6,
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
      borderTopWidth: 1,
      borderTopColor:
        'rgba(255,255,255,0.12)',
      marginTop: 17,
      paddingTop: 14,
    },

    heroInfoText: {
      color: '#BFDBFE',
      fontSize: 12,
      fontWeight: '700',
    },

    /* TOTAL */

    totalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor:
        '#FFFFFF',
      borderRadius: 21,
      padding: 16,
      borderWidth: 1,
      borderColor:
        theme.border,
      marginBottom: 15,
    },

    totalIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 17,
      backgroundColor:
        theme.blueSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    totalLabel: {
      color: theme.muted,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
    },

    totalNumber: {
      color: theme.text,
      fontSize: 26,
      fontWeight: '900',
      marginTop: 1,
    },

    totalHint: {
      color: theme.muted,
      fontSize: 10,
      marginTop: 1,
    },

    roleLimitBadge: {
      minWidth: 54,
      height: 54,
      borderRadius: 17,
      backgroundColor:
        theme.purpleSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    roleLimitNumber: {
      color: theme.purple,
      fontSize: 18,
      fontWeight: '900',
    },

    roleLimitText: {
      color: theme.purple,
      fontSize: 8,
      fontWeight: '900',
    },

    /* STAT */

    groupTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 9,
    },

    statRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },

    statCard: {
      flex: 1,
      minHeight: 116,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor:
        'rgba(226,232,240,0.8)',
    },

    statIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },

    statNumber: {
      color: theme.text,
      fontSize: 23,
      fontWeight: '900',
    },

    statLabel: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: '800',
      marginTop: 2,
    },

    /* INACTIVE SUMMARY */

    statusSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor:
        theme.redSoft,
      borderRadius: 17,
      padding: 13,
      marginBottom: 15,
    },

    statusSummaryIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    statusSummaryLabel: {
      color: theme.red,
      fontWeight: '900',
    },

    statusSummaryText: {
      color: '#991B1B',
      fontSize: 10,
      marginTop: 2,
    },

    statusSummaryNumber: {
      color: theme.red,
      fontSize: 24,
      fontWeight: '900',
    },

    /* SEARCH */

    searchCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 20,
      padding: 15,
      borderWidth: 1,
      borderColor:
        theme.border,
      marginBottom: 10,
    },

    searchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginBottom: 4,
    },

    searchIcon: {
      width: 39,
      height: 39,
      borderRadius: 12,
      backgroundColor:
        theme.blueSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    searchTitle: {
      color: theme.text,
      fontWeight: '900',
    },

    searchSubtitle: {
      color: theme.muted,
      fontSize: 10,
      marginTop: 2,
    },

    /* FILTER */

    filterSection: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 20,
      padding: 15,
      borderWidth: 1,
      borderColor:
        theme.border,
      marginBottom: 14,
    },

    filterSectionTitle: {
      color: theme.text,
      fontSize: 12,
      fontWeight: '900',
      marginBottom: 8,
    },

    filterRow: {
      gap: 7,
      paddingRight: 6,
    },

    filterButton: {
      minHeight: 41,
      borderRadius: 999,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor:
        '#F8FAFC',
      borderWidth: 1,
      borderColor:
        theme.border,
    },

    filterButtonActive: {
      backgroundColor:
        theme.navy,
      borderColor:
        theme.navy,
    },

    filterButtonText: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '800',
    },

    filterButtonTextActive: {
      color: '#FFFFFF',
    },

    filterCount: {
      minWidth: 21,
      height: 21,
      borderRadius: 11,
      paddingHorizontal: 5,
      backgroundColor:
        '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },

    filterCountActive: {
      backgroundColor:
        'rgba(255,255,255,0.18)',
    },

    filterCountText: {
      color: theme.text,
      fontSize: 9,
      fontWeight: '900',
    },

    filterCountTextActive: {
      color: '#FFFFFF',
    },

    statusFilterButton: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor:
        '#F8FAFC',
      borderWidth: 1,
      borderColor:
        theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    statusFilterText: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '800',
    },

    /* RESULT */

    resultHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },

    resultTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '900',
    },

    resultSubtitle: {
      color: theme.muted,
      fontSize: 11,
      marginTop: 2,
    },

    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor:
        theme.blueSoft,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },

    resetButtonText: {
      color: theme.blue,
      fontSize: 11,
      fontWeight: '900',
    },

    /* USER CARD */

    userCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor:
        theme.border,
      marginBottom: 12,
    },

    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    avatar: {
      width: 54,
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },

    avatarText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
    },

    avatarStatus: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },

    userIdentity: {
      flex: 1,
    },

    userName: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '900',
    },

    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 7,
    },

    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
    },

    roleBadgeText: {
      fontSize: 9,
      fontWeight: '900',
    },

    userStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    userStatusText: {
      fontSize: 9,
      fontWeight: '900',
    },

    /* CONTACT */

    contactSection: {
      marginTop: 15,
      gap: 8,
    },

    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    contactIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },

    contactLabel: {
      color: theme.muted,
      fontSize: 9,
      fontWeight: '800',
    },

    contactValue: {
      color: theme.text,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },

    divider: {
      height: 1,
      backgroundColor:
        theme.border,
      marginVertical: 14,
    },

    /* STATUS BUTTON */

    statusButton: {
      minHeight: 46,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    deactivateButton: {
      backgroundColor:
        theme.redSoft,
    },

    activateButton: {
      backgroundColor:
        theme.greenSoft,
    },

    statusButtonText: {
      fontWeight: '900',
    },

    /* ADMIN */

    adminProtection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor:
        theme.blueSoft,
      borderRadius: 15,
      padding: 12,
      marginTop: 14,
    },

    adminProtectionTitle: {
      color: theme.blue,
      fontWeight: '900',
      fontSize: 12,
    },

    adminProtectionText: {
      color: '#1E40AF',
      fontSize: 10,
      marginTop: 2,
    },

    /* EMPTY */

    emptyCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 22,
      padding: 26,
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        theme.border,
      marginBottom: 12,
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor:
        theme.blueSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '900',
      marginTop: 12,
    },

    emptyText: {
      color: theme.muted,
      textAlign: 'center',
      lineHeight: 19,
      marginTop: 5,
    },

    emptyResetButton: {
      minHeight: 43,
      borderRadius: 13,
      backgroundColor:
        theme.blue,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 14,
    },

    emptyResetText: {
      color: '#FFFFFF',
      fontWeight: '900',
    },

    /* SECURITY */

    securityCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor:
        theme.orangeSoft,
      borderRadius: 18,
      padding: 14,
      marginTop: 2,
      marginBottom: 12,
    },

    securityIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    securityTitle: {
      color: '#92400E',
      fontWeight: '900',
    },

    securityText: {
      color: '#92400E',
      fontSize: 11,
      lineHeight: 17,
      marginTop: 3,
    },
  });