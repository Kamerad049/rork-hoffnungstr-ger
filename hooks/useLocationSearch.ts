import { useState, useRef, useCallback, useEffect } from 'react';

export interface LocationResult {
  id: string;
  name: string;
  displayName: string;
  type: string;
}

const DEFAULT_SUGGESTIONS: LocationResult[] = [
  { id: 'def-1', name: 'Berlin, Deutschland', displayName: 'Berlin, Deutschland', type: 'city' },
  { id: 'def-2', name: 'München, Bayern', displayName: 'München, Bayern', type: 'city' },
  { id: 'def-3', name: 'Hamburg, Deutschland', displayName: 'Hamburg, Deutschland', type: 'city' },
  { id: 'def-4', name: 'Dresden, Sachsen', displayName: 'Dresden, Sachsen', type: 'city' },
  { id: 'def-5', name: 'Köln, NRW', displayName: 'Köln, NRW', type: 'city' },
  { id: 'def-6', name: 'Frankfurt, Hessen', displayName: 'Frankfurt, Hessen', type: 'city' },
  { id: 'def-7', name: 'Stuttgart, Baden-Württemberg', displayName: 'Stuttgart, Baden-Württemberg', type: 'city' },
  { id: 'def-8', name: 'Düsseldorf, NRW', displayName: 'Düsseldorf, NRW', type: 'city' },
  { id: 'def-9', name: 'Leipzig, Sachsen', displayName: 'Leipzig, Sachsen', type: 'city' },
  { id: 'def-10', name: 'Nürnberg, Bayern', displayName: 'Nürnberg, Bayern', type: 'city' },
];

function formatResult(item: { place_id: number; display_name: string; type: string; name?: string; address?: Record<string, string> }): LocationResult {
  const parts = item.display_name.split(', ');
  let shortName = item.display_name;

  if (item.name && item.address) {
    const addr = item.address;
    const locality = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
    const state = addr.state || '';
    if (locality && item.name !== locality) {
      shortName = `${item.name}, ${locality}`;
      if (state) shortName += `, ${state}`;
    } else if (locality) {
      shortName = locality;
      if (state) shortName += `, ${state}`;
    } else if (parts.length >= 2) {
      shortName = parts.slice(0, 3).join(', ');
    }
  } else if (parts.length >= 2) {
    shortName = parts.slice(0, 3).join(', ');
  }

  return {
    id: String(item.place_id),
    name: shortName,
    displayName: item.display_name,
    type: item.type || 'place',
  };
}

export function useLocationSearch() {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<LocationResult[]>(DEFAULT_SUGGESTIONS);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const searchNominatim = useCallback(async (searchQuery: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults(DEFAULT_SUGGESTIONS);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const encoded = encodeURIComponent(searchQuery.trim());
      const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=20&accept-language=de&countrycodes=de,at,ch`;

      console.log('[LocationSearch] Searching:', searchQuery);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'RorkApp/1.0',
        },
      });

      if (!response.ok) {
        console.log('[LocationSearch] Response not ok:', response.status);
        setIsSearching(false);
        return;
      }

      const data = await response.json();
      console.log('[LocationSearch] Got', data.length, 'results');

      const formatted = data.map(formatResult);

      const seen = new Set<string>();
      const unique = formatted.filter((r: LocationResult) => {
        if (seen.has(r.name)) return false;
        seen.add(r.name);
        return true;
      });

      setResults(unique.length > 0 ? unique : []);
      setIsSearching(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.log('[LocationSearch] Error:', err);
      setIsSearching(false);
    }
  }, []);

  const onChangeQuery = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!text.trim() || text.trim().length < 2) {
      setResults(DEFAULT_SUGGESTIONS);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      void searchNominatim(text);
    }, 400);
  }, [searchNominatim]);

  const reset = useCallback(() => {
    setQuery('');
    setResults(DEFAULT_SUGGESTIONS);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    query,
    results,
    isSearching,
    onChangeQuery,
    reset,
  };
}
