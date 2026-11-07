/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * 
 *
 * Fungsi File :
 * - Menyediakan pusat laporan pendaftaran khusus Administrator.
 * - Membaca seluruh data registration dari Cloud Firestore.
 * - Menghitung statistik berdasarkan status pendaftaran.
 * - Menyediakan pencarian dan filter Status, Program, serta Kelas.
 * - Menampilkan preview laporan sesuai filter aktif.
 * - Mengekspor data hasil filter menjadi PDF dan Excel.
 * - Membagikan/menyimpan file hasil export melalui perangkat.
 *
 * Catatan Pembelajaran:
 * File ini merupakan bagian dari source code pembelajaran
 * Project 07 — PPNPCourseRegistration.
 *
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan sebelum proses dilanjutkan
 * [BUSINESS RULE] Aturan bisnis laporan
 * [SECURITY]      Pembatasan berdasarkan role Administrator
 * [TEST POINT]    Titik penting untuk pengujian mahasiswa
 *
 * ================================================================
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { useFocusEffect } from '@react-navigation/native';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { listRegistrations } from '../services/firestore';
import {
  Registration,
  RegistrationStatus,
} from '../types';
import { colors } from '../utils/theme';

/* ============================================================
   P07.26A-D — ADMIN REPORTS

   Tahap awal:
   - Khusus Admin
   - Membaca data registrations dari Firestore
   - Statistik status
   - Preview laporan
   - Belum menggunakan dependency baru
   ============================================================ */

type StatusCount = Record<RegistrationStatus, number>;

const STATUS_META: Record<
  RegistrationStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    background: string;
    foreground: string;
  }
> = {
  PENDING: {
    label: 'Pending',
    icon: 'time-outline',
    background: '#FFF4DD',
    foreground: '#A66300',
  },
  APPROVED: {
    label: 'Approved',
    icon: 'checkmark-circle-outline',
    background: '#E7F7EC',
    foreground: '#15753A',
  },
  REJECTED: {
    label: 'Rejected',
    icon: 'close-circle-outline',
    background: '#FDEBEC',
    foreground: '#B42318',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: 'ban-outline',
    background: '#F1F3F6',
    foreground: '#596273',
  },
  COMPLETED: {
    label: 'Completed',
    icon: 'ribbon-outline',
    background: '#EEEAFE',
    foreground: '#6941C6',
  },
};

/**
 * FUNGSI: formatRegisteredAt
 * ----------------------------------------------------------------
 * Mengubah berbagai bentuk nilai tanggal Firestore/JavaScript menjadi
 * format tanggal Indonesia yang konsisten untuk preview dan export.
 */
function formatRegisteredAt(value: any) {
  if (!value) return '-';

  try {
    let date: Date | null = null;

    if (typeof value?.toDate === 'function') {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      date = new Date(value);
    } else if (typeof value === 'string') {
      date = new Date(value);
    } else if (typeof value?.seconds === 'number') {
      date = new Date(value.seconds * 1000);
    }

    if (!date || Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

/**
 * KOMPONEN: StatCard
 * ----------------------------------------------------------------
 * Komponen presentasi untuk menampilkan angka ringkasan laporan.
 */
function StatCard({
  label,
  value,
  icon,
  background,
  foreground,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  foreground: string;
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={foreground}
        />
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}


type StatusFilter =
  | 'ALL'
  | RegistrationStatus;

const STATUS_FILTERS: {
  value: StatusFilter;
  label: string;
}[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'COMPLETED', label: 'Completed' },
];


/**
 * FUNGSI: escapeHtml
 * ----------------------------------------------------------------
 * [SECURITY] Mengamankan data dinamis sebelum dimasukkan ke HTML PDF
 * dengan mengubah karakter khusus menjadi HTML entity.
 */
function escapeHtml(value?: string | number) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * FUNGSI: buildReportHtml
 * ----------------------------------------------------------------
 * Membentuk dokumen HTML laporan berdasarkan data yang SUDAH melewati
 * pencarian dan filter pada aplikasi.
 *
 * [FLOW] filteredRegistrations + deskripsi filter → HTML laporan A4.
 * [BUSINESS RULE] Export PDF mengikuti filter aktif, bukan seluruh data
 * jika Administrator sedang menggunakan filter.
 */
function buildReportHtml(
  data: Registration[],
  filterDescription: string,
) {
  const rows = data
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHtml(item.participantName)}</strong><br/>
            <span class="muted">${escapeHtml(item.participantEmail)}</span>
          </td>
          <td>${escapeHtml(item.programName)}</td>
          <td>${escapeHtml(item.className)}</td>
          <td><span class="status">${escapeHtml(item.status)}</span></td>
          <td>${escapeHtml(formatRegisteredAt(item.registeredAt))}</td>
        </tr>`,
    )
    .join('');

  const statusCount = (
    status: RegistrationStatus,
  ) =>
    data.filter(item => item.status === status)
      .length;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #172033;
      font-size: 10px;
    }

    .header {
      background: #162b4d;
      color: white;
      padding: 18px 20px;
      border-radius: 10px;
    }

    .small {
      font-size: 9px;
      opacity: .75;
      letter-spacing: .8px;
      font-weight: bold;
    }

    h1 {
      margin: 5px 0 4px;
      font-size: 22px;
    }

    .subtitle {
      font-size: 10px;
      opacity: .88;
    }

    .summary {
      display: flex;
      gap: 7px;
      margin: 13px 0;
    }

    .box {
      flex: 1;
      border: 1px solid #dfe5ec;
      border-radius: 8px;
      padding: 9px;
    }

    .box-label {
      color: #667085;
      font-size: 8px;
      font-weight: bold;
    }

    .box-value {
      font-size: 17px;
      font-weight: bold;
      margin-top: 3px;
    }

    .filter {
      background: #eaf2ff;
      color: #245eaa;
      border-radius: 7px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 9px;
      font-weight: bold;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: #f0f4f8;
      color: #344054;
      text-align: left;
      padding: 8px 6px;
      border: 1px solid #dfe5ec;
      font-size: 8px;
    }

    td {
      padding: 8px 6px;
      border: 1px solid #e5e9ef;
      vertical-align: top;
      font-size: 8px;
    }

    .muted {
      color: #667085;
      font-size: 7px;
    }

    .status {
      font-weight: bold;
      font-size: 7px;
    }

    .footer {
      margin-top: 12px;
      color: #667085;
      font-size: 8px;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="small">PPNP COURSE REGISTRATION • ADMIN REPORT</div>
    <h1>Laporan Pendaftaran Kursus</h1>
    <div class="subtitle">
      Rekap data pendaftaran berdasarkan filter aktif pada aplikasi.
    </div>
  </div>

  <div class="summary">
    <div class="box">
      <div class="box-label">TOTAL DATA</div>
      <div class="box-value">${data.length}</div>
    </div>
    <div class="box">
      <div class="box-label">PENDING</div>
      <div class="box-value">${statusCount('PENDING')}</div>
    </div>
    <div class="box">
      <div class="box-label">APPROVED</div>
      <div class="box-value">${statusCount('APPROVED')}</div>
    </div>
    <div class="box">
      <div class="box-label">REJECTED</div>
      <div class="box-value">${statusCount('REJECTED')}</div>
    </div>
    <div class="box">
      <div class="box-label">CANCELLED</div>
      <div class="box-value">${statusCount('CANCELLED')}</div>
    </div>
    <div class="box">
      <div class="box-label">COMPLETED</div>
      <div class="box-value">${statusCount('COMPLETED')}</div>
    </div>
  </div>

  <div class="filter">
    FILTER AKTIF: ${escapeHtml(filterDescription)}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:4%">NO</th>
        <th style="width:22%">PARTICIPANT</th>
        <th style="width:20%">PROGRAM</th>
        <th style="width:18%">KELAS</th>
        <th style="width:12%">STATUS</th>
        <th style="width:24%">TANGGAL DAFTAR</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    PPNP Course Registration • ${data.length} data ditampilkan
  </div>
</body>
</html>`;
}

/**
 * SCREEN: ReportScreen
 * ----------------------------------------------------------------
 * Pusat monitoring dan export laporan pendaftaran untuk Administrator.
 */
export default function ReportScreen() {
  const { profile } = useAuth();

  const [registrations, setRegistrations] =
    useState<Registration[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('ALL');

  const [programFilter, setProgramFilter] =
    useState('ALL');

  const [classFilter, setClassFilter] =
    useState('ALL');

  const [exportingPdf, setExportingPdf] =
    useState(false);

  const [exportingExcel, setExportingExcel] =
    useState(false);

  /**
   * FUNGSI: load
   * ----------------------------------------------------------------
   * Mengambil seluruh registration dari Firestore untuk kebutuhan laporan.
   *
   * [SECURITY] Hanya profile dengan role admin yang menjalankan query.
   * [TEST POINT] Participant tidak boleh menjalankan proses load laporan.
   */
  const load = async () => {
    // [VALIDASI] Report Center hanya diproses untuk Administrator.
    if (!profile || profile.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);

      console.log(
        '=== P07.26 ADMIN REPORT LOAD START ===',
      );

      const data =
        await listRegistrations();

      setRegistrations(data);

      console.log(
        'STEP 1: listRegistrations ADMIN PASS =',
        data.length,
      );

      console.log(
        '=== P07.26 ADMIN REPORT LOAD END ===',
      );
    } catch (error: any) {
      console.log(
        'P07.26 ADMIN REPORT ERROR:',
        error?.code,
        error?.message,
      );
    } finally {
      setLoading(false);
    }
  };

  // [FLOW] Muat ulang laporan setiap screen kembali memperoleh focus.
  useFocusEffect(
    useCallback(() => {
      if (
        profile?.uid &&
        profile.role === 'admin'
      ) {
        load();
      }
    }, [profile?.uid, profile?.role]),
  );

  /**
   * [FLOW] Hitung ringkasan jumlah registration per status.
   * Hasil digunakan oleh kartu statistik pada bagian Ringkasan.
   */
  const counts =
    useMemo<StatusCount>(() => {
      const initial: StatusCount = {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      };

      registrations.forEach(item => {
        if (
          Object.prototype.hasOwnProperty.call(
            initial,
            item.status,
          )
        ) {
          initial[item.status] += 1;
        }
      });

      return initial;
    }, [registrations]);

  // [FLOW] Bentuk pilihan Program unik dari data registration.
  const programOptions =
    useMemo(() => {
      return Array.from(
        new Map(
          registrations.map(item => [
            item.programId,
            {
              id: item.programId,
              name: item.programName,
            },
          ]),
        ).values(),
      ).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }, [registrations]);

  /**
   * [FLOW] Bentuk pilihan Kelas unik.
   * Jika Program dipilih, pilihan Kelas ikut dibatasi oleh Program tersebut.
   */
  const classOptions =
    useMemo(() => {
      return Array.from(
        new Map(
          registrations
            .filter(item =>
              programFilter === 'ALL'
                ? true
                : item.programId ===
                  programFilter,
            )
            .map(item => [
              item.classId,
              {
                id: item.classId,
                name: item.className,
              },
            ]),
        ).values(),
      ).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }, [registrations, programFilter]);

  /**
   * FUNGSI LOGIKA: filteredRegistrations
   * ----------------------------------------------------------------
   * [BUSINESS RULE] Data preview dan export menggunakan sumber yang sama:
   * hasil kombinasi Status + Program + Kelas + Pencarian.
   *
   * Setelah filter, data diurutkan dari tanggal pendaftaran terbaru.
   */
  const filteredRegistrations =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      const getMillis = (value: any) => {
        if (!value) return 0;

        if (
          typeof value?.toMillis ===
          'function'
        ) {
          return value.toMillis();
        }

        if (
          typeof value?.seconds ===
          'number'
        ) {
          return value.seconds * 1000;
        }

        const date =
          value instanceof Date
            ? value
            : new Date(value);

        return Number.isNaN(
          date.getTime(),
        )
          ? 0
          : date.getTime();
      };

      return registrations
        .filter(item => {
          const matchStatus =
            statusFilter === 'ALL' ||
            item.status === statusFilter;

          const matchProgram =
            programFilter === 'ALL' ||
            item.programId ===
              programFilter;

          const matchClass =
            classFilter === 'ALL' ||
            item.classId === classFilter;

          const haystack = [
            item.participantName,
            item.participantEmail,
            item.programName,
            item.className,
          ]
            .join(' ')
            .toLowerCase();

          const matchSearch =
            !keyword ||
            haystack.includes(keyword);

          return (
            matchStatus &&
            matchProgram &&
            matchClass &&
            matchSearch
          );
        })
        .sort(
          (a, b) =>
            getMillis(b.registeredAt) -
            getMillis(a.registeredAt),
        );
    }, [
      registrations,
      search,
      statusFilter,
      programFilter,
      classFilter,
    ]);

  // [FLOW] Kembalikan seluruh filter ke kondisi awal.
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setProgramFilter('ALL');
    setClassFilter('ALL');
  };

  const hasActiveFilter =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    programFilter !== 'ALL' ||
    classFilter !== 'ALL';

  /**
   * FUNGSI: exportPdf
   * ----------------------------------------------------------------
   * Membuat laporan PDF berdasarkan filteredRegistrations.
   *
   * [FLOW]
   * Validasi Admin/data → deskripsi filter → HTML → expo-print Base64
   * → tulis ke cache → verifikasi file → expo-sharing.
   *
   * [BUSINESS RULE] PDF selalu mengikuti filter aktif.
   * [TEST POINT] Export harus diblokir jika hasil filter kosong.
   */
  const exportPdf = async () => {
    // [SECURITY] Hanya Administrator yang boleh melakukan export.
    if (
      !profile ||
      profile.role !== 'admin'
    ) {
      return;
    }

    // [VALIDASI] Jangan membuat file jika tidak ada data hasil filter.
    if (
      filteredRegistrations.length === 0
    ) {
      console.log(
        'P07.26 PDF EXPORT BLOCKED: data kosong',
      );
      return;
    }

    try {
      setExportingPdf(true);

      console.log(
        '=== P07.26 REPORT PDF EXPORT START ===',
      );
      console.log(
        'STEP 1: Data export =',
        filteredRegistrations.length,
      );

      const selectedProgram =
        programFilter === 'ALL'
          ? 'Semua Program'
          : programOptions.find(
              item =>
                item.id === programFilter,
            )?.name || '-';

      const selectedClass =
        classFilter === 'ALL'
          ? 'Semua Kelas'
          : classOptions.find(
              item =>
                item.id === classFilter,
            )?.name || '-';

      const filterDescription = [
        `Status: ${statusFilter}`,
        `Program: ${selectedProgram}`,
        `Kelas: ${selectedClass}`,
        search.trim()
          ? `Pencarian: ${search.trim()}`
          : 'Pencarian: -',
      ].join(' | ');

      // [FLOW] Bentuk HTML menggunakan data hasil filter aktif.
      const html = buildReportHtml(
        filteredRegistrations,
        filterDescription,
      );

      // [FLOW] Konversi HTML menjadi PDF dan minta hasil Base64.
      const result =
        await Print.printToFileAsync({
          html,
          base64: true,
        });

      if (!result.base64) {
        throw new Error(
          'Data Base64 PDF tidak tersedia.',
        );
      }

      console.log(
        'STEP 2: PDF generated PASS',
      );

      if (!FileSystem.cacheDirectory) {
        throw new Error(
          'Cache directory aplikasi tidak tersedia.',
        );
      }

      const fileName =
        `Laporan_Pendaftaran_${Date.now()}.pdf`;

      const shareUri =
        `${FileSystem.cacheDirectory}${fileName}`;

      // [FLOW] Tulis Base64 PDF ke cache aplikasi.
      await FileSystem.writeAsStringAsync(
        shareUri,
        result.base64,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        },
      );

      const fileInfo =
        await FileSystem.getInfoAsync(
          shareUri,
        );

      // [TEST POINT] Pastikan file PDF benar-benar terbentuk.
      if (!fileInfo.exists) {
        throw new Error(
          'File PDF laporan gagal dibuat.',
        );
      }

      console.log(
        'STEP 3: Base64 written to app cache PASS',
      );
      console.log(
        'REPORT PDF URI:',
        shareUri,
      );

      // [VALIDASI] Pastikan perangkat mendukung fitur berbagi file.
      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        throw new Error(
          'Fitur berbagi file tidak tersedia pada perangkat ini.',
        );
      }

      await Sharing.shareAsync(
        shareUri,
        {
          mimeType:
            'application/pdf',
          dialogTitle:
            'Laporan Pendaftaran Kursus',
          UTI: 'com.adobe.pdf',
        },
      );

      console.log(
        'STEP 4: Share/Save PDF PASS',
      );
      console.log(
        '=== P07.26 REPORT PDF EXPORT END ===',
      );
    } catch (error: any) {
      console.log(
        'P07.26 REPORT PDF ERROR:',
        error?.message,
      );
    } finally {
      setExportingPdf(false);
    }
  };

  /**
   * FUNGSI: exportExcel
   * ----------------------------------------------------------------
   * Membuat workbook Excel berdasarkan filteredRegistrations.
   *
   * [FLOW]
   * Validasi Admin/data → map baris → worksheet → workbook
   * → sheet Pendaftaran + Informasi → Base64 XLSX → cache
   * → verifikasi file → expo-sharing.
   *
   * [BUSINESS RULE] Excel dan PDF memakai data hasil filter yang sama.
   * [TEST POINT] Export harus diblokir jika hasil filter kosong.
   */
  const exportExcel = async () => {
    // [SECURITY] Hanya Administrator yang boleh melakukan export.
    if (
      !profile ||
      profile.role !== 'admin'
    ) {
      return;
    }

    if (
      filteredRegistrations.length === 0
    ) {
      console.log(
        'P07.26 EXCEL EXPORT BLOCKED: data kosong',
      );
      return;
    }

    try {
      setExportingExcel(true);

      console.log(
        '=== P07.26 REPORT EXCEL EXPORT START ===',
      );

      console.log(
        'STEP 1: Data export =',
        filteredRegistrations.length,
      );

      // [FLOW] Ubah object Registration menjadi baris tabel Excel.
      const excelRows =
        filteredRegistrations.map(
          (item, index) => ({
            No: index + 1,
            'Nama Participant':
              item.participantName,
            Email:
              item.participantEmail,
            Program:
              item.programName,
            Kelas:
              item.className,
            Status:
              item.status,
            'Tanggal Pendaftaran':
              formatRegisteredAt(
                item.registeredAt,
              ),
            'ID Registration':
              item.id,
          }),
        );

      // [FLOW] Data tabular → worksheet Excel.
      const worksheet =
        XLSX.utils.json_to_sheet(
          excelRows,
        );

      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 26 },
        { wch: 30 },
        { wch: 28 },
        { wch: 25 },
        { wch: 14 },
        { wch: 24 },
        { wch: 28 },
      ];

      // [FLOW] Buat workbook dan tambahkan sheet data utama.
      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Pendaftaran',
      );

      const selectedProgram =
        programFilter === 'ALL'
          ? 'Semua Program'
          : programOptions.find(
              item =>
                item.id === programFilter,
            )?.name || '-';

      const selectedClass =
        classFilter === 'ALL'
          ? 'Semua Kelas'
          : classOptions.find(
              item =>
                item.id === classFilter,
            )?.name || '-';

      // [FLOW] Sheet kedua menyimpan informasi filter aktif.
      const infoRows = [
        ['LAPORAN PENDAFTARAN KURSUS'],
        [
          'Status',
          statusFilter,
        ],
        [
          'Program',
          selectedProgram,
        ],
        [
          'Kelas',
          selectedClass,
        ],
        [
          'Pencarian',
          search.trim() || '-',
        ],
        [
          'Jumlah Data',
          filteredRegistrations.length,
        ],
      ];

      const infoSheet =
        XLSX.utils.aoa_to_sheet(
          infoRows,
        );

      infoSheet['!cols'] = [
        { wch: 18 },
        { wch: 45 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        infoSheet,
        'Informasi',
      );

      // [FLOW] Workbook → Base64 agar dapat ditulis ke cache aplikasi.
      const base64 =
        XLSX.write(workbook, {
          type: 'base64',
          bookType: 'xlsx',
        });

      if (!base64) {
        throw new Error(
          'Data Base64 Excel tidak tersedia.',
        );
      }

      console.log(
        'STEP 2: Workbook Excel generated PASS',
      );

      if (!FileSystem.cacheDirectory) {
        throw new Error(
          'Cache directory aplikasi tidak tersedia.',
        );
      }

      const fileName =
        `Laporan_Pendaftaran_${Date.now()}.xlsx`;

      const shareUri =
        `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(
        shareUri,
        base64,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        },
      );

      const fileInfo =
        await FileSystem.getInfoAsync(
          shareUri,
        );

      if (!fileInfo.exists) {
        throw new Error(
          'File Excel laporan gagal dibuat.',
        );
      }

      console.log(
        'STEP 3: Excel written to app cache PASS',
      );

      console.log(
        'REPORT EXCEL URI:',
        shareUri,
      );

      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        throw new Error(
          'Fitur berbagi file tidak tersedia pada perangkat ini.',
        );
      }

      await Sharing.shareAsync(
        shareUri,
        {
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle:
            'Laporan Pendaftaran Kursus - Excel',
          UTI:
            'org.openxmlformats.spreadsheetml.sheet',
        },
      );

      console.log(
        'STEP 4: Share/Save Excel PASS',
      );

      console.log(
        '=== P07.26 REPORT EXCEL EXPORT END ===',
      );
    } catch (error: any) {
      console.log(
        'P07.26 REPORT EXCEL ERROR:',
        error?.message,
      );
    } finally {
      setExportingExcel(false);
    }
  };

  // [FLOW] Profile belum tersedia → tampilkan loading Administrator.
  if (!profile) {
    return (
      <Layout
        title="Laporan"
        subtitle="Memuat profil Administrator."
      >
        <View style={styles.centerBox}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>
      </Layout>
    );
  }

  // [SECURITY] Participant/non-admin tidak boleh membuka Report Center.
  if (profile.role !== 'admin') {
    return (
      <Layout
        title="Laporan"
        subtitle="Fitur khusus Administrator."
      >
        <View style={styles.accessCard}>
          <Ionicons
            name="lock-closed-outline"
            size={44}
            color="#B42318"
          />

          <Text style={styles.accessTitle}>
            Akses Ditolak
          </Text>

          <Text style={styles.accessText}>
            Laporan pendaftaran hanya dapat
            diakses oleh Administrator.
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title="Laporan"
      subtitle="Monitoring dan rekap pendaftaran kursus."
      refreshing={loading}
      onRefresh={load}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons
            name="analytics-outline"
            size={29}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroSmall}>
            ADMIN REPORT CENTER
          </Text>

          <Text style={styles.heroTitle}>
            Laporan Pendaftaran
          </Text>

          <Text style={styles.heroText}>
            Pantau status seluruh pendaftaran
            kursus dalam satu halaman.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Ringkasan
      </Text>

      <View style={styles.statsGrid}>
        <StatCard
          label="Total"
          value={registrations.length}
          icon="people-outline"
          background="#EAF2FF"
          foreground={colors.primary}
        />

        <StatCard
          label={STATUS_META.PENDING.label}
          value={counts.PENDING}
          icon={STATUS_META.PENDING.icon}
          background={
            STATUS_META.PENDING.background
          }
          foreground={
            STATUS_META.PENDING.foreground
          }
        />

        <StatCard
          label={STATUS_META.APPROVED.label}
          value={counts.APPROVED}
          icon={STATUS_META.APPROVED.icon}
          background={
            STATUS_META.APPROVED.background
          }
          foreground={
            STATUS_META.APPROVED.foreground
          }
        />

        <StatCard
          label={STATUS_META.REJECTED.label}
          value={counts.REJECTED}
          icon={STATUS_META.REJECTED.icon}
          background={
            STATUS_META.REJECTED.background
          }
          foreground={
            STATUS_META.REJECTED.foreground
          }
        />

        <StatCard
          label={STATUS_META.CANCELLED.label}
          value={counts.CANCELLED}
          icon={STATUS_META.CANCELLED.icon}
          background={
            STATUS_META.CANCELLED.background
          }
          foreground={
            STATUS_META.CANCELLED.foreground
          }
        />

        <StatCard
          label={STATUS_META.COMPLETED.label}
          value={counts.COMPLETED}
          icon={STATUS_META.COMPLETED.icon}
          background={
            STATUS_META.COMPLETED.background
          }
          foreground={
            STATUS_META.COMPLETED.foreground
          }
        />
      </View>

      {/* [FLOW] Filter yang sama mengendalikan Preview, PDF, dan Excel. */}
      <View style={styles.filterCard}>
        <View style={styles.filterTitleRow}>
          <View>
            <Text style={styles.filterTitle}>
              Filter Laporan
            </Text>
            <Text style={styles.filterSubtitle}>
              Cari dan batasi data yang ditampilkan.
            </Text>
          </View>

          {hasActiveFilter && (
            <Pressable
              style={styles.resetButton}
              onPress={resetFilters}
            >
              <Ionicons
                name="refresh-outline"
                size={14}
                color="#B42318"
              />
              <Text style={styles.resetText}>
                Reset
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={19}
            color={colors.muted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama, email, program, atau kelas..."
            placeholderTextColor="#98A2B3"
            style={styles.searchInput}
            autoCapitalize="none"
          />

          {!!search && (
            <Pressable
              onPress={() => setSearch('')}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color="#98A2B3"
              />
            </Pressable>
          )}
        </View>

        <Text style={styles.filterLabel}>
          STATUS
        </Text>

        <View style={styles.chipWrap}>
          {STATUS_FILTERS.map(option => {
            const active =
              statusFilter === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() =>
                  setStatusFilter(option.value)
                }
                style={[
                  styles.filterChip,
                  active &&
                    styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.filterLabel}>
          PROGRAM
        </Text>

        <View style={styles.chipWrap}>
          <Pressable
            onPress={() => {
              setProgramFilter('ALL');
              setClassFilter('ALL');
            }}
            style={[
              styles.filterChip,
              programFilter === 'ALL' &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                programFilter === 'ALL' &&
                  styles.filterChipTextActive,
              ]}
            >
              Semua Program
            </Text>
          </Pressable>

          {programOptions.map(option => {
            const active =
              programFilter === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setProgramFilter(option.id);
                  setClassFilter('ALL');
                }}
                style={[
                  styles.filterChip,
                  active &&
                    styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {option.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.filterLabel}>
          KELAS
        </Text>

        <View style={styles.chipWrap}>
          <Pressable
            onPress={() =>
              setClassFilter('ALL')
            }
            style={[
              styles.filterChip,
              classFilter === 'ALL' &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                classFilter === 'ALL' &&
                  styles.filterChipTextActive,
              ]}
            >
              Semua Kelas
            </Text>
          </Pressable>

          {classOptions.map(option => {
            const active =
              classFilter === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() =>
                  setClassFilter(option.id)
                }
                style={[
                  styles.filterChip,
                  active &&
                    styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {option.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filterResult}>
          <Ionicons
            name="funnel-outline"
            size={15}
            color={colors.primary}
          />
          <Text style={styles.filterResultText}>
            Menampilkan {filteredRegistrations.length} dari{' '}
            {registrations.length} pendaftaran
          </Text>
        </View>
      </View>

      {/* [TEST POINT] PDF memakai filteredRegistrations. */}
      <View style={styles.exportCard}>
        <View style={styles.exportInfo}>
          <View style={styles.exportIcon}>
            <Ionicons
              name="document-text-outline"
              size={22}
              color="#B42318"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.exportTitle}>
              Export Laporan PDF
            </Text>
            <Text style={styles.exportSubtitle}>
              PDF mengikuti filter aktif •{' '}
              {filteredRegistrations.length} data
            </Text>
          </View>
        </View>

        <Pressable
          disabled={
            exportingPdf ||
            filteredRegistrations.length === 0
          }
          onPress={exportPdf}
          style={[
            styles.exportButton,
            (
              exportingPdf ||
              filteredRegistrations.length === 0
            ) &&
              styles.exportButtonDisabled,
          ]}
        >
          {exportingPdf ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="share-outline"
              size={18}
              color="#FFFFFF"
            />
          )}

          <Text style={styles.exportButtonText}>
            {exportingPdf
              ? 'Membuat PDF...'
              : 'Export / Bagikan PDF'}
          </Text>
        </Pressable>
      </View>

      {/* [TEST POINT] Excel memakai filteredRegistrations yang sama. */}
      <View style={styles.excelCard}>
        <View style={styles.exportInfo}>
          <View style={styles.excelIcon}>
            <Ionicons
              name="grid-outline"
              size={22}
              color="#15753A"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.exportTitle}>
              Export Laporan Excel
            </Text>

            <Text style={styles.exportSubtitle}>
              File .xlsx mengikuti filter aktif •{' '}
              {filteredRegistrations.length} data
            </Text>
          </View>
        </View>

        <Pressable
          disabled={
            exportingExcel ||
            filteredRegistrations.length === 0
          }
          onPress={exportExcel}
          style={[
            styles.excelButton,
            (
              exportingExcel ||
              filteredRegistrations.length === 0
            ) &&
              styles.exportButtonDisabled,
          ]}
        >
          {exportingExcel ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="share-outline"
              size={18}
              color="#FFFFFF"
            />
          )}

          <Text style={styles.exportButtonText}>
            {exportingExcel
              ? 'Membuat Excel...'
              : 'Export / Bagikan Excel'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Preview Laporan
          </Text>

          <Text style={styles.sectionSubtitle}>
            {filteredRegistrations.length} data
            ditampilkan
          </Text>
        </View>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>
            FIRESTORE
          </Text>
        </View>
      </View>

      {/* [FLOW] Loading → Empty State → Preview data hasil filter. */}
      {loading &&
      filteredRegistrations.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Memuat laporan...
          </Text>
        </View>
      ) : filteredRegistrations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="document-text-outline"
            size={42}
            color={colors.muted}
          />

          <Text style={styles.emptyTitle}>
            Belum Ada Data
          </Text>

          <Text style={styles.emptyText}>
            Tidak ada pendaftaran yang cocok
            dengan filter atau pencarian saat ini.
          </Text>
        </View>
      ) : (
        filteredRegistrations.map(
          (item, index) => {
            const status =
              STATUS_META[item.status];

            return (
              <View
                key={item.id}
                style={styles.reportCard}
              >
                <View
                  style={styles.reportTop}
                >
                  <View
                    style={
                      styles.numberCircle
                    }
                  >
                    <Text
                      style={
                        styles.numberText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.reportIdentity
                    }
                  >
                    <Text
                      style={
                        styles.participantName
                      }
                    >
                      {item.participantName}
                    </Text>

                    <Text
                      style={
                        styles.participantEmail
                      }
                    >
                      {item.participantEmail}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          status.background,
                      },
                    ]}
                  >
                    <Ionicons
                      name={status.icon}
                      size={13}
                      color={
                        status.foreground
                      }
                    />

                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            status.foreground,
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.courseBox
                  }
                >
                  <View
                    style={styles.courseRow}
                  >
                    <Ionicons
                      name="school-outline"
                      size={17}
                      color={colors.primary}
                    />

                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.fieldLabel
                        }
                      >
                        PROGRAM
                      </Text>

                      <Text
                        style={
                          styles.fieldValue
                        }
                      >
                        {item.programName}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={styles.courseRow}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={17}
                      color={colors.primary}
                    />

                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.fieldLabel
                        }
                      >
                        KELAS
                      </Text>

                      <Text
                        style={
                          styles.fieldValue
                        }
                      >
                        {item.className}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={
                    styles.reportFooter
                  }
                >
                  <View
                    style={styles.footerItem}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={colors.muted}
                    />

                    <Text
                      style={
                        styles.footerText
                      }
                    >
                      {formatRegisteredAt(
                        item.registeredAt,
                      )}
                    </Text>
                  </View>

                  <Text
                    style={styles.idText}
                  >
                    {item.id
                      ? `${item.id.substring(
                          0,
                          8,
                        )}...`
                      : '-'}
                  </Text>
                </View>
              </View>
            );
          },
        )
      )}

      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={colors.primary}
        />

        <Text style={styles.infoText}>
          PDF dan Excel menggunakan data yang sama
          dengan preview setelah filter diterapkan.
          Proses export tidak mengubah data Firestore.
        </Text>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#162B4D',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 17,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor:
      'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroContent: {
    flex: 1,
  },

  heroSmall: {
    color:
      'rgba(255,255,255,0.70)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
  },

  heroText: {
    color:
      'rgba(255,255,255,0.84)',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 10,
    marginBottom: 20,
  },

  statCard: {
    width: '31%',
    minHeight: 108,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    padding: 11,
  },

  statIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 7,
  },

  statLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },

  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    padding: 13,
    marginBottom: 18,
  },

  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  filterTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  filterSubtitle: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 2,
  },

  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDEBEC',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },

  resetText: {
    color: '#B42318',
    fontSize: 8,
    fontWeight: '900',
  },

  searchBox: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: '#DDE4ED',
    borderRadius: 13,
    marginTop: 12,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FBFCFE',
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    paddingVertical: 9,
  },

  filterLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 13,
    marginBottom: 7,
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  filterChip: {
    borderWidth: 1,
    borderColor: '#DDE4ED',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterChipText: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  filterResult: {
    backgroundColor: '#EAF2FF',
    borderRadius: 11,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
  },

  filterResultText: {
    color: '#245EAA',
    fontSize: 9,
    fontWeight: '800',
  },

  exportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    padding: 13,
    marginBottom: 18,
  },

  exportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  exportIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FDEBEC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  exportTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  exportSubtitle: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 2,
  },

  exportButton: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: '#B42318',
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  exportButtonDisabled: {
    opacity: 0.48,
  },

  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  excelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    padding: 13,
    marginBottom: 18,
  },

  excelIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E7F7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  excelButton: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: '#15753A',
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  liveBadge: {
    backgroundColor: '#E7F7EC',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#15753A',
  },

  liveText: {
    color: '#15753A',
    fontSize: 8,
    fontWeight: '900',
  },

  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    marginBottom: 11,
    overflow: 'hidden',
  },

  reportTop: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  numberCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  numberText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  reportIdentity: {
    flex: 1,
  },

  participantName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  participantEmail: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 2,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  statusText: {
    fontSize: 7,
    fontWeight: '900',
  },

  courseBox: {
    backgroundColor: '#F7F9FC',
    marginHorizontal: 13,
    borderRadius: 13,
    padding: 11,
    gap: 9,
  },

  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  fieldLabel: {
    color: colors.muted,
    fontSize: 7,
    fontWeight: '800',
  },

  fieldValue: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },

  reportFooter: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  footerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  footerText: {
    color: colors.muted,
    fontSize: 8,
  },

  idText: {
    color: '#98A2B3',
    fontSize: 8,
    fontWeight: '700',
  },

  centerBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  loadingText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    padding: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 5,
  },

  accessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1D5D8',
    padding: 25,
    alignItems: 'center',
  },

  accessTitle: {
    color: '#B42318',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
  },

  accessText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 5,
  },

  infoBox: {
    backgroundColor: '#EAF2FF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 3,
    marginBottom: 10,
  },

  infoText: {
    flex: 1,
    color: '#245EAA',
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '700',
  },
});
