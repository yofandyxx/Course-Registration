# PPNP Course Registration

Aplikasi mobile **Sistem Informasi Pendaftaran Kursus** untuk mengelola program kursus, kelas, pendaftaran peserta, instruktur, pengguna, profil, dan laporan.

Aplikasi dibangun menggunakan Expo React Native dan memiliki akses berbeda berdasarkan role pengguna:

- **Participant**: melihat program dan kelas, melakukan pendaftaran, melihat kartu peserta, serta mengelola profil.
- **Admin**: mengelola program, kelas dan jadwal, instruktur, pengguna, pendaftaran, serta laporan.

## Teknologi

- React Native `0.88.1`
- Expo SDK `58`
- TypeScript
- React Navigation
- Firebase Authentication
- Cloud Firestore
- Cloudinary untuk upload foto profil
- `xlsx` untuk kebutuhan ekspor laporan
- Expo Print dan Expo Sharing untuk dokumen/laporan

## Persyaratan

Pastikan perangkat telah memiliki:

- Node.js dan npm
- Expo CLI melalui dependensi proyek
- Android Studio atau perangkat Android untuk pengujian Android
- Xcode untuk pengujian iOS di macOS

## Instalasi

1. Masuk ke folder proyek:

   ```bash
   cd PPNPCourseRegistration
   ```

2. Instal dependensi:

   ```bash
   npm install
   ```

3. Pastikan konfigurasi Firebase dan Cloudinary pada folder `src/config/` sesuai dengan project yang digunakan.

4. Jalankan development server:

   ```bash
   npm start
   ```

## Menjalankan Aplikasi

```bash
npm run android  # Android
npm run ios      # iOS
npm run web      # Web
```

Perintah `npm start` akan membuka Expo Developer Tools. Aplikasi juga dapat dijalankan dengan Expo Go atau development build yang sesuai dengan kebutuhan modul native.

## Konfigurasi Layanan

### Firebase

Konfigurasi Firebase berada di:

```text
src/config/firebase.ts
```

Firebase digunakan untuk:

- autentikasi email dan password;
- menyimpan profil pengguna;
- menyimpan data program, kelas, instruktur, pendaftaran, dan laporan melalui Firestore.

Aturan akses Firestore dapat dilihat pada:

```text
profiles/firebase.rule
```

### Cloudinary

Konfigurasi Cloudinary berada di:

```text
src/config/cloudinary.ts
```

Cloudinary digunakan untuk menyimpan foto profil peserta. Jangan menyimpan **API Secret** Cloudinary di aplikasi mobile. Gunakan unsigned upload preset dengan pembatasan folder dan tipe file yang sesuai.

## Struktur Folder

```text
PPNPCourseRegistration/
├── assets/                 # Ikon dan aset aplikasi
├── profiles/               # Aturan Firebase/Firestore
├── src/
│   ├── components/         # Komponen UI yang dapat digunakan ulang
│   ├── config/             # Konfigurasi Firebase dan Cloudinary
│   ├── contexts/           # React Context, termasuk autentikasi
│   ├── data/               # Data demo atau data awal
│   ├── navigation/         # Konfigurasi navigasi aplikasi
│   ├── screens/            # Halaman participant dan admin
│   ├── services/           # Akses Firestore, profil, dan Cloudinary
│   ├── types/              # Definisi tipe TypeScript
│   └── utils/              # Utilitas dan tema aplikasi
├── App.tsx                 # Root component aplikasi
├── app.json                # Konfigurasi Expo
├── index.ts                # Entry point
└── package.json            # Dependensi dan script proyek
```

## Alur Autentikasi

1. Pengguna membuka halaman Login atau Register.
2. Firebase Authentication memvalidasi atau membuat akun.
3. Profil pengguna disimpan dan dibaca dari Firestore.
4. `AppNavigator` memilih navigasi berdasarkan role `admin` atau `participant`.
5. Akun dengan status `INACTIVE` ditolak saat login.

## Pemeriksaan Kode

Untuk memeriksa tipe TypeScript:

```bash
npx tsc --noEmit
```

Untuk mendiagnosis konfigurasi Expo:

```bash
npx expo-doctor
```

## Catatan Keamanan

- Jangan memasukkan Firebase Admin SDK credential atau Cloudinary API Secret ke source code aplikasi.
- Tinjau Firebase Security Rules sebelum aplikasi digunakan di production.
- Batasi hak akses berdasarkan role dan UID pengguna.
- Jangan menggunakan akun demo untuk data production.

## Lisensi

Proyek ini menggunakan lisensi yang tercantum pada file [LICENSE](./LICENSE).
