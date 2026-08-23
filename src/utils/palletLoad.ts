import type { TourStop, Truck } from '../types';

/**
 * Palettenbestand ueber eine Tour hinweg.
 *
 * Gerechnet wird in Stellplaetzen (EPAL-Basis), nicht nach Palettentyp.
 *
 * Drei Dinge, an denen eine naive Rechnung vorbeigeht:
 *
 * 1. Ein Fahrzeugwechsel mitten in der Tour (`TourStop.truck_id`) aendert die
 *    Kapazitaet. Eine Ladung, die in den 15t passt, sprengt danach den 7,2t —
 *    geprueft wird deshalb je Abschnitt gegen das Fahrzeug, das ihn faehrt.
 * 2. Nicht der Endbestand zaehlt, sondern der Hoechststand. Eine Tour, die mit
 *    null endet, kann zwischendurch randvoll gewesen sein.
 * 3. Am Stop wird erst entladen, dann geladen. Andersherum waere die Spitze
 *    kuenstlich zu hoch.
 */

export interface StopLoad {
  stopId: string;
  /** Bestand bei der Ankunft, also bevor an diesem Stop bewegt wird. */
  before: number;
  loaded: number;
  unloaded: number;
  /** Bestand bei der Abfahrt — dieser Wert faehrt zum naechsten Stop mit. */
  after: number;
  /** Kapazitaet des Fahrzeugs, das ab hier faehrt; null = nicht gepflegt. */
  capacity: number | null;
  /** Bestand bei Abfahrt uebersteigt die Kapazitaet. */
  overloaded: boolean;
  /**
   * Es sollten mehr Paletten abgegeben werden als an Bord sind. Fast immer ein
   * Eingabefehler, der bei mehreren Teilstandorten leicht unbemerkt bleibt.
   */
  negative: boolean;
}

export interface TourLoadResult {
  byStop: Map<string, StopLoad>;
  /** Hoechster Bestand auf einem Abschnitt. */
  peak: number;
  /** Kapazitaet an der Stelle des Hoechststands; null = nicht gepflegt. */
  peakCapacity: number | null;
  /** Irgendein Abschnitt ist ueberladen. */
  hasOverload: boolean;
  /** Irgendwo wird mehr entladen als vorhanden. */
  hasNegative: boolean;
  /** Es ist ueberhaupt eine Palettenbewegung erfasst. */
  hasData: boolean;
}

/**
 * Fahrzeug, das ab dem Stop mit Index `i` faehrt: das zuletzt gesetzte
 * `truck_id` bis einschliesslich hier, sonst das Fahrzeug der Tour.
 */
function truckIdForStop(stops: TourStop[], i: number, tourTruckId: string | null): string | null {
  let id = tourTruckId;
  for (let k = 0; k <= i; k++) {
    const s = stops[k]?.truck_id;
    if (s) id = s;
  }
  return id;
}

export function computeTourLoad(
  stops: TourStop[],
  trucks: Array<Pick<Truck, 'id' | 'pallet_capacity'>>,
  tourTruckId: string | null,
): TourLoadResult {
  const capacityById = new Map<string, number | null>(
    trucks.map((t) => [t.id, t.pallet_capacity ?? null]),
  );
  const byStop = new Map<string, StopLoad>();
  const ordered = [...stops].sort((a, b) => a.stop_order - b.stop_order);

  let onBoard = 0;
  let peak = 0;
  let peakCapacity: number | null = null;
  let hasOverload = false;
  let hasNegative = false;
  let hasData = false;

  ordered.forEach((stop, i) => {
    const loaded = stop.pallets_load ?? 0;
    const unloaded = stop.pallets_unload ?? 0;
    if (loaded > 0 || unloaded > 0) hasData = true;

    const before = onBoard;
    const negative = unloaded > before;
    // Bei zu viel Entladung nicht ins Minus laufen — sonst verschiebt der
    // Fehler alle folgenden Staende. Gemeldet wird er ueber `negative`.
    const afterUnload = Math.max(0, before - unloaded);
    const after = afterUnload + loaded;

    const truckId = truckIdForStop(ordered, i, tourTruckId);
    const capacity = truckId ? capacityById.get(truckId) ?? null : null;
    const overloaded = capacity != null && after > capacity;

    if (negative) hasNegative = true;
    if (overloaded) hasOverload = true;
    if (after > peak) {
      peak = after;
      peakCapacity = capacity;
    }

    byStop.set(stop.id, { stopId: stop.id, before, loaded, unloaded, after, capacity, overloaded, negative });
    onBoard = after;
  });

  return { byStop, peak, peakCapacity, hasOverload, hasNegative, hasData };
}
