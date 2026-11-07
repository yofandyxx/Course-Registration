/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * Nq
 * Fungsi File :
 * Menyediakan komponen visual yang dapat digunakan kembali
 * pada berbagai halaman aplikasi, meliputi kartu informasi,
 * formulir input, tombol aksi, dan kartu statistik.
 *
 * File ini hanya mengatur tampilan dan meneruskan props.
 * Logika bisnis tetap berada pada screen atau service.
 *
 * [FLOW]       Alur penerimaan props dan tampilan komponen
 * [VALIDASI]   Pemeriksaan kondisi opsional dan tombol
 * [TEST POINT] Titik penting untuk pengujian
 *
 * ================================================================
 */

// 1. IMPORT LIBRARY DAN KOMPONEN REACT NATIVE
import React from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextInputProps,
} from 'react-native';

// 2. IMPORT IKON DAN KONFIGURASI TEMA
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

/**
 * ================================================================
 * 3. KOMPONEN CARD
 * ================================================================
 *
 * FUNGSI: Card
 *
 * Tujuan:
 * Menampilkan konten di dalam kartu dengan desain
 * konsisten, sudut membulat, border, dan bayangan.
 *
 * [FLOW]
 * Terima children dan style
 * → Gabungkan style kartu
 * → Tampilkan children dalam View
 *
 * [TEST POINT]
 * - Konten kartu tampil dengan benar.
 * - Warna, border, dan bayangan sesuai tema.
 * - Style tambahan dapat diterapkan.
 *
 * ================================================================
 */
export const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => (
  <View style={[s.card, style]}>
    {children}
  </View>
);

/**
 * ================================================================
 * 4. KOMPONEN INPUT
 * ================================================================
 *
 * FUNGSI: Input
 *
 * Tujuan:
 * Menyediakan TextInput dengan label opsional dan
 * tampilan yang konsisten pada seluruh formulir.
 *
 * [FLOW]
 * Terima label, style, containerStyle, dan props
 * → Tampilkan label jika tersedia
 * → Tampilkan TextInput
 * → Teruskan seluruh props ke TextInput
 *
 * [VALIDASI]
 * Label hanya ditampilkan jika nilainya tersedia.
 *
 * [TEST POINT]
 * - Label tampil jika diberikan.
 * - Input menerima teks pengguna.
 * - Placeholder tampil dengan benar.
 * - Props TextInput tetap berfungsi.
 * - Style tambahan tidak mengganggu input.
 *
 * ================================================================
 */
export const Input = ({
  label,
  style,
  containerStyle,
  ...props
}: TextInputProps & {
  label?: string;
  containerStyle?: ViewStyle;
}) => (
  <View style={[s.field, containerStyle]}>
    {/* Label input ditampilkan jika tersedia */}
    {label ? (
      <Text style={s.label}>
        {label}
      </Text>
    ) : null}

    {/* Input menerima seluruh props tambahan */}
    <TextInput
      placeholderTextColor="#94A3B8"
      style={[s.input, style]}
      {...props}
    />
  </View>
);

/**
 * ================================================================
 * 5. DEFINISI JENIS TOMBOL
 * ================================================================
 *
 * ButtonKind menentukan pilihan tampilan tombol.
 *
 * primary   : Menggunakan warna utama aplikasi.
 * secondary : Menggunakan warna sekunder aplikasi.
 * danger    : Menggunakan warna untuk aksi berisiko.
 * light     : Menggunakan latar terang.
 *
 * ================================================================
 */
type ButtonKind =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'light';

/**
 * ================================================================
 * 6. KOMPONEN BUTTON
 * ================================================================
 *
 * FUNGSI: Button
 *
 * Tujuan:
 * Menyediakan tombol yang dapat digunakan kembali
 * dengan ikon, teks, warna, dan status disabled.
 *
 * [FLOW]
 * Terima props tombol
 * → Periksa jenis tombol
 * → Tentukan warna latar
 * → Tampilkan ikon dan judul
 * → Jalankan onPress ketika tombol ditekan
 *
 * [VALIDASI]
 * Tombol tidak menjalankan aksi jika disabled = true.
 *
 * [TEST POINT]
 * - Tombol primary tampil sesuai tema.
 * - Tombol secondary menggunakan warna sekunder.
 * - Tombol danger menggunakan warna bahaya.
 * - Tombol light menggunakan warna terang.
 * - Ikon dan judul tampil dengan benar.
 * - Tombol disabled tidak dapat ditekan.
 * - Efek pressed tampil ketika tombol ditekan.
 *
 * ================================================================
 */
export const Button = ({
  title,
  onPress,
  icon = 'arrow-forward',
  kind = 'primary',
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  kind?: ButtonKind;
  disabled?: boolean;
}) => {
  // 6.1. Periksa apakah tombol menggunakan tema terang
  const isLight = kind === 'light';

  // 6.2. Tentukan warna latar berdasarkan jenis tombol
  const backgroundColor =
    kind === 'secondary'
      ? colors.secondary
      : kind === 'danger'
        ? colors.danger
        : isLight
          ? '#EDEBFF'
          : colors.primary;

  // 6.3. Tampilkan tombol dengan ikon dan judul
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor },
        disabled && s.disabled,
        pressed && !disabled && s.pressed,
      ]}
    >
      {/* Ikon tombol */}
      <Ionicons
        name={icon}
        size={18}
        color={
          isLight
            ? colors.primary
            : '#FFFFFF'
        }
      />

      {/* Judul tombol */}
      <Text
        style={[
          s.btnText,
          isLight && {
            color: colors.primary,
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

/**
 * ================================================================
 * 7. KOMPONEN STAT
 * ================================================================
 *
 * FUNGSI: Stat
 *
 * Tujuan:
 * Menampilkan informasi statistik berupa ikon,
 * angka atau nilai, dan keterangan.
 *
 * Komponen ini menggunakan Card sebagai pembungkus.
 *
 * [FLOW]
 * Terima icon, value, dan label
 * → Tampilkan Card
 * → Tampilkan ikon statistik
 * → Tampilkan nilai statistik
 * → Tampilkan label statistik
 *
 * [TEST POINT]
 * - Ikon statistik tampil dengan benar.
 * - Nilai statistik sesuai props.
 * - Label statistik tampil dengan benar.
 * - Desain kartu mengikuti tema aplikasi.
 *
 * ================================================================
 */
export const Stat = ({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: React.ReactNode;
  label: string;
}) => (
  <Card style={s.stat}>
    {/* Area ikon statistik */}
    <View style={s.statIcon}>
      <Ionicons
        name={icon}
        size={23}
        color={colors.primary}
      />
    </View>

    {/* Nilai statistik */}
    <Text style={s.statValue}>
      {value}
    </Text>

    {/* Keterangan statistik */}
    <Text style={s.statLabel}>
      {label}
    </Text>
  </Card>
);

/**
 * ================================================================
 * 8. STYLESHEET
 * ================================================================
 *
 * Mengatur tampilan komponen visual bersama.
 *
 * Warna utama mengikuti konfigurasi:
 * src/utils/theme.ts
 *
 * ================================================================
 */
const s = StyleSheet.create({
  // 8.1. Tampilan kartu utama
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    shadowColor: '#1F2A5A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 2,
  },

  // 8.2. Jarak antar-field formulir
  field: {
    marginBottom: 14,
  },

  // 8.3. Tampilan label formulir
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },

  // 8.4. Tampilan kotak input
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: '#F8FAFF',
    fontSize: 15,
  },

  // 8.5. Tampilan tombol utama
  btn: {
    minHeight: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 17,
    marginVertical: 5,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.13,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  // 8.6. Tampilan teks tombol
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  // 8.7. Tampilan tombol tidak aktif
  disabled: {
    opacity: 0.5,
  },

  // 8.8. Efek ketika tombol ditekan
  pressed: {
    opacity: 0.85,
    transform: [
      { scale: 0.99 },
    ],
  },

  // 8.9. Tampilan kartu statistik
  stat: {
    flex: 1,
    minWidth: 145,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },

  // 8.10. Area ikon statistik
  statIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#EEEDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 8.11. Tampilan nilai statistik
  statValue: {
    fontSize: 27,
    fontWeight: '900',
    color: colors.text,
    marginTop: 11,
  },

  // 8.12. Tampilan label statistik
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 18,
  },
});
