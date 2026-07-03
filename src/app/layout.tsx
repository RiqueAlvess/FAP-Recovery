import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { NavBar } from '@/components/nav-bar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

export const metadata: Metadata = {
  title: 'FAP Recovery',
  description: 'Diagnóstico, contestação e recuperação de créditos do FAP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <NavBar />
        <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
      </body>
    </html>
  );
}
