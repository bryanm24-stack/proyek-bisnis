'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardPhoto: null,
    cardPhotoPreview: null
  });
  const [cardErrors, setCardErrors] = useState({});

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'customer' && parsedUser.role !== 'member') {
      router.push('/');
      return;
    }

    setUser(parsedUser);

    // Fetch invoices
    const fetchInvoices = async () => {
      try {
        const response = await fetch(`/api/invoices?customerId=${parsedUser.id}&status=pending`);
        if (!response.ok) throw new Error('Failed to fetch invoices');
        const data = await response.json();
        setInvoices(data);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [router]);

  const calculateTimeRemaining = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;

    if (diff < 0) {
      return { text: 'SUDAH LEWAT', color: '#dc2626' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return { text: `${days}h ${hours}m tersisa`, color: '#22c55e' };
    } else {
      return { text: `${hours}m tersisa`, color: '#f59e0b' };
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

    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayInvoice = async (invoice) => {
    if (paymentMethod === 'card' && !validateCardDetails()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create payment transaction
      const transactionData = {
        id: `TRX-${Date.now()}`,
        invoiceId: invoice.id,
        dealId: invoice.dealId,
        userId: user.id,
        paymentMethod: paymentMethod,
        amount: invoice.remainingPayment,
        paymentType: 'invoice_payment',
        status: 'success',
        timestamp: new Date().toISOString(),
        cardDetails: paymentMethod === 'card' ? {
          cardName: cardDetails.cardName,
          cardLast4: cardDetails.cardNumber.slice(-4),
          cardPhoto: cardDetails.cardPhotoPreview
        } : null,
        qrCode: paymentMethod === 'qris' ? `QR-${Date.now()}` : null
      };

      // Save transaction
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });

      // Update invoice status to paid
      const updateResponse = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          status: 'paid',
          paymentMethod: paymentMethod,
          transactionId: transactionData.id
        })
      });

      if (updateResponse.ok) {
        alert('✅ Pembayaran berhasil! Invoice sudah terbayar.');
        setSelectedInvoice(null);
        setInvoices(invoices.filter(inv => inv.id !== invoice.id));
        // Reset form
        setCardDetails({
          cardName: '',
          cardNumber: '',
          expiryDate: '',
          cvv: '',
          cardPhoto: null,
          cardPhotoPreview: null
        });
        setPaymentMethod('qris');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('❌ Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#666' }}>⏳ Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
      {/* Navbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px', lineHeight: '1' }}>🛡️</span>
            RentGuard
          </Link>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/customer/ongoing" style={{ fontSize: '14px', color: '#666', textDecoration: 'none', fontWeight: '500' }}>
              📦 Pesanan Aktif
            </Link>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#666' }}>
              ← Kembali
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>📋 Invoice yang Menunggu Pembayaran</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>Daftar pembayaran 80% yang jatuh tempo</p>

        {invoices.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '8px' }}>✅ Tidak ada invoice yang pending</p>
            <p style={{ fontSize: '14px', color: '#999' }}>Semua pembayaran Anda sudah terbayar.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selectedInvoice ? '1fr 1fr' : '1fr', gap: '32px' }}>
            {/* Invoices List */}
            <div>
              <div style={{ display: 'grid', gap: '16px' }}>
                {invoices.map((invoice) => {
                  const timeInfo = calculateTimeRemaining(invoice.paymentDeadline);
                  const isOverdue = timeInfo.color === '#dc2626';

                  return (
                    <div
                      key={invoice.id}
                      onClick={() => setSelectedInvoice(invoice)}
                      style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        border: selectedInvoice?.id === invoice.id ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px 0' }}>Invoice ID</p>
                          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: 0 }}>{invoice.id}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '12px', color: isOverdue ? '#dc2626' : '#22c55e', fontWeight: '600', margin: 0 }}>
                            {isOverdue ? '⚠️ OVERDUE' : '✅ Aktif'}
                          </p>
                          <p style={{ fontSize: '12px', color: timeInfo.color, fontWeight: '600', margin: '4px 0 0 0' }}>
                            ⏱️ {timeInfo.text}
                          </p>
                        </div>
                      </div>

                      <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>Sisa Pembayaran (80%)</span>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: '#2563eb' }}>Rp {invoice.remainingPayment.toLocaleString('id-ID')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>Jatuh Tempo</span>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                            {new Date(invoice.paymentDeadline).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvoice(invoice);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: '#7c3aed',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Bayar Sekarang
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Form - Only show if invoice selected */}
            {selectedInvoice && (
              <div>
                <div style={{ background: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#1f2937' }}>Pilih Metode Pembayaran</h2>

                  <form onSubmit={(e) => { e.preventDefault(); handlePayInvoice(selectedInvoice); }}>
                    {/* QRIS Option */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentMethod === 'qris' ? '2px solid #7c3aed' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'qris' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
                        <input type="radio" name="paymentMethod" value="qris" checked={paymentMethod === 'qris'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginTop: '4px', cursor: 'pointer' }} />
                        <div>
                          <div style={{ fontWeight: '600', color: '#1f2937' }}>💳 QRIS</div>
                          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', margin: 0 }}>Scan QR code dengan aplikasi pembayaran Anda</p>
                        </div>
                      </label>
                    </div>

                    {/* Card Option */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', border: paymentMethod === 'card' ? '2px solid #7c3aed' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'card' ? '#f3f4f6' : 'transparent', transition: 'all 0.2s' }}>
                        <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginTop: '4px', cursor: 'pointer' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#1f2937' }}>🏦 Debit/Credit Card</div>
                          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', margin: 0 }}>Gunakan kartu debit atau credit card Anda</p>
                        </div>
                      </label>
                    </div>

                    {/* Card Details */}
                    {paymentMethod === 'card' && (
                      <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #ddd' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>Detail Kartu</h3>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nama Pemilik Kartu</label>
                          <input type="text" value={cardDetails.cardName} onChange={(e) => setCardDetails(prev => ({ ...prev, cardName: e.target.value }))} placeholder="Contoh: BUDI SANTOSO" style={{ width: '100%', padding: '10px', border: cardErrors.cardName ? '2px solid #dc2626' : '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                          {cardErrors.cardName && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', margin: 0 }}>{cardErrors.cardName}</p>}
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nomor Kartu</label>
                          <input type="text" value={cardDetails.cardNumber} onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 19) }))} placeholder="1234 5678 9012 3456" style={{ width: '100%', padding: '10px', border: cardErrors.cardNumber ? '2px solid #dc2626' : '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                          {cardErrors.cardNumber && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', margin: 0 }}>{cardErrors.cardNumber}</p>}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Tanggal Berlaku</label>
                            <input type="text" value={cardDetails.expiryDate} onChange={(e) => { let value = e.target.value.replace(/\D/g, '').slice(0, 4); if (value.length >= 2) { value = value.slice(0, 2) + '/' + value.slice(2); } setCardDetails(prev => ({ ...prev, expiryDate: value })); }} placeholder="MM/YY" style={{ width: '100%', padding: '10px', border: cardErrors.expiryDate ? '2px solid #dc2626' : '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                            {cardErrors.expiryDate && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', margin: 0 }}>{cardErrors.expiryDate}</p>}
                          </div>
                          <div>
                            <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>CVV</label>
                            <input type="text" value={cardDetails.cvv} onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="123" style={{ width: '100%', padding: '10px', border: cardErrors.cvv ? '2px solid #dc2626' : '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                            {cardErrors.cvv && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', margin: 0 }}>{cardErrors.cvv}</p>}
                          </div>
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
                        <p style={{ fontSize: '12px', color: '#166534', marginTop: '12px', fontWeight: '500', margin: 0 }}>Silahkan scan QR code dengan aplikasi pembayaran Anda</p>
                      </div>
                    )}

                    {/* Summary */}
                    <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #fcd34d' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#92400e' }}>Sisa Pembayaran</span>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#ca8a04' }}>Rp {selectedInvoice.remainingPayment.toLocaleString('id-ID')}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#92400e', margin: '8px 0 0 0', fontWeight: '500' }}>
                        Jatuh Tempo: {new Date(selectedInvoice.paymentDeadline).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '14px', background: isSubmitting ? '#ccc' : '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '16px', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                      {isSubmitting ? '⏳ Memproses...' : '💳 Bayar Sekarang'}
                    </button>

                    <button type="button" onClick={() => setSelectedInvoice(null)} style={{ width: '100%', padding: '12px', background: '#f3f4f6', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '12px', transition: 'all 0.2s' }}>
                      ← Batal
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
