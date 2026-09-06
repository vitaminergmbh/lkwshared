/**
 * Was hat sich seit der letzten Freigabe an der Tour geaendert?
 *
 * Verglichen wird der freigegebene Stand (Kopie in driver_tour_releases)
 * mit den Arbeitsdaten. Heraus kommt eine Liste kurzer deutscher Saetze —
 * fuer die Disposition ("das sieht der Fahrer noch nicht") und als
 * Vorschlag fuer den Hinweistext bei der naechsten Freigabe.
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

/** Liste der Aenderungen; leer heisst: der Fahrer sieht den aktuellen Stand. */
export function vergleicheFreigabe(
  alt: FreigabeStand,
  neu: FreigabeStand,
  opt: FreigabeVergleichOptionen = {},
): string[] {
  const toleranz = opt.toleranzMin ?? 5;
  const name = opt.nameOf ?? ((s: FreigabeStop) => s.custom_name ?? s.location_id ?? 'Stop');
  const fahrzeug = (id: string | null | undefined) => opt.truckName?.(id) ?? null;
  const raus: string[] = [];

  // --- Tour ---
  if ((alt.tour.date ?? null) !== (neu.tour.date ?? null)) {
    raus.push(`Datum: ${alt.tour.date ?? '–'} → ${neu.tour.date ?? '–'}`);
  }
  if ((alt.tour.start_time ?? null) !== (neu.tour.start_time ?? null)) {
    raus.push(`Startzeit: ${stundeMinute(alt.tour.start_time)} → ${stundeMinute(neu.tour.start_time)}`);
  }
  if ((alt.tour.truck_id ?? null) !== (neu.tour.truck_id ?? null)) {
    const a = fahrzeug(alt.tour.truck_id);
    const b = fahrzeug(neu.tour.truck_id);
    raus.push(a || b ? `Startfahrzeug: ${a ?? '–'} → ${b ?? '–'}` : 'Startfahrzeug geändert');
  }
  if ((alt.tour.driver_id ?? null) !== (neu.tour.driver_id ?? null)) {
    raus.push('Fahrer geändert');
  }

  // --- Stops: weg, neu, Reihenfolge ---
  const altSortiert = [...alt.stops].sort((a, b) => a.stop_order - b.stop_order);
  const neuSortiert = [...neu.stops].sort((a, b) => a.stop_order - b.stop_order);
  const altById = new Map(altSortiert.map((s) => [s.id, s]));
  const neuById = new Map(neuSortiert.map((s) => [s.id, s]));

  for (const s of altSortiert) {
    if (!neuById.has(s.id)) raus.push(`Stop entfernt: ${name(s)}`);
  }
  neuSortiert.forEach((s, i) => {
    if (!altById.has(s.id)) raus.push(`Neuer Stop: ${name(s)} (Position ${i + 1})`);
  });

  const gemeinsamAlt = altSortiert.filter((s) => neuById.has(s.id)).map((s) => s.id);
  const gemeinsamNeu = neuSortiert.filter((s) => altById.has(s.id)).map((s) => s.id);
  if (gemeinsamAlt.join('|') !== gemeinsamNeu.join('|')) raus.push('Reihenfolge geändert');

  // --- Stops: Inhalt ---
  for (const n of neuSortiert) {
    const a = altById.get(n.id);
    if (!a) continue;
    const wer = name(n);

    if ((a.location_id ?? null) !== (n.location_id ?? null) || leer(a.custom_name) !== leer(n.custom_name)) {
      raus.push(`${name(a)} → ${wer} (Standort getauscht)`);
    }
    const dAnkunft = minutenZwischen(a.arrival_eta, n.arrival_eta);
    if (dAnkunft != null && Math.abs(dAnkunft) >= toleranz) {
      raus.push(`${wer}: Ankunft ${hhmm(a.arrival_eta)} → ${hhmm(n.arrival_eta)}`);
    } else {
      // Abfahrt nur melden, wenn die Ankunft still steht — sonst ist es
      // dieselbe Verschiebung zweimal.
      const dAbfahrt = minutenZwischen(a.departure_eta, n.departure_eta);
      if (dAbfahrt != null && Math.abs(dAbfahrt) >= toleranz) {
        raus.push(`${wer}: Abfahrt ${hhmm(a.departure_eta)} → ${hhmm(n.departure_eta)}`);
      }
    }
    if ((a.loading_time ?? 0) !== (n.loading_time ?? 0)) {
      raus.push(`${wer}: Be-/Entladen ${a.loading_time ?? 0} → ${n.loading_time ?? 0} Min.`);
    }
    if ((a.wait_time ?? 0) !== (n.wait_time ?? 0)) {
      raus.push(`${wer}: Warten ${a.wait_time ?? 0} → ${n.wait_time ?? 0} Min.`);
    }
    if ((a.truck_id ?? null) !== (n.truck_id ?? null)) {
      const b = fahrzeug(n.truck_id);
      raus.push(n.truck_id ? `${wer}: Fahrzeugwechsel${b ? ` auf ${b}` : ''}` : `${wer}: Fahrzeugwechsel entfernt`);
    }
    if (!!a.ride_along !== !!n.ride_along) {
      raus.push(`${wer}: ${n.ride_along ? 'nur Mitfahrt' : 'Mitfahrt aufgehoben'}`);
    }
    if (leer(a.load_note) !== leer(n.load_note) || leer(a.unload_note) !== leer(n.unload_note)) {
      raus.push(`${wer}: Ladehinweis geändert`);
    }
    if ((a.pallets_load ?? 0) !== (n.pallets_load ?? 0) || (a.pallets_unload ?? 0) !== (n.pallets_unload ?? 0)) {
      raus.push(`${wer}: Paletten geändert`);
    }
  }

  return raus;
}
