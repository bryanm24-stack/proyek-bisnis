import React from 'react';
import { Link } from 'react-router-dom';

const RegisterPage = () => {
  return (
    <div className="login-container">
      {/* Sisi Kiri (Branding - Sama persis dengan Login) */}
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

      {/* Sisi Kanan (Form Register) */}
      <div className="login-right">
        <div className="login-card">
          <h2>Daftar Akun Baru</h2>
          <p>Mulai perjalanan sewa kamu bersama RentGuard</p>

          <form>
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input type="text" placeholder="Masukkan nama lengkap kamu" />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="contoh@email.com" />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Buat password yang kuat" />
            </div>

            {/* Checkbox Syarat & Ketentuan */}
            <div className="form-actions" style={{ marginBottom: '24px', alignItems: 'flex-start' }}>
              <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', lineHeight: '1.4' }}>
                <input type="checkbox" style={{ marginTop: '3px' }} /> 
                <span style={{ color: '#666' }}>
                  Saya setuju dengan <a href="#syarat">Syarat & Ketentuan</a> serta <a href="#privasi">Kebijakan Privasi</a> dari RentGuard
                </span>
              </label>
            </div>

            <button type="button" className="btn-primary">Daftar Sekarang →</button>
          </form>

          <div className="register-link">
            Sudah punya akun? <Link to="/login">Masuk Sekarang</Link>
          </div>

          <div className="social-login">
            <button className="btn-social">Google</button>
            <button className="btn-social">Facebook</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;