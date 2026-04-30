'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import SharedNavbar from '../../components/SharedNavbar';

export default function CustomerOngoingPage() {
  const [user, setUser] = useState(null);
  const [ongoingDeals, setOngoingDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [complainModalOpen, setComplainModalOpen] = useState(false);
  const [complainForm, setComplainForm] = useState({
    photo: null,
    photoPreview: null,
    reason: ''
  });
  const [submittingComplain, setSubmittingComplain] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Fetch both as customer regardless of role
      // User yang adalah vendor juga bisa jadi customer saat memesan ke vendor lain
      fetchOngoingDeals(parsedUser.id);
    } else {
      window.location.href = '/login';
    }
  }, []);

  const fetchOngoingDeals = async (customerId) => {
    try {
      const response = await fetch(`/api/ongoing?userId=${customerId}&userRole=customer`);
      const data = await response.json();
      if (data.success) {
        setOngoingDeals(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ongoing deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComplainForm({
          ...complainForm,
          photo: file,
          photoPreview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitComplain = async () => {
    if (!complainForm.reason.trim() || !complainForm.photoPreview) {
      alert('Foto dan alasan complain harus diisi');
      return;
    }

    setSubmittingComplain(true);
    try {
      const response = await fetch('/api/ongoing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: selectedDeal.id,
          customerId: user.id,
          vendorId: selectedDeal.vendorId,
          photo: complainForm.photoPreview,
          reason: complainForm.reason
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Complain berhasil dikirim ke vendor');
        setComplainModalOpen(false);
        setComplainForm({ photo: null, photoPreview: null, reason: '' });
        fetchOngoingDeals(user.id);
      } else {
        alert('Gagal mengirim complain: ' + data.message);
      }
    } catch (error) {
      console.error('Error submitting complain:', error);
      alert('Terjadi kesalahan saat mengirim complain');
    } finally {
      setSubmittingComplain(false);
    }
  };

  const handleConfirm = async (deal) => {
    try {
      const response = await fetch('/api/ongoing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          userId: user.id,
          userRole: 'customer',
          action: 'confirm'
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Konfirmasi berhasil dikirim');
        fetchOngoingDeals(user.id);
      } else {
        alert('Gagal mengkonfirmasi: ' + data.message);
      }
    } catch (error) {
      console.error('Error confirming deal:', error);
      alert('Terjadi kesalahan saat mengkonfirmasi');
    }
  };

  if (loading) {
    return (
      <div>
        <SharedNavbar />
        <div className={styles.content}>
          <p>Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SharedNavbar />

      <div className={styles.content}>
        <h1>Pesanan Sedang Berlangsung</h1>
        
        {ongoingDeals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Anda belum memiliki pesanan yang sedang berlangsung</p>
            <Link href="/customer/chats" className={styles.primaryButton}>
              Lanjutkan ke Chat
            </Link>
          </div>
        ) : (
          <div className={styles.dealsList}>
            {ongoingDeals.map(deal => {
              const imageUrl = deal.service?.image || (deal.service?.images && deal.service.images.length > 0 ? deal.service.images[0] : 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(deal.service?.title || 'Service'));
              const borrowDateLabel = deal.borrowDate
                ? new Date(deal.borrowDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                : '-';
              const expectedReturnDateLabel = deal.expectedReturnDate
                ? new Date(deal.expectedReturnDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                : '-';
              const returnStatusLabel = deal.returnStatus === 'late'
                ? 'Terlambat'
                : deal.returnStatus === 'returned'
                  ? 'Sudah Dikembalikan'
                  : 'Menunggu Pengembalian';
              
              return (
              <div key={deal.id} className={styles.dealCard}>
                <div className={styles.dealHeader}>
                  <img 
                    src={imageUrl}
                    alt={deal.service?.title}
                    className={styles.vendorImage}
                  />
                  <div className={styles.vendorInfo}>
                    <h3>{deal.otherUser?.name || 'Vendor'}</h3>
                    <p className={styles.serviceTitle}>{deal.service?.title}</p>
                    <p className={styles.price}>Rp {deal.service?.price?.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className={styles.dealStatus}>
                  <span className={styles.statusLabel}>Status Pesanan:</span>
                  <div className={styles.statusContainer}>
                    <span className={deal.customerConfirmed ? styles.confirmed : styles.pending}>
                      {deal.customerConfirmed ? '✓ Anda Confirm' : '⊘ Belum Confirm'}
                    </span>
                    <span className={deal.vendorConfirmed ? styles.confirmed : styles.pending}>
                      {deal.vendorConfirmed ? '✓ Vendor Confirm' : '⊘ Vendor Belum Confirm'}
                    </span>
                  </div>
                </div>

                <div className={styles.dealStatus}>
                  <span className={styles.statusLabel}>Tanggal Peminjaman:</span>
                  <div className={styles.statusContainer}>
                    <span className={styles.confirmed}>Mulai: {borrowDateLabel}</span>
                    <span className={styles.pending}>Kembali: {expectedReturnDateLabel}</span>
                    <span className={deal.returnStatus === 'returned' ? styles.confirmed : styles.pending}>
                      {returnStatusLabel}
                    </span>
                  </div>
                </div>

                {deal.complains && deal.complains.length > 0 && (
                  <div className={styles.complainsSection}>
                    <h4>Complain Aktif:</h4>
                    {deal.complains.map(complain => (
                      <div key={complain.id} className={styles.complainItem}>
                        <p><strong>Alasan:</strong> {complain.reason}</p>
                        <p className={styles.complainDate}>
                          {new Date(complain.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.dealActions}>
                  {deal.customerConfirmed && deal.vendorConfirmed && (
                    <>
                      <Link 
                        href={`/customer/orders/inspect?orderId=${deal.id}`}
                        className={styles.inspectButton}
                      >
                        Cek Barang & Inspeksi
                      </Link>
                      <button 
                        className={styles.complainButton}
                        onClick={() => {
                          setSelectedDeal(deal);
                          setComplainModalOpen(true);
                        }}
                      >
                        Komplain
                      </button>
                    </>
                  )}
                  {!deal.customerConfirmed && (
                    <button 
                      className={styles.confirmButton}
                      onClick={() => handleConfirm(deal)}
                    >
                      Confirm
                    </button>
                  )}
                  {deal.customerConfirmed && !deal.vendorConfirmed && (
                    <button 
                      className={styles.confirmButton}
                      disabled
                    >
                      Menunggu Vendor Confirm
                    </button>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Complain Modal */}
      {complainModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Ajukan Complain</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setComplainModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Foto Barang</label>
                <div className={styles.photoUpload}>
                  {complainForm.photoPreview ? (
                    <div className={styles.photoPreview}>
                      <img src={complainForm.photoPreview} alt="Preview" />
                      <button 
                        type="button"
                        onClick={() => setComplainForm({ ...complainForm, photo: null, photoPreview: null })}
                      >
                        Hapus Foto
                      </button>
                    </div>
                  ) : (
                    <label className={styles.photoLabel}>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                      />
                      <span>Klik atau drag foto di sini</span>
                    </label>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Alasan Complain</label>
                <textarea 
                  value={complainForm.reason}
                  onChange={(e) => setComplainForm({ ...complainForm, reason: e.target.value })}
                  placeholder="Jelaskan alasan complain Anda..."
                  rows="5"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setComplainModalOpen(false)}
              >
                Batal
              </button>
              <button 
                className={styles.submitButton}
                onClick={handleSubmitComplain}
                disabled={submittingComplain}
              >
                {submittingComplain ? 'Mengirim...' : 'Kirim Complain'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
