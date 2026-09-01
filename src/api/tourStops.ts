import { getSupabase } from '../supabase';
import type { TourStop } from '../types';

export async function getTourStops(tourId: string): Promise<TourStop[]> {
  const { data, error } = await getSupabase()
    .from('tour_stops')
    .select('*')
    .eq('tour_id', tourId)
    .order('stop_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function getTourStopById(id: string): Promise<TourStop | null> {
  const { data, error } = await getSupabase()
    .from('tour_stops')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function addTourStop(
  data: Omit<TourStop, 'id' | 'arrival_eta' | 'departure_eta' | 'drive_time_from_prev' | 'distance_from_prev' | 'cumulative_drive_time' | 'time_window_ok' | 'break_needed_before' | 'actual_arrival_eta' | 'actual_departure_eta' | 'delay_minutes' | 'live_status' | 'route_polyline' | 'projected_arrival_eta'>
): Promise<TourStop> {
  const { data: created, error } = await getSupabase()
    .from('tour_stops')
    .insert({
      ...data,
      arrival_eta: null,
      departure_eta: null,
      drive_time_from_prev: null,
      distance_from_prev: null,
      cumulative_drive_time: null,
      time_window_ok: true,
      break_needed_before: false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function updateTourStop(
  id: string,
  data: Partial<Omit<TourStop, 'id' | 'tour_id'>>
): Promise<TourStop> {
  const { data: updated, error } = await getSupabase()
    .from('tour_stops')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return updated;
}

export async function deleteTourStop(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('tour_stops')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderTourStops(
  tourId: string,
  stopIds: string[]
): Promise<void> {
  const supabase = getSupabase();

  // Update each stop's order individually
  for (let i = 0; i < stopIds.length; i++) {
    const { error } = await supabase
      .from('tour_stops')
      .update({ stop_order: i })
      .eq('id', stopIds[i]!)
      .eq('tour_id', tourId);
    if (error) throw new Error(error.message);
  }
}

/**
 * Updates the coordinates of every tour_stop that references a given location.
 * Called when a location is moved so existing tours don't keep stale coordinates.
 * Note: this touches ALL stops with this location_id (including past tours);
 * affected open tours pick up correct routing/ETAs on their next recalc.
 */
export async function updateStopCoordinatesForLocation(
  locationId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  const { error } = await getSupabase()
    .from('tour_stops')
    .update({ latitude, longitude })
    .eq('location_id', locationId);
  if (error) throw new Error(error.message);
}

export async function updateTourStopsBatch(
  stops: TourStop[]
): Promise<void> {
  const supabase = getSupabase();

  for (const stop of stops) {
    const { error } = await supabase
      .from('tour_stops')
      .update({
        arrival_eta: stop.arrival_eta,
        departure_eta: stop.departure_eta,
        drive_time_from_prev: stop.drive_time_from_prev,
        distance_from_prev: stop.distance_from_prev,
        cumulative_drive_time: stop.cumulative_drive_time,
        time_window_ok: stop.time_window_ok,
        break_needed_before: stop.break_needed_before,
        route_polyline: stop.route_polyline,
        auto_break: stop.auto_break ?? null,
        daily_rest_minutes: stop.daily_rest_minutes ?? null,
      })
      .eq('id', stop.id);
    if (error) throw new Error(error.message);
  }
}
