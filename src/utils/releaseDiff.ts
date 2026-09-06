import { shareTexts } from './shareTexts';

/**
 * Was hat sich seit der letzten Freigabe an der Tour geaendert?
 *
 * Verglichen wird der freigegebene Stand (Kopie in driver_tour_releases)
 * mit den Arbeitsdaten. Heraus kommt eine Liste strukturierter Aenderungen
 * — die Fahrerseite setzt sie in der Sprache des Fahrers in Worte, der
 * Planer auf Deutsch. Deshalb keine fertigen Saetze im Vergleich selbst:
 * ein Satz liesse sich spaeter nicht mehr uebersetzen.
 *
 * Kleine Zeitverschiebungen unter der Toleranz zaehlen nicht: der Planer
 * rechnet Routen nach jedem Handgriff neu, und eine Minute hin oder her
 * ist keine Aenderung, die ein Fahrer bestaetigen muss.
 */

export interface FreigabeStop {
  id: string;
  stop_order: number;
  location_id?: string | null;
  custom_name?: string | null;
  arrival_eta?: string | null;
  departure_eta?: string | null;
  loading_time?: number | null;
  wait_time?: number | null;
  truck_id?: string | null;
  ride_along?: boolean | null;
  load_note?: string | null;
  unload_note?: string | null;
  pallets_load?: number | null;
  pallets_unload?: number | null;
}

export interface FreigabeTour {
  date?: string | null;
  start_time?: string | null;
  truck_id?: string | null;
  driver_id?: string | null;
}

export interface FreigabeStand {
  tour: FreigabeTour;
  stops: FreigabeStop[];
}

export interface FreigabeVergleichOptionen {
  /** Ab wie vielen Minuten eine verschobene Ankunft zaehlt (Standard 5). */
  toleranzMin?: number;
  /** Name eines Stops fuer die Saetze. */
  nameOf?: (stop: FreigabeStop) => string;
  /** Name eines Fahrzeugs; ohne Angabe heisst es nur "Fahrzeug geaendert". */
  truckName?: (truckId: string | null | undefined) => string | null;
}

/** Eine Aenderung, sprachneutral. Zeiten als "HH:MM", Dauern in Minuten. */
export type Aenderung =
  | { art: 'datum'; alt: string | null; neu: string | null }
  | { art: 'startzeit'; alt: string | null; neu: string | null }
  | { art: 'startfahrzeug'; alt: string | null; neu: string | null }
  | { art: 'fahrer' }
  | { art: 'reihenfolge' }
  | { art: 'stop_entfernt'; stop: string }
  | { art: 'stop_neu'; stop: string; position: number }
  | { art: 'standort'; alt: string; neu: string }
  | { art: 'ankunft'; stop: string; alt: string; neu: string }
  | { art: 'abfahrt'; stop: string; alt: string; neu: string }
  | { art: 'laden'; stop: string; alt: number; neu: number }
  | { art: 'warten'; stop: string; alt: number; neu: number }
  | { art: 'fahrzeugwechsel'; stop: string; fahrzeug: string | null }
  | { art: 'fahrzeugwechsel_entfernt'; stop: string }
  | { art: 'mitfahrt'; stop: string; an: boolean }
  | { art: 'ladehinweis'; stop: string }
  | { art: 'paletten'; stop: string };

/** So liegt es am Hinweis (driver_notices.details). */
export interface AenderungsDetails {
  aenderungen: Aenderung[];
  /** Was die Disposition zusaetzlich getippt hat; bleibt in ihrer Sprache. */
  zusatz: string | null;
}

function hhmm(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }).format(d);
}

function minutenZwischen(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const x = new Date(a).getTime();
  const y = new Date(b).getTime();
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return Math.round((y - x) / 60000);
}

function stundeMinute(t: string | null | undefined): string {
  if (!t) return '--:--';
  return t.slice(0, 5);
}

const leer = (s: string | null | undefined) => (s ?? '').trim();

/** Strukturierte Liste der Aenderungen; leer heisst: der Fahrer sieht den aktuellen Stand. */
export function aenderungenFreigabe(
  alt: FreigabeStand,
  neu: FreigabeStand,
  opt: FreigabeVergleichOptionen = {},
): Aenderung[] {
  const toleranz = opt.toleranzMin ?? 5;
  const name = opt.nameOf ?? ((s: FreigabeStop) => s.custom_name ?? s.location_id ?? 'Stop');
  const fahrzeug = (id: string | null | undefined) => opt.truckName?.(id) ?? null;
  const raus: Aenderung[] = [];

  // --- Tour ---
  if ((alt.tour.date ?? null) !== (neu.tour.date ?? null)) {
    raus.push({ art: 'datum', alt: alt.tour.date ?? null, neu: neu.tour.date ?? null });
  }
  if ((alt.tour.start_time ?? null) !== (neu.tour.start_time ?? null)) {
    raus.push({ art: 'startzeit', alt: alt.tour.start_time ? stundeMinute(alt.tour.start_time) : null, neu: neu.tour.start_time ? stundeMinute(neu.tour.start_time) : null });
  }
  if ((alt.tour.truck_id ?? null) !== (neu.tour.truck_id ?? null)) {
    raus.push({ art: 'startfahrzeug', alt: fahrzeug(alt.tour.truck_id), neu: fahrzeug(neu.tour.truck_id) });
  }
  if ((alt.tour.driver_id ?? null) !== (neu.tour.driver_id ?? null)) {
    raus.push({ art: 'fahrer' });
  }

  // --- Stops: weg, neu, Reihenfolge ---
  const altSortiert = [...alt.stops].sort((a, b) => a.stop_order - b.stop_order);
  const neuSortiert = [...neu.stops].sort((a, b) => a.stop_order - b.stop_order);
  const altById = new Map(altSortiert.map((s) => [s.id, s]));
  const neuById = new Map(neuSortiert.map((s) => [s.id, s]));

  for (const s of altSortiert) {
    if (!neuById.has(s.id)) raus.push({ art: 'stop_entfernt', stop: name(s) });
  }
  neuSortiert.forEach((s, i) => {
    if (!altById.has(s.id)) raus.push({ art: 'stop_neu', stop: name(s), position: i + 1 });
  });

  const gemeinsamAlt = altSortiert.filter((s) => neuById.has(s.id)).map((s) => s.id);
  const gemeinsamNeu = neuSortiert.filter((s) => altById.has(s.id)).map((s) => s.id);
  if (gemeinsamAlt.join('|') !== gemeinsamNeu.join('|')) raus.push({ art: 'reihenfolge' });

  // --- Stops: Inhalt ---
  for (const n of neuSortiert) {
    const a = altById.get(n.id);
    if (!a) continue;
    const wer = name(n);

    if ((a.location_id ?? null) !== (n.location_id ?? null) || leer(a.custom_name) !== leer(n.custom_name)) {
      raus.push({ art: 'standort', alt: name(a), neu: wer });
    }
    const dAnkunft = minutenZwischen(a.arrival_eta, n.arrival_eta);
    if (dAnkunft != null && Math.abs(dAnkunft) >= toleranz) {
      raus.push({ art: 'ankunft', stop: wer, alt: hhmm(a.arrival_eta), neu: hhmm(n.arrival_eta) });
    } else {
      // Abfahrt nur melden, wenn die Ankunft still steht — sonst ist es
      // dieselbe Verschiebung zweimal.
      const dAbfahrt = minutenZwischen(a.departure_eta, n.departure_eta);
      if (dAbfahrt != null && Math.abs(dAbfahrt) >= toleranz) {
        raus.push({ art: 'abfahrt', stop: wer, alt: hhmm(a.departure_eta), neu: hhmm(n.departure_eta) });
      }
    }
    if ((a.loading_time ?? 0) !== (n.loading_time ?? 0)) {
      raus.push({ art: 'laden', stop: wer, alt: a.loading_time ?? 0, neu: n.loading_time ?? 0 });
    }
    if ((a.wait_time ?? 0) !== (n.wait_time ?? 0)) {
      raus.push({ art: 'warten', stop: wer, alt: a.wait_time ?? 0, neu: n.wait_time ?? 0 });
    }
    if ((a.truck_id ?? null) !== (n.truck_id ?? null)) {
      raus.push(n.truck_id ? { art: 'fahrzeugwechsel', stop: wer, fahrzeug: fahrzeug(n.truck_id) } : { art: 'fahrzeugwechsel_entfernt', stop: wer });
    }
    if (!!a.ride_along !== !!n.ride_along) {
      raus.push({ art: 'mitfahrt', stop: wer, an: !!n.ride_along });
    }
    if (leer(a.load_note) !== leer(n.load_note) || leer(a.unload_note) !== leer(n.unload_note)) {
      raus.push({ art: 'ladehinweis', stop: wer });
    }
    if ((a.pallets_load ?? 0) !== (n.pallets_load ?? 0) || (a.pallets_unload ?? 0) !== (n.pallets_unload ?? 0)) {
      raus.push({ art: 'paletten', stop: wer });
    }
  }

  return raus;
}

/**
 * Eine Aenderung in Worten, in der Sprache des Lesers. Deutsch fuer den
 * Planer, die Sprache des Fahrers auf seiner Seite.
 */
export function formatAenderung(a: Aenderung, lang: string | null | undefined): string {
  const T = shareTexts(lang);
  const oder = (s: string | null) => s ?? '–';
  switch (a.art) {
    case 'datum': return `${T.aDatum}: ${oder(a.alt)} → ${oder(a.neu)}`;
    case 'startzeit': return `${T.aStartzeit}: ${oder(a.alt)} → ${oder(a.neu)}`;
    case 'startfahrzeug': return a.alt || a.neu ? `${T.aStartfahrzeug}: ${oder(a.alt)} → ${oder(a.neu)}` : T.aStartfahrzeugGeaendert;
    case 'fahrer': return T.aFahrerGeaendert;
    case 'reihenfolge': return T.aReihenfolge;
    case 'stop_entfernt': return `${T.aStopEntfernt}: ${a.stop}`;
    case 'stop_neu': return `${T.aNeuerStop}: ${a.stop} (${T.aPosition} ${a.position})`;
    case 'standort': return `${a.alt} → ${a.neu} (${T.aStandortGetauscht})`;
    case 'ankunft': return `${a.stop}: ${T.ankunft} ${a.alt} → ${a.neu}`;
    case 'abfahrt': return `${a.stop}: ${T.abfahrt} ${a.alt} → ${a.neu}`;
    case 'laden': return `${a.stop}: ${T.laden} ${a.alt} → ${a.neu} ${T.min}`;
    case 'warten': return `${a.stop}: ${T.warten} ${a.alt} → ${a.neu} ${T.min}`;
    case 'fahrzeugwechsel': return `${a.stop}: ${T.aFahrzeugwechsel}${a.fahrzeug ? ` ${T.aFahrzeugwechselAuf} ${a.fahrzeug}` : ''}`;
    case 'fahrzeugwechsel_entfernt': return `${a.stop}: ${T.aFahrzeugwechselEntfernt}`;
    case 'mitfahrt': return `${a.stop}: ${a.an ? T.aNurMitfahrt : T.aMitfahrtAufgehoben}`;
    case 'ladehinweis': return `${a.stop}: ${T.aLadehinweis}`;
    case 'paletten': return `${a.stop}: ${T.aPaletten}`;
    default: return '';
  }
}

/** Liste der Aenderungen als deutsche Saetze (Planer). */
export function vergleicheFreigabe(
  alt: FreigabeStand,
  neu: FreigabeStand,
  opt: FreigabeVergleichOptionen = {},
): string[] {
  return aenderungenFreigabe(alt, neu, opt).map((a) => formatAenderung(a, 'de'));
}
