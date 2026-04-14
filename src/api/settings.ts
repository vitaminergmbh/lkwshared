import { getSupabase } from '../supabase';

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const { data, error } = await getSupabase()
    .from('settings')
    .select('key, value');
  if (error) throw new Error(error.message);
  const result: Record<string, string> = {};
  for (const row of data) {
    result[row.key] = row.value;
  }
  return result;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const { error } = await getSupabase()
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function deleteSetting(key: string): Promise<void> {
  const { error } = await getSupabase()
    .from('settings')
    .delete()
    .eq('key', key);
  if (error) throw new Error(error.message);
}
