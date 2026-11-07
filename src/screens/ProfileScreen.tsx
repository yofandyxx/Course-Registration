/**
 * ================================================================
 * PROJECT 07 — PPNPCourseRegistration
 * Sistem Informasi Pendaftaran Kursus
 * ================================================================
 *
 
 *
 * Fungsi File :
 * - Menampilkan profil Admin dan Participant.
 * - Memilih/preview foto Participant dari galeri.
 * - Upload foto ke Cloudinary dan simpan photoUrl ke Firestore.
 * - Mengedit nama dan nomor HP Participant.
 * - Menampilkan informasi akun, keamanan, sesi, dan logout.
 *
 * Penanda Pembelajaran:
 * [FLOW] [VALIDASI] [BUSINESS RULE] [SECURITY] [TEST POINT]
 * ================================================================
 */

import React, { useState } from 'react';

import {

  ActivityIndicator,

  Alert,

  Image,

  Pressable,

  TextInput,

  StyleSheet,

  Text,

  View,

} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import * as ImagePicker from 'expo-image-picker';

import Layout from '../components/Layout';

import { useAuth } from '../contexts/AuthContext';

import { uploadProfilePhoto } from '../services/cloudinary';

import { updateParticipantProfile } from '../services/profile';

import { updateUserPhoto } from '../services/firestore';

/* ============================================================

   THEME

   ============================================================ */

const adminTheme = {

  primary: '#1D4ED8',

  dark: '#172554',

  soft: '#EFF6FF',

  secondary: '#0891B2',

};

const participantTheme = {

  primary: '#4F46E5',

  dark: '#312E81',

  soft: '#EEF2FF',

  secondary: '#0D9488',

};

const common = {

  text: '#0F172A',

  muted: '#64748B',

  border: '#E2E8F0',

  green: '#16A34A',

  greenSoft: '#DCFCE7',

  red: '#DC2626',

  redSoft: '#FEE2E2',

  orange: '#D97706',

  orangeSoft: '#FEF3C7',

  purple: '#7C3AED',

  purpleSoft: '#F3E8FF',

  surface: '#FFFFFF',

};

/* ============================================================

   PROFILE SCREEN

   ============================================================ */

export default function ProfileScreen() {

  const {

    profile,

    logout,

    refresh,

  } = useAuth();

  /* ==========================================================

     FOTO PROFIL LOKAL

     localPhoto hanya menyimpan URI file lokal.

     Contoh:

     file:///data/user/0/...

     Data ini BELUM tersimpan ke:

     - Cloudinary

     - Cloud Firestore

     Sehingga ketika aplikasi benar-benar direload,

     foto dapat kembali ke avatar inisial.

     ========================================================== */

  const [

    localPhoto,

    setLocalPhoto,

  ] = useState<string | null>(null);

  const [cloudPhoto, setCloudPhoto] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  // ==========================================================
  // P07.24I - EDIT DATA PROFIL PARTICIPANT
  // ==========================================================
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  /* ==========================================================

     INFORMASI ROLE

     ========================================================== */

  // [BUSINESS RULE] Role menentukan tampilan dan fitur yang tersedia.
  const isAdmin =

    profile?.role === 'admin';

  const theme =

    isAdmin

      ? adminTheme

      : participantTheme;

  /* ==========================================================

     INFORMASI PROFILE

     ========================================================== */

  const name =

    profile?.name ||

    'Pengguna';

  const email =

    profile?.email ||

    '-';

  const phone =

    profile?.phone ||

    'Nomor HP belum diisi';

  const role =

    profile?.role ||

    'participant';

  const status =

    profile?.status ||

    'INACTIVE';

  const uid =

    profile?.uid ||

    '-';

  /* ==========================================================

     PILIH FOTO DARI GALERI

     Fungsi:

     ----------------------------------------------------------

     1. Memastikan fitur hanya untuk Participant.

     2. Meminta permission Media Library.

     3. Membuka galeri HP.

     4. User memilih gambar.

     5. Gambar dapat dipotong/crop.

     6. URI lokal disimpan ke localPhoto.

     7. React Native <Image> menampilkan preview.

     PENTING:

     Foto belum di-upload ke Cloudinary.

     ========================================================== */

  /**
   * FUNGSI: pickProfilePhoto
   * [FLOW] Role → permission → galeri → validasi asset → localPhoto.
   * URI lokal hanya menjadi preview sampai tombol upload dijalankan.
   */
  const pickProfilePhoto =

    async () => {

      /* ------------------------------------------------------

         Proteksi role.

         Untuk Project 07 saat ini foto peserta difokuskan

         kepada Participant karena nantinya juga akan digunakan

         pada Kartu Peserta Kursus.

         ------------------------------------------------------ */

      if (isAdmin) {

        Alert.alert(

          'Khusus Participant',

          'Fitur foto profil pada tahap ini digunakan untuk akun Participant.'

        );

        return;

      }

      try {

        /* ----------------------------------------------------

           Meminta izin mengakses galeri/media library.

           ---------------------------------------------------- */

        const permission =

          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {

          Alert.alert(

            'Izin Diperlukan',

            'Aplikasi membutuhkan izin untuk membuka galeri dan memilih foto profil.'

          );

          return;

        }

        /* ----------------------------------------------------

           Membuka galeri HP.

           mediaTypes:

           Hanya mengizinkan file gambar.

           allowsEditing:

           User dapat melakukan crop.

           aspect [1,1]:

           Cocok untuk foto profil berbentuk persegi.

           quality 0.8:

           Mengurangi ukuran file tanpa terlalu menurunkan

           kualitas gambar.

           ---------------------------------------------------- */

        const result =

          await ImagePicker.launchImageLibraryAsync({

            mediaTypes: ['images'],

            allowsEditing: true,

            aspect: [1, 1],

            quality: 0.8,

          });

        /* ----------------------------------------------------

           User menutup galeri tanpa memilih gambar.

           Jangan menghapus foto sebelumnya.

           Jangan menampilkan error.

           ---------------------------------------------------- */

        if (result.canceled) {

          return;

        }

        /* ----------------------------------------------------

           Validasi hasil Image Picker.

           ---------------------------------------------------- */

        if (

          !result.assets ||

          result.assets.length === 0

        ) {

          Alert.alert(

            'Foto Tidak Ditemukan',

            'File gambar yang dipilih tidak dapat dibaca.'

          );

          return;

        }

        /* ----------------------------------------------------

           Ambil asset pertama.

           Karena kita hanya memilih satu foto profil.

           ---------------------------------------------------- */

        const selectedPhoto =

          result.assets[0];

        /* ----------------------------------------------------

           Pastikan URI tersedia.

           ---------------------------------------------------- */

        if (!selectedPhoto.uri) {

          Alert.alert(

            'Foto Tidak Valid',

            'URI gambar tidak tersedia.'

          );

          return;

        }

        /* ----------------------------------------------------

           Simpan URI ke React State.

           INILAH yang menyebabkan avatar berubah menjadi foto.

           Belum ada proses upload.

           ---------------------------------------------------- */

        setLocalPhoto(

          selectedPhoto.uri

        );

        setCloudPhoto(null);

      } catch (error: any) {

        console.log(

          'IMAGE PICKER ERROR:',

          error?.message

        );

        Alert.alert(

          'Gagal Memilih Foto',

          error?.message ||

            'Terjadi kesalahan ketika membuka galeri.'

        );

      }

    };

  /* ==========================================================

     UPLOAD FOTO KE CLOUDINARY

     secure_url belum disimpan ke Cloud Firestore pada tahap ini.

     ========================================================== */

  /**
   * FUNGSI: handleUploadPhoto
   * [FLOW] localPhoto → Cloudinary → secureUrl → Firestore → cloudPhoto.
   * [SECURITY] Upload pada tahap Project 07 hanya untuk Participant.
   */
  const handleUploadPhoto = async () => {

    // ----------------------------------------------------------

    // 1. Foto harus sudah dipilih dari galeri.

    // ----------------------------------------------------------

    if (!localPhoto) {

      Alert.alert(

        'Foto Belum Dipilih',

        'Silakan pilih foto dari galeri terlebih dahulu.'

      );

      return;

    }

    // ----------------------------------------------------------

    // 2. Profile dan UID harus tersedia.

    // ----------------------------------------------------------

    if (!profile?.uid) {

      Alert.alert(

        'Profil Tidak Ditemukan',

        'UID pengguna tidak tersedia. Silakan login kembali.'

      );

      return;

    }

    // ----------------------------------------------------------

    // 3. Foto profil pada tahap Project 07 ini khusus Participant.

    // ----------------------------------------------------------

    if (isAdmin) {

      Alert.alert(

        'Khusus Participant',

        'Fitur foto profil pada Project 07 digunakan untuk Participant.'

      );

      return;

    }

    // Mencegah tombol ditekan berulang saat proses upload berlangsung.

    if (isUploading) {

      return;

    }

    try {

      setIsUploading(true);

      console.log('=== P07.24G PROFILE PHOTO START ===');

      // ========================================================

      // STEP 1: Upload file gambar ke Cloudinary.

      // ========================================================

      console.log('STEP 1: Upload foto ke Cloudinary...');

      const result = await uploadProfilePhoto(localPhoto);

      console.log('STEP 1 PASS');

      console.log('Cloudinary secure_url:', result.secureUrl);

      // ========================================================

      // STEP 2: Simpan secure_url ke Cloud Firestore.

      //

      // File gambar tetap berada di Cloudinary.

      // Firestore hanya menyimpan URL pada field photoUrl.

      // ========================================================

      console.log('STEP 2: Simpan photoUrl ke Firestore...');

      await updateUserPhoto(

        profile.uid,

        result.secureUrl

      );

      console.log('STEP 2 PASS');

      console.log('Firestore photoUrl:', result.secureUrl);

      // ========================================================

      // STEP 3: Gunakan secure_url pada tampilan saat ini.

      // ========================================================

      setCloudPhoto(result.secureUrl);

      console.log('STEP 3 PASS');

      console.log('=== P07.24G PROFILE PHOTO END ===');

      Alert.alert(

        'Foto Profil Tersimpan',

        'Foto berhasil diunggah ke Cloudinary dan URL foto berhasil disimpan ke Cloud Firestore.'

      );

    } catch (error: any) {

      console.log(

        'PROFILE PHOTO SAVE ERROR:',

        error?.message

      );

      Alert.alert(

        'Gagal Menyimpan Foto',

        error?.message ||

          'Foto profil tidak dapat disimpan.'

      );

    } finally {

      setIsUploading(false);

    }

  };

  /* ==========================================================
     P07.24I - EDIT PROFIL PARTICIPANT
     ========================================================== */

  /** FUNGSI: openEditProfile — membuka form dengan data profil saat ini. */
  const openEditProfile = () => {
    if (isAdmin || !profile) {
      return;
    }

    setEditName(profile.name || '');
    setEditPhone(profile.phone || '');
    setIsEditingProfile(true);
  };

  /** FUNGSI: cancelEditProfile — membatalkan edit dan memulihkan nilai profil. */
  const cancelEditProfile = () => {
    setEditName(profile?.name || '');
    setEditPhone(profile?.phone || '');
    setIsEditingProfile(false);
  };

  /**
   * FUNGSI: handleSaveProfile
   * [FLOW] Validasi → updateParticipantProfile → refresh AuthContext → selesai.
   * [SECURITY] Perubahan mandiri hanya name dan phone.
   */
  const handleSaveProfile = async () => {
    if (!profile?.uid) {
      Alert.alert(
        'Profil Tidak Ditemukan',
        'UID pengguna tidak tersedia. Silakan login kembali.'
      );
      return;
    }

    if (isAdmin) {
      Alert.alert(
        'Akses Ditolak',
        'Edit profil mandiri pada tahap ini hanya untuk Participant.'
      );
      return;
    }

    const cleanName = editName.trim();
    const cleanPhone = editPhone.trim();

    if (cleanName.length < 3) {
      Alert.alert(
        'Nama Tidak Valid',
        'Nama lengkap minimal terdiri dari 3 karakter.'
      );
      return;
    }

    if (!/^\d{10,15}$/.test(cleanPhone)) {
      Alert.alert(
        'Nomor HP Tidak Valid',
        'Nomor HP harus berupa 10 sampai 15 digit angka.'
      );
      return;
    }

    try {
      setIsSavingProfile(true);

      console.log('=== P07.24I UPDATE PROFILE START ===');
      console.log('STEP 1: Validasi form PASS');

      await updateParticipantProfile(
        profile.uid,
        cleanName,
        cleanPhone
      );

      console.log('STEP 2: Firestore update PASS');

      await refresh();

      console.log('STEP 3: AuthContext refresh PASS');
      console.log('=== P07.24I UPDATE PROFILE END ===');

      setIsEditingProfile(false);

      Alert.alert(
        'Profil Berhasil Diperbarui',
        'Nama dan nomor HP berhasil disimpan ke Cloud Firestore.'
      );
    } catch (error: any) {
      console.log(
        'UPDATE PROFILE ERROR:',
        error?.message
      );

      Alert.alert(
        'Gagal Memperbarui Profil',
        error?.message ||
          'Data profil tidak dapat diperbarui.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };


  /* ==========================================================

     LOGOUT

     ========================================================== */

  /** FUNGSI: handleLogout — konfirmasi sebelum mengakhiri sesi. */
  const handleLogout = () => {

    Alert.alert(

      'Logout',

      'Apakah Anda yakin ingin keluar dari aplikasi?',

      [

        {

          text: 'Batal',

          style: 'cancel',

        },

        {

          text: 'Keluar',

          style: 'destructive',

          onPress: logout,

        },

      ]

    );

  };

  /* ==========================================================

     RENDER

     ========================================================== */

  return (

    <Layout

      title="Profil"

      subtitle="Informasi akun dan sesi pengguna."

    >

      {/* ======================================================

          HERO PROFILE

          ====================================================== */}

      <View

        style={[

          styles.hero,

          {

            backgroundColor:

              theme.dark,

          },

        ]}

      >

        {/* DEKORASI */}

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

        {/* HEADER HERO */}

        <View

          style={

            styles.heroTop

          }

        >

          <View

            style={

              styles.heroLabel

            }

          >

            <Ionicons

              name={

                isAdmin

                  ? 'shield-checkmark-outline'

                  : 'school-outline'

              }

              size={15}

              color="#FFFFFF"

            />

            <Text

              style={

                styles.heroLabelText

              }

            >

              {isAdmin

                ? 'ADMIN PROFILE'

                : 'PARTICIPANT PROFILE'}

            </Text>

          </View>

          {/* STATUS */}

          <View

            style={[

              styles.statusBadge,

              {

                backgroundColor:

                  status === 'ACTIVE'

                    ? 'rgba(34,197,94,0.20)'

                    : 'rgba(239,68,68,0.20)',

              },

            ]}

          >

            <View

              style={[

                styles.statusDot,

                {

                  backgroundColor:

                    status === 'ACTIVE'

                      ? '#4ADE80'

                      : '#F87171',

                },

              ]}

            />

            <Text

              style={[

                styles.statusText,

                {

                  color:

                    status === 'ACTIVE'

                      ? '#BBF7D0'

                      : '#FECACA',

                },

              ]}

            >

              {status === 'ACTIVE'

                ? 'AKTIF'

                : 'NONAKTIF'}

            </Text>

          </View>

        </View>

        {/* ====================================================

            IDENTITAS + AVATAR/FOTO

            ==================================================== */}

        <View

          style={

            styles.profileIdentity

          }

        >

          {/* AVATAR */}

          <View

            style={[

              styles.avatar,

              {

                backgroundColor:

                  theme.primary,

              },

            ]}

          >

            {/* PARTICIPANT + FOTO TERPILIH */}

            {(cloudPhoto ||

              localPhoto ||

              profile?.photoUrl) &&

            !isAdmin ? (

              <Image

                source={{

                  uri:

                    cloudPhoto ||

                    localPhoto ||

                    profile?.photoUrl ||

                    '',

                }}

                style={

                  styles.avatarImage

                }

              />

            ) : (

              /* ----------------------------------------------

                 Jika belum ada foto:

                 tampilkan inisial nama.

                 ---------------------------------------------- */

              <Text

                style={

                  styles.avatarText

                }

              >

                {getInitials(name)}

              </Text>

            )}

            {/* STATUS KECIL PADA AVATAR */}

            <View

              style={[

                styles.avatarStatus,

                {

                  backgroundColor:

                    status === 'ACTIVE'

                      ? common.green

                      : common.red,

                },

              ]}

            >

              <Ionicons

                name={

                  status === 'ACTIVE'

                    ? 'checkmark'

                    : 'close'

                }

                size={12}

                color="#FFFFFF"

              />

            </View>

          </View>

          {/* IDENTITAS */}

          <View

            style={

              styles.identityText

            }

          >

            <Text

              style={

                styles.profileName

              }

            >

              {name}

            </Text>

            <Text

              style={

                styles.profileEmail

              }

            >

              {email}

            </Text>

            <View

              style={

                styles.rolePill

              }

            >

              <Ionicons

                name={

                  isAdmin

                    ? 'shield-outline'

                    : 'person-outline'

                }

                size={13}

                color="#DBEAFE"

              />

              <Text

                style={

                  styles.rolePillText

                }

              >

                {role.toUpperCase()}

              </Text>

            </View>

          </View>

        </View>

        {/* ====================================================

            PARTICIPANT — PILIH FOTO

            ==================================================== */}

        {!isAdmin ? (

          <View style={styles.photoSection}>

            <View style={styles.photoActionRow}>

              <Pressable

                style={styles.photoButton}

                onPress={pickProfilePhoto}

                disabled={isUploading}

              >

                <Ionicons

                  name={localPhoto ? 'camera-outline' : 'images-outline'}

                  size={18}

                  color="#FFFFFF"

                />

                <Text style={styles.photoButtonText}>

                  {localPhoto ? 'Ganti Foto' : 'Pilih Foto'}

                </Text>

              </Pressable>

              {localPhoto && (

                <Pressable

                  style={[

                    styles.uploadButton,

                    isUploading && styles.buttonDisabled,

                  ]}

                  onPress={handleUploadPhoto}

                  disabled={isUploading}

                >

                  {isUploading ? (

                    <ActivityIndicator size="small" color="#FFFFFF" />

                  ) : (

                    <Ionicons

                      name="cloud-upload-outline"

                      size={18}

                      color="#FFFFFF"

                    />

                  )}

                  <Text style={styles.photoButtonText}>

                    {isUploading

                      ? 'Mengunggah...'

                      : cloudPhoto

                        ? 'Upload Ulang'

                        : 'Upload Foto'}

                  </Text>

                </Pressable>

              )}

            </View>

            {cloudPhoto ? (

              <View style={styles.previewInfo}>

                <Ionicons

                  name="cloud-done-outline"

                  size={17}

                  color="#86EFAC"

                />

                <Text style={styles.previewSuccessText}>

                  Foto berhasil disimpan ke Cloudinary dan photoUrl telah tersimpan di Cloud Firestore.

                </Text>

              </View>

            ) : localPhoto ? (

              <View style={styles.previewInfo}>

                <Ionicons

                  name="checkmark-circle-outline"

                  size={17}

                  color="#86EFAC"

                />

                <Text style={styles.previewSuccessText}>

                  Preview lokal berhasil. Tekan Upload Foto untuk mengirim gambar ke Cloudinary.

                </Text>

              </View>

            ) : (

              <View style={styles.previewInfo}>

                <Ionicons

                  name="information-circle-outline"

                  size={17}

                  color="#BFDBFE"

                />

                <Text style={styles.photoHintText}>

                  Pilih foto dari galeri HP, kemudian upload ke Cloudinary.

                </Text>

              </View>

            )}

          </View>

        ) : (

          <View style={styles.photoHint}>

            <Ionicons

              name="shield-checkmark-outline"

              size={18}

              color="#BFDBFE"

            />

            <Text style={styles.photoHintText}>

              Avatar Administrator menggunakan inisial nama.

            </Text>

          </View>

        )}

      </View>

      {/* ======================================================

          RINGKASAN AKUN

          ====================================================== */}

      <View

        style={

          styles.summaryRow

        }

      >

        <SummaryCard

          icon="person-circle-outline"

          label="Role"

          value={

            isAdmin

              ? 'Admin'

              : 'Participant'

          }

          background={

            theme.soft

          }

          iconColor={

            theme.primary

          }

        />

        <SummaryCard

          icon={

            status === 'ACTIVE'

              ? 'checkmark-circle-outline'

              : 'close-circle-outline'

          }

          label="Status"

          value={

            status === 'ACTIVE'

              ? 'Aktif'

              : 'Nonaktif'

          }

          background={

            status === 'ACTIVE'

              ? common.greenSoft

              : common.redSoft

          }

          iconColor={

            status === 'ACTIVE'

              ? common.green

              : common.red

          }

        />

      </View>

      {/* ======================================================
          P07.24I - EDIT PROFIL PARTICIPANT
          ====================================================== */}

      {!isAdmin && (
        <View style={styles.card}>
          <SectionHeader
            icon="create-outline"
            title="Edit Profil"
            subtitle="Participant dapat memperbarui nama dan nomor HP."
            color={theme.primary}
            background={theme.soft}
          />

          {!isEditingProfile ? (
            <Pressable
              style={[
                styles.editProfileButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={openEditProfile}
            >
              <Ionicons
                name="create-outline"
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.editProfileButtonText}>
                Edit Data Profil
              </Text>
            </Pressable>
          ) : (
            <View>
              <Text style={styles.inputLabel}>
                Nama Lengkap
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={theme.primary}
                />
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor="#94A3B8"
                  editable={!isSavingProfile}
                  maxLength={80}
                />
              </View>

              <Text style={styles.inputLabel}>
                Nomor HP
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color="#059669"
                />
                <TextInput
                  style={styles.textInput}
                  value={editPhone}
                  onChangeText={value =>
                    setEditPhone(
                      value.replace(/[^0-9]/g, '')
                    )
                  }
                  placeholder="Contoh: 081234567890"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  editable={!isSavingProfile}
                  maxLength={15}
                />
              </View>

              <View style={styles.editActionRow}>
                <Pressable
                  style={[
                    styles.cancelEditButton,
                    isSavingProfile &&
                      styles.buttonDisabled,
                  ]}
                  onPress={cancelEditProfile}
                  disabled={isSavingProfile}
                >
                  <Ionicons
                    name="close-outline"
                    size={19}
                    color={common.muted}
                  />
                  <Text style={styles.cancelEditText}>
                    Batal
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.saveProfileButton,
                    { backgroundColor: theme.primary },
                    isSavingProfile &&
                      styles.buttonDisabled,
                  ]}
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Ionicons
                      name="save-outline"
                      size={19}
                      color="#FFFFFF"
                    />
                  )}

                  <Text style={styles.saveProfileText}>
                    {isSavingProfile
                      ? 'Menyimpan...'
                      : 'Simpan Perubahan'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.editSecurityNote}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={17}
                  color="#2563EB"
                />
                <Text style={styles.editSecurityText}>
                  Email, role, status, dan UID tidak dapat diubah dari form ini.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}


      {/* ======================================================

          INFORMASI PRIBADI

          ====================================================== */}

      <View

        style={

          styles.card

        }

      >

        <SectionHeader

          icon="person-outline"

          title="Informasi Pribadi"

          subtitle="Data identitas akun aplikasi."

          color={

            theme.primary

          }

          background={

            theme.soft

          }

        />

        <InfoRow

          icon="person-outline"

          label="Nama Lengkap"

          value={name}

          iconColor={

            theme.primary

          }

          iconBackground={

            theme.soft

          }

        />

        <InfoRow

          icon="mail-outline"

          label="Email"

          value={email}

          iconColor="#2563EB"

          iconBackground="#EFF6FF"

        />

        <InfoRow

          icon="call-outline"

          label="Nomor HP"

          value={phone}

          iconColor="#059669"

          iconBackground="#ECFDF5"

          last

        />

      </View>

      {/* ======================================================

          INFORMASI AKUN

          ====================================================== */}

      <View

        style={

          styles.card

        }

      >

        <SectionHeader

          icon="key-outline"

          title="Informasi Akun"

          subtitle="Identitas dan hak akses pengguna."

          color={

            common.purple

          }

          background={

            common.purpleSoft

          }

        />

        <InfoRow

          icon="shield-outline"

          label="Role Aplikasi"

          value={

            isAdmin

              ? 'Administrator'

              : 'Participant'

          }

          iconColor={

            common.purple

          }

          iconBackground={

            common.purpleSoft

          }

        />

        <InfoRow

          icon="checkmark-circle-outline"

          label="Status Akun"

          value={

            status === 'ACTIVE'

              ? 'ACTIVE'

              : 'INACTIVE'

          }

          iconColor={

            status === 'ACTIVE'

              ? common.green

              : common.red

          }

          iconBackground={

            status === 'ACTIVE'

              ? common.greenSoft

              : common.redSoft

          }

        />

        <InfoRow

          icon="finger-print-outline"

          label="User ID"

          value={

            shortUid(uid)

          }

          iconColor={

            theme.secondary

          }

          iconBackground="#ECFEFF"

          last

        />

      </View>

      {/* ======================================================

          FIREBASE SECURITY

          ====================================================== */}

      <View

        style={

          styles.securityCard

        }

      >

        <View

          style={

            styles.securityIcon

          }

        >

          <Ionicons

            name="lock-closed-outline"

            size={23}

            color={

              common.orange

            }

          />

        </View>

        <View

          style={{

            flex: 1,

          }}

        >

          <Text

            style={

              styles.securityTitle

            }

          >

            Keamanan Akun

          </Text>

          <Text

            style={

              styles.securityText

            }

          >

            Login dikelola oleh

            Firebase Authentication.

            Role, status, dan profil

            pengguna disimpan pada

            Cloud Firestore.

          </Text>

        </View>

      </View>

      {/* ======================================================

          SESSION

          ====================================================== */}

      <View

        style={

          styles.card

        }

      >

        <SectionHeader

          icon="phone-portrait-outline"

          title="Sesi Aplikasi"

          subtitle="Kelola sesi pengguna pada perangkat ini."

          color={

            common.red

          }

          background={

            common.redSoft

          }

        />

        <View

          style={

            styles.sessionInfo

          }

        >

          <Ionicons

            name="information-circle-outline"

            size={19}

            color={

              common.muted

            }

          />

          <Text

            style={

              styles.sessionText

            }

          >

            Logout akan mengakhiri

            sesi pengguna pada

            aplikasi ini.

          </Text>

        </View>

        <Pressable

          style={

            styles.logoutButton

          }

          onPress={

            handleLogout

          }

        >

          <Ionicons

            name="log-out-outline"

            size={20}

            color="#FFFFFF"

          />

          <Text

            style={

              styles.logoutText

            }

          >

            Logout

          </Text>

        </Pressable>

      </View>

      {/* ======================================================

          ROLE INFORMATION

          ====================================================== */}

      <View

        style={[

          styles.roleInfoCard,

          {

            backgroundColor:

              theme.soft,

          },

        ]}

      >

        <Ionicons

          name={

            isAdmin

              ? 'settings-outline'

              : 'book-outline'

          }

          size={22}

          color={

            theme.primary

          }

        />

        <View

          style={{

            flex: 1,

          }}

        >

          <Text

            style={[

              styles.roleInfoTitle,

              {

                color:

                  theme.primary,

              },

            ]}

          >

            {isAdmin

              ? 'Akses Administrator'

              : 'Akses Participant'}

          </Text>

          <Text

            style={

              styles.roleInfoText

            }

          >

            {isAdmin

              ? 'Administrator dapat mengelola program, kelas, pendaftaran, instruktur, dan pengguna.'

              : 'Participant dapat melihat program dan kelas, melakukan pendaftaran, serta memantau status pendaftaran.'}

          </Text>

        </View>

      </View>

    </Layout>

  );

}

/* ============================================================

   INITIAL NAMA

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

   UID PENDEK

   UID asli tetap tersimpan penuh.

   Fungsi ini hanya untuk tampilan.

   ============================================================ */

function shortUid(

  uid: string

) {

  if (!uid) {

    return '-';

  }

  if (uid.length <= 18) {

    return uid;

  }

  return `${uid.substring(

    0,

    8

  )}...${uid.substring(

    uid.length - 6

  )}`;

}

/* ============================================================

   SUMMARY CARD

   ============================================================ */

function SummaryCard({

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

        styles.summaryCard,

        {

          backgroundColor:

            background,

        },

      ]}

    >

      <View

        style={

          styles.summaryIcon

        }

      >

        <Ionicons

          name={icon}

          size={21}

          color={

            iconColor

          }

        />

      </View>

      <Text

        style={

          styles.summaryLabel

        }

      >

        {label}

      </Text>

      <Text

        style={

          styles.summaryValue

        }

      >

        {value}

      </Text>

    </View>

  );

}

/* ============================================================

   SECTION HEADER

   ============================================================ */

function SectionHeader({

  icon,

  title,

  subtitle,

  color,

  background,

}: {

  icon: React.ComponentProps<

    typeof Ionicons

  >['name'];

  title: string;

  subtitle: string;

  color: string;

  background: string;

}) {

  return (

    <View

      style={

        styles.sectionHeader

      }

    >

      <View

        style={[

          styles.sectionIcon,

          {

            backgroundColor:

              background,

          },

        ]}

      >

        <Ionicons

          name={icon}

          size={21}

          color={color}

        />

      </View>

      <View

        style={{

          flex: 1,

        }}

      >

        <Text

          style={

            styles.sectionTitle

          }

        >

          {title}

        </Text>

        <Text

          style={

            styles.sectionSubtitle

          }

        >

          {subtitle}

        </Text>

      </View>

    </View>

  );

}

/* ============================================================

   INFO ROW

   ============================================================ */

function InfoRow({

  icon,

  label,

  value,

  iconColor,

  iconBackground,

  last = false,

}: {

  icon: React.ComponentProps<

    typeof Ionicons

  >['name'];

  label: string;

  value: string;

  iconColor: string;

  iconBackground: string;

  last?: boolean;

}) {

  return (

    <View

      style={[

        styles.infoRow,

        last &&

          styles.infoRowLast,

      ]}

    >

      <View

        style={[

          styles.infoIcon,

          {

            backgroundColor:

              iconBackground,

          },

        ]}

      >

        <Ionicons

          name={icon}

          size={18}

          color={

            iconColor

          }

        />

      </View>

      <View

        style={{

          flex: 1,

        }}

      >

        <Text

          style={

            styles.infoLabel

          }

        >

          {label}

        </Text>

        <Text

          style={

            styles.infoValue

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

   STYLE

   ============================================================ */

const styles =

  StyleSheet.create({

    /* ========================================================

       HERO

       ======================================================== */

    hero: {

      borderRadius: 25,

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

        'rgba(255,255,255,0.08)',

      right: -55,

      top: -55,

    },

    heroCircleTwo: {

      position: 'absolute',

      width: 105,

      height: 105,

      borderRadius: 53,

      backgroundColor:

        'rgba(255,255,255,0.06)',

      right: 65,

      bottom: -65,

    },

    heroTop: {

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:

        'space-between',

      marginBottom: 18,

    },

    heroLabel: {

      flexDirection: 'row',

      alignItems: 'center',

      gap: 6,

      backgroundColor:

        'rgba(255,255,255,0.12)',

      borderRadius: 999,

      paddingHorizontal: 10,

      paddingVertical: 7,

    },

    heroLabelText: {

      color: '#FFFFFF',

      fontSize: 10,

      fontWeight: '900',

      letterSpacing: 0.5,

    },

    statusBadge: {

      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,

      paddingHorizontal: 9,

      paddingVertical: 6,

      borderRadius: 999,

    },

    statusDot: {

      width: 7,

      height: 7,

      borderRadius: 4,

    },

    statusText: {

      fontSize: 9,

      fontWeight: '900',

    },

    /* ========================================================

       PROFILE

       ======================================================== */

    profileIdentity: {

      flexDirection: 'row',

      alignItems: 'center',

    },

    avatar: {

      width: 76,

      height: 76,

      borderRadius: 25,

      alignItems: 'center',

      justifyContent: 'center',

      borderWidth: 3,

      borderColor:

        'rgba(255,255,255,0.22)',

      overflow: 'visible',

    },

    avatarText: {

      color: '#FFFFFF',

      fontSize: 25,

      fontWeight: '900',

    },

    /* Foto dari Image Picker */

    avatarImage: {

      width: '100%',

      height: '100%',

      borderRadius: 22,

    },

    avatarStatus: {

      position: 'absolute',

      right: -3,

      bottom: -3,

      width: 24,

      height: 24,

      borderRadius: 12,

      backgroundColor:

        common.green,

      borderWidth: 3,

      borderColor: '#FFFFFF',

      alignItems: 'center',

      justifyContent: 'center',

    },

    identityText: {

      flex: 1,

      marginLeft: 14,

    },

    profileName: {

      color: '#FFFFFF',

      fontSize: 21,

      fontWeight: '900',

    },

    profileEmail: {

      color: '#CBD5E1',

      fontSize: 12,

      marginTop: 4,

    },

    rolePill: {

      alignSelf:

        'flex-start',

      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,

      marginTop: 9,

      backgroundColor:

        'rgba(255,255,255,0.11)',

      borderRadius: 999,

      paddingHorizontal: 9,

      paddingVertical: 5,

    },

    rolePillText: {

      color: '#DBEAFE',

      fontSize: 9,

      fontWeight: '900',

    },

    /* ========================================================

       FOTO PARTICIPANT

       ======================================================== */

    photoSection: {

      marginTop: 18,

      paddingTop: 14,

      borderTopWidth: 1,

      borderTopColor:

        'rgba(255,255,255,0.12)',

    },

    photoActionRow: {

      flexDirection: 'row',

      flexWrap: 'wrap',

      gap: 9,

    },

    uploadButton: {

      minHeight: 42,

      borderRadius: 13,

      paddingHorizontal: 14,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 7,

      backgroundColor: '#0D9488',

      borderWidth: 1,

      borderColor: 'rgba(255,255,255,0.16)',

    },

    buttonDisabled: {

      opacity: 0.65,

    },

    photoButton: {

      alignSelf: 'flex-start',

      minHeight: 42,

      borderRadius: 13,

      paddingHorizontal: 14,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 7,

      backgroundColor:

        'rgba(255,255,255,0.16)',

      borderWidth: 1,

      borderColor:

        'rgba(255,255,255,0.16)',

    },

    photoButtonText: {

      color: '#FFFFFF',

      fontSize: 12,

      fontWeight: '900',

    },

    previewInfo: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 7,

      marginTop: 10,

    },

    previewSuccessText: {

      flex: 1,

      color: '#BBF7D0',

      fontSize: 11,

      lineHeight: 16,

    },

    photoHint: {

      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,

      marginTop: 18,

      paddingTop: 14,

      borderTopWidth: 1,

      borderTopColor:

        'rgba(255,255,255,0.12)',

    },

    photoHintText: {

      flex: 1,

      color: '#BFDBFE',

      fontSize: 11,

      lineHeight: 16,

    },

    /* ========================================================

       SUMMARY

       ======================================================== */

    summaryRow: {

      flexDirection: 'row',

      gap: 9,

      marginBottom: 14,

    },

    summaryCard: {

      flex: 1,

      minHeight: 118,

      borderRadius: 19,

      padding: 14,

      borderWidth: 1,

      borderColor:

        'rgba(226,232,240,0.8)',

    },

    summaryIcon: {

      width: 37,

      height: 37,

      borderRadius: 12,

      backgroundColor:

        '#FFFFFF',

      alignItems: 'center',

      justifyContent: 'center',

      marginBottom: 9,

    },

    summaryLabel: {

      color: common.muted,

      fontSize: 10,

      fontWeight: '800',

    },

    summaryValue: {

      color: common.text,

      fontSize: 16,

      fontWeight: '900',

      marginTop: 3,

    },

    /* ========================================================

       CARD

       ======================================================== */

    card: {

      backgroundColor:

        common.surface,

      borderRadius: 22,

      padding: 16,

      borderWidth: 1,

      borderColor:

        common.border,

      marginBottom: 12,

    },

    sectionHeader: {

      flexDirection: 'row',

      alignItems: 'center',

      gap: 10,

      marginBottom: 14,

    },

    sectionIcon: {

      width: 43,

      height: 43,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',

    },

    sectionTitle: {

      color: common.text,

      fontSize: 16,

      fontWeight: '900',

    },

    sectionSubtitle: {

      color: common.muted,

      fontSize: 10,

      marginTop: 2,

    },

    /* ========================================================

       INFO

       ======================================================== */

    infoRow: {

      flexDirection: 'row',

      alignItems: 'center',

      gap: 10,

      paddingVertical: 11,

      borderBottomWidth: 1,

      borderBottomColor:

        '#F1F5F9',

    },

    infoRowLast: {

      borderBottomWidth: 0,

      paddingBottom: 2,

    },

    infoIcon: {

      width: 38,

      height: 38,

      borderRadius: 12,

      alignItems: 'center',

      justifyContent: 'center',

    },

    infoLabel: {

      color: common.muted,

      fontSize: 9,

      fontWeight: '800',

    },

    infoValue: {

      color: common.text,

      fontSize: 13,

      fontWeight: '800',

      marginTop: 2,

    },

    /* ========================================================
       EDIT PROFILE
       ======================================================== */

    editProfileButton: {
      minHeight: 48,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    editProfileButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },

    inputLabel: {
      color: common.text,
      fontSize: 11,
      fontWeight: '900',
      marginBottom: 7,
      marginTop: 4,
    },

    inputContainer: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: common.border,
      backgroundColor: '#F8FAFC',
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginBottom: 13,
    },

    textInput: {
      flex: 1,
      color: common.text,
      fontSize: 13,
      paddingVertical: 10,
    },

    editActionRow: {
      flexDirection: 'row',
      gap: 9,
      marginTop: 3,
    },

    cancelEditButton: {
      flex: 1,
      minHeight: 47,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: common.border,
      backgroundColor: '#F8FAFC',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    cancelEditText: {
      color: common.muted,
      fontSize: 12,
      fontWeight: '900',
    },

    saveProfileButton: {
      flex: 1.4,
      minHeight: 47,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    saveProfileText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },

    editSecurityNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: '#EFF6FF',
      padding: 10,
    },

    editSecurityText: {
      flex: 1,
      color: '#1E40AF',
      fontSize: 10,
      lineHeight: 15,
    },


    /* ========================================================

       SECURITY

       ======================================================== */

    securityCard: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 10,

      backgroundColor:

        common.orangeSoft,

      borderRadius: 18,

      padding: 14,

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

    /* ========================================================

       SESSION

       ======================================================== */

    sessionInfo: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 8,

      backgroundColor:

        '#F8FAFC',

      borderRadius: 14,

      padding: 12,

      marginBottom: 12,

    },

    sessionText: {

      flex: 1,

      color: common.muted,

      fontSize: 11,

      lineHeight: 17,

    },

    logoutButton: {

      minHeight: 48,

      borderRadius: 14,

      backgroundColor:

        common.red,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 8,

    },

    logoutText: {

      color: '#FFFFFF',

      fontWeight: '900',

    },

    /* ========================================================

       ROLE INFO

       ======================================================== */

    roleInfoCard: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 10,

      borderRadius: 18,

      padding: 14,

      marginBottom: 14,

    },

    roleInfoTitle: {

      fontWeight: '900',

    },

    roleInfoText: {

      color: common.muted,

      fontSize: 11,

      lineHeight: 17,

      marginTop: 3,

    },

  });