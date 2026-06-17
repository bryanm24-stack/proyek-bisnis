'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';


import { readData, writeData } from '@/lib/storage';
function VendorInspectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'vendor') {
      alert('Hanya vendor yang bisa mengakses halaman ini');
      router.push('/');
      return;
    }

    // Fetch order data
    const fetchOrder = async () => {
      try {
        const response = await fetch('/api/deals/all');
        const deals = await response.json();
        const currentOrder = deals.find(d => d.id === orderId);
        
        if (!currentOrder) {
          alert('Order tidak ditemukan');
          router.push('/');
          return;
        }

        setOrder(currentOrder);
      } catch (error) {
        console.error('Error fetching order:', error);
        alert('Gagal memuat data order');
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, router]);

  const handleConfirmComplaint = async () => {
    if (!order) return;

    if (window.confirm('Anda setuju dengan komplain customer? Uang akan direfund penuh.')) {
      setIsSubmitting(true);
      try {
        const response = await fetch('/api/orders/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            action: 'confirm-complaint'
          })
        });

        const result = await response.json();
        if (result.success) {
          alert('Komplain telah disetujui. Refund sedang diproses.');
          router.push('/vendor/orders');
        } else {
          alert('Gagal memproses: ' + result.message);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleComplaintResolution = async (action) => {
    if (!order) return;

    if (action === 'apply-penalty' && (!penaltyAmount || Number(penaltyAmount) <= 0)) {
      alert('Nominal denda harus diisi untuk aksi denda');
      return;
    }

    const actionLabel = {
      'confirm-complaint': 'full refund',
      'resolve-partial-refund': 'partial refund',
      'apply-penalty': 'denda',
      'reject-complaint': 'tolak komplain'
    };

    if (!window.confirm(`Yakin memproses aksi ${actionLabel[action] || action}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action,
          penaltyAmount: Number(penaltyAmount || 0),
          resolutionNotes
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('Penyelesaian komplain berhasil diproses.');
        const dealsResponse = await fetch('/api/deals/all');
        const deals = await dealsResponse.json();
        const updatedOrder = deals.find((d) => d.id === order.id);
        setOrder(updatedOrder || result.data);
      } else {
        alert('Gagal memproses: ' + result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
        Memuat data order...
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
        Order tidak ditemukan
      </div>
    );
  }

  const statusLabels = {
    checking: '⏳ Sedang Diperiksa Customer',
    approved: '✅ Customer Setuju',
    complaint: '⚠️ Customer Komplain',
    refunded: '💰 Refund Selesai',
    partially_refunded: '💸 Partial Refund Selesai',
    penalty_applied: '⚠️ Denda Diterapkan',
    complaint_rejected: '❌ Komplain Ditolak'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ← Kembali
          </button>
        </div>

        {/* Main Card */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
            Status Pengecekan Customer
          </h1>

          {/* Status Info */}
          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #B28A67' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Status Saat Ini</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
              {statusLabels[order.inspectionStatus] || statusLabels.checking}
            </div>
          </div>

          {/* Order Details */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>Detail Order</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
              <div>
                <div style={{ color: '#666', marginBottom: '4px' }}>Layanan</div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>{order.itemName}</div>
              </div>
              <div>
                <div style={{ color: '#666', marginBottom: '4px' }}>Customer</div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>{order.customerName}</div>
              </div>
              <div>
                <div style={{ color: '#666', marginBottom: '4px' }}>Harga</div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>Rp {(order.totalPrice || 0).toLocaleString('id-ID')}</div>
              </div>
              <div>
                <div style={{ color: '#666', marginBottom: '4px' }}>Tanggal Order</div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>{new Date(order.createdAt).toLocaleDateString('id-ID')}</div>
              </div>
            </div>
          </div>

          {/* Complaint Section */}
          {order.inspectionStatus === 'complaint' && order.complaintDescription && (
            <>
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#d97706', fontSize: '16px' }}>⚠️ Komplain dari Customer</h3>
                
                <div style={{ background: 'white', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                  <div style={{ fontSize: '13px', color: '#7c2d12', marginBottom: '6px' }}>
                    Kategori: <strong>{order.complaintCategory || 'damage'}</strong> | Tingkat: <strong>{order.complaintSeverity || 'major'}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Deskripsi Masalah:</div>
                  <p style={{ margin: '0', fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
                    {order.complaintDescription}
                  </p>
                </div>

                {order.complaintPhoto && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Foto Bukti:</div>
                    <img 
                      src={order.complaintPhoto} 
                      alt="Komplain photo" 
                      style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#9a3412', marginTop: '10px' }}>
                  📅 Tanggal komplain: {new Date(order.complaintDate).toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#166534' }}>
                  Pilih aksi yang sesuai untuk menyelesaikan komplain ini:
                </p>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#166534', marginBottom: '6px' }}>
                    Catatan penyelesaian
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Contoh: Kerusakan ringan, disepakati refund sebagian"
                    style={{ width: '100%', minHeight: '72px', border: '1px solid #86efac', borderRadius: '6px', padding: '8px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#166534', marginBottom: '6px' }}>
                    Nominal denda (untuk aksi denda/partial)
                  </label>
                  <input
                    type="number"
                    value={penaltyAmount}
                    onChange={(e) => setPenaltyAmount(e.target.value)}
                    placeholder="Contoh: 50000"
                    style={{ width: '100%', border: '1px solid #86efac', borderRadius: '6px', padding: '8px', boxSizing: 'border-box' }}
                    min="0"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => handleComplaintResolution('confirm-complaint')}
                    disabled={isSubmitting}
                    style={{ padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', opacity: isSubmitting ? 0.6 : 1 }}
                  >
                    Full Refund
                  </button>
                  <button
                    onClick={() => handleComplaintResolution('resolve-partial-refund')}
                    disabled={isSubmitting}
                    style={{ padding: '10px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', opacity: isSubmitting ? 0.6 : 1 }}
                  >
                    Partial Refund
                  </button>
                  <button
                    onClick={() => handleComplaintResolution('apply-penalty')}
                    disabled={isSubmitting}
                    style={{ padding: '10px', background: '#a16207', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', opacity: isSubmitting ? 0.6 : 1 }}
                  >
                    Terapkan Denda
                  </button>
                  <button
                    onClick={() => handleComplaintResolution('reject-complaint')}
                    disabled={isSubmitting}
                    style={{ padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', opacity: isSubmitting ? 0.6 : 1 }}
                  >
                    Tolak Komplain
                  </button>
                </div>
              </div>
            </>
          )}

          {order.inspectionStatus === 'approved' && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#15803d', fontSize: '16px' }}>✅ Customer Puas</h3>
              <p style={{ margin: '0', fontSize: '14px', color: '#166534' }}>
                Customer telah menyetujui kondisi barang. Transaksi ini berhasil diselesaikan.
              </p>
            </div>
          )}

          {order.inspectionStatus === 'refunded' && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#15803d', fontSize: '16px' }}>💰 Refund Selesai</h3>
              <p style={{ margin: '8px 0', fontSize: '14px', color: '#166534' }}>
                Refund sebesar Rp {(order.refundAmount || 0).toLocaleString('id-ID')} telah diproses untuk customer.
              </p>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#4d7c0f' }}>
                📅 Tanggal refund: {new Date(order.refundedAt).toLocaleDateString('id-ID')}
              </div>
            </div>
          )}

          {order.inspectionStatus === 'partially_refunded' && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#15803d', fontSize: '16px' }}>💸 Partial Refund Selesai</h3>
              <p style={{ margin: '8px 0', fontSize: '14px', color: '#166534' }}>
                Refund Rp {(order.refundAmount || 0).toLocaleString('id-ID')} dengan denda Rp {(order.penaltyAmount || 0).toLocaleString('id-ID')}.
              </p>
              {order.complaintResolutionNotes && <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>{order.complaintResolutionNotes}</p>}
            </div>
          )}

          {order.inspectionStatus === 'penalty_applied' && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#92400e', fontSize: '16px' }}>⚠️ Denda Diterapkan</h3>
              <p style={{ margin: '8px 0', fontSize: '14px', color: '#854d0e' }}>
                Denda untuk customer: Rp {(order.penaltyAmount || 0).toLocaleString('id-ID')}.
              </p>
              {order.complaintResolutionNotes && <p style={{ margin: 0, fontSize: '13px', color: '#854d0e' }}>{order.complaintResolutionNotes}</p>}
            </div>
          )}

          {order.inspectionStatus === 'complaint_rejected' && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#b91c1c', fontSize: '16px' }}>❌ Komplain Ditolak</h3>
              <p style={{ margin: '8px 0', fontSize: '14px', color: '#7f1d1d' }}>
                Komplain customer ditolak. Transaksi dianggap selesai.
              </p>
              {order.complaintResolutionNotes && <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d' }}>{order.complaintResolutionNotes}</p>}
            </div>
          )}

          {order.inspectionStatus === 'checking' && (
            <div style={{ background: '#e0e7ff', border: '1px solid #a5b4fc', borderRadius: '8px', padding: '15px' }}>
              <p style={{ margin: '0', fontSize: '14px', color: '#3730a3' }}>
                ⏳ Menunggu customer untuk memeriksa barang. Silakan tunggu hingga customer memberikan keputusan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorInspectionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
      <VendorInspectionContent />
    </Suspense>
  );
}
