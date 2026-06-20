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
    return getTimeFromDateTime(isoString);
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

// ─────────────────────────────────────────────────────────────────────────────
// Zeitzonen-Behandlung
//
// Alle Planungs-Zeitpunkte (start_time, arrival_eta, departure_eta) sind als
// *echte Instants* (UTC-ISO mit Z) gespeichert. Die Disponenten denken aber in
// deutscher Wanduhr-Zeit (Europe/Berlin). Daher: Eingaben (Datum+Uhrzeit) werden
// mit dem Berliner Offset in einen Instant umgerechnet, und für die Anzeige/
// Öffnungszeiten-Prüfung wird der Instant immer in Berliner Wanduhr extrahiert –
// unabhängig von der Laufzeit-Zeitzone (Render läuft in UTC!).
// ─────────────────────────────────────────────────────────────────────────────

const BUSINESS_TZ = 'Europe/Berlin';

let _berlinFmt: Intl.DateTimeFormat | null = null;
function berlinFormat(): Intl.DateTimeFormat {
  if (!_berlinFmt) {
    _berlinFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: BUSINESS_TZ,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  return _berlinFmt;
}

interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Zerlegt einen Instant in Berliner Wanduhr-Bestandteile.
 *  Fällt auf Lokalzeit zurück, falls die Runtime kein Intl-timeZone kann
 *  (mobile Geräte stehen ohnehin in der Geschäftszeitzone → korrekt). */
function berlinParts(instant: Date): WallParts {
  try {
    const parts = berlinFormat().formatToParts(instant);
    const pick = (type: string): number | null => {
      const part = parts.find((p) => p.type === type);
      if (!part) return null;
      const n = parseInt(part.value, 10);
      return Number.isNaN(n) ? null : n;
    };
    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    const hour = pick('hour');
    const minute = pick('minute');
    if (year != null && month != null && day != null && hour != null && minute != null) {
      return { year, month, day, hour, minute, second: pick('second') ?? 0 };
    }
  } catch {
    // Intl mit timeZone nicht unterstützt → Fallback auf Lokalzeit
  }
  return {
    year: instant.getFullYear(),
    month: instant.getMonth() + 1,
    day: instant.getDate(),
    hour: instant.getHours(),
    minute: instant.getMinutes(),
    second: instant.getSeconds(),
  };
}

/** Offset (ms) der Berliner Zeit gegenüber UTC zum gegebenen Instant. */
function berlinOffsetMs(instant: Date): number {
  const p = berlinParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - instant.getTime();
}

/** Wandelt Berliner Wanduhr-Zeit (Datum 'YYYY-MM-DD' + Uhrzeit 'HH:MM') in einen
 *  echten Instant (UTC-ISO) um – DST-sicher. */
export function createDateTime(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map((n) => parseInt(n, 10));
  const [h, mi] = time.split(':').map((n) => parseInt(n, 10));
  const wallAsUtc = Date.UTC(
    y || 1970,
    (mo || 1) - 1,
    d || 1,
    h || 0,
    mi || 0,
    0
  );
  // Offset zunächst am angenommenen Instant bestimmen, dann einmal verfeinern
  // (korrigiert Zeitumstellungs-Grenzfälle).
  const offset1 = berlinOffsetMs(new Date(wallAsUtc));
  let instant = wallAsUtc - offset1;
  const offset2 = berlinOffsetMs(new Date(instant));
  if (offset2 !== offset1) {
    instant = wallAsUtc - offset2;
  }
  return new Date(instant).toISOString();
}

export function addMinutesToDateTime(isoString: string, minutes: number): string {
  return new Date(new Date(isoString).getTime() + minutes * 60000).toISOString();
}

export function getDayOfWeek(isoString: string): number {
  const p = berlinParts(new Date(isoString));
  // Wochentag aus den Berliner Datums-Bestandteilen (zeitzonenunabhängig).
  const jsDay = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0=So
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mo, ..., 6=So
}

export function getTimeFromDateTime(isoString: string): string {
  const p = berlinParts(new Date(isoString));
  return `${p.hour.toString().padStart(2, '0')}:${p.minute.toString().padStart(2, '0')}`;
}

export function formatCurrency(eur: number | null | undefined): string {
  if (eur == null) return '--';
  return `${eur.toFixed(2).replace('.', ',')} \u20AC`;
}
