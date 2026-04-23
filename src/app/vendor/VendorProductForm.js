'use client';

import React, { useState } from 'react';

// Kategori yang fleksibel & lengkap
export const RENTAL_CATEGORIES = {
  'Elektronik': ['Laptop', 'Kamera', 'Proyektor', 'Drone', 'Speaker', 'Monitor', 'Printer', 'Gaming Console', 'Lainnya'],
  'Alat Olahraga': ['Sepeda', 'Papan Selancar', 'Peralatan Lari', 'Gym Equipment', 'Sepatu Olahraga', 'Tenda Camping', 'Lainnya'],
  'Furniture': ['Meja', 'Kursi', 'Lemari', 'Tempat Tidur', 'Sofa', 'Rak', 'Lainnya'],
  'Peralatan Acara': ['Sound System', 'Lighting', 'Dekorasi', 'Tenda Pesta', 'Kursi Event', 'Panggung Portable', 'Lainnya'],
  'Peralatan Rumah Tangga': ['Kulkas', 'Mesin Cuci', 'AC', 'Vacuum', 'Oven', 'Rice Cooker', 'Lainnya'],
  'Peralatan Konstruksi': ['Scaffolding', 'Crane', 'Mixer', 'Chainsaw', 'Generator', 'Kompressor', 'Lainnya'],
  'Kendaraan': ['Mobil', 'Motor', 'Mobil Bak', 'Sewa Driver', 'Lainnya'],
  'Peralatan Dapur': ['Piring Set', 'Gelas Set', 'Peralatan Masak', 'Meja Makan', 'Kursi Makan', 'Lainnya'],
  'Kostum & Fashion': ['Baju Pengantin', 'Kostum Cosplay', 'Pakaian Pesta', 'Aksesori', 'Tas Branded', 'Lainnya'],
  'Peralatan Fotografi': ['Studio Lighting', 'Tripod', 'Reflector', 'Backdrop', 'Lainnya'],
  'Peralatan Musik': ['Gitar', 'Keyboard', 'Drum', 'Microphone', 'Amplifier', 'Lainnya'],
  'Mainan & Anak': ['Playground', 'Bouncing Castle', 'Permainan Edukatif', 'Sepeda Anak', 'Lainnya'],
  'Jasa Profesional': ['Konsultasi', 'Pelatihan', 'Desain', 'Photography', 'Videography', 'Lainnya'],
  'Peralatan Outdoor': ['Tenda', 'Sleeping Bag', 'Rucksack', 'Cooking Gear', 'GPS Device', 'Lainnya'],
  'Lainnya': ['Tidak ada kategori', 'Custom Item']
};

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
  const [selectedMainCategory, setSelectedMainCategory] = useState(formData.mainCategory || '');
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Gunakan categories dari props atau default RENTAL_CATEGORIES
  const CATEGORIES = categories || RENTAL_CATEGORIES;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedMainCategory(category);
    setFormData(prev => ({
      ...prev,
      mainCategory: category,
      subCategory: '', // Reset subcategory saat main category berubah
      category: category // Untuk kompatibilitas
    }));
  };

  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (files) {
      const imageUrls = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        images: imageUrls
      }));
    }
  };

  const subCategories = selectedMainCategory ? (CATEGORIES[selectedMainCategory] || []) : [];

  return (
    <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '32px', color: '#1f2937' }}>
        {isEditing ? '✏️ Edit Item Sewa' : '➕ Tambah Item Sewa Baru'}
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
        {/* Kategori Utama */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            📦 Kategori Utama *
          </label>
          <select
            value={selectedMainCategory}
            onChange={handleCategoryChange}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            required
          >
            <option value="">Pilih Kategori...</option>
            {Object.keys(CATEGORIES).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Sub Kategori */}
        {subCategories.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              🏷️ Sub Kategori *
            </label>
            <select
              name="subCategory"
              value={formData.subCategory || ''}
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
            >
              <option value="">Pilih Sub Kategori...</option>
              {subCategories.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}

        {/* Nama Item */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            📝 Nama Item Sewa *
          </label>
          <input
            type="text"
            name="title"
            placeholder="Contoh: Laptop MacBook Pro 2024"
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

        {/* Deskripsi Singkat */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            ✍️ Deskripsi Singkat *
          </label>
          <textarea
            name="shortDescription"
            placeholder="Jelaskan singkat tentang item ini..."
            value={formData.shortDescription || ''}
            onChange={handleInputChange}
            rows="2"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
            required
          />
        </div>

        {/* Deskripsi Lengkap */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            📄 Deskripsi Lengkap & Spesifikasi
          </label>
          <textarea
            name="description"
            placeholder="Spesifikasi, kondisi, fitur, dll..."
            value={formData.description || ''}
            onChange={handleInputChange}
            rows="5"
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

        {/* Harga Sewa */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              💰 Harga per Hari (Rp) *
            </label>
            <input
              type="number"
              name="price"
              placeholder="Contoh: 50000"
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
              📅 Durasi Minimum Sewa (hari) *
            </label>
            <input
              type="number"
              name="minimumDays"
              placeholder="Contoh: 1"
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

        {/* Stok/Jumlah Tersedia */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            📊 Jumlah Item Tersedia *
          </label>
          <input
            type="number"
            name="quantity"
            placeholder="Contoh: 5"
            value={formData.quantity || ''}
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

        {/* Kebijakan Sewa */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            ⚖️ Kebijakan Sewa (Kerusakan, Denda, Syarat, dll)
          </label>
          <textarea
            name="rentalPolicy"
            placeholder="Contoh: Jaminan Rp500.000 | Biaya Kerusakan 20% dari harga sewa | Denda keterlambatan Rp50.000/hari"
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
            📍 Lokasi Pickup/Pengiriman *
          </label>
          <input
            type="text"
            name="location"
            placeholder="Alamat lengkap tempat pengambilan"
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
            📸 Foto Item (Upload hingga 5 foto)
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
                <img
                  key={idx}
                  src={img}
                  alt={`preview ${idx}`}
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }}
                />
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
            background: isSubmitting ? '#ccc' : '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isSubmitting ? '⏳ Memproses...' : isEditing ? '💾 Update Item Sewa' : '✅ Tambah Item Sewa'}
        </button>
      </form>
    </div>
  );
}
