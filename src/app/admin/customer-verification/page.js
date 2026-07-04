'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function CustomerVerificationPage() {
  const [user, setUser] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Summary data
  const [summaryData, setSummaryData] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    notSubmitted: 0
  });

  useEffect(() => {
    const parsedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (!parsedUser || parsedUser.role !== 'admin') {
      window.location.href = '/login';
      return;
    }
    setUser(parsedUser);
    fetchVerifications();
  }, []);

  const fetchVerifications = async (status = 'all') => {
    try {
      setLoading(true);
      const query = status !== 'all' ? `?status=${status}` : '';
      const response = await fetch(`/api/admin/customer-verification${query}`);
      const data = await response.json();

      if (data.success) {
        setVerifications(data.verifications || []);
        setSummaryData({
          pending: data.statusCounts?.pending || 0,
          approved: data.statusCounts?.approved || 0,
          rejected: data.statusCounts?.rejected || 0,
          notSubmitted: data.statusCounts?.notSubmitted || 0
        });
      } else {
        setErrorMsg(data.message || 'Gagal mengambil data verifikasi');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    fetchVerifications(status);
  };

  const handleApprove = async (customerId) => {
    if (!window.confirm('Setujui verifikasi KTP customer ini?')) return;

    try {
      setActionLoading(customerId);
      const response = await fetch('/api/admin/customer-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: customerId,
          action: 'approve',
          adminId: user.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg(`✓ Verifikasi KTP ${data.user.name} berhasil disetujui!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchVerifications(statusFilter);
      } else {
        setErrorMsg(data.message || 'Gagal menyetujui verifikasi');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (customerId) => {
    const reason = window.prompt('Alasan penolakan verifikasi KTP:');
    if (reason === null) return;

    try {
      setActionLoading(customerId);
      const response = await fetch('/api/admin/customer-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: customerId,
          action: 'reject',
          rejectionReason: reason || 'Tidak sesuai dengan standar',
          adminId: user.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg(`✓ Verifikasi KTP ${data.user.name} berhasil ditolak!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchVerifications(statusFilter);
      } else {
        setErrorMsg(data.message || 'Gagal menolak verifikasi');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'not_submitted': 'Belum Diajukan',
      'pending': 'Menunggu Review',
      'approved': 'Disetujui',
      'rejected': 'Ditolak'
    };
    return labels[status] || status;
  };

  if (!user) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📋 Verifikasi Customer KTP</h1>
        <p className={styles.subtitle}>Kelola dan verifikasi dokumen identitas customer</p>
      </div>

      {successMsg && <div className={styles['alert-success']}>{successMsg}</div>}
      {errorMsg && <div className={styles['alert-danger']}>{errorMsg}</div>}

      {/* Summary Cards */}
      <div className={styles['summary-grid']}>
        <div className={`${styles['summary-card']} ${styles['card-pending']}`}>
          <div className={styles['card-icon']}>⏳</div>
          <div className={styles['card-content']}>
            <div className={styles['card-title']}>Menunggu Review</div>
            <div className={styles['card-value']}>{summaryData.pending}</div>
          </div>
        </div>

        <div className={`${styles['summary-card']} ${styles['card-approved']}`}>
          <div className={styles['card-icon']}>✅</div>
          <div className={styles['card-content']}>
            <div className={styles['card-title']}>Disetujui</div>
            <div className={styles['card-value']}>{summaryData.approved}</div>
          </div>
        </div>

        <div className={`${styles['summary-card']} ${styles['card-rejected']}`}>
          <div className={styles['card-icon']}>❌</div>
          <div className={styles['card-content']}>
            <div className={styles['card-title']}>Ditolak</div>
            <div className={styles['card-value']}>{summaryData.rejected}</div>
          </div>
        </div>

        <div className={`${styles['summary-card']} ${styles['card-total']}`}>
          <div className={styles['card-icon']}>👥</div>
          <div className={styles['card-content']}>
            <div className={styles['card-title']}>Total Customer</div>
            <div className={styles['card-value']}>
              {summaryData.pending + summaryData.approved + summaryData.rejected + summaryData.notSubmitted}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles['filter-tabs']}>
        {['all', 'pending', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            className={`${styles['filter-btn']} ${statusFilter === status ? styles['active'] : ''}`}
            onClick={() => handleStatusFilterChange(status)}
          >
            {status === 'all' ? 'Semua' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Verifications Table */}
      <div className={styles['table-container']}>
        {loading ? (
          <div className={styles['loading']}>Mengambil data...</div>
        ) : verifications.length === 0 ? (
          <div className={styles['empty-state']}>
            <p>Tidak ada data verifikasi KTP</p>
          </div>
        ) : (
          <table className={styles['verification-table']}>
            <thead>
              <tr>
                <th>Nama Customer</th>
                <th>Email</th>
                <th>No. Telepon</th>
                <th>Status</th>
                <th>Tanggal Pengajuan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {verifications.map(verification => (
                <tr key={verification.id} className={styles['table-row']}>
                  <td className={styles['cell-name']}>
                    <strong>{verification.name}</strong>
                  </td>
                  <td className={styles['cell-email']}>{verification.email}</td>
                  <td className={styles['cell-phone']}>{verification.phone || '-'}</td>
                  <td className={styles['cell-status']}>
                    <span className={`${styles['badge']} ${styles[getStatusBadgeColor(verification.ktp_status)]}`}>
                      {getStatusLabel(verification.ktp_status)}
                    </span>
                  </td>
                  <td className={styles['cell-date']}>
                    {verification.ktp_submitted_at
                      ? new Date(verification.ktp_submitted_at).toLocaleDateString('id-ID')
                      : '-'}
                  </td>
                  <td className={styles['cell-actions']}>
                    {verification.ktp_status === 'pending' ? (
                      <div className={styles['action-buttons']}>
                        <button
                          className={`${styles['btn-approve']} ${actionLoading === verification.id ? styles['disabled'] : ''}`}
                          onClick={() => handleApprove(verification.id)}
                          disabled={actionLoading === verification.id}
                        >
                          {actionLoading === verification.id ? '...' : '✓ Terima'}
                        </button>
                        <button
                          className={`${styles['btn-reject']} ${actionLoading === verification.id ? styles['disabled'] : ''}`}
                          onClick={() => handleReject(verification.id)}
                          disabled={actionLoading === verification.id}
                        >
                          {actionLoading === verification.id ? '...' : '✕ Tolak'}
                        </button>
                      </div>
                    ) : (
                      <span className={styles['badge-info']}>
                        {verification.ktp_status === 'approved' ? '✓ Sudah Diverifikasi' : '✕ Ditolak'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        ${styles}
      `}</style>
    </div>
  );
}
