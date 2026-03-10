import type { Metadata } from 'next';
import './globals.css';
import { SupabaseProvider } from '@/providers/SupabaseProvider';

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
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
