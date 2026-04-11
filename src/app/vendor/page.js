'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Data Wilayah Indonesia
const WILAYAH_DATA = {
  'Jawa': {
    'Jawa Barat': ['Bandung', 'Bekasi', 'Bogor', 'Depok', 'Cikarang'],
    'Jawa Tengah': ['Semarang', 'Solo', 'Yogyakarta', 'Salatiga', 'Pekalongan'],
    'Jawa Timur': ['Surabaya', 'Malang', 'Sidoarjo', 'Gresik', 'Pasuruan', 'Lamongan', 'Madura'],
    'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Timur', 'Jakarta Barat', 'Jakarta Selatan'],
  },
  'Sumatra': {
    'Sumatera Utara': ['Medan', 'Binjai', 'Berastagi', 'Tebing Tinggi'],
    'Sumatera Barat': ['Padang', 'Bukittinggi', 'Pariaman'],
    'Riau': ['Pekanbaru', 'Dumai'],
    'Jambi': ['Jambi', 'Sungai Penuh'],
    'Sumatera Selatan': ['Palembang', 'Prabumulih'],
    'Bengkulu': ['Bengkulu', 'Curup'],
    'Lampung': ['Bandar Lampung', 'Metro'],
  },
  'Kalimantan': {
    'Kalimantan Barat': ['Pontianak', 'Singkawang'],
    'Kalimantan Tengah': ['Palangka Raya'],
    'Kalimantan Selatan': ['Banjarmasin', 'Barito Kuala'],
    'Kalimantan Timur': ['Samarinda', 'Balikpapan', 'Bontang'],
    'Kalimantan Utara': ['Tarakan', 'Tana Tidung'],
  },
  'Sulawesi': {
    'Sulawesi Utara': ['Manado', 'Bitung'],
    'Sulawesi Tengah': ['Palu'],
    'Sulawesi Selatan': ['Makassar', 'Parepare'],
    'Sulawesi Tenggara': ['Kendari', 'Baubau'],
    'Gorontalo': ['Gorontalo'],
  },
  'Bali & Nusa Tenggara': {
    'Bali': ['Denpasar', 'Ubud', 'Kuta'],
    'Nusa Tenggara Barat': ['Mataram', 'Lombok'],
    'Nusa Tenggara Timur': ['Kupang', 'Maumere'],
  },
  'Maluku & Papua': {
    'Maluku': ['Ambon'],
    'Maluku Utara': ['Ternate', 'Tidore'],
    'Papua': ['Jayapura', 'Timika'],
    'Papua Barat': ['Manokwari', 'Sorong'],
  },
  'Online': {
    'Online/Remote': ['Seluruh Indonesia', 'Internasional'],
  }
};

export default function VendorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vendorType, setVendorType] = useState(null); // 'barang' or 'jasa'
  const [activeWilayahTab, setActiveWilayahTab] = useState('Jawa'); // Track active pulau/region tab
  const [selectedProvinsi, setSelectedProvinsi] = useState(null); // Track selected provinsi
  
  // Form data untuk barang
  const [formDataBarang, setFormDataBarang] = useState({
    namaBarang: '',
    jenisBarang: '',
    spesifikBarang: '',
    jumlahBarang: '',
    hargaBarang: '',
    deskripsiProduk: '',
    availability: 'ready', // ready, preorder
    lokasi: '',
    latitude: null,
    longitude: null,
    kebijakanKerusakan: '',
    denda: '',
    syaratSewa: '',
    images: []
  });
  
  // Form data untuk jasa
  const [formDataJasa, setFormDataJasa] = useState({
    spesialisasi: '',
    deskripsi: '',
    benefit: '',
    tarif: '',
    jangkauanWilayah: [],
    jamOperasionalHari: [], // Ubah menjadi array untuk multiple hari
    jamOperasionalDari: '09:00',
    jamOperasionalSampai: '17:00',
    estimasiPengerjaan: '',
    garansiLayanan: '',
    images: []
  });
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Ambil user dari localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'vendor') {
      alert('Anda tidak memiliki akses sebagai vendor. Silakan registrasi terlebih dahulu.');
      router.push('/vendor/register');
      return;
    }

    setUser(parsedUser);
    setIsLoading(false);
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (vendorType === 'barang') {
      setFormDataBarang(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (vendorType === 'jasa') {
      setFormDataJasa(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (files) {
      const imageUrls = Array.from(files).map(file => URL.createObjectURL(file));
      
      if (vendorType === 'barang') {
        setFormDataBarang(prev => ({
          ...prev,
          images: imageUrls
        }));
      } else if (vendorType === 'jasa') {
        setFormDataJasa(prev => ({
          ...prev,
          images: imageUrls
        }));
      }
    }
  };

  // Handle location/map selection
  const handleOpenMap = () => {
    const latitude = formDataBarang.latitude || -6.2088;
    const longitude = formDataBarang.longitude || 106.8456;
    const mapUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.8823296566547!2d${longitude}!3d${latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${latitude},${longitude}!5e0!3m2!1sen!2sid!4v1`;
    
    // Open Google Maps in new tab
    window.open(`https://maps.google.com/maps?q=${latitude},${longitude}`, '_blank');
  };

  const handleSetLocation = () => {
    // Simulated geolocation - in production, use actual GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormDataBarang(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          lokasi: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
        }));
        alert('✅ Lokasi berhasil disimpan!');
      }, () => {
        alert('❌ Tidak bisa mengakses lokasi. Pastikan browser memiliki permission.');
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let validationError = '';
    let submitData = {};

    if (vendorType === 'barang') {
      let missingFields = [];
      
      if (!formDataBarang.namaBarang) missingFields.push('Nama Barang');
      if (!formDataBarang.jenisBarang) missingFields.push('Jenis Barang');
      if (!formDataBarang.spesifikBarang) missingFields.push('Spesifikasi Barang');
      if (!formDataBarang.jumlahBarang) missingFields.push('Jumlah Barang');
      if (!formDataBarang.hargaBarang) missingFields.push('Harga Barang');
      if (!formDataBarang.deskripsiProduk) missingFields.push('Deskripsi Produk');
      if (!formDataBarang.lokasi) missingFields.push('Lokasi');
      if (!formDataBarang.kebijakanKerusakan) missingFields.push('Kebijakan Kerusakan');
      if (!formDataBarang.denda) missingFields.push('Denda');
      if (!formDataBarang.syaratSewa) missingFields.push('Syarat Sewa');
      
      if (missingFields.length > 0) {
        validationError = 'Bidang yang belum diisi:\n• ' + missingFields.join('\n• ');
      }
      
      if (parseInt(formDataBarang.jumlahBarang) <= 0) {
        validationError = 'Jumlah barang harus lebih dari 0!';
      }
      if (parseInt(formDataBarang.hargaBarang) <= 0) {
        validationError = 'Harga barang harus lebih dari 0!';
      }
      if (parseInt(formDataBarang.denda) <= 0) {
        validationError = 'Denda harus lebih dari 0!';
      }
      submitData = {
        vendorId: user.id,
        vendorName: user.name,
        type: 'barang',
        namaBarang: formDataBarang.namaBarang,
        jenisBarang: formDataBarang.jenisBarang,
        spesifikBarang: formDataBarang.spesifikBarang,
        jumlahBarang: formDataBarang.jumlahBarang,
        hargaBarang: formDataBarang.hargaBarang,
        deskripsiProduk: formDataBarang.deskripsiProduk,
        availability: formDataBarang.availability,
        lokasi: formDataBarang.lokasi,
        latitude: formDataBarang.latitude,
        longitude: formDataBarang.longitude,
        kebijakanKerusakan: formDataBarang.kebijakanKerusakan,
        denda: formDataBarang.denda,
        syaratSewa: formDataBarang.syaratSewa,
        images: formDataBarang.images.length > 0 ? formDataBarang.images : undefined
      };
    } else if (vendorType === 'jasa') {
      let missingFields = [];
      
      if (!formDataJasa.spesialisasi) missingFields.push('Spesialisasi');
      if (!formDataJasa.deskripsi) missingFields.push('Deskripsi Layanan');
      if (!formDataJasa.benefit) missingFields.push('Benefit/Keuntungan');
      if (!formDataJasa.tarif) missingFields.push('Tarif');
      if (formDataJasa.jangkauanWilayah.length === 0) missingFields.push('Jangkauan Wilayah (minimal 1 kota)');
      if (formDataJasa.jamOperasionalHari.length === 0) missingFields.push('Hari Operasional (minimal 1 hari)');
      if (!formDataJasa.jamOperasionalDari) missingFields.push('Jam Buka');
      if (!formDataJasa.jamOperasionalSampai) missingFields.push('Jam Tutup');
      if (!formDataJasa.estimasiPengerjaan) missingFields.push('Estimasi Pengerjaan');
      if (!formDataJasa.garansiLayanan) missingFields.push('SLA/Garansi Layanan');
      
      if (missingFields.length > 0) {
        validationError = 'Bidang yang belum diisi:\n• ' + missingFields.join('\n• ');
      }
      
      if (parseInt(formDataJasa.tarif) <= 0) {
        validationError = 'Tarif harus lebih dari 0!';
      }
      submitData = {
        vendorId: user.id,
        vendorName: user.name,
        type: 'jasa',
        spesialisasi: formDataJasa.spesialisasi,
        deskripsi: formDataJasa.deskripsi,
        benefit: formDataJasa.benefit,
        tarif: formDataJasa.tarif,
        jangkauanWilayah: formDataJasa.jangkauanWilayah,
        jamOperasional: {
          hari: formDataJasa.jamOperasionalHari,
          dari: formDataJasa.jamOperasionalDari,
          sampai: formDataJasa.jamOperasionalSampai
        },
        estimasiPengerjaan: formDataJasa.estimasiPengerjaan,
        garansiLayanan: formDataJasa.garansiLayanan,
        images: formDataJasa.images.length > 0 ? formDataJasa.images : undefined
      };
    }

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/vendor/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (data.success) {
        const typeLabel = vendorType === 'barang' ? 'Barang' : 'Jasa';
        setSuccessMsg(`✓ ${typeLabel} berhasil ditambahkan! Akan muncul di halaman utama.`);
        
        // Reset form
        setFormDataBarang({ namaBarang: '', jenisBarang: '', spesifikBarang: '', jumlahBarang: '', hargaBarang: '', deskripsiProduk: '', availability: 'ready', lokasi: '', latitude: null, longitude: null, kebijakanKerusakan: '', denda: '', syaratSewa: '', images: [] });
        setFormDataJasa({ spesialisasi: '', deskripsi: '', benefit: '', tarif: '', jangkauanWilayah: [], jamOperasionalHari: [], jamOperasionalDari: '09:00', jamOperasionalSampai: '17:00', estimasiPengerjaan: '', garansiLayanan: '', images: [] });
        setVendorType(null);
        
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setErrorMsg(data.message || 'Gagal menambahkan item');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <div className="vendor-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <Link href="/" className="nav-logo">
            🛡️ RentGuard
          </Link>
        </div>
        <div className="nav-right">
          <Link href="/vendor/chats" className="nav-link">
            💬 Pesan
          </Link>
          <Link href="/" className="nav-link">
            Kembali
          </Link>
          {user && (
            <button 
              className="btn-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="vendor-content">
        <div className="vendor-header">
          <h1>Dashboard Vendor</h1>
          <p className="greeting">Halo, {user?.name}! 👋</p>
          <p className="subtitle">Kelola dan tambahkan jasa sewa baru kamu di sini</p>
        </div>

        <div className="vendor-form-wrapper">
          {errorMsg && (
            <div className="alert alert-error" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              ❌ {errorMsg}
            </div>
          )}
          {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}

          {!vendorType ? (
            // Step 1: Pilih Kategori
            <div className="vendor-type-selection">
              <h2 style={{ marginBottom: '28px', textAlign: 'center', color: '#1a1a1a' }}>
                Pilih Jenis Vendor
              </h2>
              <div className="type-buttons">
                <button
                  type="button"
                  className="type-button"
                  onClick={() => setVendorType('barang')}
                >
                  <div className="type-icon">📦</div>
                  <div className="type-title">Penyedia Barang</div>
                  <div className="type-desc">Sewa barang/alat/peralatan</div>
                </button>
                <button
                  type="button"
                  className="type-button"
                  onClick={() => setVendorType('jasa')}
                >
                  <div className="type-icon">🔧</div>
                  <div className="type-title">Layanan Jasa</div>
                  <div className="type-desc">Sediakan jasa/layanan profesional</div>
                </button>
              </div>
            </div>
          ) : (
            // Step 2: Form berdasarkan tipe
            <>
              <div className="vendor-type-header">
                <button
                  type="button"
                  className="btn-back"
                  onClick={() => {
                    setVendorType(null);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  ← Kembali
                </button>
                <div>
                  <h2>
                    {vendorType === 'barang' ? '📦 Form Penyedia Barang' : '🔧 Form Layanan Jasa'}
                  </h2>
                  <p style={{ color: '#666', marginTop: '4px', fontSize: '13px' }}>
                    Isi semua informasi dengan lengkap dan akurat
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="vendor-form">
                {vendorType === 'barang' ? (
                  // Form Barang
                  <>
                    <div className="form-section">
                      <h3>Informasi Barang</h3>
                      
                      <div className="form-group">
                        <label htmlFor="namaBarang">Nama Barang</label>
                        <input
                          type="text"
                          id="namaBarang"
                          name="namaBarang"
                          value={formDataBarang.namaBarang}
                          onChange={handleChange}
                          placeholder="Contoh: Sepeda Mountain Bike 26 Inci"
                          required
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="jenisBarang">Jenis Barang</label>
                          <input
                            type="text"
                            id="jenisBarang"
                            name="jenisBarang"
                            value={formDataBarang.jenisBarang}
                            onChange={handleChange}
                            placeholder="Contoh: Alat Olahraga, Furniture, Elektronik"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="spesifikBarang">Spesifik Barang</label>
                          <input
                            type="text"
                            id="spesifikBarang"
                            name="spesifikBarang"
                            value={formDataBarang.spesifikBarang}
                            onChange={handleChange}
                            placeholder="Contoh: Sepeda Mountain Bike, Meja Makan, Laptop"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="jumlahBarang">Jumlah Barang</label>
                          <input
                            type="number"
                            id="jumlahBarang"
                            name="jumlahBarang"
                            value={formDataBarang.jumlahBarang}
                            onChange={handleChange}
                            placeholder="Contoh: 5"
                            min="1"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="hargaBarang">Harga Barang (Rp/Unit)</label>
                          <input
                            type="number"
                            id="hargaBarang"
                            name="hargaBarang"
                            value={formDataBarang.hargaBarang}
                            onChange={handleChange}
                            placeholder="Contoh: 100000"
                            min="1"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="deskripsiProduk">Deskripsi Produk (Wajib Ada)</label>
                        <textarea
                          id="deskripsiProduk"
                          name="deskripsiProduk"
                          value={formDataBarang.deskripsiProduk}
                          onChange={handleChange}
                          placeholder="Jelaskan detail produk, kondisi, fitur, spesifikasi teknis, dll..."
                          rows="4"
                          required
                        ></textarea>
                        <small>Contoh: Kondisi barang (Baru, bekas rasa baru, atau ada lecet sedikit), Kelengkapan (Misalnya: pinjam tenda sudah termasuk pasak dan tasnya), Spesifikasi teknis (Bahan, ukuran dimensi, atau merk)</small>
                      </div>

                      <div className="form-group">
                        <label htmlFor="availability">Ketersediaan Barang</label>
                        <select
                          id="availability"
                          name="availability"
                          value={formDataBarang.availability}
                          onChange={handleChange}
                          required
                        >
                          <option value="ready">Siap Sewa</option>
                          <option value="preorder">Pre-Order</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Lokasi/Titik Penjemputan</h3>
                      
                      <div className="form-group">
                        <label htmlFor="lokasi">Alamat Lengkap Penjemputan</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <input
                            type="text"
                            id="lokasi"
                            name="lokasi"
                            value={formDataBarang.lokasi}
                            onChange={handleChange}
                            placeholder="Masukkan alamat atau koordinat lokasi"
                            required
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={handleSetLocation}
                            style={{
                              padding: '10px 16px',
                              background: '#7c3aed',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            📍 Auto Detect
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenMap}
                            style={{
                              padding: '10px 16px',
                              background: '#a855f7',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            🗺️ Buka Maps
                          </button>
                        </div>
                        <small>Gunakan tombol "Auto Detect" untuk mengambil lokasi GPS saat ini, atau buka Maps untuk memilih lokasi secara manual</small>
                        {formDataBarang.latitude && formDataBarang.longitude && (
                          <div style={{ marginTop: '12px', padding: '12px', background: '#dcfce7', borderRadius: '8px', fontSize: '13px', color: '#166534', fontWeight: '500' }}>
                            ✅ Lokasi tersimpan: {formDataBarang.latitude.toFixed(6)}, {formDataBarang.longitude.toFixed(6)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Kebijakan Kerusakan & Denda</h3>
                      
                      <div className="form-group">
                        <label htmlFor="kebijakanKerusakan">Penjelasan Kebijakan Kerusakan</label>
                        <textarea
                          id="kebijakanKerusakan"
                          name="kebijakanKerusakan"
                          value={formDataBarang.kebijakanKerusakan}
                          onChange={handleChange}
                          placeholder="Contoh: Jika barang rusak atau terlambat dikembalikan, Ini membangun rasa saling percaya antara Anda dan user"
                          rows="3"
                          required
                        ></textarea>
                        <small>Jelaskan apa yang terjadi jika barang rusak atau terlambat dikembalikan</small>
                      </div>

                      <div className="form-group">
                        <label htmlFor="denda">Denda Keterlambatan (Rp/hari)</label>
                        <input
                          type="number"
                          id="denda"
                          name="denda"
                          value={formDataBarang.denda}
                          onChange={handleChange}
                          placeholder="Contoh: 50000"
                          min="1"
                          required
                        />
                        <small>Besaran denda jika barang terlambat dikembalikan</small>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Syarat & Ketentuan Sewa</h3>
                      
                      <div className="form-group">
                        <label htmlFor="syaratSewa">Persyaratan Penyewaan Barang</label>
                        <textarea
                          id="syaratSewa"
                          name="syaratSewa"
                          value={formDataBarang.syaratSewa}
                          onChange={handleChange}
                          placeholder="Contoh: Wajib meninggalkan KTP, Minimal durasi sewa 1 hari, Pembayaran dimulai dari waktu penjemputan"
                          rows="4"
                          required
                        ></textarea>
                        <small>Contoh ketentuan: Wajib meninggalkan KTP, Jaminan uang, Minimal/Maksimal durasi sewa, dll</small>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Media</h3>
                      <div className="form-group">
                        <label htmlFor="images">Foto Barang</label>
                        <div className="file-upload">
                          <input
                            type="file"
                            id="images"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                          <span className="file-info">📷 Pilih 1 atau lebih foto (JPG, PNG, GIF)</span>
                        </div>
                        {formDataBarang.images.length > 0 && (
                          <div className="image-preview">
                            ✅ {formDataBarang.images.length} foto dipilih
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  // Form Jasa
                  <>
                    <div className="form-section">
                      <h3>Informasi Layanan Jasa</h3>
                      
                      <div className="form-group">
                        <label htmlFor="spesialisasi">Spesialisasi Jasa</label>
                        <input
                          type="text"
                          id="spesialisasi"
                          name="spesialisasi"
                          value={formDataJasa.spesialisasi}
                          onChange={handleChange}
                          placeholder="Contoh: Cleaning Service, Konsultasi IT, Fotografi"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="deskripsi">Deskripsi Layanan</label>
                        <textarea
                          id="deskripsi"
                          name="deskripsi"
                          value={formDataJasa.deskripsi}
                          onChange={handleChange}
                          placeholder="Jelaskan detail layanan jasa Anda, proses, durasi, dll..."
                          rows="4"
                          required
                        ></textarea>
                      </div>

                      <div className="form-group">
                        <label htmlFor="benefit">Benefit/Keuntungan</label>
                        <textarea
                          id="benefit"
                          name="benefit"
                          value={formDataJasa.benefit}
                          onChange={handleChange}
                          placeholder="Contoh: - Berpengalaman 5 tahun&#10;- Harga kompetitif&#10;- Pekerjaan cepat dan rapi"
                          rows="4"
                          required
                        ></textarea>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Jangkauan & Operasional</h3>
                      
                      <div className="form-group">
                        <label>
                          Jangkauan Wilayah (Area Cover) 
                          <span style={{ color: '#dc2626', fontSize: '16px', marginLeft: '4px' }}>*</span>
                          {formDataJasa.jangkauanWilayah.length > 0 && (
                            <span style={{ color: '#22c55e', marginLeft: '8px', fontSize: '14px' }}>✓ {formDataJasa.jangkauanWilayah.length} area dipilih</span>
                          )}
                        </label>
                        
                        {/* Tab Pulau */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
                          {Object.keys(WILAYAH_DATA).map((pulau) => (
                            <button
                              key={pulau}
                              onClick={() => {
                                setActiveWilayahTab(pulau);
                                setSelectedProvinsi(null); // Reset provinsi selection saat ganti tab
                              }}
                              style={{
                                padding: '12px 16px',
                                background: activeWilayahTab === pulau ? '#7c3aed' : 'transparent',
                                color: activeWilayahTab === pulau ? 'white' : '#666',
                                border: activeWilayahTab === pulau ? 'none' : '1px solid #ddd',
                                borderRadius: '8px 8px 0 0',
                                cursor: 'pointer',
                                fontWeight: activeWilayahTab === pulau ? '600' : '500',
                                fontSize: '14px',
                                transition: 'all 0.2s'
                              }}
                            >
                              {pulau}
                            </button>
                          ))}
                        </div>

                        {/* Konten Provinsi & Kota */}
                        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                            
                            {/* Kolom Provinsi */}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📍 Provinsi</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {Object.keys(WILAYAH_DATA[activeWilayahTab]).map((provinsi) => (
                                  <button
                                    key={provinsi}
                                    onClick={() => setSelectedProvinsi(provinsi)}
                                    style={{
                                      padding: '12px 14px',
                                      textAlign: 'left',
                                      background: selectedProvinsi === provinsi ? '#7c3aed' : '#white',
                                      color: selectedProvinsi === provinsi ? 'white' : '#333',
                                      border: selectedProvinsi === provinsi ? '2px solid #7c3aed' : '1px solid #ddd',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontWeight: selectedProvinsi === provinsi ? '600' : '500',
                                      fontSize: '14px',
                                      transition: 'all 0.2s',
                                      boxShadow: selectedProvinsi === provinsi ? '0 2px 8px rgba(124, 58, 237, 0.2)' : 'none'
                                    }}
                                  >
                                    {selectedProvinsi === provinsi ? '✓ ' : ''}{provinsi}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Kolom Kota */}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏙️ Kota</div>
                              {selectedProvinsi ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                  {WILAYAH_DATA[activeWilayahTab][selectedProvinsi].map((kota) => (
                                    <label
                                      key={kota}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer',
                                        padding: '10px',
                                        background: formDataJasa.jangkauanWilayah.includes(kota) ? '#dbeafe' : '#fff',
                                        border: formDataJasa.jangkauanWilayah.includes(kota) ? '2px solid #3b82f6' : '1px solid #ddd',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s',
                                        fontWeight: formDataJasa.jangkauanWilayah.includes(kota) ? '600' : '500'
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formDataJasa.jangkauanWilayah.includes(kota)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFormDataJasa(prev => ({
                                              ...prev,
                                              jangkauanWilayah: [...prev.jangkauanWilayah, kota]
                                            }));
                                          } else {
                                            setFormDataJasa(prev => ({
                                              ...prev,
                                              jangkauanWilayah: prev.jangkauanWilayah.filter(w => w !== kota)
                                            }));
                                          }
                                        }}
                                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                      />
                                      <span style={{ fontSize: '14px' }}>{kota}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '14px', background: '#f0f0f0', borderRadius: '8px' }}>
                                  Pilih provinsi untuk melihat kota
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Selected Cities Display */}
                        {formDataJasa.jangkauanWilayah.length > 0 && (
                          <div style={{ padding: '14px', background: '#dbeafe', borderRadius: '8px', marginBottom: '8px', border: '2px solid #3b82f6' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af', marginBottom: '10px' }}>
                              ✓ {formDataJasa.jangkauanWilayah.length} Kota Dipilih:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {formDataJasa.jangkauanWilayah.map((kota) => (
                                <span
                                  key={kota}
                                  style={{
                                    background: '#3b82f6',
                                    color: 'white',
                                    padding: '8px 14px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                                  }}
                                >
                                  {kota}
                                  <button
                                    onClick={() => setFormDataJasa(prev => ({
                                      ...prev,
                                      jangkauanWilayah: prev.jangkauanWilayah.filter(w => w !== kota)
                                    }))}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '18px',
                                      padding: '0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      lineHeight: '1'
                                    }}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <small style={{ display: 'block', marginTop: '8px', color: '#666' }}>Pilih kota/area yang bisa Anda layani (Minimal 1)</small>
                      </div>

                      <div className="form-group">
                        <label>
                          Jam Operasional (Waktu Ketersediaan)
                          <span style={{ color: '#dc2626', fontSize: '16px', marginLeft: '4px' }}>*</span>
                          {formDataJasa.jamOperasionalHari.length > 0 && (
                            <span style={{ color: '#22c55e', marginLeft: '8px', fontSize: '14px' }}>✓ {formDataJasa.jamOperasionalHari.length} hari dipilih</span>
                          )}
                        </label>
                        
                        {/* Pemilihan Hari */}
                        <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>📅 Pilih Hari Kerja:</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((hari) => (
                              <label
                                key={hari}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '12px',
                                  background: formDataJasa.jamOperasionalHari.includes(hari) ? '#dbeafe' : '#f3f4f6',
                                  border: formDataJasa.jamOperasionalHari.includes(hari) ? '2px solid #3b82f6' : '1px solid #ddd',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  fontWeight: formDataJasa.jamOperasionalHari.includes(hari) ? '600' : '500'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={formDataJasa.jamOperasionalHari.includes(hari)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormDataJasa(prev => ({
                                        ...prev,
                                        jamOperasionalHari: [...prev.jamOperasionalHari, hari]
                                      }));
                                    } else {
                                      setFormDataJasa(prev => ({
                                        ...prev,
                                        jamOperasionalHari: prev.jamOperasionalHari.filter(h => h !== hari)
                                      }));
                                    }
                                  }}
                                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: '14px' }}>{hari}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Jam Buka dan Tutup - Sejajar */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', alignItems: 'end' }}>
                          <div>
                            <label htmlFor="jamOperasionalDari" style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>⏰ Jam Buka</label>
                            <input
                              type="time"
                              id="jamOperasionalDari"
                              value={formDataJasa.jamOperasionalDari}
                              onChange={(e) => setFormDataJasa(prev => ({ ...prev, jamOperasionalDari: e.target.value }))}
                              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'inherit' }}
                            />
                          </div>

                          <div>
                            <label htmlFor="jamOperasionalSampai" style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>⏰ Jam Tutup</label>
                            <input
                              type="time"
                              id="jamOperasionalSampai"
                              value={formDataJasa.jamOperasionalSampai}
                              onChange={(e) => setFormDataJasa(prev => ({ ...prev, jamOperasionalSampai: e.target.value }))}
                              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'inherit' }}
                            />
                          </div>
                        </div>

                        {/* Display Jam Operasional */}
                        {formDataJasa.jamOperasionalHari.length > 0 && (
                          <div style={{ marginTop: '16px', padding: '12px', background: '#dcfce7', borderRadius: '8px', border: '2px solid #22c55e' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '8px' }}>
                              ✓ Jadwal Kerja:
                            </div>
                            <div style={{ fontSize: '14px', color: '#166534', fontWeight: '600' }}>
                              {formDataJasa.jamOperasionalHari.join(', ')}
                            </div>
                            <div style={{ fontSize: '13px', color: '#166534', marginTop: '6px' }}>
                              Jam: {formDataJasa.jamOperasionalDari} - {formDataJasa.jamOperasionalSampai}
                            </div>
                          </div>
                        )}

                        <small style={{ marginTop: '8px', display: 'block', color: '#666' }}>Pilih hari kerja dan rentang jam ketika Anda tersedia melayani order</small>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Estimasi & Garansi</h3>
                      
                      <div className="form-group">
                        <label htmlFor="estimasiPengerjaan">Estimasi Pengerjaan</label>
                        <input
                          type="text"
                          id="estimasiPengerjaan"
                          name="estimasiPengerjaan"
                          value={formDataJasa.estimasiPengerjaan}
                          onChange={handleChange}
                          placeholder="Contoh: 1-3 Hari atau Selesai dalam 2 jam"
                          required
                        />
                        <small>Berapa lama waktu yang diperlukan untuk menyelesaikan pekerjaan?</small>
                      </div>

                      <div className="form-group">
                        <label htmlFor="garansiLayanan">SLA (Service Level Agreement) / Estimasi Jaminan</label>
                        <textarea
                          id="garansiLayanan"
                          name="garansiLayanan"
                          value={formDataJasa.garansiLayanan}
                          onChange={handleChange}
                          placeholder="Contoh: User wajib menyediakan akses listrik dan air atau Pembatalan kurang dari 24 jam dikenakan 20%"
                          rows="3"
                          required
                        ></textarea>
                        <small>Jelaskan garansi layanan, terms, atau kondisi khusus yang perlu diketahui pelanggan</small>
                      </div>

                      <div className="form-group">
                        <label htmlFor="tarif">Tarif Jasa (Rp/Jam)</label>
                        <input
                          type="number"
                          id="tarif"
                          name="tarif"
                          value={formDataJasa.tarif}
                          onChange={handleChange}
                          placeholder="Contoh: 150000"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Media</h3>
                      <div className="form-group">
                        <label htmlFor="images">Foto Portfolio/Layanan</label>
                        <div className="file-upload">
                          <input
                            type="file"
                            id="images"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                          <span className="file-info">📷 Pilih 1 atau lebih foto (JPG, PNG, GIF)</span>
                        </div>
                        {formDataJasa.images.length > 0 && (
                          <div className="image-preview">
                            ✅ {formDataJasa.images.length} foto dipilih
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button type="submit" className="btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? '⏳ Sedang memproses...' : '➕ Tambahkan Item'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Page Layout */
        .vendor-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f3ff 0%, #f0f4ff 100%);
        }

        /* Navbar */
        .navbar {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-logo {
          font-size: 20px;
          font-weight: 700;
          color: #7c3aed;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }

        .nav-logo:hover {
          color: #a855f7;
          opacity: 0.9;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-link {
          color: #666;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.3s;
          padding: 6px 12px;
          border-radius: 6px;
        }

        .nav-link:hover {
          color: #7c3aed;
          background: #f3f4f6;
        }

        .btn-logout {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-logout:hover {
          background: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .btn-logout:active {
          transform: translateY(0);
        }

        /* Content Area */
        .vendor-content {
          max-width: 700px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .vendor-header {
          margin-bottom: 40px;
          text-align: center;
        }

        .vendor-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 12px 0;
        }

        .greeting {
          font-size: 18px;
          color: #666;
          margin: 0;
          font-weight: 500;
        }

        .subtitle {
          font-size: 14px;
          color: #999;
          margin: 8px 0 0 0;
        }

        /* Form Wrapper */
        .vendor-form-wrapper {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        /* Vendor Type Selection */
        .vendor-type-selection {
          padding: 20px 0;
        }

        .type-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 24px;
        }

        .type-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .type-button:hover {
          border-color: #7c3aed;
          background: #f0f4ff;
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(124, 58, 237, 0.15);
        }

        .type-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .type-title {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .type-desc {
          font-size: 13px;
          color: #666;
          text-align: center;
        }

        /* Vendor Type Header */
        .vendor-type-header {
          margin-bottom: 32px;
          display: flex;
          align-items: flex-start;
          gap: 20px;
        }

        .btn-back {
          padding: 10px 16px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          color: #666;
          transition: all 0.2s ease;
          white-space: nowrap;
          margin-top: 4px;
        }

        .btn-back:hover {
          background: #e5e7eb;
          color: #7c3aed;
        }

        .vendor-type-header h2 {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
        }

        /* Form Sections */
        .form-section {
          margin-bottom: 32px;
        }

        .form-section h3 {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #f3f4f6;
        }

        /* Form Groups */
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 600;
          margin-bottom: 8px;
          color: #1a1a1a;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .required-badge {
          background: #f3f4f6;
          color: #666;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group textarea {
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          color: #1a1a1a;
          transition: all 0.3s ease;
        }

        .form-group input[type="text"]:focus,
        .form-group input[type="number"]:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .char-counter {
          color: #999;
          margin-top: 6px;
          font-size: 12px;
        }

        .form-group > small {
          color: #999;
          margin-top: 6px;
          font-size: 12px;
        }

        /* File Upload */
        .file-upload {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 24px;
          background: #f9fafb;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .file-upload:hover {
          border-color: #7c3aed;
          background: #f0f4ff;
        }

        .file-upload input[type="file"] {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }

        .file-info {
          color: #666;
          font-size: 14px;
          font-weight: 500;
          pointer-events: none;
        }

        .image-preview {
          background: #dcfce7;
          color: #166534;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          margin-top: 12px;
          border: 1px solid #bbf7d0;
        }

        /* Alerts */
        .alert {
          padding: 14px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 500;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        /* Form Actions */
        .form-actions {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid #f3f4f6;
        }

        .btn-submit {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(124, 58, 237, 0.3);
        }

        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .navbar {
            flex-direction: column;
            gap: 12px;
            padding: 12px 16px;
          }

          .nav-left,
          .nav-right {
            width: 100%;
            justify-content: space-between;
          }

          .vendor-content {
            margin: 24px auto;
          }

          .vendor-form-wrapper {
            padding: 24px;
          }

          .vendor-header h1 {
            font-size: 24px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .type-buttons {
            grid-template-columns: 1fr;
          }

          .vendor-type-header {
            flex-direction: column;
          }

          .btn-back {
            width: 100%;
          }

          .form-section {
            margin-bottom: 24px;
          }
        }
      `}</style>
    </div>
  );
}
