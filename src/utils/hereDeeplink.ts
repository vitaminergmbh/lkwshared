/**
 * Routen-Links fuer HERE WeGo (Pro).
 *
 * Der Fahrer bekommt die Tour per WhatsApp; ein Tippen auf den Link oeffnet
 * sie in HERE WeGo mit allen Stops in der richtigen Reihenfolge — und, wichtig
 * fuer uns, mit den Massen des Fahrzeugs. Ohne die schickt die Navigation den
 * 16,5-Meter-Zug durch die 3,20-m-Unterfuehrung.
 *
 * Format:
 *   https://share.here.com/r/LAT,LNG,TITEL/LAT,LNG,TITEL?m=tr&vw=..&vdh=..
 *
 * Die Wegpunkte trennt ein Schraegstrich, der Titel ist optional und folgt
 * nach dem zweiten Komma. `m=tr` waehlt die LKW-Route (setzt eine
 * WeGo-Pro-Lizenz voraus), die Fahrzeugmasse kommen als Abfrageparameter:
 * Gewicht in Kilogramm, Hoehe, Laenge und Breite in Zentimetern — also genau
 * so, wie sie bei uns am Fahrzeug stehen.
 */

const BASIS = 'https://share.here.com/r/';

/**
 * HERE nennt 100 Wegpunkte als Grenze und empfiehlt 50, weil Titel und
 * Geraete die URL vorher sprengen koennen. Unsere Touren liegen bei zehn; die
 * Pruefung ist ein Notnagel, damit im Ausnahmefall gar kein Link entsteht
 * statt eines abgeschnittenen.
 */
const MAX_WEGPUNKTE = 100;

/** Fuenf Nachkommastellen sind rund ein Meter — mehr macht die URL nur laenger. */
const KOMMASTELLEN = 5;

/** Laengere Titel blaehen die URL auf, ohne dem Fahrer mehr zu sagen. */
const TITEL_MAX = 40;

export interface HereWaypoint {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  /** Was in HERE am Punkt stehen soll, z.B. der Standortname. */
  label?: string | null;
}

/** Die Masse, die HERE fuer die LKW-Route braucht. Fehlende bleiben weg. */
export interface HereVehicle {
  gross_weight_kg?: number | null;
  height_cm?: number | null;
  width_cm?: number | null;
  length_cm?: number | null;
}

export interface HereRouteOptions {
  /**
   * LKW-Route statt Auto. Nur dann wertet HERE die Masse aus — bei einem
   * Transporter oder PKW waere sie eine unnoetige Anforderung an die Lizenz.
   */
  truck?: boolean;
}

function gueltig(w: HereWaypoint): boolean {
  const { latitude: la, longitude: lo } = w;
  return (
    typeof la === 'number' && typeof lo === 'number' &&
    Number.isFinite(la) && Number.isFinite(lo) &&
    la >= -90 && la <= 90 && lo >= -180 && lo <= 180 &&
    // 0/0 liegt im Atlantik und steht bei uns fuer "nicht geokodiert".
    !(la === 0 && lo === 0)
  );
}

/**
 * Titel fuer ein Pfadsegment aufbereiten.
 *
 * Komma und Schraegstrich sind in der URL die Trennzeichen — ein Standortname
 * wie "[00] DESSAU, Halle 2" wuerde den Wegpunkt sonst zerreissen.
 * encodeURIComponent nimmt beide mit.
 */
function titel(text: string | null | undefined): string {
  const roh = (text ?? '').trim().slice(0, TITEL_MAX).trim();
  return roh ? encodeURIComponent(roh) : '';
}

function masse(v: HereVehicle | null | undefined): Record<string, number> {
  const raus: Record<string, number> = {};
  if (!v) return raus;
  const setze = (schluessel: string, wert: number | null | undefined) => {
    if (typeof wert === 'number' && Number.isFinite(wert) && wert > 0) {
      raus[schluessel] = Math.round(wert);
    }
  };
  setze('vw', v.gross_weight_kg);
  setze('vdh', v.height_cm);
  setze('vdl', v.length_cm);
  setze('vdw', v.width_cm);
  return raus;
}

/**
 * Link zur Route. Gibt null zurueck, wenn daraus keine sinnvolle Route wird —
 * ein Link, der beim Fahrer ins Leere fuehrt, ist schlechter als keiner.
 */
export function buildHereRouteUrl(
  waypoints: HereWaypoint[],
  vehicle?: HereVehicle | null,
  options: HereRouteOptions = {},
): string | null {
  const punkte = (waypoints ?? []).filter(gueltig);
  // Eine Route braucht mindestens Start und Ziel.
  if (punkte.length < 2 || punkte.length > MAX_WEGPUNKTE) return null;

  const pfad = punkte
    .map((w) => {
      const la = w.latitude!.toFixed(KOMMASTELLEN);
      const lo = w.longitude!.toFixed(KOMMASTELLEN);
      const t = titel(w.label);
      return t ? `${la},${lo},${t}` : `${la},${lo}`;
    })
    .join('/');

  const parameter: Record<string, string | number> = {};
  if (options.truck) {
    parameter.m = 'tr';
    Object.assign(parameter, masse(vehicle));
  }

  const query = Object.entries(parameter)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  return query ? `${BASIS}${pfad}?${query}` : `${BASIS}${pfad}`;
}

/**
 * Kurzform der Masse fuer die Nachricht, z.B. "40 t · 4,00 m hoch · 2,55 m
 * breit · 16,50 m lang".
 *
 * Steht neben dem Link, weil der Fahrer die Werte auch dann sehen soll, wenn
 * er die Route nicht ueber den Link oeffnet — etwa weil er das Profil in HERE
 * schon eingerichtet hat und nur gegenpruefen will.
 */
export function formatVehicleDimensions(v: HereVehicle | null | undefined): string | null {
  if (!v) return null;
  const teile: string[] = [];
  const meter = (cm: number) => (cm / 100).toFixed(2).replace('.', ',');

  if (v.gross_weight_kg) {
    // Auf zwei Stellen runden, aber ohne Nullen am Ende: 7,2 t statt 7,20 t,
    // 40 t statt 40,00 t. Der Umweg ueber Number schneidet sie ab, ohne dass
    // ein Muster am Text herumschneiden muss.
    const tonnen = Number((v.gross_weight_kg / 1000).toFixed(2));
    teile.push(`${String(tonnen).replace('.', ',')} t`);
  }
  if (v.height_cm) teile.push(`${meter(v.height_cm)} m hoch`);
  if (v.width_cm) teile.push(`${meter(v.width_cm)} m breit`);
  if (v.length_cm) teile.push(`${meter(v.length_cm)} m lang`);

  return teile.length > 0 ? teile.join(' · ') : null;
}
