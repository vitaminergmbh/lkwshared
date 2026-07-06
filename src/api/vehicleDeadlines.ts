import { getSupabase } from '../supabase';
import type { VehicleDeadline } from '../types';

export async function getAllDeadlines(): Promise<VehicleDeadline[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_deadlines')
    .select('*');
  if (error) throw new Error(error.message);
  return data as VehicleDeadline[];
}

export async function getDeadlinesForTruck(truckId: string): Promise<VehicleDeadline[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_deadlines')
    .select('*')
    .eq('truck_id', truckId);
  if (error) throw new Error(error.message);
  return data as VehicleDeadline[];
}

export interface DeadlinePatch {
  due_date?: string | null;
  interval_months?: number | null;
  last_done?: string | null;
  location_id?: string | null;
  note?: string | null;
}

/** Termin je (Fahrzeug, Art) anlegen oder aktualisieren. */
export async function upsertDeadline(
  truckId: string,
  kind: string,
  patch: DeadlinePatch,
): Promise<VehicleDeadline> {
  const { data, error } = await getSupabase()
    .from('vehicle_deadlines')
    .upsert(
      { truck_id: truckId, kind, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'truck_id,kind' },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VehicleDeadline;
}

export async function deleteDeadline(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('vehicle_deadlines')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
