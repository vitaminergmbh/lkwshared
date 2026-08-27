/**
 * Ladungen ("Obertouren") innerhalb einer Tour.
 *
 * Fachlich ist eine *Tour* eine Ladung: das Fahrzeug nimmt am Depot Ware auf
 * und liefert sie aus. Jede Lieferung an einen einzelnen Standort ist eine
 * *Teiltour*. Faehrt dasselbe Fahrzeug danach zurueck ans Depot und laedt
 * erneut, ist das die naechste Tour.
 *
 * In dieser Anwendung ist eine Tour dagegen der ganze Tag eines Fahrers — sie
 * enthaelt also typischerweise mehrere Ladungen. Diese Funktion schneidet sie
 * auseinander.
 *
 * Wichtig fuer die Kapazitaet: geprueft wird je Ladung, nicht je Tour. Werden
 * am Depot drei Standorte mit je drei Paletten aufgenommen, sind das neun
 * Stellplaetze — passt das Fahrzeug nur acht, geht die Ladung so nicht.
 */

export interface LoadStop {
  /** Position in der Tour. */
  index: number;
  /** Depot-Stopp? Dort wird geladen, dort beginnt eine Ladung. */
  isDepot: boolean;
  /** Am Stopp abgegebene Paletten. */
  pallets: number;
  /** Geplante Abfahrt (ISO) — am Depot bestimmt sie die Reihenfolge des Tages. */
  departure?: string | null;
}

export interface TourLoad {
  /** Position des Depot-Stopps, an dem diese Ladung aufgenommen wird. */
  depotIndex: number;
  /** Positionen der Lieferungen dieser Ladung, in Reihenfolge. */
  deliveryIndexes: number[];
  /** Abfahrt vom Depot. Ordnet die Ladungen des Tages und damit die Tournummer. */
  departure: string | null;
  /** Summe der Paletten aller Lieferungen — der Platzbedarf dieser Ladung. */
  pallets: number;
}

/**
 * Eine Ladung beginnt an einem Depot-Stopp, auf den mindestens eine Lieferung
 * folgt.
 *
 * Der erste Stopp des Tages ist oft auch ein Depot — dort steht das Fahrzeug
 * ueber Nacht und wird geprueft, geladen wird erst am naechsten. Ein Depot ohne
 * folgende Lieferung ist deshalb keine Ladung, sondern nur eine Zwischenstation.
 */
export function splitIntoLoads(stops: LoadStop[]): TourLoad[] {
  const sorted = [...stops].sort((a, b) => a.index - b.index);
  const loads: TourLoad[] = [];
  let aktuell: TourLoad | null = null;

  for (const stop of sorted) {
    if (stop.isDepot) {
      // Neue Ladung beginnt; ob sie Bestand hat, entscheidet sich daran, ob
      // ihr noch Lieferungen folgen.
      aktuell = {
        depotIndex: stop.index,
        deliveryIndexes: [],
        departure: stop.departure ?? null,
        pallets: 0,
      };
      continue;
    }
    if (!aktuell) continue; // Lieferungen vor dem ersten Depot gehoeren zu keiner Ladung
    if (aktuell.deliveryIndexes.length === 0) loads.push(aktuell);
    aktuell.deliveryIndexes.push(stop.index);
    aktuell.pallets += stop.pallets;
  }

  return loads;
}

export interface LoadCheck extends TourLoad {
  /** Stellplaetze des Fahrzeugs, das diese Ladung faehrt; null = nicht gepflegt. */
  capacity: number | null;
  /** Die Ladung passt nicht auf das Fahrzeug. */
  overloaded: boolean;
  /** Wie viele Stellplaetze fehlen. */
  missing: number;
}

/**
 * Kapazitaetspruefung je Ladung.
 *
 * `capacityAt` liefert die Stellplaetze des Fahrzeugs, das ab dem uebergebenen
 * Stopp faehrt — beachtet also einen Fahrzeugwechsel mitten in der Tour.
 */
export function checkLoads(
  loads: TourLoad[],
  capacityAt: (stopIndex: number) => number | null,
): LoadCheck[] {
  return loads.map((load) => {
    const capacity = capacityAt(load.depotIndex);
    const overloaded = capacity != null && capacity > 0 && load.pallets > capacity;
    return {
      ...load,
      capacity,
      overloaded,
      missing: overloaded ? load.pallets - capacity! : 0,
    };
  });
}

/**
 * Tournummern eines Tages.
 *
 * Nummeriert wird ueber alle Fahrzeuge hinweg nach der Abfahrt vom Depot: wer
 * um 7:30 losfaehrt ist Tour 1, der naechste um 7:45 ist Tour 2. Ladungen ohne
 * Abfahrtszeit landen hinten, damit sie die Zaehlung der geplanten nicht
 * verschieben.
 */
export function numberLoadsOfDay<T extends { departure: string | null; tourId: string }>(
  loads: T[],
): Array<T & { tourNumber: number }> {
  const sortiert = [...loads].sort((a, b) => {
    if (a.departure && b.departure) {
      const d = a.departure.localeCompare(b.departure);
      if (d !== 0) return d;
    } else if (a.departure) return -1;
    else if (b.departure) return 1;
    // Gleiche Zeit oder beide ohne: stabil ueber die Tour-Kennung.
    return a.tourId.localeCompare(b.tourId);
  });
  return sortiert.map((load, i) => ({ ...load, tourNumber: i + 1 }));
}
