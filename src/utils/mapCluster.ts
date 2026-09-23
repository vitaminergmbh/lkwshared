/**
 * Zusammenfassen dicht beieinander liegender Kartenpunkte.
 *
 * Bewusst in Bildschirm-Pixeln statt in Metern: ob zwei Pins sich ueberdecken,
 * haengt am Zoom, nicht am echten Abstand. Zwei Fahrzeuge auf demselben Hof
 * sind bei weiter Ansicht ein Punkt und bei naher zwei — genau das soll die
 * Gruppierung abbilden.
 *
 * Die Umrechnung Koordinate -> Pixel bleibt draussen: sie haengt an der
 * Karten-API, waehrend das Gruppieren reine Geometrie ist und sich so einzeln
 * pruefen laesst.
 */

export interface PixelPoint {
  id: string;
  /** Weltpixel auf der aktuellen Zoomstufe. */
  x: number;
  y: number;
  lat: number;
  lng: number;
}

export interface PointCluster {
  /**
   * Stabil ueber die enthaltenen Punkte gebildet — solange dieselben Fahrzeuge
   * zusammenliegen, bleibt der Schluessel gleich und die Darstellung ruhig.
   */
  key: string;
  /** Mittelpunkt der enthaltenen Punkte. */
  lat: number;
  lng: number;
  ids: string[];
}

export interface ClusterOptions {
  /**
   * Gruppierung des letzten Aufrufs: id -> key ihres damaligen Clusters.
   * Punkte, die vorher zusammenlagen, bleiben bis `bleibFaktor * radius`
   * zusammen — sonst springt ein Fahrzeug, das knapp an der Grenze entlang
   * faehrt, bei jedem Positions-Update zwischen Sammelpunkt und Einzelpin.
   */
  vorher?: ReadonlyMap<string, string>;
  /** Toleranz fuer `vorher`, Vorgabe 1.25. */
  bleibFaktor?: number;
}

interface Gruppe {
  mitglieder: PixelPoint[];
  x: number;
  y: number;
}

function mittelpunkt(m: PixelPoint[]): { x: number; y: number } {
  return {
    x: m.reduce((s, p) => s + p.x, 0) / m.length,
    y: m.reduce((s, p) => s + p.y, 0) / m.length,
  };
}

/**
 * Gruppierung in zwei Schritten.
 *
 * 1. Greedy: der Reihe nach wird ein noch freier Punkt zum Kern und zieht alle
 *    freien Punkte innerhalb des Radius an sich.
 * 2. Zusammenlegen: Gruppen, deren Mittelpunkte naeher als der Radius
 *    beieinanderliegen, werden vereinigt — so lange, bis keine zwei
 *    angezeigten Marker sich mehr ueberdecken. Der Greedy-Schritt allein misst
 *    nur gegen den Kern, nicht gegen den angezeigten Mittelpunkt; dann konnten
 *    ein Sammelpunkt und ein Einzelpin trotzdem aufeinanderliegen.
 *
 * Die Punkte werden vorher nach id sortiert. Ohne das haengt das Ergebnis an
 * der Reihenfolge, in der die Positionen eintrudeln — dieselbe Karte saehe
 * dann von Aufruf zu Aufruf anders aus.
 */
export function clusterPoints(points: PixelPoint[], radiusPx: number, opts: ClusterOptions = {}): PointCluster[] {
  const sorted = [...points].sort((a, b) => a.id.localeCompare(b.id));
  const vorher = opts.vorher;
  const rBleib = radiusPx * (opts.bleibFaktor ?? 1.25);

  const warenZusammen = (a: PixelPoint[], b: PixelPoint[]): boolean => {
    if (!vorher) return false;
    const keysA = new Set(a.map((p) => vorher.get(p.id)).filter((k): k is string => !!k));
    return b.some((p) => {
      const k = vorher.get(p.id);
      return !!k && keysA.has(k);
    });
  };
  const nah = (dx: number, dy: number, a: PixelPoint[], b: PixelPoint[]): boolean => {
    const d = Math.hypot(dx, dy);
    return d <= radiusPx || (d <= rBleib && warenZusammen(a, b));
  };

  // 1. Greedy um Kerne
  const belegt = new Set<string>();
  let gruppen: Gruppe[] = [];
  for (const kern of sorted) {
    if (belegt.has(kern.id)) continue;
    belegt.add(kern.id);
    const mitglieder = [kern];
    for (const kandidat of sorted) {
      if (belegt.has(kandidat.id)) continue;
      if (nah(kandidat.x - kern.x, kandidat.y - kern.y, [kern], [kandidat])) {
        belegt.add(kandidat.id);
        mitglieder.push(kandidat);
      }
    }
    gruppen.push({ mitglieder, ...mittelpunkt(mitglieder) });
  }

  // 2. Ueberdeckende Gruppen zusammenlegen, bis nichts mehr ueberlappt
  let geaendert = true;
  while (geaendert && gruppen.length > 1) {
    geaendert = false;
    outer: for (let i = 0; i < gruppen.length; i++) {
      for (let j = i + 1; j < gruppen.length; j++) {
        const a = gruppen[i]!;
        const b = gruppen[j]!;
        if (nah(b.x - a.x, b.y - a.y, a.mitglieder, b.mitglieder)) {
          const mitglieder = [...a.mitglieder, ...b.mitglieder];
          const neu: Gruppe = { mitglieder, ...mittelpunkt(mitglieder) };
          gruppen = [...gruppen.slice(0, i), neu, ...gruppen.slice(i + 1, j), ...gruppen.slice(j + 1)];
          geaendert = true;
          break outer;
        }
      }
    }
  }

  return gruppen.map(({ mitglieder }) => {
    const n = mitglieder.length;
    return {
      key: mitglieder.map((m) => m.id).sort().join('|'),
      lat: mitglieder.reduce((s, m) => s + m.lat, 0) / n,
      lng: mitglieder.reduce((s, m) => s + m.lng, 0) / n,
      ids: mitglieder.map((m) => m.id),
    };
  });
}

/** Zuordnung id -> Cluster-key, als `vorher` fuer den naechsten Aufruf. */
export function clusterZuordnung(cluster: PointCluster[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of cluster) for (const id of c.ids) m.set(id, c.key);
  return m;
}

/** Umschliessendes Rechteck einer Punktmenge — fuer das Heranzoomen. */
export function boundsOf(points: Array<{ lat: number; lng: number }>): {
  south: number; west: number; north: number; east: number;
} | null {
  if (points.length === 0) return null;
  let south = points[0]!.lat, north = points[0]!.lat;
  let west = points[0]!.lng, east = points[0]!.lng;
  for (const p of points) {
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
    if (p.lng < west) west = p.lng;
    if (p.lng > east) east = p.lng;
  }
  return { south, west, north, east };
}

/**
 * Zoomstufe, auf der die uebergebenen Punkte nicht mehr zusammengefasst wuerden.
 *
 * Pro Zoomstufe verdoppelt sich der Pixelabstand zwischen zwei Koordinaten.
 * Gesucht ist also der Faktor zwischen dem engsten aktuellen Abstand und dem
 * gewuenschten Mindestabstand — und davon der Zweierlogarithmus.
 *
 * Ein blosses "auf das umschliessende Rechteck zoomen" reicht nicht: auf einem
 * Betriebshof liegen die Fahrzeuge so dicht, dass sie auch im passenden
 * Ausschnitt weiter uebereinander lagen.
 *
 * @param points  Weltpixel auf `currentZoom`.
 * @param targetPx Abstand, den die Punkte danach mindestens haben sollen.
 */
export function zoomToSeparate(
  points: Array<{ x: number; y: number }>,
  targetPx: number,
  currentZoom: number,
  maxZoom: number,
): number {
  // Ein Klick soll immer etwas bewirken, deshalb mindestens eine Stufe.
  const mindestens = Math.min(currentZoom + 1, maxZoom);
  if (points.length < 2) return mindestens;

  let engster = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y);
      if (d < engster) engster = d;
    }
  }

  // Abstand null heisst: exakt dieselbe Koordinate. Da hilft kein Zoom mehr,
  // dann wird bis zur Obergrenze aufgezogen.
  if (!(engster > 0) || !Number.isFinite(engster)) return maxZoom;

  const noetig = Math.ceil(currentZoom + Math.log2(targetPx / engster));
  return Math.min(maxZoom, Math.max(mindestens, noetig));
}
