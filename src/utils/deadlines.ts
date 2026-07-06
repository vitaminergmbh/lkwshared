// Fahrzeug-Termine (Prüfungen, Wartung, Dokumente) — Katalog & Status-Logik.
// Wird von Web-App genutzt; die Reminder-Edge-Function hält eine eigene, minimale
// Kopie der Schlüssel/Labels (kann lkw-shared nicht importieren).

export type DeadlineCategory = 'pflicht' | 'wartung' | 'dokument';
/** Für welche Fahrzeuge der Termin relevant ist. 'lkw' = nur schwere Fahrzeuge. */
export type DeadlineAppliesTo = 'all' | 'lkw';

export interface DeadlineKind {
  key: string;
  label: string;
  short: string;
  category: DeadlineCategory;
  appliesTo: DeadlineAppliesTo;
  /** Standard-Intervall in Monaten (Vorschlag für „erledigt → nächster Termin"). */
  defaultIntervalMonths: number | null;
  /** Nur relevant, wenn das Fahrzeug eine Hebebühne hat (has_liftgate). */
  requiresLiftgate?: boolean;
  hint?: string;
}

// Fahrzeugkategorien, die als „schwer" (LKW-Pflichten) gelten.
export const HEAVY_CATEGORIES = ['LKW', 'Sonstige'] as const;

export function isHeavyVehicle(category: string | null | undefined): boolean {
  return category != null && (HEAVY_CATEGORIES as readonly string[]).includes(category);
}

// Kanonischer Katalog aller trackbaren Termine.
export const DEADLINE_KINDS: DeadlineKind[] = [
  // — Gesetzliche Pflicht-Prüfungen —
  { key: 'hu', label: 'Hauptuntersuchung (HU/TÜV)', short: 'HU', category: 'pflicht', appliesTo: 'all', defaultIntervalMonths: 12, hint: 'PKW alle 24 Mon. (Neuwagen 36), LKW/Anhänger alle 12 Mon.' },
  { key: 'sp', label: 'Sicherheitsprüfung (SP)', short: 'SP', category: 'pflicht', appliesTo: 'lkw', defaultIntervalMonths: 6, hint: 'LKW > 7,5 t: erstmals 42 Mon. nach EZ, dann alle 6 Monate.' },
  { key: 'tacho', label: 'Tachograph-Nacheichung', short: 'Tacho', category: 'pflicht', appliesTo: 'lkw', defaultIntervalMonths: 24, hint: 'Digitaler Tacho: alle 2 Jahre (§ 57b StVZO).' },
  { key: 'uvv', label: 'UVV-Fahrzeugprüfung', short: 'UVV', category: 'pflicht', appliesTo: 'all', defaultIntervalMonths: 12, hint: 'Jährlich für alle gewerblich genutzten Fahrzeuge (DGUV V70).' },
  { key: 'ladebordwand', label: 'Ladebordwand / Hebebühne', short: 'Hebebühne', category: 'pflicht', appliesTo: 'lkw', requiresLiftgate: true, defaultIntervalMonths: 12, hint: 'Jährliche UVV-Prüfung durch Sachkundigen (nur mit Hebebühne).' },
  // — Wartung & Verschleiß —
  { key: 'service', label: 'Inspektion / Service', short: 'Service', category: 'wartung', appliesTo: 'all', defaultIntervalMonths: 12, hint: 'Nach Herstellervorgabe (Zeit oder km).' },
  { key: 'oil', label: 'Ölwechsel', short: 'Öl', category: 'wartung', appliesTo: 'all', defaultIntervalMonths: 12, hint: 'Meist mit dem Service; LKW oft km-basiert.' },
  { key: 'bremsfluessigkeit', label: 'Bremsflüssigkeit', short: 'Bremsfl.', category: 'wartung', appliesTo: 'all', defaultIntervalMonths: 24, hint: 'Alle 2 Jahre, unabhängig von der Laufleistung.' },
  { key: 'reifen', label: 'Reifen (Wechsel/Prüfung)', short: 'Reifen', category: 'wartung', appliesTo: 'all', defaultIntervalMonths: 6, hint: 'Saisonal; Profil & Alter im Blick behalten.' },
  { key: 'klima', label: 'Klimaservice', short: 'Klima', category: 'wartung', appliesTo: 'all', defaultIntervalMonths: 24, hint: 'Kältemittel & Trockner, ~alle 2 Jahre.' },
  // — Dokumente —
  { key: 'versicherung', label: 'Versicherung / Kfz-Steuer', short: 'Versich.', category: 'dokument', appliesTo: 'all', defaultIntervalMonths: 12, hint: 'Jährliche Zahlung / Verlängerung.' },
];

export const DEADLINE_KIND_MAP: Record<string, DeadlineKind> = Object.fromEntries(
  DEADLINE_KINDS.map((k) => [k.key, k]),
);

export const DEADLINE_CATEGORY_LABELS: Record<DeadlineCategory, string> = {
  pflicht: 'Gesetzliche Prüfungen',
  wartung: 'Wartung & Verschleiß',
  dokument: 'Dokumente',
};

/** Kinds, die für ein Fahrzeug einer bestimmten Kategorie relevant sind. */
export function kindsForCategory(category: string | null | undefined): DeadlineKind[] {
  const heavy = isHeavyVehicle(category);
  return DEADLINE_KINDS.filter((k) => k.appliesTo === 'all' || heavy);
}

/** Kinds für ein konkretes Fahrzeug — berücksichtigt Kategorie und Hebebühne. */
export function kindsForTruck(
  category: string | null | undefined,
  hasLiftgate: boolean | null | undefined,
): DeadlineKind[] {
  const heavy = isHeavyVehicle(category);
  return DEADLINE_KINDS.filter((k) => {
    if (k.appliesTo === 'lkw' && !heavy) return false;
    if (k.requiresLiftgate && !hasLiftgate) return false;
    return true;
  });
}

// === Status / Ampel ===

export type DeadlineLevel = 'ok' | 'soon' | 'due' | 'over' | 'none';

/** „Bald fällig" ab dieser Rest-Tageszahl (gelb). */
export const DEADLINE_SOON_DAYS = 28;
/** „Dringend" ab dieser Rest-Tageszahl (rot, aber noch nicht überfällig). */
export const DEADLINE_URGENT_DAYS = 7;

/** Ganze Tage bis zum Fälligkeitsdatum (negativ = überfällig). */
export function daysUntil(dueDate: string, today: Date = new Date()): number {
  const due = new Date(`${dueDate}T00:00:00`);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - base.getTime()) / 86_400_000);
}

export function deadlineLevel(dueDate: string | null | undefined, today: Date = new Date()): DeadlineLevel {
  if (!dueDate) return 'none';
  const days = daysUntil(dueDate, today);
  if (days < 0) return 'over';
  if (days <= DEADLINE_URGENT_DAYS) return 'due';
  if (days <= DEADLINE_SOON_DAYS) return 'soon';
  return 'ok';
}

/** Rangfolge für Sortierung „am dringendsten zuerst". */
export function deadlineSortKey(dueDate: string | null | undefined, today: Date = new Date()): number {
  if (!dueDate) return Number.MAX_SAFE_INTEGER; // ohne Datum ans Ende
  return daysUntil(dueDate, today);
}

/** Nächstes Fälligkeitsdatum (ISO YYYY-MM-DD) aus einem Basisdatum + Intervall. */
export function addMonthsToDate(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
