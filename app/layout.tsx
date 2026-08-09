import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LaserVoice AI — Machine Vibration Monitor',
  description: 'Futuristic Machine Vibration Monitoring & NASA IMS ML Diagnostics Platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
