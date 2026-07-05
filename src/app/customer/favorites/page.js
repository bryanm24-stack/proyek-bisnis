'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavbar from '../../components/SharedNavbar';


import { readData, writeData } from '@/lib/storage';
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
  const [selectedChatItem, setSelectedChatItem] = useState(null);
  const [serviceReviews, setServiceReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [reviewPage, setReviewPage] = useState(1);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatData, setChatData] = useState(null);
  const [dealData, setDealData] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const activeChatItem = selectedChatItem || selectedItemDetail;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (!['customer', 'vendor'].includes(parsedUser.role)) {
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

  // Helper function to safely format price
  const formatPrice = (price) => {
    if (typeof price === 'number' && isFinite(price) && price > 0 && price < 1e20) {
      return price.toLocaleString('id-ID');
    }
    return '0';
  };

  const getItemPriceNumber = (item) => {
    if (!item) return 0;
    return Number(item.hargaPcs || item.hargaSesi || item.harga || item.price || 0);
  };

  const isCustomerProfileComplete = (profile) => {
    return !!(
      profile &&
      profile.role === 'customer' &&
      profile.name &&
      profile.bankName &&
      profile.accountNumber &&
      profile.accountHolder
    );
  };

  // Helper function to get display price from items
  const getItemsPrice = (service) => {
    if (!service.items || service.items.length === 0) {
      return null;
    }

    const prices = service.items
      .map(item => getItemPriceNumber(item))
      .filter(price => price > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return null;
    }

    // Single item - show price only
    if (prices.length === 1) {
      return {
        single: true,
        min: prices[0],
        max: prices[0],
        display: formatPrice(prices[0])
      };
    }

    // Multiple items - show range
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    
    return {
      single: false,
      min: minPrice,
      max: maxPrice,
      display: `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
    };
  };

  const getServiceDisplayPrice = (service) => {
    const itemPrice = getItemsPrice(service);
    if (itemPrice?.display) {
      return itemPrice.display;
    }

    const basePrice = Number(service?.price || service?.tarif || service?.harga || 0);
    return formatPrice(basePrice);
  };

  const handleNextImage = (e, serviceId, totalImages) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => ({
      ...prev,
      [serviceId]: ((prev[serviceId] || 0) + 1) % totalImages
    }));
  };

  const handlePrevImage = (e, serviceId, totalImages) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => ({
      ...prev,
      [serviceId]: ((prev[serviceId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const openModal = (service) => {
    setSelectedService(service);
    setDetailTab('packages');
    setSelectedItemDetail(null);
    setServiceReviews([]);
    setReviewsLoading(true);
    setReviewFilter('all');
    setReviewPage(1);
    setModalOpen(true);

    // Fetch reviews for this service
    console.log('Fetching reviews for serviceId:', service.id);
    
    fetch(`/api/ratings?serviceId=${service.id}`)
      .then((response) => {
        console.log('API Response status:', response.status);
        return response.json();
      })
      .then((data) => {
        console.log('API Response data:', data);
        if (data.success && data.data && Array.isArray(data.data)) {
          console.log('Setting reviews:', data.data.length, 'reviews');
          setServiceReviews(data.data);
        } else {
          console.warn('Invalid API response format:', data);
          setServiceReviews([]);
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
    setReviewFilter('all');
    setReviewPage(1);
  };  

  const openChatModal = async (service, itemDetail = null) => {
    if (!user) {
      alert('Silakan login terlebih dahulu');
      return;
    }

    setSelectedService(service);
    setSelectedChatItem(itemDetail);
    setMessages([]);
    setNewMessage('');
    setChatModalOpen(true);
    setModalOpen(false);

    try {
      // Load existing chat if any
      const chatQuery = new URLSearchParams({
        serviceId: service.id,
        customerId: user.id
      });

      if (itemDetail?.id) {
        chatQuery.set('itemId', itemDetail.id);
      }

      const response = await fetch(`/api/chat?${chatQuery.toString()}`);
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
    setSelectedChatItem(null);
    setMessages([]);
    setNewMessage('');
    setChatData(null);
    setDealData(null);
    setShowRatingForm(false);
    setRatingValue(5);
    setRatingReview('');
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!selectedService) return;
    if (!user) return;
    if (chatData?.dealStatus === 'closed' || chatData?.closedAt) {
      alert('Chat sudah ditutup setelah pembayaran selesai.');
      return;
    }

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
          itemId: activeChatItem?.id || null,
          itemName: activeChatItem?.namaBarang || activeChatItem?.namaJasa || activeChatItem?.title || null,
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

  const handleDealAction = async (action) => {
    if (!selectedService || !user || !chatData?.id) return;

    if (action === 'accept' && user.role === 'customer' && !isCustomerProfileComplete(user)) {
      alert('Lengkapi profil Anda di halaman Pengaturan (Nama Lengkap, Nama Bank, Nomor Rekening, Nama Pemilik Rekening) sebelum mengajukan deal.');
      return;
    }

    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          chatId: chatData.id,
          customerId: user.id,
          vendorId: selectedService.vendorId,
          serviceId: selectedService.id,
          actorId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        alert('Error: ' + (data.message || 'Gagal memproses deal'));
        return;
      }

      if (data.data?.deal) {
        setDealData(data.data.deal);
        if (data.data.deal.status === 'cancelled') {
          setShowRatingForm(false);
        }
      }

      if (data.data?.chat) {
        setChatData(data.data.chat);
      }

      alert(data.message);
    } catch (error) {
      console.error('Error processing deal:', error);
      alert('Gagal memproses deal: ' + error.message);
    }
  };

  const getDealStatusConfig = () => {
    if (!dealData) {
      return {
        label: 'Ajukan Kesepakatan',
        description: 'Transaksi diproses vendor. Kamu cukup lanjut negosiasi di chat.',
        background: '#f3f4f6',
        color: '#374151'
      };
    }

    if (dealData.status === 'pending') {
      return {
        label: 'Menunggu konfirmasi vendor',
        description: 'Vendor belum mengonfirmasi. Tunggu update dari vendor di chat ini.',
        background: '#fff7ed',
        color: '#c2410c'
      };
    }

      if (dealData.status === 'agreed') {
      return {
        label: 'Deal disetujui',
        description: 'Deal sudah disepakati. Kamu bisa lanjut ke pembayaran.',
        background: '#dbeafe',
          color: '#B28A67'
      };
    }

    if (dealData.status === 'cancelled') {
      return {
        label: 'Deal dibatalkan',
        description: 'Deal dibatalkan. Kamu bisa lanjut negosiasi ulang melalui chat.',
        background: '#fee2e2',
        color: '#b91c1c'
      };
    }

    if (dealData.status === 'completed') {
      return {
        label: 'Transaksi selesai',
        description: 'Transaksi sudah selesai. Kamu bisa lanjut isi review.',
        background: '#dcfce7',
        color: '#166534'
      };
    }

    return {
      label: `Status: ${dealData.status}`,
      description: 'Status deal diperbarui secara otomatis dari sistem.',
      background: '#f3f4f6',
      color: '#374151'
    };
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

  const REVIEWS_PER_PAGE = 5;
  const itemScopedReviews = selectedItemDetail?.id
    ? serviceReviews.filter((review) => String(review.itemId || '') === String(selectedItemDetail.id))
    : serviceReviews;
  const reviewAverage = itemScopedReviews.length
    ? (
        itemScopedReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
        itemScopedReviews.length
      ).toFixed(1)
    : '0.0';
  const filteredReviews = itemScopedReviews.filter((review) =>
    reviewFilter === 'all' ? true : Number(review.rating) === Number(reviewFilter)
  );
  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const currentReviewPage = Math.min(reviewPage, totalReviewPages);
  const paginatedReviews = filteredReviews.slice(
    (currentReviewPage - 1) * REVIEWS_PER_PAGE,
    currentReviewPage * REVIEWS_PER_PAGE
  );

  const locationLabel = selectedService?.location || selectedService?.lokasi || '-';
  const categoryPath = [
    selectedService?.mainCategory,
    selectedService?.subCategory,
    selectedService?.category
  ]
    .filter(Boolean)
    .join(' > ');

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <SharedNavbar />
      <div style={{ minHeight: 'calc(100vh - 300px)', padding: '24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
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
              border: filter === 'all' ? '2px solid #B28A67' : '1px solid #ddd',
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
          <div className="vendor-grid">
            <p style={{ padding: '40px', color: '#999' }}>Memuat layanan...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="vendor-grid">
            <p style={{ padding: '40px', color: '#999' }}>
              Belum ada layanan favorit di kategori ini
            </p>
          </div>
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
                  <div className="vendor-cover" style={{ position: 'relative', overflow: 'hidden' }}>
                    <img 
                      src={service.images && service.images.length > 0 
                        ? service.images[currentImageIndex[service.id] || 0]
                        : imageUrl} 
                      alt={service.title}
                      style={{ transition: 'opacity 0.3s ease' }}
                    />

                    {service.images && service.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => handlePrevImage(e, service.id, service.images.length)}
                          style={{
                            position: 'absolute',
                            left: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            border: 'none',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            zIndex: 5,
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.8)'}
                          onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}
                          title="Foto sebelumnya"
                        >
                          ◀
                        </button>

                        <button
                          onClick={(e) => handleNextImage(e, service.id, service.images.length)}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            border: 'none',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            zIndex: 5,
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
                            top: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            zIndex: 4
                          }}
                        >
                          {(currentImageIndex[service.id] || 0) + 1}/{service.images.length}
                        </div>

                        <div
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.6)',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            display: 'flex',
                            gap: '4px',
                            zIndex: 4
                          }}
                        >
                          {service.images.map((_, idx) => (
                            <span
                              key={idx}
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: idx === (currentImageIndex[service.id] || 0) ? 'white' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex(prev => ({
                                  ...prev,
                                  [service.id]: idx
                                }));
                              }}
                              title={`Foto ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
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
                        <span className="price-amount">
                          {getServiceDisplayPrice(service)}
                        </span>
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
                  <span style={{ fontSize: '28px', fontWeight: '700', color: '#B28A67' }}>
                    {getServiceDisplayPrice(selectedService)}
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
                      color: detailTab === tab ? '#B28A67' : '#666',
                      border: 'none',
                      borderBottom: detailTab === tab ? '3px solid #B28A67' : 'none',
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
                              border: selectedItemDetail?.title === item.title ? '3px solid #B28A67' : '1px solid #ddd',
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
                              <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#B28A67' }}>
                                Rp {formatPrice(getItemPriceNumber(selectedItemDetail))}
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
                              backgroundColor: '#B28A67',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '14px'
                            }}
                            onClick={() => openChatModal(selectedService, selectedItemDetail)}
                            disabled={user && user.id === selectedService.vendorId}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#8F6B4A'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#B28A67'}
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
                <>
                  <div className="info-section">
                    <h4>📍 Vendor</h4>
                    <p>{selectedService.vendorName}</p>
                  </div>

                  <div className="info-section">
                    <h4>🏷️ Kategori</h4>
                    <p>{categoryPath || selectedService.category || '-'}</p>
                  </div>

                  <div className="info-section">
                    <h4>📈 Terjual</h4>
                    <p>{selectedService.rentCount ?? '0'}</p>
                  </div>

                  {(selectedService.location || selectedService.lokasi) && (
                    <div className="info-section">
                      <h4>📍 Lokasi Penjemputan</h4>
                      <p>{locationLabel}</p>
                    </div>
                  )}

                  {selectedService.minimumDays && (
                    <div className="info-section">
                      <h4>📅 Minimum Sewa</h4>
                      <p>{selectedService.minimumDays} hari</p>
                    </div>
                  )}

                  {selectedService.rentalPolicy && (
                    <div className="info-section">
                      <h4>📜 Kebijakan Sewa</h4>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{selectedService.rentalPolicy}</p>
                    </div>
                  )}

                  <div className="info-section">
                    <h4>🕒 Status</h4>
                    <p>Terakhir online baru-baru ini</p>
                  </div>
                </>
              )}

              {detailTab === 'reviews' && (
                <>
                  <div className="info-section">
                    <h4>⭐ Rating & Review</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#B28A67' }}>
                        {selectedService.rating?.toFixed?.(1) ?? selectedService.rating}
                      </span>
                      <span style={{ color: '#666' }}>{selectedService.rentCount} orang telah menyewa</span>
                    </div>
                    {!reviewsLoading && serviceReviews.length > 0 && (
                      <div className="review-summary-row">
                        <span className="review-summary-chip">Rata-rata ulasan: ⭐ {reviewAverage}</span>
                        <span className="review-summary-chip">Total review: {itemScopedReviews.length}</span>
                      </div>
                    )}
                    {selectedItemDetail?.id && (
                      <div className="review-summary-row" style={{ marginTop: '8px' }}>
                        <span className="review-summary-chip">Filter item aktif: {selectedItemDetail.namaBarang || selectedItemDetail.namaJasa || selectedItemDetail.title}</span>
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
                            {review.vendorReply && (
                              <div className="vendor-reply-box">
                                <div className="vendor-reply-label">Balasan vendor</div>
                                <p className="vendor-reply-text">{review.vendorReply}</p>
                              </div>
                            )}
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
                </>
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
                    color: '#B28A67',
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
                messages.map((msg, index) => (
                  <div
                    key={`${msg.id || msg.timestamp}-${index}`}
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
              <div className="chat-input-section" style={{ flexDirection: 'column', gap: '10px' }}>
                {(() => {
                  const statusConfig = getDealStatusConfig();
                  const finalPrice = dealData?.finalPrice || dealData?.originalPrice || 0;
                  const dealDisabled = dealData?.status === 'agreed' || dealData?.status === 'cancelled' || chatData?.dealStatus === 'closed' || chatData?.closedAt;

                  return (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        background: statusConfig.background
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '700', color: statusConfig.color }}>
                        {statusConfig.label}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '3px' }}>
                        {statusConfig.description}
                      </div>

                      {(chatData?.dealStatus === 'closed' || chatData?.closedAt) && (
                        <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '700', color: '#92400e' }}>
                          Chat sudah ditutup setelah pembayaran selesai.
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleDealAction('accept')}
                          disabled={dealDisabled}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #10b981',
                            background: 'rgba(16, 185, 129, 0.08)',
                            color: '#047857',
                            fontWeight: '700',
                            cursor: dealDisabled ? 'not-allowed' : 'pointer',
                            opacity: dealDisabled ? 0.55 : 1
                          }}
                        >
                          {dealData?.status === 'agreed' ? 'Deal Diterima' : 'Kirim Permintaan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDealAction('cancel')}
                          disabled={dealData?.status === 'cancelled'}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #ef4444',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#b91c1c',
                            fontWeight: '700',
                            cursor: dealData?.status === 'cancelled' ? 'not-allowed' : 'pointer',
                            opacity: dealData?.status === 'cancelled' ? 0.55 : 1
                          }}
                        >
                          {dealData?.status === 'cancelled' ? 'Dibatalkan' : 'Batal'}
                        </button>
                      </div>

                      {dealData?.status === 'agreed' && chatData?.dealStatus !== 'closed' && !chatData?.closedAt && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#1e40af' }}>
                          <div style={{ fontWeight: '700' }}>
                            Harga akhir: Rp {Number(finalPrice).toLocaleString('id-ID')}
                          </div>
                          {dealData.discountGiven && dealData.discount && (
                            <div style={{ marginTop: '2px' }}>
                              Potongan: Rp {Number(dealData.discount.amount || 0).toLocaleString('id-ID')}
                            </div>
                          )}
                          {dealData.id && (
                            <button
                              type="button"
                              onClick={() => router.push(`/transaction/payment?dealId=${dealData.id}`)}
                              style={{
                                marginTop: '7px',
                                padding: '7px 10px',
                                border: '1px solid #B28A67',
                                borderRadius: '8px',
                                background: 'rgba(178, 138, 103, 0.09)',
                                color: '#B28A67',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Lanjut ke Pembayaran
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Ketik pesan..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={chatData?.dealStatus === 'closed' || chatData?.closedAt}
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
              </div>
            )}
          </div>
        </div>
      )}
      </div>
      
      <style jsx>{`
        .vendor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
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
          border-color: #B28A67;
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
          color: #B28A67;
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
          font-size: 16px;
          font-weight: 700;
          color: #B28A67;
          margin-bottom: 12px;
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .price-label {
          font-size: 12px;
          color: #B28A67;
          font-weight: 600;
        }

        .price-amount {
          font-size: 18px;
          font-weight: 700;
          color: #B28A67;
        }

        .price-period {
          font-size: 12px;
          color: #666;
        }

        .btn-detail {
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.3s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .btn-detail:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(178, 138, 103, 0.3);
        }

        .btn-detail:active {
          transform: translateY(0);
        }

        @media (max-width: 1200px) {
          .vendor-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .vendor-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .vendor-grid {
            grid-template-columns: 1fr;
          }
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

        .vendor-reply-box {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(178, 138, 103, 0.06);
          border: 1px solid #bfdbfe;
        }

        .vendor-reply-label {
          font-size: 12px;
          font-weight: 700;
          color: #B28A67;
          margin-bottom: 4px;
        }

        .vendor-reply-text {
          margin: 0;
          font-size: 13px;
          color: #1e3a8a;
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
          background: #B28A67;
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
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 100%);
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
          box-shadow: 0 8px 20px rgba(178, 138, 103, 0.3);
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
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(178, 138, 103, 0.2);
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
          border-color: #B28A67;
          box-shadow: 0 0 0 3px rgba(178, 138, 103, 0.1);
        }

        .btn-send {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 100%);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-send:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(178, 138, 103, 0.3);
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
          border-color: #B28A67;
          box-shadow: 0 0 0 3px rgba(178, 138, 103, 0.1);
        }

        .btn-submit-rating {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 100%);
          color: white;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-submit-rating:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(178, 138, 103, 0.3);
        }

        .btn-submit-rating:active {
          transform: translateY(0);
        }
      `}</style>
    </>
  );
}
