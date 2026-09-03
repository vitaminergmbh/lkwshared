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
 * WeGo-Pro-Lizenz voraus; ohne Lizenz zeigt die App eine Autoroute), die
 * Fahrzeugdaten kommen als Abfrageparameter:
 *
 *   vw    Gesamtgewicht in kg
 *   vdh   Hoehe in cm
 *   vdl   Laenge in cm
 *   vdw   Breite in cm
 *   axc   Achszahl (2 bis 13)
 *   trt   Bauart: "straight" (Solo) oder "tractor" (Sattelzugmaschine)
 *
 * Masse und Achszahl stehen bei uns bereits in diesen Einheiten am Fahrzeug.
 * Nicht genutzt, weil es die Daten nicht gibt und der Fuhrpark sie nicht
 * braucht: wpax (Achslast), axgw* (Achsgruppengewichte), hmr (Gefahrgut),
 * tcr (Tunnelkategorie).
 */

import { shareTexts } from './shareTexts';

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
  /**
   * Durchfahrtspunkt statt Halt: HERE fuehrt die Route hindurch, ohne
   * dort anzukommen. Damit folgt die App der Route des Planers, statt
   * sich beim Oeffnen eine eigene zu suchen. Ohne Titel — der Fahrer
   * soll den Punkt nicht als Ziel sehen.
   */
  passThrough?: boolean;
}

/** Bauart laut HERE: Solo-LKW oder Sattelzugmaschine. */
export type HereTruckType = 'straight' | 'tractor';

/** Die Fahrzeugdaten, die HERE fuer die LKW-Route auswertet. Fehlende bleiben weg. */
export interface HereVehicle {
  gross_weight_kg?: number | null;
  height_cm?: number | null;
  width_cm?: number | null;
  length_cm?: number | null;
  /** Achszahl; HERE nimmt 2 bis 13. */
  axle_count?: number | null;
  truck_type?: HereTruckType | string | null;
}

/** Grenzen laut HERE-Dokumentation. */
const ACHSEN_MIN = 2;
const ACHSEN_MAX = 13;

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

  // Achszahl nur im zugelassenen Bereich. Ein Wert ausserhalb wuerde von HERE
  // entweder verworfen oder — schlimmer — geklemmt; dann stuende dort still
  // eine Zahl, die niemand gesetzt hat.
  const achsen = v.axle_count;
  if (typeof achsen === 'number' && Number.isInteger(achsen)
      && achsen >= ACHSEN_MIN && achsen <= ACHSEN_MAX) {
    raus.axc = achsen;
  }
  return raus;
}

/** Bauart, sofern gepflegt und bekannt. */
function bauart(v: HereVehicle | null | undefined): HereTruckType | null {
  const t = v?.truck_type;
  return t === 'straight' || t === 'tractor' ? t : null;
}

/**
 * Ein Wegpunkt als Pfadstueck: "51.32469,12.15517,LEUNA".
 *
 * Durchfahrtspunkte tragen statt des Titels den Typ: "51.5,12.2,,p" —
 * das leere Feld ist der Titel, p steht fuer pass-through.
 */
function wegpunkt(w: HereWaypoint): string {
  const la = w.latitude!.toFixed(KOMMASTELLEN);
  const lo = w.longitude!.toFixed(KOMMASTELLEN);
  if (w.passThrough) return `${la},${lo},,p`;
  const t = titel(w.label);
  return t ? `${la},${lo},${t}` : `${la},${lo}`;
}

/** Abfrageteil mit Modus und Fahrzeugdaten, oder leer. */
function abfrage(vehicle: HereVehicle | null | undefined, options: HereRouteOptions): string {
  if (!options.truck) return '';
  const parameter: Record<string, string | number> = { m: 'tr', ...masse(vehicle) };
  const art = bauart(vehicle);
  if (art) parameter.trt = art;
  return '?' + Object.entries(parameter).map(([k, v]) => `${k}=${v}`).join('&');
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

  return `${BASIS}${punkte.map(wegpunkt).join('/')}${abfrage(vehicle, options)}`;
}

/**
 * Link zu einem einzelnen Stop: Navigation vom aktuellen Standort dorthin.
 *
 * `mylocation` ueberlaesst der App den Startpunkt — der Fahrer tippt und
 * faehrt los, egal wo er gerade steht. Bewusst eine Route und kein blosser
 * Kartenpunkt (`/l/`): wer unterwegs auf einen Stop tippt, will hin, nicht
 * hinsehen.
 *
 * Die Fahrzeugdaten gehen genauso mit wie beim Tourlink. Ohne sie waere der
 * Einzellink die Luecke, durch die der Zug doch noch unter die zu niedrige
 * Bruecke faehrt.
 */
export function buildHereStopUrl(
  waypoint: HereWaypoint,
  vehicle?: HereVehicle | null,
  options: HereRouteOptions = {},
): string | null {
  if (!gueltig(waypoint)) return null;
  return `${BASIS}mylocation/${wegpunkt(waypoint)}${abfrage(vehicle, options)}`;
}

/**
 * Kurzform der Masse fuer die Nachricht, z.B. "40 t · 4,00 m hoch · 2,55 m
 * breit · 16,50 m lang".
 *
 * Steht neben dem Link, weil der Fahrer die Werte auch dann sehen soll, wenn
 * er die Route nicht ueber den Link oeffnet — etwa weil er das Profil in HERE
 * schon eingerichtet hat und nur gegenpruefen will.
 *
 * In der Sprache des Fahrers: "hoch", "breit" und "lang" standen anfangs fest
 * auf Deutsch und blieben deshalb mitten in einer russischen Nachricht stehen.
 * Einheiten (t, m) bleiben, die sind ueberall dieselben.
 */
export function formatVehicleDimensions(
  v: HereVehicle | null | undefined,
  lang?: string | null,
): string | null {
  if (!v) return null;
  const T = shareTexts(lang);
  const teile: string[] = [];
  const meter = (cm: number) => (cm / 100).toFixed(2).replace('.', ',');

  if (v.gross_weight_kg) {
    // Auf zwei Stellen runden, aber ohne Nullen am Ende: 7,2 t statt 7,20 t,
    // 40 t statt 40,00 t. Der Umweg ueber Number schneidet sie ab, ohne dass
    // ein Muster am Text herumschneiden muss.
    const tonnen = Number((v.gross_weight_kg / 1000).toFixed(2));
    teile.push(`${String(tonnen).replace('.', ',')} t`);
  }
  if (v.height_cm) teile.push(`${meter(v.height_cm)} m ${T.hoch}`);
  if (v.width_cm) teile.push(`${meter(v.width_cm)} m ${T.breit}`);
  if (v.length_cm) teile.push(`${meter(v.length_cm)} m ${T.lang}`);

  return teile.length > 0 ? teile.join(' · ') : null;
}
