import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LaserVoice AI',
  description: 'A futuristic AI voice platform with signal intelligence, training, and speech reconstruction.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
