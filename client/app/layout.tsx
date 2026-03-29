import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import { chakraPetch, inter, jetbrainsMono } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'SupplyGuard AI — Supply Chain Disruption Detector',
  description:
    'Real-time supply chain intelligence platform. Detects disruptions via NLP, models ripple effects through supplier graphs, and generates AI-powered rerouting recommendations.',
  keywords: ['supply chain', 'disruption detection', 'AI', 'NLP', 'logistics', 'risk management'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${chakraPetch.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
