import { getSupabase } from '../supabase';

/**
 * Stationaere Temperaturfuehler im Lager.
 *
 * Geschrieben werden die Messwerte ausschliesslich von der Edge Function
 * `lager-temperatur`, an die der RUTX10 sendet. Die App liest hier und pflegt
 * nur die Stammdaten der Fuehler (Name, Sollbereich, sichtbar ja/nein).
 */

export interface WarehouseSensor {
  id: string;
  mac: string;
  name: string;
  active: boolean;
  sort_order: number;
  min_c: number | null;
  max_c: number | null;
  last_seen_at: string | null;
  created_at: string;
}

/** Fuehler samt seinem letzten Messwert — die Frage der Uebersicht. */
export interface WarehouseLatest {
  sensor_id: string;
  mac: string;
  name: string;
  active: boolean;
  sort_order: number;
  min_c: number | null;
  max_c: number | null;
  last_seen_at: string | null;
  temperature: number | null;
  humidity: number | null;
  battery_v: number | null;
  recorded_at: string | null;
}

export interface WarehousePoint {
  sensor_id: string;
  recorded_at: string;
  temperature: number;
  humidity: number | null;
  battery_v: number | null;
}

/** Aktueller Stand aller Fuehler, benannte zuerst. */
export async function getLatest(): Promise<WarehouseLatest[]> {
  const { data, error } = await getSupabase()
    .from('warehouse_latest')
    .select('*');
  if (error) throw new Error(error.message);

  return ((data ?? []) as WarehouseLatest[]).sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'de'),
  );
}

export async function listSensors(): Promise<WarehouseSensor[]> {
  const { data, error } = await getSupabase()
    .from('warehouse_sensors')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as WarehouseSensor[];
}

export type SensorPatch = Partial<Pick<WarehouseSensor, 'name' | 'active' | 'sort_order' | 'min_c' | 'max_c'>>;

export async function updateSensor(id: string, patch: SensorPatch): Promise<WarehouseSensor> {
  const { data, error } = await getSupabase()
    .from('warehouse_sensors')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as WarehouseSensor;
}

export async function deleteSensor(id: string): Promise<void> {
  const { error } = await getSupabase().from('warehouse_sensors').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface WarehouseSeriesRange {
  sensorIds: string[];
  from: string;
  to: string;
  /** Fenstergroesse in Minuten; die Messwerte selbst kommen im Routertakt. */
  bucketMinutes?: number;
}

/**
 * Verdichtete Messreihe ueber die Datenbankfunktion `warehouse_series`.
 * Gleicher Grund wie bei den Fahrzeugen: PostgREST liefert hoechstens 1000
 * Zeilen, ein Fuehler im 5-Minuten-Takt fuellt die in gut drei Tagen.
 */
export async function getSeries({
  sensorIds,
  from,
  to,
  bucketMinutes = 5,
}: WarehouseSeriesRange): Promise<WarehousePoint[]> {
  if (sensorIds.length === 0) return [];
  const { data, error } = await getSupabase().rpc('warehouse_series', {
    p_sensor_ids: sensorIds,
    p_from: from,
    p_to: to,
    p_bucket_minutes: Math.max(1, Math.round(bucketMinutes)),
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as WarehousePoint[];
}

/** Fenstergroesse, die den Zeitraum unter ~900 Punkte je Abfrage haelt. */
export function bucketMinutesFor(fromIso: string, toIso: string, sensors = 4): number {
  const minutes = Math.max(1, (Date.parse(toIso) - Date.parse(fromIso)) / 60_000);
  return Math.max(1, Math.ceil((minutes * sensors) / 900));
}

/**
 * Bewertung eines Messwerts gegen den hinterlegten Sollbereich.
 * Ohne Grenzen gibt es keine Ampel — dann ist jeder Wert nur eine Zahl.
 */
export type WarehouseState = 'ok' | 'warn' | 'unknown';

export function rangeState(row: Pick<WarehouseLatest, 'temperature' | 'min_c' | 'max_c'>): WarehouseState {
  const t = row.temperature;
  if (t == null || !Number.isFinite(Number(t))) return 'unknown';
  if (row.min_c == null && row.max_c == null) return 'unknown';
  const v = Number(t);
  if (row.min_c != null && v < Number(row.min_c)) return 'warn';
  if (row.max_c != null && v > Number(row.max_c)) return 'warn';
  return 'ok';
}

/**
 * Gilt der Wert noch als aktuell?
 *
 * Der Router sendet in festem Takt; bleibt eine Meldung aus, ist entweder der
 * Fuehler ausser Reichweite oder die Batterie leer. Ein alter Wert sieht sonst
 * aus wie ein gueltiger — genau der Fehler, den eine Kuehlraumanzeige nicht
 * machen darf.
 */
export function isStale(recordedAt: string | null, maxAgeMinutes = 20): boolean {
  if (!recordedAt) return true;
  const t = Date.parse(recordedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > maxAgeMinutes * 60_000;
}
