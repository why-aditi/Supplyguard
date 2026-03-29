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
      className={`${inter.variable} ${chakraPetch.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body
        className="min-h-full overflow-x-hidden overflow-y-hidden bg-slate-950 font-sans text-slate-50 antialiased [background-image:radial-gradient(at_0%_0%,rgba(6,182,212,0.05)_0px,transparent_50%),radial-gradient(at_100%_100%,rgba(99,102,241,0.05)_0px,transparent_50%)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-950 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700"
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
