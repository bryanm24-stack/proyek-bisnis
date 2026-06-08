'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedNavbar from '@/app/components/SharedNavbar';

export default function TransactionVerificationPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesById, setNotesById] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin') {
      router.push('/');
      return;
    }

    setUser(parsedUser);
    fetchTransactions();
  }, [router]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/admin/transaction-verification');
      const result = await response.json();
      if (result.success) {
        setTransactions(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (transactionId, action) => {
    setActionLoadingId(transactionId);
    try {
      const response = await fetch('/api/admin/transaction-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          action,
          adminId: user?.id,
          adminName: user?.name,
          adminNotes: notesById[transactionId] || ''
        })
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.message || 'Gagal memproses verifikasi');
      } else {
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
      alert('Terjadi kesalahan saat memproses verifikasi');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusLabel = (status) => {
    if (status === 'approved') return 'Disetujui';
    if (status === 'rejected') return 'Ditolak';
    return 'Menunggu';
  };

  const getStatusColor = (status) => {
    if (status === 'approved') return '#15803d';
    if (status === 'rejected') return '#b91c1c';
    return '#b45309';
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data verifikasi...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <SharedNavbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '28px', color: '#0f172a' }}>Verifikasi Identitas Transaksi</h1>
        <p style={{ margin: '0 0 20px', color: '#475569' }}>Review data identitas customer sebelum transaksi diproses lebih lanjut.</p>

        {transactions.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', color: '#64748b' }}>
            Belum ada transaksi dengan data identitas.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {transactions.map((trx) => {
              const identity = trx.identityVerification || {};
              return (
                <div key={trx.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>Transaksi {trx.id}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                        Customer: {trx.customerName} ({trx.customerEmail}) | Metode: {trx.paymentMethod?.toUpperCase() || '-'} | Total: Rp {(trx.totalAmount || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', background: '#f8fafc', color: getStatusColor(identity.status) }}>
                      {getStatusLabel(identity.status)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                    <div><strong>Nama:</strong> {identity.fullName || '-'}</div>
                    <div><strong>Telepon:</strong> {identity.phoneNumber || '-'}</div>
                    <div><strong>Email:</strong> {identity.email || '-'}</div>
                    <div><strong>Jenis ID:</strong> {(identity.idType || '-').toUpperCase()}</div>
                    <div><strong>Nomor ID:</strong> {identity.idNumber || '-'}</div>
                    <div><strong>Catatan:</strong> {identity.notes || '-'}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px' }}>
                      <p style={{ margin: '0 0 8px', fontWeight: '600', color: '#334155' }}>Foto Identitas</p>
                      {identity.idPhotoPreview ? (
                        <img src={identity.idPhotoPreview} alt='Foto identitas' style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '8px', background: '#f8fafc' }} />
                      ) : (
                        <p style={{ margin: 0, color: '#94a3b8' }}>Tidak tersedia</p>
                      )}
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px' }}>
                      <p style={{ margin: '0 0 8px', fontWeight: '600', color: '#334155' }}>Foto Selfie</p>
                      {identity.selfiePhotoPreview ? (
                        <img src={identity.selfiePhotoPreview} alt='Foto selfie' style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '8px', background: '#f8fafc' }} />
                      ) : (
                        <p style={{ margin: 0, color: '#94a3b8' }}>Tidak tersedia</p>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={notesById[trx.id] || ''}
                    onChange={(e) => setNotesById((prev) => ({ ...prev, [trx.id]: e.target.value }))}
                    placeholder='Catatan admin (opsional)...'
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '80px', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}
                  />

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleAction(trx.id, 'approve')}
                      disabled={actionLoadingId === trx.id}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 14px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Setujui Identitas
                    </button>
                    <button
                      onClick={() => handleAction(trx.id, 'reject')}
                      disabled={actionLoadingId === trx.id}
                      style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 14px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Tolak Identitas
                    </button>
                  </div>

                  {identity.reviewedAt && (
                    <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#64748b' }}>
                      Direview oleh {identity.reviewedBy?.name || 'Admin'} pada {new Date(identity.reviewedAt).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
