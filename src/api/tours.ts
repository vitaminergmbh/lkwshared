import { getSupabase } from '../supabase';
import type { Tour, TourStatus } from '../types';

export async function getAllTours(): Promise<Tour[]> {
  const { data, error } = await getSupabase()
    .from('tours')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getTourById(id: string): Promise<Tour | null> {
  const { data, error } = await getSupabase()
    .from('tours')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getToursByStatus(status: TourStatus): Promise<Tour[]> {
  const { data, error } = await getSupabase()
    .from('tours')
    .select('*')
    .eq('status', status)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createTour(
  data: Omit<Tour, 'id' | 'created_at' | 'updated_at' | 'total_duration' | 'total_distance' | 'total_drive_time' | 'total_fuel_cost' | 'total_toll_cost' | 'total_driver_cost' | 'total_rental_cost' | 'total_cost' | 'total_overhead_cost' | 'total_profit' | 'total_price' | 'tracking_enabled' | 'tracking_started_at' | 'completed_at'>
): Promise<Tour> {
  const { data: created, error } = await getSupabase()
    .from('tours')
    .insert({
      ...data,
      total_duration: null,
      total_distance: null,
      total_drive_time: null,
      total_fuel_cost: null,
      total_toll_cost: null,
      total_driver_cost: null,
      total_rental_cost: null,
      total_cost: null,
      total_overhead_cost: null,
      total_profit: null,
      total_price: null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function updateTour(
  id: string,
  data: Partial<Omit<Tour, 'id' | 'created_at' | 'updated_at'>>
): Promise<Tour> {
  const { data: updated, error } = await getSupabase()
    .from('tours')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return updated;
}

export async function deleteTour(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('tours')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function duplicateTour(id: string): Promise<Tour | null> {
  const supabase = getSupabase();

  // Get original tour
  const original = await getTourById(id);
  if (!original) return null;

  // Create new tour
  const { data: newTour, error: tourError } = await supabase
    .from('tours')
    .insert({
      name: `${original.name} (Kopie)`,
      truck_id: original.truck_id,
      live_truck_id: null,
      date: original.date,
      start_time: original.start_time,
      status: 'draft' as TourStatus,
      return_to_depot: original.return_to_depot,
      depot_id: original.depot_id,
      driver_initial_drive_time: original.driver_initial_drive_time,
      total_duration: null,
      total_distance: null,
      total_drive_time: null,
      total_fuel_cost: null,
      total_toll_cost: null,
      total_driver_cost: null,
      total_rental_cost: null,
      total_cost: null,
      total_overhead_cost: null,
      total_profit: null,
      total_price: null,
    })
    .select()
    .single();
  if (tourError) throw new Error(tourError.message);

  // Copy all stops
  const { data: stops, error: stopsError } = await supabase
    .from('tour_stops')
    .select('*')
    .eq('tour_id', id)
    .order('stop_order');
  if (stopsError) throw new Error(stopsError.message);

  if (stops && stops.length > 0) {
    const newStops = stops.map(stop => ({
      tour_id: newTour.id,
      location_id: stop.location_id,
      custom_name: stop.custom_name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      stop_order: stop.stop_order,
      loading_time: stop.loading_time,
      wait_time: stop.wait_time,
      counts_as_break: stop.counts_as_break,
      arrival_eta: null as string | null,
      departure_eta: null as string | null,
      drive_time_from_prev: null as number | null,
      distance_from_prev: null as number | null,
      cumulative_drive_time: null as number | null,
      time_window_ok: true,
      break_needed_before: false,
      truck_id: stop.truck_id,
      checked: false,
    }));

    const { error: insertError } = await supabase
      .from('tour_stops')
      .insert(newStops);
    if (insertError) throw new Error(insertError.message);
  }

  return newTour;
}
