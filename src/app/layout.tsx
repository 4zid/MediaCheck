import type { Metadata } from 'next';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { SupabaseProvider } from '@/providers/SupabaseProvider';

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MediaCheck - Verificacion de Hechos con IA',
  description: 'Verifica afirmaciones en tiempo real usando inteligencia artificial y fuentes verificadas. Anti-fake news impulsado por Claude AI.',
  keywords: ['fact-check', 'verificacion', 'noticias falsas', 'IA', 'MediaCheck'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${dmSerif.variable} ${dmSans.variable} font-body antialiased`}>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
