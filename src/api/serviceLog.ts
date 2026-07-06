import { getSupabase } from '../supabase';
import type { VehicleServiceLog } from '../types';

export async function getAllServiceLogs(): Promise<VehicleServiceLog[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_service_log')
    .select('*')
    .order('service_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data as VehicleServiceLog[];
}

export async function getServiceLogsForTruck(truckId: string): Promise<VehicleServiceLog[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_service_log')
    .select('*')
    .eq('truck_id', truckId)
    .order('service_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data as VehicleServiceLog[];
}

export interface ServiceLogPatch {
  service_date?: string;
  description?: string;
  workshop?: string | null;
  cost?: number | null;
  odometer_km?: number | null;
  note?: string | null;
  file_path?: string | null;
  file_name?: string | null;
}

export async function createServiceLog(truckId: string, patch: ServiceLogPatch): Promise<VehicleServiceLog> {
  const { data, error } = await getSupabase()
    .from('vehicle_service_log')
    .insert({ truck_id: truckId, ...patch })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VehicleServiceLog;
}

export async function updateServiceLog(id: string, patch: ServiceLogPatch): Promise<VehicleServiceLog> {
  const { data, error } = await getSupabase()
    .from('vehicle_service_log')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VehicleServiceLog;
}

export async function deleteServiceLog(id: string, filePath?: string | null): Promise<void> {
  if (filePath) {
    try {
      await getSupabase().storage.from('vehicle-docs').remove([filePath]);
    } catch { /* Datei evtl. schon weg */ }
  }
  const { error } = await getSupabase().from('vehicle_service_log').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
