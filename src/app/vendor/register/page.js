'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SharedNavbar from '../../components/SharedNavbar';

export default function VendorRegisterPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  
  const [formData, setFormData] = useState({
    vendorName: '',
    phoneNumber: '',
    identityFile: null
  });
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Cek apakah user sudah vendor
    if (parsedUser.role === 'vendor') {
      router.push('/vendor');
      return;
    }

    // Cek status registrasi
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch(`/api/vendor/register?userId=${parsedUser.id}`);
        const data = await response.json();
        if (data.success && data.data) {
          setRegistrationStatus(data.data);
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRegistrationStatus();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Ukuran file tidak boleh lebih dari 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setErrorMsg('Format file hanya PDF, JPG, atau PNG');
        return;
      }

      // Read file as Base64
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          identityFile: event.target?.result
        }));
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.vendorName || !formData.phoneNumber || !formData.identityFile) {
      setErrorMsg('Semua field wajib diisi!');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/vendor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          vendorName: formData.vendorName,
          phoneNumber: formData.phoneNumber,
          identityFile: formData.identityFile
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg('✓ Registrasi vendor berhasil dikirim! Silakan tunggu persetujuan admin.');
        setRegistrationStatus(data.data);
        setFormData({ vendorName: '', phoneNumber: '', identityFile: null });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setErrorMsg(data.message || 'Gagal mendaftarkan vendor');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <div className="vendor-register-container">
      <SharedNavbar />

      {/* Main Content */}
      <div className="vendor-register-main">
        <div className="register-form-container">
          <h1>Registrasi Sebagai Vendor</h1>
          <p style={{ marginBottom: '10px', color: '#666' }}>Isi data diri Anda untuk mendaftar sebagai vendor di 🛡️ RentGuard</p>
          <p style={{ marginBottom: '30px', color: '#999', fontSize: '14px' }}>Permohonan Anda akan diverifikasi oleh admin</p>

          {registrationStatus && (
            <>
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
                backgroundColor: registrationStatus.status === 'pending' ? '#fef3c7' : (registrationStatus.status === 'approved' ? '#dcfce7' : '#fee2e2'),
                borderLeft: `4px solid ${registrationStatus.status === 'pending' ? '#f59e0b' : (registrationStatus.status === 'approved' ? '#22c55e' : '#ef4444')}`
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: registrationStatus.status === 'pending' ? '#92400e' : (registrationStatus.status === 'approved' ? '#166534' : '#991b1b') }}>
                  Status: <strong>{registrationStatus.status === 'pending' ? 'Menunggu Persetujuan' : (registrationStatus.status === 'approved' ? 'Disetujui' : 'Ditolak')}</strong>
                </h4>
                {registrationStatus.status === 'rejected' && registrationStatus.rejectionReason && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#7f1d1d' }}>
                    <strong>Alasan Penolakan:</strong> {registrationStatus.rejectionReason}
                  </p>
                )}
                {registrationStatus.status === 'pending' && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#78350f' }}>
                    Terima kasih telah mendaftar. Kami akan segera mereview data Anda.
                  </p>
                )}
              </div>
            </>
          )}

          {!registrationStatus && (
            <>
              {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
              {successMsg && <div className="alert alert-success">{successMsg}</div>}

              <form onSubmit={handleSubmit} className="vendor-register-form">
                <div className="form-group">
                  <label htmlFor="vendorName">Nama Vendor / Toko</label>
                  <input
                    type="text"
                    id="vendorName"
                    name="vendorName"
                    value={formData.vendorName}
                    onChange={handleChange}
                    placeholder="Contoh: Toko Sewa Alat Berat Jaya"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phoneNumber">Nomor Telepon</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Contoh: 08123456789"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="identityFile">Upload File Identitas</label>
                  <input
                    type="file"
                    id="identityFile"
                    accept="application/pdf,image/jpeg,image/png,image/jpg"
                    onChange={handleFileChange}
                    required
                  />
                  <small>Format: PDF, JPG, PNG (Max 5MB) - Dapat berupa KTP, SIM, atau Paspor</small>
                  {formData.identityFile && (
                    <div style={{ marginTop: '10px', color: '#22c55e', fontWeight: '500' }}>
                      ✓ File sudah dipilih
                    </div>
                  )}
                </div>

                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Sedang memproses...' : '📤 Kirim Registrasi'}
                </button>
              </form>
            </>
          )}

          {registrationStatus?.status === 'rejected' && (
            <>
              {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
              {successMsg && <div className="alert alert-success">{successMsg}</div>}

              <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#991b1b' }}>📝 Silakan Perbaiki Data Anda</h4>
                <p style={{ margin: 0, color: '#7f1d1d', fontSize: '14px', lineHeight: '1.5' }}>
                  Registrasi Anda ditolak dengan alasan di atas. Silakan perbaiki data dan submit ulang untuk direview kembali oleh admin.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="vendor-register-form">
                <div className="form-group">
                  <label htmlFor="vendorName">Nama Vendor / Toko</label>
                  <input
                    type="text"
                    id="vendorName"
                    name="vendorName"
                    value={formData.vendorName}
                    onChange={handleChange}
                    placeholder="Contoh: Toko Sewa Alat Berat Jaya"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phoneNumber">Nomor Telepon</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Contoh: 08123456789"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="identityFile">Upload File Identitas (Perbaikan)</label>
                  <input
                    type="file"
                    id="identityFile"
                    accept="application/pdf,image/jpeg,image/png,image/jpg"
                    onChange={handleFileChange}
                    required
                  />
                  <small>Format: PDF, JPG, PNG (Max 5MB) - Dapat berupa KTP, SIM, atau Paspor</small>
                  {formData.identityFile && (
                    <div style={{ marginTop: '10px', color: '#22c55e', fontWeight: '500' }}>
                      ✓ File sudah dipilih
                    </div>
                  )}
                </div>

                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Sedang memproses...' : '🔄 Submit Ulang'}
                </button>
              </form>
            </>
          )}

          {registrationStatus?.status === 'approved' && (
            <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#166534', fontWeight: '500' }}>
                Selamat! Anda sudah terdaftar sebagai vendor.
              </p>
              <Link href="/vendor" style={{
                display: 'inline-block',
                marginTop: '12px',
                padding: '10px 20px',
                backgroundColor: '#22c55e',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: '600'
              }}>
                → Pergi ke Dashboard Vendor
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .vendor-register-container {
          min-height: 100vh;
          background-color: #f9fafb;
        }

        .vendor-register-main {
          max-width: 600px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .register-form-container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .register-form-container h1 {
          font-size: 28px;
          margin-bottom: 10px;
          color: #333;
        }

        .register-form-container p {
          margin: 5px 0;
          color: #666;
        }

        .vendor-register-form {
          margin-top: 30px;
        }

        .form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
        }

        .form-group input[type="text"],
        .form-group input[type="tel"],
        .form-group input[type="file"] {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
        }

        .form-group input[type="file"] {
          padding: 8px;
          cursor: pointer;
        }

        .form-group small {
          color: #999;
          margin-top: 5px;
          font-size: 12px;
        }

        .btn-primary {
          padding: 12px 24px;
          background-color: #5A45D1;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.3s;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #3B2B85;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
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
      `}</style>
    </div>
  );
}
