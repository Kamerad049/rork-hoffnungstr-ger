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

export interface DbUserValues {
  user_id: string;
  values: Record<string, number>;
  updated_at: string;
}

export async function getOrders(): Promise<DbOrden[]> {
  console.log('[ORDERS] Fetching all orden definitions...');
  const result = await trackNetwork('orders.getAll', () =>
    supabase.from('orders').select('*').order('created_at', { ascending: true })
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
  const result = await trackNetwork('orders.getUserOrders', () =>
    supabase
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

export async function getUserValues(userId: string): Promise<Record<string, number> | null> {
  console.log('[ORDERS] Fetching character values for:', userId);
  const result = await trackNetwork('orders.getUserValues', () =>
    supabase
      .from('user_values')
      .select('*')
      .eq('user_id', userId)
      .single()
  ) as { data: DbUserValues | null; error: { message: string } | null };

  if (result.error) {
    console.log('[ORDERS] No character values found:', result.error.message);
    return null;
  }

  console.log('[ORDERS] Character values loaded');
  return result.data?.values ?? null;
}

export async function grantUserOrder(
  userId: string,
  orderId: string,
  source: string,
  meta: Record<string, unknown> = {},
): Promise<DbUserOrden | null> {
  console.log('[ORDERS] Granting order', orderId, 'to user', userId);
  const result = await trackNetwork('orders.grant', () =>
    supabase
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
  values: Record<string, number>,
): Promise<boolean> {
  console.log('[ORDERS] Updating character values for:', userId);
  const result = await trackNetwork('orders.updateValues', () =>
    supabase
      .from('user_values')
      .upsert(
        {
          user_id: userId,
          values,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
  ) as { error: { message: string } | null };

  if (result.error) {
    console.log('[ORDERS] Error updating values:', result.error.message);
    return false;
  }

  console.log('[ORDERS] Character values updated');
  return true;
}
