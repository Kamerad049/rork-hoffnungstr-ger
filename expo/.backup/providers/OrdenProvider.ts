import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/providers/AuthProvider';
import { getOrders, getUserOrders, getUserValues, grantUserOrder } from '@/lib/orders';
import { ORDEN_DEFINITIONS, CHARACTER_DIMENSIONS, type OrdenDefinition, type OrdenTier } from '@/constants/orden';
import type { DbOrden, DbUserOrden } from '@/lib/orders';
import { queryKeys } from '@/constants/queryKeys';
import { trackRender } from '@/lib/perf';

function mapDbOrdenToDefinition(db: DbOrden): OrdenDefinition {
  return {
    id: db.slug,
    name: db.title,
    description: db.description,
    tier: (db.tier as OrdenTier) ?? 'bronze',
    category: db.category as OrdenDefinition['category'],
    icon: db.icon,
    requirement: db.requirement ?? '',
    xpReward: db.xp_reward ?? 0,
  };
}

export const [OrdenProvider, useOrden] = createContextHook(() => {
  trackRender('OrdenProvider');
  const { user, isLoggedIn } = useAuth();

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders(),
    queryFn: getOrders,
    staleTime: 10 * 60 * 1000,
    enabled: isLoggedIn,
  });

  const userOrdersQuery = useQuery({
    queryKey: queryKeys.userOrders(user?.id ?? ''),
    queryFn: () => getUserOrders(user!.id),
    enabled: isLoggedIn && !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const userValuesQuery = useQuery({
    queryKey: queryKeys.userValues(user?.id ?? ''),
    queryFn: () => getUserValues(user!.id),
    enabled: isLoggedIn && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const ordenDefinitions = useMemo((): OrdenDefinition[] => {
    if (ordersQuery.data && ordersQuery.data.length > 0) {
      console.log('[ORDEN_PROVIDER] Using', ordersQuery.data.length, 'DB orden definitions');
      return ordersQuery.data.map(mapDbOrdenToDefinition);
    }
    console.log('[ORDEN_PROVIDER] DB empty, falling back to local ORDEN_DEFINITIONS');
    return ORDEN_DEFINITIONS;
  }, [ordersQuery.data]);

  const earnedOrdenMap = useMemo((): Map<string, DbUserOrden> => {
    const map = new Map<string, DbUserOrden>();
    if (userOrdersQuery.data) {
      for (const uo of userOrdersQuery.data) {
        const orden = ordersQuery.data?.find(o => o.id === uo.order_id);
        if (orden) {
          map.set(orden.slug, uo);
        }
      }
    }
    return map;
  }, [userOrdersQuery.data, ordersQuery.data]);

  const earnedIds = useMemo((): Set<string> => {
    return new Set(earnedOrdenMap.keys());
  }, [earnedOrdenMap]);

  const characterValues = useMemo((): number[] => {
    const vals = userValuesQuery.data;
    if (vals && typeof vals === 'object') {
      return CHARACTER_DIMENSIONS.map(dim => {
        const v = vals[dim.key];
        return typeof v === 'number' ? v : 0;
      });
    }
    return CHARACTER_DIMENSIONS.map(() => 0);
  }, [userValuesQuery.data]);

  const tierCounts = useMemo((): Record<OrdenTier, number> => {
    const counts: Record<OrdenTier, number> = { bronze: 0, silber: 0, gold: 0, legendaer: 0 };
    for (const id of earnedIds) {
      const def = ordenDefinitions.find(d => d.id === id);
      if (def) counts[def.tier]++;
    }
    return counts;
  }, [earnedIds, ordenDefinitions]);

  const isLoading = ordersQuery.isLoading || userOrdersQuery.isLoading || userValuesQuery.isLoading;

  return {
    ordenDefinitions,
    earnedIds,
    earnedOrdenMap,
    characterValues,
    tierCounts,
    isLoading,
    refetchUserOrders: userOrdersQuery.refetch,
    refetchUserValues: userValuesQuery.refetch,
  };
});

export function useUserOrdenQuery(userId: string | undefined) {
  const ordersQuery = useQuery({
    queryKey: queryKeys.orders(),
    queryFn: getOrders,
    staleTime: 10 * 60 * 1000,
    enabled: !!userId,
  });

  const userOrdersQuery = useQuery({
    queryKey: queryKeys.userOrders(userId ?? ''),
    queryFn: () => getUserOrders(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const ordenDefinitions = useMemo((): OrdenDefinition[] => {
    if (ordersQuery.data && ordersQuery.data.length > 0) {
      return ordersQuery.data.map(mapDbOrdenToDefinition);
    }
    return ORDEN_DEFINITIONS;
  }, [ordersQuery.data]);

  const earnedIds = useMemo((): Set<string> => {
    const ids = new Set<string>();
    if (userOrdersQuery.data && ordersQuery.data) {
      for (const uo of userOrdersQuery.data) {
        const orden = ordersQuery.data.find(o => o.id === uo.order_id);
        if (orden) ids.add(orden.slug);
      }
    }
    return ids;
  }, [userOrdersQuery.data, ordersQuery.data]);

  const earnedOrden = useMemo((): OrdenDefinition[] => {
    return ordenDefinitions.filter(o => earnedIds.has(o.id));
  }, [ordenDefinitions, earnedIds]);

  return {
    ordenDefinitions,
    earnedIds,
    earnedOrden,
    isLoading: ordersQuery.isLoading || userOrdersQuery.isLoading,
  };
}
