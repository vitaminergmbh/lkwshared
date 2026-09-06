import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vergleicheFreigabe } from './releaseDiff.ts';
import type { FreigabeStand, FreigabeStop } from './releaseDiff.ts';

const stop = (id: string, order: number, extra: Partial<FreigabeStop> = {}): FreigabeStop => ({
  id, stop_order: order, custom_name: id.toUpperCase(),
  arrival_eta: `2026-09-06T${10 + order}:00:00+02:00`,
  departure_eta: `2026-09-06T${10 + order}:30:00+02:00`,
  loading_time: 30, wait_time: 0, truck_id: 't1', ride_along: false,
  ...extra,
});

const stand = (stops: FreigabeStop[], tour = {}): FreigabeStand => ({
  tour: { date: '2026-09-06', start_time: '10:00:00', truck_id: 't1', driver_id: 'd1', ...tour },
  stops,
});

test('Unveraenderte Tour ergibt keine Aenderungen', () => {
  const a = stand([stop('a', 0), stop('b', 1)]);
  assert.deepEqual(vergleicheFreigabe(a, a), []);
});

test('Verschiebung unter der Toleranz zaehlt nicht, darueber schon', () => {
  const alt = stand([stop('a', 0)]);
  const wenig = stand([stop('a', 0, { arrival_eta: '2026-09-06T10:03:00+02:00' })]);
  const viel = stand([stop('a', 0, { arrival_eta: '2026-09-06T10:20:00+02:00' })]);
  assert.deepEqual(vergleicheFreigabe(alt, wenig), []);
  assert.deepEqual(vergleicheFreigabe(alt, viel), ['A: Ankunft 10:00 → 10:20']);
});

test('Neuer, entfernter und umsortierter Stop werden benannt', () => {
  const alt = stand([stop('a', 0), stop('b', 1), stop('c', 2)]);
  const neu = stand([stop('b', 0), stop('a', 1), stop('d', 2)]);
  const z = vergleicheFreigabe(alt, neu, { toleranzMin: 999 });
  assert.ok(z.includes('Stop entfernt: C'));
  assert.ok(z.includes('Neuer Stop: D (Position 3)'));
  assert.ok(z.includes('Reihenfolge geändert'));
});

test('Zeiten am Stop, Fahrzeugwechsel und Tourkopf', () => {
  const alt = stand([stop('a', 0)]);
  const neu = stand(
    [stop('a', 0, { loading_time: 45, wait_time: 60, truck_id: 't2' })],
    { start_time: '11:30:00', truck_id: 't2' },
  );
  const z = vergleicheFreigabe(alt, neu, { truckName: (id) => (id === 't2' ? 'Actros' : 'Nissan') });
  assert.deepEqual(z, [
    'Startzeit: 10:00 → 11:30',
    'Startfahrzeug: Nissan → Actros',
    'A: Be-/Entladen 30 → 45 Min.',
    'A: Warten 0 → 60 Min.',
    'A: Fahrzeugwechsel auf Actros',
  ]);
});

test('Eigener Name je Stop', () => {
  const alt = stand([stop('a', 0)]);
  const neu = stand([stop('a', 0, { load_note: 'Kisten oben' })]);
  assert.deepEqual(vergleicheFreigabe(alt, neu, { nameOf: () => 'REWE' }), ['REWE: Ladehinweis geändert']);
});
