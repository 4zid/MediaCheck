import { getActiveInvestigations } from '@/lib/investigations';

export async function GET() {
  try {
    const investigations = await getActiveInvestigations();
    return Response.json({ investigations });
  } catch (err) {
    console.error('Failed to fetch investigations:', err);
    return Response.json({ investigations: [] });
  }
}
