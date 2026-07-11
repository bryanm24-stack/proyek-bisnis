'use client';

import React, { useEffect, useState } from 'react';
import { ALL_VENDOR_CATEGORY_TREE, SERVICE_CATEGORY_TREE, normalizeCategoryTree } from './category-tree';

const buildField = (key, label, placeholder, required = false) => ({ key, label, placeholder, required });

// DAFTAR BARANG - Kategori yang memerlukan tabel per unit/pcs
const BARANG_CATEGORIES_LIST = [
  // Elektronik & IT
  'Laptop', 'PC Desktop', 'Tablet', 'Monitor', 'TV LED', 'Router', 'Printer', 'Scanner', 'NAS', 'Harddisk',
  // Audio Visual & Stage
  'Speaker', 'Line Array', 'Active Speaker', 'Subwoofer', 'Mixer', 'Mikrofon', 'Lampu', 'Beam', 'Par LED', 'Mesin Smoke', 'Confetti', 'Panggung Modular', 'Barikade',
  // Fotografi & Videografi
  'Body Kamera', 'Lensa', 'Gimbal', 'Stabilizer', 'Drone', 'Flash Studio', 'C-Stand', 'Background',
  // Transportasi & Otomotif
  'Mobil', 'MPV', 'Luxury', 'SUV', 'Motor', 'Bus', 'Truk', 'Forklift', 'Pallet Jack',
  // Konstruksi & Teknik
  'Scaffolding', 'Genset', 'Bor Beton', 'Mesin Las', 'Tangga Teleskopik', 'APAR',
  // Peralatan Pesta & Dekorasi
  'Tenda', 'Sarnafil', 'Roder', 'Kursi', 'Futura', 'Tiffany', 'Meja', 'IBM', 'Round', 'AC Standing', 'Misty Fan', 'Chafing Dish', 'Dispenser', 'Standing Mirror',
  // Olahraga, Outdoor & Medis
  'Ring Basket', 'Meja Pingpong', 'PS5', 'Console', 'Tenda Camping', 'Kursi Roda', 'Tabung Oksigen', 'Bed Pasien',
  // Keywords dari kategori
  'Elektronik & IT', 'Audio Visual & Stage', 'Fotografi & Videografi', 'Transportasi & Otomotif', 'Konstruksi & Teknik', 'Peralatan Pesta & Dekorasi', 'Olahraga, Outdoor & Medis'
];

const isBarangCategory = (mainCategory) => {
  if (!mainCategory) return false;
  const categoryLower = mainCategory.toLowerCase();
  return BARANG_CATEGORIES_LIST.some(barang => categoryLower.includes(barang.toLowerCase()));
};

const BARANG_SPEC_GROUPS = {
  elektronikItVisual: [
    buildField('processorRam', 'Prosesor & RAM', 'Contoh: M3 Max, 64GB', true),
    buildField('storageCapacity', 'Kapasitas Penyimpanan', 'Contoh: 1TB SSD', true),
    buildField('screenResolution', 'Ukuran Layar & Resolusi', 'Contoh: 14 Inch, 4K/UHD', true),
    buildField('operatingSystem', 'Sistem Operasi', 'Contoh: Windows, macOS, Android, iOS', true),
    buildField('ioPorts', 'Input/Output Ports', 'Contoh: HDMI, USB-C, SDI, VGA'),
    buildField('powerWatt', 'Daya Listrik (Watt)', 'Contoh: 65W / 1200W', true),
    buildField('brightnessLumens', 'Brightness (Lumens)', 'Khusus proyektor/visual display')
  ],
  audioVisualStage: [
    buildField('outputPower', 'Output Power (Watt/RMS)', 'Contoh: 1000W', true),
    buildField('channelCount', 'Jumlah Channel', 'Khusus mixer audio'),
    buildField('panelDimension', 'Dimensi Panel (P x L x T)', 'Contoh: 2m x 1m x 0.5m'),
    buildField('lightColor', 'Warna Cahaya', 'Contoh: RGBW, Warm White, Cool White'),
    buildField('liquidConsumption', 'Konsumsi Cairan (ml/min)', 'Khusus smoke/bubble machine'),
    buildField('maxHeight', 'Tinggi Maksimum', 'Khusus rigging/stand'),
    buildField('connectivity', 'Konektivitas', 'Contoh: XLR, Wireless, Bluetooth, DMX', true)
  ],
  fotoVideoDrone: [
    buildField('sensorResolution', 'Resolusi Sensor', 'Contoh: 33MP, 4K 120fps', true),
    buildField('lensMount', 'Mount Lensa', 'Contoh: Sony E-Mount, Canon RF'),
    buildField('apertureFocal', 'Aperture & Focal Length', 'Contoh: 50mm f/1.2', true),
    buildField('maxPayload', 'Payload Maksimal', 'Berat beban maksimal untuk gimbal/tripod'),
    buildField('flightTime', 'Waktu Terbang (Menit)', 'Khusus drone'),
    buildField('batteryCapacity', 'Kapasitas Baterai', 'Contoh: 5000 mAh')
  ],
  kendaraanLogistik: [
    buildField('vehicleYear', 'Tahun Kendaraan', 'Contoh: 2024', true),
    buildField('fuelType', 'Jenis Bahan Bakar', 'Contoh: Bensin, Diesel, Listrik', true),
    buildField('passengerCapacity', 'Kapasitas Penumpang', 'Contoh: 6 orang'),
    buildField('loadCapacity', 'Kapasitas Muatan (Ton/Kg)', 'Khusus truk/forklift'),
    buildField('transmissionType', 'Transmisi', 'Contoh: Manual, Matik', true),
    buildField('turnReachRadius', 'Radius Putar / Reach', 'Khusus excavator/crane')
  ],
  pestaFurnitureCooling: [
    buildField('materialType', 'Bahan Material', 'Contoh: Aluminium, Kayu, Plastik, Besi', true),
    buildField('coverageArea', 'Luas Cakupan (m2)', 'Contoh: Tenda 10x10m, AC untuk 50m2', true),
    buildField('productColor', 'Warna Produk', 'Contoh: Putih, Gold, Hitam'),
    buildField('coolingCapacity', 'Kapasitas Pendinginan', 'Contoh: 2 PK / 18000 BTU'),
    buildField('stackable', 'Stackable (Bisa Ditumpuk)', 'Ya/Tidak')
  ],
  olahragaOutdoorHobby: [
    buildField('proLevel', 'Tingkat Kesulitan/Pro', 'Contoh: Beginner, Intermediate, Professional'),
    buildField('peopleCapacity', 'Kapasitas Orang', 'Khusus tenda camping'),
    buildField('versionRegion', 'Versi/Region', 'Khusus PS5/Nintendo Switch'),
    buildField('loadWeightKg', 'Berat Beban (Kg)', 'Khusus dumbbell/gym'),
    buildField('productSize', 'Ukuran/Size', 'Contoh: sepatu, rompi, helm')
  ],
  konstruksiTeknik: [
    buildField('outputVoltage', 'Output Voltage', 'Contoh: Single Phase / 3 Phase', true),
    buildField('fuelTankCapacity', 'Kapasitas Bahan Bakar (Liter)', 'Khusus genset'),
    buildField('maxWorkingHeight', 'Tinggi Maksimal Kerja', 'Contoh: 10 meter'),
    buildField('rpm', 'Kecepatan Putar (RPM)', 'Khusus bor/gerinda'),
    buildField('safetyStandard', 'Standar Keamanan', 'Contoh: SNI, ISO, K3', true)
  ],
  medisLab: [
    buildField('accuracyPrecision', 'Akurasi/Presisi', 'Contoh: 0.01 gram', true),
    buildField('flowRate', 'Laju Aliran (Flow Rate)', 'Khusus oksigen/nebulizer'),
    buildField('magnification', 'Pembesaran (Magnification)', 'Khusus mikroskop'),
    buildField('sterilityInfo', 'Informasi Sterilisasi', 'Contoh: Steril, disinfeksi rutin')
  ],
  default: [
    buildField('brandProvider', 'Merek/Provider', 'Contoh: Sony, Canon, ASUS', true),
    buildField('modelVariant', 'Model/Varian', 'Contoh: A7IV, ROG Strix'),
    buildField('condition', 'Kondisi', 'Contoh: Mulus 95%, siap pakai', true),
    buildField('notes', 'Catatan Tambahan', 'Keterangan penting untuk penyewa')
  ]
};

const JASA_SPEC_GROUPS = {
  kreatifDokumentasi: [
    buildField('workDuration', 'Masa Pengerjaan', 'Contoh: 7 hari, 14 hari', true),
    buildField('crewCount', 'Jumlah Kru', 'Input angka', true),
    buildField('outputQuality', 'Kualitas Output', 'Contoh: 4K, Full HD, Raw Files', true),
    buildField('mainEquipment', 'Peralatan Utama', 'Contoh: Sony A7IV, DJI Mavic 3'),
    buildField('attendanceDuration', 'Durasi Kehadiran', 'Contoh: 8 jam / shift', true),
    buildField('portfolioLink', 'Link Portofolio', 'URL portofolio kerja'),
    buildField('includesEditing', 'Termasuk Editing', 'Ya/Tidak', true)
  ],
  hiburanTalent: [
    buildField('performanceDuration', 'Durasi Performa', 'Contoh: 2 x 45 menit, full day', true),
    buildField('talentGender', 'Gender Talent', 'Pria, Wanita, Grup'),
    buildField('spokenLanguages', 'Bahasa yang Dikuasai', 'Contoh: Indonesia, Inggris, Mandarin'),
    buildField('costumeType', 'Pakaian/Kostum', 'Contoh: Formal, Kasual, Tematik'),
    buildField('minHeight', 'Minimal Tinggi Badan', 'Khusus SPG/Usher'),
    buildField('certAchievements', 'Sertifikasi/Prestasi', 'Input teks'),
    buildField('includesEquipment', 'Termasuk Alat/Sound', 'Ya/Tidak', true)
  ],
  teknisProduksi: [
    buildField('skillCertification', 'Sertifikasi Keahlian', 'Contoh: K3 Listrik, BNSP', true),
    buildField('workExperience', 'Pengalaman Kerja', 'Contoh: 5 tahun / 120 proyek', true),
    buildField('maxCapacityHandled', 'Kapasitas Maksimal', 'Contoh: Handle sound 10.000 watt'),
    buildField('workShift', 'Shift Kerja', 'Contoh: Pagi, Malam, 24 Jam', true),
    buildField('measurementTools', 'Alat Ukur yang Dibawa', 'Ya/Tidak')
  ],
  logistikTransportasi: [
    buildField('driverLicense', 'Jenis SIM', 'Contoh: SIM A, B1, B2 Umum', true),
    buildField('routeCoverage', 'Hafal Rute', 'Contoh: Dalam kota, luar kota', true),
    buildField('languageSkill', 'Kemampuan Bahasa', 'Contoh: Basic English/Indonesia'),
    buildField('vehicleExperience', 'Pengalaman Kendaraan', 'Contoh: Manual, Matik, Bus Besar'),
    buildField('activeSkck', 'SKCK Aktif', 'Ya/Tidak', true)
  ],
  kecantikanLifestyle: [
    buildField('productBrandUsed', 'Merk Produk Digunakan', 'Contoh: MAC, Chanel', true),
    buildField('workTimePerPerson', 'Waktu Pengerjaan per Orang', 'Contoh: 45 menit / 1 jam', true),
    buildField('styleModel', 'Model/Gaya', 'Contoh: Korea, Bold, Tradisional'),
    buildField('homeService', 'Home Service', 'Bisa datang ke rumah / Tidak', true),
    buildField('includesHairdo', 'Termasuk Hair Do', 'Ya/Tidak')
  ],
  profesionalBisnis: [
    buildField('technologyStack', 'Teknologi/Stack', 'Contoh: Laravel, React, PHP'),
    buildField('practiceLicense', 'Lisensi Praktek', 'No. izin/lisensi jika ada'),
    buildField('consultationMode', 'Model Konsultasi', 'Online/Offline', true),
    buildField('documentOutput', 'Output Dokumen', 'Digital PDF, Fisik Berstempel', true)
  ],
  kebersihanKeamananMaintenance: [
    buildField('coverageScope', 'Cakupan Luas Area', 'Per m2 atau per unit', true),
    buildField('chemicalMaterial', 'Bahan Kimia/Cairan', 'Food grade, organik, standar RS'),
    buildField('workWarranty', 'Garansi Pekerjaan', 'Contoh: 7 hari, 30 hari', true),
    buildField('personnelCount', 'Jumlah Personel', 'Input angka', true),
    buildField('bodyCriteria', 'Tinggi & Berat Badan', 'Khusus bodyguard/security')
  ],
  default: [
    buildField('serviceScope', 'Ruang Lingkup Jasa', 'Jelaskan cakupan layanan', true),
    buildField('deliverable', 'Output Utama', 'Contoh: laporan, file, hasil kerja', true),
    buildField('slaTimeline', 'SLA/Timeline', 'Contoh: 2 hari kerja'),
    buildField('specialNotes', 'Catatan Tambahan', 'Keterangan penting untuk klien')
  ]
};

const DESCRIPTION_TABLE_BY_TYPE = {
  barang: [
    buildField('descCondition', 'Kondisi Barang', 'Baru, mulus, bekas terawat, dll', true),
    buildField('descCompleteness', 'Kelengkapan Dalam Paket', 'Unit utama, kabel, adaptor, tas, dll', true),
    buildField('descUsageRules', 'Aturan Pemakaian', 'Hal yang boleh/tidak boleh dilakukan', true),
    buildField('descDamagePolicy', 'Catatan Kerusakan & Tanggung Jawab', 'Biaya ganti rugi, denda, dll')
  ],
  jasa: [
    buildField('descServiceSummary', 'Ringkasan Layanan', 'Deskripsikan jasa secara singkat', true),
    buildField('descWorkflow', 'Alur Pengerjaan', 'Tahapan pekerjaan dari awal sampai selesai', true),
    buildField('descDeliverable', 'Deliverable', 'Output yang diterima klien', true),
    buildField('descRevision', 'Revisi & Ketentuan', 'Jumlah revisi dan syarat', true),
    buildField('descOperationalArea', 'Area & Jadwal Operasional', 'Kota layanan dan jam kerja')
  ]
};

const CHECKLIST_BY_TYPE = {
  barang: ['Foto produk jelas', 'Spesifikasi teknis lengkap', 'Aturan sewa sudah jelas', 'Harga dan durasi sudah valid'],
  jasa: ['Portofolio/riwayat kerja tersedia', 'Ruang lingkup layanan jelas', 'Timeline layanan jelas', 'Syarat kerja sama sudah dicantumkan']
};

const TITLE_PLACEHOLDER_BY_PATH = {
  'elektronik & it': 'Contoh: Laptop Gaming Asus ROG RTX 4080',
  'fotografi & videografi': 'Contoh: Kamera Sony A7IV Body + 2 Baterai',
  'audio visual & stage': 'Contoh: Paket Sound System Line Array RCF',
  'transportasi & otomotif': 'Contoh: Toyota Innova Zenix Harian',
  'entertainment & talent': 'Contoh: Jasa MC Wedding + Rundown',
  'jasa kreatif & media': 'Contoh: Fotografer Wedding Full Day',
  'jasa digital & pemasaran': 'Contoh: Social Media Manager Bulanan'
};

const includesAny = (value, keywords) => keywords.some((keyword) => value.includes(keyword));

const resolveBarangSpecGroup = (path) => {
  if (includesAny(path, ['elektronik', 'laptop', 'desktop', 'tablet', 'visual', 'networking', 'kasir', 'printing', 'storage'])) return BARANG_SPEC_GROUPS.elektronikItVisual;
  if (includesAny(path, ['audio visual', 'speaker', 'mixer', 'mic', 'lighting', 'effect', 'staging'])) return BARANG_SPEC_GROUPS.audioVisualStage;
  if (includesAny(path, ['fotografi', 'videografi', 'kamera', 'lensa', 'gimbal', 'drone'])) return BARANG_SPEC_GROUPS.fotoVideoDrone;
  if (includesAny(path, ['transportasi', 'otomotif', 'mpv', 'luxury', 'suv', 'bus', 'niaga', 'motor', 'forklift', 'excavator', 'alat berat'])) return BARANG_SPEC_GROUPS.kendaraanLogistik;
  if (includesAny(path, ['pesta', 'dekorasi', 'tenda', 'kursi', 'meja', 'cooling', 'ac standing'])) return BARANG_SPEC_GROUPS.pestaFurnitureCooling;
  if (includesAny(path, ['olahraga', 'outdoor', 'basket', 'camping', 'gym', 'gaming'])) return BARANG_SPEC_GROUPS.olahragaOutdoorHobby;
  if (includesAny(path, ['konstruksi', 'industri', 'scaffolding', 'genset', 'tools', 'tangga', 'power'])) return BARANG_SPEC_GROUPS.konstruksiTeknik;
  if (includesAny(path, ['medis', 'kesehatan', 'oksigen', 'kursi roda', 'monitoring', 'timbangan', 'mikroskop'])) return BARANG_SPEC_GROUPS.medisLab;
  return BARANG_SPEC_GROUPS.default;
};

const resolveJasaSpecGroup = (path) => {
  if (includesAny(path, ['fotografi', 'videografi', 'video cinematic', 'editor', 'drone pilot', 'content writer', 'media'])) return JASA_SPEC_GROUPS.kreatifDokumentasi;
  if (includesAny(path, ['entertainment', 'musik', 'mc', 'dj', 'magician', 'dancer', 'usher', 'talent'])) return JASA_SPEC_GROUPS.hiburanTalent;
  if (includesAny(path, ['sound engineer', 'lighting', 'visual', 'operator led', 'operator switcher', 'rigging', 'teknisi listrik'])) return JASA_SPEC_GROUPS.teknisProduksi;
  if (includesAny(path, ['driver', 'supir', 'runner', 'loader', 'kurir', 'valet', 'logistik', 'transportasi'])) return JASA_SPEC_GROUPS.logistikTransportasi;
  if (includesAny(path, ['make up', 'mua', 'hair', 'nail', 'barber', 'fashion stylist', 'lifestyle'])) return JASA_SPEC_GROUPS.kecantikanLifestyle;
  if (includesAny(path, ['web developer', 'app developer', 'notaris', 'akuntan', 'auditor', 'konsultan', 'translator', 'interpreter', 'it support'])) return JASA_SPEC_GROUPS.profesionalBisnis;
  if (includesAny(path, ['bodyguard', 'security', 'cleaning', 'teknisi ac', 'pest control', 'fogging', 'maintenance'])) return JASA_SPEC_GROUPS.kebersihanKeamananMaintenance;
  return JASA_SPEC_GROUPS.default;
};

const getCategoryPath = (mainCategory, subCategory, superSubCategory) =>
  `${mainCategory || ''} ${subCategory || ''} ${superSubCategory || ''}`.toLowerCase();

export default function VendorProductForm({
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  errorMsg,
  successMsg,
  categories = null,
  isEditing = false
}) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCustomCategoryModalOpen, setIsCustomCategoryModalOpen] = useState(false);
  const [customCategoryMode, setCustomCategoryMode] = useState('main');
  const [categorySearch, setCategorySearch] = useState('');
  const [draftMainCategory, setDraftMainCategory] = useState(formData.mainCategory || '');
  const [draftSubCategory, setDraftSubCategory] = useState(formData.subCategory || '');
  const [draftSuperSubCategory, setDraftSuperSubCategory] = useState(formData.superSubCategory || '');
  const [customCategoryTree, setCustomCategoryTree] = useState({});
  const [persistedCategoryTree, setPersistedCategoryTree] = useState({});
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [editingVariasiId, setEditingVariasiId] = useState(null);
  const [variationName, setVariationName] = useState('');
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [specOptionDrafts, setSpecOptionDrafts] = useState({});
  const [deletedSpecFields, setDeletedSpecFields] = useState(new Set());

  // Gunakan categories dari props atau default tree global vendor
  const CATEGORIES = categories || ALL_VENDOR_CATEGORY_TREE;
  const mergeCategoryNodes = (existingNode, newNode) => {
    if (Array.isArray(existingNode) && Array.isArray(newNode)) {
      return Array.from(new Set([...existingNode, ...newNode]));
    }

    if (!Array.isArray(existingNode) && !Array.isArray(newNode)) {
      const merged = { ...existingNode };
      Object.entries(newNode).forEach(([key, value]) => {
        if (key in merged) {
          merged[key] = mergeCategoryNodes(merged[key], value);
        } else {
          merged[key] = value;
        }
      });
      return merged;
    }

    if (Array.isArray(existingNode) && !Array.isArray(newNode)) {
      return newNode;
    }

    return existingNode;
  };
  const combinedCategorySource = { ...CATEGORIES };

  Object.entries(persistedCategoryTree).forEach(([mainCategory, persistedSubNode]) => {
    if (!combinedCategorySource[mainCategory]) {
      combinedCategorySource[mainCategory] = persistedSubNode;
      return;
    }

    const existingNode = combinedCategorySource[mainCategory];
    combinedCategorySource[mainCategory] = mergeCategoryNodes(existingNode, persistedSubNode);
  });

  Object.entries(customCategoryTree).forEach(([mainCategory, customSubNode]) => {
    if (!combinedCategorySource[mainCategory]) {
      combinedCategorySource[mainCategory] = customSubNode;
      return;
    }

    const existingNode = combinedCategorySource[mainCategory];
    combinedCategorySource[mainCategory] = mergeCategoryNodes(existingNode, customSubNode);
  });

  const normalizedCategoryTree = normalizeCategoryTree(combinedCategorySource);

  const isCustomCategoryModeMain = customCategoryMode === 'main';
  const isCustomCategoryModeSub = customCategoryMode === 'sub';
  const isCustomCategoryModeSuper = customCategoryMode === 'super';
  const customCategoryModalTitle = isCustomCategoryModeMain
    ? 'Tambah Kategori Khusus'
    : isCustomCategoryModeSub
      ? 'Tambah Sub Kategori Khusus'
      : 'Tambah Super-sub Kategori Khusus';
  const canSaveCustomCategory = isCustomCategoryModeMain
    ? Boolean(draftMainCategory.trim())
    : isCustomCategoryModeSub
      ? Boolean(draftMainCategory.trim() && draftSubCategory.trim())
      : Boolean(draftMainCategory.trim() && draftSubCategory.trim() && draftSuperSubCategory.trim());

  // Determine if this is a Jasa (service) form based on passed categories or mainCategory
  const isJasaFormType = categories === SERVICE_CATEGORY_TREE;

  useEffect(() => {
    let active = true;

    const fetchPersistedCategories = async () => {
      try {
        const response = await fetch('/api/categories', { cache: 'no-store' });
        if (!response.ok) return;
        const json = await response.json();
        if (!active) return;
        if (json?.success && json?.data && typeof json.data === 'object') {
          setPersistedCategoryTree(json.data);
        }
      } catch {
        // Keep static/local categories when SQL categories API is unavailable.
      }
    };

    fetchPersistedCategories();
    return () => {
      active = false;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openCategoryPicker = () => {
    setDraftMainCategory(formData.mainCategory || '');
    setDraftSubCategory(formData.subCategory || '');
    setDraftSuperSubCategory(formData.superSubCategory || '');
    setCategorySearch('');
    setIsCategoryModalOpen(true);
  };

  const closeCategoryPicker = () => {
    setIsCategoryModalOpen(false);
    setCategorySearch('');
  };

  const handleDraftMainCategorySelect = (category) => {
    setDraftMainCategory(category);
    setDraftSubCategory('');
    setDraftSuperSubCategory('');
  };

  const handleDraftSubCategorySelect = (subCategory) => {
    setDraftSubCategory(subCategory);
    setDraftSuperSubCategory('');
  };

  const buildCustomCategoryEntry = () => {
    const main = (draftMainCategory || '').trim();
    const sub = (draftSubCategory || '').trim();
    const superSub = (draftSuperSubCategory || '').trim();

    if (!main) return null;

    if (customCategoryMode === 'sub') {
      if (!sub) return null;
      return { [main]: { [sub]: [] } };
    }

    if (customCategoryMode === 'super') {
      if (!sub || !superSub) return null;
      return { [main]: { [sub]: [superSub] } };
    }

    if (!sub) return { [main]: [] };
    if (!superSub) return { [main]: { [sub]: [] } };
    return { [main]: { [sub]: [superSub] } };
  };

  const handleConfirmCategory = () => {
    if (!draftMainCategory) return;

    setFormData(prev => ({
      ...prev,
      mainCategory: draftMainCategory,
      subCategory: draftSubCategory,
      superSubCategory: draftSuperSubCategory,
      category: draftMainCategory
    }));

    closeCategoryPicker();
  };

  const openCustomCategoryModal = (mode = 'main') => {
    setCustomCategoryMode(mode);
    setDraftMainCategory(draftMainCategory || formData.mainCategory || '');
    setDraftSubCategory(mode === 'super' ? (draftSubCategory || formData.subCategory || '') : '');
    setDraftSuperSubCategory('');
    setIsCustomCategoryModalOpen(true);
  };

  const closeCustomCategoryModal = () => {
    setIsCustomCategoryModalOpen(false);
  };

  const handleConfirmCustomCategory = async () => {
    const customEntry = buildCustomCategoryEntry();
    if (!customEntry) return;

    const main = Object.keys(customEntry)[0];
    const value = customEntry[main];

    setCustomCategoryTree(prev => {
      const existingNode = prev[main];

      if (!existingNode) {
        return { ...prev, [main]: value };
      }

      return { ...prev, [main]: mergeCategoryNodes(existingNode, value) };
    });

    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: customCategoryMode,
          parentName: draftMainCategory,
          subName: draftSubCategory,
          superSubName: draftSuperSubCategory
        })
      });

      setPersistedCategoryTree((prev) => {
        const existingNode = prev[main];
        if (!existingNode) return { ...prev, [main]: value };
        return { ...prev, [main]: mergeCategoryNodes(existingNode, value) };
      });
    } catch {
      // Keep local UI flow even when SQL save fails.
    }

    setFormData(prev => ({
      ...prev,
      mainCategory: draftMainCategory,
      subCategory: draftSubCategory,
      superSubCategory: draftSuperSubCategory,
      category: draftMainCategory
    }));

    setIsCustomCategoryModalOpen(false);
  };

  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (files) {
      const maxImages = 5;
      const currentCount = (formData.images || []).length;
      const availableSlots = maxImages - currentCount;
      
      if (availableSlots <= 0) {
        alert(`⚠️ Sudah mencapai maksimal 5 foto. Hapus foto untuk menambah yang baru.`);
        e.target.value = ''; // Reset file input
        return;
      }
      
      const filesToProcess = Array.from(files).slice(0, availableSlots);
      
      if (files.length > availableSlots) {
        alert(`⚠️ Hanya bisa tambah ${availableSlots} foto lagi (sudah ${currentCount}/${maxImages}).`);
      }
      
      // Convert files to Base64
      Promise.all(
        filesToProcess.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve(event.target.result);
            };
            reader.readAsDataURL(file);
          });
        })
      ).then(base64Images => {
        setFormData(prev => {
          const existingCount = (prev.images || []).length;
          const remainingSlots = maxImages - existingCount;
          const imagesToAdd = base64Images.slice(0, remainingSlots);
          
          return {
            ...prev,
            images: [...(prev.images || []), ...imagesToAdd]
          };
        });
        e.target.value = ''; // Reset file input
      });
    }
  };

  const handleRemoveImage = (idx) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== idx)
    }));
  };

  const handleRemoveItemImage = (itemId, imgIdx) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item =>
        item.id === itemId
          ? { ...item, images: (item.images || []).filter((_, i) => i !== imgIdx) }
          : item
      )
    }));
  };

  const mainCategories = Object.keys(normalizedCategoryTree);
  const normalizedSearch = categorySearch.trim().toLowerCase();

  const filteredMainCategories = normalizedSearch
    ? mainCategories.filter((mainCategory) => {
        const isMainMatch = mainCategory.toLowerCase().includes(normalizedSearch);
        const subMap = normalizedCategoryTree[mainCategory] || {};
        const subCategories = Object.keys(subMap);
        const hasSubMatch = subCategories.some((subCategory) => subCategory.toLowerCase().includes(normalizedSearch));
        const hasSuperSubMatch = subCategories.some((subCategory) =>
          (subMap[subCategory] || []).some((superSubCategory) => superSubCategory.toLowerCase().includes(normalizedSearch))
        );
        return isMainMatch || hasSubMatch || hasSuperSubMatch;
      })
    : mainCategories;

  const draftSubMap = draftMainCategory ? (normalizedCategoryTree[draftMainCategory] || {}) : {};
  const draftSubCategories = Object.keys(draftSubMap);
  const draftSuperSubCategories = draftSubCategory ? (draftSubMap[draftSubCategory] || []) : [];
  const isSearchMatchingSelectedMainCategory = Boolean(
    normalizedSearch &&
    draftMainCategory &&
    draftMainCategory.toLowerCase().includes(normalizedSearch)
  );
  const isSearchMatchingSelectedSubCategory = Boolean(
    normalizedSearch &&
    draftSubCategory &&
    draftSubCategory.toLowerCase().includes(normalizedSearch)
  );
  const filteredDraftSubCategories = normalizedSearch
    ? isSearchMatchingSelectedMainCategory
      ? draftSubCategories
      : draftSubCategories.filter((subCategory) => {
          const isSubMatch = subCategory.toLowerCase().includes(normalizedSearch);
          const hasSuperSubMatch = (draftSubMap[subCategory] || []).some((superSubCategory) =>
            superSubCategory.toLowerCase().includes(normalizedSearch)
          );
          return isSubMatch || hasSuperSubMatch;
        })
    : draftSubCategories;
  const filteredDraftSuperSubCategories = normalizedSearch
    ? (isSearchMatchingSelectedMainCategory || isSearchMatchingSelectedSubCategory
      ? draftSuperSubCategories
      : draftSuperSubCategories.filter((superSubCategory) => superSubCategory.toLowerCase().includes(normalizedSearch)))
    : draftSuperSubCategories;

  const hasSuperSubOptions = draftSuperSubCategories.length > 0;
  const canConfirmCategory = Boolean(
    draftMainCategory
    && (!draftSubCategories.length || draftSubCategory)
    && (!hasSuperSubOptions || draftSuperSubCategory)
  );

  const serviceMainCategorySet = new Set(Object.keys(normalizeCategoryTree(SERVICE_CATEGORY_TREE)));
  const explicitFormType = String(formData.type || '').trim().toLowerCase();
  const isJasaSelected = explicitFormType === 'jasa' || (explicitFormType !== 'barang' && (isJasaFormType || serviceMainCategorySet.has(formData.mainCategory)));
  const isBarangSelected = explicitFormType === 'barang' || (explicitFormType !== 'jasa' && !isJasaSelected);
  const entityLabel = isJasaSelected ? 'Jasa' : 'Barang';
  const activeCategoryPath = getCategoryPath(formData.mainCategory, formData.subCategory, formData.superSubCategory);
  const selectedMainCategory = formData.mainCategory || '';
  const hasValidSelectedMainCategory = !!selectedMainCategory && mainCategories.includes(selectedMainCategory);
  const activeSpecTemplate = isJasaSelected
    ? resolveJasaSpecGroup(activeCategoryPath)
    : resolveBarangSpecGroup(activeCategoryPath);
  const activeDescriptionTemplate = isJasaSelected
    ? DESCRIPTION_TABLE_BY_TYPE.jasa
    : DESCRIPTION_TABLE_BY_TYPE.barang;
  const activeRequirementChecklist = isJasaSelected
    ? CHECKLIST_BY_TYPE.jasa
    : CHECKLIST_BY_TYPE.barang;

  const specs = formData.specifications || {};
  const specificationOptions = formData.specificationOptions || {};
  const descriptionTable = formData.descriptionTable || {};
  const checklist = formData.checklist || {};
  const requiredSpecCount = activeSpecTemplate.filter(field => field.required).length;
  const completedRequiredSpecCount = activeSpecTemplate
    .filter(field => field.required)
    .filter(field => Boolean((specs[field.key] || '').toString().trim())).length;
  const activeSpecOptionFields = activeSpecTemplate.filter((field) => (specificationOptions[field.key]?.options || []).length > 0);
  const requiredDescriptionCount = activeDescriptionTemplate.filter(field => field.required).length;
  const completedDescriptionCount = activeDescriptionTemplate
    .filter(field => field.required)
    .filter(field => Boolean((descriptionTable[field.key] || '').toString().trim())).length;

  const selectedCategoryDisplay = formData.mainCategory
    ? formData.subCategory
      ? `${formData.mainCategory} > ${formData.subCategory}${formData.superSubCategory ? ` > ${formData.superSubCategory}` : ''}`
      : formData.mainCategory
    : '';
  const dynamicTitlePlaceholder = TITLE_PLACEHOLDER_BY_PATH[(formData.mainCategory || '').toLowerCase()]
    || TITLE_PLACEHOLDER_BY_PATH[(formData.subCategory || '').toLowerCase()]
    || `Contoh: Nama ${entityLabel} yang jelas dan spesifik`;

  const handleSpecFieldChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...(prev.specifications || {}),
        [fieldKey]: value
      }
    }));
  };

  const handleChecklistChange = (itemLabel, checked) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...(prev.checklist || {}),
        [itemLabel]: checked
      }
    }));
  };

  const handleDescriptionFieldChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      descriptionTable: {
        ...(prev.descriptionTable || {}),
        [fieldKey]: value
      }
    }));
  };

  const handleDeleteSpec = (fieldKey) => {
    setDeletedSpecFields(prev => new Set([...prev, fieldKey]));
  };

  const handleRestoreSpec = (fieldKey) => {
    setDeletedSpecFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldKey);
      return newSet;
    });
  };

  const handleSpecOptionDraftChange = (fieldKey, value) => {
    setSpecOptionDrafts(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleAddSpecOption = (fieldKey) => {
    const draftValue = (specOptionDrafts[fieldKey] || '').trim();
    if (!draftValue) return;

    const currentOptions = specificationOptions[fieldKey]?.options || [];
    const isDuplicate = currentOptions.some((option) => option.label.toLowerCase() === draftValue.toLowerCase());
    if (isDuplicate) {
      alert('Opsi spesifikasi ini sudah ada. Gunakan nama opsi yang berbeda.');
      return;
    }

    const newOptionId = `specopt${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      specificationOptions: {
        ...(prev.specificationOptions || {}),
        [fieldKey]: {
          ...(prev.specificationOptions?.[fieldKey] || {}),
          options: [
            ...(prev.specificationOptions?.[fieldKey]?.options || []),
            { id: newOptionId, label: draftValue }
          ]
        }
      }
    }));

    setSpecOptionDrafts(prev => ({
      ...prev,
      [fieldKey]: ''
    }));
  };

  const handleDeleteSpecOption = (fieldKey, optionId) => {
    setFormData(prev => ({
      ...prev,
      specificationOptions: {
        ...(prev.specificationOptions || {}),
        [fieldKey]: {
          ...(prev.specificationOptions?.[fieldKey] || {}),
          options: (prev.specificationOptions?.[fieldKey]?.options || []).filter((option) => option.id !== optionId)
        }
      }
    }));
  };

  // ========== VARIASI HANDLERS ==========
  const variations = formData.variations || {};
  const variationCount = Object.keys(variations).length;

  const handleAddVariation = () => {
    if (!variationName.trim()) return;
    
    const newVariasiId = `variasi${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      variations: {
        ...(prev.variations || {}),
        [newVariasiId]: {
          id: newVariasiId,
          name: variationName,
          options: []
        }
      }
    }));
    
    setVariationName('');
    setEditingVariasiId(newVariasiId);
  };

  const handleDeleteVariation = (variasiId) => {
    setFormData(prev => ({
      ...prev,
      variations: Object.keys(prev.variations || {})
        .filter(id => id !== variasiId)
        .reduce((acc, id) => {
          acc[id] = prev.variations[id];
          return acc;
        }, {}),
      items: (prev.items || []).map((item) => {
        if (!item.variationValues || !Object.prototype.hasOwnProperty.call(item.variationValues, variasiId)) {
          return item;
        }

        const nextVariationValues = { ...item.variationValues };
        delete nextVariationValues[variasiId];

        return {
          ...item,
          variationValues: nextVariationValues
        };
      })
    }));
  };

  const handleRenameVariation = (variasiId, newName) => {
    if (!newName.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      variations: {
        ...(prev.variations || {}),
        [variasiId]: {
          ...prev.variations[variasiId],
          name: newName
        }
      }
    }));
  };

  const handleAddOption = (variasiId) => {
    if (!newOptionLabel.trim()) return;
    
    // Check duplikat
    const currentOptions = formData.variations?.[variasiId]?.options || [];
    const isDuplicate = currentOptions.some(opt => opt.label.toLowerCase() === newOptionLabel.toLowerCase());
    
    if (isDuplicate) {
      alert('Opsi ini sudah ada! Gunakan nama opsi yang berbeda.');
      return;
    }
    
    const newOptionId = `opt${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      variations: {
        ...(prev.variations || {}),
        [variasiId]: {
          ...prev.variations[variasiId],
          options: [
            ...(prev.variations[variasiId]?.options || []),
            { id: newOptionId, label: newOptionLabel }
          ]
        }
      }
    }));
    
    setNewOptionLabel('');
  };

  const handleDeleteOption = (variasiId, optionId) => {
    setFormData(prev => ({
      ...prev,
      variations: {
        ...(prev.variations || {}),
        [variasiId]: {
          ...prev.variations[variasiId],
          options: (prev.variations[variasiId]?.options || []).filter(opt => opt.id !== optionId)
        }
      }
    }));
  };

  const handleItemSpecOptionChange = (itemId, fieldKey, optionId) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item => {
        if (item.id !== itemId) {
          return item;
        }

        return {
          ...item,
          specOptionValues: {
            ...(item.specOptionValues || {}),
            [fieldKey]: optionId
          }
        };
      })
    }));
  };

  const handleAddItemRow = () => {
    const newItemId = `item-${Date.now()}`;
    const baseSpecOptionValues = Object.fromEntries(activeSpecOptionFields.map((field) => [field.key, '']));
    const newItem = isBarangSelected
      ? { id: newItemId, namaBarang: '', deskripsi: '', hargaPcs: '', stok: '', images: [], variationValues: {}, specOptionValues: baseSpecOptionValues }
      : { id: newItemId, namaJasa: '', deskripsi: '', hargaSesi: '', images: [], variationValues: {}, specOptionValues: baseSpecOptionValues };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const handleRemoveItemRow = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item.id !== itemId)
    }));
  };

  const handleItemFieldChange = (itemId, fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item =>
        item.id === itemId ? { ...item, [fieldName]: value } : item
      )
    }));
  };

  const handleItemVariationChange = (itemId, variasiId, optionId) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            variationValues: {
              ...(item.variationValues || {}),
              [variasiId]: optionId
            }
          };
        }
        return item;
      })
    }));
  };

  const handleItemImageUpload = (itemId, files) => {
    if (files && files.length > 0) {
      const maxImages = 5;
      const item = (formData.items || []).find(i => i.id === itemId);
      const currentCount = (item?.images || []).length;
      const availableSlots = maxImages - currentCount;
      
      if (availableSlots <= 0) {
        alert(`⚠️ Item ini sudah mencapai maksimal 5 foto. Hapus foto untuk menambah yang baru.`);
        return;
      }
      
      const filesToProcess = Array.from(files).slice(0, availableSlots);
      
      if (files.length > availableSlots) {
        alert(`⚠️ Item ini hanya bisa tambah ${availableSlots} foto lagi (sudah ${currentCount}/${maxImages}).`);
      }
      
      // Convert files to Base64
      Promise.all(
        filesToProcess.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve(event.target.result);
            };
            reader.readAsDataURL(file);
          });
        })
      ).then(base64Images => {
        setFormData(prev => ({
          ...prev,
          items: (prev.items || []).map(i => {
            if (i.id === itemId) {
              const existingCount = (i.images || []).length;
              const remainingSlots = maxImages - existingCount;
              const imagesToAdd = base64Images.slice(0, remainingSlots);
              return { ...i, images: [...(i.images || []), ...imagesToAdd] };
            }
            return i;
          })
        }));
      });
    }
  };

  useEffect(() => {
    if (!formData.mainCategory) return;

    if (!mainCategories.includes(formData.mainCategory)) {
      setFormData(prev => ({
        ...prev,
        mainCategory: '',
        subCategory: '',
        category: ''
      }));
      return;
    }

    const validSubMap = normalizedCategoryTree[formData.mainCategory] || {};
    const validSubCategories = Object.keys(validSubMap);
    if (formData.subCategory && !validSubCategories.includes(formData.subCategory)) {
      setFormData(prev => ({
        ...prev,
        subCategory: '',
        superSubCategory: ''
      }));
      return;
    }

    if (!formData.subCategory) return;

    const validSuperSubCategories = validSubMap[formData.subCategory] || [];
    if (formData.superSubCategory && !validSuperSubCategories.includes(formData.superSubCategory)) {
      setFormData(prev => ({
        ...prev,
        superSubCategory: ''
      }));
    }
  }, [formData.mainCategory, formData.subCategory, formData.superSubCategory, mainCategories, normalizedCategoryTree, setFormData]);

  useEffect(() => {
    setFormData(prev => {
      const previousSpecs = prev.specifications || {};
      const templateKeys = new Set(activeSpecTemplate.map(field => field.key));

      const nextSpecs = {};
      Object.keys(previousSpecs).forEach((key) => {
        if (templateKeys.has(key)) {
          nextSpecs[key] = previousSpecs[key];
        }
      });

      activeSpecTemplate.forEach((field) => {
        if (typeof nextSpecs[field.key] === 'undefined') {
          nextSpecs[field.key] = '';
        }
      });

      const previousDescriptionTable = prev.descriptionTable || {};
      const descriptionKeys = new Set(activeDescriptionTemplate.map(field => field.key));
      const nextDescriptionTable = {};
      Object.keys(previousDescriptionTable).forEach((key) => {
        if (descriptionKeys.has(key)) {
          nextDescriptionTable[key] = previousDescriptionTable[key];
        }
      });
      activeDescriptionTemplate.forEach((field) => {
        if (typeof nextDescriptionTable[field.key] === 'undefined') {
          nextDescriptionTable[field.key] = '';
        }
      });

      const previousChecklist = prev.checklist || {};
      const nextChecklist = {};
      activeRequirementChecklist.forEach((item) => {
        nextChecklist[item] = Boolean(previousChecklist[item]);
      });

      const hasSpecsChanged = JSON.stringify(previousSpecs) !== JSON.stringify(nextSpecs);
      const hasDescriptionChanged = JSON.stringify(previousDescriptionTable) !== JSON.stringify(nextDescriptionTable);
      const hasChecklistChanged = JSON.stringify(previousChecklist) !== JSON.stringify(nextChecklist);

      if (!hasSpecsChanged && !hasDescriptionChanged && !hasChecklistChanged) {
        return prev;
      }

      return {
        ...prev,
        specifications: nextSpecs,
        descriptionTable: nextDescriptionTable,
        checklist: nextChecklist
      };
    });
  }, [activeDescriptionTemplate, activeRequirementChecklist, activeSpecTemplate, setFormData]);

  useEffect(() => {
    setFormData(prev => {
      const variationEntries = Object.entries(prev.variations || {});
      const currentOptionKeys = new Set(activeSpecOptionFields.map((field) => field.key));
      const optionIdsByField = new Map(
        activeSpecOptionFields.map((field) => [
          field.key,
          new Set((specificationOptions[field.key]?.options || []).map((option) => option.id))
        ])
      );

      let hasChanges = false;
      const nextItems = (prev.items || []).map((item) => {
        const currentVariationValues = item.variationValues || {};
        const nextVariationValues = {};
        const currentSpecOptionValues = item.specOptionValues || {};
        const nextSpecOptionValues = {};

        variationEntries.forEach(([variationId, variation]) => {
          const optionId = currentVariationValues[variationId];
          if (optionId && (variation.options || []).some((option) => option.id === optionId)) {
            nextVariationValues[variationId] = optionId;
          }
        });

        activeSpecOptionFields.forEach((field) => {
          const optionId = currentSpecOptionValues[field.key];
          if (optionId && optionIdsByField.get(field.key)?.has(optionId)) {
            nextSpecOptionValues[field.key] = optionId;
          }
        });

        const currentVariationSignature = JSON.stringify(currentVariationValues);
        const nextVariationSignature = JSON.stringify(nextVariationValues);
        const currentSpecOptionSignature = JSON.stringify(currentSpecOptionValues);
        const nextSpecOptionSignature = JSON.stringify(nextSpecOptionValues);

        if (currentVariationSignature !== nextVariationSignature || currentSpecOptionSignature !== nextSpecOptionSignature || Object.keys(currentSpecOptionValues).some((key) => !currentOptionKeys.has(key))) {
          hasChanges = true;
          return {
            ...item,
            variationValues: nextVariationValues,
            specOptionValues: nextSpecOptionValues
          };
        }

        return item;
      });

      if (!hasChanges) {
        return prev;
      }

      return {
        ...prev,
        items: nextItems
      };
    });
  }, [activeSpecOptionFields, formData.variations, setFormData, specificationOptions]);

  return (
    <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '32px', color: '#1f2937' }}>
        {isEditing 
          ? (isJasaSelected ? `✏️ Edit Layanan Jasa` : `✏️ Edit Barang`) 
          : (isJasaSelected ? `➕ Tambah Layanan Jasa Baru` : `➕ Tambah Barang Baru`)}
      </h2>

      {errorMsg && (
        <div style={{ 
          background: '#fee2e2', 
          border: '2px solid #fca5a5', 
          color: '#991b1b', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.6'
        }}>
          ❌ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ 
          background: '#dcfce7', 
          border: '2px solid #86efac', 
          color: '#166534', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '24px'
        }}>
          ✅ {successMsg}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: '24px' }}>
        {/* Jasa atau Barang */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            {isJasaSelected 
              ? '🧭 Kategori Layanan Jasa' 
              : '🧭 Kategori Barang/Aset'}
          </label>
          <button
            type="button"
            onClick={openCategoryPicker}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              background: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: selectedCategoryDisplay ? '#111827' : '#9ca3af'
            }}
          >
            <span>{selectedCategoryDisplay || 'Pilih Kategori...'}</span>
            <span style={{ color: '#6b7280', marginLeft: '8px' }}>▼</span>
          </button>
          <p style={{ marginTop: '8px', marginBottom: 0, fontSize: '12px', color: hasValidSelectedMainCategory ? '#6b7280' : '#dc2626' }}>
            {isJasaSelected 
              ? 'Pilih kategori layanan, sub kategori, dan super-sub kategori untuk memilih keahlian yang tepat.' 
              : 'Pilih kategori barang, sub kategori, dan super-sub kategori untuk klasifikasi aset yang tepat.'}
          </p>
        </div>

        {/* Nama Barang/Jasa */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            {isJasaSelected 
              ? '📝 Nama Layanan' 
              : '📝 Nama Barang'}
          </label>
          <input
            type="text"
            name="title"
            placeholder={dynamicTitlePlaceholder}
            value={formData.title || ''}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        {/* Shortcut Popup Tabel */}
        <button
          type="button"
          onClick={() => setIsSpecModalOpen(true)}
          style={{
            width: '100%',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '14px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            background: '#fff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#111827' }}>
              {isJasaSelected 
                ? '🧩 Detail Keahlian & Pengalaman' 
                : '🧩 Spesifikasi Teknis Barang'}
            </strong>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{completedRequiredSpecCount}/{requiredSpecCount}</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280' }}>
            {isJasaSelected 
              ? 'Klik untuk detail keahlian, pengalaman, dan kemampuan layanan via popup.' 
              : 'Klik untuk detail spesifikasi teknis barang via popup.'}
          </p>
        </button>

        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '14px 16px',
          background: '#f9fafb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#111827' }}>● Variasi</strong>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{variationCount} variasi aktif</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280' }}>Kelola variasi langsung dari popup spesifikasi.</p>
        </div>

        {/* Conditional Items Table - BARANG or JASA */}
        {isBarangSelected ? (
          // BARANG: Katalog Barang/Aset dengan detail per pcs
          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px', 
            padding: '20px', 
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0 }}>
                📦 Katalog Barang / Aset
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#059669'}
                onMouseLeave={(e) => e.target.style.background = '#10b981'}
              >
                ➕ Tambah Baris
              </button>
            </div>

            {(formData.items || []).length === 0 ? (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                background: '#f9fafb',
                borderRadius: '10px',
                border: '1px dashed #d1d5db'
              }}>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  {isBarangSelected 
                    ? 'Belum ada barang ditambahkan. Klik tombol "Tambah Baris" untuk memulai.' 
                    : 'Belum ada paket layanan ditambahkan. Klik tombol "Tambah Paket" untuk memulai.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'center', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '12%'
                      }}>
                        Gambar
                      </th>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '25%'
                      }}>
                        Nama Barang
                      </th>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '28%'
                      }}>
                        Deskripsi Paket/Barang
                      </th>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '18%'
                      }}>
                        Harga per Pcs (Rp)
                      </th>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '14%'
                      }}>
                        Jumlah Stok (Unit)
                      </th>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'center', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '15%'
                      }}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.items || []).map((item, idx) => [
                      <tr key={item.id} style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f9fafb'}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto' }}>
                            {item.images && item.images.length > 0 ? (
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={item.images[0]}
                                  alt="preview"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    cursor: 'pointer'
                                  }}
                                  title={`${item.images.length} foto`}
                                />
                                {item.images.length > 1 && (
                                  <span style={{
                                    position: 'absolute',
                                    bottom: '2px',
                                    right: '2px',
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    fontSize: '10px',
                                    padding: '2px 4px',
                                    borderRadius: '3px'
                                  }}>
                                    +{item.images.length - 1}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemImage(item.id, 0)}
                                  style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}
                                  title="Hapus foto"
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  background: '#f3f4f6',
                                  borderRadius: '6px',
                                  border: '1px dashed #d1d5db',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '24px',
                                  color: '#d1d5db'
                                }}
                              >
                                📸
                              </div>
                            )}
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => handleItemImageUpload(item.id, e.target.files)}
                              style={{
                                position: 'absolute',
                                inset: 0,
                                opacity: 0,
                                cursor: 'pointer',
                                width: '100%',
                                height: '100%'
                              }}
                              title="Klik untuk upload gambar"
                            />
                          </div>
                          {item.images && item.images.length > 1 && (
                            <div style={{
                              marginTop: '8px',
                              display: 'flex',
                              gap: '4px',
                              flexWrap: 'wrap',
                              justifyContent: 'center'
                            }}>
                              {item.images.slice(1, 5).map((img, imgIdx) => (
                                <div key={imgIdx + 1} style={{ position: 'relative', width: '30px', height: '30px' }}>
                                  <img
                                    src={img}
                                    alt={`preview ${imgIdx + 1}`}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      borderRadius: '3px',
                                      border: '1px solid #d1d5db'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemImage(item.id, imgIdx + 1)}
                                    style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-6px',
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      padding: 0
                                    }}
                                    title="Hapus"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            type="text"
                            placeholder="Contoh: Laptop ROG 16 Inch, Gaming Chair RGB, Monitor 4K 27 Inci"
                            value={item.namaBarang || ''}
                            onChange={(e) => handleItemFieldChange(item.id, 'namaBarang', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '13px',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <textarea
                            rows={2}
                            placeholder="Spesifikasi item, kelengkapan, kondisi, dan catatan paket"
                            value={item.deskripsi || ''}
                            onChange={(e) => handleItemFieldChange(item.id, 'deskripsi', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '13px',
                              boxSizing: 'border-box',
                              resize: 'vertical',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            type="number"
                            placeholder="Harga satuan"
                            value={item.hargaPcs || ''}
                            onChange={(e) => handleItemFieldChange(item.id, 'hargaPcs', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '13px',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            type="number"
                            placeholder="Jumlah unit"
                            value={item.stok || ''}
                            onChange={(e) => handleItemFieldChange(item.id, 'stok', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '13px',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(item.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '16px',
                              transition: 'all 0.2s',
                              fontWeight: 'bold'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#fca5a5';
                              e.target.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#fee2e2';
                              e.target.style.transform = 'scale(1)';
                            }}
                            title="Hapus baris ini"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>,
                      Object.keys(variations).length > 0 && (
                        <tr key={`var-${item.id}`} style={{ background: '#f0f9ff', borderBottom: '1px solid #e5e7eb' }}>
                          <td colSpan="5" style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                              {Object.entries(variations).map(([variasiId, variasi]) => (
                                <div key={variasiId} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                                    {variasi.name}
                                  </label>
                                  <select
                                    value={item.variationValues?.[variasiId] || ''}
                                    onChange={(e) => handleItemVariationChange(item.id, variasiId, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '8px 10px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      background: '#fff',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="">-- Pilih {variasi.name.toLowerCase()} --</option>
                                    {(variasi.options || []).map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ),
                      activeSpecOptionFields.length > 0 && (
                        <tr key={`specopt-${item.id}`} style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                          <td colSpan="5" style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                              {activeSpecOptionFields.map((field) => {
                                const fieldOptions = specificationOptions[field.key]?.options || [];

                                return (
                                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                                      {field.label}
                                    </label>
                                    <select
                                      value={item.specOptionValues?.[field.key] || ''}
                                      onChange={(e) => handleItemSpecOptionChange(item.id, field.key, e.target.value)}
                                      style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        background: '#fff',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="">-- Pilih {field.label.toLowerCase()} --</option>
                                      {fieldOptions.map((option) => (
                                        <option key={option.id} value={option.id}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )
                    ])}
                  </tbody>
                </table>
              </div>
            )}

            <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#6b7280' }}>
              💡 Tips: Daftarkan setiap tipe barang dengan jumlah stok dan harga satuan. Contoh: Laptop ROG 16 inci (5 unit @2,500,000), Gaming Chair (8 unit @1,200,000)
            </p>
          </div>
        ) : (
          // JASA: Katalog product dan harga
          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px', 
            padding: '20px', 
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0 }}>
                💼 Daftar Paket Layanan
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#8F6B4A'}
                onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
              >
                ➕ Tambah Paket Baru
              </button>
            </div>

            {(formData.items || []).length === 0 ? (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                background: '#f9fafb',
                borderRadius: '10px',
                border: '1px dashed #d1d5db'
              }}>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  Belum ada paket layanan ditambahkan. Klik tombol &quot;Tambah Paket Baru&quot; untuk memulai.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'center', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '12%'
                      }}>
                        Gambar
                      </th>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '28%'
                      }}>
                        Nama Paket Layanan
                      </th>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '28%'
                      }}>
                        Deskripsi Paket/Barang
                      </th>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '22%'
                      }}>
                        Harga Paket (Rp)
                      </th>
                      <th style={{ 
                        padding: '12px 14px', 
                        textAlign: 'center', 
                        fontWeight: '700', 
                        color: '#374151',
                        width: '15%'
                      }}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.items || []).map((item, idx) => [
                      <tr key={item.id} style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f9fafb'}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto' }}>
                            {item.images && item.images.length > 0 ? (
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={item.images[0]}
                                  alt="preview"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    cursor: 'pointer'
                                  }}
                                  title={`${item.images.length} foto`}
                                />
                                {item.images.length > 1 && (
                                  <span style={{
                                    position: 'absolute',
                                    bottom: '2px',
                                    right: '2px',
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    fontSize: '10px',
                                    padding: '2px 4px',
                                    borderRadius: '3px'
                                  }}>
                                    +{item.images.length - 1}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemImage(item.id, 0)}
                                  style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}
                                  title="Hapus foto"
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  background: '#f3f4f6',
                                  borderRadius: '6px',
                                  border: '1px dashed #d1d5db',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '24px',
                                  color: '#d1d5db'
                                }}
                              >
                                📸
                              </div>
                            )}
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => handleItemImageUpload(item.id, e.target.files)}
                              style={{
                                position: 'absolute',
                                inset: 0,
                                opacity: 0,
                                cursor: 'pointer',
                                width: '100%',
                                height: '100%'
                              }}
                              title="Klik untuk upload gambar"
                            />
                          </div>
                          {item.images && item.images.length > 1 && (
                            <div style={{
                              marginTop: '8px',
                              display: 'flex',
                              gap: '4px',
                              flexWrap: 'wrap',
                              justifyContent: 'center'
                            }}>
                              {item.images.slice(1, 5).map((img, imgIdx) => (
                                <div key={imgIdx + 1} style={{ position: 'relative', width: '30px', height: '30px' }}>
                                  <img
                                    src={img}
                                    alt={`preview ${imgIdx + 1}`}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      borderRadius: '3px',
                                      border: '1px solid #d1d5db'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemImage(item.id, imgIdx + 1)}
                                    style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-6px',
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      padding: 0
                                    }}
                                    title="Hapus"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            type="text"
                            placeholder="Contoh: Full Day Photography, Half Day Session, Event Coverage"
                            value={item.namaJasa || ''}
                            onChange={(e) => handleItemFieldChange(item.id, 'namaJasa', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '13px',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <textarea
                            rows={2}
                            placeholder="Masukkan detail paket seperti durasi, layanan yang disertakan, dan ketentuan"
                            value={item.deskripsi || ''}
                            onChange={(e) => handleItemFieldChange(item.id, 'deskripsi', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '13px',
                              boxSizing: 'border-box',
                              resize: 'vertical',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            type="number"
                            placeholder="Masukkan harga paket"
                            value={item.hargaSesi || ''}
                            onChange={(e) => handleItemFieldChange(item.id, 'hargaSesi', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '13px',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(item.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '16px',
                              transition: 'all 0.2s',
                              fontWeight: 'bold'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#fca5a5';
                              e.target.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#fee2e2';
                              e.target.style.transform = 'scale(1)';
                            }}
                            title="Hapus paket ini"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>,
                      Object.keys(variations).length > 0 && (
                        <tr key={`var-${item.id}`} style={{ background: '#eff6ff', borderBottom: '1px solid #e5e7eb' }}>
                          <td colSpan="4" style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                              {Object.entries(variations).map(([variasiId, variasi]) => (
                                <div key={variasiId} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                                    {variasi.name}
                                  </label>
                                  <select
                                    value={item.variationValues?.[variasiId] || ''}
                                    onChange={(e) => handleItemVariationChange(item.id, variasiId, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '8px 10px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      background: '#fff',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="">-- Pilih {variasi.name.toLowerCase()} --</option>
                                    {(variasi.options || []).map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ),
                      activeSpecOptionFields.length > 0 && (
                        <tr key={`specopt-${item.id}`} style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                          <td colSpan="4" style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                              {activeSpecOptionFields.map((field) => {
                                const fieldOptions = specificationOptions[field.key]?.options || [];

                                return (
                                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                                      {field.label}
                                    </label>
                                    <select
                                      value={item.specOptionValues?.[field.key] || ''}
                                      onChange={(e) => handleItemSpecOptionChange(item.id, field.key, e.target.value)}
                                      style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        background: '#fff',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="">-- Pilih {field.label.toLowerCase()} --</option>
                                      {fieldOptions.map((option) => (
                                        <option key={option.id} value={option.id}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )
                    ])}
                  </tbody>
                </table>
              </div>
            )}

            <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#6b7280' }}>
              💡 Tips: Buat berbagai pilihan paket dengan durasi/scope berbeda untuk fleksibilitas klien. Contoh: &quot;Half Day (8 jam)&quot;, &quot;Full Day (12 jam)&quot;, &quot;Full Day + Prewedding (20 jam)&quot;
            </p>
          </div>
        )}

        {/* Harga Sewa */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              {isJasaSelected ? '💰 Harga Standar Paket (Rp)' : '💰 Harga Base per Hari (Rp)'}
            </label>
            <input
              type="number"
              name="price"
              placeholder={isJasaSelected ? 'Contoh: 3500000' : 'Contoh: 500000'}
              value={formData.price || ''}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              min="0"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              {isJasaSelected ? '📋 Durasi Standar (hari)' : '📅 Durasi Minimum Sewa (hari)'}
            </label>
            <input
              type="number"
              name="minimumDays"
              placeholder={isJasaSelected ? 'Contoh: 1' : 'Contoh: 1'}
              value={formData.minimumDays || 1}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              min="1"
              required
            />
          </div>
        </div>

        {isJasaSelected && (
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              👥 Availability Tim/Provider
            </label>
            <input
              type="number"
              name="availability"
              placeholder="Contoh: 3"
              value={formData.availability || ''}
              onChange={handleInputChange}
              min="1"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              required
            />
            <p style={{ marginTop: '8px', marginBottom: 0, fontSize: '12px', color: '#6b7280' }}>
              Untuk jasa tidak menggunakan stok unit. Isi jumlah tim/provider yang bisa melayani pada periode yang sama.
            </p>
          </div>
        )}

        {/* Kebijakan Sewa */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            {isJasaSelected 
              ? '⚖️ Syarat & Ketentuan Layanan (Pembayaran, Pembatalan, Revisi, dll)' 
              : '⚖️ Kebijakan Sewa (Kerusakan, Denda, Syarat, dll)'}
          </label>
          <textarea
            name="rentalPolicy"
            placeholder={isJasaSelected 
              ? 'Contoh: DP 50% untuk konfirmasi | Pembatalan gratis 7 hari sebelumnya | Termasuk konsultasi awal | Tidak termasuk pengeluaran transport' 
              : 'Contoh: Jaminan Rp500.000 | Biaya Kerusakan 20% dari harga sewa | Denda keterlambatan Rp50.000/hari'}
            value={formData.rentalPolicy || ''}
            onChange={handleInputChange}
            rows="4"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Lokasi Pickup */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            {isJasaSelected 
              ? '📍 Lokasi Layanan / Bertemu Klien' 
              : '📍 Lokasi Pickup/Pengambilan Barang'}
          </label>
          <input
            type="text"
            name="location"
            placeholder={isJasaSelected 
              ? 'Contoh: Studio Citra Jl. Gubernur Suryo No.123, Surabaya' 
              : 'Contoh: Gudang Jl. Raya Juanda No.456, Surabaya'}
            value={formData.location || ''}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        {/* Upload Foto */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            {isJasaSelected 
              ? '📸 Foto Portofolio Layanan' 
              : '📸 Foto Barang/Aset'}
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px dashed #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          />
          {formData.images && formData.images.length > 0 && (
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
              {formData.images.slice(0, 5).map((img, idx) => (
                <div
                  key={idx}
                  style={{ position: 'relative', width: '100px', height: '100px' }}
                >
                  <img
                    src={img}
                    alt={`preview ${idx}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}
                    title="Hapus foto ini"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '14px',
            background: isSubmitting ? '#ccc' : '#B28A67',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isSubmitting ? '⏳ Memproses...' : isEditing ? `💾 Update ${entityLabel}` : `✅ Tambah ${entityLabel}`}
        </button>
      </form>

      {isCategoryModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.45)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={closeCategoryPicker}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '960px',
              background: '#f9fafb',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '28px', lineHeight: '1.2', color: '#111827', fontWeight: '700' }}>
                Ubah Kategori
              </h3>
              <button
                type="button"
                onClick={closeCategoryPicker}
                style={{ border: 'none', background: 'transparent', fontSize: '28px', lineHeight: 1, cursor: 'pointer', color: '#6b7280' }}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <div style={{ padding: '16px 24px 8px' }}>
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Masukkan min. 1 karakter"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}
              />
            </div>

            <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '13px' }}>
                  Cari kategori yang sudah ada atau tambahkan kategori vendor Anda sendiri.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0',
                borderTop: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb',
                flex: 1,
                minHeight: '280px',
                overflow: 'hidden'
              }}
            >
              <div style={{ borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#fff', minHeight: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Kategori Utama</span>
                  <button
                    type="button"
                    onClick={() => openCustomCategoryModal('main')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      color: '#111827',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Tambah Kategori Khusus
                  </button>
                </div>
                {filteredMainCategories.length === 0 ? (
                  <p style={{ margin: 0, padding: '16px', color: '#6b7280', fontSize: '14px' }}>Kategori tidak ditemukan.</p>
                ) : (
                  filteredMainCategories.map((mainCategory) => {
                    const isSelected = draftMainCategory === mainCategory;
                    return (
                      <button
                        type="button"
                        key={mainCategory}
                        onClick={() => handleDraftMainCategorySelect(mainCategory)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'left',
                          background: isSelected ? '#fee2e2' : '#ffffff',
                          color: isSelected ? '#b91c1c' : '#1f2937',
                          fontWeight: isSelected ? '600' : '500',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '15px'
                        }}
                      >
                        <span>{mainCategory}</span>
                        <span style={{ color: '#9ca3af', marginLeft: '10px' }}>›</span>
                      </button>
                    );
                  })
                )}
              </div>

              <div style={{ borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#fff', minHeight: 0 }}>
                {draftMainCategory && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Sub Kategori</span>
                    <button
                      type="button"
                      onClick={() => openCustomCategoryModal('sub')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#111827',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      + Tambah Sub
                    </button>
                  </div>
                )}
                {!draftMainCategory ? (
                  <p style={{ margin: 0, padding: '16px', color: '#6b7280', fontSize: '14px' }}>Pilih kategori utama terlebih dahulu.</p>
                ) : filteredDraftSubCategories.length === 0 ? (
                  <p style={{ margin: 0, padding: '16px', color: '#6b7280', fontSize: '14px' }}>Sub kategori tidak ditemukan.</p>
                ) : (
                  filteredDraftSubCategories.map((subCategory) => {
                    const isSelected = draftSubCategory === subCategory;
                    const hasSuperSubInRow = (draftSubMap[subCategory] || []).length > 0;
                    return (
                      <button
                        type="button"
                        key={subCategory}
                        onClick={() => handleDraftSubCategorySelect(subCategory)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'left',
                          background: isSelected ? '#fee2e2' : '#ffffff',
                          color: isSelected ? '#b91c1c' : '#1f2937',
                          fontWeight: isSelected ? '600' : '500',
                          cursor: 'pointer',
                          fontSize: '15px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{subCategory}</span>
                        <span style={{ color: hasSuperSubInRow ? '#9ca3af' : '#e5e7eb', marginLeft: '10px' }}>
                          {hasSuperSubInRow ? '›' : ''}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div style={{ overflowY: 'auto', background: '#fff', minHeight: 0 }}>
                {draftSubCategory && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Super-sub Kategori</span>
                    <button
                      type="button"
                      onClick={() => openCustomCategoryModal('super')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#111827',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      + Tambah Super-sub
                    </button>
                  </div>
                )}
                {!draftSubCategory ? (
                  <p style={{ margin: 0, padding: '16px', color: '#6b7280', fontSize: '14px' }}>Pilih sub kategori terlebih dahulu.</p>
                ) : !draftSuperSubCategories.length ? (
                  <p style={{ margin: 0, padding: '16px', color: '#6b7280', fontSize: '14px' }}>Sub kategori ini tidak memiliki super-sub kategori.</p>
                ) : filteredDraftSuperSubCategories.length === 0 ? (
                  <p style={{ margin: 0, padding: '16px', color: '#6b7280', fontSize: '14px' }}>Super-sub kategori tidak ditemukan.</p>
                ) : (
                  filteredDraftSuperSubCategories.map((superSubCategory) => {
                    const isSelected = draftSuperSubCategory === superSubCategory;
                    return (
                      <button
                        type="button"
                        key={superSubCategory}
                        onClick={() => setDraftSuperSubCategory(superSubCategory)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'left',
                          background: isSelected ? '#fee2e2' : '#ffffff',
                          color: isSelected ? '#b91c1c' : '#1f2937',
                          fontWeight: isSelected ? '600' : '500',
                          cursor: 'pointer',
                          fontSize: '15px'
                        }}
                      >
                        {superSubCategory}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ padding: '14px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, color: '#374151', fontSize: '14px' }}>
                Dipilih:
                {' '}
                <strong>
                  {draftMainCategory
                    ? `${draftMainCategory}${draftSubCategory ? ` > ${draftSubCategory}` : ''}${draftSuperSubCategory ? ` > ${draftSuperSubCategory}` : ''}`
                    : '-'}
                </strong>
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={closeCategoryPicker}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCategory}
                  disabled={!canConfirmCategory}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: !canConfirmCategory ? '#fca5a5' : '#ef4444',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: !canConfirmCategory ? 'not-allowed' : 'pointer'
                  }}
                >
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>

          {isCustomCategoryModalOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(17, 24, 39, 0.55)',
                zIndex: 1100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
              onClick={closeCustomCategoryModal}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '520px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                  overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '24px', lineHeight: '1.2', color: '#111827', fontWeight: '700' }}>
                    {customCategoryModalTitle}
                  </h3>
                  <button
                    type="button"
                    onClick={closeCustomCategoryModal}
                    style={{ border: 'none', background: 'transparent', fontSize: '24px', lineHeight: 1, cursor: 'pointer', color: '#6b7280' }}
                    aria-label="Tutup"
                  >
                    ×
                  </button>
                </div>
                <div style={{ padding: '20px 24px 24px', display: 'grid', gap: '16px' }}>
                  {isCustomCategoryModeMain && (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Kategori Utama</label>
                      <input
                        type="text"
                        value={draftMainCategory}
                        onChange={(e) => setDraftMainCategory(e.target.value)}
                        placeholder="Contoh: Jasa Custom Wedding"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid #d1d5db',
                          fontSize: '15px',
                          boxSizing: 'border-box',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  )}

                  {isCustomCategoryModeSub && (
                    <>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Kategori Utama</label>
                        <div style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#f9fafb', color: '#111827' }}>
                          {draftMainCategory || 'Pilih kategori utama dulu'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Sub Kategori</label>
                        <input
                          type="text"
                          value={draftSubCategory}
                          onChange={(e) => setDraftSubCategory(e.target.value)}
                          placeholder="Contoh: Dekorasi, Entertainment"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: '1px solid #d1d5db',
                            fontSize: '15px',
                            boxSizing: 'border-box',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    </>
                  )}

                  {isCustomCategoryModeSuper && (
                    <>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Kategori Utama</label>
                        <div style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#f9fafb', color: '#111827' }}>
                          {draftMainCategory || 'Pilih kategori utama dulu'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Sub Kategori</label>
                        <div style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#f9fafb', color: '#111827' }}>
                          {draftSubCategory || 'Pilih sub kategori dulu'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Super-sub Kategori</label>
                        <input
                          type="text"
                          value={draftSuperSubCategory}
                          onChange={(e) => setDraftSuperSubCategory(e.target.value)}
                          placeholder="Contoh: Toyota Innova Zenix, Avanza Facelift"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: '1px solid #d1d5db',
                            fontSize: '15px',
                            boxSizing: 'border-box',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={closeCustomCategoryModal}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCustomCategory}
                      disabled={!canSaveCustomCategory}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: !canSaveCustomCategory ? '#fca5a5' : '#ef4444',
                        color: '#fff',
                        fontWeight: '700',
                        cursor: !canSaveCustomCategory ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Simpan Kategori
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isSpecModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.45)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setIsSpecModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '920px',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '88vh',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '22px', color: '#111827' }}>Tabel Spesifikasi {entityLabel}</h3>
              <button type="button" onClick={() => setIsSpecModalOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: '26px', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            <div style={{ padding: '10px 20px', fontSize: '12px', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
              Lengkapi data spesifikasi, lalu klik Simpan untuk lanjut ke tabel berikutnya.
            </div>

            <div style={{ overflowY: 'auto', padding: '12px 20px' }}>
              {deletedSpecFields.size > 0 && (
                <div style={{ marginBottom: '14px', border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '700', marginBottom: '8px' }}>
                    Field disembunyikan
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activeSpecTemplate
                      .filter((field) => deletedSpecFields.has(field.key))
                      .map((field) => (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => handleRestoreSpec(field.key)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '9999px',
                            border: '1px solid #f59e0b',
                            background: '#fff',
                            color: '#92400e',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          ↺ Tampilkan {field.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {activeSpecTemplate
                  .filter(field => !deletedSpecFields.has(field.key))
                  .map((field) => {
                    const fieldOptions = specificationOptions[field.key]?.options || [];

                    return (
                      <div key={field.key} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: 0 }}>
                            {field.label}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteSpec(field.key)}
                            style={{
                              padding: '4px 8px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            🗑️ Hapus
                          </button>
                        </div>

                        <input
                          type="text"
                          value={specs[field.key] || ''}
                          onChange={(e) => handleSpecFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            background: '#fff'
                          }}
                        />

                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e5e7eb' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                              Opsi Spesifikasi
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {fieldOptions.length} opsi
                            </div>
                          </div>

                          {fieldOptions.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                              {fieldOptions.map((option) => (
                                <div key={option.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    value={option.label}
                                    disabled
                                    style={{
                                      flex: 1,
                                      padding: '8px 10px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      background: '#f9fafb',
                                      color: '#6b7280'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSpecOption(field.key, option.id)}
                                    style={{
                                      padding: '6px 8px',
                                      background: '#fee2e2',
                                      color: '#dc2626',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              value={specOptionDrafts[field.key] || ''}
                              onChange={(e) => handleSpecOptionDraftChange(field.key, e.target.value)}
                              placeholder="Masukkan opsi baru"
                              style={{
                                flex: 1,
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '13px',
                                background: '#fff',
                                boxSizing: 'border-box'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddSpecOption(field.key)}
                              style={{
                                padding: '10px 16px',
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              + Tambah Opsi
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div style={{ marginTop: '16px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Variasi {entityLabel}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Kelola variasi langsung dari popup spesifikasi.</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{variationCount} variasi</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(variations).map(([variasiId, variasi]) => (
                    <div key={variasiId} style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: 0 }}>
                          Variasi {Object.keys(variations).indexOf(variasiId) + 1}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariation(variasiId)}
                          style={{
                            padding: '4px 8px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          🗑️ Hapus
                        </button>
                      </div>

                      <input
                        type="text"
                        value={variasi.name}
                        onChange={(e) => handleRenameVariation(variasiId, e.target.value)}
                        placeholder="Contoh: Jenis, Warna, Ukuran"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                          marginBottom: '12px',
                          background: '#fff'
                        }}
                      />

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>
                          Opsi ●
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          {(variasi.options || []).map((option) => (
                            <div key={option.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={option.label}
                                disabled
                                style={{
                                  flex: 1,
                                  padding: '8px 10px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  background: '#f9fafb',
                                  color: '#6b7280'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteOption(variasiId, option.id)}
                                style={{
                                  padding: '6px 8px',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>

                        {editingVariasiId === variasiId && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              value={newOptionLabel}
                              onChange={(e) => setNewOptionLabel(e.target.value)}
                              placeholder="Masukkan opsi baru"
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '12px',
                                background: '#fff',
                                boxSizing: 'border-box'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddOption(variasiId)}
                              style={{
                                padding: '6px 12px',
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              +
                            </button>
                          </div>
                        )}

                        {editingVariasiId !== variasiId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVariasiId(variasiId);
                              setNewOptionLabel('');
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 12px',
                              background: '#f3f4f6',
                              color: '#374151',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            + Tambah Opsi
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div style={{ paddingTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: 0 }}>
                        Tambah Variasi Baru
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditingVariasiId(null)}
                        style={{
                          padding: '6px 10px',
                          background: '#eff6ff',
                          color: '#B28A67',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        + Tambah Variasi
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={variationName}
                        onChange={(e) => setVariationName(e.target.value)}
                        placeholder="Contoh: Jenis, Warna, Ukuran"
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '13px',
                          background: '#fff',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddVariation}
                        style={{
                          padding: '10px 16px',
                          background: '#B28A67',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsSpecModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
              <button type="button" onClick={() => setIsSpecModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
