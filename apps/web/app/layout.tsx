import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Omega Web',
  description: 'Omega Discord Bot Web Interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
