// INI BARIS YANG BIKIN TAMPILANNYA JADI CANTIK!
import './globals.css';
import SharedFooter from './components/SharedFooter';

export const metadata = {
  title: '🛡️ RentGuard - Platform Sewa',
  description: 'Temukan vendor terbaik untuk semua kebutuhan sewa kamu',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Main content area yang bisa grow */}
        <div style={{ flex: '1' }}>
          {/* 'children' di sini otomatis akan diisi oleh page.js (Login, Register, Home) */}
          {children}
        </div>
        {/* Footer akan selalu ada di bawah */}
        <SharedFooter />
      </body>
    </html>
  );
}