import type { LocationHours } from '../types';
import { timeToMinutes, getDayOfWeek, getTimeFromDateTime } from './formatters';

export function isWithinOpeningHours(
  etaIso: string,
  allHours: LocationHours[]
): boolean {
  if (allHours.length === 0) return true;

  const dayOfWeek = getDayOfWeek(etaIso);
  const etaTime = getTimeFromDateTime(etaIso);
  const etaMinutes = timeToMinutes(etaTime);

  const prevDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const todayWindows = allHours.filter(
    (h) => h.day_of_week === dayOfWeek && !h.crosses_midnight
  );

  for (const w of todayWindows) {
    const openMin = timeToMinutes(w.open_time);
    const closeMin = timeToMinutes(w.close_time);
    if (etaMinutes >= openMin && etaMinutes <= closeMin) {
      return true;
    }
  }

  const todayCrossingWindows = allHours.filter(
    (h) => h.day_of_week === dayOfWeek && h.crosses_midnight
  );

  for (const w of todayCrossingWindows) {
    const openMin = timeToMinutes(w.open_time);
    if (etaMinutes >= openMin) {
      return true;
    }
  }

  const prevDayCrossingWindows = allHours.filter(
    (h) => h.day_of_week === prevDay && h.crosses_midnight
  );

  for (const w of prevDayCrossingWindows) {
    const closeMin = timeToMinutes(w.close_time);
    if (etaMinutes <= closeMin) {
      return true;
    }
  }

  return false;
}

export function getNextOpeningTime(
  etaIso: string,
  allHours: LocationHours[]
): string | null {
  if (allHours.length === 0) return null;

  const dayOfWeek = getDayOfWeek(etaIso);
  const etaTime = getTimeFromDateTime(etaIso);
  const etaMinutes = timeToMinutes(etaTime);

  const todayWindows = allHours.filter(
    (h) => h.day_of_week === dayOfWeek && !h.crosses_midnight
  );

  let earliestOpen: string | null = null;
  let earliestMinutes = Infinity;

  for (const w of todayWindows) {
    const openMin = timeToMinutes(w.open_time);
    if (openMin > etaMinutes && openMin < earliestMinutes) {
      earliestMinutes = openMin;
      earliestOpen = w.open_time;
    }
  }

  const todayCrossing = allHours.filter(
    (h) => h.day_of_week === dayOfWeek && h.crosses_midnight
  );

  for (const w of todayCrossing) {
    const openMin = timeToMinutes(w.open_time);
    if (openMin > etaMinutes && openMin < earliestMinutes) {
      earliestMinutes = openMin;
      earliestOpen = w.open_time;
    }
  }

  return earliestOpen;
}
