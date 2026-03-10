'use client';

import { useState, useCallback, useRef } from 'react';
import type { VerificationStep, VerificationStatus, FactCheckResult } from '@/lib/types';

interface VerificationResult {
  claimId?: string;
  verdict: string;
  confidence: number;
  summary: string;
  analysis: string;
  sources: FactCheckResult['sources'];
  created_at?: string;
}

interface UseVerificationReturn {
  status: VerificationStatus;
  steps: VerificationStep[];
  result: VerificationResult | null;
  error: string | null;
  verify: (url: string, claim: string) => Promise<void>;
  reset: () => void;
}

export function useVerification(): UseVerificationReturn {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [steps, setSteps] = useState<VerificationStep[]>([]);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setStatus('idle');
    setSteps([]);
    setResult(null);
    setError(null);
  }, []);

  const verify = useCallback(async (url: string, claim: string) => {
    // Reset state
    setSteps([]);
    setResult(null);
    setError(null);
    setStatus('checking_cache');

    try {
      // Step 1: Check cache
      const cacheRes = await fetch(`/api/verify?url=${encodeURIComponent(url)}`);
      const cacheData = await cacheRes.json();

      if (cacheData.cached) {
        setResult(cacheData.result);
        setStatus('cached');
        return;
      }

      // Step 2: Stream verification
      setStatus('verifying');

      abortRef.current = new AbortController();

      const res = await fetch('/api/verify-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, sourceUrl: url }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream reader');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));

              if (currentEvent === 'step') {
                const step: VerificationStep = {
                  step: data.step,
                  label: data.label,
                  data: data.data,
                };
                setSteps((prev) => [...prev, step]);

                if (data.step === 'complete' && data.data) {
                  setResult({
                    claimId: data.data.claimId,
                    verdict: data.data.verdict,
                    confidence: data.data.confidence,
                    summary: data.data.summary,
                    analysis: data.data.analysis,
                    sources: data.data.sources || [],
                  });
                  setStatus('complete');
                }
              } else if (currentEvent === 'error') {
                setError(data.message);
                setStatus('error');
              }
            } catch {
              // Skip malformed JSON
            }
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Verification error:', err);
      setError('Error al verificar. Intenta de nuevo.');
      setStatus('error');
    }
  }, []);

  return { status, steps, result, error, verify, reset };
}
