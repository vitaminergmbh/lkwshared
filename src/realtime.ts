import { getSupabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeHandlers<T> {
  onInsert?: (record: T) => void;
  onUpdate?: (record: T) => void;
  onDelete?: (old: { id: string }) => void;
}

export function subscribeToTable<T extends { id: string }>(
  table: string,
  handlers: RealtimeHandlers<T>
): RealtimeChannel {
  const channel = getSupabase()
    .channel(`realtime-${table}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table },
      (payload) => {
        if (handlers.onInsert) {
          handlers.onInsert(payload.new as T);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table },
      (payload) => {
        if (handlers.onUpdate) {
          handlers.onUpdate(payload.new as T);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table },
      (payload) => {
        if (handlers.onDelete) {
          handlers.onDelete(payload.old as { id: string });
        }
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel): void {
  getSupabase().removeChannel(channel);
}
