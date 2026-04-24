'use client';

import React, { useState, useEffect } from 'react';
import SharedNavbar from '../../components/SharedNavbar';
import { useRouter } from 'next/navigation';

export default function VendorProdukPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [vendorItems, setVendorItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'vendor') {
      router.push('/');
      return;
    }

    setUser(parsedUser);
    fetchVendorItems(parsedUser.id);
  }, []);

  const fetchVendorItems = async (vendorId) => {
    try {
      const response = await fetch(`/api/vendor/services?vendorId=${vendorId}`);
      const data = await response.json();
      if (data.success) {
        setVendorItems(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching vendor items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (itemId) => {
    router.push(`/vendor/edit-produk?id=${itemId}`);
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus item ini?')) return;

    try {
      const response = await fetch(`/api/vendor/services?id=${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: user.id })
      });

      const data = await response.json();
      if (data.success) {
        setVendorItems(vendorItems.filter(item => item.id !== itemId));
        alert('✅ Item berhasil dihapus!');
      } else {
        alert('❌ Gagal menghapus item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('❌ Terjadi kesalahan');
    }
  };

  const filteredItems = vendorItems.filter(item =>
    (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.shortDescription || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div>
        <SharedNavbar />
        <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <SharedNavbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            📦 Barang/Jasa Saya
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Kelola semua item sewa kamu di sini
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="🔍 Cari barang/jasa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed';
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div style={{
            background: '#f3f4f6',
            padding: '48px 24px',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            {vendorItems.length === 0 ? (
              <div>
                <p style={{ fontSize: '16px', marginBottom: '16px' }}>Belum ada barang/jasa yang ditambahkan</p>
                <button
                  onClick={() => router.push('/vendor/tambah-produk')}
                  style={{
                    padding: '12px 24px',
                    background: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Tambahkan Sekarang
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '16px' }}>Tidak ada hasil yang cocok dengan pencarian</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {filteredItems.map(item => (
              <div key={item.id} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'white',
                transition: 'all 0.3s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                {/* Image */}
                <div style={{
                  background: '#f3f4f6',
                  height: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '48px',
                  overflow: 'hidden'
                }}>
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : '📦'}
                </div>

                {/* Content */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '13px', lineHeight: '1.4' }}>
                    {item.shortDescription}
                  </p>

                  {/* Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px', color: '#666' }}>
                    <div>
                      <div style={{ color: '#999', fontSize: '12px' }}>Harga/Hari</div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>
                        Rp {item.price?.toLocaleString('id-ID') || '0'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#999', fontSize: '12px' }}>Stok</div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>
                        {item.quantity || 0} item
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(item.id)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#6d28d9'}
                      onMouseLeave={(e) => e.target.style.background = '#7c3aed'}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: '#f3f4f6',
                        color: '#ef4444',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#fee2e2';
                        e.target.style.borderColor = '#fca5a5';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#f3f4f6';
                        e.target.style.borderColor = '#e5e7eb';
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
  );
}
