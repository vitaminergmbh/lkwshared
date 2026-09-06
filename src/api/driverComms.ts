import { getSupabase } from '../supabase';

/**
 * Fahrerseite, Rueckweg und Freigabe.
 *
 * Die Fahrerseite zeigt nicht die Arbeitsdaten der Tour, sondern den
 * zuletzt FREIGEGEBENEN Stand. So kann die Disposition an einer laufenden
 * Tour probieren — Stop umhaengen, Reihenfolge tauschen, rechnen lassen —
 * ohne dass der Fahrer jede Zwischenstufe nach 30 Sekunden auf dem Handy
 * hat. Erst die Freigabe schreibt den neuen Stand.
 *
 * Dazu Hinweise (mit Haken des Fahrers), Push-Abos und hochgeladene
 * Dokumente. Die Fahrerseite selbst spricht nur mit den Edge Functions
 * (fahrer-view, fahrer-upload); diese Funktionen hier sind fuer den Planer.
 */

export type DriverNoticeKind = 'info' | 'documents' | 'change';

export interface DriverTourRelease {
  id: string;
  tour_id: string;
  released_at: string;
  /** Tourzeile zum Zeitpunkt der Freigabe. */
  tour: Record<string, unknown>;
  /** Stopzeilen zum Zeitpunkt der Freigabe, in Reihenfolge. */
  stops: Record<string, unknown>[];
  /** Was sich gegenueber der vorigen Freigabe geaendert hat, eine Zeile je Punkt. */
  summary: string | null;
}

export interface DriverNotice {
  id: string;
  tour_id: string;
  kind: DriverNoticeKind;
  text: string;
  created_at: string;
  release_id: string | null;
  acknowledged_at: string | null;
  push_sent_at: string | null;
  push_result: string | null;
}

export interface DriverDocument {
  id: string;
  tour_id: string;
  stop_id: string | null;
  notice_id: string | null;
  path: string;
  name: string;
  mime: string | null;
  size: number | null;
  created_at: string;
}

const BUCKET = 'driver-uploads';

// ---------------------------------------------------------------- Freigabe

/** Die juengste Freigabe der Tour, oder null, wenn nie freigegeben. */
export async function getLatestRelease(tourId: string): Promise<DriverTourRelease | null> {
  const { data, error } = await getSupabase()
    .from('driver_tour_releases')
    .select('*')
    .eq('tour_id', tourId)
    .order('released_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as DriverTourRelease | null;
}

/**
 * Neuen Stand freigeben: Tour und Stops werden so gespeichert, wie sie
 * jetzt sind. Die Fahrerseite zeigt ab dem naechsten Abruf diesen Stand.
 */
export async function createRelease(
  tourId: string,
  tour: Record<string, unknown>,
  stops: Record<string, unknown>[],
  summary: string | null,
): Promise<DriverTourRelease> {
  const { data, error } = await getSupabase()
    .from('driver_tour_releases')
    .insert({ tour_id: tourId, tour, stops, summary })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const release = data as DriverTourRelease;
  // Kopie an der Tour, damit Listen ohne Join sehen, ob je freigegeben wurde.
  const { error: e2 } = await getSupabase()
    .from('tours')
    .update({ driver_released_at: release.released_at })
    .eq('id', tourId);
  if (e2) throw new Error(e2.message);
  return release;
}

// ---------------------------------------------------------------- Hinweise

export async function getNotices(tourId: string): Promise<DriverNotice[]> {
  const { data, error } = await getSupabase()
    .from('driver_notices')
    .select('*')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DriverNotice[];
}

/** Hinweise mehrerer Touren auf einmal (Leitstand), juengste zuerst. */
export async function getNoticesFor(tourIds: string[]): Promise<DriverNotice[]> {
  if (tourIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('driver_notices')
    .select('*')
    .in('tour_id', tourIds)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []) as DriverNotice[];
}

export async function createNotice(input: {
  tour_id: string;
  kind: DriverNoticeKind;
  text: string;
  release_id?: string | null;
}): Promise<DriverNotice> {
  const { data, error } = await getSupabase()
    .from('driver_notices')
    .insert({ tour_id: input.tour_id, kind: input.kind, text: input.text, release_id: input.release_id ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DriverNotice;
}

export async function deleteNotice(id: string): Promise<void> {
  const { error } = await getSupabase().from('driver_notices').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Push an den Fahrer ausloesen (Edge Function fahrer-push). Das Ergebnis
 * steht danach am Hinweis (push_sent_at / push_result); hier kommt nur
 * zurueck, was die Funktion meldet.
 */
export async function sendNoticePush(noticeId: string): Promise<{ sent: number; failed: number; detail: string }> {
  const { data, error } = await getSupabase().functions.invoke('fahrer-push', { body: { notice_id: noticeId } });
  if (error) throw new Error(error.message);
  return data as { sent: number; failed: number; detail: string };
}

// ---------------------------------------------------------------- Push-Abos

/** Wie viele Browser des Fahrers Push angenommen haben (0 = kein Push moeglich). */
export async function countPushSubscriptions(driverId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('driver_id', driverId)
    .is('failed_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ---------------------------------------------------------------- Dokumente

export async function getDocuments(tourId: string): Promise<DriverDocument[]> {
  const { data, error } = await getSupabase()
    .from('driver_documents')
    .select('*')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DriverDocument[];
}

/** Dokumente mehrerer Touren (Leitstand). */
export async function getDocumentsFor(tourIds: string[]): Promise<DriverDocument[]> {
  if (tourIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('driver_documents')
    .select('*')
    .in('tour_id', tourIds)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []) as DriverDocument[];
}

/** Signierter Link zum Oeffnen im Planer; der Bucket ist privat. */
export async function documentUrl(path: string, expiresInSeconds = 600): Promise<string> {
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/**
 * Signierte Links fuer viele Dateien auf einmal (Vorschaubilder je Stop).
 * Ein Aufruf statt einem je Datei; Pfad -> Link.
 */
export async function documentUrls(paths: string[], expiresInSeconds = 3600): Promise<Map<string, string>> {
  const raus = new Map<string, string>();
  const gefragt = [...new Set(paths)].filter(Boolean);
  if (gefragt.length === 0) return raus;
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrls(gefragt, expiresInSeconds);
  if (error) throw new Error(error.message);
  for (const z of data ?? []) {
    if (z.path && z.signedUrl) raus.set(z.path, z.signedUrl);
  }
  return raus;
}

export async function deleteDocument(doc: DriverDocument): Promise<void> {
  const { error: e1 } = await getSupabase().storage.from(BUCKET).remove([doc.path]);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await getSupabase().from('driver_documents').delete().eq('id', doc.id);
  if (e2) throw new Error(e2.message);
}
