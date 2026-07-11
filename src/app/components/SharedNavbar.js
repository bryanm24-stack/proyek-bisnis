'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getNotificationTitle } from '@/lib/notificationTitles';

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
          color: active ? '#B28A67' : '#444',
          textDecoration: 'none',
          fontWeight: active ? '600' : '500',
          padding: '10px 14px',
          borderRadius: '12px',
          background: active ? '#f8f4ef' : 'transparent',
          transition: 'background 0.2s ease, color 0.2s ease',
          display: 'block',
          lineHeight: '1.4',
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    const interval = setInterval(fetchNotifications, 15000); // Polling setiap 15 detik
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
    body.style.paddingTop = '80px';

    if (!isMobile && sidebarOpen) {
      body.style.marginLeft = '280px';
    } else {
      body.style.marginLeft = '0px';
    }

    return () => {
      body.style.paddingTop = '0px';
      body.style.marginLeft = '0px';
    };
  }, [isMobile, sidebarOpen]);

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');
  const isExactPath = (href) => pathname === href;

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    router.push('/login');
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

  const handleMarkAsRead = async (notificationId) => {
    if (!user || !notificationId) return;

    try {
      const response = await fetch(`/api/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (!user) {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '80px',
            zIndex: 110,
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              aria-label={sidebarOpen ? 'Tutup sidebar tamu' : 'Buka sidebar tamu'}
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

          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>
            Jelajahi layanan sewa terpercaya
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
            <div style={{ fontWeight: '700', color: '#333', fontSize: '15px' }}>Akun</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 14px 16px', height: 'calc(100vh - 140px)', overflow: 'hidden', justifyContent: 'space-between' }}>
            <Link
              href="/login"
              style={{
                background: '#1f2937',
                color: 'white',
                border: '1px solid #1f2937',
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Masuk
            </Link>

            <Link
              href="/register"
              style={{
                background: '#B28A67',
                color: 'white',
                border: '1px solid #B28A67',
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Register
            </Link>

            <Link
              href="/vendor/register"
              style={{
                background: 'white',
                color: '#B28A67',
                border: '1px solid #B28A67',
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Menjadi Vendor
            </Link>
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '80px',
          zIndex: 50,
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 22px',
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
              {notifications.filter(n => !n.is_read).length > 0 && (
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
                  {notifications.filter(n => !n.is_read).length}
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
                  width: '320px',
                  maxHeight: '420px',
                  overflowY: 'auto',
                  zIndex: 1000,
                }}
              >
                {notifications.filter(n => !n.is_read).length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>Tidak ada notifikasi baru</div>
                ) : (
                  <>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', fontWeight: '600', fontSize: '12px', color: '#666' }}>
                      {notifications.filter(n => !n.is_read).length} notifikasi baru
                    </div>
                    {notifications.filter(n => !n.is_read).slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          background: '#fef9f3',
                        }}
                        onClick={() => handleMarkAsRead(notif.id)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fef9f3'}
                      >
                        <div style={{ fontSize: '13px', color: '#B28A67', fontWeight: '600', marginBottom: '4px' }}>
                          {getNotificationTitle(notif.type, notif.sender_name, notif.message_count)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#333', marginBottom: '4px', lineHeight: '1.4' }}>
                          {notif.message.substring(0, 70)}
                          {notif.message.length > 70 ? '...' : ''}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          {new Date(notif.updated_at || notif.created_at).toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))}
                    {notifications.filter(n => !n.is_read).length > 5 && (
                      <div style={{ padding: '12px 16px', background: '#fafafa', color: '#999', fontSize: '12px', textAlign: 'center' }}>
                        +{notifications.filter(n => !n.is_read).length - 5} notifikasi baru lagi
                      </div>
                    )}
                    <Link
                      href="/notifications"
                      onClick={() => setShowNotifications(false)}
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        borderTop: '1px solid #f0f0f0',
                        textAlign: 'center',
                        color: '#B28A67',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: '#f9fafb',
                      }}
                    >
                      Lihat Semua Notifikasi →
                    </Link>
                  </>
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
              {String(user?.name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                {String(user?.name || user?.username || user?.email || 'User')}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {user?.role === 'customer' ? 'Customer' : user?.role === 'vendor' ? 'Vendor' : 'Admin'}
              </div>
            </div>
          </div>

          <Link
            href="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#F3F4F6',
              color: '#333',
              border: '1px solid #e5e7eb',
              padding: '8px 12px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            <span></span>
            Profil Saya
          </Link>

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
          top: '80px',
          left: 0,
          bottom: 0,
          width: sidebarOpen ? '280px' : '0px',
          height: sidebarOpen ? 'calc(100vh - 80px)' : '0px',
          overflow: 'hidden',
          transition: 'width 0.25s ease, height 0.25s ease',
          borderRight: sidebarOpen ? '1px solid #e5e7eb' : 'none',
          background: '#fafafa',
          zIndex: 45,
        }}
      >
        <div style={{ padding: '18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontWeight: '700', color: '#333', fontSize: '16px' }}>Navigasi</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', padding: '0 14px 18px', height: 'calc(100% - 56px)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 auto' }}>
            <NavLink href="/" active={isActive('/')}>
            Home
          </NavLink>
          <NavLink href="/notifications" active={isActive('/notifications')}>
            Notifikasi
          </NavLink>
          <NavLink href={user.role === 'vendor' ? '/vendor/chats' : '/customer/chats'} active={isActive('/customer/chats') || isActive('/vendor/chats')}>
            Chat
          </NavLink>
          <NavLink href="/returns" active={isActive('/returns')}>
            Retur
          </NavLink>

          {(user.role === 'customer' || user.role === 'member' || user.role === 'vendor') && (
            <NavLink href="/complaints" active={isExactPath('/complaints')}>
              Komplain
            </NavLink>
          )}

          {(user.role === 'customer' || user.role === 'member' || user.role === 'vendor') && (
            <NavLink href="/riwayat-transaksi" active={isActive('/riwayat-transaksi')}>
              Riwayat Transaksi
            </NavLink>
          )}

          {(user.role === 'customer' || user.role === 'member') && (
            <>
              <NavLink href="/customer/invoices" active={isActive('/customer/invoices')}>
                Invoice
              </NavLink>
              <NavLink href="/customer/favorites" active={isActive('/customer/favorites')}>
                Favorit
              </NavLink>
            </>
          )}

          {user.role === 'vendor' && (
            <>
              <NavLink href="/vendor/invoices" active={isActive('/vendor/invoices')}>
                Invoice
              </NavLink>
              <NavLink href="/vendor/complaints" active={isActive('/vendor/complaints')}>
                Instruksi Complaint
              </NavLink>
              <NavLink href="/vendor/favorites" active={isActive('/vendor/favorites')}>
                Favorit
              </NavLink>
              <NavLink href="/vendor/produk" active={isActive('/vendor/produk')}>
                Barang/Jasa Saya
              </NavLink>
              <NavLink href="/vendor/tambah-produk" active={isActive('/vendor/tambah-produk')}>
                Tambahkan Barang/Jasa
              </NavLink>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <NavLink href="/admin/vendor-approval" active={isActive('/admin/vendor-approval')}>
                Verifikasi Vendor
              </NavLink>
              <NavLink href="/admin/customer-verification" active={isActive('/admin/customer-verification')}>
                Verifikasi Customer
              </NavLink>
              <NavLink href="/admin/transaction-verification" active={isActive('/admin/transaction-verification')}>
                Verifikasi Transaksi
              </NavLink>
              <NavLink href="/admin/complaints" active={isActive('/admin/complaints')}>
                Manajemen Keluhan
              </NavLink>
            </>
          )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', flex: '0 0 auto' }}>
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
                {String(user?.name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#333' }}>
                  {String(user?.name || user?.username || user?.email || 'User')}
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  {user?.role === 'customer' ? 'Customer' : user?.role === 'vendor' ? 'Vendor' : 'Admin'}
                </div>
              </div>
            </div>

            <Link
              href="/settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#F3F4F6',
                color: '#333',
                border: '1px solid #e5e7eb',
                padding: '8px 12px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              Profil Saya
            </Link>

            <button
              onClick={handleLogout}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

