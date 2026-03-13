'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Ini router khusus Next.js

export default function RegisterPage() {
  const router = useRouter(); 
  
  const [formData, setFormData] = useState({
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

    if (!formData.name || !formData.email || !formData.password) {
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
      {/* Sisi Kiri (Branding sama dengan Login) */}
      <div className="login-left">
        <h1>RentGuard</h1>
        <p>Platform penyewaan terpercaya — temukan vendor terbaik untuk semua kebutuhan sewa kamu</p>
        
        <div className="stats-container">
          <div className="stat-box"><h3>5K+</h3><p>Vendor</p></div>
          <div className="stat-box"><h3>50K+</h3><p>Item Sewa</p></div>
          <div className="stat-box"><h3>1M+</h3><p>Pengguna</p></div>
        </div>
      </div>

      {/* Sisi Kanan (Form) */}
      <div className="login-right">
        <div className="login-card">
          <h2>Daftar Akun Baru</h2>
          <p>Mulai perjalanan sewa kamu bersama RentGuard</p>

          {errorMsg && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Masukkan nama lengkap kamu" />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contoh@email.com" />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Buat password yang kuat" />
            </div>

            <div className="form-actions" style={{ marginBottom: '24px', alignItems: 'flex-start' }}>
              <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', lineHeight: '1.4' }}>
                <input type="checkbox" style={{ marginTop: '3px' }} required /> 
                <span style={{ color: '#666' }}>
                  Saya setuju dengan <a href="#syarat" style={{ color: '#6E38F7', textDecoration: 'none' }}>Syarat & Ketentuan</a>
                </span>
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Daftar Sekarang →'}
            </button>
          </form>

          <div className="register-link">
            {/* Menggunakan Link href dari Next.js */}
            Sudah punya akun? <Link href="/login">Masuk Sekarang</Link>
          </div>
        </div>
      </div>
    </div>
  );
}