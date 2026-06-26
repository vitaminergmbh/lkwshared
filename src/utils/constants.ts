// === Driving Time Limits ===

export const DRIVING_TIME_LIMIT_MINUTES = 270; // 4.5 hours
export const REQUIRED_BREAK_MINUTES = 45;

// Maximale Tageslenkzeit (regulär 9 h, verlängert 10 h) und verkürzte
// Tagesruhezeit (9 h). Nach Erreichen der Tageslenkzeit muss eine Tagesruhe rein.
export const MAX_DAILY_DRIVE_MINUTES = 540;          // 9 hours (regulär)
export const MAX_DAILY_DRIVE_EXTENDED_MINUTES = 600; // 10 hours (verlängert, 2×/Woche)
export const DAILY_REST_MINUTES = 540;               // 9 hours (verkürzte Tagesruhezeit)

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

// === Laderaum / Paletten ===

export interface PalletTypeDef {
  key: string;
  label: string;
  abbr: string;      // Kurzkürzel für die Anzeige in den Paletten-Kästchen
  length_cm: number; // entlang der Laderaumlänge (ungedreht)
  width_cm: number;
  color: string;
}

export const PALLET_TYPES: PalletTypeDef[] = [
  { key: 'euro',      label: 'Europalette',      abbr: 'EPAL', length_cm: 120, width_cm: 80,  color: '#3B82F6' },
  { key: 'industrie', label: 'Industriepalette', abbr: 'INDU', length_cm: 120, width_cm: 100, color: '#22C55E' },
  { key: 'halb',      label: 'Halbpalette',      abbr: 'HALB', length_cm: 80,  width_cm: 60,  color: '#F59E0B' },
  { key: 'viertel',   label: 'Viertelpalette',   abbr: 'VIER', length_cm: 60,  width_cm: 40,  color: '#EC4899' },
  { key: 'gitterbox', label: 'Gitterbox',        abbr: 'GIBO', length_cm: 120, width_cm: 80,  color: '#8B5CF6' },
];

// Standard-Sattelauflieger als Default-Laderaum
export const DEFAULT_CARGO_LENGTH_CM = 1360;
export const DEFAULT_CARGO_WIDTH_CM = 245;
