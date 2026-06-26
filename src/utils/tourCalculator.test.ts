import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTourSchedule, type TourCalculationInput } from './tourCalculator.ts';
import type { Tour, TourStop, Truck, HereRouteSegment } from '../types.ts';

function seg(minutes: number, km: number): HereRouteSegment {
  return { duration: minutes * 60, length: km * 1000, polyline: null } as HereRouteSegment;
}

function stop(id: string, overrides: Partial<TourStop> = {}): TourStop {
  return {
    id,
    tour_id: 't1',
    location_id: null,
    stop_order: 0,
    loading_time: 0,
    wait_time: 0,
    counts_as_break: false,
    truck_id: null,
    checked: false,
    arrival_eta: null,
    departure_eta: null,
    drive_time_from_prev: null,
    distance_from_prev: null,
    cumulative_drive_time: null,
    time_window_ok: null,
    break_needed_before: null,
    ...overrides,
  } as TourStop;
}

const lkw: Truck = { id: 'lkw1', category: 'LKW' } as Truck;
const transporter: Truck = { id: 'v1', category: 'Transporter' } as Truck;

const baseTour: Tour = {
  id: 't1',
  date: '2026-06-20',
  start_time: '08:00',
  driver_initial_drive_time: 0,
} as Tour;

test('Depot-Rückfahrt zählt zur LKW-Lenkzeit (Bug E)', () => {
  // Depot -> Stop1 -> Stop2 -> zurück zum Depot. 3 Segmente.
  const input: TourCalculationInput = {
    tour: baseTour,
    stops: [stop('s1', { loading_time: 30 }), stop('s2', { loading_time: 20 })],
    segments: [seg(60, 50), seg(40, 30), seg(50, 45)], // letzter = Rückfahrt
    locationHoursMap: {},
    hasDepot: true,
    hasReturnToDepot: true,
    truck: lkw,
  };
  const r = calculateTourSchedule(input);
  // Alle 3 Segmente per LKW: 60 + 40 + 50 = 150
  assert.equal(r.totalDriveTime, 150);
  assert.equal(r.totalLkwDriveTime, 150, 'Rückfahrt muss in totalLkwDriveTime enthalten sein');
});

test('Rückfahrt per Transporter zählt NICHT zur LKW-Lenkzeit', () => {
  // Fahrzeugwechsel am letzten Stop auf Transporter -> Rückfahrt ist ausgenommen
  const input: TourCalculationInput = {
    tour: baseTour,
    stops: [
      stop('s1', { loading_time: 30 }),
      stop('s2', { loading_time: 20, truck_id: 'v1' }),
    ],
    segments: [seg(60, 50), seg(40, 30), seg(50, 45)],
    locationHoursMap: {},
    hasDepot: true,
    hasReturnToDepot: true,
    truck: lkw,
    truckMap: { lkw1: lkw, v1: transporter },
  };
  const r = calculateTourSchedule(input);
  assert.equal(r.totalDriveTime, 150, 'Gesamtfahrzeit unverändert');
  assert.equal(r.totalLkwDriveTime, 100, 'nur die ersten beiden LKW-Segmente (60+40)');
});

test('Tagesruhezeit (9h) nach maximaler Tageslenkzeit (9h) eingeplant', () => {
  // s1 -> s2 (5h18) -> s3 (5h27) = 10h45 LKW-Lenkzeit, kein Depot.
  const input: TourCalculationInput = {
    tour: baseTour,
    stops: [stop('s1'), stop('s2'), stop('s3')],
    segments: [seg(318, 400), seg(327, 400)],
    locationHoursMap: {},
    hasDepot: false,
    hasReturnToDepot: false,
    truck: lkw,
  };
  const r = calculateTourSchedule(input);
  assert.equal(r.dailyRests[1], undefined, 's1->s2 ist nur 45-Min-Pause');
  assert.equal(r.dailyRests[2], 540, 's2->s3 löst die 9h-Tagesruhe aus');
  assert.equal(r.autoBreaks[2]?.breakDuration, 540, 'die Unterbrechung ist die 9h-Ruhe');
  // s2->s3: 222 Min fahren, 540 Ruhe, 105 Min fahren
  assert.equal(r.autoBreaks[2]?.driveBeforeBreak, 222);
  assert.equal(r.autoBreaks[2]?.driveAfterBreak, 105);
});

test('Transporter löst keine Tagesruhe aus', () => {
  const input: TourCalculationInput = {
    tour: baseTour,
    stops: [stop('s1'), stop('s2'), stop('s3')],
    segments: [seg(318, 400), seg(327, 400)],
    locationHoursMap: {},
    hasDepot: false,
    hasReturnToDepot: false,
    truck: transporter,
  };
  const r = calculateTourSchedule(input);
  assert.deepEqual(r.dailyRests, {}, 'Transporter: keine Tagesruhe');
});
