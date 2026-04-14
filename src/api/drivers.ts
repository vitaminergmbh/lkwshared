import { getSupabase } from '../supabase';
import type { Driver } from '../types';

export async function getAllDrivers(): Promise<Driver[]> {
  const { data, error } = await getSupabase()
    .from('drivers')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function getActiveDrivers(): Promise<Driver[]> {
  const { data, error } = await getSupabase()
    .from('drivers')
    .select('*')
    .eq('active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function getDriverById(id: string): Promise<Driver | null> {
  const { data, error } = await getSupabase()
    .from('drivers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createDriver(
  data: Omit<Driver, 'id' | 'created_at'>
): Promise<Driver> {
  const { data: created, error } = await getSupabase()
    .from('drivers')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function updateDriver(
  id: string,
  data: Partial<Omit<Driver, 'id' | 'created_at'>>
): Promise<Driver> {
  const { data: updated, error } = await getSupabase()
    .from('drivers')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return updated;
}

export async function deleteDriver(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('drivers')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
