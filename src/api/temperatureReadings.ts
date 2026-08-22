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

/** Ein verdichteter Punkt der Messreihe (Mittelwert eines Zeitfensters). */
export interface TemperaturePoint {
  slot: number;
  recorded_at: string;
  temperature: number;
  humidity: number | null;
  battery_v: number | null;
}

export interface TemperatureSeriesRange {
  truckId: string;
  from: string;
  to: string;
  /** Fenstergroesse in Minuten; 1 entspricht den Rohwerten. */
  bucketMinutes?: number;
}

/**
 * Verdichtete Messreihe ueber die Datenbankfunktion `temperature_series`.
 *
 * PostgREST liefert hoechstens 1000 Zeilen pro Abfrage — bei einem Messwert je
 * Minute und Fuehler reicht das nicht einmal fuer einen Tag, die Kurve waere
 * stillschweigend abgeschnitten. Die Funktion mittelt deshalb serverseitig in
 * Zeitfenster; `bucketMinutesFor` waehlt das Fenster passend zum Zeitraum.
 */
export async function getSeries({
  truckId,
  from,
  to,
  bucketMinutes = 1,
}: TemperatureSeriesRange): Promise<TemperaturePoint[]> {
  const { data, error } = await getSupabase().rpc('temperature_series', {
    p_truck_id: truckId,
    p_from: from,
    p_to: to,
    p_bucket_minutes: Math.max(1, Math.round(bucketMinutes)),
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as TemperaturePoint[];
}

/**
 * Fenstergroesse, die den Zeitraum unter ~900 Punkte je Abfrage haelt.
 * `slots` ist die erwartete Zahl an Fuehlern (Teltonika: bis zu 4).
 */
export function bucketMinutesFor(fromIso: string, toIso: string, slots = 4): number {
  const minutes = Math.max(1, (Date.parse(toIso) - Date.parse(fromIso)) / 60_000);
  return Math.max(1, Math.ceil((minutes * slots) / 900));
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
