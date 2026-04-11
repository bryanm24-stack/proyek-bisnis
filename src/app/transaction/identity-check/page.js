'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function IdentityCheckPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get('dealId');

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    ktpPhoto: null,
    ktpPhotoPreview: null,
    profilePhoto: null,
    profilePhotoPreview: null,
    noTelp: '',
    email: '',
    instagram: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'customer' && parsedUser.role !== 'member') {
      alert('Hanya customer yang bisa mengakses halaman ini');
      router.push('/');
      return;
    }

    setUser(parsedUser);
    setFormData(prev => ({
      ...prev,
      email: parsedUser.email || '',
      noTelp: parsedUser.phone || ''
    }));
    setIsLoading(false);
  }, [router]);

  const handlePhotoUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'ktp') {
          setFormData(prev => ({
            ...prev,
            ktpPhoto: file,
            ktpPhotoPreview: reader.result
          }));
        } else if (type === 'profile') {
          setFormData(prev => ({
            ...prev,
            profilePhoto: file,
            profilePhotoPreview: reader.result
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.ktpPhotoPreview) {
      newErrors.ktpPhoto = 'Foto KTP wajib diunggah';
    }
    if (!formData.profilePhotoPreview) {
      newErrors.profilePhoto = 'Foto profil wajib diunggah';
    }
    if (!formData.noTelp || !/^(\+62|0)[0-9]{9,12}$/.test(formData.noTelp.replace(/\D/g, ''))) {
      newErrors.noTelp = 'Nomor telepon tidak valid';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email tidak valid';
    }
    if (!formData.instagram) {
      newErrors.instagram = 'Instagram wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simpan data identitas ke localStorage untuk saat ini
      const identityData = {
        userId: user.id,
        ktpPhoto: formData.ktpPhotoPreview,
        profilePhoto: formData.profilePhotoPreview,
        noTelp: formData.noTelp,
        email: formData.email,
        instagram: formData.instagram,
        verifiedAt: new Date().toISOString()
      };

      localStorage.setItem(`identity_${user.id}`, JSON.stringify(identityData));

      // Redirect ke halaman pembayaran
      router.push(`/transaction/payment?dealId=${dealId}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan saat menyimpan data identitas');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f3ff 0%, #f0f4ff 100%)' }}>
      {/* Navbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛍️ RentGuard
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#1f2937' }}>Verifikasi Identitas</h1>
          <p style={{ color: '#6b7280', marginBottom: '32px' }}>Kami memerlukan informasi pribadi Anda untuk melanjutkan transaksi</p>

          <form onSubmit={handleSubmit}>
            {/* Foto KTP */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                📋 Foto KTP
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'ktp')}
                  style={{ display: 'none' }}
                  id="ktpInput"
                />
                <label
                  htmlFor="ktpInput"
                  style={{
                    display: 'block',
                    padding: '24px',
                    border: '2px dashed #ddd',
                    borderRadius: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: errors.ktpPhoto ? '#fee2e2' : '#f9fafb'
                  }}
                >
                  {formData.ktpPhotoPreview ? (
                    <img
                      src={formData.ktpPhotoPreview}
                      alt="KTP Preview"
                      style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px' }}
                    />
                  ) : (
                    <div>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>Klik untuk upload foto KTP</p>
                    </div>
                  )}
                </label>
              </div>
              {errors.ktpPhoto && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px' }}>{errors.ktpPhoto}</p>}
            </div>

            {/* Foto Profil */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                👤 Foto Profil
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'profile')}
                  style={{ display: 'none' }}
                  id="profileInput"
                />
                <label
                  htmlFor="profileInput"
                  style={{
                    display: 'block',
                    padding: '24px',
                    border: '2px dashed #ddd',
                    borderRadius: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: errors.profilePhoto ? '#fee2e2' : '#f9fafb'
                  }}
                >
                  {formData.profilePhotoPreview ? (
                    <img
                      src={formData.profilePhotoPreview}
                      alt="Profile Preview"
                      style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📱</div>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>Klik untuk upload foto profil</p>
                    </div>
                  )}
                </label>
              </div>
              {errors.profilePhoto && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px' }}>{errors.profilePhoto}</p>}
            </div>

            {/* Nomor Telepon */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="noTelp" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                📱 Nomor Telepon
              </label>
              <input
                type="tel"
                id="noTelp"
                value={formData.noTelp}
                onChange={(e) => setFormData(prev => ({ ...prev, noTelp: e.target.value }))}
                placeholder="Contoh: 08123456789"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: errors.noTelp ? '2px solid #dc2626' : '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
              {errors.noTelp && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px' }}>{errors.noTelp}</p>}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                ✉️ Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Contoh: user@email.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: errors.email ? '2px solid #dc2626' : '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
              {errors.email && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px' }}>{errors.email}</p>}
            </div>

            {/* Instagram */}
            <div style={{ marginBottom: '32px' }}>
              <label htmlFor="instagram" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                📸 Username Instagram
              </label>
              <input
                type="text"
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="Contoh: @myinstagram"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: errors.instagram ? '2px solid #dc2626' : '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
              {errors.instagram && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px' }}>{errors.instagram}</p>}
            </div>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  padding: '12px 16px',
                  background: '#f3f4f6',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ← Kembali
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '12px 16px',
                  background: isSubmitting ? '#ccc' : '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {isSubmitting ? '⏳ Memproses...' : '✓ Lanjut ke Pembayaran'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
