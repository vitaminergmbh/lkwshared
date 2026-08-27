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
  /** Fester Platz auf der Karte; von Hand gesetzt, nicht gefunkt. */
  latitude: number | null;
  longitude: number | null;
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
  latitude: number | null;
  longitude: number | null;
  /** Empfangsstaerke am Router in dBm; naeher an 0 ist besser. */
  rssi: number | null;
}

export interface WarehousePoint {
  sensor_id: string;
  recorded_at: string;
  temperature: number;
  humidity: number | null;
  battery_v: number | null;
}

/**
 * PostgREST liefert numeric als Zeichenkette. Fuer Anzeige reicht das, fuer
 * Rechnen und Kartenkoordinaten nicht — deshalb hier einmal sauber umwandeln,
 * statt an jeder Aufrufstelle Number() zu streuen.
 */
function alsZahl(wert: unknown): number | null {
  if (wert == null) return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
}

/** Aktueller Stand aller Fuehler, benannte zuerst. */
export async function getLatest(): Promise<WarehouseLatest[]> {
  const { data, error } = await getSupabase()
    .from('warehouse_latest')
    .select('*');
  if (error) throw new Error(error.message);

  return ((data ?? []) as WarehouseLatest[])
    .map((r) => ({
      ...r,
      temperature: alsZahl(r.temperature),
      humidity: alsZahl(r.humidity),
      battery_v: alsZahl(r.battery_v),
      min_c: alsZahl(r.min_c),
      max_c: alsZahl(r.max_c),
      latitude: alsZahl(r.latitude),
      longitude: alsZahl(r.longitude),
      rssi: alsZahl(r.rssi),
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'de'));
}

/** Fuehler mit festem Platz auf der Karte. */
export function withPosition(rows: WarehouseLatest[]): WarehouseLatest[] {
  return rows.filter((r) => r.active && r.latitude != null && r.longitude != null);
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

export type SensorPatch = Partial<
  Pick<WarehouseSensor, 'name' | 'active' | 'sort_order' | 'min_c' | 'max_c' | 'latitude' | 'longitude'>
>;

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
 * Empfangsqualitaet eines Fuehlers.
 *
 * Die Schwellen sind fuer BLE in einer Halle gewaehlt: bis -70 dBm steht die
 * Verbindung stabil, ab -85 reisst sie in der Praxis immer wieder ab. Der Wert
 * ist die Vorwarnung — ein Fuehler faellt selten ploetzlich aus, sein Signal
 * wird vorher schlechter (Batterie, neue Palettenreihe davor, Tuer zu).
 */
export type SignalState = 'gut' | 'mittel' | 'schwach' | 'unbekannt';

export function signalState(rssi: number | null | undefined): SignalState {
  if (rssi == null || !Number.isFinite(rssi)) return 'unbekannt';
  if (rssi >= -70) return 'gut';
  if (rssi >= -85) return 'mittel';
  return 'schwach';
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
