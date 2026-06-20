import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDateTime,
  addMinutesToDateTime,
  getDayOfWeek,
  getTimeFromDateTime,
  formatDateTimeToTime,
} from './formatters.ts';

// Diese Tests sind bewusst zeitzonen-unabhängig: die Logik muss in jeder
// Laufzeit-Zeitzone (z.B. Render läuft in UTC) dieselbe Berliner Wanduhr-Zeit
// liefern. Ausführen z.B. mit:  TZ=UTC node --test src/utils/formatters.test.ts

test('Sommer (CEST/+02:00): 08:00 Berlin -> Instant 06:00Z', () => {
  const dt = createDateTime('2026-06-20', '08:00');
  assert.equal(dt, '2026-06-20T06:00:00.000Z');
  assert.equal(getTimeFromDateTime(dt), '08:00');
  assert.equal(getDayOfWeek(dt), 5); // Samstag (0=Mo)
});

test('Winter (CET/+01:00): 08:00 Berlin -> Instant 07:00Z', () => {
  const dt = createDateTime('2026-01-15', '08:00');
  assert.equal(dt, '2026-01-15T07:00:00.000Z');
  assert.equal(getTimeFromDateTime(dt), '08:00');
  assert.equal(getDayOfWeek(dt), 3); // Donnerstag
});

test('Fahrzeit sind echte Minuten: 08:00 + 150min = 10:30 Berlin', () => {
  const dt = createDateTime('2026-06-20', '08:00');
  assert.equal(formatDateTimeToTime(addMinutesToDateTime(dt, 150)), '10:30');
});

test('Mitternachts-Rollover: 23:30 + 60min = 00:30 / Wochentag rollt weiter', () => {
  const late = createDateTime('2026-06-20', '23:30');
  const next = addMinutesToDateTime(late, 60);
  assert.equal(getTimeFromDateTime(next), '00:30');
  assert.equal(getDayOfWeek(next), 6); // Sonntag
});

test('Gespeicherter Live-Instant (UTC-Z) wird in Berlin angezeigt', () => {
  assert.equal(formatDateTimeToTime('2026-06-20T12:00:00.000Z'), '14:00');
});

test('Null/leere Werte werden abgefangen', () => {
  assert.equal(formatDateTimeToTime(null), '--:--');
  assert.equal(formatDateTimeToTime(undefined), '--:--');
  assert.equal(formatDateTimeToTime(''), '--:--');
});
