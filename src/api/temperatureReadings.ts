import { getSupabase } from '../supabase';
import type { TemperatureReading } from '../types';

/**
 * Historie der BLE-Temperaturfuehler. Geschrieben wird ausschliesslich vom
 * live-tracker (Edge Function); die App liest hier nur.
 */

export interface TemperatureRange {
  truckId: string;
  /** ISO-Zeitpunkt, ab dem gelesen wird (inklusive). */
  from: string;
  /** ISO-Zeitpunkt, bis zu dem gelesen wird (inklusive). Default: jetzt. */
  to?: string;
  /** Nur ein bestimmter Sensor-Slot. */
  slot?: number;
  /** Obergrenze der Zeilen (Default 5000). */
  limit?: number;
}

export async function getReadings({
  truckId,
  from,
  to,
  slot,
  limit = 5000,
}: TemperatureRange): Promise<TemperatureReading[]> {
  let query = getSupabase()
    .from('temperature_readings')
    .select('*')
    .eq('truck_id', truckId)
    .gte('recorded_at', from)
    .order('recorded_at', { ascending: true })
    .limit(limit);

  if (to) query = query.lte('recorded_at', to);
  if (slot != null) query = query.eq('slot', slot);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as TemperatureReading[];
}

/** Letzter bekannter Messwert je Sensor eines Fahrzeugs. */
export async function getLatestReadings(truckId: string): Promise<TemperatureReading[]> {
  const { data, error } = await getSupabase()
    .from('temperature_readings')
    .select('*')
    .eq('truck_id', truckId)
    .order('recorded_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);

  const bySlot = new Map<number, TemperatureReading>();
  for (const row of (data ?? []) as TemperatureReading[]) {
    if (!bySlot.has(row.slot)) bySlot.set(row.slot, row);
  }
  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}
