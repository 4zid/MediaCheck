import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recheckInvestigation } from '@/lib/investigations';

export const maxDuration = 60;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('placeholder')) return null;
  return createClient(url, key);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Check if manual recheck already used
  const { data: inv } = await supabase
    .from('investigations')
    .select('manual_recheck_used, status')
    .eq('id', id)
    .single();

  if (!inv) {
    return Response.json({ error: 'Investigation not found' }, { status: 404 });
  }

  if (inv.manual_recheck_used) {
    return Response.json({ error: 'Manual recheck already used' }, { status: 409 });
  }

  if (inv.status !== 'active') {
    return Response.json({ error: 'Investigation is not active' }, { status: 400 });
  }

  // Mark manual recheck as used
  await supabase
    .from('investigations')
    .update({ manual_recheck_used: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  // Run recheck
  await recheckInvestigation(id);

  return Response.json({ success: true });
}
