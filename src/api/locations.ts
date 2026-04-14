import { getSupabase } from '../supabase';
import type { Location, LocationHours } from '../types';

// === Location CRUD ===

export async function getAllLocations(): Promise<Location[]> {
  const { data, error } = await getSupabase()
    .from('locations')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function getLocationById(id: string): Promise<Location | null> {
  const { data, error } = await getSupabase()
    .from('locations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getDepots(): Promise<Location[]> {
  const { data, error } = await getSupabase()
    .from('locations')
    .select('*')
    .eq('is_depot', true)
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function createLocation(
  data: Omit<Location, 'id' | 'created_at' | 'updated_at'>
): Promise<Location> {
  const { data: created, error } = await getSupabase()
    .from('locations')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function updateLocation(
  id: string,
  data: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>
): Promise<Location> {
  const { data: updated, error } = await getSupabase()
    .from('locations')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return updated;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('locations')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// === Location Hours CRUD ===

export async function getLocationHours(locationId: string): Promise<LocationHours[]> {
  const { data, error } = await getSupabase()
    .from('location_hours')
    .select('*')
    .eq('location_id', locationId)
    .order('day_of_week')
    .order('open_time');
  if (error) throw new Error(error.message);
  return data;
}

export async function getLocationHoursForDay(
  locationId: string,
  dayOfWeek: number
): Promise<LocationHours[]> {
  const { data, error } = await getSupabase()
    .from('location_hours')
    .select('*')
    .eq('location_id', locationId)
    .eq('day_of_week', dayOfWeek)
    .order('open_time');
  if (error) throw new Error(error.message);
  return data;
}

export async function addLocationHours(
  data: Omit<LocationHours, 'id'>
): Promise<LocationHours> {
  const { data: created, error } = await getSupabase()
    .from('location_hours')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function updateLocationHours(
  id: string,
  data: Partial<Omit<LocationHours, 'id' | 'location_id'>>
): Promise<void> {
  const { error } = await getSupabase()
    .from('location_hours')
    .update(data)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteLocationHours(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('location_hours')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAllLocationHours(locationId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('location_hours')
    .delete()
    .eq('location_id', locationId);
  if (error) throw new Error(error.message);
}

export async function replaceLocationHours(
  locationId: string,
  hours: Omit<LocationHours, 'id' | 'location_id'>[]
): Promise<LocationHours[]> {
  const supabase = getSupabase();

  // Delete existing hours
  const { error: deleteError } = await supabase
    .from('location_hours')
    .delete()
    .eq('location_id', locationId);
  if (deleteError) throw new Error(deleteError.message);

  if (hours.length === 0) return [];

  // Insert new hours
  const rows = hours.map(h => ({ ...h, location_id: locationId }));
  const { data, error } = await supabase
    .from('location_hours')
    .insert(rows)
    .select();
  if (error) throw new Error(error.message);
  return data;
}
