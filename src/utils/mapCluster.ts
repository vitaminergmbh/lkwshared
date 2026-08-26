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

/**
 * Greedy-Gruppierung: der Reihe nach wird ein noch freier Punkt zum Kern und
 * zieht alle freien Punkte innerhalb des Radius an sich.
 *
 * Die Punkte werden vorher nach id sortiert. Ohne das haengt das Ergebnis an
 * der Reihenfolge, in der die Positionen eintrudeln — dieselbe Karte saehe
 * dann von Aufruf zu Aufruf anders aus.
 */
export function clusterPoints(points: PixelPoint[], radiusPx: number): PointCluster[] {
  const sorted = [...points].sort((a, b) => a.id.localeCompare(b.id));
  const belegt = new Set<string>();
  const cluster: PointCluster[] = [];
  const r2 = radiusPx * radiusPx;

  for (const kern of sorted) {
    if (belegt.has(kern.id)) continue;
    belegt.add(kern.id);
    const mitglieder = [kern];

    for (const kandidat of sorted) {
      if (belegt.has(kandidat.id)) continue;
      const dx = kandidat.x - kern.x;
      const dy = kandidat.y - kern.y;
      if (dx * dx + dy * dy <= r2) {
        belegt.add(kandidat.id);
        mitglieder.push(kandidat);
      }
    }

    const n = mitglieder.length;
    cluster.push({
      key: mitglieder.map((m) => m.id).sort().join('|'),
      lat: mitglieder.reduce((s, m) => s + m.lat, 0) / n,
      lng: mitglieder.reduce((s, m) => s + m.lng, 0) / n,
      ids: mitglieder.map((m) => m.id),
    });
  }

  return cluster;
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
