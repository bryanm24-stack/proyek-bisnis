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

  const pendingRegistrations = registrations.filter(r => r.status === 'pending');
  const approvedRegistrations = registrations.filter(r => r.status === 'approved');
  const rejectedRegistrations = registrations.filter(r => r.status === 'rejected');

  return (
    <div className="admin-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>RentGuard Admin</Link>
        </div>
        <div className="nav-actions">
          <Link href="/" className="btn-link">Home</Link>
          <span style={{ margin: '0 12px', color: '#999' }}>|</span>
          <span style={{ fontWeight: '600', color: '#333' }}>{user?.name}</span>
        </div>
      </nav>

      {/* Main Content */}
      <div className="admin-main">
        <div className="admin-header">
          <h1>🛡️ Admin Dashboard - Verifikasi Vendor</h1>
          <p>Kelola dan setujui registrasi vendor baru</p>
        </div>

        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        {/* Pending Registrations */}
        <div className="registration-section">
          <h2>
            ⏳ Menunggu Verifikasi ({pendingRegistrations.length})
          </h2>

          {pendingRegistrations.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>Tidak ada registrasi yang menunggu verifikasi</p>
          ) : (
            <div className="registrations-list">
              {pendingRegistrations.map((reg) => (
                <div key={reg.id} className="registration-card">
                  <div className="reg-header">
                    <div>
                      <h3>{reg.vendorName}</h3>
                      <p className="reg-detail">Nama Pengguna: {reg.userName}</p>
                      <p className="reg-detail">Email: {reg.userEmail}</p>
                      <p className="reg-detail">Nomor Telepon: {reg.phoneNumber}</p>
                      <p className="reg-detail">File Identitas: {reg.identityFileName}</p>
                      <p className="reg-detail">Tanggal Registrasi: {new Date(reg.createdAt).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>

                  <div className="reg-actions">
                    {selectedRegistration === reg.id ? (
                      <div className="reject-form">
                        <label>Alasan Penolakan:</label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Jelaskan alasan penolakan..."
                          rows="3"
                        ></textarea>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-danger"
                            onClick={() => handleReject(reg.id)}
                            disabled={actionLoading === reg.id}
                          >
                            Kirim Penolakan
                          </button>
                          <button
                            className="btn-secondary"
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
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-approve"
                          onClick={() => handleApprove(reg.id)}
                          disabled={actionLoading === reg.id}
                        >
                          ✓ Setujui
                        </button>
                        <button
                          className="btn-reject"
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
          <div className="registration-section">
            <h2>✅ Sudah Disetujui ({approvedRegistrations.length})</h2>
            <div className="registrations-list">
              {approvedRegistrations.map((reg) => (
                <div key={reg.id} className="registration-card approved">
                  <div className="reg-header">
                    <div>
                      <h3>{reg.vendorName}</h3>
                      <p className="reg-detail">Nama Pengguna: {reg.userName}</p>
                      <p className="reg-detail">Email: {reg.userEmail}</p>
                      <p className="reg-detail">Disetujui pada: {new Date(reg.approvedAt).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Registrations */}
        {rejectedRegistrations.length > 0 && (
          <div className="registration-section">
            <h2>❌ Ditolak ({rejectedRegistrations.length})</h2>
            <div className="registrations-list">
              {rejectedRegistrations.map((reg) => (
                <div key={reg.id} className="registration-card rejected">
                  <div className="reg-header">
                    <div>
                      <h3>{reg.vendorName}</h3>
                      <p className="reg-detail">Nama Pengguna: {reg.userName}</p>
                      <p className="reg-detail">Email: {reg.userEmail}</p>
                      <p className="reg-detail">Alasan Penolakan: <strong>{reg.rejectionReason}</strong></p>
                      <p className="reg-detail">Ditolak pada: {new Date(reg.approvedAt).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-container {
          min-height: 100vh;
          background-color: #f9fafb;
        }

        .admin-main {
          max-width: 1000px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .admin-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .admin-header h1 {
          font-size: 32px;
          color: #333;
          margin-bottom: 8px;
        }

        .admin-header p {
          color: #666;
          font-size: 16px;
        }

        .registration-section {
          margin-bottom: 40px;
        }

        .registration-section h2 {
          font-size: 20px;
          color: #333;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e5e7eb;
        }

        .registrations-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .registration-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          border-left: 4px solid #f59e0b;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .registration-card.approved {
          border-left-color: #22c55e;
          background-color: #f0fdf4;
        }

        .registration-card.rejected {
          border-left-color: #ef4444;
          background-color: #fef2f2;
        }

        .reg-header {
          margin-bottom: 16px;
        }

        .registration-card h3 {
          font-size: 18px;
          margin: 0 0 12px 0;
          color: #333;
        }

        .reg-detail {
          margin: 6px 0;
          color: #666;
          font-size: 14px;
        }

        .reg-actions {
          display: flex;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-approve,
        .btn-reject,
        .btn-danger,
        .btn-secondary {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
        }

        .btn-approve {
          background-color: #22c55e;
          color: white;
        }

        .btn-approve:hover:not(:disabled) {
          background-color: #16a34a;
        }

        .btn-reject {
          background-color: #ef4444;
          color: white;
        }

        .btn-reject:hover {
          background-color: #dc2626;
        }

        .btn-danger {
          background-color: #ef4444;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .btn-secondary {
          background-color: #e5e7eb;
          color: #333;
        }

        .btn-secondary:hover {
          background-color: #d1d5db;
        }

        .reject-form {
          width: 100%;
          padding: 12px;
          background-color: #fef3c7;
          border-radius: 6px;
        }

        .reject-form label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
        }

        .reject-form textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          resize: vertical;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .alert-error {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background-color: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .btn-link {
          color: #5A45D1;
          text-decoration: none;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
