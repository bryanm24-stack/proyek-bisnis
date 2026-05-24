'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

let cachedUserRaw = null;
let cachedUserSnapshot = null;

function readUserFromStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  const userData = localStorage.getItem('user');
  if (userData === cachedUserRaw) {
    return cachedUserSnapshot;
  }

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
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', listener);
  window.addEventListener('auth-change', listener);

  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('auth-change', listener);
  };
}

export default function SharedNavbar() {
  const user = useSyncExternalStore(subscribeAuth, readUserFromStorage, () => null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsError, setReturnsError] = useState('');
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
    if (!showReturns || !user) return;

    const fetchReturns = async () => {
      setReturnsLoading(true);
      setReturnsError('');

      try {
        const response = await fetch(`/api/returns?userId=${user.id}&userRole=${user.role}`);
        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(data.message || 'Gagal memuat retur');
        }

        setReturnItems(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        console.error('Error fetching return items:', error);
        setReturnItems([]);
        setReturnsError(error.message || 'Gagal memuat retur');
      } finally {
        setReturnsLoading(false);
      }
    };

    fetchReturns();
  }, [showReturns, user]);

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

  const isActive = (href) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const closeReturnsModal = () => {
    setShowReturns(false);
    setReturnsError('');
  };

  if (!user) {
    return null;
  }

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      borderBottom: '1px solid #e5e7eb',
      background: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      {/* Left Side - Logo */}
      <Link href="/" style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '24px', lineHeight: '1' }}>🛡️</span>
        RentGuard
      </Link>

      {/* Center - Navigation Links */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link 
          href="/" 
          style={{ 
            fontSize: '14px', 
            color: isActive('/') && pathname !== '/login' && pathname !== '/register' ? '#7c3aed' : '#666', 
            textDecoration: 'none', 
            fontWeight: isActive('/') && pathname !== '/login' && pathname !== '/register' ? '600' : '500',
            padding: '6px 12px',
            borderRadius: '6px',
            background: isActive('/') && pathname !== '/login' && pathname !== '/register' ? '#f0e6ff' : 'transparent'
          }}>
          🏠 Home
        </Link>

        <Link 
          href={user.role === 'vendor' ? '/vendor/chats' : '/customer/chats'} 
          style={{ 
            fontSize: '14px', 
            color: isActive('/customer/chats') || isActive('/vendor/chats') ? '#7c3aed' : '#666', 
            textDecoration: 'none', 
            fontWeight: isActive('/customer/chats') || isActive('/vendor/chats') ? '600' : '500',
            padding: '6px 12px',
            borderRadius: '6px',
            background: isActive('/customer/chats') || isActive('/vendor/chats') ? '#f0e6ff' : 'transparent'
          }}>
          💬 Chat
        </Link>

        {user.role === 'customer' && (
          <>
            <Link 
              href="/customer/invoices" 
              style={{ 
                fontSize: '14px', 
                color: isActive('/customer/invoices') ? '#7c3aed' : '#666', 
                textDecoration: 'none', 
                fontWeight: isActive('/customer/invoices') ? '600' : '500',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isActive('/customer/invoices') ? '#f0e6ff' : 'transparent'
              }}>
              📋 Invoice
            </Link>

            <Link 
              href="/customer/favorites" 
              style={{ 
                fontSize: '14px', 
                color: isActive('/customer/favorites') ? '#7c3aed' : '#666', 
                textDecoration: 'none', 
                fontWeight: isActive('/customer/favorites') ? '600' : '500',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isActive('/customer/favorites') ? '#f0e6ff' : 'transparent'
              }}>
              ❤️ Favorit
            </Link>
          </>
        )}

        {user.role === 'vendor' && (
          <>
            <Link 
              href="/vendor/invoices" 
              style={{ 
                fontSize: '14px', 
                color: isActive('/vendor/invoices') ? '#7c3aed' : '#666', 
                textDecoration: 'none', 
                fontWeight: isActive('/vendor/invoices') ? '600' : '500',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isActive('/vendor/invoices') ? '#f0e6ff' : 'transparent'
              }}>
              📋 Invoice
            </Link>

            <Link 
              href="/vendor/favorites" 
              style={{ 
                fontSize: '14px', 
                color: isActive('/vendor/favorites') ? '#7c3aed' : '#666', 
                textDecoration: 'none', 
                fontWeight: isActive('/vendor/favorites') ? '600' : '500',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isActive('/vendor/favorites') ? '#f0e6ff' : 'transparent'
              }}>
              ❤️ Favorit
            </Link>

            <Link 
              href="/vendor/produk" 
              style={{ 
                fontSize: '14px', 
                color: isActive('/vendor/produk') ? '#7c3aed' : '#666', 
                textDecoration: 'none', 
                fontWeight: isActive('/vendor/produk') ? '600' : '500',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isActive('/vendor/produk') ? '#f0e6ff' : 'transparent'
              }}>
              📦 Barang/Jasa Saya
            </Link>

            <Link 
              href="/vendor/tambah-produk" 
              style={{ 
                fontSize: '14px', 
                color: isActive('/vendor/tambah-produk') ? '#7c3aed' : '#666', 
                textDecoration: 'none', 
                fontWeight: isActive('/vendor/tambah-produk') ? '600' : '500',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isActive('/vendor/tambah-produk') ? '#f0e6ff' : 'transparent'
              }}>
              ➕ Tambahkan Barang/Jasa
            </Link>
          </>
        )}

        {user.role === 'admin' && (
          <>
            <Link 
              href="/admin/vendor-approval" 
              style={{ 
                fontSize: '14px', 
                color: isActive('/admin/vendor-approval') ? '#7c3aed' : '#666', 
                textDecoration: 'none', 
                fontWeight: isActive('/admin/vendor-approval') ? '600' : '500',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isActive('/admin/vendor-approval') ? '#f0e6ff' : 'transparent'
              }}>
              ✓ Verifikasi Vendor
            </Link>

            <Link 
              href="/admin/transaction-verification" 
              style={{ 
                fontSize: '14px', 
                color: isActive('/admin/transaction-verification') ? '#7c3aed' : '#666', 
                textDecoration: 'none', 
                fontWeight: isActive('/admin/transaction-verification') ? '600' : '500',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isActive('/admin/transaction-verification') ? '#f0e6ff' : 'transparent'
              }}>
              🪪 Verifikasi Transaksi
            </Link>
          </>
        )}
      </div>

      {/* Right Side - User Menu */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button
          onClick={() => setShowReturns(true)}
          style={{
            background: '#f8fafc',
            color: '#374151',
            border: '1px solid #d1d5db',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
          title="Lihat retur"
        >
          🧾 Retur
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '18px', 
              cursor: 'pointer',
              position: 'relative'
            }}
            title="Notifikasi">
            🔔
            {notifications.length > 0 && (
              <span style={{
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
                fontWeight: 'bold'
              }}>
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
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
              zIndex: 1000
            }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                  Tidak ada notifikasi
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
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
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}>
                      Hapus
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User Avatar & Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '50%',
            fontWeight: 'bold',
            minWidth: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {user.role === 'customer' ? 'Customer' : user.role === 'vendor' ? 'Vendor' : 'Admin'}
            </div>
          </div>
        </div>

        {/* Logout Button */}
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
            fontWeight: '600'
          }}>
          🚪 Logout
        </button>
      </div>

      {showReturns && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }} onClick={closeReturnsModal}>
          <div style={{
            width: 'min(720px, 100%)',
            maxHeight: '80vh',
            overflow: 'auto',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            border: '1px solid #e5e7eb'
          }} onClick={(event) => event.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 20px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>Barang Retur</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  Daftar retur untuk {user.role === 'vendor' ? 'vendor' : 'customer'} aktif
                </div>
              </div>
              <button
                onClick={closeReturnsModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                aria-label="Tutup retur"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {returnsLoading ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}>
                  Memuat data retur...
                </div>
              ) : returnsError ? (
                <div style={{ textAlign: 'center', color: '#b91c1c', padding: '24px 0' }}>
                  {returnsError}
                </div>
              ) : returnItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}>
                  Tidak ada barang yang direturkan
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {returnItems.map((item) => {
                    const statusLabel = item.returnStatus === 'completed'
                      ? 'Selesai'
                      : item.returnStatus === 'inspected'
                        ? 'Sudah Diinspeksi'
                        : item.returnStatus === 'pending_inspection'
                          ? 'Menunggu Inspeksi'
                          : item.returnStatus === 'returning'
                            ? 'Sedang Retur'
                            : 'Menunggu';

                    return (
                      <div key={item.id} style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        background: '#fafafa'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: '#111827' }}>
                              {item.service?.title || item.itemName || 'Item Retur'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                              {user.role === 'vendor'
                                ? `Customer: ${item.otherUser?.name || item.customerName || '-'}`
                                : `Vendor: ${item.otherUser?.name || item.vendorName || '-'}`}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                              Tanggal retur: {item.actualReturnDate || '-'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '6px 10px',
                              borderRadius: '999px',
                              background: '#f3e8ff',
                              color: '#7c3aed',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              {statusLabel}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                              Refund: Rp {(item.totalRefund || 0).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
