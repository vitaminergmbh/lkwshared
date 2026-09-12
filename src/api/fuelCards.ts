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
 *
 * Kein Upsert: `ON CONFLICT DO UPDATE` braucht in Postgres Leserecht auf
 * den gesetzten Spalten, und genau das hat dieser Schluessel fuer PIN und
 * Kartennummer nicht (42501). Deshalb erst UPDATE (liest nur truck_id),
 * und wenn keine Zeile getroffen wurde, ein einfaches INSERT.
 */
export async function upsertFuelCard(truckId: string, patch: FuelCardPatch): Promise<void> {
  const felder: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.provider !== undefined) felder.provider = patch.provider;
  if (patch.card_number !== undefined) felder.card_number = patch.card_number;
  if (patch.pin !== undefined) felder.pin = patch.pin;
  if (patch.valid_until !== undefined) felder.valid_until = patch.valid_until;
  if (patch.note !== undefined) felder.note = patch.note;

  const { data: getroffen, error: updErr } = await getSupabase()
    .from('truck_fuel_cards')
    .update(felder)
    .eq('truck_id', truckId)
    .select('truck_id');
  if (updErr) throw new Error(updErr.message);
  if ((getroffen ?? []).length > 0) return;

  const { error: insErr } = await getSupabase()
    .from('truck_fuel_cards')
    .insert({ truck_id: truckId, ...felder });
  if (insErr) throw new Error(insErr.message);
}

export async function deleteFuelCard(truckId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('truck_fuel_cards')
    .delete()
    .eq('truck_id', truckId);
  if (error) throw new Error(error.message);
}
