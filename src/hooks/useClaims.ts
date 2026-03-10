'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/providers/SupabaseProvider';
import type { ClaimWithVerification, ClaimCategory, VerdictType } from '@/lib/types';

interface UseClaimsOptions {
  category?: ClaimCategory;
  verdict?: VerdictType;
  search?: string;
  dateRange?: string;
  limit?: number;
}

export function useClaims(options: UseClaimsOptions = {}) {
  const { supabase } = useSupabase();
  const [claims, setClaims] = useState<ClaimWithVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('claims')
        .select(`
          *,
          verification:verifications(
            *,
            sources:verification_sources(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(options.limit || 50);

      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.search) {
        query = query.ilike('content', `%${options.search}%`);
      }

      if (options.dateRange && options.dateRange !== 'all') {
        const now = new Date();
        let since: Date;
        switch (options.dateRange) {
          case '24h': since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
          case '7d': since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case '30d': since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
          default: since = new Date(0);
        }
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform: verification comes as array, take first
      const transformed: ClaimWithVerification[] = [];
      for (const item of data || []) {
        const verArr = (item as Record<string, unknown>).verification as Record<string, unknown>[];
        if (!verArr || verArr.length === 0) continue;
        transformed.push({
          ...(item as Record<string, unknown>),
          verification: verArr[0],
        } as unknown as ClaimWithVerification);
      }

      // Apply verdict filter client-side
      const filtered = options.verdict
        ? transformed.filter((c) => c.verification.verdict === options.verdict)
        : transformed;

      setClaims(filtered);
    } catch (err) {
      console.error('Error fetching claims:', err);
      setError('Error al cargar verificaciones');
    } finally {
      setLoading(false);
    }
  }, [supabase, options.category, options.verdict, options.search, options.dateRange, options.limit]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  return { claims, loading, error, refetch: fetchClaims };
}
