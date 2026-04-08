'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VendorApprovalPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Cek apakah user adalah admin
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
    fetchRegistrations();
  }, [router]);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/admin/vendor-approval');
      const data = await response.json();
      if (data.success) {
        setRegistrations(data.data);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setErrorMsg('Gagal memuat data registrasi');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registrationId) => {
    if (!window.confirm('Setujui registrasi vendor ini?')) return;

    setActionLoading(registrationId);
    try {
      const response = await fetch('/api/admin/vendor-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          action: 'approve'
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMsg('✓ Vendor berhasil disetujui!');
        fetchRegistrations();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data.message || 'Gagal menyetujui vendor');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error.message);
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
      if (data.success) {
        setSuccessMsg('✓ Registrasi berhasil ditolak!');
        setRejectReason('');
        setSelectedRegistration(null);
        fetchRegistrations();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data.message || 'Gagal menolak registrasi');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const pendingRegistrations = registrations.filter(r => r.status === 'pending');
  const approvedRegistrations = registrations.filter(r => r.status === 'approved');
  const rejectedRegistrations = registrations.filter(r => r.status === 'rejected');

  return (
    <div className="admin-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <Link href="/" className="nav-logo">
            🛡️ RentGuard
          </Link>
        </div>
        <div className="nav-right">
          <span className="user-info">Admin: {user?.name}</span>
          <Link href="/" className="nav-link">Home</Link>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="admin-content">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p className="subtitle">Verifikasi dan kelola registrasi vendor baru</p>
        </div>

        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        {/* Pending Registrations */}
        <div className="registration-section pending">
          <div className="section-header">
            <h2>⏳ Menunggu Verifikasi</h2>
            <span className="section-badge pending-badge">{pendingRegistrations.length}</span>
          </div>

          {pendingRegistrations.length === 0 ? (
            <p className="empty-state">Tidak ada registrasi yang menunggu verifikasi</p>
          ) : (
            <div className="registrations-list">
              {pendingRegistrations.map((reg) => (
                <div key={reg.id} className="registration-card">
                  <div className="card-header">
                    <div>
                      <h3>{reg.vendorName}</h3>
                      <p className="vendor-email">{reg.userEmail}</p>
                    </div>
                    <span className="status-badge pending">Pending</span>
                  </div>

                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Nama Pengguna</span>
                      <span className="detail-value">{reg.userName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Nomor Telepon</span>
                      <span className="detail-value">{reg.phoneNumber}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">File Identitas</span>
                      <span className="detail-value">{reg.identityFileName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Tanggal Registrasi</span>
                      <span className="detail-value">{new Date(reg.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    {selectedRegistration === reg.id ? (
                      <div className="reject-form">
                        <label>Alasan Penolakan</label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Jelaskan alasan penolakan..."
                          rows="3"
                        ></textarea>
                        <div className="form-buttons">
                          <button
                            className="btn-action reject"
                            onClick={() => handleReject(reg.id)}
                            disabled={actionLoading === reg.id}
                          >
                            Kirim Penolakan
                          </button>
                          <button
                            className="btn-action cancel"
                            onClick={() => {
                              setSelectedRegistration(null);
                              setRejectReason('');
                            }}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="action-buttons">
                        <button
                          className="btn-action approve"
                          onClick={() => handleApprove(reg.id)}
                          disabled={actionLoading === reg.id}
                        >
                          ✓ Setujui
                        </button>
                        <button
                          className="btn-action reject-btn"
                          onClick={() => setSelectedRegistration(reg.id)}
                        >
                          ✕ Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approved Registrations */}
        {approvedRegistrations.length > 0 && (
          <div className="registration-section approved">
            <div className="section-header">
              <h2>✅ Sudah Disetujui</h2>
              <span className="section-badge approved-badge">{approvedRegistrations.length}</span>
            </div>
            <div className="registrations-list">
              {approvedRegistrations.map((reg) => (
                <div key={reg.id} className="registration-card">
                  <div className="card-header">
                    <div>
                      <h3>{reg.vendorName}</h3>
                      <p className="vendor-email">{reg.userEmail}</p>
                    </div>
                    <span className="status-badge success">Approved</span>
                  </div>
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Nama Pengguna</span>
                      <span className="detail-value">{reg.userName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Disetujui pada</span>
                      <span className="detail-value">{new Date(reg.approvedAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Registrations */}
        {rejectedRegistrations.length > 0 && (
          <div className="registration-section rejected">
            <div className="section-header">
              <h2>❌ Ditolak</h2>
              <span className="section-badge rejected-badge">{rejectedRegistrations.length}</span>
            </div>
            <div className="registrations-list">
              {rejectedRegistrations.map((reg) => (
                <div key={reg.id} className="registration-card">
                  <div className="card-header">
                    <div>
                      <h3>{reg.vendorName}</h3>
                      <p className="vendor-email">{reg.userEmail}</p>
                    </div>
                    <span className="status-badge danger">Rejected</span>
                  </div>
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Nama Pengguna</span>
                      <span className="detail-value">{reg.userName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Alasan Penolakan</span>
                      <span className="detail-value rejection-reason">{reg.rejectionReason}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Ditolak pada</span>
                      <span className="detail-value">{new Date(reg.approvedAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        /* Page Layout */
        .admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f3ff 0%, #f0f4ff 100%);
        }

        /* Navbar */
        .navbar {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-logo {
          font-size: 20px;
          font-weight: 700;
          color: #7c3aed;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }

        .nav-logo:hover {
          color: #a855f7;
          opacity: 0.9;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-info {
          font-size: 14px;
          color: #666;
          font-weight: 600;
          padding: 6px 12px;
          background: #f3f4f6;
          border-radius: 6px;
        }

        .nav-link {
          color: #666;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.3s;
          padding: 6px 12px;
          border-radius: 6px;
        }

        .nav-link:hover {
          color: #7c3aed;
          background: #f3f4f6;
        }

        .btn-logout {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-logout:hover {
          background: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .btn-logout:active {
          transform: translateY(0);
        }

        /* Content Area */
        .admin-content {
          max-width: 1000px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .admin-header {
          margin-bottom: 40px;
          text-align: center;
        }

        .admin-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 12px 0;
        }

        .subtitle {
          font-size: 14px;
          color: #999;
          margin: 0;
        }

        /* Alert Messages */
        .alert {
          padding: 14px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 500;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        /* Registration Sections */
        .registration-section {
          margin-bottom: 40px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .registration-section h2 {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
        }

        .section-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 700;
          color: white;
        }

        .pending-badge {
          background: #f59e0b;
        }

        .approved-badge {
          background: #10b981;
        }

        .rejected-badge {
          background: #ef4444;
        }

        /* Registration List */
        .registrations-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .registration-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
        }

        .registration-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          border-color: #7c3aed;
        }

        /* Card Header */
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .card-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px 0;
        }

        .vendor-email {
          font-size: 13px;
          color: #999;
          margin: 0;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.success {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.danger {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Card Details */
        .card-details {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .detail-label {
          font-size: 13px;
          color: #999;
          font-weight: 500;
          min-width: 120px;
        }

        .detail-value {
          font-size: 14px;
          color: #1a1a1a;
          font-weight: 500;
        }

        .rejection-reason {
          color: #ef4444;
          font-style: italic;
        }

        .empty-state {
          color: #999;
          text-align: center;
          padding: 40px 0;
          font-size: 14px;
        }

        /* Card Actions */
        .card-actions {
          display: flex;
          gap: 12px;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          width: 100%;
        }

        .btn-action {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-action.approve {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .btn-action.approve:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
        }

        .btn-action.reject-btn {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .btn-action.reject-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
        }

        .btn-action.cancel {
          background: #f3f4f6;
          color: #1a1a1a;
          border: 1px solid #e5e7eb;
        }

        .btn-action.cancel:hover {
          background: #e5e7eb;
        }

        .btn-action.reject {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .btn-action.reject:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
        }

        .btn-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Reject Form */
        .reject-form {
          width: 100%;
          padding: 16px;
          background: #fef3c7;
          border-radius: 8px;
          border: 1px solid #fcd34d;
        }

        .reject-form label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1a1a1a;
          font-size: 13px;
        }

        .reject-form textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          font-family: inherit;
          font-size: 13px;
          resize: vertical;
          min-height: 80px;
          color: #1a1a1a;
        }

        .reject-form textarea:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1);
        }

        .form-buttons {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .navbar {
            flex-direction: column;
            gap: 12px;
            padding: 12px 16px;
          }

          .nav-left,
          .nav-right {
            width: 100%;
            justify-content: space-between;
          }

          .admin-content {
            margin: 24px auto;
          }

          .admin-header h1 {
            font-size: 24px;
          }

          .card-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .status-badge {
            align-self: flex-start;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
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
