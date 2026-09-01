import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTourCosts, marginPercent } from './costCalculator.ts';
import type { Truck } from '../types.ts';

/**
 * Fahrzeug ohne Verbrauch, Maut und Miete: so bleibt in den Tests nur der
 * Fahrerlohn als direkte Kosten uebrig, und die Zuschlaege sind im Kopf
 * nachrechenbar.
 */
const NACKTER_LKW = {
  id: 't1', name: 'Test', fuel_consumption_per_100km: null,
  emission_class: null, co2_class: null, gross_weight_kg: null, axle_count: null,
  monthly_rent_eur: null, monthly_km_estimate: null,
} as unknown as Truck;

const LOHN = { fuel_price_per_liter: 2, driver_hourly_wage: 25 };

test('Ohne Zuschlaege ist der Preis gleich den direkten Kosten', () => {
  // 4 Stunden * 25 EUR = 100 EUR.
  const k = calculateTourCosts(0, 240, NACKTER_LKW, LOHN);
  assert.equal(k.totalCost, 100);
  assert.equal(k.overheadCost, 0);
  assert.equal(k.ownCost, 100);
  assert.equal(k.profit, 0);
  assert.equal(k.price, 100);
});

test('Fehlende Zuschlagssaetze zaehlen wie null Prozent', () => {
  // Alte Aufrufe ohne die neuen Felder duerfen sich nicht anders verhalten.
  const k = calculateTourCosts(0, 240, NACKTER_LKW, LOHN);
  assert.equal(k.price, k.totalCost);
});

test('Gemeinkosten liegen auf den direkten Kosten', () => {
  const k = calculateTourCosts(0, 240, NACKTER_LKW, { ...LOHN, overhead_percent: 15 });
  assert.equal(k.overheadCost, 15);
  assert.equal(k.ownCost, 115);
  assert.equal(k.price, 115);
});

test('Der Gewinn liegt auf den Selbstkosten, nicht auf den direkten Kosten', () => {
  // 100 direkt, +15 Gemeinkosten = 115 Selbstkosten, davon 20 % = 23.
  // Wer beide Saetze auf die 100 schluege, kaeme auf 135 statt 138 — die
  // Verwaltung wuerde dann mitverdienen, aber nicht mitverdient werden.
  const k = calculateTourCosts(0, 240, NACKTER_LKW, {
    ...LOHN, overhead_percent: 15, profit_percent: 20,
  });
  assert.equal(k.ownCost, 115);
  assert.equal(k.profit, 23);
  assert.equal(k.price, 138);
});

test('Gewinn ohne Gemeinkosten rechnet auf die direkten Kosten', () => {
  const k = calculateTourCosts(0, 240, NACKTER_LKW, { ...LOHN, profit_percent: 20 });
  assert.equal(k.ownCost, 100);
  assert.equal(k.profit, 20);
  assert.equal(k.price, 120);
});

test('Aufschlag und Marge sind nicht dasselbe', () => {
  // 20 % Aufschlag auf 100 ergeben 120 Preis — davon sind 20 aber nur
  // 16,67 % Marge. Genau die Zahl braucht man in der Preisverhandlung.
  const k = calculateTourCosts(0, 240, NACKTER_LKW, { ...LOHN, profit_percent: 20 });
  assert.equal(k.price, 120);
  assert.equal(marginPercent(k.profit, k.price), 16.67);
});

test('Marge ohne Preis ergibt null statt einer Division durch null', () => {
  assert.equal(marginPercent(0, 0), 0);
  assert.equal(marginPercent(10, -5), 0);
});

test('Betraege werden auf Cent gerundet', () => {
  // 3h 20min = 3,3333 h * 25 = 83,3333 EUR, +7 % = 89,17 EUR.
  const k = calculateTourCosts(0, 200, NACKTER_LKW, { ...LOHN, overhead_percent: 7 });
  assert.equal(k.totalCost, 83.33);
  assert.equal(k.price, 89.17);
});
