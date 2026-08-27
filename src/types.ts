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
  /** Standort benötigt eine Hebebühne zum Be-/Entladen. */
  needs_liftgate?: boolean;
  geofence_radius_m: number; // 50-5000m, default 500
  /**
   * Optional polygon geofence (array of {latitude, longitude} vertices, min 3 points).
   * When set, this overrides the circle radius for geofence detection.
   * Useful for sites near highways or with irregular shapes to avoid false positives.
   */
  geofence_polygon: Coordinates[] | null;
  /** Soft-delete flag — archived locations are hidden from lists but preserved for historic tour references */
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type LiveStopStatus = 'pending' | 'driving' | 'arrived' | 'loading' | 'departed';

export interface LocationHours {
  id: string;
  location_id: string;
  day_of_week: number; // 0=Mo, 1=Di, ... 6=So
  open_time: string;   // "06:00"
  close_time: string;  // "14:00"
  crosses_midnight: boolean;
}

// === Truck ===

export interface VehicleDeadline {
  id: string;
  truck_id: string;
  /** Schlüssel aus DEADLINE_KINDS (z.B. 'hu', 'sp', 'tacho', 'oil'). */
  kind: string;
  /** Nächste Fälligkeit als ISO-Datum (YYYY-MM-DD) oder null (nicht hinterlegt). */
  due_date: string | null;
  /** Optionales Intervall in Monaten für „erledigt → nächster Termin". */
  interval_months: number | null;
  /** Optionales km-Intervall (z.B. Ölwechsel alle 40.000 km). */
  interval_km: number | null;
  /** km-Stand bei der letzten Durchführung. */
  last_done_km: number | null;
  /** Datum der letzten Durchführung (ISO YYYY-MM-DD). */
  last_done: string | null;
  /** Standort/Werkstatt, wo es erledigt wurde (FK auf locations), oder null. */
  location_id: string | null;
  note: string | null;
  updated_at: string;
}

export interface VehicleDocument {
  id: string;
  truck_id: string;
  /** Bezeichnung, z.B. „Zulassungsbescheinigung Teil I", „Versicherung Haftpflicht", „Reifengröße". */
  title: string;
  /** Freitext-Wert, z.B. Nummer/Police/Maß. */
  value: string | null;
  note: string | null;
  /** Storage-Pfad im Bucket 'vehicle-docs' (Scan/Foto), oder null. */
  file_path: string | null;
  file_name: string | null;
  sort_order: number;
  updated_at: string;
}

export interface VehicleServiceLog {
  id: string;
  truck_id: string;
  /** Datum der Arbeit (ISO YYYY-MM-DD). */
  service_date: string;
  /** Was gemacht wurde, z.B. „Zündkerzen erneuert". */
  description: string;
  /** Werkstatt (Freitext), z.B. „Werkstatt Meyer". */
  workshop: string | null;
  cost: number | null;
  odometer_km: number | null;
  note: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
}

export interface VehicleOdometer {
  id: string;
  truck_id: string;
  /** Datum der Ablesung (ISO YYYY-MM-DD). */
  reading_date: string;
  km: number;
  note: string | null;
  created_at: string;
}

/** Quelle der Live-Position: PAJ-Tracker oder eigener Teltonika ueber Flespi. */
export type GpsProvider = 'paj' | 'flespi';

export interface Truck {
  id: string;
  name: string;
  license_plate: string | null;
  paj_device_id: string | null;
  /**
   * Aktive GPS-Quelle. Beide Geraete-IDs duerfen parallel gepflegt sein.
   * Optional, weil die Spalte einen DB-Default ('paj') hat und aeltere
   * Clients sie beim Anlegen nicht mitschicken.
   */
  gps_provider?: GpsProvider;
  flespi_device_id?: string | null;
  /** Bezeichnung der BLE-Sensoren je Slot, z.B. { "1": "Laderaum" }. */
  sensor_labels?: Record<string, string>;
  color: string;
  category: string | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  gross_weight_kg: number | null;
  axle_count: number;
  /**
   * Stellplaetze auf EPAL-Basis (120x80). null oder nicht gepflegt heisst:
   * fuer dieses Fahrzeug wird keine Kapazitaet geprueft.
   */
  pallet_capacity?: number | null;
  /** Fahrzeug hat eine Hebebühne (Ladebordwand). */
  has_liftgate?: boolean;
  fuel_consumption_per_100km: number | null;
  emission_class: string | null;
  co2_class: number | null;
  monthly_rent_eur: number | null;
  monthly_km_estimate: number | null;
  active: boolean;
  created_at: string;
}

// === Live Tracking ===

/** Messwerte eines BLE-Temperaturfuehlers (Teltonika EYE) zur letzten Position. */
export interface SensorReading {
  /** Sensor-Nummer laut Tracker-Konfiguration (1..4). */
  slot: number;
  temperature: number | null;
  humidity?: number | null;
  /** Batteriespannung des Sensors in Volt — Hauptmassstab fuer den Ladezustand. */
  battery_v?: number | null;
  /** Ladezustand in Prozent, falls der Tracker ihn meldet (EYE-Sensoren oft nicht). */
  battery_pct?: number | null;
  /** Eigenmeldung des Sensors: Batterie schwach. */
  low_battery?: boolean | null;
  mac?: string | null;
  /** Zeitpunkt der Messung — kann aelter sein als die Position. */
  timestamp?: string | null;
}

export interface TruckPosition {
  truck_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  battery: number | null;
  timestamp: string;
  address?: string;
  /** Name des Standort-Geofence, in dem das Fahrzeug aktuell steht (oder null). */
  geofence_name?: string | null;
  /** Zeitpunkt, seit dem das Fahrzeug ununterbrochen in diesem Geofence steht. */
  geofence_since?: string | null;
  /** Aktuelle Temperaturfuehler-Werte (nur bei eigenem GPS gefuellt). */
  sensors?: SensorReading[];
  /** Quelle dieser Position. */
  provider?: GpsProvider | null;
}

/** Historischer Messwert fuer den Kuehlketten-Nachweis. */
export interface TemperatureReading {
  id: string;
  truck_id: string;
  slot: number;
  temperature: number;
  humidity: number | null;
  battery_v: number | null;
  latitude: number | null;
  longitude: number | null;
  recorded_at: string;
  created_at: string;
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
  /** Sprache der Tourennachricht (de, uk, ru, pl, en). */
  language?: string;
}

// === Cargo / Laderaum ===

export interface CargoPallet {
  id: string;
  type: string;       // Schlüssel aus PALLET_TYPES ('euro' | 'industrie' | ...)
  x: number;          // Position in cm vom linken Rand (entlang der Länge)
  y: number;          // Position in cm vom oberen Rand (über die Breite)
  rotated: boolean;   // 90°-Drehung (Länge/Breite getauscht)
  label: string;      // Ware, z.B. "Tomaten"
  color: string;      // Hex-Farbe
}

export interface CargoLayout {
  area_length_cm: number;   // Laderaumlänge (Fahrtrichtung)
  area_width_cm: number;    // Laderaumbreite
  pallets: CargoPallet[];
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
  /** Verlängerte Tageslenkzeit auf 10 h zulassen (statt regulär 9 h). */
  extended_drive_time?: boolean;
  total_duration: number | null;     // Calculated total duration (min)
  total_distance: number | null;     // Calculated total distance (km)
  total_drive_time: number | null;   // Calculated pure driving time (min) — all vehicle categories
  total_lkw_drive_time?: number | null; // Subset of total_drive_time: only segments driven by LKW/Sonstige
  total_fuel_cost: number | null;    // Calculated fuel cost (EUR)
  total_toll_cost: number | null;    // Calculated toll cost (EUR)
  total_driver_cost: number | null;  // Calculated driver cost (EUR)
  total_rental_cost: number | null;  // Calculated rental cost (EUR)
  total_cost: number | null;         // Calculated total cost (EUR)
  /** Optionaler Link, unter dem der Fahrer das Ladungs-Design sieht (Foto/PDF/URL) */
  cargo_link?: string | null;
  /** Im-App-Laderaum-Layout (Palettenanordnung) */
  cargo_layout?: CargoLayout | null;
  // Live tracking fields
  tracking_enabled: boolean;          // Auto-tracking active when true
  tracking_started_at: string | null; // When live tracking actually started
  completed_at: string | null;        // When all stops were finished
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
  notes?: string | null;                  // Lade-/Entladeanweisungen für Fahrer
  load_note?: string | null;              // Beladungs-Info für Fahrer (Emoji + Freitext)
  unload_note?: string | null;            // Entladungs-Info für Fahrer (Emoji + Freitext)
  /** An diesem Stop aufgenommene Paletten (Stellplaetze). */
  pallets_load?: number;
  /** An diesem Stop abgegebene Paletten. Erst entladen, dann laden. */
  pallets_unload?: number;
  // Live tracking fields
  actual_arrival_eta: string | null;      // First time the geofence was entered
  actual_departure_eta: string | null;    // Time the geofence was left
  delay_minutes: number | null;           // actual − planned, in minutes (positive = late)
  live_status: LiveStopStatus;            // pending | driving | arrived | loading | departed
  /** HERE Flexible Polyline of the route segment from previous stop TO this stop */
  route_polyline: string | null;
  /** ETA recalculated by the live-tracker via HERE after each departure event.
   * Used in the UI in place of arrival_eta until actual_arrival_eta lands. */
  projected_arrival_eta: string | null;
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
