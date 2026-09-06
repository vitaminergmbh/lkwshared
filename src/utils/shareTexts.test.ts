import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shareTexts, formatDurationIn, isDriverLanguage, DRIVER_LANGUAGES,
} from './shareTexts.ts';
import type { DriverLanguage } from './shareTexts.ts';

test('Jede angebotene Sprache hat vollstaendige Bausteine', () => {
  // Ohne diese Pruefung faellt eine vergessene Uebersetzung erst dem Fahrer auf.
  const deutsch = shareTexts('de');
  const schluessel = Object.keys(deutsch) as Array<keyof typeof deutsch>;

  for (const { code } of DRIVER_LANGUAGES) {
    const t = shareTexts(code);
    for (const k of schluessel) {
      assert.notEqual(t[k], undefined, `${code}: ${String(k)} fehlt`);
      if (typeof deutsch[k] === 'string') {
        assert.equal(typeof t[k], 'string', `${code}: ${String(k)} hat den falschen Typ`);
      }
    }
  }
});

test('Ausser im Deutschen ist jeder Baustein tatsaechlich uebersetzt', () => {
  // "Tour", "min", "Route", "Plan" sind in mehreren Sprachen gleich — die sind ausgenommen.
  const gleichErlaubt = new Set(['tour', 'stop', 'min', 'std', 'stdMin', 'uhr', 'route', 'plan', 'aPosition']);
  const deutsch = shareTexts('de');

  for (const { code } of DRIVER_LANGUAGES) {
    if (code === 'de') continue;
    const t = shareTexts(code);
    for (const k of Object.keys(deutsch) as Array<keyof typeof deutsch>) {
      if (gleichErlaubt.has(k) || typeof deutsch[k] !== 'string') continue;
      assert.notEqual(t[k], deutsch[k], `${code}: "${String(k)}" ist noch deutsch`);
    }
  }
});

test('Unbekannte Sprache faellt auf Deutsch zurueck', () => {
  assert.equal(shareTexts('kli').fahrer, 'Fahrer');
  assert.equal(shareTexts(null).fahrer, 'Fahrer');
  assert.equal(shareTexts(undefined).fahrer, 'Fahrer');
  assert.equal(shareTexts('').fahrer, 'Fahrer');
});

test('isDriverLanguage erkennt nur gepflegte Codes', () => {
  assert.equal(isDriverLanguage('uk'), true);
  assert.equal(isDriverLanguage('de'), true);
  assert.equal(isDriverLanguage('fr'), false);
  assert.equal(isDriverLanguage(null), false);
  assert.equal(isDriverLanguage(42), false);
});

test('Die Stop-Zaehlung setzt die Zahlen richtig ein', () => {
  assert.equal(shareTexts('de').nochStops(1, 5), 'noch 1 von 5 Stops');
  assert.match(shareTexts('uk').nochStops(2, 7), /2.*7/);
  assert.match(shareTexts('en').nochStops(3, 9), /3 of 9/);
});

test('Dauer wird in der Sprache des Fahrers gebildet', () => {
  assert.equal(formatDurationIn('de', 45), '45 Min.');
  assert.equal(formatDurationIn('de', 120), '2h');
  assert.equal(formatDurationIn('de', 150), '2h 30min');
  assert.equal(formatDurationIn('uk', 45), '45 хв');
  assert.equal(formatDurationIn('ru', 150), '2ч 30мин');
  assert.equal(formatDurationIn('pl', 45), '45 min');
  assert.equal(formatDurationIn('en', 150), '2h 30min');
});

test('Fehlende oder unsinnige Dauer ergibt einen Strich', () => {
  assert.equal(formatDurationIn('de', null), '--');
  assert.equal(formatDurationIn('uk', undefined), '--');
  assert.equal(formatDurationIn('ru', -5), '--');
});

test('Null Minuten sind nicht leer', () => {
  assert.equal(formatDurationIn('de', 0), '0 Min.');
  assert.equal(formatDurationIn('uk', 0), '0 хв');
});

test('Die deutsche Uhrzeit traegt "Uhr", die anderen nicht', () => {
  assert.equal(shareTexts('de').uhr, ' Uhr');
  for (const code of ['uk', 'ru', 'pl', 'en'] as DriverLanguage[]) {
    assert.equal(shareTexts(code).uhr, '', `${code} sollte kein "Uhr" tragen`);
  }
});
