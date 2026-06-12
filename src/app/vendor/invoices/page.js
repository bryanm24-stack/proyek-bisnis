'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SharedNavbar from '../../components/SharedNavbar';


import { readData, writeData } from '@/lib/storage';
export default function VendorInvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, paid, all
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeRatingInvoiceId, setActiveRatingInvoiceId] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

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
    fetchVendorInvoices(parsedUser.id, 'pending');
  }, [router]);

  const fetchVendorInvoices = async (vendorId, status = 'all') => {
    try {
      setIsLoading(true);
      const query = status === 'all' ? '' : `&status=${status}`;
      const response = await fetch(`/api/invoices?customerId=${vendorId}${query}`);
      const data = await response.json();

      const ownInvoices = Array.isArray(data)
        ? data
        : (data?.data && Array.isArray(data.data) ? data.data : []);

      setInvoices(ownInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    if (user) {
      fetchVendorInvoices(user.id, newFilter);
    }
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
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
      setRatingValue(5);
      setRatingReview('');
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert(error.message || 'Gagal menyimpan rating');
    } finally {
      setIsRatingSubmitting(false);
    }
  };

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

  if (!user) {
    return null;
  }

  return (
    <div>
      <SharedNavbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            📋 Invoice Transaksi
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Riwayat invoice akun kamu saat menyewa barang/jasa.
          </p>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          {[
            { value: 'pending', label: '⏳ Menunggu Pembayaran' },
            { value: 'paid', label: '✅ Sudah Dibayar' },
            { value: 'all', label: '📊 Semua Invoice' }
          ].map(btn => (
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

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <div style={{
            background: '#f3f4f6',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#666'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>
              📭 Tidak ada invoice
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Invoice akan muncul saat ada deal yang disepakati dan menunggu pembayaran
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {invoices.map((invoice) => (
              (() => {
                const isBuyingInvoice = true;
                const counterpartyLabel = 'Vendor';
                const counterpartyName = invoice.vendorName || 'Unknown';

                return (
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
                {/* Invoice Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                      Invoice #{invoice.id?.substring(0, 8) || 'N/A'}
                    </h3>
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                      {counterpartyLabel}: <strong>{counterpartyName}</strong>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#B28A67', marginBottom: '4px' }}>
                      {formatCurrency(invoice.totalAmount || invoice.remainingPayment || 0)}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: invoice.status === 'paid' ? '#dcfce7' : '#fef3c7',
                      color: invoice.status === 'paid' ? '#166534' : '#92400e'
                    }}>
                      {invoice.status === 'paid' ? '✅ Dibayar' : '⏳ Pending'}
                    </div>
                  </div>
                </div>

                {/* Invoice Details */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>📦 Item Sewa</p>
                      <p style={{ margin: '0', fontSize: '15px', fontWeight: '600' }}>
                        {invoice.serviceTitle || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>📅 Durasi Sewa</p>
                      <p style={{ margin: '0', fontSize: '15px', fontWeight: '600' }}>
                        {invoice.durationDays || 1} hari
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>💰 Harga/Hari</p>
                      <p style={{ margin: '0', fontSize: '15px', fontWeight: '600' }}>
                        {formatCurrency(invoice.basePrice || 0)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>📆 Batas Pembayaran</p>
                      <p style={{ margin: '0', fontSize: '15px', fontWeight: '600' }}>
                        {invoice.paymentDeadline ? new Date(invoice.paymentDeadline).toLocaleDateString('id-ID') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Details Section */}
                  {selectedInvoice?.id === invoice.id && (
                    <div style={{
                      background: '#f9fafb',
                      padding: '16px',
                      borderRadius: '8px',
                      marginTop: '16px',
                      borderLeft: '4px solid #B28A67'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>📋 Detail Invoice</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666' }}>Tanggal Invoice:</span>
                          <strong>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('id-ID') : 'N/A'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666' }}>Status Pembayaran:</span>
                          <strong>{invoice.status === 'paid' ? '✅ Sudah Dibayar' : '⏳ Belum Dibayar'}</strong>
                        </div>
                        {invoice.paymentMethod && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666' }}>Metode Pembayaran:</span>
                            <strong>{invoice.paymentMethod === 'qris' ? 'QRIS' : 'Kartu Kredit'}</strong>
                          </div>
                        )}
                        {invoice.notes && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                            <span style={{ color: '#666' }}>Catatan:</span>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{invoice.notes}</p>
                          </div>
                        )}
                      </div>

                      {invoice.status === 'paid' && isBuyingInvoice && (
                        <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
                          <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', marginBottom: '12px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#065f46', fontWeight: '700' }}>
                              Transaksi selesai. Kamu bisa memberi rating untuk vendor.
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

                      {invoice.status === 'paid' && !isBuyingInvoice && (
                        <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
                          <div style={{ padding: '10px 12px', borderRadius: '8px', background: invoice.hasCustomerRating ? '#ecfdf5' : '#fff7ed', border: `1px solid ${invoice.hasCustomerRating ? '#a7f3d0' : '#fdba74'}` }}>
                            <p style={{ margin: 0, fontSize: '13px', color: invoice.hasCustomerRating ? '#065f46' : '#9a3412', fontWeight: '700' }}>
                              {invoice.hasCustomerRating ? 'Penyewa sudah memberikan rating untuk transaksi ini.' : 'Penyewa belum memberikan rating untuk transaksi ini.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
