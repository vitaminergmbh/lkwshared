import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTourLoad } from './palletLoad.ts';
import type { TourStop, Truck } from '../types.ts';

// Nur die Felder, die die Rechnung anfasst — der Rest von TourStop ist fuer
// diese Logik ohne Bedeutung.
function stop(
  id: string,
  order: number,
  load: number,
  unload: number,
  truckId: string | null = null,
): TourStop {
  return {
    id, stop_order: order, pallets_load: load, pallets_unload: unload, truck_id: truckId,
  } as unknown as TourStop;
}

function truck(id: string, capacity: number | null): Pick<Truck, 'id' | 'pallet_capacity'> {
  return { id, pallet_capacity: capacity };
}

test('Bestand laeuft ueber mehrere Teilstandorte korrekt mit', () => {
  const stops = [
    stop('a', 0, 18, 0),   // Depot: 18 aufnehmen
    stop('b', 1, 0, 6),    // 6 abgeben -> 12
    stop('c', 2, 4, 3),    // 3 ab, 4 auf -> 13
    stop('d', 3, 0, 13),   // alles abgeben -> 0
  ];
  const r = computeTourLoad(stops, [truck('t1', 20)], 't1');

  assert.equal(r.byStop.get('a')!.after, 18);
  assert.equal(r.byStop.get('b')!.after, 12);
  assert.equal(r.byStop.get('c')!.after, 13);
  assert.equal(r.byStop.get('d')!.after, 0);
  assert.equal(r.hasOverload, false);
  assert.equal(r.hasNegative, false);
});

test('Am Stop wird erst entladen, dann geladen', () => {
  // Waere es andersherum, stuende hier zwischenzeitlich 12 und damit eine
  // Ueberladung, obwohl real nie mehr als 10 an Bord sind.
  const stops = [stop('a', 0, 10, 0), stop('b', 1, 4, 4)];
  const r = computeTourLoad(stops, [truck('t1', 10)], 't1');

  assert.equal(r.byStop.get('b')!.after, 10);
  assert.equal(r.hasOverload, false);
});

test('Nicht der Endbestand zaehlt, sondern der Hoechststand', () => {
  const stops = [stop('a', 0, 22, 0), stop('b', 1, 0, 22)];
  const r = computeTourLoad(stops, [truck('t1', 18)], 't1');

  assert.equal(r.peak, 22);
  assert.equal(r.byStop.get('b')!.after, 0);
  assert.equal(r.hasOverload, true, 'Ueberladung darf nicht durchrutschen, nur weil die Tour leer endet');
});

test('Fahrzeugwechsel: das neue Fahrzeug startet leer', () => {
  // Der Bestand des alten Fahrzeugs faehrt nicht mit — es bleibt ja stehen.
  const stops = [
    stop('a', 0, 16, 0),             // 16 im ersten Fahrzeug
    stop('b', 1, 0, 0, 'zweit'),     // hier wird gewechselt, nichts bewegt
  ];
  const r = computeTourLoad(stops, [truck('erst', 18), truck('zweit', 33)], 'erst');

  assert.equal(r.byStop.get('b')!.truckChanged, true);
  assert.equal(r.byStop.get('b')!.before, 0, 'das neue Fahrzeug faengt leer an');
  assert.equal(r.byStop.get('b')!.after, 0);
  assert.equal(r.byStop.get('b')!.capacity, 33, 'ab hier gilt die Kapazitaet des neuen Fahrzeugs');
});

test('Fahrzeugwechsel mit Umladung: nur die frische Ladung zaehlt', () => {
  // Der Fall aus der Praxis: mit 4 Paletten ankommen, Fahrzeug tauschen,
  // 22 aufnehmen und 1 abgeben. Im neuen Fahrzeug liegen dann 21 — nicht 25.
  const stops = [
    stop('a', 0, 4, 0),
    stop('b', 1, 22, 1, 'gross'),
  ];
  const r = computeTourLoad(stops, [truck('klein', 18), truck('gross', 33)], 'klein');

  assert.equal(r.byStop.get('b')!.after, 21);
  assert.equal(r.byStop.get('b')!.negative, false, 'die Abgabe stammt aus der frischen Ladung');
  assert.equal(r.byStop.get('b')!.capacity, 33);
  assert.equal(r.hasOverload, false);
});

test('Fahrzeugwechsel auf ein kleineres Fahrzeug meldet Ueberladung', () => {
  const stops = [
    stop('a', 0, 2, 0),
    stop('b', 1, 16, 0, 'klein'),   // 16 in ein Fahrzeug mit 8 Plaetzen
  ];
  const r = computeTourLoad(stops, [truck('gross', 18), truck('klein', 8)], 'gross');

  assert.equal(r.byStop.get('b')!.after, 16);
  assert.equal(r.byStop.get('b')!.capacity, 8);
  assert.equal(r.byStop.get('b')!.overloaded, true);
  assert.equal(r.hasOverload, true);
});

test('Mehr entladen als an Bord wird gemeldet und laeuft nicht ins Minus', () => {
  const stops = [stop('a', 0, 3, 0), stop('b', 1, 0, 5), stop('c', 2, 2, 0)];
  const r = computeTourLoad(stops, [truck('t1', 10)], 't1');

  assert.equal(r.byStop.get('b')!.negative, true);
  assert.equal(r.byStop.get('b')!.after, 0, 'nicht negativ weiterrechnen');
  assert.equal(r.byStop.get('c')!.after, 2, 'der Folgestand bleibt dadurch brauchbar');
  assert.equal(r.hasNegative, true);
});

test('Ohne gepflegte Kapazitaet wird nicht geprueft', () => {
  const stops = [stop('a', 0, 99, 0)];
  const r = computeTourLoad(stops, [truck('t1', null)], 't1');

  assert.equal(r.byStop.get('a')!.capacity, null);
  assert.equal(r.hasOverload, false);
  assert.equal(r.peak, 99);
});

test('Stops ohne Palettenangaben gelten als leer', () => {
  const stops = [{ id: 'a', stop_order: 0, truck_id: null } as unknown as TourStop];
  const r = computeTourLoad(stops, [truck('t1', 10)], 't1');

  assert.equal(r.hasData, false);
  assert.equal(r.byStop.get('a')!.after, 0);
});

test('Die Reihenfolge richtet sich nach stop_order, nicht nach der Array-Folge', () => {
  const stops = [stop('b', 1, 0, 5), stop('a', 0, 5, 0)];
  const r = computeTourLoad(stops, [truck('t1', 10)], 't1');

  assert.equal(r.byStop.get('a')!.after, 5);
  assert.equal(r.byStop.get('b')!.after, 0);
  assert.equal(r.hasNegative, false);
});
