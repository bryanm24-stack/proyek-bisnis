'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SharedNavbar from '../../components/SharedNavbar';

export default function VendorInvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, paid, all
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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
      const response = await fetch(`/api/invoices?vendorId=${vendorId}${query}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setInvoices(data);
      } else if (data.data && Array.isArray(data.data)) {
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
            📋 Invoice Penjualan
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Kelola invoice dari customer yang menyewa barang kamu
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
                background: filter === btn.value ? '#7c3aed' : '#f3f4f6',
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
              Invoice akan muncul saat customer membuat pemesanan dan konfirmasi deal
            </p>
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
                  boxShadow: selectedInvoice?.id === invoice.id ? '0 4px 12px rgba(124, 58, 237, 0.15)' : 'none'
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
                      Customer: <strong>{invoice.customerName || 'Unknown'}</strong>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed', marginBottom: '4px' }}>
                      {formatCurrency(invoice.totalAmount || 0)}
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
                        {invoice.rentalDays || 'N/A'} hari
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>💰 Harga/Hari</p>
                      <p style={{ margin: '0', fontSize: '15px', fontWeight: '600' }}>
                        {formatCurrency(invoice.pricePerDay || 0)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>📆 Batas Pembayaran</p>
                      <p style={{ margin: '0', fontSize: '15px', fontWeight: '600' }}>
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('id-ID') : 'N/A'}
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
                      borderLeft: '4px solid #7c3aed'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>📋 Detail Invoice</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666' }}>Tanggal Invoice:</span>
                          <strong>{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('id-ID') : 'N/A'}</strong>
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
