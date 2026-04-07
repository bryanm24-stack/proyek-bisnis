'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePageClient() {
  const [services, setServices] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [dealData, setDealData] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState('');

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
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload();
  };

  const openModal = (service) => {
    setSelectedService(service);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedService(null);
  };

  const openChatModal = async (service) => {
    if (!user) {
      alert('Silakan login terlebih dahulu');
      return;
    }

    if (user.role === 'vendor') {
      alert('Vendor tidak bisa melakukan chat');
      return;
    }

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
          if (dealDataResp.data.status === 'agreed') {
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

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">RentGuard</div>
        <div className="nav-search">
          <input type="text" placeholder="Cari vendor, layanan sewa..." />
        </div>
        <div className="nav-actions">
          <span>🔔</span>
          <span>❤️</span>
          <span>📋</span>
          
          {user ? (
            <>
              {user.role === 'vendor' && (
                <>
                  <Link href="/vendor" className="jadi-vendor-btn">
                    Dashboard Vendor
                  </Link>
                  <Link href="/vendor/chats" className="jadi-vendor-btn" style={{ marginRight: '12px' }}>
                    💬 Pesan Customer
                  </Link>
                </>
              )}
              {user.role === 'admin' && (
                <Link href="/admin/vendor-approval" className="jadi-vendor-btn admin-btn">
                  Admin Panel
                </Link>
              )}
              <div className="user-profile">
                <div style={{ 
                  background: '#ec4899', 
                  color: 'white', 
                  padding: '6px 12px', 
                  borderRadius: '50%', 
                  fontWeight: 'bold',
                  minWidth: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {user.role === 'vendor' ? 'Vendor' : (user.role === 'admin' ? 'Admin' : 'Member')}
                  </div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: '#5A45D1', textDecoration: 'none', fontWeight: '600' }}>
                Masuk
              </Link>
            </>
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
        <div className="vendor-header">
          <h2>Semua Layanan Sewa</h2>
          {services.length > 0 && <p style={{ color: '#666', marginTop: '8px' }}>{services.length} layanan tersedia</p>}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Memuat layanan...</p>
        ) : services.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Belum ada layanan sewa</p>
        ) : (
          <div className="vendor-grid">
            {services.map((service) => (
              <div key={service.id} className="vendor-card">
                <div className="vendor-cover">
                  <img src={service.images[0]} alt={service.title} />
                  <div className="vendor-rating-badge">⭐ {service.rating}</div>
                </div>
                
                <div className="vendor-content">
                  <h3 className="vendor-title">{service.title}</h3>
                  
                  <p className="vendor-vendor-name">🏢 {service.vendorName}</p>
                  
                  <p className="vendor-short-desc">
                    {service.shortDescription || service.description.substring(0, 80) + '...'}
                  </p>
                  
                  <div className="vendor-stats">
                    <span className="stat-item">
                      <span className="stat-icon">📊</span>
                      <span>{service.rentCount} disewa</span>
                    </span>
                  </div>

                  <div className="vendor-price">
                    Rp {service.price.toLocaleString('id-ID')}
                  </div>

                  <button 
                    className="btn-detail"
                    onClick={() => openModal(service)}
                  >
                    Lihat Detail →
                  </button>
                </div>
              </div>
            ))}
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
                <img src={selectedService.images[0]} alt={selectedService.title} />
              </div>

              <div className="modal-info">
                <div className="info-section">
                  <h4>📍 Vendor</h4>
                  <p>{selectedService.vendorName}</p>
                </div>

                <div className="info-section">
                  <h4>⭐ Rating & Review</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#5A45D1' }}>
                      {selectedService.rating}
                    </span>
                    <span style={{ color: '#666' }}>{selectedService.rentCount} orang telah menyewa</span>
                  </div>
                </div>

                <div className="info-section">
                  <h4>💰 Harga</h4>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#5A45D1' }}>
                    Rp {selectedService.price.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="info-section">
                  <h4>📝 Deskripsi Lengkap</h4>
                  <p style={{ lineHeight: '1.6', color: '#555' }}>
                    {selectedService.description}
                  </p>
                </div>

                <div className="modal-actions">
                  <button 
                    className="btn-primary-modal"
                    onClick={() => openChatModal(selectedService)}
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
            {showRatingForm && dealData?.status === 'agreed' && (
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
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }

        .vendor-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-4px);
        }

        .vendor-cover {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: #f0f0f0;
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
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .vendor-title {
          font-size: 16px;
          font-weight: 700;
          color: #333;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }

        .vendor-vendor-name {
          font-size: 13px;
          color: #666;
          margin: 0 0 12px 0;
          font-weight: 500;
        }

        .vendor-short-desc {
          font-size: 13px;
          color: #666;
          margin: 0 0 12px 0;
          line-height: 1.5;
          flex-grow: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .vendor-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eee;
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
          font-size: 18px;
          font-weight: 700;
          color: #5A45D1;
          margin-bottom: 12px;
        }

        .btn-detail {
          background-color: #5A45D1;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          width: 100%;
        }

        .btn-detail:hover {
          background-color: #3B2B85;
          transform: translateY(-2px);
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
          color: #333;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #999;
          transition: color 0.3s;
        }

        .modal-close:hover {
          color: #333;
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
          color: #333;
        }

        .info-section p {
          margin: 0;
          color: #555;
          line-height: 1.6;
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
          background-color: #5A45D1;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .btn-primary-modal:hover {
          background-color: #3B2B85;
        }

        .btn-secondary-modal {
          flex: 1;
          background-color: #f0f0f0;
          color: #333;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .btn-secondary-modal:hover {
          background-color: #e0e0e0;
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
          padding: 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: white;
          border-radius: 16px 16px 0 0;
        }

        .chat-header-info h2 {
          margin: 0;
          font-size: 18px;
          color: #333;
          font-weight: 700;
        }

        .chat-deal-actions {
          display: flex;
          gap: 10px;
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
          align-items: center;
        }

        .btn-deal {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background-color: #10b981;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .btn-deal:hover:not(:disabled) {
          background-color: #059669;
        }

        .btn-deal:disabled {
          background-color: #d1d5db;
          cursor: not-allowed;
        }

        .btn-cancel {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background-color: #ef4444;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .btn-cancel:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .btn-cancel:disabled {
          background-color: #d1d5db;
          cursor: not-allowed;
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
          padding: 12px;
          border-radius: 12px;
          background-color: #5A45D1;
          color: white;
        }

        .chat-message.vendor .message-content {
          background-color: #e5e7eb;
          color: #333;
        }

        .message-text {
          margin: 0 0 4px 0;
          font-size: 14px;
          word-wrap: break-word;
        }

        .message-time {
          font-size: 11px;
          opacity: 0.7;
          display: block;
        }

        .chat-input-section {
          display: flex;
          gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid #eee;
          background: white;
          border-radius: 0 0 16px 16px;
        }

        .chat-input {
          flex: 1;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
        }

        .chat-input:focus {
          outline: none;
          border-color: #5A45D1;
          box-shadow: 0 0 0 3px rgba(90, 69, 209, 0.1);
        }

        .btn-send {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background-color: #5A45D1;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .btn-send:hover {
          background-color: #3B2B85;
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
          color: #333;
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
          transition: opacity 0.2s;
        }

        .star.active {
          opacity: 1;
        }

        .star:hover {
          opacity: 0.7;
        }

        .rating-textarea {
          width: 100%;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          margin-bottom: 12px;
          box-sizing: border-box;
        }

        .rating-textarea:focus {
          outline: none;
          border-color: #5A45D1;
          box-shadow: 0 0 0 3px rgba(90, 69, 209, 0.1);
        }

        .btn-submit-rating {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background-color: #5A45D1;
          color: white;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .btn-submit-rating:hover {
          background-color: #3B2B85;
        }
      `}</style>
    </div>
  );
}
