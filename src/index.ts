// === Supabase Client ===
export { initSupabase, getSupabase } from './supabase';

// === Types ===
export type {
  Coordinates,
  TourStatus,
  TruckStatus,
  Location,
  LocationHours,
  Truck,
  Driver,
  TruckPosition,
  PajDevice,
  PajPosition,
  Tour,
  TourStop,
  LiveTourStatus,
  LiveStopStatus,
  CargoPallet,
  CargoLayout,
  HereRouteSegment,
  HereGeocodingResult,
  HereAutosuggestResult,
  Database,
} from './types';

// === API Functions ===
export * as LocationAPI from './api/locations';
export * as TruckAPI from './api/trucks';
export * as TourAPI from './api/tours';
export * as TourStopAPI from './api/tourStops';
export * as SettingsAPI from './api/settings';
export * as DriverAPI from './api/drivers';
export * as TruckPositionsAPI from './api/truckPositions';

// === Utils ===
export {
  formatDuration,
  formatDistance,
  formatTime,
  formatDateTimeToTime,
  formatDate,
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  createDateTime,
  addMinutesToDateTime,
  getDayOfWeek,
  getTimeFromDateTime,
  formatCurrency,
} from './utils/formatters';

export {
  calculateDrivingTime,
  getDrivingTimeStatus,
} from './utils/drivingTimeTracker';
export type { DrivingTimeResult } from './utils/drivingTimeTracker';

export {
  isWithinOpeningHours,
  getNextOpeningTime,
} from './utils/timeWindows';

export {
  calculateTourSchedule,
} from './utils/tourCalculator';
export type {
  TourCalculationInput,
  TourCalculationResult,
  AutoBreakInfo,
} from './utils/tourCalculator';

export {
  DRIVING_TIME_LIMIT_MINUTES,
  REQUIRED_BREAK_MINUTES,
  DEFAULT_LOADING_TIME,
  DEFAULT_REFRESH_INTERVAL,
  TRUCK_STATUS_RECENT_MINUTES,
  DAY_LABELS,
  DAY_LABELS_FULL,
  TRUCK_COLORS,
  TRUCK_CATEGORIES,
  EMISSION_CLASSES,
  CO2_CLASSES,
  PALLET_TYPES,
  DEFAULT_CARGO_LENGTH_CM,
  DEFAULT_CARGO_WIDTH_CM,
} from './utils/constants';
export type { PalletTypeDef } from './utils/constants';

// === Cost Calculation ===
export { getTollRatePerKm } from './utils/tollRates';
export type { TollRateInput } from './utils/tollRates';

export { calculateTourCosts } from './utils/costCalculator';
export type { CostSettings, CostBreakdown, TruckSegment } from './utils/costCalculator';

// === Realtime ===
export { subscribeToTable, unsubscribe } from './realtime';
export type { RealtimeHandlers, RealtimeEvent } from './realtime';

// === GeoJSON Export ===
export { buildLocationsGeoJson, buildLocationsGeoJsonString } from './utils/geojsonExport';
