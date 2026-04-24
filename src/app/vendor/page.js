'use client';

import React, { useState, useEffect } from 'react';
import SharedNavbar from '../components/SharedNavbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VendorProductForm from './VendorProductForm';

const RENTAL_CATEGORIES = {
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

export default function VendorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vendorItems, setVendorItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  
  const [formData, setFormData] = useState({
    mainCategory: '',
    subCategory: '',
    title: '',
    shortDescription: '',
    description: '',
    price: '',
    minimumDays: 1,
    quantity: '',
    rentalPolicy: '',
    location: '',
    images: []
  });

  useEffect(() => {
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
    fetchVendorItems(parsedUser.id);
    setIsLoading(false);
  }, [router]);

  const fetchVendorItems = async (vendorId) => {
    try {
      const response = await fetch(`/api/vendor/services?vendorId=${vendorId}`);
      const data = await response.json();
      if (data.success) {
        setVendorItems(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching vendor items:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validasi form
    const missingFields = [];
    if (!formData.mainCategory) missingFields.push('Kategori Utama');
    if (!formData.subCategory && RENTAL_CATEGORIES[formData.mainCategory]?.length > 0) missingFields.push('Sub Kategori');
    if (!formData.title) missingFields.push('Nama Item');
    if (!formData.shortDescription) missingFields.push('Deskripsi Singkat');
    if (!formData.price) missingFields.push('Harga per Hari');
    if (!formData.quantity) missingFields.push('Jumlah Item');
    if (!formData.location) missingFields.push('Lokasi Pickup');

    if (missingFields.length > 0) {
      setErrorMsg('Bidang yang belum diisi:\n• ' + missingFields.join('\n• '));
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        vendorId: user.id,
        vendorName: user.name,
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory,
        category: formData.mainCategory, // Untuk kompatibilitas
        title: formData.title,
        shortDescription: formData.shortDescription,
        detailDescription: formData.description,
        description: formData.description,
        price: parseInt(formData.price),
        minimumDays: parseInt(formData.minimumDays),
        quantity: parseInt(formData.quantity),
        rentalPolicy: formData.rentalPolicy,
        location: formData.location,
        images: formData.images.filter(img => typeof img === 'string' && img.startsWith('data:') || img.startsWith('http')),
        rating: 0,
        rentCount: 0
      };

      // Jika edit, tambahkan ID ke request
      if (editingItemId) {
        submitData.id = editingItemId;
      }

      const response = await fetch('/api/vendor/services', {
        method: editingItemId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (data.success) {
        const message = editingItemId ? '✅ Item sewa berhasil diperbarui!' : '✅ Item sewa berhasil ditambahkan!';
        setSuccessMsg(message);
        setFormData({
          mainCategory: '',
          subCategory: '',
          title: '',
          shortDescription: '',
          description: '',
          price: '',
          minimumDays: 1,
          quantity: '',
          rentalPolicy: '',
          location: '',
          images: []
        });
        setShowAddForm(false);
        setEditingItemId(null);
        
        // Refresh items list
        fetchVendorItems(user.id);
        
        setTimeout(() => {
          setSuccessMsg('');
        }, 3000);
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan item');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = (item) => {
    setFormData({
      mainCategory: item.mainCategory || item.category || '',
      subCategory: item.subCategory || '',
      title: item.title || '',
      shortDescription: item.shortDescription || '',
      description: item.description || item.detailDescription || '',
      price: item.price?.toString() || '',
      minimumDays: item.minimumDays || 1,
      quantity: item.quantity?.toString() || '',
      rentalPolicy: item.rentalPolicy || '',
      location: item.location || '',
      images: item.images || []
    });
    setEditingItemId(item.id);
    setShowAddForm(true);
    setErrorMsg('');
    setSuccessMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus item ini?')) return;

    try {
      const response = await fetch(`/api/vendor/services?id=${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: user.id })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg('✅ Item sewa berhasil dihapus!');
        fetchVendorItems(user.id);
        setTimeout(() => {
          setSuccessMsg('');
        }, 3000);
      } else {
        setErrorMsg(data.message || 'Gagal menghapus item');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>⏳ Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <SharedNavbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            📊 Dashboard Vendor
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Halo {user.name}! 👋 Kelola dan tambahkan item sewa kamu di sini
          </p>
        </div>

        {successMsg && (
          <div style={{
            background: '#dcfce7',
            border: '2px solid #86efac',
            color: '#166534',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: '#fee2e2',
            border: '2px solid #fca5a5',
            color: '#991b1b',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            whiteSpace: 'pre-wrap'
          }}>
            {errorMsg}
          </div>
        )}

        {/* Add Item Button */}
        {!showAddForm && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingItemId(null);
              setFormData({
                mainCategory: '',
                subCategory: '',
                title: '',
                shortDescription: '',
                description: '',
                price: '',
                minimumDays: 1,
                quantity: '',
                rentalPolicy: '',
                location: '',
                images: []
              });
            }}
            style={{
              padding: '12px 24px',
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '32px'
            }}
          >
            ➕ Tambah Item Sewa Baru
          </button>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div style={{ marginBottom: '40px' }}>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingItemId(null);
                setFormData({
                  mainCategory: '',
                  subCategory: '',
                  title: '',
                  shortDescription: '',
                  description: '',
                  price: '',
                  minimumDays: 1,
                  quantity: '',
                  rentalPolicy: '',
                  location: '',
                  images: []
                });
              }}
              style={{
                padding: '8px 16px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              ← Batal
            </button>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                {editingItemId ? '✏️ Edit Item Sewa' : '➕ Tambah Item Sewa Baru'}
              </h3>
            </div>
            <VendorProductForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              errorMsg=""
              successMsg=""
              isEditing={!!editingItemId}
            />
          </div>
        )}

        {/* Items List */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
            📦 Item Sewa Kamu ({vendorItems.length})
          </h2>
          
          {vendorItems.length === 0 ? (
            <div style={{
              background: '#f3f4f6',
              padding: '32px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#666'
            }}>
              <p style={{ fontSize: '16px' }}>Belum ada item sewa. Mulai tambahkan item pertamamu! 🎉</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {vendorItems.map(item => (
                <div key={item.id} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'white'
                }}>
                  <div style={{
                    background: '#f3f4f6',
                    height: '150px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    fontSize: '48px'
                  }}>
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : '📦'}
                  </div>
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                      {item.title}
                    </h3>
                    <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '14px' }}>
                      {item.shortDescription}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: '#666' }}>
                      <span>💰 Rp {item.price?.toLocaleString('id-ID')}/hari</span>
                      <span>📊 {item.rentCount || 0} disewa</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleEditItem(item)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#7c3aed',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
