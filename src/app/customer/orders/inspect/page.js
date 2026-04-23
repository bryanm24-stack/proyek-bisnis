'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function InspectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintPhoto, setComplaintPhoto] = useState(null);
  const [complaintPhotoPreview, setComplaintPhotoPreview] = useState(null);
  const [complaintCategory, setComplaintCategory] = useState('damage');
  const [complaintSeverity, setComplaintSeverity] = useState('major');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'customer' && user.role !== 'member') {
      alert('Hanya customer yang bisa mengakses halaman ini');
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

        // Calculate time left
        const deadline = new Date(currentOrder.checkDeadline);
        const now = new Date();
        const diff = deadline - now;

        if (diff > 0) {
          setTimeLeft(Math.ceil(diff / (1000 * 60 * 60))); // hours left
        } else {
          setTimeLeft(0);
        }
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

  // Update countdown timer every hour
  useEffect(() => {
    if (!order) return;

    const interval = setInterval(() => {
      const deadline = new Date(order.checkDeadline);
      const now = new Date();
      const diff = deadline - now;

      if (diff > 0) {
        setTimeLeft(Math.ceil(diff / (1000 * 60 * 60)));
      } else {
        setTimeLeft(0);
      }
    }, 60000); // Update setiap 1 menit

    return () => clearInterval(interval);
  }, [order]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setComplaintPhoto(file);
        setComplaintPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApprove = async () => {
    if (!order) return;

    if (window.confirm('Anda yakin setuju dengan kondisi barang?')) {
      setIsSubmitting(true);
      try {
        const response = await fetch('/api/orders/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            action: 'approve'
          })
        });

        const result = await response.json();
        if (result.success) {
          alert('Terima kasih! Barang telah dikonfirmasi diterima.');
          router.push('/customer/orders');
        } else {
          alert('Gagal mengupdate status: ' + result.message);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memproses');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleComplaint = async () => {
    if (!complaintDescription.trim()) {
      alert('Deskripsi komplain harus diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'complaint',
          complaintDescription: complaintDescription,
          complaintPhoto: complaintPhotoPreview,
          complaintCategory,
          complaintSeverity
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('Komplain telah dikirim. Menunggu konfirmasi vendor...');
        setShowComplaintModal(false);
        setComplaintDescription('');
        setComplaintPhoto(null);
        setComplaintPhotoPreview(null);
        setComplaintCategory('damage');
        setComplaintSeverity('major');
        // Refresh order data
        const dealsResponse = await fetch('/api/deals/all');
        const deals = await dealsResponse.json();
        const updatedOrder = deals.find(d => d.id === orderId);
        setOrder(updatedOrder);
      } else {
        alert('Gagal mengirim komplain: ' + result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan saat mengirim komplain');
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
    checking: '⏳ Menunggu Pengecekan',
    approved: '✅ Disetujui',
    complaint: '⚠️ Ada Komplain',
    refunded: '💰 Refund Selesai',
    partially_refunded: '💸 Partial Refund Selesai',
    penalty_applied: '⚠️ Denda Diterapkan',
    complaint_rejected: '❌ Komplain Ditolak'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            Pengecekan Barang
          </h1>

          {/* Status Info */}
          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #5A45D1' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Status Saat Ini</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>
              {statusLabels[order.inspectionStatus] || statusLabels.checking}
            </div>
            
            {order.inspectionStatus === 'checking' && timeLeft !== null && (
              <div style={{ fontSize: '13px', color: '#d97706' }}>
                ⏰ Sisa waktu pengecekan: <strong>{timeLeft} jam</strong> (Tenggat: {new Date(order.checkDeadline).toLocaleDateString('id-ID')})
              </div>
            )}
          </div>

          {/* Order Details */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>Detail Order</h3>
            <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Layanan:</span>
                <strong>{order.itemName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Vendor:</span>
                <strong>{order.vendorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Harga:</span>
                <strong>Rp {(order.totalPrice || 0).toLocaleString('id-ID')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Tanggal Order:</span>
                <strong>{new Date(order.createdAt).toLocaleDateString('id-ID')}</strong>
              </div>
            </div>
          </div>

          {/* Complaint Info (if exists) */}
          {order.inspectionStatus === 'complaint' && order.complaintDescription && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#b91c1c' }}>📝 Komplain Anda</h4>
              <p style={{ margin: '4px 0', color: '#7f1d1d', fontSize: '13px' }}>
                Kategori: <strong>{order.complaintCategory || 'damage'}</strong> | Tingkat: <strong>{order.complaintSeverity || 'major'}</strong>
              </p>
              <p style={{ margin: '8px 0', color: '#7f1d1d', fontSize: '14px' }}>
                {order.complaintDescription}
              </p>
              {order.complaintPhoto && (
                <div style={{ marginTop: '10px' }}>
                  <img 
                    src={order.complaintPhoto} 
                    alt="Komplain photo" 
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px' }}
                  />
                </div>
              )}
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#9a3412' }}>
                Tanggal: {new Date(order.complaintDate).toLocaleDateString('id-ID')}
              </div>
            </div>
          )}

          {order.inspectionStatus === 'refunded' && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#15803d' }}>💰 Refund Selesai</h4>
              <p style={{ margin: '8px 0', color: '#166534', fontSize: '14px' }}>
                Vendor telah menyetujui komplain Anda. Uang Rp {(order.refundAmount || 0).toLocaleString('id-ID')} akan direfund ke akun Anda.
              </p>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#4d7c0f' }}>
                Tanggal refund: {new Date(order.refundedAt).toLocaleDateString('id-ID')}
              </div>
            </div>
          )}

          {order.inspectionStatus === 'partially_refunded' && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#15803d' }}>💸 Partial Refund Selesai</h4>
              <p style={{ margin: '8px 0', color: '#166534', fontSize: '14px' }}>
                Refund sebesar Rp {(order.refundAmount || 0).toLocaleString('id-ID')} diproses dengan denda Rp {(order.penaltyAmount || 0).toLocaleString('id-ID')}.
              </p>
              {order.complaintResolutionNotes && (
                <p style={{ margin: '6px 0 0', color: '#166534', fontSize: '13px' }}>{order.complaintResolutionNotes}</p>
              )}
            </div>
          )}

          {order.inspectionStatus === 'penalty_applied' && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#a16207' }}>⚠️ Denda Diterapkan</h4>
              <p style={{ margin: '8px 0', color: '#854d0e', fontSize: '14px' }}>
                Denda sebesar Rp {(order.penaltyAmount || 0).toLocaleString('id-ID')} diberlakukan untuk transaksi ini.
              </p>
              {order.complaintResolutionNotes && (
                <p style={{ margin: '6px 0 0', color: '#854d0e', fontSize: '13px' }}>{order.complaintResolutionNotes}</p>
              )}
            </div>
          )}

          {order.inspectionStatus === 'complaint_rejected' && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#b91c1c' }}>❌ Komplain Ditolak</h4>
              <p style={{ margin: '8px 0', color: '#7f1d1d', fontSize: '14px' }}>
                Komplain tidak disetujui vendor/admin.
              </p>
              {order.complaintResolutionNotes && (
                <p style={{ margin: '6px 0 0', color: '#7f1d1d', fontSize: '13px' }}>{order.complaintResolutionNotes}</p>
              )}
            </div>
          )}

          {/* Actions */}
          {order.inspectionStatus === 'checking' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                style={{
                  padding: '12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                ✅ Setuju
              </button>
              <button
                onClick={() => setShowComplaintModal(true)}
                disabled={isSubmitting}
                style={{
                  padding: '12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                ❌ Komplain
              </button>
            </div>
          )}
        </div>

        {/* Complaint Modal */}
        {showComplaintModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>📝 Kirim Komplain</h2>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  Kategori Komplain *
                </label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '6px', padding: '10px', fontSize: '14px' }}
                >
                  <option value="damage">Kerusakan Barang</option>
                  <option value="late_return">Keterlambatan/ketidaksesuaian waktu</option>
                  <option value="service_quality">Kualitas layanan tidak sesuai</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  Tingkat Masalah *
                </label>
                <select
                  value={complaintSeverity}
                  onChange={(e) => setComplaintSeverity(e.target.value)}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '6px', padding: '10px', fontSize: '14px' }}
                >
                  <option value="minor">Ringan</option>
                  <option value="major">Sedang</option>
                  <option value="critical">Berat</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  Deskripsi Masalah *
                </label>
                <textarea
                  value={complaintDescription}
                  onChange={(e) => setComplaintDescription(e.target.value)}
                  placeholder="Jelaskan masalah/keluhan Anda tentang barang..."
                  style={{
                    width: '100%',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '10px',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    minHeight: '100px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  Foto Bukti (Opsional)
                </label>
                <div style={{
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                    id="complaint-photo"
                  />
                  <label htmlFor="complaint-photo" style={{ cursor: 'pointer' }}>
                    {complaintPhotoPreview ? (
                      <div>
                        <img src={complaintPhotoPreview} alt="Preview" style={{ maxHeight: '200px', marginBottom: '10px' }} />
                        <div style={{ fontSize: '12px', color: '#666' }}>Klik untuk ubah foto</div>
                      </div>
                    ) : (
                      <div style={{ color: '#666' }}>
                        📷 Klik atau drag foto bukti keluhan
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowComplaintModal(false);
                    setComplaintDescription('');
                    setComplaintPhoto(null);
                    setComplaintPhotoPreview(null);
                    setComplaintCategory('damage');
                    setComplaintSeverity('major');
                  }}
                  style={{
                    padding: '10px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleComplaint}
                  disabled={isSubmitting || !complaintDescription.trim()}
                  style={{
                    padding: '10px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    opacity: isSubmitting || !complaintDescription.trim() ? 0.6 : 1
                  }}
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim Komplain'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InspectionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
      <InspectionContent />
    </Suspense>
  );
}
