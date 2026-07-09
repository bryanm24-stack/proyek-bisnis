'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SharedNavbar from '../../components/SharedNavbar';


import { readData, writeData } from '@/lib/storage';
function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transactionId');

  const [user, setUser] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // ✅ NEW: Fetch transaction data with better error handling
    const fetchTransactionData = async () => {
      try {
        if (!transactionId) {
          setIsLoading(false);
          return;
        }

        // Try to fetch from API with transactionId parameter
        const response = await fetch(`/api/transactions?id=${transactionId}`);
        if (response.ok) {
          const data = await response.json();
          // Handle both direct object and array response
          const txn = Array.isArray(data) ? data.find(t => t.id === transactionId) : data;
          setTransaction(txn || null);
        } else {
          console.error('Failed to fetch transaction:', response.status);
        }
      } catch (error) {
        console.error('Error fetching transaction:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactionData();

    // Also try to fetch invoice by transactionId (if invoice exists)
    const fetchInvoice = async () => {
      try {
        if (!transactionId) return;
        const resp = await fetch(`/api/invoices?transactionId=${transactionId}`);
        if (resp.ok) {
          const invs = await resp.json();
          // invoices API returns array mapped via mapInvoiceRow
          const inv = Array.isArray(invs) ? invs.find(i => i.transactionId === transactionId || i.paymentTransactionId === transactionId) : invs;
          setInvoice(inv || null);
        }
      } catch (err) {
        console.error('Error fetching invoice:', err);
      }
    };

    fetchInvoice();
  }, [router, transactionId]);

  const getPaymentMethodLabel = (method) => {
    const labels = {
      qris: ' QRIS',
      card: ' Kartu Debit/Credit',
      cod: ' Cash on Delivery'
    };
    return labels[method] || method;
  };

  // Normalize fields from API (snake_case) to expected camelCase
  const paymentType = transaction?.paymentType || transaction?.payment_type || null;
  const paymentMethod = transaction?.paymentMethod || transaction?.payment_method || null;
  // Prefer invoice values if available
  const serviceFee = (invoice?.serviceFee ?? invoice?.serviceFee) || transaction?.serviceFee || transaction?.service_fee || 1000;
  const totalAmount = invoice?.totalAmount || invoice?.totalAmount || transaction?.totalAmount || transaction?.total_amount || ((transaction?.amount || 0) + serviceFee);
  const timestamp = transaction?.timestamp || transaction?.created_at || null;
  const status = transaction?.status || transaction?.status || 'pending';
  const invoicePath = user?.role === 'vendor' ? '/vendor/invoices' : '/customer/invoices';
  const chatPath = user?.role === 'vendor' ? '/vendor/chats' : '/customer/chats';

  // Derived display values (prefer invoice, then transaction, then computed)
  const displayStartDate = invoice?.startDate || transaction?.start_date || null;
  const displayDuration = invoice?.durationDays || transaction?.duration_days || null;
  const displayInstallment3Due = invoice?.installment3DueDate || transaction?.installment_3_due_date || null;
  const computedExpectedReturn = displayStartDate && displayDuration ? (() => { const d = new Date(displayStartDate); d.setDate(d.getDate() + (Math.max(1, Number(displayDuration)) - 1)); return d; })() : null;
  const expectedReturnDateObj = displayInstallment3Due ? new Date(displayInstallment3Due) : computedExpectedReturn;
  const expectedReturnLabel = expectedReturnDateObj ? expectedReturnDateObj.toLocaleDateString('id-ID') : '-';
  const vendorDiscountValue = invoice?.vendorDiscount ?? transaction?.vendor_discount ?? 0;

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f3ff 0%, #f0f4ff 100%)' }}>
      <SharedNavbar />

      {/* Main Content */}
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '40px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)', textAlign: 'center' }}>
          
          {/* Success Icon */}
          <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'bounce 2s infinite' }}>
            
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#22c55e', marginBottom: '12px' }}>Pembayaran Berhasil!</h1>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px' }}>Terima kasih telah melakukan transaksi di 🛡️ RentGuard</p>

          {/* Transaction ID */}
          <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '2px solid #86efac' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px 0' }}>ID Transaksi</p>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#166534', margin: '0', fontFamily: 'monospace' }}>{transactionId}</p>
          </div>

          {/* Payment Details */}
          <div style={{ background: '#f9fafb', padding: '24px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e5e7eb', textAlign: 'left' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '16px', textAlign: 'center' }}> Rincian Pembayaran</h2>

            {transaction?.quantity && (
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Harga per {transaction?.quantityType || invoice?.quantityType || 'Unit'}</span>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>Rp{(transaction?.basePrice || invoice?.basePrice || 0).toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#6b7280' }}>Jumlah {transaction?.quantityType || invoice?.quantityType || 'Unit'}</span>
                    <span style={{ fontWeight: '600', color: '#1f2937' }}>{transaction?.quantity || invoice?.quantity || 1} {transaction?.quantityType || invoice?.quantityType || 'Unit'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#1f2937', fontWeight: '600' }}>Subtotal</span>
                    <span style={{ fontWeight: '700', color: '#22c55e' }}>Rp{(transaction?.amount || invoice?.discountedSubtotal || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}

            {/* Move Biaya Layanan below the Total as requested */}

            {/* ✅ NEW: Display vendor discount if exists */}
            {((invoice && invoice.vendorDiscount > 0) || (transaction?.vendor_discount && transaction.vendor_discount > 0)) && (
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Diskon Dari Vendor</span>
                  <span style={{ fontWeight: '600', color: '#22c55e' }}>{vendorDiscountValue ? `-Rp${Number(vendorDiscountValue).toLocaleString('id-ID')}` : '-Rp0'}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{invoice?.vendorDiscountReason || transaction?.vendor_discount_reason || ''}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: '700', color: '#1f2937', fontSize: '16px' }}>Total Pembayaran</span>
              <span style={{ fontWeight: '700', color: '#22c55e', fontSize: '24px' }}>Rp{totalAmount.toLocaleString('id-ID')}</span>
            </div>

            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Biaya Layanan</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>Rp{serviceFee.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* ✅ NEW: Display Pay After installment details */}
            {(paymentType === 'pay_after' || transaction?.payment_type === 'pay_after') && (
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #ddd', background: '#fffbeb', padding: '12px', borderRadius: '6px' }}>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#92400e', marginBottom: '12px' }}>📋 Rincian Cicilan 3 Tahap:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {transaction?.installment_1_amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#6b7280' }}>
                        Stage 1 (DP) - {transaction?.installment_1_due_date ? new Date(transaction.installment_1_due_date).toLocaleDateString('id-ID') : 'Hari ini'}
                      </span>
                      <span style={{ fontWeight: '600', color: '#22c55e' }}>Rp{Number(transaction.installment_1_amount).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {transaction?.installment_2_amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#6b7280' }}>
                        Stage 2 (Mid) - {transaction?.installment_2_due_date ? new Date(transaction.installment_2_due_date).toLocaleDateString('id-ID') : 'Tgl pinjam (tengah hari)'}
                      </span>
                      <span style={{ fontWeight: '600', color: '#f59e0b' }}>Rp{Number(transaction.installment_2_amount).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {transaction?.installment_3_amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#6b7280' }}>
                        Stage 3 (Final) - {transaction?.installment_3_due_date ? new Date(transaction.installment_3_due_date).toLocaleDateString('id-ID') : 'Saat pengembalian'}
                      </span>
                      <span style={{ fontWeight: '600', color: '#8b5cf6' }}>Rp{Number(transaction.installment_3_amount).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dates and status */}
            <div style={{ paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Tanggal Sewa</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>{displayStartDate ? new Date(displayStartDate).toLocaleDateString('id-ID') : '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Estimasi Kembali</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>{expectedReturnLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Metode Pembayaran</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>{getPaymentMethodLabel(invoice?.paymentMethod || paymentMethod)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Tanggal & Waktu</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>{(invoice?.createdAt || timestamp) ? new Date(invoice?.createdAt || timestamp).toLocaleString('id-ID') : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Status</span>
                <span style={{ fontWeight: '600', color: '#22c55e', background: '#f0fdf4', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  ✓ {status === 'success' ? 'Berhasil' : (status === 'pending' ? 'Pending' : status)}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', marginBottom: '32px', border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: '14px', color: '#1e40af', margin: '0', fontWeight: '500' }}>
              ℹ️ Bukti pembayaran telah dikirimkan ke email Anda. Silahkan tunggu vendor mengkonfirmasi pesanan Anda.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <button
              onClick={() => router.push(invoicePath)}
              style={{
                padding: '14px 24px',
                background: '#ecfeff',
                color: '#0f766e',
                border: '1px solid #99f6e4',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
               Lihat Invoice
            </button>
            <button
              onClick={() => router.push(chatPath)}
              style={{
                padding: '14px 24px',
                background: '#f3f4f6',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
               Lihat Chat
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '14px 24px',
                background: '#B28A67',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
               Kembali ke Home
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}

export default function TransactionSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
