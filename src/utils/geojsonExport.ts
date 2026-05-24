import type { Location } from '../types';

interface GeoJsonFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { name: string };
}

interface GeoJsonCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/**
 * Builds a minimal GeoJSON FeatureCollection per RFC 7946 / HERE WeGo Pro
 * collection-import schema. Each location is rendered as a single Point
 * Feature with only `properties.name` set — exactly matching the example
 * shown in HERE's import documentation. Extra fields (description, tags,
 * polygons, etc.) are intentionally omitted because they confuse some
 * importers (HERE WeGo was showing the address instead of the name when
 * additional properties were present).
 *
 * Coordinates are [longitude, latitude] per GeoJSON spec.
 */
export function buildLocationsGeoJson(locations: Location[]): GeoJsonCollection {
  const features: GeoJsonFeature[] = [];

  for (const loc of locations) {
    if (loc.archived) continue;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [loc.longitude, loc.latitude],
      },
      properties: { name: loc.name },
    });
  }

  return { type: 'FeatureCollection', features };
}

/** Convenience wrapper that returns a pretty-printed JSON string. */
export function buildLocationsGeoJsonString(locations: Location[]): string {
  return JSON.stringify(buildLocationsGeoJson(locations), null, 2);
}
