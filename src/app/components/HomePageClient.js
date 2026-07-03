'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar';
import SharedNavbar from './SharedNavbar';
export default function HomePageClient() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [promos, setPromos] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [selectedChatItem, setSelectedChatItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('packages');
  const [modalImageIndex, setModalImageIndex] = useState(0);
  // ✅ NEW: Track image carousel for product cards
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [dealData, setDealData] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [dealProcessing, setDealProcessing] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [serviceReviews, setServiceReviews] = useState([]);
  const [selectedVendorProfile, setSelectedVendorProfile] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [reviewPage, setReviewPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchFilters, setSearchFilters] = useState({
    locationTerm: '',
    minRating: 'all',
    budget: '',
    sortBy: 'recommended'
  });
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [promoNow, setPromoNow] = useState(Date.now());
  const [userFavorites, setUserFavorites] = useState([]);
  const [favoriteLoading, setFavoriteLoading] = useState({});
  const [vendorReplyDrafts, setVendorReplyDrafts] = useState({});
  const [vendorReplySubmittingId, setVendorReplySubmittingId] = useState(null);
  const activeChatItem = selectedChatItem || selectedItemDetail;

  const fetchFavorites = useCallback(async (currentUser) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/favorites?userId=${currentUser.id}`);
      const data = await response.json();
      setUserFavorites(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }, []);

  const toggleFavorite = async (service, isFavorite) => {
    if (!user) {
      alert('Silakan login terlebih dahulu');
      return;
    }

    setFavoriteLoading(prev => ({ ...prev, [service.id]: true }));

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          serviceId: service.id,
          type: 'service'
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update local favorites state
        if (data.isFavorite) {
          setUserFavorites(prev => [...prev, { id: data.data.id, serviceId: service.id, userId: user.id, type: 'service' }]);
        } else {
          setUserFavorites(prev => prev.filter(fav => fav.serviceId !== service.id));
        }
      } else {
        alert('Gagal: ' + (data.message || 'Error'));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Error: ' + error.message);
    } finally {
      setFavoriteLoading(prev => ({ ...prev, [service.id]: false }));
    }
  };

  const isFavorited = (serviceId) => {
    return userFavorites.some(fav => fav.serviceId === serviceId);
  };

  const fetchNotifications = useCallback(async (currentUser) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/notifications?userId=${currentUser.id}`);
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      const response = await fetch('/api/vendor/services', { cache: 'no-store' });
      const data = await response.json();
      if (data.success) {
        setServices(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPromos = useCallback(async () => {
    try {
      const cachedUser = JSON.parse(localStorage.getItem('user') || 'null');
      const promoQuery = cachedUser?.id
        ? `/api/promos?userId=${encodeURIComponent(cachedUser.id)}`
        : '/api/promos';
      const response = await fetch(promoQuery, { cache: 'no-store' });
      const data = await response.json();
      if (data.success) {
        setPromos(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching promos:', error);
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    loadServices();
    loadPromos();

    // Refresh services setiap 10 detik untuk deteksi service baru dari vendor
    const serviceInterval = setInterval(loadServices, 10000);
    const promoInterval = setInterval(loadPromos, 15000);
    return () => {
      clearInterval(serviceInterval);
      clearInterval(promoInterval);
    };
  }, [loadServices, loadPromos]);

  // Auto-refresh when payment completes in another tab/component
  useEffect(() => {
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === 'lastPaymentAt') {
        // reload services to reflect reserved/decremented stock
        loadServices();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadServices]);

  useEffect(() => {
    const timer = setInterval(() => setPromoNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch notifications for current user
  useEffect(() => {
    if (!user) return;

    fetchNotifications(user);

    // Polling every 5 seconds untuk check notifikasi baru
    const interval = setInterval(() => fetchNotifications(user), 5000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Fetch favorites for current user
  useEffect(() => {
    if (!user) {
      setUserFavorites([]);
      return;
    }
    fetchFavorites(user);
  }, [user, fetchFavorites]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload();
  };

  // ✅ NEW: Handle image navigation in carousel
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

// Helper function to safely format price
  const formatPrice = (price) => {
    if (typeof price === 'number' && isFinite(price) && price > 0 && price < 1e20) {
      return price.toLocaleString('id-ID');
    }
    return '0';
  };

  // Helper fungsi baru untuk memastikan ekstraksi harga yang absolut
  const getItemPriceNumber = (item) => {
    if (!item) return 0;
    return Number(item.hargaPcs || item.hargaSesi || item.harga || item.price || 0);
  };

  // Perbarui getItemsPrice untuk mengonsumsi fungsi pembantu baru
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

  const getServicePriceNumber = (service) => {
    const itemPrice = getItemsPrice(service);
    if (itemPrice?.min) return Number(itemPrice.min) || 0;
    return Number(service?.price || service?.tarif || 0) || 0;
  };

  const getNonEmptyObjectEntries = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    return Object.entries(value).filter(([, entryValue]) => {
      if (entryValue === null || entryValue === undefined) return false;
      if (typeof entryValue === 'string') return entryValue.trim() !== '';
      return true;
    });
  };

  const formatFieldLabel = (key) =>
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (char) => char.toUpperCase())
      .trim();

  const getServiceThumbnail = (service) => {
    if (!service) {
      return 'https://via.placeholder.com/400x300?text=' + encodeURIComponent('Service');
    }

    return (
      service.thumbnail ||
      service.coverImage ||
      service.image ||
      (Array.isArray(service.images) && service.images.length > 0 ? service.images[0] : null) ||
      'https://via.placeholder.com/400x300?text=' + encodeURIComponent(service.title || 'Service')
    );
  };

  const getServiceGalleryImages = (service) => {
    if (!service) return [];

    const uploadedImages = Array.isArray(service.images)
      ? service.images.filter((img) => typeof img === 'string' && img.trim() !== '')
      : [];

    if (uploadedImages.length > 0) {
      return uploadedImages.slice(0, 5);
    }

    return [getServiceThumbnail(service)];
  };

  const getItemPreviewImage = (item) =>
    item?.thumbnail ||
    item?.image ||
    (Array.isArray(item?.images) && item.images.length > 0 ? item.images[0] : null) ||
    'https://via.placeholder.com/120x120?text=Paket';

  const openModal = (service) => {
    setSelectedService(service);
    setSelectedVendorProfile(null);
    setDetailTab('packages');
    setSelectedItemDetail(null);
    setModalImageIndex(0);
    setActivePromoIndex(0);
    setServiceReviews([]);
    setReviewsLoading(true);
    setReviewFilter('all');
    setReviewPage(1);
    setModalOpen(true);

    const fetchVendorProfile = async () => {
      try {
        const response = await fetch(`/api/vendor/profile?vendorId=${encodeURIComponent(service.vendorId)}`);
        const data = await response.json();
        if (data.success && data.data) {
          setSelectedVendorProfile(data.data);
        } else {
          setSelectedVendorProfile(null);
        }
      } catch (error) {
        console.error('Error fetching vendor profile:', error);
        setSelectedVendorProfile(null);
      }
    };

    fetchVendorProfile();

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
    setSelectedVendorProfile(null);
    setSelectedItemDetail(null);
    setModalImageIndex(0);
    setActivePromoIndex(0);
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

  const openChatModal = async (service, itemDetail = null) => {
    if (!user) {
      alert('Silakan login terlebih dahulu');
      return;
    }

    setSelectedService(service);
    setSelectedChatItem(itemDetail);
    setMessages([]);
    setNewMessage('');
    setShowRatingForm(false);
    setRatingValue(5);
    setRatingReview('');
    setDealData(null);
    setChatModalOpen(true);
    setModalOpen(false);

    try {
      console.log('[openChatModal] Loading chat for service:', service.id);

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
        console.log('[openChatModal] Found existing chat');
        setChatData(data.data);
        setMessages(data.data.messages || []);

        // Load deal status
        const dealResponse = await fetch(`/api/deals?chatId=${data.data.id}`);
        const dealDataResp = await dealResponse.json();
        if (dealDataResp.success && dealDataResp.data) {
          setDealData(dealDataResp.data);
          // Rating form moved to dedicated page - not shown in chat
          setShowRatingForm(false);
        } else {
          setDealData(null);
        }
      } else {
        console.log('[openChatModal] No existing chat found, starting new');
        setChatData(null);
        setMessages([]);
        setDealData(null);
        setSelectedChatItem(null);
      }
    } catch (error) {
      console.error('[openChatModal] Error:', error);
      // Still open chat, just without history
      setChatData(null);
      setMessages([]);
      setDealData(null);
    }
  };

  const closeChatModal = () => {
    setChatModalOpen(false);
    setSelectedService(null);
    setChatData(null);
    setMessages([]);
    setDealData(null);
    setShowRatingForm(false);
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
      console.log('[sendMessage] Sending:', newMessage);

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
          itemName: activeChatItem?.namaBarang || activeChatItem?.namaJasa || null,
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
    } catch (error) {
      console.error('[sendMessage] Error:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleDealAction = async (action) => {
    if (dealProcessing) return;
    if (!selectedService || !user || !chatData?.id) return;

    setDealProcessing(true);
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
    } finally {
      setDealProcessing(false);
    }
  };

  const getDealStatusConfig = () => {
    if (!dealData) {
      return {
        label: 'Belum ada status deal',
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
      // Jika sudah rating, allow new cycle
      if (dealData.ratingCompleted) {
        return {
          label: 'Rating selesai',
          description: 'Anda dapat melanjutkan dengan penawaran baru untuk produk ini atau lanjut negosiasi.',
          background: '#fef3c7',
          color: '#92400e'
        };
      }
      // Jika belum rating, tunggu rating form
      return {
        label: 'Transaksi selesai',
        description: 'Transaksi sudah selesai. Silakan berikan rating di bawah.',
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
          dealId: dealData?.id || null,
          rating: ratingValue,
          review: ratingReview
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Rating berhasil disimpan!');
        
        // Reset rating form dan deal status untuk allow new cycle
        setShowRatingForm(false);
        setRatingValue(5);
        setRatingReview('');
        
        // Reset chat/deal cycle locally after rating success.
        setDealData(null);
        setChatData((prev) => (prev ? { ...prev, dealStatus: null } : prev));
        
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

  const submitVendorReply = async (review) => {
    if (!user || user.role !== 'vendor' || user.id !== selectedService?.vendorId) {
      alert('Hanya vendor pemilik layanan yang dapat membalas review.');
      return;
    }

    const reply = (vendorReplyDrafts[review.id] || '').trim();
    if (!reply) {
      alert('Balasan tidak boleh kosong');
      return;
    }

    setVendorReplySubmittingId(review.id);

    try {
      const response = await fetch('/api/ratings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratingId: review.id,
          vendorId: selectedService.vendorId,
          serviceId: selectedService.id,
          reply
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan balasan vendor');
      }

      setServiceReviews((prev) => prev.map((item) => (
        item.id === review.id
          ? { ...item, vendorReply: data.data.vendorReply, vendorReplyAt: data.data.vendorReplyAt, vendorReplyBy: data.data.vendorReplyBy }
          : item
      )));
      setVendorReplyDrafts((prev) => ({ ...prev, [review.id]: '' }));
      alert('Balasan vendor berhasil disimpan');
    } catch (error) {
      console.error('Error saving vendor reply:', error);
      alert(error.message || 'Gagal menyimpan balasan vendor');
    } finally {
      setVendorReplySubmittingId(null);
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

    // Filter by category (support both mainCategory dan category untuk kompatibilitas)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => 
        (service.mainCategory === selectedCategory) || (service.category === selectedCategory)
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(service =>
        service.title?.toLowerCase().includes(term) ||
        service.vendorName?.toLowerCase().includes(term) ||
        service.shortDescription?.toLowerCase().includes(term) ||
        service.description?.toLowerCase().includes(term) ||
        service.location?.toLowerCase().includes(term) ||
        service.lokasi?.toLowerCase().includes(term)
      );
    }

    const locationTerm = (searchFilters.locationTerm || '').trim().toLowerCase();
    if (locationTerm) {
      filtered = filtered.filter(service =>
        service.location?.toLowerCase().includes(locationTerm) ||
        service.lokasi?.toLowerCase().includes(locationTerm)
      );
    }

    if (searchFilters.minRating !== 'all') {
      const minimumRating = Number(searchFilters.minRating) || 0;
      filtered = filtered.filter(service => Number(service.rating || 0) >= minimumRating);
    }

    const budgetRaw = String(searchFilters.budget || '').replace(/[^\d]/g, '');
    const budgetValue = Number(budgetRaw);
    if (Number.isFinite(budgetValue) && budgetValue > 0) {
      filtered = filtered.filter((service) => {
        const price = getServicePriceNumber(service);
        return price > 0 && price >= budgetValue;
      });
    }

    const sortBy = searchFilters.sortBy || 'recommended';
    filtered = [...filtered].sort((a, b) => {
      const ratingA = Number(a.rating || 0);
      const ratingB = Number(b.rating || 0);
      const rentA = Number.parseInt(String(a.rentCount || '0').replace(/[K,]/g, ''), 10) || 0;
      const rentB = Number.parseInt(String(b.rentCount || '0').replace(/[K,]/g, ''), 10) || 0;
      const priceA = getServicePriceNumber(a);
      const priceB = getServicePriceNumber(b);

      if (sortBy === 'popular') return rentB - rentA;
      if (sortBy === 'rating') return ratingB - ratingA || rentB - rentA;
      if (sortBy === 'price_low') return priceA - priceB || ratingB - ratingA;
      if (sortBy === 'price_high') return priceB - priceA || ratingB - ratingA;
      if (sortBy === 'newest') return Number(b.id || 0) - Number(a.id || 0);

      return ratingB - ratingA || rentB - rentA || priceA - priceB;
    });

    return filtered;
  };

  const getServiceAvailability = (service) => Number(
    service?.availableQuantity ?? service?.availability ?? service?.quantity ?? 0
  );

  const getDisplayedStock = (service) => {
    if (!service) return 0;

    if (service.type === 'jasa') {
      return getServiceAvailability(service);
    }

    if (Array.isArray(service.items) && service.items.length > 0) {
      return service.items.reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }

    return Number(service.availableQuantity ?? service.quantity ?? service.availability ?? 0) || 0;
  };

  const filteredServices = getFilteredServices();
  // Derive a featured services list for the hero carousel (safe fallback)
  const featuredServices = Array.isArray(filteredServices) ? filteredServices.slice(0, 5) : [];
  const visiblePromos = Array.isArray(promos)
    ? promos.filter((promo) => Number(promo?.promoPrice) > 0 && isPromoActiveNow(promo))
    : [];

  const handlePromoCheckout = (promoId) => {
    if (!promoId) return;
    if (!user) {
      alert('Silakan login terlebih dahulu untuk mengambil promo.');
      return;
    }

    const promo = selectedServicePromos.find((item) => String(item.id) === String(promoId));
    if (promo?.userHasClaimed) {
      alert('Promo ini hanya bisa dipakai 1 kali per user.');
      return;
    }

    const remainingApplicants = getPromoRemainingApplicants(promo);
    if (Number.isFinite(remainingApplicants) && remainingApplicants <= 0) {
      alert('Kuota promo sudah habis.');
      return;
    }

    if (promo?.endAt && new Date(promo.endAt).getTime() < promoNow) {
      alert('Promo sudah berakhir.');
      return;
    }

    router.push(`/transaction/payment?promoId=${encodeURIComponent(promoId)}`);
  };

  const getPromosForService = (service) => {
    if (!service) return [];
    const serviceVendorId = service.vendorId ?? service.vendor?.id;
    return visiblePromos
      .filter((promo) => String(promo.vendorId) === String(serviceVendorId))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  };

  const getPromoCountdownLabel = (promo) => {
    if (!promo?.endAt) return 'Tanpa batas waktu';

    const endTime = new Date(promo.endAt).getTime();
    if (Number.isNaN(endTime)) return 'Tanpa batas waktu';

    const diff = endTime - promoNow;
    if (diff < 0) return 'Berakhir';

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`.trim();
  };

  const getImageSrc = (img) => {
    if (!img) return 'https://via.placeholder.com/800x500?text=Promo';
    if (typeof img === 'string') return img;
    if (typeof img === 'object') {
      if (typeof img.url === 'string' && img.url.trim()) return img.url;
      if (typeof img.src === 'string' && img.src.trim()) return img.src;
      if (typeof img.data === 'string' && img.data.trim()) return img.data;
    }
    return 'https://via.placeholder.com/800x500?text=Promo';
  };

  function isPromoActiveNow(promo) {
    if (!promo) return false;
    // Check if active field is disabled (0 or false)
    if (promo.active === 0 || promo.active === false) return false;
    // If API already calculated isActiveNow, use that (trust API)
    if (promo.isActiveNow !== undefined) return Boolean(promo.isActiveNow);
    // Otherwise calculate locally
    const nowTime = Number.isFinite(Number(promoNow)) ? promoNow : Date.now();
    const startTime = promo?.startAt ? new Date(promo.startAt).getTime() : -Infinity;
    const endTime = promo?.endAt ? new Date(promo.endAt).getTime() : Infinity;
    if (Number.isNaN(startTime) || Number.isNaN(endTime)) return false;
    return startTime <= nowTime && nowTime <= endTime;
  }

  const getPromoRemainingApplicants = (promo) => {
    if (Number.isFinite(Number(promo?.remainingApplicants))) {
      return Number(promo.remainingApplicants);
    }

    if (Number.isFinite(Number(promo?.maxApplicants)) && Number.isFinite(Number(promo?.claimedCount))) {
      return Math.max(0, Number(promo.maxApplicants) - Number(promo.claimedCount));
    }

    return null;
  };

  const selectedServicePromos = getPromosForService(selectedService);
  const normalizedPromoIndex = selectedServicePromos.length > 0
    ? ((activePromoIndex % selectedServicePromos.length) + selectedServicePromos.length) % selectedServicePromos.length
    : 0;
  const activeServicePromo = selectedServicePromos[normalizedPromoIndex] || null;
  const activeServicePromoRemainingApplicants = getPromoRemainingApplicants(activeServicePromo);
  const activeServicePromoIsExpired = Boolean(activeServicePromo?.endAt && new Date(activeServicePromo.endAt).getTime() < promoNow);
  const activeServicePromoIsClaimed = Boolean(activeServicePromo?.userHasClaimed);
  const activeServicePromoCanCheckout = Boolean(activeServicePromo)
    && !activeServicePromoIsExpired
    && !activeServicePromoIsClaimed
    && (activeServicePromoRemainingApplicants === null || activeServicePromoRemainingApplicants > 0);

  const showNextPromo = () => {
    if (selectedServicePromos.length <= 1) return;
    setActivePromoIndex((prev) => (prev + 1) % selectedServicePromos.length);
  };

  const showPrevPromo = () => {
    if (selectedServicePromos.length <= 1) return;
    setActivePromoIndex((prev) => (prev - 1 + selectedServicePromos.length) % selectedServicePromos.length);
  };

  const specificationEntries = getNonEmptyObjectEntries(selectedService?.specifications);
  const descriptionTableEntries = getNonEmptyObjectEntries(selectedService?.descriptionTable);
  const variationEntries = getNonEmptyObjectEntries(selectedService?.variations);
  const locationLabel = selectedService?.location || selectedService?.lokasi || '-';
  const categoryPath = [
    selectedService?.mainCategory,
    selectedService?.subCategory,
    selectedService?.superSubCategory
  ].filter(Boolean).join(' > ');
  const REVIEWS_PER_PAGE = 5;
  const itemScopedReviews = selectedItemDetail?.id
    ? serviceReviews.filter((review) => String(review.itemId || '') === String(selectedItemDetail.id))
    : serviceReviews;
  const filteredReviews = itemScopedReviews.filter((review) =>
    reviewFilter === 'all' ? true : Number(review.rating) === Number(reviewFilter)
  );
  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const currentReviewPage = Math.min(reviewPage, totalReviewPages);
  const paginatedReviews = filteredReviews.slice(
    (currentReviewPage - 1) * REVIEWS_PER_PAGE,
    currentReviewPage * REVIEWS_PER_PAGE
  );
  const reviewAverage =
    itemScopedReviews.length > 0
      ? (
          itemScopedReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          itemScopedReviews.length
        ).toFixed(1)
      : '0.0';

  return (
    <div>
      <SharedNavbar />

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-inner">
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
              {user && user.role === 'customer' && (
                <Link href="/vendor/register" className="btn-outline" style={{textDecoration: 'none', display: 'inline-block'}}>
                  Menjadi Vendor
                </Link>
              )}
            </div>
          </div>

          <div className="hero-carousel">
            {featuredServices.length > 0 ? (
              <>
                <div className="hero-featured-card">
                  {(() => {
                    const service = featuredServices[heroImageIndex % featuredServices.length];
                    const serviceImage = service.image || (service.images && service.images.length > 0 ? service.images[0] : 'https://via.placeholder.com/420x400?text=Service');
                    const priceInfo = getServicePriceNumber(service);
                    const rentCountNum = typeof service.rentCount === 'string' 
                      ? parseInt(service.rentCount.replace(/[K,]/g, '')) || 0
                      : service.rentCount || 0;

                    return (
                      <div
                        className="featured-card-content"
                        onClick={() => {
                          setSelectedService(service);
                          setModalOpen(true);
                          setDetailTab('overview');
                          setModalImageIndex(0);
                        }}
                      >
                        <div className="featured-card-image">
                          <img src={serviceImage} alt={service.title} />
                          <button
                            className="featured-card-favorite"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(service, isFavorited(service.id));
                            }}
                            disabled={favoriteLoading[service.id]}
                          >
                            {isFavorited(service.id) ? '❤️' : '🤍'}
                          </button>
                        </div>
                        <div className="featured-card-info">
                          <h3>{service.title}</h3>
                          <p className="featured-vendor">{service.vendorName}</p>
                          <div className="featured-stats">
                            <span>⭐ {Number(service.rating || 0).toFixed(1)}</span>
                            <span>👥 {rentCountNum > 1000 ? (rentCountNum / 1000).toFixed(1) + 'K' : rentCountNum}</span>
                          </div>
                          <div className="featured-price">
                            <span>Mulai dari</span>
                            <strong>{priceInfo ? `Rp${priceInfo.toLocaleString('id-ID')}` : 'Hubungi'}</strong>
                          </div>
                          <button className="btn-featured-detail">
                            Lihat Detail →
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="hero-carousel-dots">
                  {featuredServices.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`hero-carousel-dot ${idx === (heroImageIndex % featuredServices.length) ? 'active' : ''}`}
                      onClick={() => setHeroImageIndex(idx)}
                      aria-label={`Tampilkan layanan ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="hero-carousel-placeholder">
                <p>Memuat layanan unggulan...</p>
              </div>
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
          <p>Dilindungi 🛡️ RentGuard Protection</p>
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
          categoriesSource={services}
          onSearch={(term, category) => {
            setSearchTerm(term);
            setSelectedCategory(category);
          }}
          onFiltersChange={(filters) => setSearchFilters((prev) => ({ ...prev, ...filters }))}
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
              const mainCategoryText = String(service.mainCategory || service.category || '').toLowerCase();
              const isJasaService = service.type === 'jasa' || mainCategoryText.includes('jasa');
              const serviceAvailability = getServiceAvailability(service);
              const shortDesc = service.detailDescription || service.shortDescription || (service.description ? service.description.substring(0, 80) + '...' : '');
              const imageUrl = service.image || (service.images && service.images.length > 0 ? service.images[0] : 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(service.title || 'Service'));
              
              return (
                <div key={service.id} className="vendor-card">
                  {isPopular && <div className="popular-badge">🔥 Populer</div>}
                  
                  {/* Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(service, isFavorited(service.id))}
                    disabled={favoriteLoading[service.id]}
                    style={{
                      background: isFavorited(service.id) ? '#FF6B6B' : 'rgba(255,255,255,0.9)',
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
                      transition: 'all 0.3s ease',
                      opacity: favoriteLoading[service.id] ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!favoriteLoading[service.id]) {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!favoriteLoading[service.id]) {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                      }
                    }}
                    title={isFavorited(service.id) ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                  >
                    {isFavorited(service.id) ? '❤️' : '🤍'}
                  </button>
                  
                  {/* ✅ CAROUSEL */}
                  <div className="vendor-cover" style={{ position: 'relative', overflow: 'hidden' }}>
                    <img 
                      src={service.images && service.images.length > 0 
                        ? service.images[currentImageIndex[service.id] || 0] 
                        : imageUrl} 
                      alt={service.title}
                      style={{ transition: 'opacity 0.3s ease' }}
                    />
                    
                    {/* Carousel Controls (show if multiple images) */}
                    {service.images && service.images.length > 1 && (
                      <>
                        {/* Prev Button */}
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
                        
                        {/* Next Button */}
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
                        
                        {/* Image Counter Badge */}
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
                        
                        {/* Image Dots */}
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
                          {getItemsPrice(service)?.display || formatPrice(service.price)}
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
              {/* Thumbnail utama service, dipisahkan dari gambar katalog/aset paket */}
              <div className="modal-image">
                <img
                  src={getServiceGalleryImages(selectedService)[modalImageIndex] || getServiceThumbnail(selectedService)}
                  alt={selectedService.title || 'Thumbnail service'}
                />

                {getServiceGalleryImages(selectedService).length > 1 && (
                  <>
                    <button
                      type="button"
                      className="modal-image-nav prev"
                      onClick={() => {
                        const total = getServiceGalleryImages(selectedService).length;
                        setModalImageIndex((prev) => (prev - 1 + total) % total);
                      }}
                      aria-label="Foto sebelumnya"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      className="modal-image-nav next"
                      onClick={() => {
                        const total = getServiceGalleryImages(selectedService).length;
                        setModalImageIndex((prev) => (prev + 1) % total);
                      }}
                      aria-label="Foto berikutnya"
                    >
                      ▶
                    </button>

                    <div className="modal-image-counter">
                      {modalImageIndex + 1}/{getServiceGalleryImages(selectedService).length}
                    </div>
                  </>
                )}
              </div>

              {getServiceGalleryImages(selectedService).length > 1 && (
                <div className="modal-image-dots">
                  {getServiceGalleryImages(selectedService).map((img, idx) => (
                    <button
                      type="button"
                      key={`${img.slice(0, 20)}-${idx}`}
                      className={`modal-image-dot ${modalImageIndex === idx ? 'active' : ''}`}
                      onClick={() => setModalImageIndex(idx)}
                      aria-label={`Lihat foto ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="modal-price-block">
                <div className="modal-price-title">Harga Sewa</div>
                <div className="modal-price">
                  <span className="modal-price-label">Rp</span>
                  <span className="modal-price-amount">{selectedItemDetail ? (selectedItemDetail.hargaPcs ? Number(selectedItemDetail.hargaPcs).toLocaleString('id-ID') : Number(selectedItemDetail.hargaSesi).toLocaleString('id-ID')) : formatPrice(selectedService.price ?? selectedService.harga)}</span>
                  <span className="modal-price-period">/ {selectedItemDetail?.hargaSesi ? 'Hari' : selectedItemDetail?.hargaPcs ? 'Pcs' : 'hari'}</span>
                </div>
              </div>

              <div className="modal-info">
              <div className="modal-tabs">
                  <button
                    className={`tab ${detailTab === 'packages' ? 'active' : ''}`}
                    onClick={() => {
                      setDetailTab('packages');
                      setSelectedItemDetail(null);
                    }}
                  >
                    📦 Paket Tersedia
                  </button>
                  <button
                    className={`tab ${detailTab === 'description' ? 'active' : ''}`}
                    onClick={() => setDetailTab('description')}
                  >
                    Deskripsi Produk
                  </button>
                  <button
                    className={`tab ${detailTab === 'information' ? 'active' : ''}`}
                    onClick={() => setDetailTab('information')}
                  >
                    Informasi Penjual
                  </button>
                  <button
                    className={`tab ${detailTab === 'reviews' ? 'active' : ''}`}
                    onClick={() => setDetailTab('reviews')}
                  >
                    Rating & Review
                  </button>
                </div>

                <div className="tab-panel">
                  {detailTab === 'packages' && (
                    <>
                      {selectedService.items && selectedService.items.length > 0 ? (
                        <>
                          {/* Package Gallery */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '16px',
                            marginBottom: '24px'
                          }}>
                            {selectedService.items.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                onClick={() => setSelectedItemDetail(item)}
                                style={{
                                  cursor: 'pointer',
                                  borderRadius: '14px',
                                  overflow: 'hidden',
                                  border: selectedItemDetail?.id === item.id ? '3px solid #B28A67' : '1px solid #ddd',
                                  transition: 'all 0.3s ease',
                                  transform: selectedItemDetail?.id === item.id ? 'scale(1.05)' : 'scale(1)',
                                  backgroundColor: '#fff'
                                }}
                              >
                                <div style={{ position: 'relative' }}>
                                  <img
                                    src={getItemPreviewImage(item)}
                                    alt={item.namaBarang || item.namaJasa}
                                    style={{
                                      width: '100%',
                                      height: '120px',
                                      objectFit: 'cover'
                                    }}
                                  />
                                </div>
                                <div style={{ 
                                  padding: '10px', 
                                  backgroundColor: selectedItemDetail?.id === item.id ? '#f5f3ff' : '#fafafa',
                                  borderTop: '1px solid #eee'
                                }}>
                                  <h4 style={{ 
                                    margin: '0 0 6px 0', 
                                    fontSize: '12px', 
                                    fontWeight: '600',
                                    color: '#333',
                                    lineHeight: '1.3'
                                  }}>
                                    {item.namaBarang || item.namaJasa}
                                  </h4>
                                  {item.deskripsi && (
                                    <p style={{ 
                                      margin: '0 0 6px 0', 
                                      fontSize: '11px', 
                                      color: '#666',
                                      lineHeight: '1.3',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {item.deskripsi}
                                    </p>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <p style={{ 
                                      margin: '0', 
                                      fontSize: '11px', 
                                      fontWeight: '600',
                                      color: '#B28A67'
                                    }}>
                                      Rp {item.hargaPcs ? Number(item.hargaPcs).toLocaleString('id-ID') : Number(item.hargaSesi).toLocaleString('id-ID')}
                                    </p>
                                    {item.stok !== undefined && (
                                      <p style={{ 
                                        margin: '0', 
                                        fontSize: '10px', 
                                        fontWeight: '600',
                                        color: item.stok > 0 ? '#10b981' : '#dc2626',
                                        backgroundColor: item.stok > 0 ? '#d1fae5' : '#fee2e2',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {item.stok > 0 ? `Stok: ${item.stok}` : 'Habis'}
                                      </p>
                                    )}
                                    {item.stok === undefined && selectedService?.type === 'jasa' && (
                                      <p style={{
                                        margin: '0',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        color: (getServiceAvailability(selectedService) > 0) ? '#10b981' : '#dc2626',
                                        backgroundColor: (getServiceAvailability(selectedService) > 0) ? '#d1fae5' : '#fee2e2',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {getServiceAvailability(selectedService) > 0
                                          ? `Availability: ${getServiceAvailability(selectedService)}`
                                          : 'Penuh'}
                                      </p>
                                    )}
                                  </div>
                                </div>
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
                              {(() => {
                                const jasaAvailability = getServiceAvailability(selectedService);
                                const isJasaItem = selectedService?.type === 'jasa' && selectedItemDetail.stok === undefined;
                                const isUnavailable = isJasaItem ? jasaAvailability <= 0 : selectedItemDetail.stok === 0;

                                return (
                                  <>
                              <div style={{ marginBottom: '16px' }}>
                                <img
                                  src={getItemPreviewImage(selectedItemDetail)}
                                  alt={selectedItemDetail.namaBarang || selectedItemDetail.namaJasa}
                                  style={{
                                    width: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '14px'
                                  }}
                                />
                              </div>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>
                                {selectedItemDetail.namaBarang || selectedItemDetail.namaJasa}
                              </h4>
                              {selectedItemDetail.deskripsi && (
                                <p style={{ 
                                  margin: '0 0 12px 0', 
                                  fontSize: '14px', 
                                  color: '#555',
                                  lineHeight: '1.5'
                                }}>
                                  {selectedItemDetail.deskripsi}
                                </p>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Harga</p>
                                  <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#B28A67' }}>
                                    Rp {selectedItemDetail.hargaPcs ? Number(selectedItemDetail.hargaPcs).toLocaleString('id-ID') : Number(selectedItemDetail.hargaSesi).toLocaleString('id-ID')}
                                    {selectedItemDetail.hargaSesi ? ' / Hari' : ' / Pcs'}
                                  </p>
                                </div>
                                {selectedItemDetail.stok !== undefined && (
                                  <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Ketersediaan</p>
                                    <p style={{ 
                                      margin: '0', 
                                      fontSize: '16px', 
                                      fontWeight: 'bold',
                                      color: selectedItemDetail.stok > 0 ? '#10b981' : '#dc2626'
                                    }}>
                                      {selectedItemDetail.stok > 0 ? `${selectedItemDetail.stok} Tersedia` : 'Habis'}
                                    </p>
                                  </div>
                                )}
                                {isJasaItem && (
                                  <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Availability</p>
                                    <p style={{
                                      margin: '0',
                                      fontSize: '16px',
                                      fontWeight: 'bold',
                                      color: jasaAvailability > 0 ? '#10b981' : '#dc2626'
                                    }}>
                                      {jasaAvailability > 0 ? `${jasaAvailability} Tim/Provider` : 'Penuh'}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {(() => {
                                const selectedItemReviews = serviceReviews.filter((review) => String(review.itemId || '') === String(selectedItemDetail.id));
                                const latestItemReviews = selectedItemReviews.slice(0, 3);
                                if (latestItemReviews.length === 0) {
                                  return (
                                    <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '10px', background: '#fff', border: '1px solid #e5e7eb' }}>
                                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700' }}>Review Paket Ini</div>
                                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Belum ada review untuk paket terpilih.</div>
                                    </div>
                                  );
                                }

                                return (
                                  <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '10px', background: '#fff', border: '1px solid #e5e7eb' }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700', marginBottom: '6px' }}>
                                      Review Paket Ini ({selectedItemReviews.length})
                                    </div>
                                    <div style={{ display: 'grid', gap: '6px' }}>
                                      {latestItemReviews.map((review) => (
                                        <div key={review.id} style={{ fontSize: '12px', color: '#374151', background: '#f9fafb', borderRadius: '8px', padding: '8px' }}>
                                          <div style={{ fontWeight: '700' }}>⭐ {Number(review.rating || 0).toFixed(1)} - {review.customerName || 'Customer'}</div>
                                          <div style={{ marginTop: '3px' }}>{review.review?.trim() || 'Customer tidak menulis komentar.'}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                              <button
                                className="btn-primary-modal"
                                onClick={() => openChatModal(selectedService, selectedItemDetail)}
                                disabled={user && user.id === selectedService.vendorId || isUnavailable}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  backgroundColor: isUnavailable ? '#d1d5db' : '#B28A67',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: (user && user.id === selectedService.vendorId) || isUnavailable ? 'not-allowed' : 'pointer',
                                  opacity: (user && user.id === selectedService.vendorId) || isUnavailable ? 0.5 : 1
                                }}
                              >
                                {isUnavailable
                                  ? (isJasaItem ? '⛔ Availability Penuh' : '⛔ Stok Habis')
                                  : '💬 Chat untuk Paket Ini'}
                              </button>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="info-section">
                          <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
                            Belum ada paket tersedia
                          </p>
                        </div>
                      )}

                      {selectedServicePromos.length > 0 && (
                        <div
                          style={{
                            marginTop: '20px',
                            padding: '14px',
                            border: '1px solid #bfdbfe',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #fff8f2, #fff3ea)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#B28A67' }}>
                              Promo Vendor
                            </h4>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                              {selectedServicePromos.length} promo tersedia
                            </span>
                          </div>

                          {activeServicePromo && (
                            <div
                              onWheel={(event) => {
                                if (Math.abs(event.deltaX) < 8 && Math.abs(event.deltaY) < 8) return;
                                if (event.deltaX > 0 || event.deltaY > 0) {
                                  showNextPromo();
                                } else {
                                  showPrevPromo();
                                }
                              }}
                              style={{
                                border: '1px solid #dbeafe',
                                borderRadius: '14px',
                                background: 'white',
                                overflow: 'hidden'
                              }}
                            >
                              <div style={{ position: 'relative', height: '190px', background: '#e5e7eb' }}>
                                <img
                                  src={getImageSrc(activeServicePromo?.image)}
                                  alt={activeServicePromo.title || 'Promo'}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(event) => {
                                    event.currentTarget.src = 'https://via.placeholder.com/800x500?text=Promo';
                                  }}
                                />

                                {selectedServicePromos.length > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={showPrevPromo}
                                      style={{
                                        position: 'absolute',
                                        left: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '999px',
                                        border: 'none',
                                        background: 'rgba(15, 23, 42, 0.55)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '800'
                                      }}
                                      aria-label="Promo sebelumnya"
                                    >
                                      ◀
                                    </button>
                                    <button
                                      type="button"
                                      onClick={showNextPromo}
                                      style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '999px',
                                        border: 'none',
                                        background: 'rgba(15, 23, 42, 0.55)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '800'
                                      }}
                                      aria-label="Promo berikutnya"
                                    >
                                      ▶
                                    </button>
                                  </>
                                )}
                              </div>

                              <div style={{ padding: '14px' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                                  Promo {normalizedPromoIndex + 1} dari {selectedServicePromos.length}
                                </p>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '27px', lineHeight: '1.2', color: '#1f2937' }}>
                                  {activeServicePromo.title || 'Promo Spesial'}
                                </h4>
                                <p style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '14px', lineHeight: '1.45' }}>
                                  {activeServicePromo.description || 'Promo vendor dengan harga spesial. Geser kiri atau kanan untuk melihat promo lain.'}
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                  <div>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Harga Promo</p>
                                    <p style={{ margin: 0, fontSize: '32px', fontWeight: '900', color: '#dc2626', lineHeight: '1.1' }}>
                                      Rp {Number(activeServicePromo.promoPrice || 0).toLocaleString('id-ID')}
                                    </p>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: '#475569' }}>
                                      <span>⏳ {getPromoCountdownLabel(activeServicePromo)}</span>
                                      <span>
                                        👤 {activeServicePromoRemainingApplicants === null
                                          ? 'Kuota tidak dibatasi'
                                          : `${activeServicePromoRemainingApplicants} kuota tersisa`}
                                      </span>
                                      {activeServicePromoIsClaimed && <span>1x/user</span>}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handlePromoCheckout(activeServicePromo.id)}
                                    disabled={!activeServicePromoCanCheckout}
                                    style={{
                                      border: 'none',
                                      borderRadius: '10px',
                                      background: activeServicePromoCanCheckout ? '#B28A67' : '#cbd5e1',
                                      color: activeServicePromoCanCheckout ? '#fff' : '#64748b',
                                      padding: '11px 14px',
                                      fontSize: '13px',
                                      fontWeight: '700',
                                      cursor: activeServicePromoCanCheckout ? 'pointer' : 'not-allowed',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {activeServicePromoCanCheckout ? 'Ambil Promo' : 'Promo Tidak Tersedia'}
                                  </button>
                                </div>

                                {selectedServicePromos.length > 1 && (
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                                    {selectedServicePromos.map((promo, index) => (
                                      <button
                                        key={promo.id}
                                        type="button"
                                        onClick={() => setActivePromoIndex(index)}
                                        style={{
                                          width: '8px',
                                          height: '8px',
                                          borderRadius: '999px',
                                          border: 'none',
                                          cursor: 'pointer',
                                          background: index === normalizedPromoIndex ? '#B28A67' : '#cbd5e1',
                                          padding: 0
                                        }}
                                        aria-label={`Lihat promo ${index + 1}`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {detailTab === 'information' && (
                    <>
                      <div className="info-section" style={{ paddingBottom: '16px', borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          {selectedVendorProfile?.vendorLogo ? (
                            <img
                              src={selectedVendorProfile.vendorLogo}
                              alt={selectedVendorProfile.vendorName || selectedService.vendorName}
                              style={{ width: '72px', height: '72px', borderRadius: '18px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                            />
                          ) : (
                            <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', border: '1px solid #e2e8f0' }}>
                              Logo
                            </div>
                          )}

                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111' }}>
                              {selectedVendorProfile?.vendorName || selectedService.vendorName || 'Vendor'}
                            </p>
                            <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
                              {selectedVendorProfile?.vendorBio || selectedService.shortDescription || 'Belum ada informasi toko tersedia.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {selectedVendorProfile?.vendorAddress ? (
                        <div className="info-section">
                          <h4>📍 Alamat Toko</h4>
                          <p>{selectedVendorProfile.vendorAddress}</p>
                        </div>
                      ) : (selectedService.location || selectedService.lokasi) && (
                        <div className="info-section">
                          <h4>📍 Lokasi Penjemputan</h4>
                          <p>{locationLabel}</p>
                        </div>
                      )}

                      <div className="info-section">
                        <h4>🏷️ Kategori</h4>
                        <p>{categoryPath || selectedService.category || '-'}</p>
                      </div>

                      <div className="info-section">
                        <h4>⭐ Rating Vendor</h4>
                        <p>{selectedVendorProfile ? `${selectedVendorProfile.averageRating?.toFixed?.(1) ?? '0.0'} • ${selectedVendorProfile.totalReviews} review` : (selectedService.rating?.toFixed?.(1) ?? selectedService.rating)}</p>
                      </div>

                      <div className="info-section">
                        <h4>📈 Terjual</h4>
                        <p>{selectedService.rentCount ?? '0'}</p>
                      </div>

                      {(selectedVendorProfile?.totalServices ?? 0) > 0 && (
                        <div className="info-section">
                          <h4>🛒 Jumlah Layanan</h4>
                          <p>{selectedVendorProfile.totalServices}</p>
                        </div>
                      )}

                      {selectedVendorProfile?.memberSince && (
                        <div className="info-section">
                          <h4>📅 Bergabung Sejak</h4>
                          <p>{new Date(selectedVendorProfile.memberSince).toLocaleDateString('id-ID')}</p>
                        </div>
                      )}

                      <div className="info-section">
                        <h4>🕒 Status</h4>
                        <p>{selectedVendorProfile?.isOnline ? 'Sedang online' : 'Terakhir online baru-baru ini'}</p>
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

                      {descriptionTableEntries.length > 0 && (
                        <div className="info-section">
                          <h4>📋 Detail Produk/Jasa</h4>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            {descriptionTableEntries.map(([key, value]) => (
                              <div key={key}>
                                <strong>{formatFieldLabel(key)}:</strong> {String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {variationEntries.length > 0 && (
                        <div className="info-section">
                          <h4>🎚️ Variasi</h4>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            {variationEntries.map(([key, variation]) => {
                              const variationName = variation?.name || formatFieldLabel(key);
                              const optionLabels = Array.isArray(variation?.options)
                                ? variation.options.map((option) => option.label).filter(Boolean)
                                : [];

                              return (
                                <div key={key}>
                                  <strong>{variationName}:</strong>{' '}
                                  {optionLabels.length > 0 ? optionLabels.join(', ') : 'Belum ada opsi'}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {specificationEntries.length > 0 && (
                        <div className="info-section">
                          <h4>🔧 Spesifikasi</h4>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            {specificationEntries.map(([key, value]) => (
                              <div key={key}>
                                <strong>{formatFieldLabel(key)}:</strong> {String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                            <span className="review-summary-chip">Filter item aktif: {selectedItemDetail.namaBarang || selectedItemDetail.namaJasa}</span>
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
                                {user?.role === 'vendor' && user.id === selectedService?.vendorId && !review.vendorReply && (
                                  <div className="vendor-reply-form">
                                    <textarea
                                      className="vendor-reply-input"
                                      rows={3}
                                      placeholder="Tulis balasan vendor untuk review ini..."
                                      value={vendorReplyDrafts[review.id] || ''}
                                      onChange={(e) => setVendorReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                                    />
                                    <button
                                      type="button"
                                      className="vendor-reply-btn"
                                      onClick={() => submitVendorReply(review)}
                                      disabled={vendorReplySubmittingId === review.id}
                                    >
                                      {vendorReplySubmittingId === review.id ? 'Menyimpan...' : 'Kirim Balasan'}
                                    </button>
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
                {activeChatItem && (
                  <p style={{ margin: '2px 0 0 0', color: '#B28A67', fontSize: '12px', fontWeight: 600 }}>
                    Paket: {activeChatItem.namaBarang || activeChatItem.namaJasa}
                  </p>
                )}
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

            {/* Chat Input / Deal Status */}
            {(
              <div className="chat-input-section" style={{ flexDirection: 'column', gap: '10px' }}>
                {(() => {
                  const statusConfig = getDealStatusConfig();
                  const finalPrice = dealData?.finalPrice || dealData?.originalPrice || 0;
                  // Buttons disabled jika: pending, agreed, cancelled, closed, atau completed tapi belum rating
                  const dealDisabled = dealData?.status === 'pending' || dealData?.status === 'agreed' || dealData?.status === 'cancelled' || dealData?.status === 'active' || chatData?.dealStatus === 'closed' || chatData?.closedAt;

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
                          disabled={dealDisabled || dealProcessing}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: messages.length === 0 ? '1px solid #B28A67' : '1px solid #10b981',
                            background: messages.length === 0 ? 'rgba(178, 138, 103, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                            color: messages.length === 0 ? '#8F6B4A' : '#047857',
                            fontWeight: '700',
                            cursor: dealDisabled || dealProcessing ? 'not-allowed' : 'pointer',
                            opacity: dealDisabled || dealProcessing ? 0.55 : 1,
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {dealProcessing ? 'Memproses...' : dealData?.status === 'agreed' ? 'Deal Diterima' : 'Terima Deal'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (dealData?.status === 'cancelled') {
                              // Reset deal untuk mulai negosiasi ulang
                              setDealData(null);
                            } else {
                              handleDealAction('cancel');
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: dealData?.status === 'cancelled' ? '1px solid #B28A67' : '1px solid #ef4444',
                            background: dealData?.status === 'cancelled' ? 'rgba(178, 138, 103, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                            color: dealData?.status === 'cancelled' ? '#8F6B4A' : '#b91c1c',
                            fontWeight: '700',
                            cursor: 'pointer',
                            opacity: 1,
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {dealData?.status === 'cancelled' ? 'Mulai Ulang Negosiasi' : 'Cancel'}
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

        .hero-section {
          padding: 80px 40px 40px;
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
          color: white;
        }

        .hero-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 36px;
          max-width: 1180px;
          margin: 0 auto;
          flex-wrap: wrap;
        }

        .hero-content {
          flex: 1 1 420px;
          min-width: 280px;
        }

        .hero-content h1 {
          font-size: clamp(2.8rem, 5vw, 4.8rem);
          line-height: 1.05;
          margin: 0;
          letter-spacing: -0.03em;
        }

        .hero-content p {
          color: rgba(255,255,255,0.88);
          font-size: 1.05rem;
          margin: 24px 0 30px;
          max-width: 540px;
          line-height: 1.7;
        }

        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }

        .hero-carousel {
          flex: 0 0 420px;
          min-width: 280px;
          width: 100%;
          max-width: 480px;
        }

        .hero-carousel-frame {
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          box-shadow: 0 28px 80px rgba(17, 12, 8, 0.22);
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
        }

        .hero-carousel-frame img {
          width: 100%;
          height: 420px;
          object-fit: cover;
          display: block;
          transition: transform 0.4s ease;
        }

        .hero-carousel-frame:hover img {
          transform: scale(1.03);
        }

        .hero-carousel-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 18px 20px;
          background: linear-gradient(180deg, transparent 0%, rgba(17, 12, 8, 0.82) 100%);
          display: flex;
          align-items: flex-end;
          color: white;
          font-weight: 700;
          letter-spacing: 0.01em;
          font-size: 14px;
        }

        /* Featured Card in Hero */
        .hero-featured-card {
          position: relative;
          width: 100%;
          border-radius: 26px;
          overflow: hidden;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.22);
          background: white;
        }

        .featured-card-content {
          cursor: pointer;
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .featured-card-content:hover {
          transform: translateY(-4px);
        }

        .featured-card-image {
          position: relative;
          width: 100%;
          height: 240px;
          overflow: hidden;
          background: #f3f4f6;
        }

        .featured-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .featured-card-content:hover .featured-card-image img {
          transform: scale(1.08);
        }

        .featured-card-favorite {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.92);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          transition: all 0.3s ease;
          z-index: 3;
        }

        .featured-card-favorite:hover:not(:disabled) {
          transform: scale(1.12);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .featured-card-favorite:disabled {
          opacity: 0.6;
        }

        .featured-card-info {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .featured-card-info h3 {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px 0;
          line-height: 1.3;
        }

        .featured-vendor {
          font-size: 14px;
          color: #B28A67;
          margin: 0 0 10px 0;
          font-weight: 600;
        }

        .featured-stats {
          display: flex;
          gap: 14px;
          margin-bottom: 12px;
          font-size: 14px;
          color: #666;
        }

        .featured-price {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 10px 0;
        }

        .featured-price span {
          font-size: 12px;
          color: #999;
        }

        .featured-price strong {
          font-size: 18px;
          font-weight: 700;
          color: #B28A67;
        }

        .btn-featured-detail {
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: auto;
        }

        .btn-featured-detail:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(178, 138, 103, 0.3);
        }

        .hero-carousel-dots {
          position: relative;
          display: flex;
          gap: 8px;
          justify-content: center;
          padding: 12px;
          z-index: 3;
        }

        .hero-carousel-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.45);
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .hero-carousel-dot.active {
          background: white;
          transform: scale(1.2);
        }

        .hero-carousel-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 360px;
          border-radius: 26px;
          background: rgba(255,255,255,0.08);
          border: 1px dashed rgba(255,255,255,0.3);
          color: rgba(255,255,255,0.8);
          text-align: center;
          padding: 24px;
        }

        @media (max-width: 900px) {
          .hero-inner {
            flex-direction: column;
            align-items: stretch;
          }

          .hero-carousel {
            max-width: 100%;
          }

          .hero-carousel-frame img {
            height: 320px;
          }
        }

        @media (max-width: 620px) {
          .hero-section {
            padding: 60px 20px 30px;
          }

          .hero-content h1 {
            font-size: 2.6rem;
          }

          .hero-content p {
            font-size: 1rem;
          }

          .hero-carousel-frame img {
            height: 260px;
          }
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
          color: #B28A67;
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
          background: rgba(178, 138, 103, 0.06);
          border-left: 4px solid #B28A67;
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

        .vendor-reply-form {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .vendor-reply-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
        }

        .vendor-reply-input:focus {
          outline: none;
          border-color: #B28A67;
          box-shadow: 0 0 0 3px rgba(178, 138, 103, 0.12);
        }

        .vendor-reply-btn {
          justify-self: start;
          border: none;
          border-radius: 8px;
          background: #B28A67;
          color: #fff;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .vendor-reply-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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

        .btn-nav-vendor {
          padding: 8px 14px;
          background: linear-gradient(135deg, #C8A587, #B28A67);
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
          background: linear-gradient(135deg, #B28A67, #8F6B4A);
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
          background: linear-gradient(135deg, #C8A587, #B28A67);
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
          background: linear-gradient(135deg, #C8A587, #B28A67);
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
          box-shadow: 0 4px 12px rgba(178, 138, 103, 0.3);
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
          background-color: #B28A67;
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
          background-color: #8F6B4A;
        }

        .jadi-vendor-btn.admin-btn {
          background-color: #f59e0b;
        }

        .jadi-vendor-btn.admin-btn:hover {
          background-color: #d97706;
        }

        /* Featured Section - Layanan Unggulan */
        .featured-section {
          padding: 60px 40px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
        }

        .featured-section h2 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 36px 0;
          color: #1a1a1a;
          text-align: center;
        }

        .featured-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          max-width: 1180px;
          margin: 0 auto;
        }

        /* Home Card Styles */
        .home-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          display: flex;
          flex-direction: column;
        }

        .home-card:hover {
          box-shadow: 0 16px 32px rgba(178, 138, 103, 0.15);
          transform: translateY(-8px);
          border-color: #B28A67;
        }

        .home-card-image {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: #f3f4f6;
        }

        .home-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .home-card:hover .home-card-image img {
          transform: scale(1.08);
        }

        .home-card-favorite {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.92);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          transition: all 0.3s ease;
          z-index: 3;
        }

        .home-card-favorite:hover:not(:disabled) {
          transform: scale(1.12);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .home-card-favorite:disabled {
          opacity: 0.6;
        }

        .home-card-content {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .home-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px 0;
          line-height: 1.35;
        }

        .home-card-vendor {
          font-size: 13px;
          color: #B28A67;
          margin: 0 0 12px 0;
          font-weight: 600;
        }

        .home-card-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .home-card-stats .stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-label {
          font-size: 11px;
          color: #999;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .stat-value {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .home-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          margin-top: auto;
        }

        .home-card-price {
          flex: 1;
        }

        .price-text {
          font-size: 11px;
          color: #999;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .price-amount {
          font-size: 15px;
          font-weight: 700;
          color: #B28A67;
          line-height: 1.2;
        }

        .btn-home-detail {
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .btn-home-detail:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(178, 138, 103, 0.3);
        }

        .btn-home-detail:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .featured-section {
            padding: 40px 20px;
          }

          .featured-section h2 {
            font-size: 24px;
            margin-bottom: 24px;
          }

          .featured-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }

          .home-card-image {
            height: 160px;
          }
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
          color: #999;
        }

        .vendor-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
        }

        .btn-detail {
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
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
          box-shadow: 0 4px 12px rgba(178, 138, 103, 0.3);
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
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
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
          border-radius: 16px 16px 0 0;
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
          overflow-y: auto;
          max-height: calc(90vh - 92px);
        }

        .modal-image {
          width: 100%;
          height: 500px;
          margin-bottom: 24px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .modal-image-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(17, 24, 39, 0.65);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          transition: background 0.2s ease;
        }

        .modal-image-nav:hover {
          background: rgba(17, 24, 39, 0.85);
        }

        .modal-image-nav.prev {
          left: 10px;
        }

        .modal-image-nav.next {
          right: 10px;
        }

        .modal-image-counter {
          position: absolute;
          right: 12px;
          bottom: 12px;
          background: rgba(17, 24, 39, 0.72);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 999px;
          z-index: 3;
        }

        .modal-image-dots {
          display: flex;
          gap: 8px;
          margin-top: -12px;
          margin-bottom: 20px;
          justify-content: center;
        }

        .modal-image-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          border: none;
          background: #d1d5db;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-image-dot.active {
          width: 22px;
          border-radius: 999px;
          background: #B28A67;
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
          background: rgba(178, 138, 103, 0.04);
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
          color: #B28A67;
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
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
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
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
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
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
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
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
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
          box-shadow: inset 0 -2px 0 #B28A67;
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
