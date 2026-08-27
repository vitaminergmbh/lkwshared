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
  GpsProvider,
  SensorReading,
  TemperatureReading,
  PajDevice,
  PajPosition,
  Tour,
  TourStop,
  LiveTourStatus,
  LiveStopStatus,
  CargoPallet,
  CargoLayout,
  VehicleDeadline,
  VehicleDocument,
  VehicleServiceLog,
  VehicleOdometer,
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
export * as TemperatureAPI from './api/temperatureReadings';
export * as WarehouseAPI from './api/warehouseSensors';
export type { TemperatureRange, TemperaturePoint, TemperatureSeriesRange } from './api/temperatureReadings';
export type {
  WarehouseSensor, WarehouseLatest, WarehousePoint, WarehouseSeriesRange, WarehouseState, SensorPatch,
} from './api/warehouseSensors';
export * as VehicleDeadlineAPI from './api/vehicleDeadlines';
export * as VehicleDocumentAPI from './api/vehicleDocuments';
export * as ServiceLogAPI from './api/serviceLog';
export * as OdometerAPI from './api/odometer';

// === Paletten-Kapazitaet ===
export { computeTourLoad } from './utils/palletLoad';

// === Karten-Cluster ===
export { clusterPoints, boundsOf, zoomToSeparate } from './utils/mapCluster';

// === Ladungen (Obertouren) ===
export { splitIntoLoads, checkLoads, numberLoadsOfDay, activeTruckIdAt } from './utils/tourLoads';

// === Sprache der Tourennachricht ===
export { shareTexts, formatDurationIn, isDriverLanguage, DRIVER_LANGUAGES } from './utils/shareTexts';
export type { DriverLanguage } from './utils/shareTexts';
export type { LoadStop, TourLoad, LoadCheck } from './utils/tourLoads';
export type { PixelPoint, PointCluster } from './utils/mapCluster';
export type { StopLoad, TourLoadResult } from './utils/palletLoad';

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

// === Fahrzeug-Termine (Prüfungen/Wartung) ===
export {
  DEADLINE_KINDS,
  DEADLINE_KIND_MAP,
  DEADLINE_CATEGORY_LABELS,
  DEADLINE_SOON_DAYS,
  DEADLINE_URGENT_DAYS,
  HEAVY_CATEGORIES,
  isHeavyVehicle,
  kindsForCategory,
  kindsForTruck,
  avgKmPerMonth,
  projectKmDueDate,
  effectiveDueDate,
  daysUntil,
  deadlineLevel,
  deadlineSortKey,
  addMonthsToDate,
} from './utils/deadlines';
export type {
  DeadlineKind,
  DeadlineCategory,
  DeadlineAppliesTo,
  DeadlineLevel,
  OdometerPoint,
} from './utils/deadlines';
export type { DeadlinePatch } from './api/vehicleDeadlines';
export type { DocumentPatch } from './api/vehicleDocuments';
export type { ServiceLogPatch } from './api/serviceLog';
