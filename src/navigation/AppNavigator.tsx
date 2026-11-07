/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 *
 * Fungsi File :
 * Mengatur seluruh struktur navigasi aplikasi berdasarkan:
 * - status autentikasi pengguna;
 * - profile pengguna;
 * - role Admin atau Participant.
 *
 * File ini juga mengatur:
 * - Bottom Navigation Participant;
 * - Bottom Navigation Admin;
 * - menu Kelola Admin;
 * - Stack Login/Register;
 * - tema navigasi berdasarkan role.
 *
 * Catatan Pembelajaran:
 * File ini merupakan bagian dari source code pembelajaran
 * Project 07 — PPNPCourseRegistration.
 *
 * ================================================================
 */


/* =================================================================
   IMPORT REACT & REACT NATIVE
   ================================================================= */

import React from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';


/* =================================================================
   IMPORT REACT NAVIGATION
   ================================================================= */

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';


/* =================================================================
   IMPORT ICON
   ================================================================= */

import { Ionicons } from '@expo/vector-icons';


/* =================================================================
   IMPORT AUTH CONTEXT
   ================================================================= */

import { useAuth } from '../contexts/AuthContext';


/* =================================================================
   IMPORT SCREEN
   ================================================================= */

import {
  LoginScreen,
  RegisterScreen,
} from '../screens/AuthScreens';

import {
  DashboardScreen,
} from '../screens/HomeScreens';

import ProgramScreen from '../screens/ProgramScreen';
import ClassScreen from '../screens/ClassScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import InstructorScreen from '../screens/InstructorScreen';
import UserScreen from '../screens/UserScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ParticipantCardScreen from '../screens/ParticipantCardScreen';
import ReportScreen from '../screens/ReportScreen';


/* =================================================================
   NAVIGATOR
   ================================================================= */

/**
 * Stack
 * Digunakan untuk navigasi Login dan Register.
 */
const Stack = createNativeStackNavigator();

/**
 * ParticipantTab
 * Bottom navigation khusus Participant.
 */
const ParticipantTab = createBottomTabNavigator();

/**
 * AdminTab
 * Bottom navigation khusus Administrator.
 */
const AdminTab = createBottomTabNavigator();

/**
 * AdminManageStack
 * Stack navigator untuk submenu administrasi pada menu Kelola.
 */
const AdminManageStack = createNativeStackNavigator();


/* =================================================================
   ROLE THEME
   ================================================================= */

/**
 * ROLE_THEME
 * -----------------------------------------------------------------
 * Menentukan tema visual bottom navigation berdasarkan role.
 *
 * Admin       : Navy / Blue
 * Participant : Indigo / Teal
 *
 * [CATATAN]
 * Perbedaan warna membantu pengguna mengenali konteks role
 * ketika menggunakan aplikasi.
 */
const ROLE_THEME = {
  admin: {
    bar: '#102A43',
    active: '#FFFFFF',
    inactive: '#A9BED3',
    activePill: '#2563EB',
    shadow: '#0B1F33',
  },

  participant: {
    bar: '#243B6B',
    active: '#FFFFFF',
    inactive: '#B9C5E2',
    activePill: '#0F9D8A',
    shadow: '#172554',
  },
} as const;


/* =================================================================
   TAB ICON
   ================================================================= */

/**
 * FUNGSI: TabIcon
 * -----------------------------------------------------------------
 * Tujuan :
 * Menampilkan ikon bottom navigation dengan indikator aktif.
 *
 * Input :
 * icon    — nama ikon Ionicons.
 * focused — status apakah tab sedang aktif.
 * theme   — tema berdasarkan role.
 *
 * Proses :
 * Jika tab aktif, background kapsul menggunakan activePill.
 * Warna dan ukuran ikon juga menyesuaikan status focused.
 *
 * Output :
 * Komponen ikon untuk bottom navigation.
 */
function TabIcon({
  icon,
  focused,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  theme:
    | typeof ROLE_THEME.admin
    | typeof ROLE_THEME.participant;
}) {
  return (
    <View
      style={[
        styles.iconPill,

        focused && {
          backgroundColor: theme.activePill,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={focused ? 21 : 20}
        color={
          focused
            ? theme.active
            : theme.inactive
        }
      />
    </View>
  );
}


/* =================================================================
   COMMON BOTTOM TAB STYLE
   ================================================================= */

/**
 * FUNGSI: getTabScreenOptions
 * -----------------------------------------------------------------
 * Tujuan :
 * Menyediakan konfigurasi tampilan bottom navigation yang dapat
 * digunakan oleh Admin maupun Participant.
 *
 * Input :
 * theme — theme Admin atau Participant.
 *
 * Output :
 * Object konfigurasi screenOptions React Navigation.
 */
function getTabScreenOptions(
  theme:
    | typeof ROLE_THEME.admin
    | typeof ROLE_THEME.participant,
) {
  return {
    headerShown: false,

    tabBarActiveTintColor: theme.active,

    tabBarInactiveTintColor: theme.inactive,

    tabBarHideOnKeyboard: true,

    tabBarStyle: {
      position: 'absolute' as const,

      left: 12,
      right: 12,
      bottom: 10,

      height: 72,

      backgroundColor: theme.bar,

      borderTopWidth: 0,

      borderRadius: 22,

      paddingTop: 7,
      paddingBottom: 8,

      elevation: 12,

      shadowColor: theme.shadow,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.22,
      shadowRadius: 10,
    },

    tabBarItemStyle: {
      paddingHorizontal: 1,
    },

    tabBarLabelStyle: {
      fontSize: 8,
      fontWeight: '800' as const,
      marginTop: 1,
    },
  };
}


/* =================================================================
   PARTICIPANT NAVIGATION
   ================================================================= */

/**
 * FUNGSI: ParticipantTabs
 * -----------------------------------------------------------------
 * Tujuan :
 * Menyediakan bottom navigation khusus Participant.
 *
 * Menu :
 * 1. Dashboard
 * 2. Program
 * 3. Kelas
 * 4. Pendaftaran
 * 5. Kartu
 * 6. Profil
 *
 * Output :
 * Participant Bottom Tab Navigator.
 */
function ParticipantTabs() {
  const theme = ROLE_THEME.participant;

  return (
    <ParticipantTab.Navigator
      screenOptions={
        getTabScreenOptions(theme)
      }
    >
      <ParticipantTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="home-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />

      <ParticipantTab.Screen
        name="Program"
        component={ProgramScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="school-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />

      <ParticipantTab.Screen
        name="Kelas"
        component={ClassScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="calendar-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />

      <ParticipantTab.Screen
        name="Pendaftaran"
        component={RegistrationScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="clipboard-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />

      <ParticipantTab.Screen
        name="Kartu"
        component={ParticipantCardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="card-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />

      <ParticipantTab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="person-circle-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />
    </ParticipantTab.Navigator>
  );
}


/* =================================================================
   ADMIN — HALAMAN HUB KELOLA
   ================================================================= */

/**
 * FUNGSI: AdminManageHome
 * -----------------------------------------------------------------
 * Tujuan :
 * Menyediakan halaman pusat pengelolaan untuk Administrator.
 *
 * Input :
 * navigation — object navigasi React Navigation.
 *
 * Menu :
 * - Kelas & Jadwal
 * - Instruktur
 * - Pengguna
 * - Laporan
 *
 * Alasan desain :
 * Menu administrasi ditempatkan di dalam satu hub "Kelola"
 * agar bottom navigation Admin tidak terlalu padat.
 */
function AdminManageHome({
  navigation,
}: any) {
  const menu = [
    {
      title: 'Kelas & Jadwal',
      description:
        'Kelola kelas, jadwal, ruang, kapasitas, dan status kelas.',
      icon: 'calendar-outline' as const,
      screen: 'Kelas',
      background: '#EAF2FF',
      foreground: '#2563EB',
    },

    {
      title: 'Instruktur',
      description:
        'Kelola master data instruktur dan bidang keahlian.',
      icon: 'person-outline' as const,
      screen: 'Instruktur',
      background: '#E7F7EC',
      foreground: '#15753A',
    },

    {
      title: 'Pengguna',
      description:
        'Kelola akun, role, dan status pengguna aplikasi.',
      icon: 'people-outline' as const,
      screen: 'Pengguna',
      background: '#FFF4DD',
      foreground: '#A66300',
    },

    {
      title: 'Laporan',
      description:
        'Preview, filter, PDF, dan Excel laporan pendaftaran.',
      icon: 'analytics-outline' as const,
      screen: 'Laporan',
      background: '#EEEAFE',
      foreground: '#6941C6',
    },
  ];

  return (
    <View style={styles.managePage}>
      {/* Header halaman Kelola */}
      <View style={styles.manageHero}>
        <View style={styles.manageHeroIcon}>
          <Ionicons
            name="grid-outline"
            size={28}
            color="#FFFFFF"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.manageEyebrow}>
            ADMINISTRATOR
          </Text>

          <Text style={styles.manageTitle}>
            Pusat Pengelolaan
          </Text>

          <Text style={styles.manageSubtitle}>
            Akses seluruh master data dan laporan
            dari satu menu.
          </Text>
        </View>
      </View>

      <Text style={styles.manageSectionTitle}>
        Menu Administrasi
      </Text>

      {/* Daftar menu administrasi */}
      <View style={styles.manageGrid}>
        {menu.map(item => (
          <View
            key={item.screen}
            style={styles.manageCard}

            // [FLOW]
            // Ketika card disentuh, buka screen sesuai nilai
            // item.screen pada AdminManageStack.
            onTouchEnd={() =>
              navigation.navigate(
                item.screen,
              )
            }
          >
            <View
              style={[
                styles.manageIcon,
                {
                  backgroundColor:
                    item.background,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={25}
                color={item.foreground}
              />
            </View>

            <Text
              style={styles.manageCardTitle}
            >
              {item.title}
            </Text>

            <Text
              style={styles.manageCardText}
            >
              {item.description}
            </Text>

            <View
              style={
                styles.manageCardFooter
              }
            >
              <Text
                style={[
                  styles.manageOpenText,
                  {
                    color:
                      item.foreground,
                  },
                ]}
              >
                Buka Menu
              </Text>

              <Ionicons
                name="arrow-forward-circle"
                size={20}
                color={item.foreground}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.manageNote}>
        <Ionicons
          name="information-circle-outline"
          size={19}
          color="#2563EB"
        />

        <Text style={styles.manageNoteText}>
          Menu utama Admin diringkas agar navigasi
          bawah tetap jelas dan nyaman digunakan.
        </Text>
      </View>
    </View>
  );
}


/* =================================================================
   ADMIN MANAGE STACK
   ================================================================= */

/**
 * FUNGSI: AdminManageNavigator
 * -----------------------------------------------------------------
 * Tujuan :
 * Mengatur perpindahan screen pada menu Kelola Administrator.
 *
 * Alur :
 * KelolaHome
 *    ├── Kelas
 *    ├── Instruktur
 *    ├── Pengguna
 *    └── Laporan
 *
 * Screen administrasi tetap menggunakan screen yang sudah ada.
 * File ini hanya mengatur jalur navigasinya.
 */
function AdminManageNavigator() {
  return (
    <AdminManageStack.Navigator
      screenOptions={{
        headerShown: true,

        headerStyle: {
          backgroundColor: '#102A43',
        },

        headerTintColor: '#FFFFFF',

        headerTitleStyle: {
          fontWeight: '800',
        },

        headerShadowVisible: false,
      }}
    >
      <AdminManageStack.Screen
        name="KelolaHome"
        component={AdminManageHome}
        options={{
          headerShown: false,
        }}
      />

      <AdminManageStack.Screen
        name="Kelas"
        component={ClassScreen}
        options={{
          title: 'Kelas & Jadwal',
        }}
      />

      <AdminManageStack.Screen
        name="Instruktur"
        component={InstructorScreen}
        options={{
          title: 'Instruktur',
        }}
      />

      <AdminManageStack.Screen
        name="Pengguna"
        component={UserScreen}
        options={{
          title: 'Manajemen Pengguna',
        }}
      />

      <AdminManageStack.Screen
        name="Laporan"
        component={ReportScreen}
        options={{
          title: 'Laporan',
        }}
      />
    </AdminManageStack.Navigator>
  );
}


/* =================================================================
   ADMIN BOTTOM NAVIGATION
   ================================================================= */

/**
 * FUNGSI: AdminTabs
 * -----------------------------------------------------------------
 * Tujuan :
 * Menyediakan bottom navigation khusus Administrator.
 *
 * Menu :
 * 1. Dashboard
 * 2. Program
 * 3. Pendaftaran
 * 4. Kelola
 * 5. Profil
 *
 * [BUSINESS RULE / NAVIGATION DESIGN]
 * Menu administrasi tambahan ditempatkan di dalam menu Kelola
 * sehingga bottom navigation Admin hanya memiliki 5 menu utama.
 */
function AdminTabs() {
  const theme = ROLE_THEME.admin;

  return (
    <AdminTab.Navigator
      screenOptions={
        getTabScreenOptions(theme)
      }
    >
      <AdminTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="home-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />

      <AdminTab.Screen
        name="Program"
        component={ProgramScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="school-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />

      <AdminTab.Screen
        name="Pendaftaran"
        component={RegistrationScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="clipboard-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />

      <AdminTab.Screen
        name="Kelola"
        component={AdminManageNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="grid-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />

      <AdminTab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="person-circle-outline"
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />
    </AdminTab.Navigator>
  );
}


/* =================================================================
   ROLE ROUTER
   ================================================================= */

/**
 * FUNGSI: RoleTabs
 * -----------------------------------------------------------------
 * Tujuan :
 * Menentukan navigator yang digunakan berdasarkan role pengguna.
 *
 * Input :
 * profile dari AuthContext.
 *
 * Proses :
 * 1. Ambil profile pengguna.
 * 2. Jika profile belum tersedia, tampilkan loading.
 * 3. Jika role = admin, tampilkan AdminTabs.
 * 4. Selain admin, tampilkan ParticipantTabs.
 *
 * Output :
 * Navigator sesuai role pengguna.
 */
function RoleTabs() {
  const { profile } = useAuth();

  // [FLOW] Keputusan 1 — profile sudah tersedia?
  if (!profile) {
    return (
      <View style={styles.loadingPage}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Memuat profil pengguna...
        </Text>
      </View>
    );
  }

  // [FLOW] Keputusan 2 — apakah role pengguna adalah admin?
  //
  // [SECURITY / ROLE ROUTING]
  // Admin memperoleh struktur navigasi khusus Administrator.
  if (profile.role === 'admin') {
    return <AdminTabs />;
  }

  // [FLOW]
  // Jika role bukan admin, gunakan navigasi Participant.
  return <ParticipantTabs />;
}


/* =================================================================
   ROOT NAVIGATOR
   ================================================================= */

/**
 * FUNGSI: AppNavigator
 * -----------------------------------------------------------------
 * Tujuan :
 * Menentukan jalur navigasi utama aplikasi berdasarkan
 * status autentikasi pengguna.
 *
 * Input :
 * firebaseUser dan loading dari AuthContext.
 *
 * Proses :
 * 1. Tunggu proses pemeriksaan Authentication.
 * 2. Jika pengguna sudah login, lanjut ke RoleTabs.
 * 3. Jika belum login, tampilkan Login/Register Stack.
 *
 * Output :
 * Struktur navigasi utama aplikasi.
 */
export default function AppNavigator() {
  const {
    firebaseUser,
    loading,
  } = useAuth();

  // [FLOW] Langkah 1 — tunggu pemeriksaan autentikasi selesai.
  if (loading) {
    return (
      <View style={styles.loadingPage}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {firebaseUser ? (
        // [FLOW] Pengguna sudah login.
        // Lanjutkan ke pemeriksaan profile dan role.
        <RoleTabs />
      ) : (
        // [FLOW] Pengguna belum login.
        // Tampilkan navigasi publik Login/Register.
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />

          <Stack.Screen
            name="Register"
            component={RegisterScreen}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}


/* =================================================================
   STYLE
   ================================================================= */

/**
 * StyleSheet berikut mengatur tampilan:
 * - indikator tab aktif;
 * - halaman loading;
 * - halaman pusat Kelola Admin;
 * - card menu administrasi.
 *
 * Style tidak memengaruhi keputusan role atau logika navigasi.
 */
const styles = StyleSheet.create({
  iconPill: {
    width: 38,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
  },

  loadingText: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
  },

  managePage: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 100,
  },

  manageHero: {
    backgroundColor: '#102A43',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  manageHeroIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor:
      'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  manageEyebrow: {
    color:
      'rgba(255,255,255,0.65)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  manageTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 3,
  },

  manageSubtitle: {
    color:
      'rgba(255,255,255,0.82)',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  manageSectionTitle: {
    color: '#172033',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 10,
  },

  manageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  manageCard: {
    width: '48%',
    minHeight: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    padding: 13,
  },

  manageIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  manageCardTitle: {
    color: '#172033',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
  },

  manageCardText: {
    color: '#667085',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
    flex: 1,
  },

  manageCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 9,
  },

  manageOpenText: {
    fontSize: 9,
    fontWeight: '900',
  },

  manageNote: {
    backgroundColor: '#EAF2FF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
  },

  manageNoteText: {
    flex: 1,
    color: '#245EAA',
    fontSize: 9,
    lineHeight: 15,
    fontWeight: '700',
  },
});