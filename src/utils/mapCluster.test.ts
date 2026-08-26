import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clusterPoints, boundsOf } from './mapCluster.ts';
import type { PixelPoint } from './mapCluster.ts';

function p(id: string, x: number, y: number, lat = x, lng = y): PixelPoint {
  return { id, x, y, lat, lng };
}

test('Weit auseinanderliegende Punkte bleiben einzeln', () => {
  const c = clusterPoints([p('a', 0, 0), p('b', 500, 0), p('c', 0, 500)], 60);
  assert.equal(c.length, 3);
  assert.deepEqual(c.map((x) => x.ids.length), [1, 1, 1]);
});

test('Punkte innerhalb des Radius werden zusammengefasst', () => {
  const c = clusterPoints([p('a', 0, 0), p('b', 30, 20), p('c', 400, 400)], 60);
  assert.equal(c.length, 2);
  const gross = c.find((x) => x.ids.length > 1)!;
  assert.deepEqual(gross.ids.sort(), ['a', 'b']);
});

test('Der Mittelpunkt liegt zwischen den Mitgliedern', () => {
  const c = clusterPoints([p('a', 0, 0, 10, 20), p('b', 10, 10, 12, 24)], 60);
  assert.equal(c.length, 1);
  assert.equal(c[0]!.lat, 11);
  assert.equal(c[0]!.lng, 22);
});

test('Genau auf dem Radius zaehlt noch dazu', () => {
  const c = clusterPoints([p('a', 0, 0), p('b', 60, 0)], 60);
  assert.equal(c.length, 1, 'Abstand gleich Radius gehoert noch zusammen');
});

test('Knapp ausserhalb des Radius bleibt getrennt', () => {
  const c = clusterPoints([p('a', 0, 0), p('b', 61, 0)], 60);
  assert.equal(c.length, 2);
});

test('Das Ergebnis haengt nicht an der Eingabereihenfolge', () => {
  const punkte = [p('a', 0, 0), p('b', 30, 0), p('c', 200, 0), p('d', 215, 0)];
  const vorwaerts = clusterPoints(punkte, 60);
  const rueckwaerts = clusterPoints([...punkte].reverse(), 60);
  assert.deepEqual(
    vorwaerts.map((c) => c.key).sort(),
    rueckwaerts.map((c) => c.key).sort(),
    'sonst saehe dieselbe Karte je nach Eintreffreihenfolge anders aus',
  );
});

test('Der Schluessel bleibt gleich, solange dieselben Punkte zusammenliegen', () => {
  const a = clusterPoints([p('x', 0, 0), p('y', 10, 10)], 60);
  const b = clusterPoints([p('y', 10, 10), p('x', 0, 0)], 60);
  assert.equal(a[0]!.key, b[0]!.key);
});

test('Jeder Punkt landet in genau einem Cluster', () => {
  const punkte = Array.from({ length: 20 }, (_, i) => p(`id${i}`, (i % 5) * 25, Math.floor(i / 5) * 25));
  const c = clusterPoints(punkte, 60);
  const alle = c.flatMap((x) => x.ids);
  assert.equal(alle.length, 20);
  assert.equal(new Set(alle).size, 20, 'kein Punkt doppelt');
});

test('Ohne Punkte gibt es keine Cluster', () => {
  assert.deepEqual(clusterPoints([], 60), []);
  assert.equal(boundsOf([]), null);
});

test('Das umschliessende Rechteck deckt alle Punkte ab', () => {
  const b = boundsOf([{ lat: 51, lng: 12 }, { lat: 52.5, lng: 11 }, { lat: 50.2, lng: 13.4 }])!;
  assert.equal(b.south, 50.2);
  assert.equal(b.north, 52.5);
  assert.equal(b.west, 11);
  assert.equal(b.east, 13.4);
});

test('Ein einzelner Punkt ergibt ein Rechteck ohne Ausdehnung', () => {
  const b = boundsOf([{ lat: 51, lng: 12 }])!;
  assert.equal(b.south, b.north);
  assert.equal(b.west, b.east);
});
