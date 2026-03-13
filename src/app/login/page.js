'use client';

import React from 'react';
import Link from 'next/link'; // Import Link versi Next.js

export default function LoginPage() {
  return (
    <div className="login-container">
      {/* Sisi Kiri */}
      <div className="login-left">
        <h1>RentGuard</h1>
        <p>Platform penyewaan terpercaya — temukan vendor terbaik untuk semua kebutuhan sewa kamu</p>
        
        <div className="stats-container">
          <div className="stat-box">
            <h3>5K+</h3>
            <p>Vendor</p>
          </div>
          <div className="stat-box">
            <h3>50K+</h3>
            <p>Item Sewa</p>
          </div>
          <div className="stat-box">
            <h3>1M+</h3>
            <p>Pengguna</p>
          </div>
        </div>
      </div>

      {/* Sisi Kanan */}
      <div className="login-right">
        <div className="login-card">
          <h2>Selamat Datang!</h2>
          <p>Masuk ke akun RentGuard kamu</p>

          <form>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="contoh@email.com" />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Masukkan password" />
            </div>

            <div className="form-actions">
              <label>
                <input type="checkbox" /> Ingat saya
              </label>
              <a href="#lupa" style={{ color: '#6E38F7', textDecoration: 'none', fontWeight: '500' }}>Lupa password?</a>
            </div>

            <button type="button" className="btn-primary">Masuk →</button>
          </form>

          <div className="register-link">
            {/* Menggunakan Link href dari Next.js */}
            Belum punya akun? <Link href="/register">Daftar Sekarang</Link>
          </div>

          <div className="social-login">
            <button className="btn-social">Google</button>
            <button className="btn-social">Facebook</button>
          </div>
        </div>
        <p className="terms-text">
          Dengan masuk, kamu menyetujui Syarat & Ketentuan dan Kebijakan Privasi RentGuard
        </p>
      </div>
    </div>
  );
}