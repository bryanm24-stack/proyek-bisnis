'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VendorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    price: '',
    images: []
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Ambil user dari localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'vendor') {
      alert('Anda tidak memiliki akses sebagai vendor. Silakan registrasi terlebih dahulu.');
      router.push('/vendor/register');
      return;
    }

    setUser(parsedUser);
    setIsLoading(false);
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (files) {
      // Untuk demo, kita store URL Unsplash random atau file name
      const imageUrls = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        images: imageUrls
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.title || !formData.shortDescription || !formData.description || !formData.price) {
      setErrorMsg('Semua field wajib diisi!');
      return;
    }

    if (formData.shortDescription.length > 100) {
      setErrorMsg('Deskripsi singkat maksimal 100 karakter!');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/vendor/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: user.id,
          vendorName: user.name,
          title: formData.title,
          shortDescription: formData.shortDescription,
          description: formData.description,
          price: formData.price,
          images: formData.images.length > 0 ? formData.images : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg('✓ Jasa berhasil ditambahkan! Akan muncul di halaman utama.');
        setFormData({ title: '', shortDescription: '', description: '', price: '', images: [] });
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setErrorMsg(data.message || 'Gagal menambahkan jasa');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <div className="vendor-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <Link href="/" className="nav-logo">
            🛡️ RentGuard
          </Link>
        </div>
        <div className="nav-right">
          <Link href="/vendor/chats" className="nav-link">
            💬 Pesan
          </Link>
          <Link href="/" className="nav-link">
            Kembali
          </Link>
          {user && (
            <button 
              className="btn-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="vendor-content">
        <div className="vendor-header">
          <h1>Dashboard Vendor</h1>
          <p className="greeting">Halo, {user?.name}! 👋</p>
          <p className="subtitle">Kelola dan tambahkan jasa sewa baru kamu di sini</p>
        </div>

        <div className="vendor-form-wrapper">
          {errorMsg && <div className="alert alert-error">❌ {errorMsg}</div>}
          {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}

          <form onSubmit={handleSubmit} className="vendor-form">
            <div className="form-section">
              <h2>Informasi Jasa</h2>
              
              <div className="form-group">
                <label htmlFor="title">Judul Jasa</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Contoh: Penyewaan alat konstruksi berkualitas"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Harga (Rp/hari)</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="Contoh: 500000"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Deskripsi</h2>

              <div className="form-group">
                <label htmlFor="shortDescription">
                  Deskripsi Singkat
                  <span className="required-badge">{formData.shortDescription.length}/100</span>
                </label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  placeholder="Deskripsi yang akan ditampilkan di card layanan..."
                  rows="2"
                  maxLength="100"
                  required
                ></textarea>
                <small className="char-counter">
                  {formData.shortDescription.length >= 90 
                    ? `⚠️ ${100 - formData.shortDescription.length} karakter tersisa`
                    : `${100 - formData.shortDescription.length} karakter tersisa`
                  }
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="description">Deskripsi Lengkap</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Jelaskan detail jasa kamu, keunggulan, apa saja yang termasuk, durasi layanan, dll..."
                  rows="6"
                  required
                ></textarea>
                <small>Informasi lengkap yang akan dilihat customer di halaman detail</small>
              </div>
            </div>

            <div className="form-section">
              <h2>Media</h2>

              <div className="form-group">
                <label htmlFor="images">Foto Jasa</label>
                <div className="file-upload">
                  <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <span className="file-info">📷 Pilih 1 atau lebih foto (JPG, PNG, GIF)</span>
                </div>
                {formData.images.length > 0 && (
                  <div className="image-preview">
                    ✅ {formData.images.length} foto dipilih
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? '⏳ Sedang memproses...' : '➕ Tambahkan Jasa'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        /* Page Layout */
        .vendor-page {
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
        .vendor-content {
          max-width: 700px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .vendor-header {
          margin-bottom: 40px;
          text-align: center;
        }

        .vendor-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 12px 0;
        }

        .greeting {
          font-size: 18px;
          color: #666;
          margin: 0;
          font-weight: 500;
        }

        .subtitle {
          font-size: 14px;
          color: #999;
          margin: 8px 0 0 0;
        }

        /* Form Wrapper */
        .vendor-form-wrapper {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        /* Form Sections */
        .form-section {
          margin-bottom: 40px;
        }

        .form-section:last-of-type {
          margin-bottom: 0;
        }

        .form-section h2 {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #f3f4f6;
        }

        /* Form Groups */
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 600;
          margin-bottom: 8px;
          color: #1a1a1a;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .required-badge {
          background: #f3f4f6;
          color: #666;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group textarea {
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          color: #1a1a1a;
          transition: all 0.3s ease;
        }

        .form-group input[type="text"]:focus,
        .form-group input[type="number"]:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 120px;
        }

        .char-counter {
          color: #999;
          margin-top: 6px;
          font-size: 12px;
        }

        .form-group > small {
          color: #999;
          margin-top: 6px;
          font-size: 12px;
        }

        /* File Upload */
        .file-upload {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 24px;
          background: #f9fafb;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .file-upload:hover {
          border-color: #7c3aed;
          background: #f0f4ff;
        }

        .file-upload input[type="file"] {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }

        .file-info {
          color: #666;
          font-size: 14px;
          font-weight: 500;
          pointer-events: none;
        }

        .image-preview {
          background: #dcfce7;
          color: #166534;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          margin-top: 12px;
          border: 1px solid #bbf7d0;
        }

        /* Alerts */
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

        /* Form Actions */
        .form-actions {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid #f3f4f6;
        }

        .btn-submit {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(124, 58, 237, 0.3);
        }

        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

          .vendor-content {
            margin: 24px auto;
          }

          .vendor-form-wrapper {
            padding: 24px;
          }

          .vendor-header h1 {
            font-size: 24px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-section {
            margin-bottom: 24px;
          }
        }
      `}</style>
    </div>
  );
}
