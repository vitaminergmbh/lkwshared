import type { Truck } from '../types';
import { getTollRatePerKm } from './tollRates';

export interface CostSettings {
  fuel_price_per_liter: number;  // EUR
  driver_hourly_wage: number;    // EUR
  /** Zuschlag auf die direkten Kosten in Prozent. 0 = kein Zuschlag. */
  overhead_percent?: number;
  /** Aufschlag auf die Selbstkosten in Prozent. 0 = kein Aufschlag. */
  profit_percent?: number;
}

export interface CostBreakdown {
  fuelCost: number;    // EUR
  tollCost: number;    // EUR
  driverCost: number;  // EUR
  rentalCost: number;  // EUR
  /** Direkte Kosten der Fahrt, ohne Gemeinkosten und Gewinn. */
  totalCost: number;   // EUR
  /** Gemeinkostenzuschlag auf die direkten Kosten. */
  overheadCost: number;
  /** Direkte Kosten + Gemeinkosten — was die Tour uns kostet. */
  ownCost: number;
  /** Gewinnaufschlag auf die Selbstkosten. */
  profit: number;
  /** Selbstkosten + Gewinn — der Betrag fuer die Rechnung. */
  price: number;
}

export interface TruckSegment {
  truck: Truck;
  distance: number; // km
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcFuelForTruck(truck: Truck, distanceKm: number, fuelPrice: number): number {
  if (!truck.fuel_consumption_per_100km) return 0;
  return (distanceKm / 100) * truck.fuel_consumption_per_100km * fuelPrice;
}

function calcTollForTruck(truck: Truck, distanceKm: number): number {
  if (!truck.emission_class || !truck.co2_class || !truck.gross_weight_kg) return 0;
  const rate = getTollRatePerKm({
    emission_class: truck.emission_class,
    co2_class: truck.co2_class,
    axle_count: truck.axle_count,
    gross_weight_kg: truck.gross_weight_kg,
  });
  return distanceKm * rate;
}

function calcRentalForTruck(truck: Truck, distanceKm: number): number {
  if (!truck.monthly_rent_eur || !truck.monthly_km_estimate || truck.monthly_km_estimate <= 0) return 0;
  return (distanceKm / truck.monthly_km_estimate) * truck.monthly_rent_eur;
}

/**
 * Calculate tour costs with support for multi-truck tours.
 * If truckSegments is provided, costs are calculated per truck segment.
 * Otherwise falls back to single truck for entire distance.
 */
export function calculateTourCosts(
  totalDistance: number,
  totalDuration: number,
  truck: Truck | null,
  settings: CostSettings,
  truckSegments?: TruckSegment[]
): CostBreakdown {
  let fuelCost = 0;
  let tollCost = 0;
  let rentalCost = 0;

  if (truckSegments && truckSegments.length > 0) {
    // Multi-truck: calculate per segment
    for (const seg of truckSegments) {
      fuelCost += calcFuelForTruck(seg.truck, seg.distance, settings.fuel_price_per_liter);
      tollCost += calcTollForTruck(seg.truck, seg.distance);
      rentalCost += calcRentalForTruck(seg.truck, seg.distance);
    }
  } else if (truck) {
    // Single truck: original behavior
    fuelCost = calcFuelForTruck(truck, totalDistance, settings.fuel_price_per_liter);
    tollCost = calcTollForTruck(truck, totalDistance);
    rentalCost = calcRentalForTruck(truck, totalDistance);
  }

  // Driver cost is always for full tour duration (same driver)
  const driverCost = (totalDuration / 60) * settings.driver_hourly_wage;

  const totalCost = fuelCost + tollCost + driverCost + rentalCost;

  /**
   * Gemeinkosten und Gewinn als Zuschlagskalkulation.
   *
   * Die Gemeinkosten liegen auf den direkten Kosten, der Gewinn auf den
   * Selbstkosten — also auch auf den Gemeinkosten. Wer beides nebeneinander
   * auf die direkten Kosten schluege, wuerde die Verwaltung mitverdienen
   * lassen, aber nicht mit einrechnen.
   *
   * Der Gewinnsatz ist ein Aufschlag auf die Selbstkosten, keine Marge vom
   * Umsatz: 20 % auf 100 EUR ergeben 120 EUR Preis, nicht 125. Die tatsaechlich
   * erzielte Marge liegt darunter und wird in der Oberflaeche daneben
   * ausgewiesen, damit beim Verhandeln keine Zahl fehlt.
   */
  const overheadCost = totalCost * ((settings.overhead_percent ?? 0) / 100);
  const ownCost = totalCost + overheadCost;
  const profit = ownCost * ((settings.profit_percent ?? 0) / 100);
  const price = ownCost + profit;

  return {
    fuelCost: round2(fuelCost),
    tollCost: round2(tollCost),
    driverCost: round2(driverCost),
    rentalCost: round2(rentalCost),
    totalCost: round2(totalCost),
    overheadCost: round2(overheadCost),
    ownCost: round2(ownCost),
    profit: round2(profit),
    price: round2(price),
  };
}

/**
 * Umsatzrendite eines Preises: welcher Anteil des Rechnungsbetrags bleibt als
 * Gewinn? Nicht dasselbe wie der Aufschlagssatz — 20 % Aufschlag ergeben rund
 * 16,7 % Marge. Beim Verhandeln ist diese Zahl die gefragte.
 */
export function marginPercent(profit: number, price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return round2((profit / price) * 100);
}
