'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function SharedNavbar() {
  const [user, setUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsHydrated(true);
    const userData = localStorage.getItem('user');

    if (!userData) {
      setUser(null);
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      setUser(null);
    }
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
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

  if (!isHydrated || !user) {
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
    </nav>
  );
}
