'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavbar from '@/app/components/SharedNavbar';
import { getNotificationTitle } from '@/lib/notificationTitles';
import styles from './notifications.module.css';

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }
      const parsed = JSON.parse(userData);
      setUser(parsed);
    } catch {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();

    // Polling setiap 15 detik untuk sinkronisasi real-time dengan navbar
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/notifications?userId=${user.id}`);
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        if (filter === 'unread') {
          // Jika di filter unread, langsung hapus dari state
          setNotifications(prev =>
            prev.filter(notif => notif.id !== notificationId)
          );
        } else {
          // Jika di filter all atau read, update status is_read
          setNotifications(prev =>
            prev.map(notif =>
              notif.id === notificationId ? { ...notif, is_read: 1 } : notif
            )
          );
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(notif =>
          fetch(`/api/notifications`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: notif.id })
          })
        )
      );

      if (filter === 'unread') {
        // Jika di filter unread, kosongkan semua
        setNotifications([]);
      } else {
        // Jika di filter all atau read, update semua status
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: 1 }))
        );
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Hapus semua notifikasi?')) return;

    try {
      await Promise.all(
        notifications.map(notif =>
          fetch(`/api/notifications?id=${notif.id}`, { method: 'DELETE' })
        )
      );
      setNotifications([]);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter(notif => !notif.is_read).length;

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat...</div>;
  }

  return (
    <div className={styles.page}>
      <SharedNavbar />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>🔔 Notifikasi</h1>
          <p className={styles.subtitle}>Kelola semua notifikasi Anda di sini</p>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles['stat-card']}>
            <div className={styles['stat-number']}>{unreadCount}</div>
            <div className={styles['stat-label']}>Belum Dibaca</div>
          </div>
          <div className={styles['stat-card']}>
            <div className={styles['stat-number']}>{notifications.filter(n => n.is_read).length}</div>
            <div className={styles['stat-label']}>Sudah Dibaca</div>
          </div>
          <div className={styles['stat-card']}>
            <div className={styles['stat-number']}>{notifications.length}</div>
            <div className={styles['stat-label']}>Total</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <div className={styles['filter-buttons']}>
            <button
              className={`${styles['filter-btn']} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              Semua ({notifications.length})
            </button>
            <button
              className={`${styles['filter-btn']} ${filter === 'unread' ? styles.active : ''}`}
              onClick={() => setFilter('unread')}
            >
              Belum Dibaca ({unreadCount})
            </button>
            <button
              className={`${styles['filter-btn']} ${filter === 'read' ? styles.active : ''}`}
              onClick={() => setFilter('read')}
            >
              Sudah Dibaca ({notifications.filter(n => n.is_read).length})
            </button>
          </div>

          {notifications.length > 0 && (
            <div className={styles['action-buttons']}>
              {unreadCount > 0 && (
                <button className={styles['btn-mark-all']} onClick={handleMarkAllAsRead}>
                  ✓ Tandai Semua Sudah Dibaca
                </button>
              )}
              <button className={styles['btn-delete-all']} onClick={handleDeleteAll}>
                🗑️ Hapus Semua
              </button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className={styles['notifications-list']}>
          {loading ? (
            <div className={styles.loading}>Memuat notifikasi...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className={styles['empty-state']}>
              <div className={styles['empty-icon']}>📭</div>
              <p>
                {filter === 'all'
                  ? 'Tidak ada notifikasi'
                  : filter === 'unread'
                  ? 'Semua notifikasi sudah dibaca'
                  : 'Tidak ada notifikasi yang sudah dibaca'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notif => (
              <div
                key={notif.id}
                className={`${styles['notification-item']} ${!notif.is_read ? styles.unread : ''}`}
              >
                <div className={styles['notification-content']}>
                  <div className={styles['notification-header']}>
                    <div>
                      <div className={styles['notification-type']}>{getNotificationTitle(notif.type)}</div>
                      <div className={styles['notification-time']}>
                        {new Date(notif.created_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                    {!notif.is_read && <div className={styles['unread-badge']}>●</div>}
                  </div>
                  <div className={styles['notification-message']}>
                    {notif.message}
                  </div>
                </div>

                <div className={styles['notification-actions']}>
                  {!notif.is_read && (
                    <button
                      className={styles['btn-mark']}
                      onClick={() => handleMarkAsRead(notif.id)}
                      title="Tandai sebagai sudah dibaca"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className={styles['btn-delete']}
                    onClick={() => handleDeleteNotification(notif.id)}
                    title="Hapus notifikasi"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
