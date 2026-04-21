'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get('dealId');

  const [user, setUser] = useState(null);
  const [deal, setDeal] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [durationDays, setDurationDays] = useState(1);
  const [notes, setNotes] = useState('');
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

  const generateRandomQR = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [qrCode] = useState(generateRandomQR());

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'customer' && parsedUser.role !== 'member') {
      alert('Hanya customer yang bisa mengakses halaman ini');
      router.push('/');
      return;
    }

    setUser(parsedUser);

    // Fetch deal data
    const fetchDealData = async () => {
      try {
        const response = await fetch('/api/deals/all');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const deals = await response.json();
        console.log('All deals:', deals);
        const currentDeal = deals.find(d => d.id === dealId);
        console.log(`Looking for deal: ${dealId}`, currentDeal);
        setDeal(currentDeal);
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
  }, [router, dealId]);

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

    if (paymentMethod === 'card' && !validateCardDetails()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        id: `TRX-${Date.now()}`,
        dealId: dealId,
        userId: user.id,
        paymentMethod: paymentMethod,
        basePrice: basePrice,
        quantity: quantity,
        quantityType: quantityLabel,
        durationDays: durationDays,
        notes: notes,
        startDate: startDate,
        amount: totalPrice,
        serviceFee: serviceFee,
        totalAmount: totalAmount,
        status: 'success',
        timestamp: new Date().toISOString(),
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

      if (response.ok) {
        router.push(`/transaction/success?transactionId=${transactionData.id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', background: '#f5f3ff' }}>⏳ Loading...</div>;
  }

  if (!deal) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '40px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#dc2626', fontWeight: '700', marginBottom: '16px' }}>❌ Deal tidak ditemukan</p>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>ID Deal: {dealId}</p>
          <button onClick={() => router.back()} style={{ padding: '12px 24px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const serviceFee = 25000;
  const basePrice = deal?.totalPrice || 0;
  const totalPrice = basePrice * quantity * durationDays;
  const totalAmount = totalPrice + serviceFee;
  const isService = deal?.itemName?.toLowerCase().includes('jasa') || false;
  const quantityLabel = isService ? 'Hari' : 'Unit';

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
      {/* Navbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛍️ RentGuard
          </Link>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#666' }}>
            ← Kembali
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Debug Info - Remove later */}
        {deal && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '12px', fontFamily: 'monospace', color: '#b91c1c' }}>
            <strong>DEBUG DEAL:</strong> ID={deal.id} | Price={deal.totalPrice} | Vendor={deal.vendorName} | Item={deal.itemName}
          </div>
        )}

        {step === 'detail' ? (
          // STEP 1: Detail Pesanan
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Left Side - Product & Detail */}
            <div>
              {/* Product Image */}
              <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ width: '100%', height: '350px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#999' }}>
                  🖼️ Gambar Produk
                </div>
              </div>

              {/* Product Info */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '20px' }}>⭐</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>{deal?.rating?.toFixed(1) || '4.7'}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>→ {deal?.rentCount || '1.3K'} disewa</span>
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
              </div>

              {/* Detail Pesanan */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '24px' }}>Detail Pesanan</h2>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Tentukan jumlah dan durasi sewa</p>

                {/* Jumlah Item */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Jumlah Item</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '700', color: '#7c3aed' }}>−</button>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '80px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '8px', padding: '8px', fontSize: '14px', fontWeight: '600' }} min="1" />
                    <button onClick={() => setQuantity(quantity + 1)} style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '700', color: '#7c3aed' }}>+</button>
                    <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '12px' }}>item</span>
                  </div>
                </div>

                {/* Durasi Sewa */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Durasi Sewa ({quantityLabel})</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setDurationDays(Math.max(1, durationDays - 1))} style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '700', color: '#7c3aed' }}>−</button>
                    <input type="number" value={durationDays} onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '80px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '8px', padding: '8px', fontSize: '14px', fontWeight: '600' }} min="1" />
                    <button onClick={() => setDurationDays(durationDays + 1)} style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '700', color: '#7c3aed' }}>+</button>
                    <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '12px' }}>{quantityLabel}</span>
                  </div>
                </div>

                {/* Catatan */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Catatan (Opsional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tambahkan catatan khusus untuk vendor..." style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', fontSize: '14px', fontFamily: 'inherit', minHeight: '80px', boxSizing: 'border-box' }} />
                </div>

                {/* Tanggal Mulai Sewa */}
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#1f2937' }}>Tanggal Mulai Sewa</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', fontSize: '14px' }} />
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
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Durasi sewa</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{durationDays} {quantityLabel}</span>
                  </div>
                </div>

                <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Subtotal</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>Rp {totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Biaya layanan (5%)</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Rp {serviceFee.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div style={{ paddingBottom: '20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>Total</span>
                    <span style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>Rp {totalAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', color: '#1e40af', margin: '0', fontWeight: '500' }}>
                    🛡️ RentGuard Protection - Pembayaran Anda dilindungi dengan jaminan uang kembali 100%
                  </p>
                </div>

                <button onClick={() => setStep('payment')} style={{ width: '100%', padding: '14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  Lanjut ke Pembayaran
                </button>
              </div>
            </div>
          </div>
        ) : (
          // STEP 2: Payment Method (existing code)
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Payment Form */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#1f2937' }}>Pilih Metode Pembayaran</h1>

              <form onSubmit={handlePayment}>
                {/* QRIS Option */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentMethod === 'qris' ? '2px solid #7c3aed' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'qris' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
                    <input type="radio" name="paymentMethod" value="qris" checked={paymentMethod === 'qris'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginTop: '4px', cursor: 'pointer' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>💳 QRIS</div>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Scan QR code dengan aplikasi pembayaran Anda</p>
                    </div>
                  </label>
                </div>

                {/* Card Option */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentMethod === 'card' ? '2px solid #7c3aed' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'card' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
                    <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginTop: '4px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>🏦 Debit/Credit Card</div>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Gunakan kartu debit atau credit card Anda</p>
                    </div>
                  </label>
                </div>

                {/* COD Option */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentMethod === 'cod' ? '2px solid #7c3aed' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'cod' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
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

              {deal && (
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px 0' }}>{deal.itemName}</p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0' }}>Vendor: {deal.vendorName}</p>
                </div>
              )}

              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Harga per {quantityLabel}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Rp {basePrice.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Jumlah item × Durasi</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{quantity} × {durationDays} = {quantity * durationDays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Subtotal</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div style={{ marginBottom: '16px', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Biaya layanan (5%)</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Rp {serviceFee.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: '700', color: '#92400e', fontSize: '16px' }}>Total</span>
                  <span style={{ fontWeight: '700', color: '#ca8a04', fontSize: '20px' }}>Rp {totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
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
