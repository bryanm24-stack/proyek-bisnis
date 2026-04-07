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
      {/* Sisi Kiri tetap sama */}
      <div className="login-left">
        <h1>RentGuard</h1>
        <p>Platform penyewaan terpercaya — temukan vendor terbaik untuk semua kebutuhan sewa kamu</p>
        <div className="stats-container">
          <div className="stat-box"><h3>5K+</h3><p>Vendor</p></div>
          <div className="stat-box"><h3>50K+</h3><p>Item Sewa</p></div>
          <div className="stat-box"><h3>1M+</h3><p>Pengguna</p></div>
        </div>
      </div>

      {/* Sisi Kanan dengan State */}
      <div className="login-right">
        <div className="login-card">
          <h2>Selamat Datang!</h2>
          <p>Masuk ke akun RentGuard kamu</p>

          {errorMsg && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contoh@email.com" />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Masukkan password" />
            </div>

            <div className="form-actions">
              <label><input type="checkbox" /> Ingat saya</label>
              <a href="#lupa" style={{ color: '#6E38F7', textDecoration: 'none', fontWeight: '500' }}>Lupa password?</a>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Masuk →'}
            </button>
          </form>

          <div className="register-link">
            Belum punya akun? <Link href="/register">Daftar Sekarang</Link>
          </div>
        </div>
      </div>
    </div>
  );
}