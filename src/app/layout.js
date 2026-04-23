// INI BARIS YANG BIKIN TAMPILANNYA JADI CANTIK!
import './globals.css'; 

export const metadata = {
  title: '🛡️ RentGuard - Platform Sewa',
  description: 'Temukan vendor terbaik untuk semua kebutuhan sewa kamu',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        {/* 'children' di sini otomatis akan diisi oleh page.js (Login, Register, Home) */}
        {children}
      </body>
    </html>
  );
}