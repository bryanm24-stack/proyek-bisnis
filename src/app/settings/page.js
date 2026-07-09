'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavbar from '../components/SharedNavbar';

const initialProfileForm = { name: '', email: '', phone: '' };
const initialAddressForm = { address: '', city: '', postalCode: '' };
const initialBankForm = { bankName: '', accountNumber: '', accountHolder: '' };
const initialPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
const initialKtpForm = {
  idType: 'ktp',
  nik: '',
  idPhoto: null,
  idPhotoPreview: '',
  selfiePhoto: null,
  selfiePhotoPreview: '',
  notes: ''
};
const initialVendorForm = {
  vendorName: '',
  vendorLogo: '',
  vendorAddress: '',
  vendorBio: '',
  isOnline: false
};

const dataSurabaya = {
  "Tegalsari": ["60261 (Kedungdoro)", "60262 (Tegalsari)", "60263 (Wonorejo)", "60264 (Dr. Soetomo)", "60265 (Keputran)"],
  "Simokerto": ["60141 (Kapasan)", "60142 (Tambakrejo)", "60143 (Simokerto)", "60144 (Simolawang)", "60145 (Sidodadi)"],
  "Genteng": ["60271 (Embong Kaliasin)", "60272 (Ketabang)", "60273 (Kapasari)", "60274 (Peneleh)", "60275 (Genteng)"],
  "Bubutan": ["60171 (Jepara)", "60172 (Gundih)", "60173 (Tembok Dukuh)", "60174 (Alun-Alun Contong / Bubutan)"],
  "Bulak": ["60122 (Sukolilo Baru)", "60123 (Kenjeran)", "60124 (Bulak)", "60125 (Kedung Cowek)"],
  "Kenjeran": ["60126 (Tambak Wedi)", "60127 (Bulak Banteng)", "60128 (Sidotopo Wetan)", "60129 (Tanah Kali Kedinding)"],
  "Semampir": ["60151 (Ampel)", "60152 (Sidotopo)", "60153 (Pegirian)", "60154 (Wonokusumo)", "60155 (Ujung)"],
  "Pabean Cantian": ["60161 (Bongkaran)", "60162 (Nyamplungan)", "60163 (Krembangan Utara)", "60164 (Perak Timur)", "60165 (Perak Utara)"],
  "Krembangan": ["60175 (Krembangan Selatan)", "60176 (Kemayoran)", "60177 (Perak Barat)", "60178 (Morokrembangan)", "60179 (Dupak)"],
  "Gubeng": ["60281 (Gubeng)", "60282 (Kertajaya)", "60283 (Pucang Sewu)", "60284 (Baratajaya)", "60285 (Mojo)", "60286 (Airlangga)"],
  "Gunung Anyar": ["60293 (Rungkut Menanggal / Tengah)", "60294 (Gunung Anyar / Tambak)"],
  "Sukolilo": ["60111 (Keputih)", "60117 (Gebang Putih / Klampis Ngasem)", "60118 (Menur Pumpungan / Nginden Jangkungan)", "60119 (Medokan Semampir / Semolowaru)"],
  "Tambaksari": ["60131 (Pacar Keling)", "60132 (Pacar Kembang)", "60133 (Ploso)", "60134 (Gading)", "60135 (Rangkah)", "60136 (Tambaksari)", "60137 (Kapas Madya Baru)", "60138 (Dukuh Setro)"],
  "Mulyorejo": ["60112 (Kalisari / Kejawen Putih Tambak)", "60113 (Dukuh Sutorejo)", "60114 (Kalijudan)", "60115 (Mulyorejo)", "60116 (Manyar Sabrangan)"],
  "Rungkut": ["60293 (Kalirungkut / Rungkut Kidul)", "60295 (Medokan Ayu)", "60296 (Wonorejo)", "60297 (Penjaringan Sari)", "60298 (Kedung Baruk)"],
  "Tenggilis Mejoyo": ["60291 (Kutisari)", "60292 (Kendangsari / Tenggilis Mejoyo)", "60299 (Panjang Jiwo)"],
  "Wonokromo": ["60241 (Darmo)", "60242 (Sawunggaling)", "60243 (Wonokromo)", "60244 (Jagir)", "60245 (Ngagelrejo)", "60246 (Ngagel)"],
  "Wonocolo": ["60236 (Siwalankerto)", "60237 (Jemur Wonosari)", "60238 (Margorejo)", "60239 (Bendul Merisi / Sidosermo)"],
  "Wiyung": ["60222 (Balas Klumprik)", "60227 (Babatan)", "60228 (Wiyung)", "60229 (Jajar Tunggal)"],
  "Karang Pilang": ["60221 (Karangpilang / Warugunung)", "60222 (Kebraon)", "60223 (Kedurus)"],
  "Jambangan": ["60232 (Karah / Jambangan)", "60233 (Kebonsari / Pagesangan)"],
  "Gayungan": ["60231 (Ketintang)", "60234 (Dukuh Menanggal / Menanggal)", "60235 (Gayungan)"],
  "Dukuh Pakis": ["60224 (Gunung Sari)", "60225 (Dukuh Kupang / Pakis)", "60226 (Pradah Kali Kendal)"],
  "Sawahan": ["60251 (Sawahan)", "60252 (Petemon)", "60253 (Kupang Krajan)", "60254 (Banyu Urip)", "60255 (Putat Jaya)", "60256 (Pakis)"],
  "Benowo": ["60191 (Tambak Osowilangun)", "60192 (Romokalisari)", "60198 (Sememi)", "60199 (Kandangan)"],
  "Pakal": ["60192 (Sumberejo)", "60196 (Pakal)", "60195 (Benowo)", "60197 (Babat Jerawat)"],
  "Asemrowo": ["60182 (Asemrowo)", "60183 (Genting Kalianak)", "60184 (Tambak Sarioso)"],
  "Sukomanunggal": ["60187 (Tanjungsari)", "60188 (Sukomanunggal)", "60189 (Sonokwijenan / Putat Gede)", "60281 (Simomulyo / Baru)"],
  "Tandes": ["60184 (Manukan Wetan)", "60185 (Banjar Sugihan / Manukan Kulon)", "60186 (Balongsari / Karang Poh)", "60187 (Tandes)"],
  "Sambikerep": ["60216 (Lontar)", "60217 (Sambikerep)", "60218 (Bringin)", "60219 (Made)"],
  "Lakarsantri": ["60211 (Lakarsantri)", "60212 (Jeruk)", "60213 (Lidah Kulon / Wetan)", "60214 (Bangkingan)", "60215 (Sumur Welut)"]
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsTab, setSettingsTab] = useState('akun');
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [addressForm, setAddressForm] = useState(initialAddressForm);
  const [bankForm, setBankForm] = useState(initialBankForm);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [ktpForm, setKtpForm] = useState(initialKtpForm);
  const [ktpStatus, setKtpStatus] = useState(null);
  const [vendorForm, setVendorForm] = useState(initialVendorForm);
  const [isSaving, setIsSaving] = useState(false);
  const [globalMessage, setGlobalMessage] = useState('');

  const postalCodeOptions = dataSurabaya[addressForm.city] || [];

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!storedUser) {
      router.push('/login');
      return;
    }

    let parsedUser;
    try {
      parsedUser = JSON.parse(storedUser);
    } catch {
      router.push('/login');
      return;
    }

    if (!parsedUser || !['customer', 'member', 'vendor'].includes(parsedUser.role)) {
      router.push('/');
      return;
    }

    setUser(parsedUser);
    setProfileForm({
      name: parsedUser.name || '',
      email: parsedUser.email || '',
      phone: parsedUser.phone || ''
    });
    setAddressForm({
      address: parsedUser.address || '',
      city: parsedUser.city || '',
      postalCode: parsedUser.postalCode || ''
    });
    setBankForm({
      bankName: parsedUser.bankName || '',
      accountNumber: parsedUser.accountNumber || '',
      accountHolder: parsedUser.accountHolder || ''
    });

    const loadData = async () => {
      try {
        const ktpResponse = await fetch(`/api/auth/verify-ktp?userId=${encodeURIComponent(parsedUser.id)}`, {
          cache: 'no-store'
        });
        if (ktpResponse.ok) {
          const result = await ktpResponse.json();
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
        }
      } catch (error) {
        console.error('Error fetching KTP verification:', error);
      }

      if (parsedUser.role === 'vendor') {
        try {
          const response = await fetch(`/api/vendor/profile?vendorId=${encodeURIComponent(parsedUser.id)}`);
          const result = await response.json();
          if (response.ok && result.success && result.data) {
            setVendorForm({
              vendorName: result.data.vendorName || parsedUser.name || '',
              vendorLogo: result.data.vendorLogo || '',
              vendorAddress: result.data.vendorAddress || '',
              vendorBio: result.data.vendorBio || '',
              isOnline: Boolean(result.data.isOnline)
            });
          } else {
            setVendorForm((prev) => ({
              ...prev,
              vendorName: parsedUser.name || prev.vendorName
            }));
          }
        } catch (error) {
          console.error('Error loading vendor profile:', error);
        }
      }

      setLoading(false);
    };

    loadData();
  }, [router]);

  const handleInputChange = (setter) => (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file' && files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setter((prev) => ({
          ...prev,
          [name]: file,
          [`${name}Preview`]: reader.result || ''
        }));
      };
      reader.readAsDataURL(file);
      return;
    }

    setter((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressForm((prev) => {
      if (name === 'city') {
        return {
          ...prev,
          city: value,
          postalCode: dataSurabaya[value]?.[0] || ''
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setGlobalMessage('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setGlobalMessage(result.message || 'Gagal menyimpan profil.');
        return;
      }

      const updatedUser = {
        ...user,
        name: result.user?.name || profileForm.name,
        email: result.user?.email || profileForm.email,
        phone: result.user?.phone || profileForm.phone
      };
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

  const handleBankSave = async () => {
    if (!user) return;
    setGlobalMessage('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: profileForm.name || user.name,
          email: profileForm.email || user.email,
          phone: profileForm.phone || user.phone,
          bankName: bankForm.bankName,
          accountNumber: bankForm.accountNumber,
          accountHolder: bankForm.accountHolder
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setGlobalMessage(result.message || 'Gagal menyimpan rekening bank.');
        return;
      }

      const updatedUser = {
        ...user,
        bankName: result.user?.bankName || bankForm.bankName,
        accountNumber: result.user?.accountNumber || bankForm.accountNumber,
        accountHolder: result.user?.accountHolder || bankForm.accountHolder
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setGlobalMessage('Rekening berhasil disimpan.');
    } catch (error) {
      console.error('Error saving bank details:', error);
      setGlobalMessage('Terjadi kesalahan saat menyimpan rekening bank.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddressSave = async () => {
    if (!user) return;
    setGlobalMessage('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: profileForm.name || user.name,
          email: profileForm.email || user.email,
          phone: profileForm.phone || user.phone,
          address: addressForm.address,
          city: addressForm.city,
          postalCode: addressForm.postalCode
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setGlobalMessage(result.message || 'Gagal menyimpan alamat.');
        return;
      }

      const updatedUser = {
        ...user,
        address: result.user?.address || addressForm.address,
        city: result.user?.city || addressForm.city,
        postalCode: result.user?.postalCode || addressForm.postalCode
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setGlobalMessage('Alamat berhasil disimpan.');
    } catch (error) {
      console.error('Error saving address:', error);
      setGlobalMessage('Terjadi kesalahan saat menyimpan alamat.');
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
        body: JSON.stringify({
          id: user.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setGlobalMessage(result.message || 'Gagal mengganti password.');
        return;
      }
      setPasswordForm(initialPasswordForm);
      setGlobalMessage('Password berhasil diubah.');
    } catch (error) {
      console.error('Error changing password:', error);
      setGlobalMessage('Terjadi kesalahan saat mengganti password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKtpSave = async () => {
    if (!user) return;
    if (!ktpForm.nik.trim()) {
      setGlobalMessage('Nomor identitas wajib diisi.');
      return;
    }
    if (!ktpForm.idPhotoPreview || !ktpForm.selfiePhotoPreview) {
      setGlobalMessage('Unggah foto identitas dan selfie terlebih dahulu.');
      return;
    }

    setIsSaving(true);
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
        setGlobalMessage(result.message || 'Gagal menyimpan verifikasi.');
        return;
      }
      setKtpStatus(result.data);
      setGlobalMessage('Permohonan verifikasi berhasil disimpan. Status: pending.');
    } catch (error) {
      console.error('Error saving KTP verification:', error);
      setGlobalMessage('Terjadi kesalahan saat mengirim data verifikasi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVendorSave = async () => {
    if (!user || user.role !== 'vendor') return;
    setGlobalMessage('');
    if (!vendorForm.vendorName.trim()) {
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
          vendorName: vendorForm.vendorName.trim(),
          vendorLogo: vendorForm.vendorLogo.trim(),
          vendorAddress: vendorForm.vendorAddress.trim(),
          vendorBio: vendorForm.vendorBio.trim(),
          isOnline: vendorForm.isOnline
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setGlobalMessage(result.message || 'Gagal menyimpan profil vendor.');
        return;
      }
      setVendorForm((prev) => ({
        ...prev,
        vendorName: result.data.vendorName || prev.vendorName,
        vendorLogo: result.data.vendorLogo || prev.vendorLogo,
        vendorAddress: result.data.vendorAddress || prev.vendorAddress,
        vendorBio: result.data.vendorBio || prev.vendorBio,
        isOnline: Boolean(result.data.isOnline)
      }));
      setGlobalMessage('Profil vendor berhasil disimpan.');
    } catch (error) {
      console.error('Error saving vendor profile:', error);
      setGlobalMessage('Terjadi kesalahan saat menyimpan profil vendor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat profil...</div>;
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat pengaturan...</div>;
  }

  const tabs = [
    { id: 'akun', label: 'Akun' },
    { id: 'alamat', label: 'Alamat' },
    { id: 'rekening', label: 'Rekening Bank' },
    { id: 'password', label: 'Ganti Password' }
  ];

  if (user.role === 'vendor') {
    tabs.push({ id: 'vendor', label: 'Profil Vendor' });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', paddingBottom: '120px' }}>
      <SharedNavbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 120px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 290px', minWidth: '260px', background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 55px rgba(15, 23, 42, 0.08)' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#111' }}>Pengaturan Akun</div>
              <p style={{ margin: '10px 0 0', color: '#4b5563' }}>Kelola informasi profil, alamat, rekening, password, dan vendor.</p>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: settingsTab === tab.id ? '#B28A67' : '#f8fafc',
                    color: settingsTab === tab.id ? 'white' : '#334155',
                    border: '1px solid ' + (settingsTab === tab.id ? '#B28A67' : '#e2e8f0'),
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: '2 1 620px', minWidth: '320px' }}>
            <div style={{ background: 'white', borderRadius: '24px', padding: '30px', boxShadow: '0 20px 55px rgba(15, 23, 42, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '26px', color: '#111' }}>Profil Saya</h1>
                  <p style={{ margin: '10px 0 0', color: '#475569' }}>Tab {tabs.find((tab) => tab.id === settingsTab)?.label} aktif.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Hai, {user.name}</span>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Role: {user.role === 'customer' ? 'Customer' : user.role === 'vendor' ? 'Vendor' : 'Member'}</span>
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
                        name="name"
                        onChange={handleInputChange(setProfileForm)}
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
                        name="phone"
                        value={profileForm.phone}
                        onChange={handleInputChange(setProfileForm)}
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
                        <div style={{ marginTop: '6px', color: '#475569', fontSize: '14px' }}>Lengkapi data KTP untuk mempercepat proses sewa dan verifikasi.</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: ktpStatus?.status === 'approved' ? '#166534' : ktpStatus?.status === 'rejected' ? '#b91c1c' : '#7c3aed' }}>
                        {ktpStatus ? `Status: ${ktpStatus.status.toUpperCase()}` : 'Status: Belum diajukan'}
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
                          onChange={handleInputChange(setKtpForm)}
                          style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                        >
                          <option value="ktp">KTP</option>
                          <option value="sim">SIM</option>
                          <option value="passport">Paspor</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>
                          Nomor {ktpForm.idType === 'ktp' ? 'KTP' : ktpForm.idType === 'sim' ? 'SIM' : 'Paspor'}
                        </label>
                        <input
                          type="text"
                          name="nik"
                          value={ktpForm.nik}
                          onChange={handleInputChange(setKtpForm)}
                          placeholder="Masukkan nomor identitas"
                          style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Foto {ktpForm.idType === 'ktp' ? 'KTP' : ktpForm.idType === 'sim' ? 'SIM' : 'Paspor'}</label>
                          <input type="file" accept="image/*" onChange={handleInputChange(setKtpForm)} name="idPhoto" />
                          {ktpForm.idPhotoPreview && (
                            <img src={ktpForm.idPhotoPreview} alt="Preview KTP" style={{ marginTop: '12px', width: '100%', maxWidth: '260px', borderRadius: '14px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Foto Selfie</label>
                          <input type="file" accept="image/*" onChange={handleInputChange(setKtpForm)} name="selfiePhoto" />
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
                          onChange={handleInputChange(setKtpForm)}
                          placeholder="Catatan tambahan untuk tim verifikasi"
                          style={{ width: '100%', minHeight: '120px', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px', resize: 'vertical' }}
                        />
                      </div>

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
                        onChange={handleInputChange(setAddressForm)}
                        name="address"
                        placeholder="Jalan, nomor rumah, blok, dll."
                        style={{ width: '100%', minHeight: '120px', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Kecamatan</label>
                      <select
                        name="city"
                        value={addressForm.city}
                        onChange={handleAddressChange}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px', background: 'white' }}
                      >
                        <option value="">Pilih Kecamatan...</option>
                        {Object.keys(dataSurabaya).map((district) => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Kode Pos</label>
                      <select
                        name="postalCode"
                        value={addressForm.postalCode}
                        onChange={handleAddressChange}
                        disabled={!addressForm.city}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px', background: addressForm.city ? 'white' : '#f8fafc' }}
                      >
                        <option value="">{addressForm.city ? 'Pilih Kode Pos...' : 'Pilih Kecamatan terlebih dahulu'}</option>
                        {postalCodeOptions.map((code) => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleAddressSave}
                      disabled={isSaving}
                      style={{ padding: '14px 22px', borderRadius: '14px', border: 'none', background: isSaving ? '#94a3b8' : '#B28A67', color: 'white', fontWeight: '700', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.75 : 1 }}
                    >
                      {isSaving ? 'Menyimpan...' : 'Simpan Alamat'}
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
                        name="bankName"
                        value={bankForm.bankName}
                        onChange={handleInputChange(setBankForm)}
                        placeholder="BCA, Mandiri, BNI"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Nomor Rekening</label>
                      <input
                        name="accountNumber"
                        value={bankForm.accountNumber}
                        onChange={handleInputChange(setBankForm)}
                        placeholder="1234567890"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Nama Pemilik Rekening</label>
                      <input
                        name="accountHolder"
                        value={bankForm.accountHolder}
                        onChange={handleInputChange(setBankForm)}
                        placeholder="Nama sesuai rekening"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleBankSave}
                      disabled={isSaving}
                      style={{ padding: '14px 22px', borderRadius: '14px', border: 'none', background: '#B28A67', color: 'white', fontWeight: '700', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.65 : 1 }}
                    >
                      {isSaving ? 'Menyimpan...' : 'Simpan Rekening'}
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
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handleInputChange(setPasswordForm)}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Password Baru</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handleInputChange(setPasswordForm)}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Konfirmasi Password Baru</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handleInputChange(setPasswordForm)}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                      />
                    </div>
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
              )}

              {settingsTab === 'vendor' && user.role === 'vendor' && (
                <div style={{ marginTop: '24px', display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Nama Vendor / Toko</label>
                      <input
                        type="text"
                        name="vendorName"
                        value={vendorForm.vendorName}
                        onChange={handleInputChange(setVendorForm)}
                        placeholder="Contoh: Toko Sewa Alat Tani"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Logo / URL Gambar</label>
                      <input
                        type="text"
                        name="vendorLogo"
                        value={vendorForm.vendorLogo}
                        onChange={handleInputChange(setVendorForm)}
                        placeholder="https://example.com/logo.png"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                      />
                      {vendorForm.vendorLogo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={vendorForm.vendorLogo}
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
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Alamat Toko</label>
                      <textarea
                        name="vendorAddress"
                        value={vendorForm.vendorAddress}
                        onChange={handleInputChange(setVendorForm)}
                        rows={3}
                        placeholder="Alamat lengkap atau area layanan"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', resize: 'vertical', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600' }}>Deskripsi Singkat</label>
                      <textarea
                        name="vendorBio"
                        value={vendorForm.vendorBio}
                        onChange={handleInputChange(setVendorForm)}
                        rows={4}
                        placeholder="Tulis ringkas tentang toko Anda, keunggulan, atau jenis layanan yang ditawarkan."
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', resize: 'vertical', fontSize: '15px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        id="isOnline"
                        name="isOnline"
                        checked={vendorForm.isOnline}
                        onChange={handleInputChange(setVendorForm)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <label htmlFor="isOnline" style={{ fontWeight: '600', color: '#334155' }}>Tandai sebagai online</label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleVendorSave}
                      disabled={isSaving}
                      style={{ padding: '14px 22px', borderRadius: '14px', border: 'none', background: isSaving ? '#94a3b8' : '#B28A67', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {isSaving ? 'Menyimpan...' : 'Simpan Profil Vendor'}
                    </button>
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
