import { useState, useCallback } from 'react';
import {
  GasStation, FuelType, getPrice, fetchNearbyStations,
} from '../services/fuelService';

export function useFuelStore() {
  const [stations, setStations] = useState<GasStation[]>([]);
  const [fuelType, setFuelType] = useState<FuelType>('Unleaded 91');
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const cheapest = stations.length > 0
    ? stations.reduce((a, b) => getPrice(a, fuelType) < getPrice(b, fuelType) ? a : b)
    : null;

  const search = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchNearbyStations(lat, lng, radiusKm);
      const sorted = [...results].sort((a, b) => getPrice(a, fuelType) - getPrice(b, fuelType));
      setStations(sorted);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [radiusKm, fuelType]);

  const sortedStations = [...stations].sort(
    (a, b) => getPrice(a, fuelType) - getPrice(b, fuelType)
  );

  return {
    stations: sortedStations, cheapest, fuelType, setFuelType,
    radiusKm, setRadiusKm, loading, error, lastRefreshed, search,
  };
}
