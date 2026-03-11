/**
 * Argentine economic data — DolarAPI + ArgentinaDatos.
 * No API keys required.
 */

export interface DolarQuote {
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export interface InflationEntry {
  fecha: string;
  valor: number;
}

export interface EconomicSnapshot {
  dolares: DolarQuote[];
  inflacion: InflationEntry[];
  fetchedAt: string;
}

/**
 * Fetch all dollar exchange rates from DolarAPI.
 * Returns: blue, oficial, MEP, CCL, tarjeta, etc.
 */
export async function fetchDollarRates(): Promise<DolarQuote[]> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares', {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    console.error('Failed to fetch DolarAPI');
    return [];
  }
}

/**
 * Fetch inflation index data from ArgentinaDatos.
 * Returns monthly inflation values.
 */
export async function fetchInflation(): Promise<InflationEntry[]> {
  try {
    const res = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion', {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Return last 6 months
    return Array.isArray(data) ? data.slice(-6) : [];
  } catch {
    console.error('Failed to fetch ArgentinaDatos inflation');
    return [];
  }
}

/**
 * Get a full economic snapshot (dollar + inflation).
 */
export async function getEconomicSnapshot(): Promise<EconomicSnapshot> {
  const [dolares, inflacion] = await Promise.all([
    fetchDollarRates(),
    fetchInflation(),
  ]);

  return {
    dolares,
    inflacion,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Get key rates for display (blue + oficial).
 */
export function getKeyRates(dolares: DolarQuote[]): { blue: DolarQuote | null; oficial: DolarQuote | null } {
  return {
    blue: dolares.find(d => d.nombre === 'Blue') || null,
    oficial: dolares.find(d => d.nombre === 'Oficial') || null,
  };
}
