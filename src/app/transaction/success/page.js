'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SharedNavbar from '../../components/SharedNavbar';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transactionId');

  const [user, setUser] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Fetch transaction data
    const fetchTransactionData = async () => {
      try {
        const response = await fetch('/api/transactions');
        const transactions = await response.json();
        const currentTransaction = transactions.find(t => t.id === transactionId);
        setTransaction(currentTransaction);
      } catch (error) {
        console.error('Error fetching transaction:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactionData();
  }, [router, transactionId]);

  const getPaymentMethodLabel = (method) => {
    const labels = {
      qris: '💳 QRIS',
      card: '🏦 Kartu Debit/Credit',
      cod: '🚚 Cash on Delivery'
    };
    return labels[method] || method;
  };

  const serviceFee = transaction?.serviceFee || 1000;
  const totalAmount = transaction?.totalAmount || ((transaction?.amount || 0) + serviceFee);

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
            ✅
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
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '16px', textAlign: 'center' }}>📋 Rincian Pembayaran</h2>

            {transaction?.quantity && (
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Harga per {transaction.quantityType}</span>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>Rp{transaction?.basePrice?.toLocaleString('id-ID') || '0'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Jumlah {transaction.quantityType}</span>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>{transaction.quantity} {transaction.quantityType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#1f2937', fontWeight: '600' }}>Subtotal</span>
                  <span style={{ fontWeight: '700', color: '#22c55e' }}>Rp{transaction?.amount?.toLocaleString('id-ID') || '0'}</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Biaya Layanan</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>Rp{serviceFee.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: '700', color: '#1f2937', fontSize: '16px' }}>Total Pembayaran</span>
              <span style={{ fontWeight: '700', color: '#22c55e', fontSize: '24px' }}>Rp{totalAmount.toLocaleString('id-ID')}</span>
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Metode Pembayaran</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>{getPaymentMethodLabel(transaction?.paymentMethod)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Tanggal & Waktu</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>
                  {transaction?.timestamp ? new Date(transaction.timestamp).toLocaleString('id-ID') : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Status</span>
                <span style={{ fontWeight: '600', color: '#22c55e', background: '#f0fdf4', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  ✓ {transaction?.status === 'success' ? 'Berhasil' : 'Pending'}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => router.push('/customer/chats')}
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
              💬 Lihat Chat
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '14px 24px',
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🏠 Kembali ke Home
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
