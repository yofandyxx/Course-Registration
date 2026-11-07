/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 * 
 *
 * Fungsi File :
 * - Menampilkan kartu digital peserta kursus.
 * - Membatasi fitur hanya untuk akun Participant.
 * - Membentuk kartu hanya dari registration berstatus APPROVED.
 * - Menggabungkan data registration dengan data kelas.
 * - Menggunakan photoUrl profil sebagai foto peserta.
 * - Membuat PDF kartu peserta dan membagikannya melalui perangkat.
 *
 * Catatan Pembelajaran:
 * File ini merupakan bagian dari source code pembelajaran
 * Project 07 — PPNPCourseRegistration.
 *
 * [FLOW]          Alur proses utama
 * [VALIDASI]      Pemeriksaan sebelum proses dilanjutkan
 * [BUSINESS RULE] Aturan bisnis kartu peserta
 * [SECURITY]      Pembatasan berdasarkan role/status
 * [TEST POINT]    Titik penting untuk pengujian mahasiswa
 *
 * ================================================================
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from '@react-navigation/native';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  listClasses,
  listRegistrations,
} from '../services/firestore';
import {
  CourseClass,
  Registration,
} from '../types';
import { colors } from '../utils/theme';

/* ============================================================
   PROJECT 07
   P07.25B–F — KARTU PESERTA KURSUS

   Aturan:
   - Hanya Participant.
   - Kartu hanya berasal dari registration APPROVED.
   - Tidak membuat collection kartu baru.
   - Foto menggunakan photoUrl dari profil/Cloudinary.
   - PDF belum digunakan pada tahap ini.
   ============================================================ */

type ApprovedCard = {
  registration: Registration;
  courseClass?: CourseClass;
};

/**
 * FUNGSI: shortUid
 * ----------------------------------------------------------------
 * Memendekkan UID agar nyaman ditampilkan pada kartu peserta tanpa
 * mengubah UID asli yang tersimpan pada profile.
 */
function shortUid(uid: string) {
  if (!uid) return '-';
  if (uid.length <= 18) return uid;
  return `${uid.substring(0, 8)}...${uid.substring(uid.length - 6)}`;
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>
    </View>
  );
}


/**
 * FUNGSI: escapeHtml
 * ----------------------------------------------------------------
 * [SECURITY] Mengubah karakter khusus menjadi HTML entity sebelum
 * data profile/registration dimasukkan ke template HTML PDF.
 */
function escapeHtml(value?: string) {
  return String(value || '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * FUNGSI: buildCardHtml
 * ----------------------------------------------------------------
 * Membentuk dokumen HTML kartu peserta yang akan dikonversi menjadi PDF.
 *
 * [FLOW] Profile + Registration + CourseClass → HTML kartu.
 * [BUSINESS RULE] Template ini digunakan untuk kartu registration APPROVED.
 */
function buildCardHtml(
  profile: any,
  registration: Registration,
  courseClass?: CourseClass,
) {
  const period =
    courseClass?.startDate || courseClass?.endDate
      ? `${courseClass?.startDate || '-'} s.d. ${courseClass?.endDate || '-'}`
      : '-';

  const photoHtml = profile.photoUrl
    ? `<img src="${escapeHtml(profile.photoUrl)}" class="photo" />`
    : `<div class="photo placeholder">👤</div>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #172033;
      background: #ffffff;
    }
    .page { width: 100%; padding-top: 8px; }
    .title {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      color: #667085;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }
    .card {
      width: 100%;
      border: 1px solid #dbe3ee;
      border-radius: 18px;
      overflow: hidden;
    }
    .header {
      background: #162b4d;
      color: #ffffff;
      padding: 22px;
    }
    .brand-small {
      font-size: 10px;
      opacity: .72;
      letter-spacing: 1px;
      font-weight: 700;
    }
    .brand-title {
      font-size: 23px;
      font-weight: 800;
      margin-top: 5px;
    }
    .active {
      display: inline-block;
      margin-top: 12px;
      background: #e2f7e9;
      color: #15753a;
      border-radius: 18px;
      padding: 6px 11px;
      font-size: 9px;
      font-weight: 800;
    }
    .identity {
      display: flex;
      padding: 22px;
      align-items: center;
      border-bottom: 1px solid #edf1f5;
    }
    .photo {
      width: 105px;
      height: 105px;
      border-radius: 16px;
      object-fit: cover;
      background: #eaf2ff;
      margin-right: 20px;
    }
    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 45px;
    }
    .name {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 5px;
    }
    .minor {
      font-size: 11px;
      color: #667085;
      line-height: 1.7;
    }
    .uid {
      display: inline-block;
      margin-top: 9px;
      background: #f1f5fa;
      padding: 6px 9px;
      border-radius: 7px;
      font-size: 9px;
      font-weight: 700;
    }
    .content { padding: 22px; }
    .label {
      color: #245eaa;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .program {
      font-size: 20px;
      font-weight: 800;
      margin-top: 5px;
    }
    .class-name {
      color: #667085;
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
    }
    .details {
      margin-top: 18px;
      background: #f7f9fc;
      border-radius: 12px;
      padding: 15px;
    }
    .row {
      padding: 8px 0;
      border-bottom: 1px solid #e8edf3;
    }
    .row:last-child { border-bottom: none; }
    .row-label {
      font-size: 9px;
      color: #667085;
      font-weight: 700;
    }
    .row-value {
      font-size: 12px;
      font-weight: 700;
      margin-top: 3px;
    }
    .footer {
      padding: 16px 22px;
      border-top: 1px solid #edf1f5;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .verified {
      color: #15753a;
      font-size: 10px;
      font-weight: 800;
    }
    .approved {
      background: #e2f7e9;
      color: #15753a;
      border-radius: 15px;
      padding: 6px 10px;
      font-size: 9px;
      font-weight: 800;
    }
    .note {
      margin-top: 16px;
      text-align: center;
      color: #667085;
      font-size: 9px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="title">PPNP COURSE REGISTRATION • KARTU DIGITAL PESERTA</div>
    <div class="card">
      <div class="header">
        <div class="brand-small">PPNP COURSE REGISTRATION</div>
        <div class="brand-title">KARTU PESERTA KURSUS</div>
        <div class="active">PESERTA AKTIF</div>
      </div>

      <div class="identity">
        ${photoHtml}
        <div>
          <div class="name">${escapeHtml(profile.name)}</div>
          <div class="minor">${escapeHtml(profile.email)}</div>
          <div class="minor">${escapeHtml(profile.phone)}</div>
          <div class="uid">ID PESERTA: ${escapeHtml(shortUid(profile.uid))}</div>
        </div>
      </div>

      <div class="content">
        <div class="label">PROGRAM KURSUS</div>
        <div class="program">${escapeHtml(registration.programName)}</div>
        <div class="class-name">${escapeHtml(registration.className)}</div>

        <div class="details">
          <div class="row">
            <div class="row-label">INSTRUKTUR</div>
            <div class="row-value">${escapeHtml(
              courseClass?.instructorName ||
              courseClass?.instructor ||
              'Belum ditentukan'
            )}</div>
          </div>
          <div class="row">
            <div class="row-label">JADWAL</div>
            <div class="row-value">${escapeHtml(courseClass?.schedule)}</div>
          </div>
          <div class="row">
            <div class="row-label">RUANGAN</div>
            <div class="row-value">${escapeHtml(courseClass?.room)}</div>
          </div>
          <div class="row">
            <div class="row-label">PERIODE</div>
            <div class="row-value">${escapeHtml(period)}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="verified">✓ TERVERIFIKASI ADMINISTRATOR</div>
        <div class="approved">APPROVED</div>
      </div>
    </div>

    <div class="note">
      Dokumen ini dibuat dari PPNP Course Registration.
      Kartu hanya diterbitkan untuk pendaftaran berstatus APPROVED.
    </div>
  </div>
</body>
</html>`;
}

export default function ParticipantCardScreen() {
  const { profile } = useAuth();

  const [registrations, setRegistrations] =
    useState<Registration[]>([]);
  const [classes, setClasses] =
    useState<CourseClass[]>([]);
  const [loading, setLoading] =
    useState(false);

  const [exportingId, setExportingId] =
    useState<string | null>(null);

  /**
   * FUNGSI: load
   * ----------------------------------------------------------------
   * Mengambil registration milik Participant dan seluruh data kelas
   * secara paralel, kemudian menyimpannya ke state.
   *
   * [SECURITY] Query registration menggunakan profile.uid.
   * [TEST POINT] Admin/non-participant tidak menjalankan proses load kartu.
   */
  const load = async () => {
    // [VALIDASI] Fitur kartu hanya diproses untuk profile Participant.
    if (!profile || profile.role !== 'participant') {
      return;
    }

    try {
      setLoading(true);

      console.log('=== P07.25 KARTU PESERTA LOAD START ===');

      const [registrationData, classData] =
        await Promise.all([
          listRegistrations(profile.uid),
          listClasses(),
        ]);

      setRegistrations(registrationData);
      setClasses(classData);

      console.log(
        'STEP 1: Registration participant PASS =',
        registrationData.length,
      );
      console.log(
        'STEP 2: Classes PASS =',
        classData.length,
      );
      console.log(
        'STEP 3: APPROVED =',
        registrationData.filter(
          item => item.status === 'APPROVED',
        ).length,
      );
      console.log('=== P07.25 KARTU PESERTA LOAD END ===');
    } catch (error: any) {
      console.log(
        'P07.25 CARD LOAD ERROR:',
        error?.code,
        error?.message,
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (profile?.uid && profile.role === 'participant') {
        load();
      }
    }, [profile?.uid, profile?.role]),
  );

  /**
   * [BUSINESS RULE]
   * Hanya registration berstatus APPROVED yang menghasilkan kartu.
   * Data registration kemudian dipasangkan dengan CourseClass berdasarkan classId.
   */
  const approvedCards =
    useMemo<ApprovedCard[]>(() => {
      return registrations
        .filter(item => item.status === 'APPROVED')
        .map(registration => ({
          registration,
          courseClass: classes.find(
            item => item.id === registration.classId,
          ),
        }));
    }, [registrations, classes]);


  /**
   * FUNGSI: exportPdf
   * ----------------------------------------------------------------
   * Membuat dan membagikan PDF kartu peserta.
   *
   * [FLOW]
   * Validasi → buildCardHtml() → expo-print Base64 → tulis ke cache
   * aplikasi → cek file → cek sharing → shareAsync().
   *
   * [BUSINESS RULE] PDF hanya boleh dibuat dari registration APPROVED.
   * [TEST POINT] Uji pembuatan PDF dan proses share pada Expo Go Android.
   */
  const exportPdf = async ({
    registration,
    courseClass,
  }: ApprovedCard) => {
    // [SECURITY] Participant + APPROVED adalah syarat ekspor kartu.
    if (
      !profile ||
      profile.role !== 'participant' ||
      registration.status !== 'APPROVED'
    ) {
      return;
    }

    try {
      setExportingId(registration.id);

      console.log('=== P07.25 PDF EXPORT START ===');
      console.log('STEP 1: Validasi APPROVED PASS');

      // [FLOW] Bentuk HTML dari data profile, registration, dan kelas.
      const html = buildCardHtml(
        profile,
        registration,
        courseClass,
      );

      // [FLOW] Konversi HTML menjadi PDF sekaligus meminta hasil Base64.
      const result = await Print.printToFileAsync({
        html,
        base64: true,
      });

      console.log('STEP 2: PDF generated PASS');
      console.log('PDF URI:', result.uri);

      /*
       * Pada Expo Go Android, URI /cache/Print/... dapat berada
       * pada lokasi host yang tidak boleh dibaca oleh expo-sharing
       * maupun FileSystem.copyAsync().
       *
       * Solusi FIX2:
       * - minta expo-print mengembalikan Base64,
       * - jangan membaca/copy URI Print,
       * - tulis Base64 langsung menjadi PDF baru pada cache
       *   aplikasi/experience,
       * - share file baru tersebut.
       */
      // [VALIDASI] Base64 wajib tersedia karena file akan ditulis ulang ke cache app.
      if (!result.base64) {
        throw new Error(
          'Data Base64 PDF tidak tersedia.',
        );
      }

      // [VALIDASI] Pastikan cache directory aplikasi tersedia.
      if (!FileSystem.cacheDirectory) {
        throw new Error(
          'Cache directory aplikasi tidak tersedia.',
        );
      }

      const safeClassName =
        String(registration.className || 'Kursus')
          .replace(/[^a-zA-Z0-9_-]+/g, '_')
          .replace(/^_+|_+$/g, '');

      const fileName =
        `Kartu_Peserta_${safeClassName || 'Kursus'}.pdf`;

      const shareUri =
        `${FileSystem.cacheDirectory}${fileName}`;

      const oldFile =
        await FileSystem.getInfoAsync(shareUri);

      if (oldFile.exists) {
        await FileSystem.deleteAsync(
          shareUri,
          { idempotent: true },
        );
      }

      // [FLOW] Tulis Base64 sebagai file PDF baru di cache aplikasi.
      await FileSystem.writeAsStringAsync(
        shareUri,
        result.base64,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        },
      );

      const writtenFile =
        await FileSystem.getInfoAsync(
          shareUri,
        );

      // [TEST POINT] Pastikan PDF benar-benar sudah tercipta sebelum dibagikan.
      if (!writtenFile.exists) {
        throw new Error(
          'PDF gagal ditulis ke cache aplikasi.',
        );
      }

      console.log(
        'STEP 3: Base64 written to app cache PASS',
      );
      console.log('SHARE URI:', shareUri);
      console.log(
        'PDF SIZE:',
        'size' in writtenFile
          ? writtenFile.size
          : '-',
      );

      // [VALIDASI] Perangkat harus mendukung fitur berbagi file.
      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        throw new Error(
          'Fitur berbagi file tidak tersedia pada perangkat ini.',
        );
      }

      // [FLOW] Buka dialog berbagi/simpan PDF pada perangkat.
      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Kartu Peserta - ${registration.className}`,
        UTI: 'com.adobe.pdf',
      });

      console.log('STEP 4: Share/Save PDF PASS');
      console.log('=== P07.25 PDF EXPORT END ===');
    } catch (error: any) {
      console.log(
        'P07.25 PDF EXPORT ERROR:',
        error?.message,
      );
    } finally {
      setExportingId(null);
    }
  };

  // [FLOW] Profile belum tersedia → tampilkan loading state.
  if (!profile) {
    return (
      <Layout
        title="Kartu Peserta"
        subtitle="Identitas resmi peserta kursus."
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

  // [SECURITY] Admin/non-participant tidak boleh membuka kartu peserta.
  if (profile.role !== 'participant') {
    return (
      <Layout
        title="Kartu Peserta"
        subtitle="Fitur khusus Participant."
      >
        <View style={styles.emptyCard}>
          <Ionicons
            name="lock-closed-outline"
            size={42}
            color={colors.muted}
          />
          <Text style={styles.emptyTitle}>
            Akses Khusus Participant
          </Text>
          <Text style={styles.emptyText}>
            Kartu peserta hanya tersedia untuk akun Participant.
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title="Kartu Peserta"
      subtitle="Kartu digital untuk pendaftaran kursus yang telah disetujui."
      refreshing={loading}
      onRefresh={load}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons
            name="card-outline"
            size={29}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroSmall}>
            PPNP COURSE REGISTRATION
          </Text>
          <Text style={styles.heroTitle}>
            Kartu Peserta Kursus
          </Text>
          <Text style={styles.heroText}>
            Kartu tersedia setelah pendaftaran berstatus APPROVED.
          </Text>
        </View>
      </View>

      {/* [FLOW] Loading → Empty State → Daftar kartu APPROVED. */}
      {loading && approvedCards.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
          <Text style={styles.loadingText}>
            Memuat kartu peserta...
          </Text>
        </View>
      ) : approvedCards.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="hourglass-outline"
              size={35}
              color="#A66300"
            />
          </View>

          <Text style={styles.emptyTitle}>
            Kartu Belum Tersedia
          </Text>

          <Text style={styles.emptyText}>
            Anda belum memiliki pendaftaran berstatus APPROVED.
            Kartu akan tersedia setelah Administrator menyetujui
            pendaftaran kursus.
          </Text>

          <View style={styles.ruleBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#15753A"
            />
            <Text style={styles.ruleText}>
              PENDING, REJECTED, dan CANCELLED tidak dapat
              menghasilkan kartu peserta.
            </Text>
          </View>
        </View>
      ) : (
        approvedCards.map(({ registration, courseClass }) => (
          <View
            key={registration.id}
            style={styles.cardShell}
          >
            <View style={styles.cardTop}>
              <View style={styles.brandBlock}>
                <View style={styles.brandIcon}>
                  <Ionicons
                    name="school"
                    size={22}
                    color="#FFFFFF"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.brandSmall}>
                    PPNP COURSE REGISTRATION
                  </Text>
                  <Text style={styles.brandTitle}>
                    KARTU PESERTA KURSUS
                  </Text>
                </View>
              </View>

              <View style={styles.activeBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color="#15753A"
                />
                <Text style={styles.activeBadgeText}>
                  PESERTA AKTIF
                </Text>
              </View>
            </View>

            <View style={styles.identityArea}>
              <View style={styles.photoFrame}>
                {profile.photoUrl ? (
                  <Image
                    source={{ uri: profile.photoUrl }}
                    style={styles.photo}
                  />
                ) : (
                  <Ionicons
                    name="person"
                    size={48}
                    color={colors.primary}
                  />
                )}
              </View>

              <View style={styles.identityText}>
                <Text style={styles.name}>
                  {profile.name}
                </Text>
                <Text style={styles.email}>
                  {profile.email}
                </Text>
                <Text style={styles.phone}>
                  {profile.phone || '-'}
                </Text>

                <View style={styles.idBadge}>
                  <Text style={styles.idLabel}>
                    ID PESERTA
                  </Text>
                  <Text style={styles.idValue}>
                    {shortUid(profile.uid)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.programLabel}>
              PROGRAM KURSUS
            </Text>
            <Text style={styles.programName}>
              {registration.programName}
            </Text>
            <Text style={styles.className}>
              {registration.className}
            </Text>

            <View style={styles.detailBox}>
              <InfoRow
                icon="person-outline"
                label="Instruktur"
                value={
                  courseClass?.instructorName ||
                  courseClass?.instructor ||
                  'Belum ditentukan'
                }
              />

              <InfoRow
                icon="calendar-outline"
                label="Jadwal"
                value={courseClass?.schedule || '-'}
              />

              <InfoRow
                icon="location-outline"
                label="Ruangan"
                value={courseClass?.room || '-'}
              />

              <InfoRow
                icon="calendar-number-outline"
                label="Periode"
                value={
                  courseClass?.startDate || courseClass?.endDate
                    ? `${courseClass?.startDate || '-'} s.d. ${
                        courseClass?.endDate || '-'
                      }`
                    : '-'
                }
              />
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.verifiedBox}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color="#15753A"
                />
                <View>
                  <Text style={styles.verifiedTitle}>
                    TERVERIFIKASI
                  </Text>
                  <Text style={styles.verifiedText}>
                    Pendaftaran disetujui Administrator
                  </Text>
                </View>
              </View>

              <View style={styles.statusApproved}>
                <Text style={styles.statusApprovedText}>
                  APPROVED
                </Text>
              </View>
            </View>

            <View style={styles.pdfArea}>
              <Text style={styles.pdfHint}>
                Simpan atau bagikan kartu peserta dalam format PDF.
              </Text>

              <View
                style={[
                  styles.pdfButton,
                  exportingId === registration.id &&
                    styles.pdfButtonDisabled,
                ]}
                onTouchEnd={() => {
                  if (exportingId !== registration.id) {
                    exportPdf({
                      registration,
                      courseClass,
                    });
                  }
                }}
              >
                {exportingId === registration.id ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                )}

                <Text style={styles.pdfButtonText}>
                  {exportingId === registration.id
                    ? 'Membuat PDF...'
                    : 'Cetak / Bagikan PDF'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      <View style={styles.noteBox}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={colors.primary}
        />
        <Text style={styles.noteText}>
          Kartu digital dapat dicetak menjadi PDF lalu disimpan
          atau dibagikan menggunakan fitur berbagi pada perangkat.
        </Text>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 14,
  },

  heroIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroContent: {
    flex: 1,
  },

  heroSmall: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
  },

  heroText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  centerBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  loadingText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    alignItems: 'center',
    marginBottom: 14,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#FFF3D9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 12,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },

  ruleBox: {
    width: '100%',
    backgroundColor: '#EAF8EF',
    borderRadius: 13,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },

  ruleText: {
    flex: 1,
    color: '#15753A',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
  },

  cardShell: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE5EF',
    overflow: 'hidden',
    marginBottom: 16,
  },

  cardTop: {
    backgroundColor: '#162B4D',
    padding: 15,
    gap: 11,
  },

  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandSmall: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  brandTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },

  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2F7E9',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  activeBadgeText: {
    color: '#15753A',
    fontSize: 9,
    fontWeight: '900',
  },

  identityArea: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  photoFrame: {
    width: 82,
    height: 82,
    borderRadius: 23,
    backgroundColor: '#EAF2FF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  photo: {
    width: '100%',
    height: '100%',
  },

  identityText: {
    flex: 1,
  },

  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  email: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },

  phone: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },

  idBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5FA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
  },

  idLabel: {
    color: colors.muted,
    fontSize: 7,
    fontWeight: '800',
  },

  idValue: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 1,
  },

  divider: {
    height: 1,
    backgroundColor: '#EEF1F5',
    marginHorizontal: 16,
  },

  programLabel: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginTop: 14,
  },

  programName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginHorizontal: 16,
    marginTop: 3,
  },

  className: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 3,
  },

  detailBox: {
    backgroundColor: '#F7F9FC',
    borderRadius: 15,
    margin: 16,
    padding: 12,
    gap: 8,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  infoIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '700',
  },

  infoValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  verifiedBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  verifiedTitle: {
    color: '#15753A',
    fontSize: 8,
    fontWeight: '900',
  },

  verifiedText: {
    color: colors.muted,
    fontSize: 8,
    marginTop: 1,
  },

  statusApproved: {
    backgroundColor: '#E2F7E9',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusApprovedText: {
    color: '#15753A',
    fontSize: 8,
    fontWeight: '900',
  },

  pdfArea: {
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
    padding: 13,
    backgroundColor: '#FBFCFE',
  },

  pdfHint: {
    color: colors.muted,
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 8,
  },

  pdfButton: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },

  pdfButtonDisabled: {
    opacity: 0.65,
  },

  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  noteBox: {
    backgroundColor: '#EAF2FF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },

  noteText: {
    flex: 1,
    color: '#245EAA',
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '700',
  },
});
