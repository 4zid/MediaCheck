import { ShieldCheck } from 'lucide-react';
import { SubmitForm } from '@/components/submit/SubmitForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Verificar Afirmacion - MediaCheck',
  description: 'Envia una afirmacion para ser verificada con IA en tiempo real',
};

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al timeline
        </Link>

        <div className="text-center mb-8">
          <ShieldCheck className="mx-auto text-indigo-600 dark:text-indigo-400 mb-3" size={48} />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Verificar una afirmacion
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Pega un texto o URL y nuestro sistema de IA lo verificara contra fuentes confiables en tiempo real
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
          <SubmitForm />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto">
            MediaCheck usa Claude AI para analizar afirmaciones. Los resultados son orientativos y deben contrastarse con criterio propio.
          </p>
        </div>
      </div>
    </div>
  );
}
