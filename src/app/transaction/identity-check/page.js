'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';


import { readData, writeData } from '@/lib/storage';
function IdentityCheckContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get('dealId');

  const [user, setUser] = useState(null);
  const [deal, setDeal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    idType: 'ktp', // ktp, sim, passport
    idNumber: '',
    idPhoto: null,
    idPhotoPreview: null,
    selfiePhoto: null,
    selfiePhotoPreview: null,
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setFormData(prev => ({
      ...prev,
      fullName: parsedUser.name || '',
      email: parsedUser.email || '',
      phoneNumber: parsedUser.phone || ''
    }));

    // Fetch deal data
    const fetchDealData = async () => {
      try {
        const response = await fetch('/api/deals/all');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const deals = await response.json();
        const currentDeal = deals.find(d => d.id === dealId);
        setDeal(currentDeal);
      } catch (error) {
        console.error('Error fetching deal:', error);
        setDeal(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (dealId) {
      fetchDealData();
    }
  }, [router, dealId]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Nama lengkap harus diisi';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Nomor telepon harus diisi';
    if (!formData.email.trim()) newErrors.email = 'Email harus diisi';
    if (!formData.idNumber.trim()) newErrors.idNumber = 'Nomor identitas harus diisi';
    if (!formData.idPhoto) newErrors.idPhoto = 'Foto identitas harus diunggah';
    if (!formData.selfiePhoto) newErrors.selfiePhoto = 'Foto selfie harus diunggah untuk verifikasi wajah';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email tidak valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          idPhoto: 'Ukuran file maksimal 5MB'
        }));
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          idPhoto: 'File harus berupa gambar'
        }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          idPhoto: file,
          idPhotoPreview: reader.result
        }));
        if (errors.idPhoto) {
          setErrors(prev => ({
            ...prev,
            idPhoto: ''
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          selfiePhoto: 'Ukuran file maksimal 5MB'
        }));
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          selfiePhoto: 'File harus berupa gambar'
        }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          selfiePhoto: file,
          selfiePhotoPreview: reader.result
        }));
        if (errors.selfiePhoto) {
          setErrors(prev => ({
            ...prev,
            selfiePhoto: ''
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Save verification data to localStorage for payment page
      localStorage.setItem('verificationData', JSON.stringify(formData));
      
      // Redirect to payment page
      router.push(`/transaction/payment?dealId=${dealId}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
        Memuat data...
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
        Data transaksi tidak ditemukan
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-content">
        <div className="payment-header">
          <h1>Verifikasi Data Diri</h1>
          <p>Silakan lengkapi data berikut sebelum melanjutkan ke pembayaran</p>
        </div>

        <form onSubmit={handleSubmit} className="verification-form">
          <div className="form-section">
            <h3>📋 Data Pribadi</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName">Nama Lengkap</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama lengkap"
                  className={errors.fullName ? 'input-error' : ''}
                />
                {errors.fullName && <span className="error-text">{errors.fullName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">Nomor Telepon</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="08xx xxxx xxxx"
                  className={errors.phoneNumber ? 'input-error' : ''}
                />
                {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="nama@email.com"
                className={errors.email ? 'input-error' : ''}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
          </div>

          <div className="form-section">
            <h3>🪪 Identitas</h3>
            
            <div className="form-group">
              <label htmlFor="idType">Jenis Identitas</label>
              <select
                id="idType"
                name="idType"
                value={formData.idType}
                onChange={handleInputChange}
              >
                <option value="ktp">KTP (Kartu Tanda Penduduk)</option>
                <option value="sim">SIM (Surat Izin Mengemudi)</option>
                <option value="passport">Paspor</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="idNumber">Nomor Identitas</label>
              <input
                type="text"
                id="idNumber"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleInputChange}
                placeholder="Nomor KTP/SIM/Paspor"
                className={errors.idNumber ? 'input-error' : ''}
              />
              {errors.idNumber && <span className="error-text">{errors.idNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="idPhoto">Foto {formData.idType === 'ktp' ? 'KTP' : formData.idType === 'sim' ? 'SIM' : 'Paspor'}</label>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="idPhoto"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="idPhoto" className="file-upload-label">
                  {formData.idPhotoPreview ? (
                    <>
                      <img src={formData.idPhotoPreview} alt="Preview" className="photo-preview" />
                      <span className="photo-change">Ubah Foto</span>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">📷</div>
                      <span>Klik untuk unggah foto</span>
                      <small>atau drag & drop</small>
                    </>
                  )}
                </label>
              </div>
              {errors.idPhoto && <span className="error-text">{errors.idPhoto}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="selfiePhoto">Foto Selfie (Wajah)</label>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
                📸 Ambil foto selfie untuk verifikasi wajah sesuai dengan foto KTP/identitas Anda
              </p>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="selfiePhoto"
                  accept="image/*"
                  onChange={handleSelfieUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="selfiePhoto" className="file-upload-label">
                  {formData.selfiePhotoPreview ? (
                    <>
                      <img src={formData.selfiePhotoPreview} alt="Selfie Preview" className="photo-preview" />
                      <span className="photo-change">Ubah Selfie</span>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">🤳</div>
                      <span>Klik untuk unggah selfie</span>
                      <small>atau drag & drop</small>
                    </>
                  )}
                </label>
              </div>
              {errors.selfiePhoto && <span className="error-text">{errors.selfiePhoto}</span>}
            </div>
          </div>

          <div className="form-section">
            <h3>📝 Catatan Tambahan</h3>
            
            <div className="form-group">
              <label htmlFor="notes">Catatan (Opsional)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Tulis catatan khusus untuk vendor (opsional)"
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              ← Kembali
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Memproses...' : 'Lanjut ke Pembayaran →'}
            </button>
          </div>
        </form>

        <div className="deal-summary">
          <h3>Ringkasan Transaksi</h3>
          <div className="summary-item">
            <span>Layanan:</span>
            <strong>{deal.serviceTitle}</strong>
          </div>
          <div className="summary-item">
            <span>Vendor:</span>
            <strong>{deal.vendorName}</strong>
          </div>
          {deal.totalPrice && (
            <div className="summary-item total">
              <span>Total Pembayaran:</span>
              <strong>Rp {deal.totalPrice.toLocaleString('id-ID')}</strong>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .payment-container {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .payment-content {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .payment-header {
          margin-bottom: 40px;
          text-align: center;
        }

        .payment-header h1 {
          margin: 0;
          font-size: 28px;
          color: #333;
          margin-bottom: 10px;
        }

        .payment-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .verification-form {
          margin-bottom: 40px;
        }

        .form-section {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }

        .form-section:last-of-type {
          border-bottom: none;
        }

        .form-section h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
          color: #333;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.3s;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #B28A67;
          box-shadow: 0 0 0 3px rgba(178, 138, 103, 0.1);
        }

        .form-group input.input-error,
        .form-group textarea.input-error {
          border-color: #dc3545;
        }

        .error-text {
          display: block;
          color: #dc3545;
          font-size: 12px;
          margin-top: 5px;
        }

        .file-upload-wrapper {
          margin-top: 8px;
        }

        .file-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 20px;
          border: 2px dashed #ddd;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
          background: #f9f9f9;
          min-height: 150px;
        }

        .file-upload-label:hover {
          border-color: #B28A67;
          background: #f5f0ff;
        }

        .file-upload-label.has-image {
          border: none;
          padding: 0;
          background: transparent;
        }

        .upload-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .file-upload-label span {
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .file-upload-label small {
          font-size: 12px;
          color: #999;
        }

        .photo-preview {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          object-fit: cover;
        }

        .photo-change {
          margin-top: 12px;
          padding: 8px 16px;
          background: #B28A67;
          color: white;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 30px;
        }

        .btn-secondary,
        .btn-primary {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-primary {
          background: #B28A67;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #8F6B4A;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(178, 138, 103, 0.3);
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .deal-summary {
          background: #f9f9f9;
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }

        .deal-summary h3 {
          margin: 0 0 15px 0;
          font-size: 14px;
          color: #333;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 14px;
          color: #666;
        }

        .summary-item strong {
          color: #333;
        }

        .summary-item.total {
          padding-top: 12px;
          border-top: 1px solid #ddd;
          color: #B28A67;
        }

        .summary-item.total strong {
          color: #B28A67;
          font-size: 16px;
        }

        @media (max-width: 600px) {
          .payment-content {
            padding: 20px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .payment-header h1 {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}

export default function IdentityCheckPage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
      <IdentityCheckContent />
    </Suspense>
  );
}
