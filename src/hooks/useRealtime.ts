'use client';

import { useEffect } from 'react';
import { useSupabase } from '@/providers/SupabaseProvider';

export function useRealtime(table: string, onInsert: () => void) {
  const { supabase } = useSupabase();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table },
        () => {
          onInsert();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, table, onInsert]);
}
