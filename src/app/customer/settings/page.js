'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings');
  }, [router]);

  return <div style={{ padding: '40px', textAlign: 'center' }}>Mengalihkan ke pengaturan...</div>;

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'customer' && parsedUser.role !== 'member') {
      router.push('/');
      return;
    }

    setUser(parsedUser);
    setProfileForm({ name: parsedUser.name || '', email: parsedUser.email || '', phone: parsedUser.phone || '' });

    const fetchKtpStatus = async () => {
      try {
        const response = await fetch(`/api/auth/verify-ktp?userId=${encodeURIComponent(parsedUser.id)}`, { cache: 'no-store' });
        if (!response.ok) {
          setKtpStatus(null);
          return;
        }

        const result = await response.json();
        if (result.success) {
          setKtpStatus(result.data || null);
          if (result.data) {
            setKtpForm((prev) => ({
              ...prev,
              idType: result.data.idType || 'ktp',
              nik: result.data.nik || '',
              idPhotoPreview: result.data.idPhotoPreview || '',
              selfiePhotoPreview: result.data.selfiePhotoPreview || '',
              notes: result.data.notes || ''
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching KTP verification:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKtpStatus();
  }, [router]);

  const handleProfileSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setGlobalMessage('');

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, name: profileForm.name, email: profileForm.email, phone: profileForm.phone })
      });
      const result = await response.json();

      if (!response.ok) {
        setGlobalMessage(result.message || 'Gagal menyimpan profil.');
        return;
      }

      const updatedUser = { ...user, name: result.user.name, email: result.user.email, phone: result.user.phone };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setGlobalMessage('Profil berhasil disimpan.');
    } catch (error) {
      console.error('Error saving profile:', error);
      setGlobalMessage('Terjadi kesalahan saat menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!user) return;
    setGlobalMessage('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setGlobalMessage('Password baru dan konfirmasi tidak sama.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      });
      const result = await response.json();

      if (!response.ok) {
        setGlobalMessage(result.message || 'Gagal mengganti password.');
        return;
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setGlobalMessage('Password berhasil diubah.');
    } catch (error) {
      console.error('Error changing password:', error);
      setGlobalMessage('Terjadi kesalahan saat mengganti password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKtpInputChange = (e) => {
    const { name, value } = e.target;
    setKtpForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (field) => (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setKtpMessage('Ukuran file maksimal 5MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setKtpMessage('File harus berupa gambar.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setKtpForm((prev) => ({ ...prev, [field]: file, [`${field}Preview`]: reader.result }));
      if (ktpMessage) {
        setKtpMessage('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleKtpSave = async () => {
    if (!user) return;
    if (!ktpForm.nik.trim()) {
      setKtpMessage('Nomor NIK wajib diisi.');
      return;
    }

    if (!ktpForm.idPhotoPreview || !ktpForm.selfiePhotoPreview) {
      setKtpMessage('Unggah foto KTP dan foto selfie terlebih dahulu.');
      return;
    }

    setIsSaving(true);
    setKtpMessage('');
    setGlobalMessage('');

    try {
      const response = await fetch('/api/auth/verify-ktp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: profileForm.name,
          email: profileForm.email,
          idType: ktpForm.idType,
          nik: ktpForm.nik,
          idPhotoPreview: ktpForm.idPhotoPreview,
          selfiePhotoPreview: ktpForm.selfiePhotoPreview,
          notes: ktpForm.notes,
          status: 'pending'
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setKtpMessage(result.message || 'Gagal menyimpan verifikasi.');
        return;
      }

      setKtpStatus(result.data);
      setKtpMessage('Permohonan verifikasi KTP berhasil disimpan. Status: pending.');
      setSettingsTab('akun');
    } catch (error) {
      console.error('Error saving KTP verification:', error);
      setKtpMessage('Terjadi kesalahan saat mengirim data verifikasi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat profil...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
      <SharedNavbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 290px', minWidth: '260px', background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 55px rgba(15, 23, 42, 0.08)' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#111' }}>Pengaturan Akun</div>
              <p style={{ margin: '10px 0 0', color: '#4b5563' }}>Kelola informasi profil, KTP, alamat, rekening, dan password Anda.</p>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {['akun', 'alamat', 'rekening', 'password'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: settingsTab === tab ? '#B28A67' : '#f8fafc',
                    color: settingsTab === tab ? 'white' : '#334155',
                    border: '1px solid ' + (settingsTab === tab ? '#B28A67' : '#e2e8f0'),
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {tab === 'akun' ? 'Akun' : tab === 'alamat' ? 'Alamat' : tab === 'rekening' ? 'Rekening Bank' : 'Ganti Password'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: '2 1 620px', minWidth: '320px' }}>
            <div style={{ background: 'white', borderRadius: '24px', padding: '30px', boxShadow: '0 20px 55px rgba(15, 23, 42, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '26px', color: '#111' }}>Profil Saya</h1>
                  <p style={{ margin: '10px 0 0', color: '#475569' }}>Tab {settingsTab === 'akun' ? 'Akun' : settingsTab === 'alamat' ? 'Alamat' : settingsTab === 'rekening' ? 'Rekening Bank' : 'Ganti Password'} aktif.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Hai, {user.name}</span>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Role: {user.role === 'customer' ? 'Customer' : user.role === 'vendor' ? 'Vendor' : 'Admin'}</span>
                </div>
              </div>

              {globalMessage && (
                <div style={{ marginTop: '22px', padding: '14px 18px', background: '#eef2ff', borderRadius: '14px', color: '#334155' }}>
                  {globalMessage}
                </div>
              )}

              {settingsTab === 'akun' && (
                <div style={{ marginTop: '24px', display: 'grid', gap: '24px' }}>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Nama Lengkap</label>
                      <input
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Email</label>
                      <input
                        value={profileForm.email}
                        readOnly
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Nomor Telepon</label>
                      <input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="08xx xxxx xxxx"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleProfileSave}
                        disabled={isSaving}
                        style={{ padding: '14px 22px', borderRadius: '14px', border: 'none', background: '#B28A67', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                      >
                        {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '17px', fontWeight: '700', color: '#111' }}>Verifikasi KTP</div>
                        <div style={{ marginTop: '6px', color: '#475569', fontSize: '14px' }}>Lengkapi data KTP untuk mempercepat proses checkout.</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: ktpStatus?.status === 'approved' ? '#166534' : ktpStatus?.status === 'rejected' ? '#b91c1c' : '#7c3aed' }}>
                        {ktpStatus ? (`Status: ${ktpStatus.status.toUpperCase()}`) : 'Status: Belum diajukan'}
                      </div>
                    </div>

                    {ktpStatus?.adminNotes && (
                      <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '14px', background: '#fff4f4', color: '#991b1b', fontSize: '14px' }}>
                        Catatan admin: {ktpStatus.adminNotes}
                      </div>
                    )}

                    <div style={{ marginTop: '24px', display: 'grid', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Jenis Identitas</label>
                        <select
                          name="idType"
                          value={ktpForm.idType}
                          onChange={handleKtpInputChange}
                          style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                        >
                          <option value="ktp">KTP</option>
                          <option value="sim">SIM</option>
                          <option value="passport">Paspor</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Nomor {ktpForm.idType === 'ktp' ? 'KTP' : ktpForm.idType === 'sim' ? 'SIM' : 'Paspor'}</label>
                        <input
                          type="text"
                          name="nik"
                          value={ktpForm.nik}
                          onChange={handleKtpInputChange}
                          placeholder="Masukkan nomor identitas"
                          style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Foto {ktpForm.idType === 'ktp' ? 'KTP' : ktpForm.idType === 'sim' ? 'SIM' : 'Paspor'}</label>
                          <input type="file" accept="image/*" onChange={handlePhotoUpload('idPhoto')} />
                          {ktpForm.idPhotoPreview && (
                            <img src={ktpForm.idPhotoPreview} alt="Preview KTP" style={{ marginTop: '12px', width: '100%', maxWidth: '260px', borderRadius: '14px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Foto Selfie</label>
                          <input type="file" accept="image/*" onChange={handlePhotoUpload('selfiePhoto')} />
                          {ktpForm.selfiePhotoPreview && (
                            <img src={ktpForm.selfiePhotoPreview} alt="Preview Selfie" style={{ marginTop: '12px', width: '100%', maxWidth: '260px', borderRadius: '14px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                          )}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Catatan (opsional)</label>
                        <textarea
                          name="notes"
                          value={ktpForm.notes}
                          onChange={handleKtpInputChange}
                          placeholder="Catatan tambahan untuk tim verifikasi"
                          style={{ width: '100%', minHeight: '120px', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px', resize: 'vertical' }}
                        />
                      </div>

                      {ktpMessage && (
                        <div style={{ color: '#b91c1c', fontWeight: '600' }}>{ktpMessage}</div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ color: '#475569', fontSize: '14px' }}>
                          {ktpStatus?.status === 'approved'
                            ? 'KTP Anda telah terverifikasi. Terima kasih.'
                            : ktpStatus?.status === 'rejected'
                              ? 'KTP ditolak. Silakan unggah ulang dengan data yang benar.'
                              : 'Silakan ajukan verifikasi KTP untuk melanjutkan checkout lebih cepat.'}
                        </div>
                        <button
                          onClick={handleKtpSave}
                          disabled={isSaving}
                          style={{ padding: '14px 22px', borderRadius: '14px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                        >
                          {isSaving ? 'Menyimpan...' : ktpStatus ? 'Perbarui Verifikasi' : 'Ajukan Verifikasi'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'alamat' && (
                <div style={{ marginTop: '24px', display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Alamat Lengkap</label>
                      <textarea
                        value={addressForm.address}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, address: e.target.value }))}
                        placeholder="Jalan, nomor rumah, blok, dll."
                        style={{ width: '100%', minHeight: '120px', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Kota</label>
                        <input
                          value={addressForm.city}
                          onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                          placeholder="Jakarta"
                          style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Provinsi</label>
                        <input
                          value={addressForm.province}
                          onChange={(e) => setAddressForm((prev) => ({ ...prev, province: e.target.value }))}
                          placeholder="DKI Jakarta"
                          style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Kode Pos</label>
                      <input
                        value={addressForm.postalCode}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                        placeholder="12345"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setGlobalMessage('Fungsi alamat akan diaktifkan setelah integrasi backend.')}
                      style={{ padding: '14px 22px', borderRadius: '14px', border: 'none', background: '#B28A67', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Simpan Alamat
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'rekening' && (
                <div style={{ marginTop: '24px', display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Nama Bank</label>
                      <input
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                        placeholder="BCA, Mandiri, BNI"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Nomor Rekening</label>
                      <input
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="1234567890"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Nama Pemilik Rekening</label>
                      <input
                        value={bankForm.accountHolder}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, accountHolder: e.target.value }))}
                        placeholder="Nama sesuai rekening"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setGlobalMessage('Fungsi rekening bank akan diaktifkan setelah integrasi backend.')}
                      style={{ padding: '14px 22px', borderRadius: '14px', border: 'none', background: '#B28A67', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Simpan Rekening
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'password' && (
                <div style={{ marginTop: '24px', display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Password Saat Ini</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Password Baru</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Konfirmasi Password Baru</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handlePasswordSave}
                        disabled={isSaving}
                        style={{ padding: '14px 22px', borderRadius: '14px', border: 'none', background: '#B28A67', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                      >
                        {isSaving ? 'Memperbarui...' : 'Ubah Password'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
