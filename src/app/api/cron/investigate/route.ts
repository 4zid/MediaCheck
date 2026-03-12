import { NextRequest } from 'next/server';
import { recheckInvestigation } from '@/lib/investigations';
import { manageCases } from '@/lib/argentina/case-manager';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use Argentina case manager to maintain exactly 3 active cases
    await manageCases();

    // Recheck all active investigations
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key && !url.includes('placeholder')) {
      const supabase = createClient(url, key);
      const { data: active } = await supabase
        .from('investigations')
        .select('id')
        .eq('status', 'active');

      if (active) {
        for (const inv of active) {
          await recheckInvestigation(inv.id);
        }
      }
    }

    return Response.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Cron investigation error:', err);
    return Response.json({ error: 'Cron failed' }, { status: 500 });
  }
}
