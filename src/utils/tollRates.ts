// Deutsche LKW-Maut (Bundesfernstraßenmautgesetz)
// Quelle: BAG Mauttabelle, gültig ab 01.07.2024
// Seit 01.07.2024: Mautpflicht ab 3,5t zGG
// Raten in ct/km (Infrastruktur + Lärm + Luft, OHNE CO2-Aufschlag)

export interface TollRateInput {
  emission_class: string;   // 'euro0'..'euro6'
  co2_class: number;        // 1-5
  axle_count: number;       // 2+
  gross_weight_kg: number;  // in kg
}

type WeightClass = '3500_7500' | '7500_12000' | '12000_18000' | 'over_18000';
type AxleGroup = 'up_to_3' | '4' | '5_plus';
type EmissionGroup = 'euro6' | 'euro5' | 'euro4' | 'euro0_3';

function getWeightClass(kg: number): WeightClass | null {
  if (kg < 3500) return null; // Keine Maut unter 3,5t
  if (kg < 7500) return '3500_7500';
  if (kg <= 12000) return '7500_12000';
  if (kg <= 18000) return '12000_18000';
  return 'over_18000';
}

function getAxleGroup(axles: number): AxleGroup {
  if (axles <= 3) return 'up_to_3';
  if (axles === 4) return '4';
  return '5_plus';
}

function getEmissionGroup(ec: string): EmissionGroup {
  if (ec === 'euro6') return 'euro6';
  if (ec === 'euro5') return 'euro5';
  if (ec === 'euro4') return 'euro4';
  return 'euro0_3'; // euro0, euro1, euro2, euro3
}

// Base rates in ct/km (Infrastruktur + Lärm + Luftverschmutzung, OHNE CO2)
// Structure: [weight_class][axle_group][emission_group]
const BASE_RATES: Record<WeightClass, Record<AxleGroup, Record<EmissionGroup, number>>> = {
  // 3,5t - 7,5t (seit 01.07.2024, gleiche Achsgruppen)
  '3500_7500': {
    'up_to_3': { euro6: 3.8, euro5: 4.6, euro4: 5.2, euro0_3: 5.8 },
    '4':       { euro6: 3.8, euro5: 4.6, euro4: 5.2, euro0_3: 5.8 },
    '5_plus':  { euro6: 3.8, euro5: 4.6, euro4: 5.2, euro0_3: 5.8 },
  },
  '7500_12000': {
    'up_to_3': { euro6: 4.6, euro5: 5.8, euro4: 6.4, euro0_3: 7.1 },
    '4':       { euro6: 4.6, euro5: 5.8, euro4: 6.4, euro0_3: 7.1 },
    '5_plus':  { euro6: 4.6, euro5: 5.8, euro4: 6.4, euro0_3: 7.1 },
  },
  '12000_18000': {
    'up_to_3': { euro6: 6.2, euro5: 7.4, euro4: 8.0, euro0_3: 8.7 },
    '4':       { euro6: 6.2, euro5: 7.4, euro4: 8.0, euro0_3: 8.7 },
    '5_plus':  { euro6: 6.2, euro5: 7.4, euro4: 8.0, euro0_3: 8.7 },
  },
  'over_18000': {
    'up_to_3': { euro6: 8.0, euro5: 9.2, euro4: 9.8, euro0_3: 10.5 },
    '4':       { euro6: 10.0, euro5: 11.2, euro4: 11.8, euro0_3: 12.5 },
    '5_plus':  { euro6: 10.4, euro5: 11.6, euro4: 12.2, euro0_3: 12.9 },
  },
};

// CO2-Aufschlag in ct/km (seit 01.12.2023)
// Abhängig von CO2-Klasse des Fahrzeugs
const CO2_SURCHARGE: Record<number, number> = {
  1: 15.83, // Keine CO2-Reduktion (Standard Diesel)
  2: 14.25, // Leichte Reduktion
  3: 12.67, // Mittlere Reduktion
  4: 7.92,  // Starke Reduktion
  5: 0,     // Emissionsfrei (Elektro, Wasserstoff)
};

export function getTollRatePerKm(input: TollRateInput): number {
  if (!input.emission_class || !input.co2_class || !input.gross_weight_kg) {
    return 0;
  }

  const weightClass = getWeightClass(input.gross_weight_kg);
  if (!weightClass) return 0; // Unter 3,5t = keine Maut

  const axleGroup = getAxleGroup(input.axle_count);
  const emissionGroup = getEmissionGroup(input.emission_class);

  const baseRate = BASE_RATES[weightClass][axleGroup][emissionGroup];
  const co2Rate = CO2_SURCHARGE[input.co2_class] ?? CO2_SURCHARGE[1]!;

  // Convert ct/km to EUR/km
  return (baseRate + co2Rate) / 100;
}
