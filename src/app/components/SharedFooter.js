'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SharedFooter() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      setUser(null);
    }
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      color: 'white',
      padding: '48px 24px 24px 24px',
      marginTop: '80px',
      borderTop: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Main Footer Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          {/* Brand Section */}
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '28px', lineHeight: '1' }}>🛡️</span>
              RentGuard
            </div>
            <p style={{ margin: '8px 0 16px 0', fontSize: '14px', opacity: 0.9 }}>
              Platform penyewaan terpercaya untuk semua kebutuhan Anda
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { icon: '📘', href: '#', label: 'Facebook' },
                { icon: '𝕏', href: '#', label: 'Twitter' },
                { icon: '📷', href: '#', label: 'Instagram' },
                { icon: '💼', href: '#', label: 'LinkedIn' }
              ].map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '18px',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.25)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.15)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                  title={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700' }}>
              Navigasi Cepat
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: '🏠 Home', href: '/' },
                ...(user?.role === 'vendor'
                  ? [
                      { label: '📦 Barang/Jasa Saya', href: '/vendor/produk' },
                      { label: '💬 Chat', href: '/vendor/chats' },
                      { label: '📋 Invoice', href: '/vendor/invoices' }
                    ]
                  : [
                      { label: '📝 Daftar Vendor', href: '/vendor/register' },
                      { label: '💬 Chat', href: '/customer/chats' },
                      { label: '📋 Invoice', href: '/customer/invoices' }
                    ])
              ].map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.paddingLeft = '8px';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255,255,255,0.85)';
                    e.target.style.paddingLeft = '0';
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Support & Info */}
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700' }}>
              Bantuan & Info
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: '❓ FAQ', href: '#' },
                { label: '📧 Hubungi Kami', href: 'mailto:support@rentguard.com' },
                { label: '📞 Telepon', href: 'tel:+62800123456' },
                { label: '📋 Kebijakan Privasi', href: '#' },
                { label: '⚖️ Syarat & Ketentuan', href: '#' }
              ].map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.paddingLeft = '8px';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255,255,255,0.85)';
                    e.target.style.paddingLeft = '0';
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'rgba(255,255,255,0.1)',
          margin: '32px 0'
        }} />

        {/* Bottom Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '13px',
          opacity: 0.85
        }}>
          <div>
            © {currentYear} <strong>RentGuard</strong>. Semua hak dilindungi.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.85)'}
            >
              Kebijakan Privasi
            </a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.85)'}
            >
              Syarat Penggunaan
            </a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.85)'}
            >
              Pengaturan Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
