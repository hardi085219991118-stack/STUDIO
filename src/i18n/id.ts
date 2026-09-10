/**
 * Android Studio Mobile - Bahasa Indonesia Localization (i18n)
 * Standar terjemahan resmi untuk UI IDE Android Studio Mobile
 */

export const idStrings = {
  appName: 'Android Studio Mobile',
  versionTag: '2024.1.2 Hedgehog',

  // Top Menu Bar
  menu: {
    file: 'Berkas',
    edit: 'Edit',
    view: 'Tampilan',
    navigate: 'Navigasi',
    code: 'Kode',
    build: 'Build',
    run: 'Jalankan',
    tools: 'Alat',
    vcs: 'Git / VCS',
    help: 'Bantuan',

    // File subitems
    newProject: 'Proyek Baru...',
    openProject: 'Buka Proyek...',
    saveAll: 'Simpan Semua',
    settings: 'Pengaturan...',

    // Edit subitems
    undo: 'Urungkan',
    redo: 'Ulangi',
    cut: 'Potong',
    copy: 'Salin',
    paste: 'Tempel',
    findInFiles: 'Cari di Berkas...',

    // View subitems
    projectExplorer: 'Penjelajah Proyek',
    terminal: 'Terminal',
    logcat: 'Logcat',
    resourceManager: 'Pengelola Resource',
    layoutEditor: 'Editor Layout',
    manifestEditor: 'Editor Manifest',
    singleView: 'Tampilan Tunggal',
    splitVertical: 'Bagi Vertikal',
    splitHorizontal: 'Bagi Horizontal',

    // Navigate
    searchEverywhere: 'Cari di Mana Saja',

    // Code
    formatCode: 'Format Kode',
    inspectCode: 'Periksa Kode',

    // Build
    syncGradle: 'Sinkronkan Proyek dengan Berkas Gradle',
    makeProject: 'Bangun Proyek (assembleDebug)',
    buildApk: 'Build APK',
    cleanProject: 'Bersihkan Proyek',
    rebuildProject: 'Build Ulang Proyek',

    // Run
    runApp: "Jalankan 'app'",
    debugApp: "Debug 'app'",
    stopApp: "Hentikan 'app'",

    // Tools
    deviceManager: 'Pengelola Perangkat',
    sdkManager: 'Pengelola SDK',
    apkManager: 'Pengelola APK',
    manageDependencies: 'Kelola Dependensi...',

    // VCS
    gitStatus: 'Status Git / Staging',
    gitBranches: 'Branch Git',

    // Help
    about: 'Tentang Android Studio Mobile',
    shortcuts: 'Pintasan Keyboard',
  },

  // Toolbar
  toolbar: {
    newProject: 'Proyek Baru',
    openProject: 'Buka Proyek',
    saveAll: 'Simpan Semua (Ctrl+S)',
    undo: 'Urungkan (Ctrl+Z)',
    redo: 'Ulangi (Ctrl+Y)',
    searchEverywhere: 'Cari di Mana Saja (Shift dua kali)',
    targetDevice: 'Perangkat Target',
    noDevice: 'Tidak Ada Perangkat',
    noDeviceConnected: 'Tidak Ada Perangkat Terhubung',
    connectDevicePrompt: 'Hubungkan perangkat Android via USB atau Wireless ADB',
    openDeviceManager: 'Buka Pengelola Perangkat',
    run: 'Jalankan',
    debug: 'Debug',
    stop: 'Hentikan',
    build: 'Build',
    syncGradleTooltip: 'Sinkronkan Proyek dengan Berkas Gradle',
    openApkManagerTooltip: 'Buka Pengelola APK',
    openGitTooltip: 'Git / VCS',
    openTerminalTooltip: 'Terminal',
    openLogcatTooltip: 'Logcat',
    openDeviceManagerTooltip: 'Pengelola Perangkat',
    openSettingsTooltip: 'Pengaturan',
    checkingApk: 'Memeriksa APK...',
    buildingApk: 'Membangun APK...',
    installingApk: 'Memasang APK...',
    launching: 'Meluncurkan...',
    running: 'Sedang Berjalan',
  },

  // Project Explorer
  explorer: {
    title: 'Proyek',
    androidView: 'Android',
    projectView: 'Proyek',
    newFile: 'Berkas Baru...',
    newFolder: 'Folder Baru...',
    open: 'Buka',
    rename: 'Ganti Nama...',
    delete: 'Hapus',
    copy: 'Salin',
    cut: 'Potong',
    paste: 'Tempel',
    properties: 'Properti',
    createFileTitle: 'Buat Berkas Baru',
    createFolderTitle: 'Buat Folder Baru',
    renameFileTitle: 'Ganti Nama Berkas',
    deleteFileTitle: 'Hapus Berkas',
    deleteConfirm: 'Apakah Anda yakin ingin menghapus berkas ini secara permanen?',
    fileName: 'Nama Berkas',
    folderName: 'Nama Folder',
    destinationFolder: 'Folder Tujuan',
    fileType: 'Jenis Berkas',
    cancel: 'Batal',
    create: 'Buat',
    save: 'Simpan',
    refresh: 'Segarkan',
  },

  // Code Editor
  editor: {
    find: 'Cari',
    replace: 'Ganti',
    findPlaceholder: 'Cari teks...',
    replacePlaceholder: 'Ganti dengan...',
    matchCase: 'Cocokkan Huruf Besar/Kecil',
    wholeWord: 'Kata Utuh',
    replaceAll: 'Ganti Semua',
    prevMatch: 'Sebelumnya',
    nextMatch: 'Berikutnya',
    matchesCount: 'dari',
    noMatches: 'Tidak ada hasil',
    goToLine: 'Lompat ke Baris',
    linePrompt: 'Masukkan nomor baris',
    jump: 'Lompat',
    closeTab: 'Tutup',
    closeOthers: 'Tutup Lainnya',
    closeAll: 'Tutup Semua',
    pinTab: 'Sematkan Tab',
    unpinTab: 'Lepas Sematan',
    unsavedTitle: 'Perubahan Belum Disimpan',
    unsavedMessage: 'Apakah Anda ingin menyimpan perubahan sebelum menutup berkas?',
    dontSave: 'Jangan Simpan',
    noFileOpen: 'Tidak ada berkas yang dibuka',
    noFileOpenDesc: 'Pilih berkas dari Penjelajah Proyek atau tekan Shift dua kali untuk mencari.',
  },

  // Touch Keyboard
  touch: {
    showKeyboard: 'Tampilkan Keyboard Pemrogram Mobile',
    hideKeyboard: 'Sembunyikan Keyboard',
    symbols: 'Simbol',
    code: 'Kode',
    actions: 'Aksi',
    undo: 'Urungkan',
    redo: 'Ulangi',
    save: 'Simpan',
    find: 'Cari',
    selectAll: 'Semua',
    copy: 'Salin',
    cut: 'Potong',
    paste: 'Tempel',
  },

  // Bottom Tool Windows
  dock: {
    gradleBuild: 'Build Gradle',
    apkManager: 'Pengelola APK',
    logcat: 'Logcat',
    terminal: 'Terminal',
    runningDevice: 'Perangkat Aktif',
    minimize: 'Kecilkan jendela alat',
    expand: 'Perluas jendela alat',
  },

  // Build Panel
  build: {
    consoleTab: 'Konsol Build',
    environmentTab: 'Pemeriksaan Lingkungan',
    tasksTab: 'Task Gradle',
    ready: 'SIAP',
    building: 'SEDANG MELAKUKAN BUILD...',
    successful: 'BUILD BERHASIL',
    failed: 'BUILD GAGAL',
    limitedByEnv: 'DIBATASI OLEH LINGKUNGAN',
    rebuild: 'Build Ulang',
    downloadApk: 'Unduh APK',
    shareApk: 'Bagikan',
    checkEnv: 'Periksa Lingkungan',
    cleanBuild: 'Bersihkan & Build',
  },

  // APK Manager
  apk: {
    title: 'Pengelola APK & Tanda Tangan',
    refresh: 'Segarkan',
    buildDebug: 'Build APK Debug',
    buildRelease: 'Build APK Release',
    installToDevice: 'Pasang ke Perangkat',
    download: 'Unduh',
    share: 'Bagikan',
    noApks: 'Tidak Ada Artefak APK Ditemukan',
    noApksDesc: 'Jalankan "Build APK" atau task "assembleDebug" untuk menghasilkan berkas .apk nyata.',
    packageName: 'Nama Paket',
    version: 'Versi',
    size: 'Ukuran Berkas',
    variant: 'Varian Build',
    integrity: 'Integritas & Verifikasi Tanda Tangan',
    zipMagic: 'Header Magic ZIP Valid',
    signature: 'Tanda Tangan Kriptografi',
    status: 'Status',
  },

  // Device Simulator
  simulator: {
    simulatedPreview: 'PERANGKAT DISIMULASIKAN (PRATINJAU INTERAKTIF)',
    previewSubtitle: 'Lingkungan Pengujian Event UI Cepat',
    noDeviceConnected: 'TIDAK ADA PERANGKAT TERHUBUNG',
    noDeviceDesc: 'Menjalankan dan menguji aplikasi memerlukan perangkat Android fisik atau virtual yang terhubung melalui ADB.',
    openDeviceManager: 'Buka Pengelola Perangkat',
    appNotRunning: 'APLIKASI TIDAK BERJALAN',
    appNotRunningDesc: 'Klik "Jalankan" di toolbar untuk melakukan build, memasang, dan menjalankan aplikasi.',
    launchApp: 'Jalankan Aplikasi',
    rotate: 'Putar Perangkat',
    restart: 'Mulai Ulang Aplikasi',
    stop: 'Hentikan Eksekusi Aplikasi',
    home: 'Beranda',
    back: 'Kembali',
    overview: 'Ikhtisar',
  },

  // Device Manager & ADB Modal
  deviceManager: {
    title: 'Pengelola Perangkat & ADB',
    connectedTab: 'Perangkat Terhubung',
    wirelessTab: 'Pairing Nirkabel (Wi-Fi)',
    adbTerminalTab: 'Terminal ADB',
    diagnosticsTab: 'Diagnostik Lingkungan',
    noDevices: 'Tidak Ada Perangkat Fisik atau Virtual Terhubung',
    noDevicesHint: 'Hubungkan perangkat Android dengan mode USB Debugging aktif.',
    ipLabel: 'Alamat IP Perangkat',
    portLabel: 'Port ADB (default 5555)',
    pairingCodeLabel: 'Kode Pairing 6-Digit (Android 11+)',
    connectBtn: 'Hubungkan',
    pairAndConnectBtn: 'Pairing & Hubungkan',
    refreshBtn: 'Segarkan',
    closeBtn: 'Tutup',
    adbStatus: 'Status ADB',
  },

  // SDK Manager Modal
  sdkManager: {
    title: 'Pengelola SDK Android',
    platformsTab: 'Platform SDK',
    toolsTab: 'Alat & Kompiler SDK',
    locationTab: 'Lokasi SDK & Lingkungan',
    refresh: 'Segarkan Status SDK',
    installed: 'Terpasang',
    notInstalled: 'Belum Terpasang',
    install: 'Pasang',
    installing: 'Memasang...',
    statusAvailable: 'TERSEDIA',
    statusLimited: 'DIBATASI OLEH LINGKUNGAN',
    statusProbing: 'MEMERIKSA...',
    close: 'Tutup',
  },

  // Dependencies Modal
  dependencies: {
    title: 'Dependensi & Pustaka Proyek',
    catalogTab: 'Katalog Pustaka',
    activeTab: 'Dependensi Aktif',
    tomlTab: 'Katalog Versi (libs.versions.toml)',
    searchPlaceholder: 'Cari pustaka (misal: retrofit, room, compose)...',
    addCustom: 'Tambah Koordinat Kustom',
    addBtn: 'Tambah',
    addedBtn: 'Ditambahkan',
    syncNow: 'Sinkronkan Sekarang',
    saveToml: 'Simpan Katalog Versi',
    close: 'Tutup',
  },

  // Manifest Editor
  manifest: {
    title: 'Editor AndroidManifest.xml',
    formTab: 'Formulir Visual',
    xmlTab: 'XML Mentah',
    appConfig: 'Konfigurasi Aplikasi',
    permissions: 'Izin Aplikasi (uses-permission)',
    activities: 'Activity yang Dideklarasikan',
    services: 'Service, Receiver & Provider',
    addPermission: 'Tambah Izin',
    addActivity: 'Tambah Activity',
    saveChanges: 'Simpan Perubahan',
    close: 'Tutup',
  },

  // Resource Manager
  resources: {
    title: 'Pengelola Resource Android (res/)',
    valuesCat: 'Nilai (Warna, String, Dimensi)',
    layoutsCat: 'Layout XML',
    drawablesCat: 'Drawable & Gambar',
    mipmapsCat: 'Mipmap (Ikon)',
    menusCat: 'Menu Navigasi',
    rawCat: 'Berkas Mentah (Raw)',
    colorsTab: 'Warna (@color/)',
    stringsTab: 'String (@string/)',
    dimensTab: 'Dimensi (@dimen/)',
    themesTab: 'Tema & Gaya',
    addColor: 'Tambah Warna',
    addString: 'Tambah String',
    addDimen: 'Tambah Dimensi',
    openInLayoutEditor: 'Buka di Editor Layout',
    copyRef: 'Salin Referensi',
    copied: 'Tersalin!',
    close: 'Tutup',
  },

  // Layout Editor
  layout: {
    title: 'Editor Layout Android',
    designTab: 'Desain',
    splitTab: 'Bagi',
    codeTab: 'Kode',
    palette: 'Palet Komponen',
    componentTree: 'Pohon Komponen',
    attributes: 'Atribut Komponen',
    common: 'Umum',
    text: 'Teks',
    buttons: 'Tombol',
    widgets: 'Widget',
    layouts: 'Layout',
    containers: 'Kontainer',
    interactivePreview: 'Pratinjau Layout Interaktif',
    zoomIn: 'Perbesar',
    zoomOut: 'Perkecil',
    resetZoom: 'Reset Zoom',
    portrait: 'Potret',
    landscape: 'Lansekap',
    saveLayout: 'Simpan Layout',
    newLayout: 'Layout Baru',
    addAttribute: 'Tambah Atribut',
    close: 'Tutup',
  },

  // New Project Wizard
  newProject: {
    title: 'Wisaya Proyek Baru',
    chooseTemplate: 'Pilih Template Proyek',
    templateDesc: 'Pilih template untuk membuat struktur proyek lengkap dengan Activity, layout, dan konfigurasi Gradle.',
    configureProject: 'Konfigurasi Proyek Anda',
    appName: 'Nama Aplikasi',
    packageName: 'Nama Paket',
    language: 'Bahasa Pemrograman',
    minSdk: 'SDK Minimum',
    buildSystem: 'Bahasa Konfigurasi Build',
    next: 'Lanjut',
    back: 'Kembali',
    finish: 'Selesai',
    cancel: 'Batal',
  },

  // Settings Modal
  settings: {
    title: 'Pengaturan IDE',
    editorCategory: 'Editor Kode',
    appearanceCategory: 'Tampilan & Tema',
    buildCategory: 'Build, Eksekusi, SDK',
    touchCategory: 'Keyboard Sentuh',
    fontSize: 'Ukuran Font Editor (px)',
    tabSize: 'Ukuran Tab (Spasi)',
    wordWrap: 'Bungkus Baris (Word Wrap)',
    lineNumbers: 'Tampilkan Nomor Baris',
    highlightActiveLine: 'Sorot Baris Aktif',
    autoSave: 'Simpan Otomatis Berkas',
    defaultVariant: 'Varian Build Default',
    programmerStrip: 'Tampilkan Baris Pintasan Pemrogram Sentuh',
    saveSettings: 'Simpan Pengaturan',
    cancel: 'Batal',
  },

  // Search Everywhere Modal
  searchEverywhere: {
    placeholder: 'Cari berkas, kelas, simbol, atau aksi (Shift dua kali)...',
    all: 'Semua',
    files: 'Berkas',
    symbols: 'Simbol',
    noResults: 'Tidak ditemukan berkas atau simbol yang cocok.',
  },

  // Terminal
  terminal: {
    title: 'Sesi Terminal',
    clear: 'Bersihkan',
    copy: 'Salin Output',
    quickTasks: 'Perintah Cepat:',
    placeholder: 'Ketik perintah...',
    run: 'Jalankan',
  },

  // Logcat
  logcat: {
    filterPlaceholder: 'Filter berdasarkan pesan, tag, PID...',
    packagePlaceholder: 'Paket / Proses...',
    pause: 'Jeda',
    resume: 'Lanjutkan',
    clear: 'Bersihkan Logcat',
    export: 'Ekspor Log',
    fetchLogs: 'Ambil Log Perangkat',
    noDeviceMsg: 'Tidak ada perangkat terhubung untuk streaming logcat native.',
    emptyLogs: 'Belum ada log tercatat.',
  },
};
