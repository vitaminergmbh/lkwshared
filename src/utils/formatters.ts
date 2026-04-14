export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '--';
  if (minutes < 0) return '--';

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) return `${mins} Min.`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return '--';
  if (km < 0) return '--';

  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return '--:--';
  return time;
}

export function formatDateTimeToTime(isoString: string | null | undefined): string {
  if (!isoString) return '--:--';
  try {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '--:--';
  }
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '--';
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  } catch {
    return dateString;
  }
}

export function timeToMinutes(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 2) return 0;
  const h = parseInt(parts[0]!, 10);
  const m = parseInt(parts[1]!, 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  if (!isFinite(totalMinutes)) return '00:00';
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = Math.round(normalized % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function createDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function addMinutesToDateTime(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function getDayOfWeek(isoString: string): number {
  const date = new Date(isoString);
  const jsDay = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Mon, ..., 6=Sun
}

export function getTimeFromDateTime(isoString: string): string {
  const date = new Date(isoString);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function formatCurrency(eur: number | null | undefined): string {
  if (eur == null) return '--';
  return `${eur.toFixed(2).replace('.', ',')} \u20AC`;
}
