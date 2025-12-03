import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/layout/Navigation';

export const metadata: Metadata = {
  title: 'Omega AI',
  description: 'Explore conversations, artifacts, and AI-generated content from Omega Discord Bot',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 min-h-screen">
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
