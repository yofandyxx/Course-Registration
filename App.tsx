/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 *
 * Fungsi File :
 * - Menjadi root component utama aplikasi.
 * - Menyediakan SafeAreaProvider untuk seluruh screen.
 * - Membungkus aplikasi dengan AuthProvider.
 * - Mengatur StatusBar aplikasi.
 * - Memanggil AppNavigator sebagai pengendali navigasi utama.
 *
 * Catatan Pembelajaran:
 * App.tsx tidak menangani CRUD atau business rule secara langsung.
 * File ini menyusun provider dan navigator yang dibutuhkan aplikasi.
 * Urutan pembungkus penting karena komponen di dalam AuthProvider
 * dapat menggunakan data/konteks autentikasi.
 *
 * Penanda:
 * [ROOT]       Titik awal struktur komponen aplikasi
 * [PROVIDER]   Provider yang membungkus child component
 * [AUTH]       Context autentikasi
 * [NAVIGATION] Pengendali navigasi aplikasi
 * [UI]         Elemen tampilan global
 * [FLOW]       Alur susunan component tree
 * [TEST POINT] Titik pemeriksaan integrasi
 *
 * ================================================================
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * [ROOT] App
 *
 * Tujuan:
 * Menyusun component tree utama Project 07.
 *
 * [FLOW]
 * App
 *  ↓
 * SafeAreaProvider
 *  ↓
 * AuthProvider
 *  ├── StatusBar
 *  └── AppNavigator
 *
 * Tidak ada perubahan terhadap urutan provider pada source FINAL.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      {/* [AUTH] Menyediakan state dan fungsi autentikasi ke child component. */}
      <AuthProvider>
        {/* [UI] Status bar global menggunakan tampilan dark. */}
        <StatusBar style="dark" />

        {/* [NAVIGATION] Menentukan screen sesuai state autentikasi/role. */}
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
