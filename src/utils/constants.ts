// === Driving Time Limits ===

export const DRIVING_TIME_LIMIT_MINUTES = 270; // 4.5 hours
export const REQUIRED_BREAK_MINUTES = 45;

// === Default Values ===

export const DEFAULT_LOADING_TIME = 30; // minutes
export const DEFAULT_REFRESH_INTERVAL = 30_000; // 30 seconds in ms

// === Truck Status Thresholds (minutes) ===

export const TRUCK_STATUS_RECENT_MINUTES = 15;

// === Day Labels (German) ===

export const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export const DAY_LABELS_FULL = [
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag',
  'Freitag', 'Samstag', 'Sonntag',
] as const;

// === Truck Colors ===

export const TRUCK_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
] as const;

// === Truck Categories ===

export const TRUCK_CATEGORIES = ['LKW', 'Transporter', 'Auto', 'Sonstige'] as const;

// === Emission Classes ===

export const EMISSION_CLASSES = [
  { value: 'euro6', label: 'Euro VI' },
  { value: 'euro5', label: 'Euro V / EEV' },
  { value: 'euro4', label: 'Euro IV' },
  { value: 'euro3', label: 'Euro III' },
  { value: 'euro2', label: 'Euro II' },
  { value: 'euro1', label: 'Euro I' },
  { value: 'euro0', label: 'Euro 0' },
] as const;

export const CO2_CLASSES = [1, 2, 3, 4, 5] as const;
