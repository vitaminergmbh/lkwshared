import { getSupabase } from '../supabase';

/**
 * Kurzlink-Gedaechtnis.
 *
 * Gemerkt wird nicht "Link des Standorts", sondern "Kurzlink zu dieser vollen
 * URL". Damit faellt alles hinein, was wir kuerzen: der Kartenlink eines
 * Stops, der HERE-Link mit den Massen des Fahrzeugs, der Tourlink. Und weil
 * die volle URL der Schluessel ist, verfaellt der Eintrag von selbst — eine
 * verschobene Koordinate ergibt eine andere URL und damit einen anderen
 * Eintrag, nie den alten Kurzlink an neuer Stelle.
 */

/** Kurzlinks zu mehreren vollen URLs: volle URL -> Kurzlink. */
export async function lookupShortLinks(urls: string[]): Promise<Map<string, string>> {
  const raus = new Map<string, string>();
  const gefragt = [...new Set(urls)].filter((u) => u);
  if (gefragt.length === 0) return raus;

  // Ueber die Funktion statt ueber .in(): die Liste geht als POST-Rumpf raus.
  // Ein Tourlink mit zehn Stops ist mehrere hundert Zeichen lang, und ein
  // Dutzend davon wuerde die Adresszeile sprengen.
  const { data, error } = await getSupabase().rpc('short_links_lookup', { urls: gefragt });
  if (error) throw new Error(error.message);

  for (const zeile of (data ?? []) as { source_url: string; short_url: string }[]) {
    raus.set(zeile.source_url, zeile.short_url);
  }
  return raus;
}

/**
 * Neue Kurzlinks merken.
 *
 * Wer zuerst da war, bleibt stehen: zwei Browser koennen dieselbe Tour
 * gleichzeitig kopieren, und dann sind beide Kurzlinks richtig — einer reicht.
 */
export async function saveShortLinks(links: Map<string, string> | Record<string, string>): Promise<void> {
  const paare = links instanceof Map ? [...links] : Object.entries(links);
  const zeilen = paare
    .filter(([source, short]) => source && short)
    .map(([source_url, short_url]) => ({ source_url, short_url }));
  if (zeilen.length === 0) return;

  const { error } = await getSupabase()
    .from('short_links')
    .upsert(zeilen, { onConflict: 'source_url', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}
