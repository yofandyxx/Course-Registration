/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * 
 * Fungsi File :
 * Menyediakan layout utama yang digunakan bersama oleh
 * halaman aplikasi, meliputi header, area aman layar,
 * konten scroll, dan fitur pull-to-refresh.
 *
 * [FLOW]       Alur tampilan dan pembaruan halaman
 * [VALIDASI]   Pemeriksaan ketersediaan callback refresh
 * [TEST POINT] Titik penting untuk pengujian
 *
 * ================================================================
 */

// 1. IMPORT LIBRARY DAN KONFIGURASI TEMA
import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../utils/theme';

// 2. DEFINISI TIPE PROPS KOMPONEN LAYOUT
interface LayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * ================================================================
 * 3. KOMPONEN UTAMA LAYOUT
 * ================================================================
 *
 * FUNGSI: Layout
 *
 * Tujuan:
 * Menampilkan struktur halaman yang konsisten pada
 * seluruh screen aplikasi.
 *
 * [FLOW]
 * Terima Props → SafeAreaView → ScrollView
 * → Header → Konten Halaman
 *
 * [TEST POINT]
 * - Judul halaman tampil dengan benar.
 * - Subtitle tampil apabila tersedia.
 * - Konten dapat digulir secara vertikal.
 * - Pull-to-refresh berjalan jika callback tersedia.
 * - Tampilan tidak tertutup status bar perangkat.
 *
 * ================================================================
 */
export default function Layout({
  title,
  subtitle,
  children,
  refreshing = false,
  onRefresh,
}: LayoutProps) {
  return (
    <SafeAreaView
      style={s.safe}
      edges={['top']}
    >
      {/* 4. AREA KONTEN YANG DAPAT DIGULIR */}
      <ScrollView
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
      >
        {/* 5. HEADER HALAMAN */}
        <View style={s.header}>
          {/* Aksen warna pada bagian atas header */}
          <View style={s.accent} />
          {/* Judul utama halaman */}
          <Text style={s.title}>
            {title}
          </Text>
          {/* Subtitle hanya ditampilkan jika tersedia */}
          {subtitle ? (
            <Text style={s.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {/* 6. KONTEN DINAMIS DARI SCREEN PEMANGGIL */}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * ================================================================
 * 7. STYLESHEET
 * ================================================================
 *
 * Mengatur warna, jarak, ukuran, dan tampilan halaman.
 * Warna utama mengikuti konfigurasi utils/theme.ts.
 *
 * ================================================================
 */
const s = StyleSheet.create({
  // Area aman agar konten tidak tertutup status bar.
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // Pengaturan jarak konten utama.
  body: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 115,
  },
  // Area header setiap halaman.
  header: {
    marginBottom: 22,
    paddingTop: 3,
  },
  // Garis aksen dekoratif pada header.
  accent: {
    width: 46,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.secondary,
    marginBottom: 14,
  },
  // Tampilan judul utama.
  title: {
    fontSize: 27,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.6,
  },
  // Tampilan teks penjelasan di bawah judul.
  subtitle: {
    color: colors.muted,
    marginTop: 7,
    lineHeight: 21,
    fontSize: 13,
  },
});
