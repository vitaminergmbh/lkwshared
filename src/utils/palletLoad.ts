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
  /**
   * An diesem Stop wird das Fahrzeug gewechselt. Der Bestand des vorherigen
   * Fahrzeugs faehrt dann NICHT mit — das neue startet leer.
   */
  truckChanged: boolean;
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
  // `truck_id` an einem Stop heisst: ab hier faehrt ein anderes Fahrzeug. Das
  // Segment, das diesen Stop verlaesst, gehoert also schon zum neuen.
  let activeTruckId: string | null = tourTruckId;

  ordered.forEach((stop) => {
    const loaded = stop.pallets_load ?? 0;
    const unloaded = stop.pallets_unload ?? 0;
    if (loaded > 0 || unloaded > 0) hasData = true;

    const truckChanged = !!stop.truck_id && stop.truck_id !== activeTruckId;
    if (stop.truck_id) activeTruckId = stop.truck_id;
    const capacity = activeTruckId ? capacityById.get(activeTruckId) ?? null : null;

    let before: number;
    let after: number;
    let negative: boolean;

    if (truckChanged) {
      // Das neue Fahrzeug startet leer — was im alten lag, faehrt nicht mit.
      // Was hier abgegeben wird, kann folglich nur aus der frischen Ladung
      // stammen, deshalb wird schlicht verrechnet.
      before = 0;
      after = Math.max(0, loaded - unloaded);
      negative = unloaded > loaded;
    } else {
      before = onBoard;
      negative = unloaded > before;
      // Bei zu viel Entladung nicht ins Minus laufen — sonst verschiebt der
      // Fehler alle folgenden Staende. Gemeldet wird er ueber `negative`.
      after = Math.max(0, before - unloaded) + loaded;
    }

    const overloaded = capacity != null && after > capacity;

    if (negative) hasNegative = true;
    if (overloaded) hasOverload = true;
    if (after > peak) {
      peak = after;
      peakCapacity = capacity;
    }

    byStop.set(stop.id, {
      stopId: stop.id, before, loaded, unloaded, after, capacity, overloaded, negative, truckChanged,
    });
    onBoard = after;
  });

  return { byStop, peak, peakCapacity, hasOverload, hasNegative, hasData };
}
