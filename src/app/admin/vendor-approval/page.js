'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavbar from '@/app/components/SharedNavbar';

const STATUS_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu Review' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' }
];

export default function VendorApprovalPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [identityFileData, setIdentityFileData] = useState(null);
  const [identityFileName, setIdentityFileName] = useState('');
  const [fileModalLabel, setFileModalLabel] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    let parsedUser = null;
    try {
      parsedUser = JSON.parse(userData);
    } catch (error) {
      router.push('/login');
      return;
    }

    if (!parsedUser || parsedUser.role !== 'admin') {
      router.push('/login');
      return;
    }

    setUser(parsedUser);
    fetchRegistrations();
  }, [router]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/vendor-approval');
      const data = await response.json();
      if (data?.success) {
        setRegistrations(Array.isArray(data.data) ? data.data : []);
      } else {
        setErrorMsg(data?.message || 'Gagal memuat data registrasi');
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setErrorMsg('Gagal memuat data registrasi');
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationStatus = (registrationId, status, extras = {}) => {
    setRegistrations((prev) =>
      prev.map((reg) =>
        reg?.id === registrationId
          ? {
              ...reg,
              status,
              approvedAt: extras.approvedAt || reg.approvedAt,
              rejectionReason: extras.rejectionReason || reg.rejectionReason
            }
          : reg
      )
    );
  };

  const handleApprove = async (registrationId) => {
    if (!window.confirm('Setujui registrasi vendor ini?')) return;

    setActionLoading(registrationId);
    try {
      const response = await fetch('/api/admin/vendor-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, action: 'approve' })
      });

      const data = await response.json();
      if (data?.success) {
        updateRegistrationStatus(registrationId, 'approved', {
          approvedAt: new Date().toISOString()
        });
        setSuccessMsg('✓ Vendor berhasil disetujui!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data?.message || 'Gagal menyetujui vendor');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (registrationId) => {
    if (!rejectReason.trim()) {
      alert('Alasan penolakan harus diisi!');
      return;
    }

    if (!window.confirm('Tolak registrasi vendor ini?')) return;

    setActionLoading(registrationId);
    try {
      const response = await fetch('/api/admin/vendor-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          action: 'reject',
          rejectionReason: rejectReason
        })
      });

      const data = await response.json();
      if (data?.success) {
        updateRegistrationStatus(registrationId, 'rejected', {
          approvedAt: new Date().toISOString(),
          rejectionReason: rejectReason
        });
        setRejectReason('');
        setSelectedRegistration(null);
        setSuccessMsg('✓ Registrasi berhasil ditolak!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data?.message || 'Gagal menolak registrasi');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewFile = (fileData, fileName, label) => {
    setIdentityFileData(fileData || null);
    setIdentityFileName(fileName || label || 'File Identitas');
    setFileModalLabel(label || 'File Identitas');
    setIdentityModalOpen(true);
  };

  const handleDownloadIdentity = (identityFile, fileName) => {
    if (!identityFile) {
      alert('File tidak tersedia');
      return;
    }

    try {
      let base64Data = identityFile;
      if (identityFile.startsWith('data:')) {
        const parts = identityFile.split(';base64,');
        base64Data = parts[1] || base64Data;
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i += 1) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'identity-file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Gagal mengunduh file');
    }
  };

  const displayStatusLabel = (status) => {
    if (status === 'pending') return 'Menunggu Review';
    if (status === 'approved') return 'Disetujui';
    if (status === 'rejected') return 'Ditolak';
    return '-';
  };

  const filteredRegistrations = registrations.filter((reg) =>
    statusFilter === 'all' ? true : reg?.status === statusFilter
  );

  const summaryData = {
    pending: registrations.filter((reg) => reg?.status === 'pending').length,
    approved: registrations.filter((reg) => reg?.status === 'approved').length,
    rejected: registrations.filter((reg) => reg?.status === 'rejected').length,
    total: registrations.length
  };

  return (
    <div className="admin-page">
      <SharedNavbar />
      <div className="admin-content">
        <div className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="subtitle">Verifikasi dan kelola registrasi vendor baru</p>
          </div>
        </div>

        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        <div className="summary-grid">
          <div className="summary-card card-pending">
            <div className="card-title">Menunggu Review</div>
            <div className="card-value">{summaryData.pending}</div>
          </div>
          <div className="summary-card card-approved">
            <div className="card-title">Disetujui</div>
            <div className="card-value">{summaryData.approved}</div>
          </div>
          <div className="summary-card card-rejected">
            <div className="card-title">Ditolak</div>
            <div className="card-value">{summaryData.rejected}</div>
          </div>
          <div className="summary-card card-total">
            <div className="card-title">Total Vendor</div>
            <div className="card-value">{summaryData.total}</div>
          </div>
        </div>

        <div className="filter-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`filter-btn ${statusFilter === tab.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="loading">Mengambil data registrasi...</div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="empty-state">Tidak ada registrasi vendor untuk status ini.</div>
          ) : (
            <table className="verification-table">
              <thead>
                <tr>
                  <th>Vendor / Toko</th>
                  <th>Nama Pengguna</th>
                  <th>Email</th>
                  <th>No. Telepon</th>
                  <th>Status</th>
                  <th>Tanggal Registrasi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((reg) => {
                  const registrationId = reg?.id;
                  return (
                    <React.Fragment key={registrationId || reg?.vendorName || Math.random()}>
                      <tr>
                        <td><strong>{reg?.vendorName || '-'}</strong></td>
                        <td>{reg?.userName || '-'}</td>
                        <td>{reg?.userEmail || '-'}</td>
                        <td>{reg?.phoneNumber || '-'}</td>
                        <td>
                          <span className={`status-badge ${reg?.status || 'pending'}`}>
                            {displayStatusLabel(reg?.status)}
                          </span>
                        </td>
                        <td>{reg?.createdAt ? new Date(reg.createdAt).toLocaleDateString('id-ID') : '-'}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn-action view"
                                type="button"
                                onClick={() => handleViewFile(reg?.identityFile, reg?.identityFileName, 'File Identitas')}
                              >
                                Lihat KTP/SIM/Passport
                              </button>
                              <button
                                className="btn-action view"
                                type="button"
                                onClick={() => handleViewFile(reg?.selfieFile, reg?.selfieFileName, 'Foto Selfie')}
                              >
                                Lihat Selfie
                              </button>
                              {reg?.status === 'pending' ? (
                                <>
                                  <button
                                    className="btn-action approve"
                                    type="button"
                                    onClick={() => handleApprove(registrationId)}
                                    disabled={actionLoading === registrationId}
                                  >
                                    {actionLoading === registrationId ? '...' : '✓ Setujui'}
                                  </button>
                                  <button
                                    className="btn-action reject-btn"
                                    type="button"
                                    onClick={() => {
                                      setSelectedRegistration(registrationId);
                                      setRejectReason('');
                                    }}
                                  >
                                    ✕ Tolak
                                  </button>
                                </>
                              ) : (
                                <span className="badge-info">
                                  {reg?.status === 'approved' ? '✓ Sudah Disetujui' : '✕ Ditolak'}
                                </span>
                              )}
                            </div>
                          </td>
                      </tr>

                      {selectedRegistration === registrationId && reg?.status === 'pending' && (
                        <tr>
                          <td colSpan="7">
                            <div className="reject-form">
                              <label htmlFor="rejectReason">Alasan Penolakan</label>
                              <textarea
                                id="rejectReason"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Jelaskan alasan penolakan..."
                                rows={4}
                              />
                              <div className="form-buttons">
                                <button
                                  className="btn-action reject"
                                  type="button"
                                  onClick={() => handleReject(registrationId)}
                                  disabled={actionLoading === registrationId}
                                >
                                  {actionLoading === registrationId ? '...' : 'Kirim Penolakan'}
                                </button>
                                <button
                                  className="btn-action cancel"
                                  type="button"
                                  onClick={() => {
                                    setSelectedRegistration(null);
                                    setRejectReason('');
                                  }}
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {identityModalOpen && (
        <div className="modal-overlay" onClick={() => setIdentityModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{fileModalLabel}: {identityFileName}</h2>
              <button
                className="modal-close"
                type="button"
                onClick={() => setIdentityModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {identityFileData ? (
                <img
                  src={identityFileData}
                  alt={identityFileName}
                  className="modal-image"
                />
              ) : (
                <p className="empty-state">File tidak dapat ditampilkan</p>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-action approve"
                onClick={() => handleDownloadIdentity(identityFileData, identityFileName)}
              >
                ⬇️ Download
              </button>
              <button
                type="button"
                className="btn-action cancel"
                onClick={() => setIdentityModalOpen(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f3ff 0%, #f0f4ff 100%);
        }

        .admin-content {
          max-width: 1120px;
          margin: 32px auto;
          padding: 0 20px 60px;
        }

        .admin-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 24px;
        }

        .admin-header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          color: #111827;
        }

        .subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 15px;
        }

        .alert {
          border-radius: 16px;
          padding: 16px 18px;
          margin-bottom: 24px;
          font-weight: 600;
          font-size: 14px;
        }

        .alert-success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (min-width: 640px) {
          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 1024px) {
          .summary-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        .summary-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
          border: 1px solid #e5e7eb;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
        }

        .card-title {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 10px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .card-value {
          font-size: 32px;
          color: #111827;
          font-weight: 800;
        }

        .card-pending {
          border-color: #fde68a;
        }

        .card-approved {
          border-color: #a7f3d0;
        }

        .card-rejected {
          border-color: #fecaca;
        }

        .card-total {
          border-color: #c7d2fe;
        }

        .filter-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }

        .filter-btn {
          padding: 12px 18px;
          border-radius: 9999px;
          border: 1px solid transparent;
          background: white;
          color: #374151;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .filter-btn.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .table-wrapper {
          background: white;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }

        .verification-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .verification-table th,
        .verification-table td {
          padding: 16px 18px;
          text-align: left;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 14px;
        }

        .verification-table thead th {
          background: #f9fafb;
          font-weight: 700;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          color: #6b7280;
          font-size: 12px;
        }

        .verification-table tbody tr:hover {
          background: #fbfbff;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.approved {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.rejected {
          background: #fee2e2;
          color: #991b1b;
        }

        .action-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          min-width: 280px;
        }

        .btn-action {
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .btn-action:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .btn-action.view {
          background: #3b82f6;
          color: white;
          grid-column: 1 / -1;
        }

        .btn-action.approve {
          background: #10b981;
          color: white;
          grid-column: 1 / 2;
        }

        .btn-action.reject-btn,
        .btn-action.reject {
          background: #ef4444;
          color: white;
          grid-column: 2 / 3;
        }

        .btn-action.cancel {
          background: #f3f4f6;
          color: #111827;
          border: 1px solid #d1d5db;
        }

        .btn-action:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .badge-info {
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 9999px;
          background: #eef2ff;
          color: #3730a3;
          font-weight: 700;
          font-size: 12px;
        }

        .reject-form {
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 16px;
          padding: 20px;
          display: grid;
          gap: 16px;
          margin: 0 18px 16px;
        }

        .reject-form label {
          color: #1f2937;
          font-weight: 700;
          font-size: 14px;
        }

        .reject-form textarea {
          width: 100%;
          min-height: 120px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid #fcd34d;
          background: white;
          font-size: 14px;
          color: #111827;
          resize: vertical;
        }

        .reject-form textarea:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.18);
          border-color: #fbbf24;
        }

        .form-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .loading,
        .empty-state {
          padding: 32px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .modal-content {
          width: min(100%, 760px);
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.22);
          display: flex;
          flex-direction: column;
        }

        .modal-header,
        .modal-footer {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-header {
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          color: #111827;
        }

        .modal-close {
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
        }

        .modal-body {
          padding: 24px;
          text-align: center;
        }

        .modal-image {
          max-width: 100%;
          max-height: 70vh;
          border-radius: 18px;
          object-fit: contain;
        }

        @media (max-width: 768px) {
          .admin-content {
            margin: 20px auto;
            padding-bottom: 40px;
          }

          .verification-table {
            min-width: 720px;
          }

          .filter-tabs {
            justify-content: flex-start;
          }

          .action-buttons {
            flex-direction: column;
          }

          .btn-action {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
