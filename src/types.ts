// === Coordinates ===

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// === Status Enums ===

export type TourStatus = 'draft' | 'active' | 'completed';

export type TruckStatus = 'online' | 'stale' | 'offline';

// === Location ===

export interface Location {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  loading_time: number; // Minutes
  notes: string | null;
  is_depot: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface LocationHours {
  id: string;
  location_id: string;
  day_of_week: number; // 0=Mo, 1=Di, ... 6=So
  open_time: string;   // "06:00"
  close_time: string;  // "14:00"
  crosses_midnight: boolean;
}

// === Truck ===

export interface Truck {
  id: string;
  name: string;
  license_plate: string | null;
  paj_device_id: string | null;
  color: string;
  category: string | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  gross_weight_kg: number | null;
  axle_count: number;
  fuel_consumption_per_100km: number | null;
  emission_class: string | null;
  co2_class: number | null;
  monthly_rent_eur: number | null;
  monthly_km_estimate: number | null;
  active: boolean;
  created_at: string;
}

// === Live Tracking ===

export interface TruckPosition {
  truck_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  battery: number | null;
  timestamp: string;
  address?: string;
}

export interface PajDevice {
  id: number;
  name: string;
}

export interface PajPosition {
  latitude: number;
  longitude: number;
  speed: number;
  battery: number | null;
  timestamp: string;
}

// === Driver ===

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

// === Tour ===

export interface Tour {
  id: string;
  name: string;
  truck_id: string | null;
  live_truck_id: string | null;
  date: string | null;
  start_time: string | null;
  status: TourStatus;
  return_to_depot: boolean;
  depot_id: string | null;
  driver_id: string | null;
  driver_initial_drive_time: number; // Minutes already driven
  total_duration: number | null;     // Calculated total duration (min)
  total_distance: number | null;     // Calculated total distance (km)
  total_drive_time: number | null;   // Calculated pure driving time (min)
  total_fuel_cost: number | null;    // Calculated fuel cost (EUR)
  total_toll_cost: number | null;    // Calculated toll cost (EUR)
  total_driver_cost: number | null;  // Calculated driver cost (EUR)
  total_rental_cost: number | null;  // Calculated rental cost (EUR)
  total_cost: number | null;         // Calculated total cost (EUR)
  created_at: string;
  updated_at: string;
}

// === Tour Stop ===

export interface TourStop {
  id: string;
  tour_id: string;
  location_id: string | null;
  custom_name: string | null;
  latitude: number;
  longitude: number;
  stop_order: number;
  loading_time: number;       // Minutes
  wait_time: number;          // Minutes
  counts_as_break: boolean;
  arrival_eta: string | null;
  departure_eta: string | null;
  drive_time_from_prev: number | null;    // Minutes
  distance_from_prev: number | null;       // km
  cumulative_drive_time: number | null;    // Minutes
  time_window_ok: boolean;
  break_needed_before: boolean;
  truck_id: string | null;                // LKW-Wechsel ab diesem Stop
  checked: boolean;                       // Stop wurde abgehakt (live tracking)
}

// === Live Tour Tracking ===

export interface LiveTourStatus {
  tourId: string;
  truckPosition: TruckPosition;
  nextStopIndex: number;
  distanceToNext: number | null;       // km
  driveTimeToNext: number | null;      // minutes
  standingSinceMinutes: number | null;
  remainingLoadingTime: number | null;
  updatedStops: TourStop[];
  estimatedEndTime: string | null;
}

// === HERE API Response Types ===

export interface HereRouteSegment {
  duration: number;   // seconds
  length: number;     // meters
  polyline?: string;
}

export interface HereGeocodingResult {
  title: string;
  address: {
    label: string;
  };
  position: {
    lat: number;
    lng: number;
  };
}

export interface HereAutosuggestResult {
  id: string;
  title: string;
  address?: {
    label: string;
  };
  position?: {
    lat: number;
    lng: number;
  };
}

// === Supabase Database Types ===

export interface Database {
  public: {
    Tables: {
      locations: {
        Row: Location;
        Insert: Omit<Location, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>;
      };
      location_hours: {
        Row: LocationHours;
        Insert: Omit<LocationHours, 'id'> & { id?: string };
        Update: Partial<Omit<LocationHours, 'id'>>;
      };
      trucks: {
        Row: Truck;
        Insert: Omit<Truck, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Truck, 'id' | 'created_at'>>;
      };
      tours: {
        Row: Tour;
        Insert: Omit<Tour, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Tour, 'id' | 'created_at' | 'updated_at'>>;
      };
      tour_stops: {
        Row: TourStop;
        Insert: Omit<TourStop, 'id'> & { id?: string };
        Update: Partial<Omit<TourStop, 'id'>>;
      };
    };
  };
}
