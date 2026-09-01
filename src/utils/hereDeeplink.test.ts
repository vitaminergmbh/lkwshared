import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHereRouteUrl, formatVehicleDimensions } from './hereDeeplink.ts';

const DESSAU = { latitude: 51.828601, longitude: 12.232326, label: '[00] DESSAU' };
const LEUNA = { latitude: 51.316700, longitude: 11.990000, label: '[00] LEUNA' };
const KUNDE = { latitude: 51.839290, longitude: 12.187550, label: 'Nicole Sopora' };

/** Der ACTROS aus dem Bestand: 40 t, 4,00 m hoch, 2,55 m breit, 16,50 m lang. */
const ACTROS = { gross_weight_kg: 40000, height_cm: 400, width_cm: 255, length_cm: 1650 };

test('Zwei Punkte ergeben eine Route mit Titeln', () => {
  const url = buildHereRouteUrl([DESSAU, LEUNA]);
  assert.equal(
    url,
    'https://share.here.com/r/51.82860,12.23233,%5B00%5D%20DESSAU/51.31670,11.99000,%5B00%5D%20LEUNA',
  );
});

test('LKW-Modus haengt Masse an, in den Einheiten von HERE', () => {
  const url = buildHereRouteUrl([DESSAU, LEUNA], ACTROS, { truck: true });
  // Gewicht in kg, Masse in cm — genau so stehen sie am Fahrzeug.
  assert.match(url!, /\?m=tr&vw=40000&vdh=400&vdl=1650&vdw=255$/);
});

test('Ohne LKW-Modus bleiben Masse und Modus weg', () => {
  // Beim Transporter oder PKW waere m=tr eine unnoetige Lizenzanforderung.
  const url = buildHereRouteUrl([DESSAU, LEUNA], ACTROS);
  assert.equal(url!.includes('?'), false);
});

test('Fehlende Masse werden weggelassen, nicht geraten', () => {
  // Der Crafter hat keine Hoehe gepflegt. Eine erfundene waere gefaehrlicher
  // als gar keine: HERE wuerde damit Unterfuehrungen freigeben.
  const url = buildHereRouteUrl([DESSAU, LEUNA], { gross_weight_kg: 3500, height_cm: null }, { truck: true });
  assert.match(url!, /vw=3500/);
  assert.equal(url!.includes('vdh'), false);
});

test('Null und negative Masse zaehlen als nicht gepflegt', () => {
  const url = buildHereRouteUrl([DESSAU, LEUNA], { height_cm: 0, width_cm: -5 }, { truck: true });
  assert.equal(url!.includes('vdh'), false);
  assert.equal(url!.includes('vdw'), false);
});

test('Komma und Schraegstrich im Namen zerreissen den Wegpunkt nicht', () => {
  // "Halle 2, Tor 3" wuerde sonst als eigener Wegpunkt gelesen.
  const url = buildHereRouteUrl([
    { ...DESSAU, label: 'Halle 2, Tor 3' },
    { ...LEUNA, label: 'A/B Rampe' },
  ]);
  assert.match(url!, /Halle%202%2C%20Tor%203/);
  assert.match(url!, /A%2FB%20Rampe/);
  // Genau ein Trenner zwischen den beiden Punkten.
  assert.equal(url!.replace('https://share.here.com/r/', '').split('/').length, 2);
});

test('Mehrere Stops behalten ihre Reihenfolge', () => {
  const url = buildHereRouteUrl([DESSAU, KUNDE, LEUNA]);
  const punkte = url!.replace('https://share.here.com/r/', '').split('/');
  assert.equal(punkte.length, 3);
  assert.match(punkte[1]!, /Nicole/);
});

test('Ohne Namen bleibt der Wegpunkt bei den Koordinaten', () => {
  const url = buildHereRouteUrl([
    { latitude: 51.5, longitude: 12.5 },
    { latitude: 51.6, longitude: 12.6, label: '   ' },
  ]);
  assert.equal(url, 'https://share.here.com/r/51.50000,12.50000/51.60000,12.60000');
});

test('Ein einzelner Punkt ergibt keine Route', () => {
  assert.equal(buildHereRouteUrl([DESSAU]), null);
  assert.equal(buildHereRouteUrl([]), null);
});

test('Stops ohne Koordinaten fallen raus', () => {
  const url = buildHereRouteUrl([
    DESSAU,
    { latitude: null, longitude: null, label: 'ohne Adresse' },
    LEUNA,
  ]);
  assert.equal(url!.includes('ohne'), false);
  assert.equal(url!.replace('https://share.here.com/r/', '').split('/').length, 2);
});

test('Nullinsel zaehlt als fehlende Koordinate', () => {
  // 0/0 liegt im Atlantik und steht bei uns fuer "nicht geokodiert".
  assert.equal(buildHereRouteUrl([DESSAU, { latitude: 0, longitude: 0 }]), null);
});

test('Unsinnige Koordinaten ergeben keinen Link', () => {
  assert.equal(buildHereRouteUrl([DESSAU, { latitude: 95, longitude: 12 }]), null);
  assert.equal(buildHereRouteUrl([DESSAU, { latitude: 51, longitude: 200 }]), null);
});

test('Ueber der Wegpunktgrenze gibt es lieber keinen Link', () => {
  // Ein abgeschnittener Link wuerde den Fahrer mitten in der Tour stehen
  // lassen, ohne dass es jemand merkt.
  const viele = Array.from({ length: 101 }, (_, i) => ({
    latitude: 51 + i / 1000, longitude: 12 + i / 1000,
  }));
  assert.equal(buildHereRouteUrl(viele), null);
  assert.notEqual(buildHereRouteUrl(viele.slice(0, 100)), null);
});

// === Masse als Text ===

test('Masse werden fuer die Nachricht lesbar', () => {
  assert.equal(
    formatVehicleDimensions(ACTROS),
    '40 t · 4,00 m hoch · 2,55 m breit · 16,50 m lang',
  );
});

test('Krumme Tonnage bleibt genau', () => {
  assert.equal(formatVehicleDimensions({ gross_weight_kg: 7200 }), '7,2 t');
  assert.equal(formatVehicleDimensions({ gross_weight_kg: 15590 }), '15,59 t');
});

test('Ohne gepflegte Masse gibt es keine Zeile', () => {
  assert.equal(formatVehicleDimensions(null), null);
  assert.equal(formatVehicleDimensions({}), null);
  assert.equal(formatVehicleDimensions({ height_cm: 0 }), null);
});

test('Ganze Tonnen behalten ihre Stellen', () => {
  // 10,00 t darf nicht zu "1" werden — der Fall bricht, wenn die Nullen mit
  // einem Muster statt ueber die Zahl selbst abgeschnitten werden.
  assert.equal(formatVehicleDimensions({ gross_weight_kg: 10000 }), '10 t');
  assert.equal(formatVehicleDimensions({ gross_weight_kg: 100000 }), '100 t');
  assert.equal(formatVehicleDimensions({ gross_weight_kg: 3500 }), '3,5 t');
});
