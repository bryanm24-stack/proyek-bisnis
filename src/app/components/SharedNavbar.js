'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

let cachedUserRaw = null;
let cachedUserSnapshot = null;

function readUserFromStorage() {
  if (typeof window === 'undefined') return null;

  const userData = localStorage.getItem('user');
  if (userData === cachedUserRaw) return cachedUserSnapshot;

  cachedUserRaw = userData;

  if (!userData) {
    cachedUserSnapshot = null;
    return null;
  }

  try {
    cachedUserSnapshot = JSON.parse(userData);
  } catch {
    cachedUserSnapshot = null;
  }

  return cachedUserSnapshot;
}

function subscribeAuth(listener) {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('storage', listener);
  window.addEventListener('auth-change', listener);

  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('auth-change', listener);
  };
}

function NavLink({ href, active, children }) {
  return (
    <Link
      href={href}
      style={{
          fontSize: '14px',
          color: active ? '#B28A67' : '#666',
          textDecoration: 'none',
          fontWeight: active ? '600' : '500',
          padding: '6px 12px',
          borderRadius: '6px',
          background: active ? '#f0e6ff' : 'transparent',
        }}
    >
      {children}
    </Link>
  );
}

export default function SharedNavbar() {
  const user = useSyncExternalStore(subscribeAuth, readUserFromStorage, () => null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('info');
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?userId=${user.id}`);
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (!isMobile && sidebarOpen) {
      body.style.marginLeft = '220px';
    } else {
      body.style.marginLeft = '0px';
    }

    return () => {
      body.style.marginLeft = '0px';
    };
  }, [sidebarOpen, isMobile]);

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    router.push('/login');
  };

  const updateLocalUser = (newUserData) => {
    const storedUser = readUserFromStorage();
    if (!storedUser) return;
    const updated = { ...storedUser, ...newUserData };
    localStorage.setItem('user', JSON.stringify(updated));
    window.dispatchEvent(new Event('auth-change'));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSettingsLoading(true);
    setSettingsMessage('');

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, name: profileForm.name, email: profileForm.email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSettingsMessage(data.message || 'Gagal menyimpan informasi.');
      } else {
        updateLocalUser({ name: data.user.name, email: data.user.email });
        setSettingsMessage('Informasi pengguna berhasil diperbarui.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSettingsMessage('Terjadi kesalahan saat menyimpan.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!user) return;
    setSettingsLoading(true);
    setSettingsMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSettingsMessage('Password baru dan konfirmasi tidak sama.');
      setSettingsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSettingsMessage(data.message || 'Gagal mengganti password.');
      } else {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSettingsMessage('Password berhasil diubah.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setSettingsMessage('Terjadi kesalahan saat mengganti password.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!user || !notificationId) return;

    try {
      await fetch(`/api/notifications?id=${notificationId}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    setProfileForm({ name: user.name, email: user.email });
  }, [user]);

  if (!user) return null;

  return (
    <>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 110,
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            style={{
              background: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 10px',
              cursor: 'pointer',
              color: '#333',
              fontSize: '18px',
            }}
            aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
          >
            ☰
          </button>

          <Link
            href="/"
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#B28A67',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '24px', lineHeight: '1' }}>🛡️</span>
            RentGuard
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                position: 'relative',
              }}
              title="Notifikasi"
            >
              🔔
              {notifications.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-10px',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  right: 0,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  width: '300px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 1000,
                }}
              >
                {notifications.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>Tidak ada notifikasi</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', color: '#333' }}>{notif.message}</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                          {new Date(notif.createdAt).toLocaleTimeString('id-ID')}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notif.id);
                        }}
                        style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Hapus
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #C8A587, #B28A67)',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '50%',
                fontWeight: 'bold',
                minWidth: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {user.role === 'customer' ? 'Customer' : user.role === 'vendor' ? 'Vendor' : 'Admin'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSettings((prev) => !prev)}
            style={{
              background: '#F3F4F6',
              color: '#333',
              border: '1px solid #e5e7eb',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
            }}
            title="Pengaturan"
          >
            ⚙️ Settings
          </button>

          <button
            onClick={handleLogout}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      <aside
        style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          bottom: 0,
          width: sidebarOpen ? '220px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          borderRight: sidebarOpen ? '1px solid #e5e7eb' : 'none',
          background: '#fafafa',
          zIndex: 105,
        }}
      >
        <div style={{ padding: '18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontWeight: '700', color: '#333', fontSize: '15px' }}>Navigasi</div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666',
              display: sidebarOpen ? 'inline-flex' : 'none',
            }}
            aria-label="Tutup sidebar"
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 14px 16px' }}>
          <NavLink href="/" active={isActive('/')}>
            🏠 Home
          </NavLink>
          <NavLink href={user.role === 'vendor' ? '/vendor/chats' : '/customer/chats'} active={isActive('/customer/chats') || isActive('/vendor/chats')}>
            💬 Chat
          </NavLink>
          <NavLink href="/returns" active={isActive('/returns')}>
            🧾 Returns
          </NavLink>

          {user.role === 'customer' && (
            <>
              <NavLink href="/customer/invoices" active={isActive('/customer/invoices')}>
                📋 Invoice
              </NavLink>
              <NavLink href="/customer/favorites" active={isActive('/customer/favorites')}>
                ❤️ Favorit
              </NavLink>
            </>
          )}

          {user.role === 'vendor' && (
            <>
              <NavLink href="/vendor/invoices" active={isActive('/vendor/invoices')}>
                📋 Invoice
              </NavLink>
              <NavLink href="/vendor/favorites" active={isActive('/vendor/favorites')}>
                ❤️ Favorit
              </NavLink>
              <NavLink href="/vendor/produk" active={isActive('/vendor/produk')}>
                📦 Barang/Jasa Saya
              </NavLink>
              <NavLink href="/vendor/tambah-produk" active={isActive('/vendor/tambah-produk')}>
                ➕ Tambahkan Barang/Jasa
              </NavLink>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <NavLink href="/admin/vendor-approval" active={isActive('/admin/vendor-approval')}>
                ✓ Verifikasi Vendor
              </NavLink>
              <NavLink href="/admin/transaction-verification" active={isActive('/admin/transaction-verification')}>
                🪪 Verifikasi Transaksi
              </NavLink>
            </>
          )}
        </div>
      </aside>

      {showSettings && (
        <div
          onClick={() => setShowSettings(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, calc(100% - 40px))',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#111' }}>Pengaturan Pengguna</div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Ubah informasi dan kelola password akun Anda.</div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                }}
                aria-label="Tutup pengaturan"
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
              {['info', 'password'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '999px',
                    padding: '10px 16px',
                    background: settingsTab === tab ? '#B28A67' : 'white',
                    color: settingsTab === tab ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  {tab === 'info' ? 'Informasi Pengguna' : 'Ubah Password'}
                </button>
              ))}
            </div>

            {settingsMessage && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', color: '#334155' }}>
                {settingsMessage}
              </div>
            )}

            {settingsTab === 'info' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '6px' }}>Nama Lengkap</label>
                  <input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '6px' }}>Email</label>
                  <input
                    value={profileForm.email}
                    readOnly
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px', background: '#f8fafc', color: '#6b7280' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '6px' }}>Role</label>
                  <div style={{ padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px', background: '#f8fafc', color: '#374151' }}>
                    {user.role === 'customer' ? 'Customer' : user.role === 'vendor' ? 'Vendor' : 'Admin'}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSaveProfile}
                    disabled={settingsLoading}
                    style={{
                      background: '#B28A67',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 18px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    {settingsLoading ? 'Menyimpan...' : 'Simpan Informasi'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '6px' }}>Password Saat Ini</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '6px' }}>Password Baru</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '6px' }}>Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSavePassword}
                    disabled={settingsLoading}
                    style={{
                      background: '#B28A67',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 18px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    {settingsLoading ? 'Menyimpan...' : 'Ubah Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}