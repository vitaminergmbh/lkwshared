import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitIntoLoads, checkLoads, numberLoadsOfDay, activeTruckIdAt, splitByTruck } from './tourLoads.ts';
import type { LoadStop } from './tourLoads.ts';

function depot(index: number, departure?: string): LoadStop {
  return { index, isDepot: true, pallets: 0, departure };
}
function lieferung(index: number, pallets: number): LoadStop {
  return { index, isDepot: false, pallets };
}

test('Drei Standorte ab einem Depot sind eine Ladung mit drei Teiltouren', () => {
  const loads = splitIntoLoads([depot(0, '2026-08-27T07:30:00Z'), lieferung(1, 3), lieferung(2, 3), lieferung(3, 3)]);
  assert.equal(loads.length, 1);
  assert.deepEqual(loads[0]!.deliveryIndexes, [1, 2, 3]);
  assert.equal(loads[0]!.pallets, 9);
});

test('Neun Paletten auf acht Stellplaetzen gehen nicht', () => {
  const loads = splitIntoLoads([depot(0), lieferung(1, 3), lieferung(2, 3), lieferung(3, 3)]);
  const [check] = checkLoads(loads, () => 8);
  assert.equal(check!.overloaded, true);
  assert.equal(check!.missing, 1);
});

test('Neun Paletten auf zehn Stellplaetzen passen', () => {
  const loads = splitIntoLoads([depot(0), lieferung(1, 3), lieferung(2, 3), lieferung(3, 3)]);
  const [check] = checkLoads(loads, () => 10);
  assert.equal(check!.overloaded, false);
  assert.equal(check!.missing, 0);
});

test('Zurueck ans Depot heisst neue Ladung', () => {
  // Genau der Praxisfall aus der Tourenliste: LEUNA, Lieferung, LEUNA, Lieferung.
  const loads = splitIntoLoads([
    depot(0, '2026-08-27T05:54:00Z'), lieferung(1, 4),
    depot(2, '2026-08-27T08:22:00Z'), lieferung(3, 6),
    depot(4, '2026-08-27T12:34:00Z'), lieferung(5, 2), lieferung(6, 5),
  ]);
  assert.equal(loads.length, 3);
  assert.deepEqual(loads.map((l) => l.pallets), [4, 6, 7]);
  assert.deepEqual(loads.map((l) => l.deliveryIndexes.length), [1, 1, 2]);
});

test('Jede Ladung wird einzeln geprueft, nicht die ganze Tour', () => {
  // Zusammen 20 Paletten, aber nie mehr als 8 gleichzeitig an Bord.
  const loads = splitIntoLoads([
    depot(0), lieferung(1, 7),
    depot(2), lieferung(3, 6),
    depot(4), lieferung(5, 7),
  ]);
  const checks = checkLoads(loads, () => 8);
  assert.equal(checks.every((c) => !c.overloaded), true, 'keine einzelne Ladung sprengt das Fahrzeug');
});

test('Ein Depot ohne folgende Lieferung ist keine Ladung', () => {
  // Der Fahrer startet am Hof, faehrt zum Ladedepot: der Hof zaehlt nicht.
  const loads = splitIntoLoads([depot(0), depot(1, '2026-08-27T07:54:00Z'), lieferung(2, 5)]);
  assert.equal(loads.length, 1);
  assert.equal(loads[0]!.depotIndex, 1);
  assert.equal(loads[0]!.departure, '2026-08-27T07:54:00Z');
});

test('Auch das Depot am Ende der Tour zaehlt nicht als Ladung', () => {
  const loads = splitIntoLoads([depot(0), lieferung(1, 3), depot(2)]);
  assert.equal(loads.length, 1);
  assert.deepEqual(loads[0]!.deliveryIndexes, [1]);
});

test('Ein Fahrzeugwechsel aendert die Kapazitaet der folgenden Ladung', () => {
  const loads = splitIntoLoads([depot(0), lieferung(1, 12), depot(2), lieferung(3, 12)]);
  // Ab Stopp 2 faehrt ein kleineres Fahrzeug.
  const checks = checkLoads(loads, (i) => (i < 2 ? 18 : 8));
  assert.equal(checks[0]!.overloaded, false, '12 passen in den grossen');
  assert.equal(checks[1]!.overloaded, true, '12 passen nicht in den kleinen');
  assert.equal(checks[1]!.missing, 4);
});

test('Ohne gepflegte Kapazitaet wird nicht geprueft', () => {
  const loads = splitIntoLoads([depot(0), lieferung(1, 99)]);
  const [check] = checkLoads(loads, () => null);
  assert.equal(check!.overloaded, false);
  assert.equal(check!.capacity, null);
});

test('Lieferungen vor dem ersten Depot gehoeren zu keiner Ladung', () => {
  const loads = splitIntoLoads([lieferung(0, 5), depot(1), lieferung(2, 3)]);
  assert.equal(loads.length, 1);
  assert.deepEqual(loads[0]!.deliveryIndexes, [2]);
});

test('Tournummern richten sich nach der Abfahrt, ueber alle Fahrzeuge hinweg', () => {
  const nummeriert = numberLoadsOfDay([
    { tourId: 'b', departure: '2026-08-27T07:45:00Z' },
    { tourId: 'a', departure: '2026-08-27T07:30:00Z' },
    { tourId: 'c', departure: '2026-08-27T09:00:00Z' },
  ]);
  assert.deepEqual(nummeriert.map((l) => [l.tourId, l.tourNumber]), [['a', 1], ['b', 2], ['c', 3]]);
});

test('Ladungen ohne Abfahrtszeit stehen hinten', () => {
  const nummeriert = numberLoadsOfDay([
    { tourId: 'ohne', departure: null },
    { tourId: 'mit', departure: '2026-08-27T07:30:00Z' },
  ]);
  assert.deepEqual(nummeriert.map((l) => l.tourId), ['mit', 'ohne']);
});

test('Zwei Ladungen desselben Fahrzeugs bekommen verschiedene Nummern', () => {
  // Ein LKW faehrt vormittags und nachmittags — das sind zwei Touren.
  const nummeriert = numberLoadsOfDay([
    { tourId: 't1', departure: '2026-08-27T05:54:00Z' },
    { tourId: 't1', departure: '2026-08-27T12:34:00Z' },
    { tourId: 't2', departure: '2026-08-27T07:15:00Z' },
  ]);
  assert.deepEqual(nummeriert.map((l) => l.tourNumber), [1, 2, 3]);
  assert.equal(nummeriert[1]!.tourId, 't2', 'nach Abfahrt sortiert, nicht nach Fahrzeug');
});

// === activeTruckIdAt ===

test('Ohne Wechsel faehrt ueberall das Fahrzeug der Tour', () => {
  const stops = [{}, {}, {}];
  assert.equal(activeTruckIdAt(stops, 'tour-lkw', 0), 'tour-lkw');
  assert.equal(activeTruckIdAt(stops, 'tour-lkw', 2), 'tour-lkw');
});

test('Der Wechsel gilt erst fuer den Abschnitt NACH dem Stopp', () => {
  // An Stopp 1 wird gewechselt: die Fahrt DORTHIN ist noch das alte Fahrzeug.
  const stops = [{}, { truck_id: 'neu' }, {}];
  assert.equal(activeTruckIdAt(stops, 'alt', 1), 'alt', 'Anfahrt zum Wechselstopp');
  assert.equal(activeTruckIdAt(stops, 'alt', 2), 'neu', 'danach das neue');
});

test('Mehrere Wechsel: es zaehlt der letzte davor', () => {
  const stops = [{ truck_id: 'a' }, {}, { truck_id: 'b' }, {}];
  assert.equal(activeTruckIdAt(stops, 'start', 1), 'a');
  assert.equal(activeTruckIdAt(stops, 'start', 3), 'b');
});

test('Ohne Index liefert sie das Fahrzeug am Ende der Tour', () => {
  const stops = [{ truck_id: 'a' }, { truck_id: 'b' }];
  assert.equal(activeTruckIdAt(stops, 'start'), 'b');
});

test('Ohne Fahrzeug an der Tour und ohne Wechsel bleibt es leer', () => {
  assert.equal(activeTruckIdAt([{}, {}], null, 2), null);
});

// === splitByTruck ===

const s = (truck_id?: string) => ({ truck_id: truck_id ?? null });

test('Ohne Wechsel bleibt die Tour ein Abschnitt', () => {
  const teile = splitByTruck([s(), s(), s()], 'lkw-a');
  assert.equal(teile.length, 1);
  assert.equal(teile[0]!.truckId, 'lkw-a');
  assert.equal(teile[0]!.stops.length, 3);
});

test('Der Wechselstop gehoert zu beiden Abschnitten', () => {
  // Mit dem alten Wagen faehrt man hin, mit dem neuen weiter. Fehlt die
  // Ueberlappung, faengt die zweite Route erst am uebernaechsten Stop an.
  const stops = [s(), s('lkw-b'), s(), s()];
  const teile = splitByTruck(stops, 'lkw-a');
  assert.equal(teile.length, 2);
  assert.deepEqual(teile.map((t) => t.truckId), ['lkw-a', 'lkw-b']);
  assert.equal(teile[0]!.stops.length, 2, 'Start + Wechselstop');
  assert.equal(teile[1]!.stops.length, 3, 'Wechselstop + Rest');
  assert.equal(teile[0]!.stops[1], teile[1]!.stops[0], 'derselbe Stop');
});

test('Zwei Wechsel ergeben drei Abschnitte', () => {
  const teile = splitByTruck([s(), s('b'), s(), s('c'), s()], 'a');
  assert.deepEqual(teile.map((t) => t.truckId), ['a', 'b', 'c']);
});

test('Ein Wechsel auf dasselbe Fahrzeug teilt nicht', () => {
  const teile = splitByTruck([s(), s('a'), s()], 'a');
  assert.equal(teile.length, 1);
});

test('Abschnitte mit nur einem Stop fallen weg', () => {
  // Wechsel am letzten Stop: danach wird nichts mehr gefahren.
  const teile = splitByTruck([s(), s(), s('b')], 'a');
  assert.equal(teile.length, 1);
  assert.equal(teile[0]!.truckId, 'a');
});

test('Leere Tour ergibt keine Abschnitte', () => {
  assert.deepEqual(splitByTruck([], 'a'), []);
  assert.deepEqual(splitByTruck([s()], 'a'), []);
});
