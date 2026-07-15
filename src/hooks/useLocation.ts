import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    permissionGranted: false,
  });

  const requestAndFetch = async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState(s => ({
          ...s,
          loading: false,
          permissionGranted: false,
          error: 'Location permission denied',
        }));
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setState({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        error: null,
        loading: false,
        permissionGranted: true,
      });
    } catch (e: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: e.message ?? 'Could not get location',
      }));
    }
  };

  useEffect(() => {
    requestAndFetch();
  }, []);

  return { ...state, refresh: requestAndFetch };
}
