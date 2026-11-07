/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 
 *
 * Fungsi File :
 * Menyediakan screen Login dan Registrasi Participant.
 *
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan input sebelum proses dilanjutkan
 * [BUSINESS RULE] Aturan bisnis aplikasi
 * [SECURITY]      Bagian terkait autentikasi dan role
 * [TEST POINT]    Titik penting untuk pengujian
 *
 * ================================================================
 */

import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Layout from '../components/Layout';
import { Button, Card, Input } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../utils/theme';

/* ============================================================
   LOGIN SCREEN
   ============================================================ */

/**
 * FUNGSI: LoginScreen
 * Tujuan: menampilkan form login dan meneruskan kredensial
 * ke login() pada AuthContext.
 *
 * [FLOW] Input → Validasi → login() → Success / Error
 * [TEST POINT] Uji field kosong, kredensial salah, dan login valid.
 */
export function LoginScreen({ navigation }: any) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Mengatur tampil / sembunyi password.
  const [showPassword, setShowPassword] = useState(false);

  // Status proses login.
  const [busy, setBusy] = useState(false);

  /**
   * FUNGSI: handleLogin
   * [VALIDASI] Email dan password wajib diisi.
   * [SECURITY] Autentikasi utama didelegasikan ke AuthContext.
   */
  const handleLogin = async () => {
    // [FLOW] Normalisasi email sebelum validasi.
    const cleanEmail = email.trim();

    // [VALIDASI] Jangan lanjutkan login jika field wajib kosong.
    if (!cleanEmail || !password) {
      return Alert.alert(
        'Data Belum Lengkap',
        'Email dan password wajib diisi.'
      );
    }

    try {
      setBusy(true);

      // [FLOW] Kirim kredensial ke AuthContext.
      await login(cleanEmail, password);
    } catch (error: any) {
      Alert.alert(
        'Login Gagal',
        error?.message || 'Email atau password tidak benar.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout
      title="PPNP Course"
      subtitle="Sistem Informasi Pendaftaran Kursus"
    >
      {/* ======================================================
          HEADER LOGIN
          ====================================================== */}

      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Ionicons
            name="school-outline"
            size={34}
            color="#FFFFFF"
          />
        </View>

        <Text style={s.heroTitle}>
          Selamat Datang
        </Text>

        <Text style={s.heroText}>
          Masuk ke sistem untuk mengakses layanan
          pendaftaran kursus.
        </Text>
      </View>

      {/* ======================================================
          FORM LOGIN
          ====================================================== */}

      <Card>
        <View style={s.sectionHeader}>
          <View style={s.sectionIcon}>
            <Ionicons
              name="log-in-outline"
              size={22}
              color="#2563EB"
            />
          </View>

          <View style={s.sectionText}>
            <Text style={s.h}>
              Login Akun
            </Text>

            <Text style={s.m}>
              Gunakan email dan password yang telah terdaftar.
            </Text>
          </View>
        </View>

        {/* EMAIL */}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="contoh@email.com"
        />

        {/* PASSWORD */}

        <Text style={s.inputLabel}>
          Password
        </Text>

        <View style={s.passwordContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={19}
            color="#64748B"
            style={s.passwordIcon}
          />

          <View style={s.passwordInputArea}>
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}

              // Mencegah huruf pertama otomatis kapital.
              autoCapitalize="none"
              autoCorrect={false}

              placeholder="Masukkan password"
              containerStyle={s.passwordInputContainer}
            />
          </View>

          <TouchableOpacity
            style={s.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                showPassword
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={23}
              color="#64748B"
            />
          </TouchableOpacity>
        </View>

        {/* INFORMASI */}

        <View style={s.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#2563EB"
          />

          <Text style={s.infoText}>
            Sistem akan menentukan hak akses secara otomatis
            berdasarkan role akun Anda.
          </Text>
        </View>

        {/* LOGIN */}

        {busy ? (
          <View style={s.loadingBox}>
            <ActivityIndicator
              size="small"
              color="#2563EB"
            />

            <Text style={s.loadingText}>
              Memproses login...
            </Text>
          </View>
        ) : (
          <Button
            title="Login"
            onPress={handleLogin}
            icon="log-in-outline"
          />
        )}

        {/* REGISTER */}

        <View style={s.dividerRow}>
          <View style={s.divider} />

          <Text style={s.dividerText}>
            Belum memiliki akun?
          </Text>

          <View style={s.divider} />
        </View>

        <Button
          title="Daftar sebagai Peserta"
          onPress={() => navigation.navigate('Register')}
          icon="person-add-outline"
          kind="light"
        />
      </Card>

      {/* ======================================================
          INFORMASI ROLE
          ====================================================== */}

      <View style={s.accessCard}>
        <Text style={s.accessTitle}>
          Akses Sistem
        </Text>

        {/* PESERTA */}

        <View style={s.roleRow}>
          <View style={s.roleIcon}>
            <Ionicons
              name="person-outline"
              size={21}
              color="#2563EB"
            />
          </View>

          <View style={s.roleContent}>
            <Text style={s.roleName}>
              Peserta
            </Text>

            <Text style={s.roleText}>
              Melihat program dan kelas, melakukan
              pendaftaran, serta memantau status pendaftaran.
            </Text>
          </View>
        </View>

        {/* ADMIN */}

        <View style={s.roleRowLast}>
          <View style={s.roleIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={21}
              color="#2563EB"
            />
          </View>

          <View style={s.roleContent}>
            <Text style={s.roleName}>
              Administrator
            </Text>

            <Text style={s.roleText}>
              Mengelola program, kelas, pendaftaran,
              dan pengguna sistem.
            </Text>
          </View>
        </View>
      </View>

      <Text style={s.footer}>
        Project 07 • Firebase Authentication & Firestore
      </Text>
    </Layout>
  );
}

/* ============================================================
   REGISTER SCREEN
   ============================================================ */

/**
 * FUNGSI: RegisterScreen
 * Tujuan: menampilkan form pembuatan akun Participant.
 *
 * [BUSINESS RULE]
 * Registrasi mandiri pada screen ini hanya untuk Participant.
 * Role Administrator tidak dipilih dari halaman registrasi.
 *
 * [FLOW]
 * Input → Trim → Validasi → register() → Success / Error
 */
export function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] =
    useState('');

  // Show / hide masing-masing password.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [busy, setBusy] = useState(false);

  /**
   * FUNGSI: handleRegister
   * [VALIDASI] Field wajib, minimal 6 karakter, dan konfirmasi password.
   * [TEST POINT] Uji input kosong, password pendek, konfirmasi berbeda,
   * email terdaftar, serta registrasi berhasil.
   */
  const handleRegister = async () => {
    // [FLOW] Normalisasi data teks sebelum validasi.
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    // [VALIDASI] Nama, email, dan password wajib tersedia.
    if (!cleanName || !cleanEmail || !password) {
      return Alert.alert(
        'Data Belum Lengkap',
        'Nama, email, dan password wajib diisi.'
      );
    }

    // [VALIDASI] Password minimal 6 karakter.
    if (password.length < 6) {
      return Alert.alert(
        'Password Belum Memenuhi Syarat',
        'Password minimal terdiri dari 6 karakter.'
      );
    }

    // [VALIDASI] Password dan konfirmasi harus sama.
    if (password !== passwordConfirmation) {
      return Alert.alert(
        'Konfirmasi Password',
        'Konfirmasi password tidak sama dengan password.'
      );
    }

    try {
      setBusy(true);

      // [FLOW] Pembuatan akun didelegasikan ke AuthContext.
      await register(
        cleanName,
        cleanEmail,
        password,
        cleanPhone
      );
    } catch (error: any) {
      Alert.alert(
        'Registrasi Gagal',
        error?.message || 'Akun tidak dapat dibuat.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout
      title="Registrasi Peserta"
      subtitle="Buat akun untuk mengikuti program kursus"
    >
      {/* INFORMASI REGISTRASI */}

      <View style={s.registerInfo}>
        <View style={s.registerIcon}>
          <Ionicons
            name="person-add-outline"
            size={28}
            color="#FFFFFF"
          />
        </View>

        <View style={s.registerInfoContent}>
          <Text style={s.registerInfoTitle}>
            Akun Peserta
          </Text>

          <Text style={s.registerInfoText}>
            Akun baru otomatis terdaftar sebagai Peserta.
            Role Administrator tidak dapat dipilih dari
            halaman registrasi.
          </Text>
        </View>
      </View>

      <Card>
        {/* NAMA */}

        <Input
          label="Nama Lengkap"
          value={name}
          onChangeText={setName}
          placeholder="Masukkan nama lengkap"
          autoCapitalize="words"
        />

        {/* HP */}

        <Input
          label="No. HP"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="08xxxxxxxxxx"
        />

        {/* EMAIL */}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="contoh@email.com"
        />

        {/* PASSWORD */}

        <Text style={s.inputLabel}>
          Password
        </Text>

        <View style={s.passwordContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={19}
            color="#64748B"
            style={s.passwordIcon}
          />

          <View style={s.passwordInputArea}>
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Minimal 6 karakter"
              containerStyle={s.passwordInputContainer}
            />
          </View>

          <TouchableOpacity
            style={s.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={
                showPassword
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={23}
              color="#64748B"
            />
          </TouchableOpacity>
        </View>

        {/* KONFIRMASI PASSWORD */}

        <Text style={s.inputLabel}>
          Konfirmasi Password
        </Text>

        <View style={s.passwordContainer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={19}
            color="#64748B"
            style={s.passwordIcon}
          />

          <View style={s.passwordInputArea}>
            <Input
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              secureTextEntry={!showConfirmation}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Ulangi password"
              containerStyle={s.passwordInputContainer}
            />
          </View>

          <TouchableOpacity
            style={s.eyeButton}
            onPress={() =>
              setShowConfirmation(!showConfirmation)
            }
          >
            <Ionicons
              name={
                showConfirmation
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={23}
              color="#64748B"
            />
          </TouchableOpacity>
        </View>

        {/* INFO KEAMANAN */}

        <View style={s.securityBox}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color="#15803D"
          />

          <Text style={s.securityText}>
            Gunakan email aktif dan password minimal
            6 karakter. Jangan membagikan password
            kepada pengguna lain.
          </Text>
        </View>

        {/* BUTTON */}

        {busy ? (
          <View style={s.loadingBox}>
            <ActivityIndicator
              size="small"
              color="#2563EB"
            />

            <Text style={s.loadingText}>
              Membuat akun...
            </Text>
          </View>
        ) : (
          <Button
            title="Buat Akun Peserta"
            onPress={handleRegister}
            icon="checkmark-circle-outline"
          />
        )}

        <Button
          title="Kembali ke Login"
          onPress={() => navigation.goBack()}
          kind="light"
          icon="arrow-back"
        />
      </Card>

      <Text style={s.footer}>
        Pendaftaran akun menggunakan Firebase Authentication
      </Text>
    </Layout>
  );
}

/* ============================================================
   STYLE
   ============================================================ */

const s = StyleSheet.create({
  hero: {
    backgroundColor: '#2563EB',
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  heroTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  heroText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#DBEAFE',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  sectionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  sectionText: {
    flex: 1,
  },

  h: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },

  m: {
    color: colors.muted,
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 7,
  },

  passwordContainer: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },

  passwordIcon: {
    marginLeft: 13,
  },

  passwordInputArea: {
    flex: 1,
  },

  passwordInputContainer: {
    marginBottom: 0,
    borderWidth: 0,
  },

  eyeButton: {
    paddingHorizontal: 13,
    paddingVertical: 12,
  },

  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 13,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 17,
  },

  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
  },

  loadingBox: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },

  loadingText: {
    marginLeft: 9,
    color: '#2563EB',
    fontWeight: '700',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  dividerText: {
    marginHorizontal: 9,
    color: '#94A3B8',
    fontSize: 11,
  },

  accessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  accessTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  roleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },

  roleRowLast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  roleIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  roleContent: {
    flex: 1,
  },

  roleName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
  },

  roleText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
    marginTop: 2,
  },

  registerInfo: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  registerIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  registerInfoContent: {
    flex: 1,
  },

  registerInfoTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  registerInfoText: {
    color: '#DBEAFE',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  securityBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 13,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  securityText: {
    flex: 1,
    marginLeft: 8,
    color: '#166534',
    fontSize: 12,
    lineHeight: 17,
  },

  footer: {
    textAlign: 'center',
    marginVertical: 18,
    color: '#94A3B8',
    fontSize: 11,
  },
});