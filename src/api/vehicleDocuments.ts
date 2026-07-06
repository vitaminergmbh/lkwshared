import { getSupabase } from '../supabase';
import type { VehicleDocument } from '../types';

const BUCKET = 'vehicle-docs';

export async function getAllDocuments(): Promise<VehicleDocument[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_documents')
    .select('*')
    .order('sort_order')
    .order('title');
  if (error) throw new Error(error.message);
  return data as VehicleDocument[];
}

export async function getDocumentsForTruck(truckId: string): Promise<VehicleDocument[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_documents')
    .select('*')
    .eq('truck_id', truckId)
    .order('sort_order')
    .order('title');
  if (error) throw new Error(error.message);
  return data as VehicleDocument[];
}

export interface DocumentPatch {
  title?: string;
  value?: string | null;
  note?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  sort_order?: number;
}

export async function createDocument(truckId: string, patch: DocumentPatch): Promise<VehicleDocument> {
  const { data, error } = await getSupabase()
    .from('vehicle_documents')
    .insert({ truck_id: truckId, ...patch, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VehicleDocument;
}

export async function updateDocument(id: string, patch: DocumentPatch): Promise<VehicleDocument> {
  const { data, error } = await getSupabase()
    .from('vehicle_documents')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VehicleDocument;
}

export async function deleteDocument(id: string, filePath?: string | null): Promise<void> {
  if (filePath) {
    try {
      await getSupabase().storage.from(BUCKET).remove([filePath]);
    } catch { /* Datei evtl. schon weg — Zeile trotzdem löschen */ }
  }
  const { error } = await getSupabase().from('vehicle_documents').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// === Datei-Speicher (privater Bucket, Zugriff über signierte URLs) ===

export async function uploadDocumentFile(truckId: string, file: File): Promise<{ path: string; name: string }> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${truckId}/${Date.now()}_${safe}`;
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return { path, name: file.name };
}

export async function getDocumentSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function removeDocumentFile(path: string): Promise<void> {
  const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
