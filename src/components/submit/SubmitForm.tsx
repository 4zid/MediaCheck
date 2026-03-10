'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Link as LinkIcon, Type, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CATEGORIES, type ClaimCategory } from '@/lib/types';

export function SubmitForm() {
  const router = useRouter();
  const [claim, setClaim] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [category, setCategory] = useState<ClaimCategory>('other');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (claim.trim().length < 10) {
      setError('La afirmacion debe tener al menos 10 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim: claim.trim(),
          sourceUrl: sourceUrl.trim() || undefined,
          category,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al verificar');
      }

      const data = await res.json();
      if (data.claim?.id) {
        router.push(`/claim/${data.claim.id}`);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Claim text */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Type size={16} />
          Afirmacion a verificar
        </label>
        <textarea
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder='Ej: "El cambio climatico no es causado por la actividad humana"'
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">{claim.length} caracteres (minimo 10)</p>
      </div>

      {/* Source URL */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <LinkIcon size={16} />
          URL de la fuente (opcional)
        </label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://ejemplo.com/noticia"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Category */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Categoria
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                category === cat.value
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={loading || claim.trim().length < 10}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin mr-2" />
            Verificando con IA...
          </>
        ) : (
          <>
            <Send size={18} className="mr-2" />
            Verificar afirmacion
          </>
        )}
      </Button>

      {loading && (
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Buscando fuentes y analizando con Claude AI...
          </p>
          <div className="mt-2 flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </form>
  );
}
