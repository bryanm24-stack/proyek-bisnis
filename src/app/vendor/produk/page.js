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
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoForm, setPromoForm] = useState({
    title: '',
    image: '',
    promoPrice: '',
    description: '',
    active: true,
    startAt: '',
    endAt: '',
    maxApplicants: ''
  });
  const [vendorPromos, setVendorPromos] = useState([]);
  const [promosLoading, setPromosLoading] = useState(false);
  const [promoNow, setPromoNow] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const getSafeImages = (rawImages) => {
    if (Array.isArray(rawImages)) return rawImages;
    if (typeof rawImages === 'string') {
      try {
        const parsed = JSON.parse(rawImages);
        return Array.isArray(parsed) ? parsed : rawImages.trim() ? [rawImages] : [];
      } catch {
        return rawImages.trim() ? [rawImages] : [];
      }
    }
    return [];
  };

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
    fetchVendorPromos(parsedUser.id);
  }, [router]);

  useEffect(() => {
    setPromoNow(Date.now());
    const timer = setInterval(() => setPromoNow(Date.now()), 1000);
    return () => clearInterval(timer);
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

  const fetchVendorPromos = async (vendorId) => {
    if (!vendorId) return;
    setPromosLoading(true);
    try {
      const response = await fetch(`/api/promos?vendorId=${vendorId}`);
      const data = await response.json();
      if (data.success) {
        setVendorPromos(Array.isArray(data.data) ? data.data : []);
      } else {
        setVendorPromos([]);
      }
    } catch (error) {
      console.error('Error fetching vendor promos:', error);
      setVendorPromos([]);
    } finally {
      setPromosLoading(false);
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!user?.id || !promoId) return;
    if (!confirm('Hapus promo ini?')) return;

    try {
      const response = await fetch(`/api/promos?promoId=${promoId}&vendorId=${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoId, vendorId: user.id })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal menghapus promo.');
      }

      setVendorPromos((prev) => prev.filter((promo) => String(promo.id) !== String(promoId)));
      alert('✅ Promo berhasil dihapus');
    } catch (error) {
      console.error('Error deleting promo:', error);
      alert(error.message || '❌ Gagal menghapus promo');
    }
  };

  const formatPromoCountdown = (endAt) => {
    if (!endAt) return 'Tanpa batas waktu';
    if (promoNow === 0) return 'Memuat...';
    
    const diff = new Date(endAt).getTime() - promoNow;
    if (diff <= 0) return 'Berakhir';

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}h ${hours}j ${minutes}m`;
    return `${hours}j ${minutes}m ${seconds}d`;
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

  const openPromoModal = () => {
    setPromoForm({
      title: '',
      image: '',
      promoPrice: '',
      description: '',
      active: true,
      startAt: '',
      endAt: '',
      maxApplicants: ''
    });
    setPromoMessage('');
    setPromoModalOpen(true);
  };

  const closePromoModal = () => {
    setPromoModalOpen(false);
    setPromoMessage('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPromoForm(prev => ({ ...prev, image: event.target.result }));
        };
        reader.readAsDataURL(file);
      } else {
        setPromoMessage('❌ Hanya file gambar yang bisa di-drag. Gunakan format: JPG, PNG, WebP');
      }
    }
  };

  const handleCreatePromo = async (event) => {
    event.preventDefault();
    if (!user) return;

    const parsedPrice = Number.parseInt(promoForm.promoPrice, 10);
    if (!promoForm.title || !promoForm.image || !promoForm.promoPrice || isNaN(parsedPrice)) {
      setPromoMessage('Judul promo, gambar, dan harga promo wajib diisi dengan format yang benar.');
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
          title: promoForm.title,
          image: promoForm.image,
          promoPrice: parsedPrice,
          description: promoForm.description,
          active: promoForm.active,
          startAt: promoForm.startAt || null,
          endAt: promoForm.endAt || null,
          maxApplicants: promoForm.maxApplicants === '' ? null : Number.parseInt(promoForm.maxApplicants, 10)
        })
      });

      const data = await response.json();
      if (!data.success) {
        setPromoMessage(data.message || 'Gagal membuat promo.');
        return;
      }

      setPromoMessage('✅ Promo berhasil dibuat dan siap tampil di home customer.');
      fetchVendorPromos(user.id);
      setTimeout(() => closePromoModal(), 1500);
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
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            📦 Barang/Jasa Saya
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Kelola semua item sewa kamu di sini
          </p>
        </div>

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
                e.target.style.borderColor = '#B28A67';
                e.target.style.boxShadow = '0 0 0 3px rgba(178, 138, 103, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: '22px' }}>🎁 Promo Vendor</h2>
          {promosLoading ? (
            <div style={{ color: '#666' }}>Memuat promo...</div>
          ) : vendorPromos.length === 0 ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', color: '#64748b' }}>
              Belum ada promo yang dibuat.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {vendorPromos.map((promo) => {
                const maxApplicants = Number.isFinite(Number(promo.maxApplicants)) ? Number(promo.maxApplicants) : null;
                const claimedCount = Number(promo.claimedCount || 0);
                const remaining = maxApplicants === null ? null : Math.max(0, maxApplicants - claimedCount);
                const isExpired = Boolean(promo.endAt && promoNow > 0 && new Date(promo.endAt).getTime() <= promoNow);
                const isUpcoming = Boolean(promo.startAt && promoNow > 0 && new Date(promo.startAt).getTime() > promoNow);

                return (
                  <div key={promo.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontWeight: '700', color: '#111827' }}>{promo.title}</div>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '999px', background: promo.active === false ? '#e5e7eb' : '#dcfce7', color: promo.active === false ? '#374151' : '#166534' }}>
                        {promo.active === false ? 'Nonaktif' : 'Aktif'}
                      </span>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#334155' }}>Harga promo: Rp {Number(promo.promoPrice || 0).toLocaleString('id-ID')}</div>
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                      Countdown: {formatPromoCountdown(promo.endAt)}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                      Kuota: {remaining === null ? 'Tak terbatas' : `${remaining} tersisa dari ${maxApplicants}`}
                    </div>
                    {(isExpired || isUpcoming) && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: isExpired ? '#b91c1c' : '#92400e', fontWeight: '600' }}>
                        {isExpired ? 'Promo sudah berakhir' : 'Promo belum dimulai'}
                      </div>
                    )}
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleDeletePromo(promo.id)}
                        style={{ padding: '7px 10px', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2', color: '#b91c1c', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                      >
                        🗑 Hapus Promo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
                    background: '#B28A67',
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
            {filteredItems.map(item => {
              const itemImages = getSafeImages(item.images);
              return (
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
                  {itemImages.length > 0 ? (
                    <>
                      <img 
                        src={itemImages[currentImageIndex[item.id] || 0]} 
                        alt={item.title} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          transition: 'opacity 0.3s ease'
                        }} 
                      />
                      
                      {itemImages.length > 1 && (
                        <>
                          <button
                            onClick={(e) => handlePrevImage(e, item.id, itemImages.length)}
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
                          
                          <button
                            onClick={(e) => handleNextImage(e, item.id, itemImages.length)}
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
                            {itemImages.map((_, idx) => (
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
                      
                      {itemImages.length > 1 && (
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
                          {(currentImageIndex[item.id] || 0) + 1}/{itemImages.length}
                        </div>
                      )}
                    </>
                  ) : '📦'}
                </div>

                <div style={{ padding: '16px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '13px', lineHeight: '1.4' }}>
                    {item.shortDescription}
                  </p>

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

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(item.id)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: '#B28A67',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#8F6B4A'}
                      onMouseLeave={(e) => e.target.style.background = '#B28A67'}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => openPromoModal()}
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
              );
            })}
          </div>
        )}

      </div>

      {promoModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
          onClick={closePromoModal}
        >
          <div
            style={{ width: '100%', maxWidth: '620px', maxHeight: 'calc(100vh - 48px)', background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #C8A587, #B28A67)', color: 'white', flexShrink: 0 }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Buat promosi menarik tanpa kode promo</div>
              <h3 style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: '800' }}>✨ Add Promo</h3>
            </div>

            <form onSubmit={handleCreatePromo} style={{ padding: '28px', display: 'grid', gap: '18px', overflow: 'auto', flex: 1 }}>
              {promoForm.image && promoForm.title && (
                <div style={{ 
                  width: '100%', 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  background: 'linear-gradient(135deg, #1f2937, #111827)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                  position: 'relative'
                }}>
                  <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                    <img
                      src={promoForm.image}
                      alt="Preview promo"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        opacity: 0.6
                      }}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x200?text=Gambar+Error';
                      }}
                    />
                    
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '20px'
                    }}>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>PENAWARAN SPESIAL</div>
                      <div style={{ fontSize: '32px', fontWeight: '900', color: '#fbbf24', marginBottom: '12px' }}>
                        Rp {Number(promoForm.promoPrice || 0).toLocaleString('id-ID')}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: 'white', lineHeight: '1.3' }}>
                        {promoForm.title}
                      </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', fontSize: '12px', color: '#e2e8f0' }}>
                          <span>⏳ {promoForm.endAt ? new Date(promoForm.endAt).toLocaleString('id-ID') : 'Tanpa batas waktu'}</span>
                          <span>👤 {promoForm.maxApplicants ? `${promoForm.maxApplicants} kuota` : 'Kuota tidak dibatasi'}</span>
                          <span>1x/user</span>
                        </div>
                    </div>
                  </div>
                  
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#dc2626',
                    color: 'white',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '800',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}>
                    ✨ PROMO
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Judul Promo *</label>
                <input
                  type="text"
                  value={promoForm.title}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Promo Sedekah - 3 Kursi & 2 Meja"
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Gambar Promo * (Drag & Drop atau Paste URL)</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    width: '100%',
                    padding: '20px',
                    border: dragOver ? '3px dashed #B28A67' : '2px dashed #d1d5db',
                    borderRadius: '12px',
                    background: dragOver ? '#ede9fe' : '#fafafa',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '120px'
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
                    {dragOver ? 'Lepas gambar di sini' : 'Drag gambar di sini atau paste URL'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Format: JPG, PNG, WebP (Maksimal 5MB)
                  </div>
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <input
                    type="text"
                    value={promoForm.image}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="Atau paste URL: https://example.com/promo-image.jpg"
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '12px', background: '#f9fafb' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Harga Promo (Rp) *</label>
                <input
                  type="number"
                  min="1"
                  value={promoForm.promoPrice}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, promoPrice: e.target.value }))}
                  placeholder="Contoh: 500000"
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px' }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>Harga final yang akan dibayar customer untuk promo ini</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Mulai Promo</label>
                  <input
                    type="datetime-local"
                    value={promoForm.startAt}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, startAt: e.target.value }))}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Selesai Promo</label>
                  <input
                    type="datetime-local"
                    value={promoForm.endAt}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, endAt: e.target.value }))}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Limit Applicant</label>
                <input
                  type="number"
                  min="1"
                  value={promoForm.maxApplicants}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, maxApplicants: e.target.value }))}
                  placeholder="Contoh: 50"
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px' }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>Kosongkan jika kuota tidak dibatasi. User tetap hanya bisa klaim 1 kali.</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Deskripsi Promo</label>
                <textarea
                  value={promoForm.description}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Contoh: Paket spesial berisi 3 kursi empuk dan 2 meja berkualitas. Penawaran terbatas untuk donasi amal."
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '10px', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={promoForm.active}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, active: e.target.checked }))}
                  style={{ cursor: 'pointer' }}
                />
                <span>Promo aktif dan langsung tampil di home customer</span>
              </label>

              {promoMessage && (
                <div style={{ padding: '12px 14px', borderRadius: '10px', background: promoMessage.startsWith('✅') ? '#ecfdf5' : '#fef2f2', color: promoMessage.startsWith('✅') ? '#166534' : '#991b1b', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                  {promoMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                <button type="button" onClick={closePromoModal} style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #d1d5db', background: 'white', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>Batal</button>
                <button type="submit" disabled={promoSubmitting} style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: promoSubmitting ? '#C8A587' : '#B28A67', color: 'white', fontWeight: '800', cursor: promoSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  {promoSubmitting ? '⏳ Menyimpan...' : '✨ Simpan Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}