'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavbar from '../../components/SharedNavbar';


import { readData, writeData } from '@/lib/storage';
export default function CustomerInvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, paid, all
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  const [cardErrors, setCardErrors] = useState({});

  const [activeRatingInvoiceId, setActiveRatingInvoiceId] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(Number(num || 0));
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('id-ID');
  };

  const copyInvoiceId = async (invoiceId, event) => {
    event.stopPropagation();
    if (!invoiceId) return;
    try {
      await navigator.clipboard.writeText(String(invoiceId));
      alert(`Invoice ID berhasil disalin: ${invoiceId}`);
    } catch (error) {
      console.error('Error copying invoice ID:', error);
      alert('Gagal menyalin Invoice ID');
    }
  };

  const fetchInvoices = async (customerId, selectedFilter) => {
    try {
      setIsLoading(true);
      const query = selectedFilter === 'all' ? '' : `&status=${selectedFilter}`;
      const response = await fetch(`/api/invoices?customerId=${customerId}${query}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setInvoices(data);
      } else if (data?.data && Array.isArray(data.data)) {
        setInvoices(data.data);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

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
    fetchInvoices(parsedUser.id, 'pending');
  }, [router]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSelectedInvoice(null);
    if (user?.id) {
      fetchInvoices(user.id, newFilter);
    }
  };

  const validateCardDetails = () => {
    const errors = {};

    if (!cardDetails.cardName.trim()) {
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

  const resetPaymentForm = () => {
    setCardDetails({
      cardName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: ''
    });
    setPaymentMethod('qris');
    setCardErrors({});
  };

  const handlePayInvoice = async (invoice) => {
    if (!invoice) return;
    if (paymentMethod === 'card' && !validateCardDetails()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        id: `TRX-${Date.now()}`,
        invoiceId: invoice.id,
        dealId: invoice.dealId,
        userId: user.id,
        paymentMethod,
        amount: Number(invoice.remainingPayment || invoice.totalAmount || 0),
        paymentType: 'invoice_payment',
        status: 'success',
        timestamp: new Date().toISOString(),
        cardDetails: paymentMethod === 'card'
          ? {
              cardName: cardDetails.cardName,
              cardLast4: cardDetails.cardNumber.slice(-4)
            }
          : null,
        qrCode: paymentMethod === 'qris' ? `QR-${Date.now()}` : null
      };

      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });

      const updateResponse = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          status: 'paid',
          paymentMethod,
          transactionId: transactionData.id
        })
      });

      if (updateResponse.ok) {
        alert('✅ Pembayaran berhasil! Invoice sudah terbayar.');
        setSelectedInvoice(null);
        resetPaymentForm();
        if (user?.id) {
          fetchInvoices(user.id, filter);
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('❌ Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRating = async (invoice) => {
    if (!invoice?.serviceId || !invoice?.vendorId || !user?.id) {
      alert('Data layanan untuk rating belum lengkap.');
      return;
    }

    setIsRatingSubmitting(true);

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: invoice.dealId,
          serviceId: invoice.serviceId,
          customerId: user.id,
          vendorId: invoice.vendorId,
          rating: ratingValue,
          review: ratingReview
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal menyimpan rating');
      }

      alert('✅ Rating berhasil disimpan.');
      setInvoices((prev) => prev.map((item) => (
        item.id === invoice.id ? { ...item, hasCustomerRating: true } : item
      )));
      setActiveRatingInvoiceId(null);
      setRatingReview('');
      setRatingValue(5);
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert(error.message || 'Gagal menyimpan rating');
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const pending = invoices.filter((item) => item.status === 'pending');
    const paid = invoices.filter((item) => item.status === 'paid');
    const totalPending = pending.reduce((sum, item) => sum + Number(item.remainingPayment || item.totalAmount || 0), 0);
    return {
      pendingCount: pending.length,
      paidCount: paid.length,
      totalPending
    };
  }, [invoices]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div>
        <SharedNavbar />
        <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
          ⏳ Memuat invoice...
        </div>
      </div>
    );
  }

  return (
    <div>
      <SharedNavbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '18px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            📋 Invoice Pembelian
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Kelola invoice pembayaran Anda dengan rincian lengkap.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '22px' }}>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total menunggu pembayaran</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#5b21b6' }}>{formatCurrency(summary.totalPending)}</div>
          </div>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Invoice pending</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#5b21b6' }}>{summary.pendingCount}</div>
          </div>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Invoice dibayar</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#065f46' }}>{summary.paidCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {[
            { value: 'pending', label: '⏳ Menunggu Pembayaran' },
            { value: 'paid', label: '✅ Sudah Dibayar' },
            { value: 'all', label: '📊 Semua Invoice' }
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => handleFilterChange(btn.value)}
                style={{
                padding: '10px 20px',
                background: filter === btn.value ? '#B28A67' : '#f3f4f6',
                color: filter === btn.value ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {invoices.length === 0 ? (
          <div style={{ background: '#f3f4f6', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#666' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>📭 Tidak ada invoice</p>
            <p style={{ fontSize: '14px', color: '#999' }}>Invoice akan muncul saat deal disepakati.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedInvoice?.id === invoice.id ? '0 4px 12px rgba(178, 138, 103, 0.15)' : 'none'
                }}
                onClick={() => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                      Invoice #{invoice.id || 'N/A'}
                    </h3>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                      Vendor: <strong>{invoice.vendorName || 'Unknown'}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={(event) => copyInvoiceId(invoice.id, event)}
                      style={{ marginTop: '8px', border: '1px solid #d6d3d1', background: '#fff', color: '#44403c', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Salin Invoice ID
                    </button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#B28A67', marginBottom: '4px' }}>
                      {formatCurrency(invoice.totalAmount || invoice.remainingPayment || 0)}
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: invoice.status === 'paid' ? '#dcfce7' : '#fef3c7',
                        color: invoice.status === 'paid' ? '#166534' : '#92400e'
                      }}
                    >
                      {invoice.status === 'paid' ? '✅ Dibayar' : '⏳ Pending'}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>📦 Item Sewa</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{invoice.serviceTitle || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>📅 Durasi Sewa</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{invoice.durationDays || 1} hari</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>💰 Harga/Hari</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{formatCurrency(invoice.basePrice || 0)}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>📆 Batas Pembayaran</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{formatDate(invoice.paymentDeadline)}</p>
                    </div>
                  </div>

                  {selectedInvoice?.id === invoice.id && (
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginTop: '16px', borderLeft: '4px solid #B28A67' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>📋 Detail Invoice</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                          <span style={{ color: '#666' }}>Invoice ID Lengkap:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <strong style={{ wordBreak: 'break-all', textAlign: 'right' }}>{invoice.id || 'N/A'}</strong>
                            <button
                              type="button"
                              onClick={(event) => copyInvoiceId(invoice.id, event)}
                              style={{ border: '1px solid #d6d3d1', background: '#fff', color: '#44403c', borderRadius: '8px', padding: '5px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666' }}>Tanggal Invoice:</span>
                          <strong>{formatDate(invoice.createdAt)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666' }}>Status Pembayaran:</span>
                          <strong>{invoice.status === 'paid' ? '✅ Sudah Dibayar' : '⏳ Belum Dibayar'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666' }}>Subtotal:</span>
                          <strong>{formatCurrency(invoice.discountedSubtotal || invoice.basePrice || 0)}</strong>
                        </div>
                        {Number(invoice.discountAmount || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666' }}>Diskon:</span>
                            <strong>- {formatCurrency(invoice.discountAmount)}</strong>
                          </div>
                        )}
                        {Number(invoice.serviceFee || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666' }}>Biaya Layanan:</span>
                            <strong>{formatCurrency(invoice.serviceFee)}</strong>
                          </div>
                        )}
                        {invoice.promo?.code && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666' }}>Kode Promo:</span>
                            <strong>{invoice.promo.code}</strong>
                          </div>
                        )}
                      </div>

                      {invoice.status === 'pending' && (
                        <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
                          <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>💳 Bayar Invoice</h4>

                          <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                              <input type="radio" name="paymentMethod" value="qris" checked={paymentMethod === 'qris'} onChange={(e) => setPaymentMethod(e.target.value)} />
                              QRIS
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                              <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value)} />
                              Kartu Debit/Kredit
                            </label>
                          </div>

                          {paymentMethod === 'card' && (
                            <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                              <input
                                type="text"
                                placeholder="Nama pemilik kartu"
                                value={cardDetails.cardName}
                                onChange={(e) => setCardDetails((prev) => ({ ...prev, cardName: e.target.value }))}
                                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '9px 10px', fontSize: '13px' }}
                              />
                              {cardErrors.cardName && <p style={{ margin: 0, color: '#dc2626', fontSize: '12px' }}>{cardErrors.cardName}</p>}

                              <input
                                type="text"
                                placeholder="Nomor kartu"
                                value={cardDetails.cardNumber}
                                onChange={(e) => setCardDetails((prev) => ({ ...prev, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 19) }))}
                                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '9px 10px', fontSize: '13px' }}
                              />
                              {cardErrors.cardNumber && <p style={{ margin: 0, color: '#dc2626', fontSize: '12px' }}>{cardErrors.cardNumber}</p>}

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                  <input
                                    type="text"
                                    placeholder="MM/YY"
                                    value={cardDetails.expiryDate}
                                    onChange={(e) => {
                                      let value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                      if (value.length >= 2) {
                                        value = value.slice(0, 2) + '/' + value.slice(2);
                                      }
                                      setCardDetails((prev) => ({ ...prev, expiryDate: value }));
                                    }}
                                    style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '9px 10px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                                  />
                                  {cardErrors.expiryDate && <p style={{ margin: '4px 0 0', color: '#dc2626', fontSize: '12px' }}>{cardErrors.expiryDate}</p>}
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    placeholder="CVV"
                                    value={cardDetails.cvv}
                                    onChange={(e) => setCardDetails((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                    style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '9px 10px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                                  />
                                  {cardErrors.cvv && <p style={{ margin: '4px 0 0', color: '#dc2626', fontSize: '12px' }}>{cardErrors.cvv}</p>}
                                </div>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePayInvoice(invoice)}
                            disabled={isSubmitting}
                            style={{
                              padding: '10px 14px',
                              border: 'none',
                              borderRadius: '8px',
                              background: isSubmitting ? '#9ca3af' : '#22c55e',
                              color: 'white',
                              fontWeight: '700',
                              cursor: isSubmitting ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isSubmitting ? 'Memproses...' : `Bayar ${formatCurrency(invoice.remainingPayment || invoice.totalAmount || 0)}`}
                          </button>
                        </div>
                      )}

                      {invoice.status === 'paid' && (
                        <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
                          <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', marginBottom: '12px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#065f46', fontWeight: '700' }}>
                              Kerja sama dengan vendor telah selesai sesuai kesepakatan.
                            </p>
                          </div>

                          {invoice.hasCustomerRating ? (
                            <button
                              type="button"
                              disabled
                              style={{ padding: '10px 12px', border: 'none', borderRadius: '8px', background: '#9ca3af', color: 'white', fontWeight: '600', cursor: 'not-allowed' }}
                            >
                              Rating Sudah Diberikan
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRatingInvoiceId(invoice.id);
                                setRatingValue(5);
                                setRatingReview('');
                              }}
                              style={{ padding: '10px 12px', border: 'none', borderRadius: '8px', background: '#B28A67', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                            >
                              Beri Rating
                            </button>
                          )}

                          {activeRatingInvoiceId === invoice.id && !invoice.hasCustomerRating && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRatingValue(star);
                                    }}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}
                                  >
                                    {star <= ratingValue ? '⭐' : '☆'}
                                  </button>
                                ))}
                              </div>

                              <textarea
                                value={ratingReview}
                                onChange={(e) => setRatingReview(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Tulis ulasan singkat (opsional)..."
                                rows={3}
                                style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                              />

                              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubmitRating(invoice);
                                  }}
                                  disabled={isRatingSubmitting}
                                  style={{ padding: '10px 12px', border: 'none', borderRadius: '8px', background: isRatingSubmitting ? '#C8A587' : '#B28A67', color: 'white', fontWeight: '700', cursor: isRatingSubmitting ? 'not-allowed' : 'pointer' }}
                                >
                                  {isRatingSubmitting ? 'Menyimpan...' : 'Kirim Rating'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRatingInvoiceId(null);
                                  }}
                                  style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer' }}
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
