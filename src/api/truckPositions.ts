import { getSupabase } from '../supabase';
import type { TruckPosition } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TruckPositionRow {
  truck_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  battery: number | null;
  recorded_at: string;
  fetched_at: string;
  geofence_name?: string | null;
  geofence_since?: string | null;
}

function rowToPosition(row: TruckPositionRow): TruckPosition {
  return {
    truck_id: row.truck_id,
    latitude: row.latitude,
    longitude: row.longitude,
    speed: row.speed,
    battery: row.battery,
    timestamp: row.recorded_at,
    geofence_name: row.geofence_name ?? null,
    geofence_since: row.geofence_since ?? null,
  };
}

export async function getAllPositions(): Promise<Record<string, TruckPosition>> {
  const { data, error } = await getSupabase()
    .from('truck_positions')
    .select('*');
  if (error) throw new Error(error.message);
  const result: Record<string, TruckPosition> = {};
  for (const row of (data ?? []) as TruckPositionRow[]) {
    result[row.truck_id] = rowToPosition(row);
  }
  return result;
}

export function subscribeToPositions(
  onChange: (position: TruckPosition) => void
): RealtimeChannel {
  return getSupabase()
    .channel('realtime-truck-positions')
    .on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table: 'truck_positions' },
      (payload: { new: unknown }) => {
        const row = payload.new as TruckPositionRow | undefined;
        if (row && typeof row === 'object' && 'truck_id' in row) {
          onChange(rowToPosition(row));
        }
      }
    )
    .subscribe();
}

/**
 * Triggers the live-tracker edge function for a fresh boost-mode poll.
 * Cron-driven cycles run every minute regardless; this on-demand call is used
 * by the app when a live tour detail is open and faster updates are wanted.
 */
export async function triggerLiveTracker(): Promise<void> {
  const { error } = await getSupabase().functions.invoke('live-tracker', {
    body: { trigger: 'app-boost' },
  });
  if (error) throw new Error(error.message);
}
