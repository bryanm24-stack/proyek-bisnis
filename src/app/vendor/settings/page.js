'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VendorSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings');
  }, [router]);

  return <div style={{ padding: '40px', textAlign: 'center' }}>Mengalihkan ke pengaturan...</div>;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setGlobalMessage('');
    if (!profileForm.vendorName.trim()) {
      setGlobalMessage('Nama vendor/toko wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: user.id,
          vendorName: profileForm.vendorName.trim(),
          vendorLogo: profileForm.vendorLogo.trim(),
          vendorAddress: profileForm.vendorAddress.trim(),
          vendorBio: profileForm.vendorBio.trim(),
          isOnline: profileForm.isOnline
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setGlobalMessage(result.message || 'Gagal menyimpan profil vendor.');
        return;
      }
      setGlobalMessage('Profil vendor berhasil diperbarui.');
      setProfileForm((prev) => ({
        ...prev,
        vendorName: result.data.vendorName || prev.vendorName,
        vendorLogo: result.data.vendorLogo || prev.vendorLogo,
        vendorAddress: result.data.vendorAddress || prev.vendorAddress,
        vendorBio: result.data.vendorBio || prev.vendorBio,
        isOnline: Boolean(result.data.isOnline)
      }));
    } catch (error) {
      console.error('Error saving vendor profile:', error);
      setGlobalMessage('Terjadi kesalahan saat menyimpan profil vendor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data vendor...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
      <SharedNavbar />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 55px rgba(15, 23, 42, 0.08)' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ margin: 0, fontSize: '30px', color: '#111' }}>Pengaturan Profil Vendor</h1>
            <p style={{ margin: '10px 0 0', color: '#475569' }}>Kelola nama toko, logo, alamat, dan deskripsi singkat untuk halaman produk.</p>
          </div>

          {globalMessage && (
            <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '14px', background: '#e2e8f0', color: '#0f172a' }}>
              {globalMessage}
            </div>
          )}

          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'grid', gap: '10px' }}>
              <label style={{ fontWeight: '600', color: '#334155' }}>Nama Vendor / Toko</label>
              <input
                type="text"
                name="vendorName"
                value={profileForm.vendorName}
                onChange={handleChange}
                placeholder="Contoh: Toko Sewa Alat Tani"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <label style={{ fontWeight: '600', color: '#334155' }}>Logo / URL Gambar</label>
              <input
                type="text"
                name="vendorLogo"
                value={profileForm.vendorLogo}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1' }}
              />
              {profileForm.vendorLogo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img
                    src={profileForm.vendorLogo}
                    alt="Logo vendor"
                    style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '16px', border: '1px solid #e2e8f0' }}
                    onError={(event) => {
                      event.currentTarget.src = 'https://via.placeholder.com/90x90?text=Logo';
                    }}
                  />
                  <span style={{ color: '#475569', fontSize: '13px' }}>Preview logo toko</span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <label style={{ fontWeight: '600', color: '#334155' }}>Alamat Toko</label>
              <textarea
                name="vendorAddress"
                value={profileForm.vendorAddress}
                onChange={handleChange}
                rows={3}
                placeholder="Alamat lengkap atau area layanan"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <label style={{ fontWeight: '600', color: '#334155' }}>Deskripsi Singkat</label>
              <textarea
                name="vendorBio"
                value={profileForm.vendorBio}
                onChange={handleChange}
                rows={4}
                placeholder="Tulis ringkas tentang toko Anda, keunggulan, atau jenis layanan yang ditawarkan."
                style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="isOnline"
                name="isOnline"
                checked={profileForm.isOnline}
                onChange={handleChange}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="isOnline" style={{ fontWeight: '600', color: '#334155' }}>Tandai sebagai online</label>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                width: 'fit-content',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 28px',
                background: isSaving ? '#94a3b8' : '#B28A67',
                color: 'white',
                fontWeight: '700',
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Profil Vendor'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
