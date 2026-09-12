import { getSupabase } from '../supabase';

/**
 * Tankkarte je Fahrzeug.
 *
 * Kartennummer und PIN liegen in `truck_fuel_cards`, deren Spalten der
 * oeffentliche Schluessel schreiben, aber nicht lesen darf. Der Planer sieht
 * deshalb nur die maskierte Sicht `truck_fuel_cards_masked`; die Fahrerseite
 * bekommt die PIN ueber die Edge Function fahrer-view (Service-Role).
 */
export interface FuelCardMasked {
  truck_id: string;
  provider: string | null;
  /** Letzte vier Ziffern der Kartennummer, null wenn keine hinterlegt. */
  card_last4: string | null;
  has_pin: boolean;
  valid_until: string | null;
  note: string | null;
  updated_at: string;
}

export interface FuelCardPatch {
  provider?: string | null;
  /** Nur mitschicken, wenn neu eingegeben — sonst bleibt die gespeicherte Nummer. */
  card_number?: string;
  /** Nur mitschicken, wenn neu eingegeben — sonst bleibt die gespeicherte PIN. */
  pin?: string;
  valid_until?: string | null;
  note?: string | null;
}

export async function getMaskedFuelCard(truckId: string): Promise<FuelCardMasked | null> {
  const { data, error } = await getSupabase()
    .from('truck_fuel_cards_masked')
    .select('*')
    .eq('truck_id', truckId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FuelCardMasked | null) ?? null;
}

export async function getMaskedFuelCards(): Promise<FuelCardMasked[]> {
  const { data, error } = await getSupabase()
    .from('truck_fuel_cards_masked')
    .select('*');
  if (error) throw new Error(error.message);
  return (data as FuelCardMasked[] | null) ?? [];
}

/**
 * Anlegen oder aendern. Felder, die nicht im Patch stehen, bleiben wie sie
 * sind — so kann die Notiz geaendert werden, ohne die PIN neu zu tippen.
 * Kein `select()` danach: die Geheimnisse sind fuer diesen Schluessel nicht
 * lesbar, ein Rueckgabewunsch wuerde die Anfrage kippen.
 */
export async function upsertFuelCard(truckId: string, patch: FuelCardPatch): Promise<void> {
  const zeile: Record<string, unknown> = { truck_id: truckId, updated_at: new Date().toISOString() };
  if (patch.provider !== undefined) zeile.provider = patch.provider;
  if (patch.card_number !== undefined) zeile.card_number = patch.card_number;
  if (patch.pin !== undefined) zeile.pin = patch.pin;
  if (patch.valid_until !== undefined) zeile.valid_until = patch.valid_until;
  if (patch.note !== undefined) zeile.note = patch.note;
  const { error } = await getSupabase()
    .from('truck_fuel_cards')
    .upsert(zeile, { onConflict: 'truck_id' });
  if (error) throw new Error(error.message);
}

export async function deleteFuelCard(truckId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('truck_fuel_cards')
    .delete()
    .eq('truck_id', truckId);
  if (error) throw new Error(error.message);
}
