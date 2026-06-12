'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import SharedNavbar from '../../components/SharedNavbar';


import { readData, writeData } from '@/lib/storage';
export default function VendorOngoingPage() {
  const [user, setUser] = useState(null);
  const [ongoingDeals, setOngoingDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Fetch as vendor - user dengan role vendor bisa akses halaman ini
      fetchOngoingDeals(parsedUser.id);
    } else {
      window.location.href = '/login';
    }
  }, []);

  const fetchOngoingDeals = async (vendorId) => {
    try {
      const response = await fetch(`/api/ongoing?userId=${vendorId}&userRole=vendor`);
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

  const handleConfirm = async (deal) => {
    // Check if customer already confirmed
    if (!deal.customerConfirmed) {
      alert('Customer harus confirm terlebih dahulu');
      return;
    }

    try {
      const response = await fetch('/api/ongoing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          userId: user.id,
          userRole: 'vendor',
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
            <Link href="/vendor/chats" className={styles.primaryButton}>
              Lanjutkan ke Chat
            </Link>
          </div>
        ) : (
          <div className={styles.dealsList}>
            {ongoingDeals.map(deal => {
              const imageUrl = deal.service?.image || (deal.service?.images && deal.service.images.length > 0 ? deal.service.images[0] : 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(deal.service?.title || 'Service'));
              
              return (
              <div key={deal.id} className={styles.dealCard}>
                <div className={styles.dealHeader}>
                  <img 
                    src={imageUrl}
                    alt={deal.service?.title}
                    className={styles.productImage}
                  />
                  <div className={styles.productInfo}>
                    <h3>{deal.service?.title}</h3>
                    <p className={styles.buyerName}>Pembeli: <strong>{deal.otherUser?.name}</strong></p>
                    <p className={styles.price}>Rp {deal.service?.price?.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className={styles.dealStatus}>
                  <span className={styles.statusLabel}>Status Pesanan:</span>
                  <div className={styles.statusContainer}>
                    <span className={deal.customerConfirmed ? styles.confirmed : styles.pending}>
                      {deal.customerConfirmed ? '✓ Customer Confirm' : '⊘ Customer Belum Confirm'}
                    </span>
                    <span className={deal.vendorConfirmed ? styles.confirmed : styles.pending}>
                      {deal.vendorConfirmed ? '✓ Anda Confirm' : '⊘ Belum Confirm'}
                    </span>
                  </div>
                </div>

                {deal.complains && deal.complains.length > 0 && (
                  <div className={styles.complainsSection}>
                    <h4>Complain dari Customer:</h4>
                    {deal.complains.map(complain => (
                      <div key={complain.id} className={styles.complainItem}>
                        {complain.photo && (
                          <img src={complain.photo} alt="Foto complain" className={styles.complainPhoto} />
                        )}
                        <p><strong>Alasan:</strong> {complain.reason}</p>
                        <p className={styles.complainDate}>
                          {new Date(complain.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.dealActions}>
                  {deal.vendorConfirmed && (
                    <Link 
                      href={`/vendor/orders/inspect?orderId=${deal.id}`}
                      className={styles.inspectButton}
                    >
                      Lihat Status Inspeksi
                    </Link>
                  )}
                  {!deal.customerConfirmed && (
                    <button 
                      className={styles.confirmButton}
                      disabled
                    >
                      Tunggu Customer Confirm
                    </button>
                  )}
                  {deal.customerConfirmed && !deal.vendorConfirmed && (
                    <button 
                      className={styles.confirmButton}
                      onClick={() => handleConfirm(deal)}
                    >
                      Confirm
                    </button>
                  )}
                  {deal.vendorConfirmed && !deal.customerConfirmed && (
                    <button 
                      className={styles.confirmButton}
                      disabled
                    >
                      Menunggu Customer Confirm
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
