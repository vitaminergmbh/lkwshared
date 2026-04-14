import { getSupabase } from '../supabase';
import type { Truck } from '../types';

export async function getAllTrucks(): Promise<Truck[]> {
  const { data, error } = await getSupabase()
    .from('trucks')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function getActiveTrucks(): Promise<Truck[]> {
  const { data, error } = await getSupabase()
    .from('trucks')
    .select('*')
    .eq('active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function getTruckById(id: string): Promise<Truck | null> {
  const { data, error } = await getSupabase()
    .from('trucks')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createTruck(
  data: Omit<Truck, 'id' | 'created_at'>
): Promise<Truck> {
  const { data: created, error } = await getSupabase()
    .from('trucks')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function updateTruck(
  id: string,
  data: Partial<Omit<Truck, 'id' | 'created_at'>>
): Promise<Truck> {
  const { data: updated, error } = await getSupabase()
    .from('trucks')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return updated;
}

export async function deleteTruck(id: string): Promise<void> {
  // Check if truck is used in any tours
  const { data: tourRef } = await getSupabase()
    .from('tours')
    .select('id')
    .eq('truck_id', id)
    .limit(1)
    .maybeSingle();

  if (tourRef) {
    throw new Error('LKW wird in einer Tour verwendet und kann nicht gelöscht werden.');
  }

  const { error } = await getSupabase()
    .from('trucks')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
