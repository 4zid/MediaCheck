import { createClient } from '@/lib/supabase/server';
import { ClaimDetail } from '@/components/claims/ClaimDetail';
import type { ClaimWithVerification } from '@/lib/types';
import { notFound } from 'next/navigation';

interface ClaimPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ClaimPageProps) {
  const supabase = createClient();
  const { data } = await supabase
    .from('claims')
    .select('content')
    .eq('id', params.id)
    .single();

  return {
    title: data ? `${data.content.slice(0, 60)}... - MediaCheck` : 'Verificacion - MediaCheck',
  };
}

export default async function ClaimPage({ params }: ClaimPageProps) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      verification:verifications(
        *,
        sources:verification_sources(*)
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const verArr = data.verification as Record<string, unknown>[];
  if (!verArr || verArr.length === 0) {
    notFound();
  }

  const claim: ClaimWithVerification = {
    ...data,
    verification: verArr[0] as unknown as ClaimWithVerification['verification'],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ClaimDetail claim={claim} />
      </div>
    </div>
  );
}
