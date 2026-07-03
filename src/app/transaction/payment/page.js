'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SharedNavbar from '../../components/SharedNavbar';


import { readData, writeData } from '@/lib/storage';
function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get('dealId');
  const promoId = searchParams.get('promoId');

  const [user, setUser] = useState(null);
  const [deal, setDeal] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [durationDays, setDurationDays] = useState(1);
  const [notes, setNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState('detail'); // 'detail' or 'payment'
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [cardDetails, setCardDetails] = useState({
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardPhoto: null,
    cardPhotoPreview: null
  });
  const [cardErrors, setCardErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null); // ✅ NEW: Promo yang dipilih dari home
  const [promoError, setPromoError] = useState('');
  const [promoNow, setPromoNow] = useState(Date.now());
  const [showPrePaymentModal, setShowPrePaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState('full'); // 'full' or 'pay_after'
  const [verificationStatus, setVerificationStatus] = useState(null); // KTP verification status loaded from API
  const [availabilityCheck, setAvailabilityCheck] = useState(null); // null, 'checking', 'available', 'unavailable'
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [maxAvailableQuantity, setMaxAvailableQuantity] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // ✅ ADD: Track selected item & price
  const [service, setService] = useState(null); // ✅ ADD: Store service data with items

  const parseImageList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((img) => typeof img === 'string' && img.trim() !== '');
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter((img) => typeof img === 'string' && img.trim() !== '');
      } catch {
        if (value.trim() !== '') return [value.trim()];
      }
    }
    return [];
  };

  const generateRandomQR = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [qrCode] = useState(generateRandomQR());

  const formatPromoCountdown = (endAt) => {
    if (!endAt) return null;

    const endTime = new Date(endAt).getTime();
    if (Number.isNaN(endTime)) return null;

    const diff = Math.max(0, endTime - promoNow);
    if (diff <= 0) return '00h 00m 00s';

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`.trim();
  };

  const openPrePaymentModal = () => {
    setShowPrePaymentModal(true);
  };

  const closePrePaymentModal = () => {
    setShowPrePaymentModal(false);
  };

  const confirmPrePayment = () => {
    setShowPrePaymentModal(false);
    setStep('payment');
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    const allowedRoles = ['customer', 'member', 'vendor'];
    if (!allowedRoles.includes(parsedUser.role)) {
      alert('Hanya customer, member, atau vendor yang bisa mengakses halaman ini');
      router.push('/');
      return;
    }

    const verificationRaw = localStorage.getItem('verificationData');

    if (verificationRaw) {
      try {
        const parsedVerification = JSON.parse(verificationRaw);
        setVerificationData(parsedVerification);
      } catch (error) {
        console.error('Error parsing verification data:', error);
      }
    }

    setUser(parsedUser);

    const fetchVerificationStatus = async () => {
      try {
        const response = await fetch(`/api/auth/verify-ktp?userId=${encodeURIComponent(parsedUser.id)}`, { cache: 'no-store' });
        if (!response.ok) {
          setVerificationStatus(null);
          return;
        }

        const result = await response.json();
        setVerificationStatus(result?.data?.status || null);
      } catch (error) {
        console.error('Error loading verification status:', error);
        setVerificationStatus(null);
      }
    };

    fetchVerificationStatus();

    // ✅ NEW: Handle promo flow
    if (promoId) {
      const fetchPromoData = async () => {
        try {
          const response = await fetch(`/api/promos?promoId=${encodeURIComponent(promoId)}&userId=${encodeURIComponent(parsedUser.id)}`, { cache: 'no-store' });
          if (!response.ok) throw new Error('Failed to fetch promos');
          
          const result = await response.json();
          const allPromos = result.data || (Array.isArray(result) ? result : []);
          
          const foundPromo = Array.isArray(allPromos) 
            ? allPromos.find(p => String(p.id) === String(promoId))
            : null;

          if (foundPromo) {
            setPromoError('');
            setSelectedPromo({
              id: foundPromo.id,
              title: foundPromo.title,
              price: foundPromo.promoPrice,
              image: foundPromo.image,
              description: foundPromo.description,
              vendorName: foundPromo.vendorName,
              startAt: foundPromo.startAt || null,
              endAt: foundPromo.endAt || null,
              maxApplicants: foundPromo.maxApplicants ?? null,
              claimedCount: Number(foundPromo.claimedCount || 0),
              remainingApplicants: foundPromo.remainingApplicants ?? null,
              userHasClaimed: Boolean(foundPromo.userHasClaimed),
              isActiveNow: Boolean(foundPromo.isActiveNow),
              claimLimitPerUser: Number(foundPromo.claimLimitPerUser || 1)
            });
          } else {
            setSelectedPromo(null);
            setPromoError('Promo tidak ditemukan atau sudah tidak tersedia.');
          }
        } catch (error) {
          console.error('Error fetching promo:', error);
          setSelectedPromo(null);
          setPromoError('Gagal memuat promo. Silakan coba lagi.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchPromoData();
      return;
    }

    // Fetch deal data
    const fetchDealData = async () => {
      try {
        const response = await fetch('/api/deals/all');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const deals = await response.json();
        const currentDeal = deals.find(d => d.id === dealId);
        setDeal(currentDeal);

        // ✅ NEW: Fetch service data to get item prices
        if (currentDeal && currentDeal.serviceId) {
          try {
            const servicesResponse = await fetch('/api/vendor/services');
            if (servicesResponse.ok) {
              const servicesData = await servicesResponse.json();
              const serviceList = Array.isArray(servicesData?.data) ? servicesData.data : [];
              const currentService = Array.isArray(serviceList) 
                ? serviceList.find(s => String(s.id) === String(currentDeal.serviceId))
                : null;
              
              if (currentService) {
                setService(currentService);
                
                // ✅ NEW: Set first item as default
                if (currentService.items && currentService.items.length > 0) {
                  // Try to pick item from deal/chat context if available
                  let chosenItem = null;
                  // If deal exists and has chatId, fetch chat to find itemId
                  try {
                    if (currentDeal?.chatId) {
                      const chatResp = await fetch(`/api/chat?chatId=${encodeURIComponent(currentDeal.chatId)}`);
                      if (chatResp.ok) {
                        const chatJson = await chatResp.json();
                        if (chatJson.success && chatJson.data && chatJson.data.itemId) {
                          chosenItem = currentService.items.find(it => String(it.id) === String(chatJson.data.itemId));
                        }
                      }
                    }
                  } catch (e) {
                    // ignore
                  }

                  // Fallback to first item
                  const firstItem = chosenItem || currentService.items[0];
                  const itemPrice = currentService.type === 'barang' 
                    ? firstItem.hargaPcs 
                    : firstItem.hargaSesi;

                  setSelectedItem({
                    id: firstItem.id,
                    name: firstItem.namaBarang || firstItem.namaJasa,
                    price: itemPrice,
                    stok: firstItem.stok, // include per-item stok for payment UI
                    image: firstItem.image || firstItem.thumbnail || null,
                    images: firstItem.images || []
                  });
                }
              }
            }
          } catch (serviceError) {
            console.warn('Error fetching service:', serviceError);
            // Continue anyway, use deal.totalPrice as fallback
          }
        }
      } catch (error) {
        console.error('Error fetching deal:', error);
        setDeal(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (dealId) {
      fetchDealData();
    }
  }, [router, dealId, searchParams]);

  useEffect(() => {
    if (!selectedPromo?.endAt) return undefined;

    const interval = setInterval(() => {
      setPromoNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedPromo]);

  const handleCardPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCardDetails(prev => ({
          ...prev,
          cardPhoto: file,
          cardPhotoPreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateCardDetails = () => {
    const errors = {};

    if (!cardDetails.cardName) {
      errors.cardName = 'Nama pemilik kartu wajib diisi';
    }
    if (!cardDetails.cardNumber || cardDetails.cardNumber.replace(/\D/g, '').length < 13) {
      errors.cardNumber = 'Nomor kartu tidak valid';
    }
    if (!cardDetails.expiryDate || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiryDate)) {
      errors.expiryDate = 'Format: MM/YY';
    }
    if (!cardDetails.cvv || !/^\d{3,4}$/.test(cardDetails.cvv)) {
      errors.cvv = 'CVV harus 3-4 digit';
    }
    if (!cardDetails.cardPhotoPreview) {
      errors.cardPhoto = 'Foto kartu wajib diunggah';
    }

    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async (e) => {
    e.preventDefault();

    const isJasaService = service?.type === 'jasa' || deal?.serviceType === 'jasa' || deal?.type === 'jasa';

    if (selectedPromo) {
      if (selectedPromo.userHasClaimed) {
        alert('Promo ini hanya bisa dipakai 1 kali per user.');
        return;
      }

      if (selectedPromo.endAt && new Date(selectedPromo.endAt).getTime() <= promoNow) {
        alert('Promo sudah berakhir.');
        return;
      }

      if (Number.isFinite(Number(selectedPromo.remainingApplicants)) && Number(selectedPromo.remainingApplicants) <= 0) {
        alert('Kuota promo sudah habis.');
        return;
      }
    }

    // ✅ NEW: Skip availability check untuk promo
    if (!selectedPromo) {
      // AVAILABILITY CHECK - Validasi ketersediaan sebelum payment (hanya untuk deal)
      if (availabilityCheck !== 'available') {
        alert(`❌ ${isJasaService ? 'Availability jasa' : 'Stok barang'} tidak tersedia untuk periode ini. Silakan ubah tanggal atau jumlah.`);
        return;
      }
    }

    if (service?.pengirimanRentguard && !shippingAddress.trim()) {
      alert('Alamat lengkap pengiriman dan penjemputan wajib diisi untuk layanan Rent Guard.');
      return;
    }

    if (paymentMethod === 'card' && !validateCardDetails()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const identityVerification = verificationData ? {
        fullName: verificationData.fullName || '',
        phoneNumber: verificationData.phoneNumber || '',
        email: verificationData.email || '',
        idType: verificationData.idType || 'ktp',
        idNumber: verificationData.idNumber || '',
        idPhotoPreview: verificationData.idPhotoPreview || null,
        selfiePhotoPreview: verificationData.selfiePhotoPreview || null,
        notes: verificationData.notes || '',
        status: 'pending',
        reviewedAt: null,
        reviewedBy: null,
        adminNotes: ''
      } : null;
      // NOTE: Checkout should be restricted on the backend based on verification status.
      // This client-side data is only used for display and request payload composition.

      const transactionData = {
        id: `TRX-${Date.now()}`,
        dealId: selectedPromo ? null : dealId,
        promoId: selectedPromo ? selectedPromo.id : null,
        userId: user.id,
        serviceId: selectedPromo ? null : (deal?.serviceId || deal?.id),
        // ✅ NEW: Track selected item
        itemId: selectedPromo ? null : (selectedItem?.id || null),
        itemName: selectedPromo ? null : (selectedItem?.name || null),
        itemPrice: selectedPromo ? null : (selectedItem?.price || basePrice),
        paymentMethod: paymentMethod,
        basePrice: basePrice,
        quantity: selectedPromo ? 1 : quantity,
        quantityType: selectedPromo ? 'Promo' : quantityLabel,
        durationDays: selectedPromo ? 0 : durationDays,
        notes: notes,
        startDate: selectedPromo ? null : startDate,
        endDate: selectedPromo ? null : (() => {
          const start = new Date(startDate);
          const end = new Date(start);
          end.setDate(end.getDate() + durationDays);
          return end.toISOString().split('T')[0];
        })(),
        paymentType: selectedPromo ? 'promo' : paymentType,
        amount: selectedPromo ? selectedPromo.price : (paymentType === 'pay_after' ? downPayment : discountedSubtotal),
        downPayment: selectedPromo ? null : (paymentType === 'pay_after' ? downPayment : null),
        remainingPayment: selectedPromo ? null : (paymentType === 'pay_after' ? remainingPayment : null),
        discountedSubtotal: selectedPromo ? selectedPromo.price : discountedSubtotal,
        serviceFee: selectedPromo ? 0 : serviceFee,
        totalAmount: selectedPromo ? selectedPromo.price : totalAmount,
        status: 'success',
        timestamp: new Date().toISOString(),
        borrowDate: selectedPromo ? null : startDate,
        expectedReturnDate: selectedPromo ? null : (expectedReturnDate ? expectedReturnDate.toISOString() : null),
        returnDeadline: selectedPromo ? null : (expectedReturnDate ? new Date(expectedReturnDate.getTime() - (24 * 60 * 60 * 1000)).toISOString() : null),
        returnStatus: selectedPromo ? null : 'pending',
        actualReturnDate: null,
        daysLate: 0,
        lateCharge: 0,
        returnCondition: null,
        returnNotes: '',
        lastReminderSent: null,
        shippingAddress: shippingAddress.trim() || null,
        identityVerification,
        promo: selectedPromo
          ? {
              id: selectedPromo.id,
              title: selectedPromo.title,
              price: selectedPromo.price,
              description: selectedPromo.description,
              image: selectedPromo.image,
              vendorName: selectedPromo.vendorName,
              startAt: selectedPromo.startAt,
              endAt: selectedPromo.endAt,
              maxApplicants: selectedPromo.maxApplicants,
              claimedCount: selectedPromo.claimedCount,
              remainingApplicants: selectedPromo.remainingApplicants,
              claimLimitPerUser: selectedPromo.claimLimitPerUser
            }
          : null,
        cardDetails: paymentMethod === 'card' ? {
          cardName: cardDetails.cardName,
          cardLast4: cardDetails.cardNumber.slice(-4),
          cardPhoto: cardDetails.cardPhotoPreview
        } : null,
        qrCode: paymentMethod === 'qris' ? qrCode : null
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        alert(`❌ ${result.message || result.error || 'Gagal memproses pembayaran'}`);
        return;
      }

      if (response.ok) {
        localStorage.removeItem('verificationData');
        // Mark last payment timestamp so other tabs/components can refresh data
        try { localStorage.setItem('lastPaymentAt', String(Date.now())); } catch (e) { /* ignore */ }
        router.push(`/transaction/success?transactionId=${transactionData.id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };


  // AVAILABILITY CHECK - Validasi ketersediaan barang/jasa
  const checkAvailability = async (qty, duration, startDt) => {
    if (!deal?.id || !qty || !startDt) {
      setAvailabilityCheck(null);
      setAvailabilityMessage('');
      setMaxAvailableQuantity(null);
      return;
    }

    try {
      setAvailabilityCheck('checking');
      
      // Calculate end date
      const startDateTime = new Date(startDt);
      const endDateTime = new Date(startDateTime);
      endDateTime.setDate(endDateTime.getDate() + (Number(duration) || 1));
      const endDateStr = endDateTime.toISOString().split('T')[0];

      const response = await fetch('/api/availability/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: deal.serviceId || deal.id,
          itemId: selectedItem?.id || null,
          quantity: Number(qty),
          startDate: startDt,
          endDate: endDateStr
        })
      });

      const result = await response.json();
      const isJasaService = service?.type === 'jasa' || deal?.serviceType === 'jasa' || deal?.type === 'jasa';
      const availabilityLabel = isJasaService ? 'Availability jasa' : 'Stok';
      const unitLabel = isJasaService ? 'tim/provider' : 'unit';
      
      if (result.success && result.available) {
        setAvailabilityCheck('available');
        setMaxAvailableQuantity(Number(result.availableQuantity) || null);
        setAvailabilityMessage(`✅ ${availabilityLabel} tersedia: ${result.availableQuantity} dari ${result.totalQuantity} ${unitLabel}`);
      } else {
        setAvailabilityCheck('unavailable');
        setMaxAvailableQuantity(Number(result.availableQuantity) || null);
        setAvailabilityMessage(`❌ ${result.message || `${availabilityLabel} tidak tersedia untuk periode ini`}`);
      }
    } catch (error) {
      console.error('Availability check error:', error);
      setAvailabilityCheck('unavailable');
      setMaxAvailableQuantity(null);
      setAvailabilityMessage('Gagal mengecek ketersediaan');
    }
  };

  // ✅ FIXED: Prefer the currently selected item price over an older stored deal price
  const selectedItemPrice = Number(selectedItem?.price || 0);
  const dealOriginalPrice = Number(deal?.originalPrice ?? selectedItemPrice) || 0;
  const basePrice = selectedPromo ? Number(selectedPromo.price || 0) : (selectedItemPrice || dealOriginalPrice);
  const dealDiscountAmount = Number(deal?.discount?.amount ?? 0) || 0;
  const dealFinalPrice = deal?.discountGiven
    ? Number(deal?.finalPrice ?? Math.max(dealOriginalPrice - dealDiscountAmount, 0))
    : null;

  // ✅ NEW: Jika ada selectedPromo, gunakan promoPrice langsung, kalau ada discount vendor gunakan finalPrice deal
  const dealSubtotal = deal?.discountGiven
    ? Math.max((dealFinalPrice ?? 0) * quantity * durationDays, 0)
    : (basePrice * quantity * durationDays);
  const totalPrice = selectedPromo ? selectedPromo.price : dealSubtotal;
  const serviceFee = selectedPromo ? 0 : Math.max(0, Math.round((Number(totalPrice || 0)) * 0.05));
  const discountedSubtotal = totalPrice;
  const discountAmount = selectedPromo ? 0 : (deal?.discountGiven ? (dealDiscountAmount * quantity * durationDays) : 0);
  const appliedPromo = null; // ✅ NEW: No promo code in new system
  const totalAmount = discountedSubtotal + serviceFee; // ✅ NEW: No service fee for promo
  const downPayment = Math.round(totalAmount * 0.2); // 20% down payment
  const remainingPayment = totalAmount - downPayment; // 80% remaining
  const isService = service?.type === 'jasa' || deal?.serviceType === 'jasa' || deal?.type === 'jasa';
  const quantityLabel = isService ? 'Tim/Provider' : 'Item';
  const displayedAvailableQuantity = Number(
    maxAvailableQuantity ?? selectedItem?.stok ?? service?.availableQuantity ?? service?.availability ?? service?.quantity ?? 0
  ) || 0;
  const borrowDateLabel = startDate
    ? new Date(`${startDate}T00:00:00.000Z`).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  const expectedReturnDate = startDate
    ? (() => {
        const result = new Date(`${startDate}T00:00:00.000Z`);
        result.setUTCDate(result.getUTCDate() + durationDays);
        return result;
      })()
    : null;
  const expectedReturnDateLabel = expectedReturnDate
    ? expectedReturnDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  const selectedItemImages = parseImageList(selectedItem?.images);
  const serviceImages = parseImageList(service?.images);
  const productImageSrc = selectedPromo?.image
    || selectedItem?.image
    || selectedItemImages[0]
    || service?.image
    || service?.thumbnail
    || service?.coverImage
    || serviceImages[0]
    || deal?.image
    || null;
  const fallbackProductImage = 'https://via.placeholder.com/1200x700?text=Produk';

  // CHECK AVAILABILITY - Saat quantity, duration, atau startDate berubah
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(quantity, durationDays, startDate);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [quantity, durationDays, startDate, deal, selectedItem]);

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', background: '#f5f3ff' }}>⏳ Loading...</div>;
  }

  // ✅ NEW: Allow payment if there's a deal OR a selectedPromo
  if (!deal && !selectedPromo) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '40px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#dc2626', fontWeight: '700', marginBottom: '16px' }}>{promoError || '❌ Promo atau deal tidak ditemukan'}</p>
          <button onClick={() => router.back()} style={{ padding: '12px 24px', background: '#B28A67', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
      <SharedNavbar />

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
        {step === 'detail' ? (
          // STEP 1: Detail Pesanan
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Left Side - Product & Detail */}
            <div>
              {/* Product Image */}
              <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {productImageSrc ? (
                  <div style={{ position: 'relative', width: '100%', height: '350px', background: '#e5e7eb' }}>
                    <img
                      src={productImageSrc}
                      alt={selectedPromo ? 'Promo' : (selectedItem?.name || deal?.itemName || service?.title || 'Produk')}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = fallbackProductImage;
                      }}
                    />
                    {/* Overlay Gradient untuk Promo */}
                    {selectedPromo && (
                      <>
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)'
                        }} />
                        {/* Badge Promo */}
                        <div style={{
                          position: 'absolute',
                          top: '16px',
                          right: '16px',
                          background: '#dc2626',
                          color: 'white',
                          padding: '10px 16px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '800',
                          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                        }}>
                          ✨ PROMO
                        </div>
                        {/* Harga Besar di Bawah */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '20px',
                          color: 'white'
                        }}>
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>HARGA SPESIAL</div>
                          <div style={{ fontSize: '40px', fontWeight: '900', color: '#fbbf24', marginBottom: '8px' }}>
                            Rp {selectedPromo.price?.toLocaleString('id-ID')}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>
                            {selectedPromo.title}
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px', fontSize: '12px', color: '#e2e8f0' }}>
                            <span>⏳ {formatPromoCountdown(selectedPromo.endAt) || 'Tanpa batas waktu'}</span>
                            <span>👤 {Number.isFinite(Number(selectedPromo.remainingApplicants)) ? `${selectedPromo.remainingApplicants} kuota tersisa` : 'Kuota tidak dibatasi'}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div id="imageFallback" style={{ width: '100%', height: '350px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#999' }}>
                    🖼️ Gambar Produk
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {deal ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '20px' }}>⭐</span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>{deal?.rating?.toFixed(1) || '4.7'}</span>
                    </div>

                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '12px', lineHeight: '1.3' }}>
                      {deal?.itemName || 'Produk'}
                    </h1>

                    <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '24px' }}>
                      {deal?.detailDescription || deal?.description || 'Menyediakan berbagai alat konstruksi berkualitas tinggi dengan teknologi terkini. Kami melayani sewa alat berat dengan profesional berpengalaman dan harga kompetitif.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Vendor</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                          {deal?.vendorName || 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Lokasi</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>Jakarta Selatan</div>
                      </div>
                    </div>
                  </>
                ) : selectedPromo ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '24px' }}>✨</span>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>PROMO SPESIAL</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', background: selectedPromo.userHasClaimed ? '#fee2e2' : '#dcfce7', color: selectedPromo.userHasClaimed ? '#b91c1c' : '#166534', padding: '6px 10px', borderRadius: '999px' }}>
                        {selectedPromo.userHasClaimed ? 'Sudah dipakai' : (selectedPromo.isActiveNow ? 'Aktif' : 'Tidak aktif')}
                      </span>
                    </div>

                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '12px', lineHeight: '1.3' }}>
                      {selectedPromo?.title || 'Promo'}
                    </h1>

                    <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '24px' }}>
                      {selectedPromo?.description || 'Penawaran promo khusus dengan harga istimewa. Dapatkan kesempatan emas ini sebelum terlambat!'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Status</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: selectedPromo.userHasClaimed ? '#dc2626' : '#16a34a' }}>
                          {selectedPromo.userHasClaimed ? '⛔ Pernah dipakai' : (selectedPromo.isActiveNow ? '✅ Tersedia' : '⛔ Tidak aktif')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Vendor</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>{selectedPromo?.vendorName || 'Vendor'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Tanggal Promo</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>
                          {selectedPromo.startAt ? new Date(selectedPromo.startAt).toLocaleDateString('id-ID') : 'Mulai sekarang'} - {selectedPromo.endAt ? new Date(selectedPromo.endAt).toLocaleDateString('id-ID') : 'Tanpa batas'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Kuota</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>
                          {Number.isFinite(Number(selectedPromo.maxApplicants)) ? `${selectedPromo.claimedCount || 0} / ${selectedPromo.maxApplicants}` : 'Tidak dibatasi'}
                        </div>
                      </div>
                    </div>

                    {selectedPromo.userHasClaimed && (
                      <div style={{ marginTop: '18px', padding: '14px 16px', borderRadius: '10px', background: '#fef2f2', color: '#991b1b', fontSize: '14px', fontWeight: '600' }}>
                        Promo ini hanya bisa digunakan satu kali per user. Silakan pilih promo lain.
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Detail Pesanan */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '24px' }}>Detail Pesanan</h2>
                
                {selectedPromo ? (
                  // PROMO FLOW - Simplified
                  <div>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Promo siap untuk dibeli dengan harga spesial</p>

                    <div style={{ marginBottom: '20px', padding: '14px', border: '1px solid #ddd6fe', borderRadius: '12px', background: '#faf5ff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Timer promo</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#B28A67' }}>{formatPromoCountdown(selectedPromo.endAt) || 'Tanpa batas waktu'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Sisa kuota</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#B28A67' }}>{Number.isFinite(Number(selectedPromo.remainingApplicants)) ? selectedPromo.remainingApplicants : 'Tidak dibatasi'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Limit user</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#B28A67' }}>1x</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Catatan untuk Promo */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Catatan (Opsional)</label>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tambahkan catatan khusus..." style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', fontSize: '14px', fontFamily: 'inherit', minHeight: '80px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                ) : deal ? (
                  // DEAL FLOW - Full options
                  <>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Tentukan jumlah dan durasi peminjaman</p>

                    {/* ✅ NEW: Display selected item */}
                    {selectedItem && (
                      <div style={{ marginBottom: '20px', padding: '12px', background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Item yang dipilih</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: '0' }}>{selectedItem.name}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Harga/unit</p>
                            <p style={{ fontSize: '16px', fontWeight: '700', color: '#B28A67', margin: '0' }}>Rp {(selectedItemPrice || basePrice).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Jumlah Unit/Tim */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Jumlah {quantityLabel}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* ✅ REAL-TIME VALIDATION: Determine effective max qty (from availability check OR from item stok immediately) */}
                        {(() => {
                          const effectiveMax = maxAvailableQuantity ?? (selectedItem?.stok ?? null);
                          const isAtMax = effectiveMax !== null && quantity >= effectiveMax;
                          
                          return (
                            <>
                              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '700', color: '#B28A67' }}>−</button>
                              <input
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                  const nextValue = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  const effectiveMax = maxAvailableQuantity ?? (selectedItem?.stok ?? null);
                                  if (effectiveMax !== null && effectiveMax > 0) {
                                    setQuantity(Math.min(nextValue, effectiveMax));
                                    return;
                                  }
                                  setQuantity(nextValue);
                                }}
                                style={{ width: '80px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '8px', padding: '8px', fontSize: '14px', fontWeight: '600' }}
                                min="1"
                              />
                              <button
                                onClick={() => {
                                  const effectiveMax = maxAvailableQuantity ?? (selectedItem?.stok ?? null);
                                  if (effectiveMax !== null && effectiveMax > 0) {
                                    setQuantity(Math.min(quantity + 1, effectiveMax));
                                    return;
                                  }
                                  setQuantity(quantity + 1);
                                }}
                                disabled={isAtMax}
                                style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: isAtMax ? 'not-allowed' : 'pointer', fontSize: '18px', fontWeight: '700', color: '#B28A67', opacity: isAtMax ? 0.5 : 1 }}
                              >
                                +
                              </button>
                              <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '12px' }}>{quantityLabel}</span>
                            </>
                          );
                        })()}
                      </div>

                      {/* AVAILABILITY STATUS */}
                      {(selectedItem && typeof selectedItem.stok !== 'undefined') ? (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          background: '#dcfce7',
                          color: '#15803d',
                          border: `1px solid #86efac`
                        }}>
                          ✅ Stok tersedia: {displayedAvailableQuantity} {quantityLabel}
                        </div>
                      ) : (
                        availabilityMessage && (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          background: availabilityCheck === 'available' ? '#dcfce7' : '#fee2e2',
                          color: availabilityCheck === 'available' ? '#15803d' : '#b91c1c',
                          border: `1px solid ${availabilityCheck === 'available' ? '#86efac' : '#fca5a5'}`
                        }}>
                          {availabilityCheck === 'checking' && '⏳ Memeriksa ketersediaan...'}
                          {availabilityMessage}
                        </div>
                        )
                      )}
                      
                    </div>

                    {/* Durasi Hari */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Durasi Hari</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => setDurationDays(Math.max(1, durationDays - 1))} style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '700', color: '#B28A67' }}>−</button>
                        <input type="number" value={durationDays} onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '80px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '8px', padding: '8px', fontSize: '14px', fontWeight: '600' }} min="1" />
                        <button onClick={() => setDurationDays(durationDays + 1)} style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '700', color: '#B28A67' }}>+</button>
                      </div>
                    </div>

                    {/* Catatan */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Catatan (Opsional)</label>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tambahkan catatan khusus untuk vendor..." style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', fontSize: '14px', fontFamily: 'inherit', minHeight: '80px', boxSizing: 'border-box' }} />
                    </div>

                    {service?.pengirimanRentguard && (
                      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#f8fafc' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>🚚 Dukungan Pengiriman Rent Guard</h3>
                        <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                          Produk ini mendukung layanan antar-jemput Rent Guard. Isi alamat lengkap pengiriman dan penjemputan agar vendor dapat memproses jadwal pengiriman dengan benar.
                        </p>
                        <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Alamat Lengkap Pengiriman & Penjemputan</label>
                        <textarea
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="Masukkan alamat lengkap pengiriman dan penjemputan"
                          style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', fontSize: '14px', fontFamily: 'inherit', minHeight: '120px', boxSizing: 'border-box' }}
                          required
                        />
                      </div>
                    )}
                  </>
                ) : null}

                {/* Tanggal Mulai Sewa */}
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Tanggal Mulai Sewa</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', fontSize: '14px' }} />
                  <div style={{ marginTop: '10px', padding: '12px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
                      <span style={{ color: '#6b7280' }}>Tanggal pinjam</span>
                      <strong>{borrowDateLabel}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ color: '#6b7280' }}>Estimasi kembali</span>
                      <strong>{expectedReturnDateLabel}</strong>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Side - Summary */}
            <div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', stickyTop: '20px', position: 'sticky', top: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' }}>Ringkasan Pesanan</h2>

                <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Harga per {quantityLabel}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Rp {basePrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Jumlah {quantityLabel}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{quantity}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Durasi hari</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{durationDays} Hari</span>
                  </div>
                </div>

                <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Subtotal</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>Rp {totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                  {deal?.discountGiven && !selectedPromo && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>Harga asli</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Rp {(dealOriginalPrice * quantity * durationDays).toLocaleString('id-ID')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>Potongan vendor</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626' }}>- Rp {(dealDiscountAmount * quantity * durationDays).toLocaleString('id-ID')}</span>
                      </div>
                    </>
                  )}
                  {deal && !selectedPromo && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>Biaya layanan (5%)</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Rp {serviceFee.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                <div style={{ paddingBottom: '20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>Total</span>
                      <span style={{ fontSize: '24px', fontWeight: '700', color: '#B28A67' }}>Rp {totalAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', color: '#1e40af', margin: '0', fontWeight: '500' }}>
                    🛡️ RentGuard Protection - Pembayaran Anda dilindungi dengan jaminan uang kembali 100%
                  </p>
                </div>

                <button onClick={openPrePaymentModal} style={{ width: '100%', padding: '14px', background: '#B28A67', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  Lanjut ke Pembayaran
                </button>
              </div>
            </div>
          </div>
        ) : null}

          {showPrePaymentModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div style={{ width: '100%', maxWidth: '640px', background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '22px', color: '#1f2937' }}>Informasi Penting Sebelum Pembayaran</h2>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#4b5563' }}>Pastikan Anda memahami ketentuan sebelum melanjutkan ke metode pembayaran.</p>
                  </div>
                  <button onClick={closePrePaymentModal} style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: '24px', cursor: 'pointer', lineHeight: '1' }}>×</button>
                </div>

                <div style={{ marginBottom: '20px', color: '#374151', fontSize: '14px', lineHeight: '1.75' }}>
                  <div style={{ marginBottom: '14px' }}><strong>1. Ketersediaan stok</strong><br />Pastikan stok produk sudah dicek dan tersedia sesuai tanggal sewa. Jika stok tidak tersedia, transaksi tidak dapat diproses.</div>
                  <div style={{ marginBottom: '14px' }}><strong>2. Kualitas produk</strong><br />Periksa kualitas dan kelengkapan parts sebelum melakukan pembayaran. Komplain dapat diajukan jika barang tidak sesuai.</div>
                  <div style={{ marginBottom: '14px' }}><strong>3. Dana penyewa aman</strong><br />Jika terjadi kendala atau barang tidak sesuai, Anda dapat ajukan komplain dan refund sebelum barang dikirim.</div>
                  <div><strong>4. Pengiriman</strong><br />Pastikan jadwal pengiriman sudah sesuai. Dana akan dibayarkan ke merchant setelah sewa selesai dan tidak ada komplain.</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={closePrePaymentModal} style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #d1d5db', background: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>
                    Batal
                  </button>
                  <button onClick={confirmPrePayment} style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: '#B28A67', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                    Lanjut ke Pembayaran
                  </button>
                </div>
              </div>
            </div>
          )}

        {step === 'payment' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Payment Form */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#1f2937' }}>Pilih Metode Pembayaran</h1>

              <form onSubmit={handlePayment}>
                {/* Payment Type Selection */}
                <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#1f2937' }}>Tipe Pembayaran</h3>
                  
                  {/* Full Payment Option */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentType === 'full' ? '2px solid #B28A67' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentType === 'full' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
                      <input type="radio" name="paymentType" value="full" checked={paymentType === 'full'} onChange={(e) => setPaymentType(e.target.value)} style={{ marginTop: '4px', cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>💰 Bayar Penuh</div>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>Bayar 100% sekarang</p>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e', marginTop: '8px', marginBottom: 0 }}>Rp {totalAmount.toLocaleString('id-ID')}</p>
                      </div>
                    </label>
                  </div>

                  {/* Pay After Option */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentType === 'pay_after' ? '2px solid #B28A67' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentType === 'pay_after' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
                      <input type="radio" name="paymentType" value="pay_after" checked={paymentType === 'pay_after'} onChange={(e) => setPaymentType(e.target.value)} style={{ marginTop: '4px', cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>🔄 Bayar Kemudian (Pay After)</div>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>Bayar 20% sekarang, sisa 80% dalam 2 hari setelah kedua belah pihak setuju</p>
                        <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: '600', color: '#666' }}>
                          <p style={{ margin: '4px 0' }}>📌 Uang muka (20%): <span style={{ color: '#22c55e', fontWeight: '700' }}>Rp {downPayment.toLocaleString('id-ID')}</span></p>
                          <p style={{ margin: '4px 0' }}>📋 Sisa pembayaran (80%): <span style={{ color: '#B28A67', fontWeight: '700' }}>Rp {remainingPayment.toLocaleString('id-ID')}</span></p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Payment Method Selection */}
                {/* QRIS Option */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentMethod === 'qris' ? '2px solid #B28A67' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'qris' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
                    <input type="radio" name="paymentMethod" value="qris" checked={paymentMethod === 'qris'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginTop: '4px', cursor: 'pointer' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>💳 QRIS</div>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Scan QR code dengan aplikasi pembayaran Anda</p>
                    </div>
                  </label>
                </div>

                {/* Card Option */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentMethod === 'card' ? '2px solid #B28A67' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'card' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
                    <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginTop: '4px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>🏦 Debit/Credit Card</div>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Gunakan kartu debit atau credit card Anda</p>
                    </div>
                  </label>
                </div>

                {/* COD Option */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentMethod === 'cod' ? '2px solid #B28A67' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'cod' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
                    <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginTop: '4px', cursor: 'pointer' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>🚚 Cash on Delivery (COD)</div>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Bayar saat barang/layanan diterima</p>
                    </div>
                  </label>
                </div>

                {/* Card Details - Only show if card selected */}
                {paymentMethod === 'card' && (
                  <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #ddd' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>Detail Kartu</h3>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nama Pemilik Kartu</label>
                      <input type="text" value={cardDetails.cardName} onChange={(e) => setCardDetails(prev => ({ ...prev, cardName: e.target.value }))} placeholder="Contoh: BUDI SANTOSO" style={{ width: '100%', padding: '10px', border: cardErrors.cardName ? '2px solid #dc2626' : '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                      {cardErrors.cardName && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{cardErrors.cardName}</p>}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nomor Kartu</label>
                      <input type="text" value={cardDetails.cardNumber} onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 19) }))} placeholder="1234 5678 9012 3456" style={{ width: '100%', padding: '10px', border: cardErrors.cardNumber ? '2px solid #dc2626' : '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                      {cardErrors.cardNumber && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{cardErrors.cardNumber}</p>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Tanggal Berlaku</label>
                        <input type="text" value={cardDetails.expiryDate} onChange={(e) => { let value = e.target.value.replace(/\D/g, '').slice(0, 4); if (value.length >= 2) { value = value.slice(0, 2) + '/' + value.slice(2); } setCardDetails(prev => ({ ...prev, expiryDate: value })); }} placeholder="MM/YY" style={{ width: '100%', padding: '10px', border: cardErrors.expiryDate ? '2px solid #dc2626' : '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                        {cardErrors.expiryDate && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{cardErrors.expiryDate}</p>}
                      </div>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>CVV</label>
                        <input type="text" value={cardDetails.cvv} onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="123" style={{ width: '100%', padding: '10px', border: cardErrors.cvv ? '2px solid #dc2626' : '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                        {cardErrors.cvv && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{cardErrors.cvv}</p>}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>📸 Foto Kartu</label>
                      <input type="file" accept="image/*" onChange={handleCardPhotoUpload} style={{ display: 'none' }} id="cardPhotoInput" />
                      <label htmlFor="cardPhotoInput" style={{ display: 'block', padding: '16px', border: '2px dashed #ddd', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', background: cardErrors.cardPhoto ? '#fee2e2' : '#f0f0f0' }}>
                        {cardDetails.cardPhotoPreview ? (
                          <img src={cardDetails.cardPhotoPreview} alt="Card Preview" style={{ maxHeight: '100px', maxWidth: '100%', borderRadius: '4px' }} />
                        ) : (
                          <p style={{ color: '#6b7280', fontSize: '13px', margin: '0' }}>Klik untuk upload foto kartu</p>
                        )}
                      </label>
                      {cardErrors.cardPhoto && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{cardErrors.cardPhoto}</p>}
                    </div>
                  </div>
                )}

                {/* QRIS Display */}
                {paymentMethod === 'qris' && (
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', border: '2px solid #86efac' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#166534' }}>📲 Scan QR Code</h3>
                    <div style={{ background: 'white', padding: '16px', borderRadius: '8px', display: 'inline-block', border: '2px solid #86efac' }}>
                      <div style={{ fontSize: '64px', padding: '24px', background: '#f3f4f6', borderRadius: '8px', fontWeight: '700' }}>📱</div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#166534', marginTop: '12px', fontWeight: '500' }}>QR Code: {qrCode}</p>
                    <p style={{ fontSize: '12px', color: '#86efac', marginTop: '8px' }}>Silahkan scan QR code dengan aplikasi pembayaran Anda</p>
                  </div>
                )}

                {/* Payment Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button type="button" onClick={() => setStep('detail')} style={{ padding: '12px 16px', background: '#f3f4f6', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>← Kembali</button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: '12px 16px', background: isSubmitting ? '#ccc' : '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                    {isSubmitting ? '⏳ Memproses...' : '💳 Bayar Sekarang'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Side - Order Summary for Payment */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', stickyTop: '20px', position: 'sticky', top: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' }}>📋 Ringkasan Pesanan</h2>

              {deal ? (
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px 0' }}>{deal.itemName}</p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0' }}>Vendor: {deal.vendorName}</p>
                </div>
              ) : selectedPromo ? (
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px 0' }}>✨ Promo Spesial</p>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0' }}>{selectedPromo.title}</p>
                  {selectedPromo.vendorName && (
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>dari {selectedPromo.vendorName}</p>
                  )}
                </div>
              ) : null}

              {deal ? (
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px 0' }}>Harga per {quantityLabel}</p>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Rp {basePrice.toLocaleString('id-ID')}</span>
                </div>
              ) : selectedPromo ? (
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px 0' }}>Harga Promo</p>
                  <p style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626', margin: '0' }}>Rp {selectedPromo.price.toLocaleString('id-ID')}</p>
                </div>
              ) : null}

              <div style={{ marginBottom: '16px', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Biaya layanan (5%)</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Rp {serviceFee.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: '700', color: '#92400e', fontSize: '16px' }}>{paymentType === 'pay_after' ? 'Pembayaran Sekarang (20%)' : 'Total'}</span>
                  <span style={{ fontWeight: '700', color: '#ca8a04', fontSize: '20px' }}>Rp {(paymentType === 'pay_after' ? downPayment : totalAmount).toLocaleString('id-ID')}</span>
                </div>
                {paymentType === 'pay_after' && (
                  <p style={{ fontSize: '12px', color: '#92400e', marginTop: '8px', marginBottom: 0, fontWeight: '500' }}>
                    Sisa pembayaran Rp {remainingPayment.toLocaleString('id-ID')} jatuh tempo dalam 2 hari setelah deal disepakati
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading payment...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
