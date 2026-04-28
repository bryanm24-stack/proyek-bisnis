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
  // ✅ NEW: Track current image index for each item
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [selectedPromoItem, setSelectedPromoItem] = useState(null);
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoForm, setPromoForm] = useState({
    promoCode: '',
    promoType: 'percent',
    promoValue: '',
    minSubtotal: '',
    description: '',
    active: true
  });

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

  // ✅ NEW: Handle image navigation
  const handleNextImage = (e, itemId, totalImages) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => ({
      ...prev,
      [itemId]: ((prev[itemId] || 0) + 1) % totalImages
    }));
  };

  const handlePrevImage = (e, itemId, totalImages) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => ({
      ...prev,
      [itemId]: ((prev[itemId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const openPromoModal = (item) => {
    const basePrice = Number(item.price || item.hargaBarang || item.hargaPerHari || 0);
    setSelectedPromoItem(item);
    setPromoForm({
      promoCode: '',
      promoType: 'percent',
      promoValue: basePrice > 0 ? Math.min(25, Math.max(10, Math.round(basePrice / 100000))) : 15,
      minSubtotal: basePrice > 0 ? basePrice : '',
      description: `Promo spesial untuk ${item.title || item.namaBarang || item.namaJasa}`,
      active: true
    });
    setPromoMessage('');
    setPromoModalOpen(true);
  };

  const closePromoModal = () => {
    setPromoModalOpen(false);
    setSelectedPromoItem(null);
    setPromoMessage('');
  };

  const handleCreatePromo = async (event) => {
    event.preventDefault();
    if (!selectedPromoItem || !user) return;

    if (!promoForm.promoValue) {
      setPromoMessage('Isi nilai promo terlebih dahulu.');
      return;
    }

    setPromoSubmitting(true);
    setPromoMessage('');

    try {
      const response = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: user.id,
          vendorName: user.name,
          productId: selectedPromoItem.id,
          productName: selectedPromoItem.title || selectedPromoItem.namaBarang || selectedPromoItem.namaJasa,
          productImage: selectedPromoItem.images?.[0] || '',
          originalPrice: selectedPromoItem.price || selectedPromoItem.hargaBarang || selectedPromoItem.hargaPerHari || 0,
          promoCode: promoForm.promoCode,
          promoType: promoForm.promoType,
          promoValue: Number.parseInt(promoForm.promoValue, 10),
          minSubtotal: Number.parseInt(promoForm.minSubtotal, 10) || 0,
          description: promoForm.description,
          active: promoForm.active
        })
      });

      const data = await response.json();
      if (!data.success) {
        setPromoMessage(data.message || 'Gagal membuat promo.');
        return;
      }

      setPromoMessage('✅ Promo berhasil dibuat dan siap tampil di detail customer.');
      setTimeout(() => closePromoModal(), 1000);
    } catch (error) {
      console.error('Error creating promo:', error);
      setPromoMessage('Terjadi kesalahan saat membuat promo.');
    } finally {
      setPromoSubmitting(false);
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
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {item.images && item.images.length > 0 ? (
                    <>
                      {/* Image Display */}
                      <img 
                        src={item.images[currentImageIndex[item.id] || 0]} 
                        alt={item.title} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          transition: 'opacity 0.3s ease'
                        }} 
                      />
                      
                      {/* ✅ Carousel Controls (only show if > 1 image) */}
                      {item.images.length > 1 && (
                        <>
                          {/* Prev Button */}
                          <button
                            onClick={(e) => handlePrevImage(e, item.id, item.images.length)}
                            style={{
                              position: 'absolute',
                              left: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              border: 'none',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              zIndex: 10,
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.8)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}
                            title="Foto sebelumnya"
                          >
                            ◀
                          </button>
                          
                          {/* Next Button */}
                          <button
                            onClick={(e) => handleNextImage(e, item.id, item.images.length)}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              border: 'none',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              zIndex: 10,
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.8)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}
                            title="Foto berikutnya"
                          >
                            ▶
                          </button>
                          
                          {/* Image Counter/Dots */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              zIndex: 10,
                              display: 'flex',
                              gap: '4px'
                            }}
                          >
                            {item.images.map((_, idx) => (
                              <span
                                key={idx}
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: idx === (currentImageIndex[item.id] || 0) ? 'white' : 'rgba(255,255,255,0.5)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentImageIndex(prev => ({
                                    ...prev,
                                    [item.id]: idx
                                  }));
                                }}
                                title={`Foto ${idx + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      
                      {/* Photo count badge */}
                      {item.images.length > 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            zIndex: 9
                          }}
                        >
                          {(currentImageIndex[item.id] || 0) + 1}/{item.images.length}
                        </div>
                      )}
                    </>
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
                      onClick={() => openPromoModal(item)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: '#ecfeff',
                        color: '#0f766e',
                        border: '1px solid #a5f3fc',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#cffafe'}
                      onMouseLeave={(e) => e.target.style.background = '#ecfeff'}
                    >
                      ✨ Add Promo
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

      {promoModalOpen && selectedPromoItem && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
          onClick={closePromoModal}
        >
          <div
            style={{ width: '100%', maxWidth: '620px', background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Tambah promo untuk produk vendor</div>
              <h3 style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: '800' }}>✨ Add Promo</h3>
            </div>

            <form onSubmit={handleCreatePromo} style={{ padding: '28px', display: 'grid', gap: '18px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '16px', background: '#fafafa' }}>
                <div style={{ width: '84px', height: '84px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, background: '#e5e7eb' }}>
                  <img
                    src={selectedPromoItem.images?.[0] || 'https://via.placeholder.com/150x150?text=Promo'}
                    alt={selectedPromoItem.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Produk yang dipromosikan</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>{selectedPromoItem.title || selectedPromoItem.namaBarang || selectedPromoItem.namaJasa}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Harga dasar Rp {(selectedPromoItem.price || selectedPromoItem.hargaBarang || selectedPromoItem.hargaPerHari || 0).toLocaleString('id-ID')}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Kode Promo</label>
                  <input
                    type="text"
                    value={promoForm.promoCode}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, promoCode: e.target.value.toUpperCase() }))}
                    placeholder="Opsional, contoh: PROMOHEMAT"
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Tipe Diskon</label>
                  <select
                    value={promoForm.promoType}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, promoType: e.target.value }))}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px' }}
                  >
                    <option value="percent">Persen (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Nilai Promo</label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.promoValue}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, promoValue: e.target.value }))}
                    placeholder="Mis. 10"
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Minimal Transaksi</label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.minSubtotal}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, minSubtotal: e.target.value }))}
                    placeholder="Contoh: 100000"
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Deskripsi Promo</label>
                <textarea
                  value={promoForm.description}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Contoh: Diskon spesial untuk booking minggu ini."
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontFamily: 'inherit' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={promoForm.active}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, active: e.target.checked }))}
                />
                Promo aktif dan bisa langsung muncul di detail customer
              </label>

              {promoMessage && (
                <div style={{ padding: '12px 14px', borderRadius: '10px', background: promoMessage.startsWith('✅') ? '#ecfdf5' : '#fef2f2', color: promoMessage.startsWith('✅') ? '#166534' : '#991b1b', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                  {promoMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                <button type="button" onClick={closePromoModal} style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #d1d5db', background: 'white', fontWeight: '700', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={promoSubmitting} style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: promoSubmitting ? '#a78bfa' : '#7c3aed', color: 'white', fontWeight: '800', cursor: promoSubmitting ? 'not-allowed' : 'pointer' }}>
                  {promoSubmitting ? 'Menyimpan...' : 'Simpan Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
