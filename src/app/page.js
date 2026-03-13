import React from 'react';
import Link from 'next/link'; // Menggunakan Link bawaan Next.js

export default function HomePage() {
  const vendors = [
    {
      id: 1,
      title: "Penyewaan alat konstruksi berat dan ringan untuk proyek bangunan...",
      rating: 4.7,
      rentCount: "1.3K",
      images: ["https://images.unsplash.com/photo-1541888086425-d81bb19240f5?w=150&q=80", "https://images.unsplash.com/photo-1504307651254-35680f356f12?w=150&q=80", "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=150&q=80"],
    },
    {
      id: 2,
      title: "Penyewaan pakaian adat nusantara, baju pengantin, kostum...",
      rating: 4.8,
      rentCount: "3.8K",
      images: ["https://images.unsplash.com/photo-1595956553066-fe24a8c33395?w=150&q=80", "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=150&q=80", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&q=80"],
    },
    {
      id: 3,
      title: "Penyewaan ruang kantor, meeting room, studio foto...",
      rating: 4.9,
      rentCount: "2.6K",
      images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=150&q=80", "https://images.unsplash.com/photo-1582653291997-079a1c04e5d1?w=150&q=80", "https://images.unsplash.com/photo-1556761175-5973dc0f32b7?w=150&q=80"],
    }
  ];

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">RentGuard</div>
        <div className="nav-search">
          <input type="text" placeholder="Cari vendor, layanan sewa..." />
        </div>
        <div className="nav-actions">
          <span>🔔</span>
          <span>❤️</span>
          <span>📋</span>
          <div className="user-profile">
            <div style={{ background: '#ec4899', color: 'white', padding: '6px 12px', borderRadius: '50%', fontWeight: 'bold' }}>A</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Andi Pratama</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Member</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>Sewa Apa Saja,<br/>dari Vendor Terbaik</h1>
          <p>Ribuan vendor penyewaan terpercaya siap melayani kebutuhan sewa kamu</p>
          <div className="hero-buttons">
            <button className="btn-white">Cari Vendor Sekarang</button>
            <button className="btn-outline">Daftar sebagai Vendor</button>
            {/* Tombol ini akan mengarahkan user ke halaman Login */}
            <Link href="/login" className="btn-white" style={{marginLeft: '10px', background: '#333', color: 'white'}}>
              Masuk / Login
            </Link>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="trust-badges">
        <div className="badge">
          <h4>Vendor Terverifikasi</h4>
          <p>Semua vendor sudah diverifikasi</p>
        </div>
        <div className="badge">
          <h4>Sewa Aman</h4>
          <p>Dilindungi RentGuard Protection</p>
        </div>
        <div className="badge">
          <h4>Fleksibel & Cepat</h4>
          <p>Sewa harian, mingguan, bulanan</p>
        </div>
      </div>

      {/* Vendor List */}
      <div className="vendor-section">
        <div className="vendor-header">
          <h2>Semua Vendor</h2>
        </div>

        <div className="vendor-grid">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="vendor-card">
              <div className="vendor-cover">
                <img src={vendor.images[0]} alt="cover" />
              </div>
              <h3>{vendor.title}</h3>
              
              <div className="vendor-info">
                <span>⭐ {vendor.rating}</span>
                <span style={{ color: 'green' }}>↗ {vendor.rentCount} disewa</span>
              </div>

              <button className="btn-secondary">Lihat Layanan Sewa</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}