'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { readData, writeData } from '@/lib/storage';
// Ini router khusus Next.js

export default function RegisterPage() {
  const router = useRouter(); 
  
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: ''
  });
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.username || !formData.name || !formData.email || !formData.password) {
      setErrorMsg('Semua kolom wajib diisi!');
      return;
    }

    setIsLoading(true);

    try {
      // Menembak API Next.js kita sendiri
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Pendaftaran berhasil! Silakan login.');
        router.push('/login');
      } else {
        setErrorMsg(data.message || 'Gagal mendaftar');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      {/* Sisi Kiri - Branding */}
      <div className="login-left">
        <div className="login-branding">
          <h1>🛡️ RentGuard</h1>
          <h2>Mulai perjalanan sewa kamu bersama 🛡️ RentGuard</h2>
          <p>Bergabunglah dengan ribuan pengguna yang sudah mempercayai kami</p>
          
          <div className="benefits">
            <div className="benefit-item">
              <span className="check-icon">✓</span>
              <span>Vendor terverifikasi & terpercaya</span>
            </div>
            <div className="benefit-item">
              <span className="check-icon">✓</span>
              <span>Proses sewa yang mudah & aman</span>
            </div>
            <div className="benefit-item">
              <span className="check-icon">✓</span>
              <span>Dukungan pelanggan 24/7</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sisi Kanan - Form */}
      <div className="login-right">
        <div className="login-card">
          <div className="form-header">
            <h2>Daftar Akun Baru</h2>
            <p>Mulai perjalanan sewa kamu bersama 🛡️ RentGuard</p>
          </div>

          {errorMsg && (
            <div className="error-message">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <div className="input-wrapper">
                <span className="input-icon">🎫</span>
                <input 
                  type="text" 
                  name="username" 
                  value={formData.username} 
                  onChange={handleChange} 
                  placeholder="Masukkan username unik"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Nama Lengkap</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="Masukkan nama lengkap kamu"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="contoh@email.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔐</span>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder="Buat password yang kuat"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <label className="terms-checkbox">
                <input type="checkbox" required /> 
                <span>Saya setuju dengan <a href="#">Syarat & Ketentuan</a> dan <a href="#">Kebijakan Privasi</a></span>
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Daftar Sekarang →'}
            </button>
          </form>

          <div className="divider">
            <span>ATAU</span>
          </div>

          <button type="button" className="btn-google">
            <span>🔍</span> Daftar dengan Google
          </button>

          <div className="register-link">
            Sudah punya akun? <Link href="/login">Masuk Sekarang</Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          height: 100vh;
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 50%, #8F6B4A 100%);
          font-family: system-ui, -apple-system, sans-serif;
        }

        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 60px 40px;
          color: white;
        }

        .login-branding {
          max-width: 400px;
        }

        .logo {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .login-left h1 {
          font-size: 48px;
          font-weight: 700;
          margin: 0 0 12px 0;
          letter-spacing: -1px;
        }

        .login-left h2 {
          font-size: 32px;
          font-weight: 600;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .login-left p {
          font-size: 16px;
          opacity: 0.9;
          margin: 0 0 40px 0;
          line-height: 1.6;
        }

        .benefits {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 40px;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          opacity: 0.95;
        }

        .check-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .login-right {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px;
          background: white;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
        }

        .form-header {
          margin-bottom: 32px;
        }

        .form-header h2 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #1a1a1a;
        }

        .form-header p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 13px;
          border-left: 4px solid #dc2626;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          font-size: 16px;
          pointer-events: none;
        }

        .form-group input {
          width: 100%;
          padding: 12px 12px 12px 42px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
          background: white;
        }

        .form-group input:focus {
          outline: none;
          border-color: #B28A67;
          box-shadow: 0 0 0 3px rgba(178, 138, 103, 0.1);
        }

        .form-actions {
          margin-bottom: 24px;
        }

        .terms-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          color: #666;
          line-height: 1.5;
        }

        .terms-checkbox input {
          cursor: pointer;
          width: 16px;
          height: 16px;
          accent-color: #B28A67;
          margin-top: 3px;
          flex-shrink: 0;
        }

        .terms-checkbox a {
          color: #B28A67;
          text-decoration: none;
          font-weight: 500;
        }

        .terms-checkbox a:hover {
          opacity: 0.7;
        }

        .btn-primary {
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, #C8A587 0%, #B28A67 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 16px;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(178, 138, 103, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          color: #999;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #ddd;
        }

        .btn-google {
          width: 100%;
          padding: 12px 16px;
          background: white;
          color: #1a1a1a;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          margin-bottom: 24px;
        }

        .btn-google:hover {
          background: #f9f9f9;
          border-color: #bbb;
        }

        .register-link {
          text-align: center;
          font-size: 14px;
          color: #666;
        }

        .register-link a {
          color: #B28A67;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .register-link a:hover {
          opacity: 0.7;
        }

        @media (max-width: 1024px) {
          .login-left {
            padding: 40px 30px;
          }

          .login-left h2 {
            font-size: 24px;
          }
        }

        @media (max-width: 768px) {
          .login-container {
            flex-direction: column;
          }

          .login-left {
            padding: 40px 24px;
            justify-content: flex-start;
            padding-top: 30px;
          }

          .login-left h2 {
            font-size: 20px;
          }

          .login-left p {
            font-size: 14px;
          }

          .login-right {
            padding: 24px;
          }

          .login-card {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}