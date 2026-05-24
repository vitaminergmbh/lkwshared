import { getSupabase } from '../supabase';
import type { Location, LocationHours, Coordinates } from '../types';

// === Location CRUD ===

/**
 * Returns active (non-archived) locations by default.
 * Pass { includeArchived: true } to also include soft-deleted ones.
 */
export async function getAllLocations(opts?: { includeArchived?: boolean }): Promise<Location[]> {
  let query = getSupabase().from('locations').select('*').order('name');
  if (!opts?.includeArchived) query = query.eq('archived', false);
  const { data, error } = await query;
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
    .eq('archived', false)
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function createLocation(
  data: Omit<Location, 'id' | 'created_at' | 'updated_at' | 'geofence_radius_m' | 'geofence_polygon' | 'archived'> & { geofence_radius_m?: number; geofence_polygon?: Coordinates[] | null }
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

/**
 * Soft-delete: marks the location as archived. Tour history references stay valid.
 * Use this from the UI for any user-triggered "delete" action.
 */
export async function archiveLocation(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('locations')
    .update({ archived: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function unarchiveLocation(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('locations')
    .update({ archived: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Permanently deletes a location row. Will fail if any tour_stop still references it.
 * Prefer archiveLocation() for normal user operations.
 */
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
