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
    <div className="vendor-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>RentGuard</Link>
        </div>
        <div className="nav-actions">
          <Link href="/vendor/chats" className="btn-link" style={{ marginRight: '15px' }}>
            💬 Pesan Customer
          </Link>
          <Link href="/" className="btn-link">Kembali ke Home</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="vendor-main">
        <div className="vendor-form-container">
          <h1>Dashboard Vendor</h1>
          <p>Halo, {user?.name}! 👋</p>
          <p style={{ marginBottom: '30px', color: '#666' }}>Tambahkan jasa sewa baru kamu di sini</p>

          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          <form onSubmit={handleSubmit} className="vendor-form">
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

            <div className="form-group">
              <label htmlFor="shortDescription">Deskripsi Singkat (untuk ditampilkan di card)</label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder="Deskripsi singkat yang akan ditampilkan di halaman utama (max 100 karakter)"
                rows="2"
                maxLength="100"
                required
              ></textarea>
              <small style={{ color: formData.shortDescription.length >= 90 ? '#ef4444' : '#666' }}>
                {formData.shortDescription.length}/100 karakter
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="description">Deskripsi Lengkap (untuk halaman detail)</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Jelaskan detail jasa kamu, keunggulan, apa saja yang termasuk, dan informasi lainnya..."
                rows="6"
                required
              ></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="price">Estimasi Harga (Rp)</label>
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

            <div className="form-group">
              <label htmlFor="images">Foto Jasa</label>
              <input
                type="file"
                id="images"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
              />
              <small>Bisa upload 1 atau lebih foto. Format: JPG, PNG, GIF</small>
              {formData.images.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <p>✓ {formData.images.length} foto dipilih</p>
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Sedang memproses...' : '+ Tambahkan Jasa'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .vendor-container {
          min-height: 100vh;
          background-color: #f9fafb;
        }

        .vendor-main {
          max-width: 600px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .vendor-form-container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .vendor-form-container h1 {
          font-size: 28px;
          margin-bottom: 10px;
          color: #333;
        }

        .vendor-form-container p {
          margin: 5px 0;
          color: #666;
        }

        .vendor-form {
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
        .form-group input[type="number"],
        .form-group textarea,
        .form-group input[type="file"] {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 120px;
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
