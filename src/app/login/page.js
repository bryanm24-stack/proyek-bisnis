'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.email || !formData.password) {
      setErrorMsg('Email dan password wajib diisi!');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Selamat datang, ${data.user.name}!`);
        // Simpan user ke localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/'); // Arahkan ke halaman utama
      } else {
        setErrorMsg(data.message || 'Gagal login');
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
          <div className="logo">🛡️</div>
          <h1>🛡️ RentGuard</h1>
          <h2>Platform penyewaan terpercaya</h2>
          <p>Temukan vendor terbaik untuk semua kebutuhan sewa kamu</p>
          
          <div className="stats-container">
            <div className="stat-box">
              <div className="stat-number">5K+</div>
              <div className="stat-label">Vendor</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">50K+</div>
              <div className="stat-label">Item Sewa</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">1M+</div>
              <div className="stat-label">Pengguna</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sisi Kanan - Form */}
      <div className="login-right">
        <div className="login-card">
          <div className="form-header">
            <h2>Selamat Datang!</h2>
            <p>Masuk ke akun 🛡️ RentGuard kamu</p>
          </div>

          {errorMsg && (
            <div className="error-message">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
                  placeholder="Masukkan password"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <label className="remember-checkbox">
                <input type="checkbox" /> 
                <span>Ingat saya</span>
              </label>
              <a href="#lupa" className="forgot-link">Lupa password?</a>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Masuk →'}
            </button>
          </form>

          <div className="divider">
            <span>ATAU</span>
          </div>

          <button type="button" className="btn-google">
            <span>🔍</span> Masuk dengan Google
          </button>

          <div className="register-link">
            Belum punya akun? <Link href="/register">Daftar Sekarang</Link>
          </div>

          <p className="terms">
            Dengan masuk, Anda menyetujui <a href="#">Syarat & Ketentuan</a> dan <a href="#">Kebijakan Privasi</a>
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          height: 100vh;
          background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #1e3a8a 100%);
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

        .stats-container {
          display: flex;
          gap: 20px;
          margin-top: 40px;
        }

        .stat-box {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 20px 24px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          flex: 1;
        }

        .stat-number {
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 13px;
          opacity: 0.9;
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
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          font-size: 13px;
        }

        .remember-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          color: #1a1a1a;
        }

        .remember-checkbox input {
          cursor: pointer;
          width: 16px;
          height: 16px;
          accent-color: #7c3aed;
        }

        .forgot-link {
          color: #7c3aed;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .forgot-link:hover {
          opacity: 0.7;
        }

        .btn-primary {
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
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
          box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
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
          margin-bottom: 16px;
        }

        .register-link a {
          color: #7c3aed;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .register-link a:hover {
          opacity: 0.7;
        }

        .terms {
          font-size: 11px;
          color: #999;
          text-align: center;
          margin: 0;
        }

        .terms a {
          color: #7c3aed;
          text-decoration: none;
        }

        @media (max-width: 1024px) {
          .login-left {
            padding: 40px 30px;
          }

          .login-left h2 {
            font-size: 24px;
          }

          .stats-container {
            flex-wrap: wrap;
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