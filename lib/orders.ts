import { supabase } from '@/lib/supabase';
import { trackNetwork } from '@/lib/perf';

export interface DbOrden {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  rarity: string;
  category: string;
  tier: string;
  requirement: string;
  xp_reward: number;
  created_at: string;
}

export interface DbUserOrden {
  id: string;
  user_id: string;
  order_id: string;
  earned_at: string;
  source: string;
  meta: Record<string, unknown>;
}

export interface DbUserValueRow {
  id: string;
  user_id: string;
  value: string;
  created_at: string;
}

export async function getOrders(): Promise<DbOrden[]> {
  console.log('[ORDERS] Fetching all orden definitions...');
  const result = await trackNetwork('orders.getAll', async () =>
    await supabase.from('orders').select('*').order('created_at', { ascending: true })
  ) as { data: DbOrden[] | null; error: { message: string } | null };

  if (result.error) {
    console.log('[ORDERS] Error fetching orders:', result.error.message);
    return [];
  }

  console.log('[ORDERS] Fetched', result.data?.length ?? 0, 'orden definitions');
  return result.data ?? [];
}

export async function getUserOrders(userId: string): Promise<DbUserOrden[]> {
  console.log('[ORDERS] Fetching user orders for:', userId);
  const result = await trackNetwork('orders.getUserOrders', async () =>
    await supabase
      .from('user_orders')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
  ) as { data: DbUserOrden[] | null; error: { message: string } | null };

  if (result.error) {
    console.log('[ORDERS] Error fetching user orders:', result.error.message);
    return [];
  }

  console.log('[ORDERS] Fetched', result.data?.length ?? 0, 'earned orders for user');
  return result.data ?? [];
}

export async function getUserValues(userId: string): Promise<string[]> {
  console.log('[ORDERS] Fetching character values for:', userId);
  const result = await trackNetwork('orders.getUserValues', async () =>
    await supabase
      .from('user_values')
      .select('id, user_id, value, created_at')
      .eq('user_id', userId)
  ) as { data: DbUserValueRow[] | null; error: { message: string } | null };

  if (result.error) {
    console.log('[ORDERS] Error fetching character values:', result.error.message);
    return [];
  }

  const values = (result.data ?? []).map(row => row.value);
  console.log('[ORDERS] Character values loaded:', values.length, 'values');
  return values;
}

export async function grantUserOrder(
  userId: string,
  orderId: string,
  source: string,
  meta: Record<string, unknown> = {},
): Promise<DbUserOrden | null> {
  console.log('[ORDERS] Granting order', orderId, 'to user', userId);
  const result = await trackNetwork('orders.grant', async () =>
    await supabase
      .from('user_orders')
      .upsert(
        {
          user_id: userId,
          order_id: orderId,
          source,
          meta,
          earned_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,order_id' }
      )
      .select()
      .single()
  ) as { data: DbUserOrden | null; error: { message: string } | null };

  if (result.error) {
    console.log('[ORDERS] Error granting order:', result.error.message);
    return null;
  }

  console.log('[ORDERS] Order granted successfully');
  return result.data;
}

export async function updateUserValues(
  userId: string,
  values: string[],
): Promise<boolean> {
  console.log('[ORDERS] Updating character values for:', userId);

  const deleteResult = await trackNetwork('orders.deleteValues', async () =>
    await supabase.from('user_values').delete().eq('user_id', userId)
  ) as { error: { message: string } | null };

  if (deleteResult.error) {
    console.log('[ORDERS] Error clearing old values:', deleteResult.error.message);
    return false;
  }

  if (values.length === 0) {
    console.log('[ORDERS] No values to insert, cleared only');
    return true;
  }

  const rows = values.map(value => ({
    user_id: userId,
    value,
    created_at: new Date().toISOString(),
  }));

  const insertResult = await trackNetwork('orders.insertValues', async () =>
    await supabase.from('user_values').insert(rows)
  ) as { error: { message: string } | null };

  if (insertResult.error) {
    console.log('[ORDERS] Error inserting values:', insertResult.error.message);
    return false;
  }

  console.log('[ORDERS] Character values updated:', values.length, 'values');
  return true;
}
