import { getSupabase } from '../supabase';
import type { VehicleOdometer } from '../types';

export async function getAllOdometer(): Promise<VehicleOdometer[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_odometer')
    .select('*')
    .order('reading_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data as VehicleOdometer[];
}

export async function getOdometerForTruck(truckId: string): Promise<VehicleOdometer[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_odometer')
    .select('*')
    .eq('truck_id', truckId)
    .order('reading_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data as VehicleOdometer[];
}

export async function addOdometer(
  truckId: string,
  readingDate: string,
  km: number,
  note?: string | null,
): Promise<VehicleOdometer> {
  const { data, error } = await getSupabase()
    .from('vehicle_odometer')
    .insert({ truck_id: truckId, reading_date: readingDate, km, note: note ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VehicleOdometer;
}

export async function deleteOdometer(id: string): Promise<void> {
  const { error } = await getSupabase().from('vehicle_odometer').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
