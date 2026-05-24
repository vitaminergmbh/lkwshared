import type { Tour, TourStop, Truck, LocationHours } from '../types';
import type { HereRouteSegment } from '../types';
import { createDateTime, addMinutesToDateTime } from './formatters';
import { isWithinOpeningHours } from './timeWindows';
import { DRIVING_TIME_LIMIT_MINUTES, REQUIRED_BREAK_MINUTES } from './constants';
import { calculateTourCosts, type CostSettings, type CostBreakdown, type TruckSegment } from './costCalculator';

/**
 * EU driving time / break rules apply only to professional truck drivers.
 * Vehicles classified as "Transporter" or "Auto" don't fall under § 4 FPersV
 * regulations, so their driving minutes must NOT add to the cumulative driver
 * hours and must NOT trigger auto-breaks.
 *
 * Categories defined in TRUCK_CATEGORIES: 'LKW' | 'Transporter' | 'Auto' | 'Sonstige'.
 * Treat 'LKW' and 'Sonstige' as regulated; 'Transporter' and 'Auto' as exempt.
 */
function isDrivingTimeRegulated(truck: Truck | null | undefined): boolean {
  if (!truck) return true; // unknown → conservative default
  return truck.category !== 'Transporter' && truck.category !== 'Auto';
}

export interface TourCalculationInput {
  tour: Tour;
  stops: TourStop[];
  segments: HereRouteSegment[];
  locationHoursMap: Record<string, LocationHours[]>;
  hasDepot: boolean;
  hasReturnToDepot: boolean;
  truck?: Truck | null;
  costSettings?: CostSettings | null;
  truckMap?: Record<string, Truck>;
}

/** Info about an automatic driving break inserted during a segment */
export interface AutoBreakInfo {
  driveBeforeBreak: number;  // minutes driven before break
  breakDuration: number;     // break duration (remaining to reach 45 min)
  driveAfterBreak: number;   // minutes driven after break
}

export interface TourCalculationResult {
  stops: TourStop[];
  totalDuration: number;   // minutes
  totalDistance: number;    // km
  /** Sum of drive_time_from_prev across ALL segments (regardless of vehicle category). */
  totalDriveTime: number;  // minutes
  /** Sum of drive_time_from_prev for segments driven by a regulated vehicle (LKW / Sonstige).
   *  Used to display the relevant lenkzeit total separately when mixed with car/transporter legs. */
  totalLkwDriveTime: number;
  costs: CostBreakdown | null;
  /** Auto-break info per stop index (only for stops where break happens during transit) */
  autoBreaks: Record<number, AutoBreakInfo>;
}

export function calculateTourSchedule(
  input: TourCalculationInput
): TourCalculationResult {
  const { tour, stops, segments, locationHoursMap, hasDepot, hasReturnToDepot } = input;

  if (stops.length === 0 || !tour.start_time || !tour.date) {
    return {
      stops: [],
      totalDuration: 0,
      totalDistance: 0,
      totalDriveTime: 0,
      totalLkwDriveTime: 0,
      costs: null,
      autoBreaks: {},
    };
  }

  const updatedStops: TourStop[] = [];
  let currentDateTime = createDateTime(tour.date, tour.start_time);
  let cumulativeDriveTime = tour.driver_initial_drive_time;
  let totalDriveTime = 0;
  let totalLkwDriveTime = 0;
  let totalDistance = 0;
  const autoBreaks: Record<number, AutoBreakInfo> = {};

  // Split-break tracking: accumulated break time since last full reset
  // A full reset happens when accumulated break >= 45 min
  // Partial breaks (e.g. 30 min) are tracked and the remaining (e.g. 15 min) is used for auto-breaks
  let accumulatedBreakTime = 0;

  // Track active truck and per-truck distance for cost calculation
  let activeTruck = input.truck ?? null;
  const truckDistances = new Map<string, { truck: Truck; distance: number }>();

  function addDistanceToTruck(truck: Truck | null, km: number) {
    if (!truck) return;
    const existing = truckDistances.get(truck.id);
    if (existing) {
      existing.distance += km;
    } else {
      truckDistances.set(truck.id, { truck, distance: km });
    }
  }

  for (let i = 0; i < stops.length; i++) {
    const stop = { ...stops[i]! };

    // truck_id on this stop means: change AT this stop, used FROM this stop onwards.
    // The segment TO this stop still uses the previous activeTruck; switch happens AFTER segment processing.

    const segmentIndex = hasDepot ? i : i - 1;
    const segment = segmentIndex >= 0 ? segments[segmentIndex] : undefined;

    if (segment) {
      const driveMinutes = Math.ceil(segment.duration / 60);
      const distanceKm = segment.length / 1000;
      const segmentRegulated = isDrivingTimeRegulated(activeTruck);

      stop.drive_time_from_prev = driveMinutes;
      stop.distance_from_prev = Math.round(distanceKm * 10) / 10;
      stop.route_polyline = segment.polyline ?? null;

      // Check if previous stop contributed to break time (split-break support)
      // Only relevant when we're tracking driver hours for this segment.
      if (segmentRegulated && i > 0) {
        const prevStop = updatedStops[i - 1]!;
        if (prevStop.counts_as_break) {
          const standingTime = prevStop.loading_time + prevStop.wait_time;
          accumulatedBreakTime += standingTime;

          // Full break reached (>= 45 min total) → reset
          if (accumulatedBreakTime >= REQUIRED_BREAK_MINUTES) {
            cumulativeDriveTime = 0;
            accumulatedBreakTime = 0;
          }
        }
      }

      if (!segmentRegulated) {
        // Transporter / Auto: time still passes, but driving doesn't count toward
        // the 4.5h limit and no auto-break is inserted. Cumulation carries over
        // unchanged so a later LKW segment in the same tour resumes correctly.
        currentDateTime = addMinutesToDateTime(currentDateTime, driveMinutes);
        stop.break_needed_before = cumulativeDriveTime >= DRIVING_TIME_LIMIT_MINUTES;
        stop.cumulative_drive_time = cumulativeDriveTime;
      } else {
        // Check if driving break is needed DURING this segment
        const wouldExceed = cumulativeDriveTime + driveMinutes > DRIVING_TIME_LIMIT_MINUTES;
        const remainingBeforeLimit = Math.max(0, DRIVING_TIME_LIMIT_MINUTES - cumulativeDriveTime);

        if (wouldExceed && remainingBeforeLimit >= 0 && driveMinutes > remainingBeforeLimit) {
          // Auto-break needed: calculate how much break time is still needed
          const breakNeeded = Math.max(0, REQUIRED_BREAK_MINUTES - accumulatedBreakTime);
          const driveBeforeBreak = remainingBeforeLimit;
          const driveAfterBreak = driveMinutes - driveBeforeBreak;

          if (breakNeeded > 0) {
            autoBreaks[i] = {
              driveBeforeBreak,
              breakDuration: breakNeeded,
              driveAfterBreak,
            };

            // Add driving time + break + remaining driving to timeline
            currentDateTime = addMinutesToDateTime(currentDateTime, driveBeforeBreak);
            currentDateTime = addMinutesToDateTime(currentDateTime, breakNeeded);
            currentDateTime = addMinutesToDateTime(currentDateTime, driveAfterBreak);
          } else {
            // Break already fully accumulated from stops, just drive through
            currentDateTime = addMinutesToDateTime(currentDateTime, driveMinutes);
          }

          // After auto-break, cumulative resets
          cumulativeDriveTime = driveAfterBreak;
          accumulatedBreakTime = 0;
          stop.break_needed_before = false;
          stop.cumulative_drive_time = cumulativeDriveTime;
        } else {
          // Normal: no auto-break needed
          cumulativeDriveTime += driveMinutes;
          stop.break_needed_before = cumulativeDriveTime >= DRIVING_TIME_LIMIT_MINUTES;
          stop.cumulative_drive_time = cumulativeDriveTime;

          currentDateTime = addMinutesToDateTime(currentDateTime, driveMinutes);
        }
      }

      totalDriveTime += driveMinutes;
      if (segmentRegulated) totalLkwDriveTime += driveMinutes;
      totalDistance += distanceKm;
      addDistanceToTruck(activeTruck, distanceKm);
    } else {
      stop.drive_time_from_prev = 0;
      stop.distance_from_prev = 0;
      stop.cumulative_drive_time = cumulativeDriveTime;
      stop.break_needed_before = cumulativeDriveTime >= DRIVING_TIME_LIMIT_MINUTES;
      stop.route_polyline = null;
    }

    stop.arrival_eta = currentDateTime;

    if (stop.location_id && locationHoursMap[stop.location_id]) {
      stop.time_window_ok = isWithinOpeningHours(
        currentDateTime,
        locationHoursMap[stop.location_id]!
      );
    } else {
      stop.time_window_ok = true;
    }

    const standingTime = stop.loading_time + stop.wait_time;
    currentDateTime = addMinutesToDateTime(currentDateTime, standingTime);
    stop.departure_eta = currentDateTime;

    // Apply truck change AFTER this stop's segment is processed.
    // From this stop onwards (next segment), the new truck is used.
    if (stop.truck_id && input.truckMap?.[stop.truck_id]) {
      activeTruck = input.truckMap[stop.truck_id] ?? null;
    }

    updatedStops.push(stop);
  }

  if (hasReturnToDepot && hasDepot) {
    const returnSegmentIndex = hasDepot ? stops.length : stops.length - 1;
    const returnSegment = segments[returnSegmentIndex];
    if (returnSegment) {
      const returnDriveMinutes = Math.ceil(returnSegment.duration / 60);
      const returnDistanceKm = returnSegment.length / 1000;

      // Check last stop for break credit
      if (updatedStops.length > 0) {
        const lastStop = updatedStops[updatedStops.length - 1]!;
        if (lastStop.counts_as_break) {
          accumulatedBreakTime += lastStop.loading_time + lastStop.wait_time;
          if (accumulatedBreakTime >= REQUIRED_BREAK_MINUTES) {
            cumulativeDriveTime = 0;
            accumulatedBreakTime = 0;
          }
        }
      }

      const wouldExceed = cumulativeDriveTime + returnDriveMinutes > DRIVING_TIME_LIMIT_MINUTES;
      const remaining = Math.max(0, DRIVING_TIME_LIMIT_MINUTES - cumulativeDriveTime);

      if (wouldExceed && remaining >= 0 && returnDriveMinutes > remaining) {
        const breakNeeded = Math.max(0, REQUIRED_BREAK_MINUTES - accumulatedBreakTime);
        if (breakNeeded > 0) {
          currentDateTime = addMinutesToDateTime(currentDateTime, remaining);
          currentDateTime = addMinutesToDateTime(currentDateTime, breakNeeded);
          currentDateTime = addMinutesToDateTime(currentDateTime, returnDriveMinutes - remaining);
        } else {
          currentDateTime = addMinutesToDateTime(currentDateTime, returnDriveMinutes);
        }
      } else {
        currentDateTime = addMinutesToDateTime(currentDateTime, returnDriveMinutes);
      }

      totalDriveTime += returnDriveMinutes;
      totalDistance += returnDistanceKm;
      addDistanceToTruck(activeTruck, returnDistanceKm);
    }
  }

  const startDateTime = createDateTime(tour.date, tour.start_time);
  const startMs = new Date(startDateTime).getTime();
  const endMs = new Date(currentDateTime).getTime();
  const totalDuration = Math.ceil((endMs - startMs) / 60000);

  const finalDistance = Math.round(totalDistance * 10) / 10;

  // Calculate costs
  let costs: CostBreakdown | null = null;
  if (input.costSettings && (input.truck || truckDistances.size > 0)) {
    const truckSegments: TruckSegment[] = Array.from(truckDistances.values()).map((td) => ({
      truck: td.truck,
      distance: Math.round(td.distance * 10) / 10,
    }));

    costs = calculateTourCosts(
      finalDistance,
      totalDuration,
      input.truck ?? null,
      input.costSettings,
      truckSegments.length > 0 ? truckSegments : undefined
    );
  }

  return {
    stops: updatedStops,
    totalDuration,
    totalDistance: finalDistance,
    totalDriveTime,
    totalLkwDriveTime,
    costs,
    autoBreaks,
  };
}
