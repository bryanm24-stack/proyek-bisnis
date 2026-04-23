'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar';

export default function HomePageClient() {
  const [services, setServices] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('information');
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [dealData, setDealData] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [serviceReviews, setServiceReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [reviewPage, setReviewPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchNotifications = async (currentUser) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/notifications?userId=${currentUser.id}`);
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    const fetchServices = async () => {
      try {
        const response = await fetch('/api/vendor/services');
        const data = await response.json();
        if (data.success) {
          setServices(data.data);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();

    // Refresh services setiap 10 detik untuk deteksi service baru dari vendor
    const serviceInterval = setInterval(fetchServices, 10000);
    return () => clearInterval(serviceInterval);
  }, []);

  // Fetch notifications for current user
  useEffect(() => {
    if (!user) return;

    fetchNotifications(user);

    // Polling every 5 seconds untuk check notifikasi baru
    const interval = setInterval(() => fetchNotifications(user), 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload();
  };

  // Helper function to safely format price
  const formatPrice = (price) => {
    if (typeof price === 'number' && isFinite(price) && price > 0 && price < 1e20) {
      return price.toLocaleString('id-ID');
    }
    return '0';
  };

  const openModal = (service) => {
    setSelectedService(service);
    setDetailTab('information');
    setServiceReviews([]);
    setReviewsLoading(true);
    setReviewFilter('all');
    setReviewPage(1);
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
    setServiceReviews([]);
    setReviewsLoading(false);
    setReviewFilter('all');
    setReviewPage(1);
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!user || !notificationId) return;

    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Gagal menghapus notifikasi');
      }

      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Gagal menghapus notifikasi');
    }
  };

  const openChatModal = async (service) => {
    if (!user) {
      alert('Silakan login terlebih dahulu');
      return;
    }

    // Vendor juga bisa melakukan chat sebagai customer saat membeli dari vendor lain
    setSelectedService(service);
    setMessages([]);
    setNewMessage('');
    setShowRatingForm(false);
    setRatingValue(5);
    setRatingReview('');

    try {
      const response = await fetch(
        `/api/chat?serviceId=${service.id}&customerId=${user.id}`
      );
      const data = await response.json();
      if (data.success && data.data) {
        setChatData(data.data);
        setMessages(data.data.messages || []);
        
        const dealResponse = await fetch(`/api/deals?chatId=${data.data.id}`);
        const dealDataResp = await dealResponse.json();
        if (dealDataResp.success && dealDataResp.data) {
          setDealData(dealDataResp.data);
          if (dealDataResp.data.status === 'completed') {
            setShowRatingForm(true);
          }
        }
      } else {
        setChatData(null);
        setMessages([]);
      }
      setChatModalOpen(true);
      setModalOpen(false);
    } catch (error) {
      console.error('Error loading chat:', error);
      alert('Gagal membuka chat');
    }
  };

  const closeChatModal = () => {
    setChatModalOpen(false);
    setSelectedService(null);
    setChatData(null);
    setMessages([]);
    setShowRatingForm(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

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
          message: newMessage
        })
      });

      const data = await response.json();
      if (data.success) {
        setChatData(data.data);
        setMessages(data.data.messages || []);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Gagal mengirim pesan');
    }
  };

  const handleDealAction = async (action) => {
    if (!selectedService || !user) return;

    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          chatId: chatData?.id,
          customerId: user.id,
          vendorId: selectedService.vendorId,
          serviceId: selectedService.id
        })
      });

      const data = await response.json();
      if (data.success) {
        setDealData(data.data.deal);
        setChatData(data.data.chat);
        
        if (action === 'accept' && data.data.readyForRating) {
          setShowRatingForm(true);
        }

        if (action === 'cancel') {
          setShowRatingForm(false);
        }

        alert(data.message);
      }
    } catch (error) {
      console.error('Error processing deal:', error);
      alert('Gagal memproses deal');
    }
  };

  const submitRating = async () => {
    if (!ratingValue) {
      alert('Silakan berikan rating');
      return;
    }

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          customerId: user.id,
          vendorId: selectedService.vendorId,
          rating: ratingValue,
          review: ratingReview
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Rating berhasil disimpan!');
        closeChatModal();
        
        setServices(services.map(s =>
          s.id === selectedService.id
            ? { ...s, rating: data.data.updatedService.rating, rentCount: data.data.updatedService.rentCount }
            : s
        ));
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Gagal menyimpan rating');
    }
  };

  const handleChatClick = () => {
    if (!user) {
      alert('Silakan login terlebih dahulu');
      return;
    }
    if (user.role === 'vendor') {
      window.location.href = '/vendor/chats';
    } else {
      // Customer - buka chat list page
      window.location.href = '/customer/chats';
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  // Filter services berdasarkan search term dan category
  const getFilteredServices = () => {
    let filtered = services;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(service =>
        service.title?.toLowerCase().includes(term) ||
        service.vendorName?.toLowerCase().includes(term) ||
        service.shortDescription?.toLowerCase().includes(term) ||
        service.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filteredServices = getFilteredServices();
  const REVIEWS_PER_PAGE = 5;
  const filteredReviews = serviceReviews.filter((review) =>
    reviewFilter === 'all' ? true : Number(review.rating) === Number(reviewFilter)
  );
  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const currentReviewPage = Math.min(reviewPage, totalReviewPages);
  const paginatedReviews = filteredReviews.slice(
    (currentReviewPage - 1) * REVIEWS_PER_PAGE,
    currentReviewPage * REVIEWS_PER_PAGE
  );
  const reviewAverage =
    serviceReviews.length > 0
      ? (
          serviceReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          serviceReviews.length
        ).toFixed(1)
      : '0.0';

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <Link href="/" className="nav-logo">
            🛡️ RentGuard
          </Link>
        </div>

        <div className="nav-right">
          {/* Dashboard Vendor Button - hanya untuk vendor */}
          {user && user.role === 'vendor' && (
            <Link href="/vendor" className="btn-nav-vendor" title="Dashboard Vendor" style={{ textDecoration: 'none', color: 'inherit' }}>
              📊 Dashboard
            </Link>
          )}

          {/* Admin Verification Button - hanya untuk admin */}
          {user && user.role === 'admin' && (
            <>
              <Link href="/admin/vendor-approval" className="btn-nav-admin" title="Verifikasi Vendor">
                ✓ Verifikasi Vendor
              </Link>
              <Link href="/admin/transaction-verification" className="btn-nav-admin" title="Verifikasi Identitas Transaksi">
                🪪 Verifikasi Transaksi
              </Link>
            </>
          )}

          {/* Notification Bell */}
          <div className="notification-wrapper">
            <button className="nav-icon-btn" onClick={handleNotificationClick} title="Notifikasi">
              🔔
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            {showNotifications && (
              <div className="notification-dropdown">
                {notifications.length === 0 ? (
                  <div className="notification-empty">Tidak ada notifikasi</div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className={`notification-item ${notif.read ? 'read' : 'unread'}`}>
                      <div className="notification-content">
                        <div className="notif-message">{notif.message}</div>
                        <div className="notif-time">
                          {new Date(notif.createdAt).toLocaleTimeString('id-ID')}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="notif-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notif.id);
                        }}
                        title="Hapus notifikasi"
                      >
                        Hapus
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Chat Button */}
          <button className="nav-icon-btn" onClick={handleChatClick} title="Chat">
            💬
          </button>

          {/* User Menu */}
          {user ? (
            <div className="user-menu-wrapper">
              <div className="user-menu">
                <button className="user-button">
                  <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                  <span>{user.name}</span>
                </button>
              </div>
              <button 
                onClick={handleLogout}
                className="btn-logout"
                title="Logout"
              >
                🚪 Logout
              </button>
            </div>
          ) : (
            <div className="user-menu-guest">
              <Link href="/login" className="btn-login">
                Masuk
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>Sewa Apa Saja,<br/>dari Vendor Terbaik</h1>
          <p>Ribuan vendor penyewaan terpercaya siap melayani kebutuhan sewa kamu</p>
          <div className="hero-buttons">
            <button className="btn-white">Cari Vendor Sekarang</button>
            {!user && (
              <>
                <Link href="/vendor/register" className="btn-outline" style={{textDecoration: 'none', display: 'inline-block'}}>
                  Menjadi Vendor
                </Link>
                <Link href="/login" className="btn-white" style={{marginLeft: '10px', background: '#333', color: 'white', textDecoration: 'none', display: 'inline-block'}}>
                  Masuk / Login
                </Link>
              </>
            )}
            {user && user.role === 'member' && (
              <Link href="/vendor/register" className="btn-outline" style={{textDecoration: 'none', display: 'inline-block'}}>
                Menjadi Vendor
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="trust-badges">
        <div className="badge">
          <h4>Vendor Terverifikasi</h4>
          <p>Semua vendor sudah diverifikasi</p>
        </div>
        <div className="badge">
          <h4>Sewa Aman</h4>
          <p>Dilindungi RentGuard Protection</p>
        </div>
        <div className="badge">
          <h4>Fleksibel & Cepat</h4>
          <p>Sewa harian, mingguan, bulanan</p>
        </div>
      </div>

      {/* Vendor/Services List */}
      <div className="vendor-section">
        {/* Search Bar with Category Filter */}
        <SearchBar 
          services={filteredServices}
          onSearch={(term, category) => {
            setSearchTerm(term);
            setSelectedCategory(category);
          }}
          onCategoryChange={(category) => setSelectedCategory(category)}
        />

        <div className="vendor-header">
          <h2>Semua Layanan Sewa</h2>
          {filteredServices.length > 0 && <p style={{ color: '#666', marginTop: '8px' }}>{filteredServices.length} layanan tersedia</p>}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Memuat layanan...</p>
        ) : filteredServices.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            {services.length === 0 ? 'Belum ada layanan sewa' : 'Tidak ada layanan yang sesuai dengan pencarian Anda'}
          </p>
        ) : (
          <div className="vendor-grid">
            {filteredServices.map((service) => {
              // Parse rentCount - handle both string and number
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
                  
                  <div className="vendor-cover">
                    <img src={imageUrl} alt={service.title} />
                  </div>
                  
                  <div className="vendor-content">
                    <h3 className="vendor-title">{service.title}</h3>
                    
                    <p className="vendor-vendor-name">{service.vendorName}</p>
                    
                    <p className="vendor-short-desc">
                      {shortDesc}
                    </p>
                    
                    <div className="vendor-stats">
                      <div className="stat-rating">
                        <span className="rating-stars">⭐ {service.rating.toFixed(1)}</span>
                        <span className="rating-count">({service.rentCount} disewa)</span>
                      </div>
                    </div>

                    <div className="vendor-footer">
                      <div className="vendor-price">
                        <span className="price-label">Rp</span>
                        <span className="price-amount">{formatPrice(service.price)}</span>
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
      </div>

      {/* Detail Modal */}
      {modalOpen && selectedService && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedService.title}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-image">
                <img src={selectedService.image || (selectedService.images && selectedService.images.length > 0 ? selectedService.images[0] : 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(selectedService.title || 'Service'))} alt={selectedService.title} />
              </div>

              <div className="modal-price-block">
                <div className="modal-price-title">Harga Sewa</div>
                <div className="modal-price">
                  <span className="modal-price-label">Rp</span>
                  <span className="modal-price-amount">{formatPrice(selectedService.price ?? selectedService.harga)}</span>
                  <span className="modal-price-period">/ hari</span>
                </div>
              </div>

              <div className="modal-info">
                <div className="modal-tabs">
                  <button
                    className={`tab ${detailTab === 'information' ? 'active' : ''}`}
                    onClick={() => setDetailTab('information')}
                  >
                    Informasi Penjual
                  </button>
                  <button
                    className={`tab ${detailTab === 'description' ? 'active' : ''}`}
                    onClick={() => setDetailTab('description')}
                  >
                    Deskripsi Produk
                  </button>
                  <button
                    className={`tab ${detailTab === 'activation' ? 'active' : ''}`}
                    onClick={() => setDetailTab('activation')}
                  >
                    Panduan Aktivasi
                  </button>
                </div>

                <div className="tab-panel">
                  {detailTab === 'information' && (
                    <>
                      <div className="info-section">
                        <h4>📍 Vendor</h4>
                        <p>{selectedService.vendorName}</p>
                      </div>

                      <div className="info-section">
                        <h4>⭐ Rating & Review</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#5A45D1' }}>
                            {selectedService.rating?.toFixed?.(1) ?? selectedService.rating}
                          </span>
                          <span style={{ color: '#666' }}>{selectedService.rentCount} orang telah menyewa</span>
                        </div>
                        {!reviewsLoading && serviceReviews.length > 0 && (
                          <div className="review-summary-row">
                            <span className="review-summary-chip">Rata-rata ulasan: ⭐ {reviewAverage}</span>
                            <span className="review-summary-chip">Total review: {serviceReviews.length}</span>
                          </div>
                        )}
                        <div className="review-filter-row">
                          <label htmlFor="review-filter" className="review-filter-label">Filter bintang</label>
                          <select
                            id="review-filter"
                            className="review-filter-select"
                            value={reviewFilter}
                            onChange={(e) => {
                              setReviewFilter(e.target.value);
                              setReviewPage(1);
                            }}
                          >
                            <option value="all">Semua</option>
                            <option value="5">5 bintang</option>
                            <option value="4">4 bintang</option>
                            <option value="3">3 bintang</option>
                            <option value="2">2 bintang</option>
                            <option value="1">1 bintang</option>
                          </select>
                        </div>
                        <div className="reviews-list">
                          {reviewsLoading ? (
                            <p className="review-empty">Memuat review...</p>
                          ) : filteredReviews.length === 0 ? (
                            <p className="review-empty">Belum ada review customer.</p>
                          ) : (
                            paginatedReviews.map((review) => (
                              <div key={review.id} className="review-item">
                                <div className="review-header">
                                  <span className="review-rating">⭐ {review.rating}/5</span>
                                  <span className="review-date">{new Date(review.createdAt).toLocaleDateString('id-ID')}</span>
                                </div>
                                <p className="review-author">{review.customerName || 'Customer'}</p>
                                <p className="review-text">{review.review?.trim() || 'Customer tidak menulis komentar.'}</p>
                              </div>
                            ))
                          )}
                        </div>
                        {!reviewsLoading && filteredReviews.length > REVIEWS_PER_PAGE && (
                          <div className="review-pagination">
                            <button
                              type="button"
                              className="review-page-btn"
                              disabled={currentReviewPage <= 1}
                              onClick={() => setReviewPage((prev) => Math.max(1, prev - 1))}
                            >
                              Sebelumnya
                            </button>
                            <span className="review-page-info">Halaman {currentReviewPage} / {totalReviewPages}</span>
                            <button
                              type="button"
                              className="review-page-btn"
                              disabled={currentReviewPage >= totalReviewPages}
                              onClick={() => setReviewPage((prev) => Math.min(totalReviewPages, prev + 1))}
                            >
                              Berikutnya
                            </button>
                          </div>
                        )}
                      </div>
                    

                      {(selectedService.category === 'barang' || selectedService.type === 'barang') && (
                        <div className="info-section">
                          <h4>📦 Stok</h4>
                          <p>{selectedService.jumlahBarang ?? 'N/A'}</p>
                        </div>
                      )}

                      <div className="info-section">
                        <h4>📈 Terjual</h4>
                        <p>{selectedService.rentCount ?? '0'}</p>
                      </div>

                      {selectedService.lokasi && (
                        <div className="info-section">
                          <h4>📍 Lokasi Penjemputan</h4>
                          <p>{selectedService.lokasi}</p>
                        </div>
                      )}

                      <div className="info-section">
                        <h4>🕒 Status</h4>
                        <p>Terakhir online baru-baru ini</p>
                      </div>
                    </>
                  )}

                  {detailTab === 'description' && (
                    <>
                      <div className="info-section">
                        <h4>📝 Deskripsi Lengkap</h4>
                        <p style={{ lineHeight: '1.6', color: '#555' }}>
                          {selectedService.detailDescription || selectedService.description}
                        </p>
                      </div>

                      {(selectedService.type === 'barang' || selectedService.category === 'barang') && (
                        <>
                          <div className="info-section">
                            <h4>📦 Keterangan Barang</h4>
                            <p>{selectedService.jenisBarang || selectedService.shortDescription || '-'}</p>
                          </div>

                          {selectedService.spesifikBarang && (
                            <div className="info-section">
                              <h4>🔎 Spesifik Barang</h4>
                              <p>{selectedService.spesifikBarang}</p>
                            </div>
                          )}

                          {selectedService.kebijakanKerusakan && (
                            <div className="info-section">
                              <h4>🛡️ Kebijakan Kerusakan</h4>
                              <p>{selectedService.kebijakanKerusakan}</p>
                            </div>
                          )}

                          {selectedService.dendaKeterlambatan && (
                            <div className="info-section">
                              <h4>⚠️ Denda Keterlambatan</h4>
                              <p>{selectedService.dendaKeterlambatan}</p>
                            </div>
                          )}

                          {selectedService.syaratKetentuan && (
                            <div className="info-section">
                              <h4>📋 Syarat & Ketentuan</h4>
                              <p style={{ whiteSpace: 'pre-wrap' }}>{selectedService.syaratKetentuan}</p>
                            </div>
                          )}
                        </>
                      )}

                      {(selectedService.type === 'jasa' || selectedService.category === 'jasa') && (
                        <>
                          {selectedService.spesifikBarang && (
                            <div className="info-section">
                              <h4>✨ Detail Layanan</h4>
                              <p>{selectedService.spesifikBarang}</p>
                            </div>
                          )}

                          {selectedService.dendaKeterlambatan && (
                            <div className="info-section">
                              <h4>⚠️ Denda Keterlambatan</h4>
                              <p>{selectedService.dendaKeterlambatan}</p>
                            </div>
                          )}

                          {selectedService.syaratKetentuan && (
                            <div className="info-section">
                              <h4>📋 Syarat & Ketentuan</h4>
                              <p style={{ whiteSpace: 'pre-wrap' }}>{selectedService.syaratKetentuan}</p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {detailTab === 'activation' && (
                    <>
                      <div className="info-section">
                        <h4>1. Pilih layanan</h4>
                        <p>Pilih layanan yang Anda inginkan dan klik tombol Chat Vendor untuk negosiasi.</p>
                      </div>
                      <div className="info-section">
                        <h4>2. Konfirmasi pesanan</h4>
                        <p>Tunggu vendor mengonfirmasi dan setujui detail harga, jumlah, dan waktu pengambilan.</p>
                      </div>
                      <div className="info-section">
                        <h4>3. Bayar atau ambil barang</h4>
                        <p>Lakukan pembayaran jika diperlukan, lalu ambil barang sesuai jadwal atau minta vendor mengirim.</p>
                      </div>
                      <div className="info-section">
                        <h4>4. Selesaikan transaksi</h4>
                        <p>Pastikan kondisi barang sesuai, lalu berikan rating dan review setelah transaksi selesai.</p>
                      </div>
                    </>
                  )}
                </div>

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
        </div>
      )}

      {/* Chat Modal */}
      {chatModalOpen && selectedService && user && (
        <div className="modal-overlay" onClick={closeChatModal}>
          <div className="chat-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <div className="chat-header-info">
                <h2>{selectedService.vendorName}</h2>
                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
                  {selectedService.title}
                </p>
              </div>
              <button className="modal-close" onClick={closeChatModal}>✕</button>
            </div>

            {/* Deal Buttons */}
            <div className="chat-deal-actions">
              <button
                className="btn-deal"
                onClick={() => handleDealAction('accept')}
                disabled={dealData?.status === 'agreed' || dealData?.status === 'cancelled'}
              >
                ✅ Deal
              </button>
              <button
                className="btn-cancel"
                onClick={() => handleDealAction('cancel')}
                disabled={dealData?.status === 'cancelled'}
              >
                ❌ Cancel
              </button>
              {dealData?.status === 'agreed' && (
                <span className="deal-status">✓ Deal Diterima</span>
              )}
              {dealData?.status === 'cancelled' && (
                <span className="deal-status cancelled">✗ Deal Dibatalkan</span>
              )}
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
                    className={`chat-message ${msg.senderId === user.id ? 'customer' : 'vendor'}`}
                  >
                    <div className="message-content">
                      <p className="message-text">{msg.message}</p>
                      <span className="message-time">
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

            {/* Rating Form */}
            {showRatingForm && dealData?.status === 'completed' && (
              <div className="rating-form">
                <h3>Berikan Rating &amp; Review</h3>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star ${star <= ratingValue ? 'active' : ''}`}
                      onClick={() => setRatingValue(star)}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <textarea
                  className="rating-textarea"
                  placeholder="Tulis review Anda (opsional)"
                  value={ratingReview}
                  onChange={(e) => setRatingReview(e.target.value)}
                  maxLength={500}
                />
                <button className="btn-submit-rating" onClick={submitRating}>
                  Kirim Rating
                </button>
              </div>
            )}

            {/* Chat Input */}
            {!showRatingForm && (
              <div className="chat-input-section">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Ketik pesan..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage();
                    }
                  }}
                />
                <button className="btn-send" onClick={sendMessage}>
                  Kirim
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        /* Navbar Styles */
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 40px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          position: sticky;
          top: 0;
          z-index: 100;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 24px;
          flex: 1;
        }

        .nav-logo {
          font-size: 20px;
          font-weight: 700;
          color: #7c3aed;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .nav-logo:hover {
          opacity: 0.8;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-icon-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          position: relative;
          padding: 6px;
          transition: transform 0.2s;
        }

        .notification-wrapper {
          position: relative;
        }

        .nav-icon-btn:hover {
          transform: scale(1.1);
        }

        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
        }

        .notification-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          min-width: 360px;
          max-height: 400px;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          margin-top: 8px;
          z-index: 1000;
        }

        .notification-empty {
          padding: 24px;
          text-align: center;
          color: #999;
          font-size: 14px;
        }

        .notification-item {
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: background 0.2s;
        }

        .notification-item:hover {
          background: #f9fafb;
        }

        .notification-item.unread {
          background: #f0f4ff;
          border-left: 4px solid #7c3aed;
          padding-left: 12px;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .notif-delete-btn {
          border: none;
          background: #fee2e2;
          color: #b91c1c;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
        }

        .notif-delete-btn:hover {
          background: #fecaca;
        }

        .notif-message {
          font-size: 14px;
          color: #1a1a1a;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .notif-time {
          font-size: 12px;
          color: #999;
        }

        .reviews-list {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .review-summary-row {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .review-summary-chip {
          font-size: 12px;
          color: #334155;
          background: #e2e8f0;
          border-radius: 999px;
          padding: 4px 10px;
          font-weight: 600;
        }

        .review-filter-row {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .review-filter-label {
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }

        .review-filter-select {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 12px;
          color: #1f2937;
          background: #fff;
        }

        .review-item {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 12px;
          background: #fafafa;
        }

        .review-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }

        .review-rating {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
        }

        .review-date {
          font-size: 12px;
          color: #6b7280;
        }

        .review-author {
          font-size: 12px;
          color: #4b5563;
          margin: 0 0 4px 0;
          font-weight: 600;
        }

        .review-text {
          margin: 0;
          font-size: 13px;
          color: #374151;
          line-height: 1.5;
        }

        .review-empty {
          margin: 8px 0 0;
          font-size: 13px;
          color: #6b7280;
        }

        .review-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
        }

        .review-page-btn {
          border: none;
          background: #1d4ed8;
          color: #fff;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .review-page-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .review-page-info {
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }

        .btn-nav-vendor {
          padding: 8px 14px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-nav-vendor:hover {
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          transform: scale(1.05);
        }

        .btn-nav-vendor:active {
          transform: scale(0.98);
        }

        .btn-nav-admin {
          padding: 8px 14px;
          background: linear-gradient(135deg, #059669, #10b981);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-nav-admin:hover {
          background: linear-gradient(135deg, #047857, #059669);
          transform: scale(1.05);
        }

        .btn-nav-admin:active {
          transform: scale(0.98);
        }

        .user-menu {
          position: relative;
        }

        .user-menu-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-button {
          display: flex;
          align-items: center;
          gap: 10px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .user-button:hover {
          background: #f3f4f6;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .user-button span {
          font-size: 14px;
          font-weight: 500;
          color: #1a1a1a;
          display: none;
        }

        @media (min-width: 768px) {
          .user-button span {
            display: block;
          }
        }

        .btn-logout {
          padding: 8px 14px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .btn-logout:hover {
          background: #dc2626;
          transform: scale(1.05);
        }

        .btn-logout:active {
          transform: scale(0.98);
        }

        .user-menu-guest {
          display: flex;
          gap: 8px;
        }

        .btn-login {
          padding: 8px 16px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.2s;
        }

        .btn-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        }

        @media (max-width: 1024px) {
          .navbar {
            padding: 12px 24px;
          }
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 12px 16px;
          }

          .nav-left {
            gap: 12px;
          }
        }

        .jadi-vendor-btn {
          background-color: #5A45D1;
          color: white;
          padding: 8px 14px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: inline-block;
          margin-right: 12px;
          transition: background-color 0.3s;
        }

        .jadi-vendor-btn:hover {
          background-color: #3B2B85;
        }

        .jadi-vendor-btn.admin-btn {
          background-color: #f59e0b;
        }

        .jadi-vendor-btn.admin-btn:hover {
          background-color: #d97706;
        }

        /* Refined Card Styles */
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

        .vendor-rating-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.95);
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .vendor-content {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .vendor-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px 0;
          line-height: 1.35;
        }

        .vendor-vendor-name {
          font-size: 14px;
          color: #7c3aed;
          margin: 0 0 12px 0;
          font-weight: 600;
        }

        .vendor-short-desc {
          font-size: 14px;
          color: #525252;
          margin: 0 0 14px 0;
          line-height: 1.7;
          flex-grow: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .vendor-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .stat-rating {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .rating-stars {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .rating-count {
          font-size: 13px;
          color: #999;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #666;
        }

        .stat-icon {
          font-size: 16px;
        }

        .vendor-price {
          font-size: 16px;
          font-weight: 700;
          color: #7c3aed;
          margin-bottom: 12px;
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .price-label {
          font-size: 12px;
          color: #7c3aed;
          font-weight: 600;
        }

        .price-amount {
          font-size: 18px;
          font-weight: 700;
          color: #7c3aed;
        }

        .price-period {
          font-size: 12px;
          color: #999;
        }

        .vendor-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
        }

        .btn-detail {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .btn-detail:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        }

        .btn-detail:active {
          transform: translateY(0);
        }

        /* Vendor Section & Grid */
        .vendor-section {
          padding: 60px 40px;
          background: white;
        }

        .vendor-header {
          margin-bottom: 32px;
        }

        .vendor-header h2 {
          font-size: 32px;
          font-weight: 700;
          margin: 0;
          color: #1a1a1a;
        }

        .vendor-header p {
          font-size: 14px;
          color: #666;
          margin-top: 8px;
        }

        .vendor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        @media (max-width: 1200px) {
          .vendor-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .vendor-section {
            padding: 40px 16px;
          }

          .vendor-header h2 {
            font-size: 24px;
          }

          .vendor-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
          }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 24px;
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

        .modal-body {
          padding: 24px;
        }

        .modal-image {
          width: 100%;
          height: 300px;
          margin-bottom: 24px;
          border-radius: 12px;
          overflow: hidden;
        }

        .modal-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .modal-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .modal-price-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          background: #f8f5ff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .modal-price-title {
          font-size: 14px;
          font-weight: 700;
          color: #4f46e5;
        }

        .modal-price {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .modal-price-label {
          font-size: 14px;
          font-weight: 700;
          color: #7c3aed;
        }

        .modal-price-amount {
          font-size: 34px;
          font-weight: 800;
          color: #3b2b85;
          line-height: 1;
        }

        .modal-price-period {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 2px;
        }

        .info-section {
          padding-bottom: 16px;
          border-bottom: 1px solid #eee;
        }

        .info-section:last-of-type {
          border-bottom: none;
        }

        .info-section h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .info-section p {
          margin: 0;
          color: #555;
          line-height: 1.6;
          font-size: 16px;
        }

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

        /* Chat Modal Styles */
        .chat-modal-content {
          background: white;
          border-radius: 16px;
          width: 500px;
          max-width: 90vw;
          height: 600px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .chat-modal-header {
          padding: 24px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: white;
          border-radius: 16px 16px 0 0;
        }

        .chat-header-info h2 {
          margin: 0;
          font-size: 20px;
          color: #1a1a1a;
          font-weight: 700;
        }

        .chat-deal-actions {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
          align-items: center;
        }

        .btn-deal {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-deal:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
        }

        .btn-deal:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-deal:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .btn-cancel {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-cancel:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
        }

        .btn-cancel:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-cancel:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .deal-status {
          padding: 8px 12px;
          background-color: #dbeafe;
          color: #0284c7;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
        }

        .deal-status.cancelled {
          background-color: #fee2e2;
          color: #dc2626;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background-color: #f9fafb;
        }

        .chat-message {
          display: flex;
          margin-bottom: 12px;
        }

        .chat-message.customer {
          justify-content: flex-end;
        }

        .chat-message.vendor {
          justify-content: flex-start;
        }

        .message-content {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.2);
        }

        .chat-message.vendor .message-content {
          background-color: #e5e7eb;
          color: #1a1a1a;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .message-text {
          margin: 0 0 4px 0;
          font-size: 14px;
          word-wrap: break-word;
          line-height: 1.4;
        }

        .message-time {
          font-size: 11px;
          opacity: 0.7;
          display: block;
          margin-top: 4px;
        }

        .chat-input-section {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #eee;
          background: white;
          border-radius: 0 0 16px 16px;
        }

        .chat-input {
          flex: 1;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.3s ease;
        }

        .chat-input:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .btn-send {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-send:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(124, 58, 237, 0.3);
        }

        .btn-send:active {
          transform: translateY(0);
        }

        .rating-form {
          padding: 20px;
          border-top: 1px solid #eee;
          background: white;
          border-radius: 0 0 16px 16px;
        }

        .rating-form h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #1a1a1a;
          font-weight: 700;
        }

        .rating-stars {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          justify-content: center;
        }

        .star {
          background: none;
          border: none;
          font-size: 32px;
          cursor: pointer;
          opacity: 0.3;
          transition: opacity 0.2s, transform 0.2s;
        }

        .star:hover {
          transform: scale(1.1);
          opacity: 0.7;
        }

        .star.active {
          opacity: 1;
          transform: scale(1.15);
        }

        .rating-textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          margin-bottom: 12px;
          box-sizing: border-box;
          transition: all 0.3s ease;
        }

        .rating-textarea:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .btn-submit-rating {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-submit-rating:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(124, 58, 237, 0.3);
        }

        .btn-submit-rating:active {
          transform: translateY(0);
        }
 
        .modal-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .tab {
          background: transparent;
          border: none;
          color: #6b7280;
          padding: 12px 16px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          border-radius: 10px 10px 0 0;
          transition: all 0.2s ease;
        }

        .tab:hover {
          background: #f8fafc;
          color: #374151;
        }

        .tab.active {
          background: white;
          color: #1f2937;
          box-shadow: inset 0 -2px 0 #7c3aed;
        }

        .tab-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 12px;
        }
      `}</style>
    </div>
  );
}
