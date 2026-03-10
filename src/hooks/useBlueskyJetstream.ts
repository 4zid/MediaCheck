'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface JetstreamPost {
  did: string;
  text: string;
  langs?: string[];
  createdAt: string;
}

interface UseBlueskyJetstreamOptions {
  /** Filter to these BCP-47 language codes, e.g. ['es', 'en']. Empty = all languages. */
  langs?: string[];
  onPost: (post: JetstreamPost) => void;
  enabled?: boolean;
}

const JETSTREAM_URL =
  'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';

/**
 * Subscribes to the Bluesky Jetstream firehose and calls `onPost` for each
 * new post that matches the given language filter.
 *
 * Automatically reconnects on disconnect with exponential back-off.
 */
export function useBlueskyJetstream({
  langs = [],
  onPost,
  enabled = true,
}: UseBlueskyJetstreamOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(1000);
  const onPostRef = useRef(onPost);
  onPostRef.current = onPost;

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(JETSTREAM_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.kind !== 'commit' || data.commit?.operation !== 'create') return;

        const record = data.commit?.record;
        if (!record?.text) return;

        const postLangs: string[] = record.langs ?? [];

        if (langs.length > 0 && !postLangs.some((l: string) => langs.includes(l))) return;

        onPostRef.current({
          did: data.did ?? '',
          text: record.text,
          langs: postLangs,
          createdAt: record.createdAt ?? new Date().toISOString(),
        });

        retryDelay.current = 1000; // reset on successful message
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      retryRef.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000);
        connect();
      }, retryDelay.current);
    };

    ws.onerror = () => ws.close();
  }, [langs]);

  useEffect(() => {
    if (!enabled) return;
    connect();

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [enabled, connect]);
}
