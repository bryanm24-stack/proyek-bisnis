'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavbar from '../../components/SharedNavbar';

export default function FavoritesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedService, setSelectedService] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('packages');
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [serviceReviews, setServiceReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatData, setChatData] = useState(null);
  const [dealData, setDealData] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'customer') {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch favorites
        const favResponse = await fetch(`/api/favorites?userId=${parsedUser.id}`);
        const favData = await favResponse.json();
        setFavorites(Array.isArray(favData.data) ? favData.data : []);

        // Fetch all services
        const servicesResponse = await fetch('/api/vendor/services', { cache: 'no-store' });
        const servicesData = await servicesResponse.json();
        if (servicesData.success) {
          setServices(Array.isArray(servicesData.data) ? servicesData.data : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const removeFavorite = async (serviceId) => {
    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          serviceId,
          type: 'service'
        })
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(fav => fav.serviceId !== serviceId));
      } else {
        alert('Gagal menghapus dari favorit');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Error: ' + error.message);
    }
  };

  const openModal = (service) => {
    setSelectedService(service);
    setDetailTab('packages');
    setSelectedItemDetail(null);
    setServiceReviews([]);
    setReviewsLoading(true);
    setModalOpen(true);

    fetch(`/api/ratings?serviceId=${service.id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setServiceReviews(data.data || []);
        }
      })
      .catch((error) => {
        console.error('Error fetching service reviews:', error);
        setServiceReviews([]);
      })
      .finally(() => {
        setReviewsLoading(false);
      });
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedService(null);
    setSelectedItemDetail(null);
    setServiceReviews([]);
    setReviewsLoading(false);
    setDetailTab('packages');
  };

  const openChatModal = async (service) => {
    if (!user) {
      alert('Silakan login terlebih dahulu');
      return;
    }

    setSelectedService(service);
    setMessages([]);
    setNewMessage('');
    setChatModalOpen(true);
    setModalOpen(false);

    try {
      // Load existing chat if any
      const response = await fetch(`/api/chat?serviceId=${service.id}&customerId=${user.id}`);
      const data = await response.json();

      if (data.success && data.data) {
        setChatData(data.data);
        setMessages(data.data.messages || []);

        // Load deal status if chat exists
        if (data.data.id) {
          const dealResponse = await fetch(`/api/deals?chatId=${data.data.id}`);
          const dealDataResp = await dealResponse.json();
          if (dealDataResp.success && dealDataResp.data) {
            setDealData(dealDataResp.data);
            if (dealDataResp.data.status === 'completed') {
              setShowRatingForm(true);
            }
          }
        }
      } else {
        setChatData(null);
        setMessages([]);
        setDealData(null);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      setChatData(null);
      setMessages([]);
      setDealData(null);
    }
  };

  const closeChatModal = () => {
    setChatModalOpen(false);
    setSelectedService(null);
    setMessages([]);
    setNewMessage('');
    setChatData(null);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!selectedService) return;
    if (!user) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          serviceTitle: selectedService.title,
          vendorId: selectedService.vendorId,
          vendorName: selectedService.vendorName,
          customerId: user.id,
          customerName: user.name,
          message: newMessage,
          senderId: user.id,
          senderName: user.name
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        alert('Error: ' + (data.message || 'Failed to send message'));
        return;
      }

      setChatData(data.data);
      setMessages(data.data.messages || []);
      setNewMessage('');

      // Load deal status after sending message
      if (data.data?.id) {
        try {
          const dealResponse = await fetch(`/api/deals?chatId=${data.data.id}`);
          const dealDataResp = await dealResponse.json();
          if (dealDataResp.success && dealDataResp.data) {
            setDealData(dealDataResp.data);
          }
        } catch (error) {
          console.error('Error loading deal:', error);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error: ' + error.message);
    }
  };

  // Get favorite services details
  const favoriteServices = favorites
    .map(fav => services.find(s => s.id === fav.serviceId))
    .filter(Boolean);

  const filteredServices = filter === 'all'
    ? favoriteServices
    : favoriteServices.filter(s => {
        if (filter === 'popular') return parseInt(s.rentCount || 0) >= 100;
        if (filter === 'highrated') return parseFloat(s.rating || 0) >= 4.5;
        if (filter === 'recent') return true;
        return true;
      });

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <SharedNavbar />
      <div style={{ minHeight: 'calc(100vh - 300px)', padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '10px' }}>
            ❤️ Favorit Saya
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Total: <strong>{favoriteServices.length}</strong> layanan favorit
          </p>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px',
              border: filter === 'all' ? '2px solid #5A45D1' : '1px solid #ddd',
              background: filter === 'all' ? '#ede9fe' : 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: filter === 'all' ? '600' : '400'
            }}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('popular')}
            style={{
              padding: '8px 16px',
              border: filter === 'popular' ? '2px solid #FF6B6B' : '1px solid #ddd',
              background: filter === 'popular' ? '#FFE7E7' : 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: filter === 'popular' ? '600' : '400'
            }}
          >
            🔥 Populer
          </button>
          <button
            onClick={() => setFilter('highrated')}
            style={{
              padding: '8px 16px',
              border: filter === 'highrated' ? '2px solid #FFD700' : '1px solid #ddd',
              background: filter === 'highrated' ? '#FFFACD' : 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: filter === 'highrated' ? '600' : '400'
            }}
          >
            ⭐ Rating Tinggi
          </button>
        </div>

        {/* Services Grid */}
        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Memuat layanan...</p>
        ) : filteredServices.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Belum ada layanan favorit di kategori ini
          </p>
        ) : (
          <div className="vendor-grid">
            {filteredServices.map(service => {
              let rentCountNum = 0;
              if (typeof service.rentCount === 'string') {
                const parsed = parseInt(service.rentCount.replace(/[K,]/g, ''));
                rentCountNum = isNaN(parsed) ? 0 : parsed;
              } else {
                rentCountNum = service.rentCount;
              }
              
              const isPopular = rentCountNum >= 100;
              const shortDesc = service.detailDescription || service.shortDescription || (service.description ? service.description.substring(0, 80) + '...' : '');
              const imageUrl = service.image || (service.images && service.images.length > 0 ? service.images[0] : 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(service.title || 'Service'));
              
              return (
                <div key={service.id} className="vendor-card">
                  {isPopular && <div className="popular-badge">🔥 Populer</div>}
                  
                  {/* Favorite Button - Always Red Heart since this is favorites page */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(service.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: '#FF6B6B',
                      border: 'none',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      zIndex: 10,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.1)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                    }}
                    title="Hapus dari favorit"
                  >
                    ❤️
                  </button>
                  
                  {/* Cover Image */}
                  <div className="vendor-cover">
                    <img 
                      src={service.images && service.images.length > 0 
                        ? service.images[0]
                        : imageUrl} 
                      alt={service.title}
                    />
                  </div>
                  
                  <div className="vendor-content">
                    <h3 className="vendor-title">{service.title}</h3>
                    
                    <p className="vendor-vendor-name">{service.vendorName}</p>
                    
                    <p className="vendor-short-desc">
                      {shortDesc}
                    </p>
                    
                    <div className="vendor-stats">
                      <div className="stat-rating">
                        <span className="rating-stars">⭐ {Number(service.rating || 0).toFixed(1)}</span>
                        <span className="rating-count">({service.rentCount} disewa)</span>
                      </div>
                    </div>

                    <div className="vendor-footer">
                      <div className="vendor-price">
                        <span className="price-label">Rp</span>
                        <span className="price-amount">{(service.price || 0).toLocaleString('id-ID')}</span>
                        <span className="price-period">/ hari</span>
                      </div>

                      <button 
                        className="btn-detail"
                        onClick={() => openModal(service)}
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Detail Modal */}
      {modalOpen && selectedService && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px',
                borderBottom: '1px solid #eee',
                position: 'sticky',
                top: 0,
                background: 'white',
                zIndex: 10,
                borderRadius: '16px 16px 0 0'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
                {selectedService.title}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#999',
                  transition: 'color 0.3s',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#333';
                  e.target.style.background = '#f3f4f6';
                  e.target.style.borderRadius = '8px';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#999';
                  e.target.style.background = 'none';
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: '24px',
                overflowY: 'auto',
                maxHeight: 'calc(90vh - 92px)'
              }}
            >
              {/* Header Image */}
              <div style={{ height: '300px', overflow: 'hidden', backgroundColor: '#f0f0f0', marginBottom: '24px', borderRadius: '12px' }}>
                <img
                  src={selectedService.images?.[0] || 'https://via.placeholder.com/900x300?text=' + encodeURIComponent(selectedService.title || 'Service')}
                  alt={selectedService.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Price Block - Harga Sewa */}
              <div style={{
                backgroundColor: '#f0e6ff',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
                  Harga Sewa
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>Rp</span>
                  <span style={{ fontSize: '28px', fontWeight: '700', color: '#5A45D1' }}>
                    {(selectedService.price || 0).toLocaleString('id-ID')}
                  </span>
                  <span style={{ fontSize: '14px', color: '#666' }}>/ hari</span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', flexWrap: 'wrap' }}>
                {['packages', 'description', 'information', 'reviews'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    style={{
                      padding: '12px 16px',
                      background: 'transparent',
                      color: detailTab === tab ? '#5A45D1' : '#666',
                      border: 'none',
                      borderBottom: detailTab === tab ? '3px solid #5A45D1' : 'none',
                      cursor: 'pointer',
                      fontWeight: detailTab === tab ? '600' : '500',
                      fontSize: '14px',
                      transition: 'all 0.3s',
                      marginBottom: '-2px'
                    }}
                  >
                    {tab === 'packages' && '📦 Paket Tersedia'}
                    {tab === 'description' && '📝 Deskripsi Produk'}
                    {tab === 'information' && '📋 Informasi Penjual'}
                    {tab === 'reviews' && '⭐ Rating & Review'}
                  </button>
                ))}
              </div>
              {detailTab === 'packages' && (
                <div>
                  {selectedService.items && selectedService.items.length > 0 ? (
                    <>
                      {/* Package Gallery */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px'
                      }}>
                        {selectedService.items.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedItemDetail(item)}
                            style={{
                              cursor: 'pointer',
                              borderRadius: '14px',
                              overflow: 'hidden',
                              border: selectedItemDetail?.title === item.title ? '3px solid #5A45D1' : '1px solid #ddd',
                              transition: 'all 0.3s ease',
                              transform: selectedItemDetail?.title === item.title ? 'scale(1.05)' : 'scale(1)'
                            }}
                          >
                            <img
                              src={item.images?.[0] || 'https://via.placeholder.com/120x120?text=' + encodeURIComponent(item.title || 'Paket')}
                              alt={item.title}
                              style={{
                                width: '100%',
                                height: '120px',
                                objectFit: 'cover'
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Selected Item Details */}
                      {selectedItemDetail && (
                        <div style={{
                          backgroundColor: '#f8f9fa',
                          padding: '16px',
                          borderRadius: '14px',
                          marginTop: '16px'
                        }}>
                          <div style={{ marginBottom: '16px' }}>
                            <img
                              src={selectedItemDetail.images?.[0] || 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(selectedItemDetail.title || 'Paket')}
                              alt={selectedItemDetail.title}
                              style={{
                                width: '100%',
                                height: '200px',
                                objectFit: 'cover',
                                borderRadius: '14px'
                              }}
                            />
                          </div>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>
                            {selectedItemDetail.title}
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Harga</p>
                              <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#5A45D1' }}>
                                Rp {(selectedItemDetail.hargaPcs || selectedItemDetail.price || 0).toLocaleString('id-ID')}
                              </p>
                            </div>
                            {selectedItemDetail.stok && (
                              <div>
                                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Stok</p>
                                <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>{selectedItemDetail.stok}</p>
                              </div>
                            )}
                          </div>
                          <button
                            style={{
                              width: '100%',
                              padding: '12px',
                              backgroundColor: '#5A45D1',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '14px'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#4a3bb8'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#5A45D1'}
                          >
                            💬 Chat untuk Paket Ini
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
                      Belum ada paket tersedia
                    </p>
                  )}
                </div>
              )}

              {detailTab === 'description' && (
                <div>
                  {selectedService.shortDescription && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#666' }}>
                        📌 Deskripsi Singkat
                      </h4>
                      <p style={{ margin: 0, lineHeight: '1.6', color: '#555' }}>
                        {selectedService.shortDescription}
                      </p>
                    </div>
                  )}
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#666' }}>
                      📝 Deskripsi Lengkap
                    </h4>
                    <p style={{ margin: 0, lineHeight: '1.6', color: '#555', whiteSpace: 'pre-wrap' }}>
                      {selectedService.detailDescription || selectedService.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>
                </div>
              )}

              {detailTab === 'information' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#999' }}>
                        Nama Vendor
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                        {selectedService.vendorName}
                      </p>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#999' }}>
                        Rating
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                        ⭐ {(selectedService.rating || 0).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#999' }}>
                        Total Penyewaan
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                        {selectedService.rentCount || 0}
                      </p>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#999' }}>
                        Kategori
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                        {selectedService.category || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'reviews' && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700' }}>
                      Rating & Review
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#5A45D1' }}>
                        {(selectedService.rating || 0).toFixed(1)}
                      </span>
                      <span style={{ color: '#666' }}>
                        {selectedService.rentCount || 0} orang telah menyewa
                      </span>
                    </div>
                  </div>

                  {reviewsLoading ? (
                    <p style={{ color: '#999' }}>Memuat review...</p>
                  ) : serviceReviews.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                      {serviceReviews.slice(0, 5).map(review => (
                        <div
                          key={review.id}
                          style={{
                            padding: '14px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            borderLeft: '4px solid #FFD700'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>
                              ⭐ {review.rating}/5
                            </span>
                            <span style={{ fontSize: '12px', color: '#999' }}>
                              {new Date(review.createdAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <p style={{ margin: '0', fontSize: '13px', color: '#333', lineHeight: '1.5' }}>
                            {review.review || 'Customer tidak menulis komentar.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                      Belum ada ulasan customer.
                    </p>
                  )}
                </div>
              )}

              {/* Promo Section */}
              <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundImage: 'linear-gradient(135deg, #f8f7ff, #eef6ff)',
                borderRadius: '12px',
                border: '1px solid #dbeafe'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700' }}>
                      🎁 Offer Promo Random
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Rekomendasi produk dari penjual yang sedang tampil di katalog
                    </p>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#5A45D1',
                    backgroundColor: '#ede9fe',
                    padding: '6px 12px',
                    borderRadius: '999px'
                  }}>
                    Limited deal
                  </span>
                </div>
              </div>

              {/* Chat Button */}
              <div className="modal-actions">
                <button 
                  className="btn-primary-modal"
                  onClick={() => openChatModal(selectedService)}
                  disabled={user && user.id === selectedService.vendorId}
                  title={user && user.id === selectedService.vendorId ? "Anda tidak bisa chat dengan service sendiri" : "Chat dengan vendor"}
                  style={user && user.id === selectedService.vendorId ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  💬 Chat Vendor
                </button>
                <button className="btn-secondary-modal" onClick={closeModal}>Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatModalOpen && selectedService && user && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001,
            padding: '20px'
          }}
          onClick={closeChatModal}
        >
          <div
            className="chat-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chat-modal-header">
              <div className="chat-header-info">
                <h2>{selectedService.vendorName}</h2>
                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
                  {selectedService.title}
                </p>
              </div>
              <button className="modal-close" onClick={closeChatModal}>✕</button>
            </div>

            {/* Chat Messages */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#999'
                }}>
                  <p>Mulai percakapan dengan vendor ini</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: msg.senderId === user.id ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        background: msg.senderId === user.id ? '#5A45D1' : '#f3f4f6',
                        color: msg.senderId === user.id ? 'white' : '#1a1a1a',
                        wordBreak: 'break-word'
                      }}
                    >
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                        {msg.message}
                      </p>
                      <span style={{ fontSize: '11px', opacity: 0.7 }}>
                        {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="chat-input-section" style={{ padding: '16px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="chat-input"
                placeholder="Ketik pesan..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
              />
              <button 
                className="btn-send"
                onClick={sendMessage}
                style={{
                  padding: '10px 16px',
                  background: '#5A45D1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      
      <style jsx>{`
        .vendor-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .vendor-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .vendor-card:hover {
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          transform: translateY(-4px);
          border-color: #7c3aed;
        }

        .popular-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
        }

        .vendor-cover {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: #f3f4f6;
        }

        .vendor-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .vendor-card:hover .vendor-cover img {
          transform: scale(1.05);
        }

        .vendor-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .vendor-title {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vendor-vendor-name {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vendor-short-desc {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #999;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .vendor-stats {
          display: flex;
          justify-content: space-between;
          margin: 12px 0;
          font-size: 12px;
        }

        .stat-rating {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rating-stars {
          color: #fbbf24;
          font-weight: 600;
        }

        .rating-count {
          color: #999;
        }

        .vendor-footer {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .vendor-price {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .price-label {
          font-size: 12px;
          color: #666;
        }

        .price-amount {
          font-size: 16px;
          font-weight: 700;
          color: #5a45d1;
        }

        .price-period {
          font-size: 12px;
          color: #666;
        }

        .btn-detail {
          flex: 1;
          padding: 10px 16px;
          background: #5a45d1;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: background 0.3s;
        }

        .btn-detail:hover {
          background: #4a3bb8;
        }

        @media (max-width: 1200px) {
          .vendor-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .vendor-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .vendor-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Modal Actions */
        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .btn-primary-modal {
          flex: 1;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary-modal:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
        }

        .btn-primary-modal:active {
          transform: translateY(0);
        }

        .btn-secondary-modal {
          flex: 1;
          background-color: #f3f4f6;
          color: #1a1a1a;
          border: 1px solid #e5e7eb;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-secondary-modal:hover {
          background-color: #e5e7eb;
          border-color: #d1d5db;
          transform: translateY(-2px);
        }

        .btn-secondary-modal:active {
          transform: translateY(0);
        }

        /* Chat Modal */
        .chat-modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .chat-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 1px solid #eee;
          background: white;
          flex-shrink: 0;
        }

        .chat-header-info h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #999;
          transition: color 0.3s;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #333;
          background: #f3f4f6;
          border-radius: 8px;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>
    </>
  );
}
