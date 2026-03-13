import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

// Import komponen yang sudah dibuat
import LoginPage from './components/LoginPage';
// Asumsi kode tampilan utama tadi disimpan sebagai HomePage.jsx
import HomePage from './components/HomePage'; 
import RegisterPage from './components/RegisterPage'

// Import komponen lain yang ada di folder Anda (sebagai contoh)
// import RegisterPage from './components/RegisterPage';
// import AdminHome from './components/AdminHome';

function App() {
  return (
    // Gunakan HashRouter untuk aplikasi Electron
    <Router>
      <div className="w-full min-h-screen bg-gray-50 text-gray-900">
        <Routes>
          {/* Halaman utama (Home) akan muncul pertama kali saat aplikasi dibuka */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/homepage" element={<HomePage />} />
          
         

          {/* Anda bisa menambahkan route lain dari folder components Anda di sini nantinya */}
          {/* <Route path="/register" element={<RegisterPage />} /> */}
          {/* <Route path="/admin" element={<AdminHome />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
