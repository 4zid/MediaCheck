import { getEconomicSnapshot } from '@/lib/argentina/economic';

export const revalidate = 300; // cache for 5 minutes

export async function GET() {
  try {
    const snapshot = await getEconomicSnapshot();
    return Response.json(snapshot);
  } catch (err) {
    console.error('Economic data error:', err);
    return Response.json({ dolares: [], inflacion: [], fetchedAt: new Date().toISOString() });
  }
}
