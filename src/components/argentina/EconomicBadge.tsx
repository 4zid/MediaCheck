'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DolarQuote {
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

interface EconomicData {
  dolares: DolarQuote[];
  inflacion: { fecha: string; valor: number }[];
  fetchedAt: string;
}

export function EconomicBadge() {
  const [data, setData] = useState<EconomicData | null>(null);

  useEffect(() => {
    fetch('/api/argentina/economic')
      .then(res => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || data.dolares.length === 0) return null;

  const blue = data.dolares.find(d => d.nombre === 'Blue');
  const oficial = data.dolares.find(d => d.nombre === 'Oficial');
  const lastInflation = data.inflacion[data.inflacion.length - 1];

  if (!blue && !oficial) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 glass rounded-xl animate-fade-in">
      {blue && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/25 uppercase tracking-wider">Blue</span>
          <span className="text-[13px] font-headline font-bold text-accent-light tabular-nums">
            ${blue.venta.toLocaleString('es-AR')}
          </span>
        </div>
      )}

      {oficial && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/25 uppercase tracking-wider">Oficial</span>
          <span className="text-[13px] font-headline font-semibold text-white/50 tabular-nums">
            ${oficial.venta.toLocaleString('es-AR')}
          </span>
        </div>
      )}

      {lastInflation && (
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-white/25 uppercase tracking-wider">IPC</span>
          <span className={`text-[12px] font-medium tabular-nums flex items-center gap-0.5 ${
            lastInflation.valor > 5 ? 'text-red-400/70' : 'text-emerald-400/70'
          }`}>
            {lastInflation.valor > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {lastInflation.valor.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
