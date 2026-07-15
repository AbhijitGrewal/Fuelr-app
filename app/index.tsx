import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useLocation } from '../src/hooks/useLocation';
import { useFuelStore } from '../src/hooks/useFuelStore';
import { colors, radii } from '../src/theme';

import HomeMapScreen         from '../src/components/HomeMapScreen';
import StationsListScreen    from '../src/components/StationsListScreen';
import SettingsScreen        from '../src/components/SettingsScreen';
import LocationPermissionScreen from '../src/components/LocationPermissionScreen';
import DebugScreen           from '../src/components/DebugScreen';

type Tab = 'map' | 'list' | 'settings' | 'debug';

const TABS: { id: Tab; icon: string }[] = [
  { id: 'map',      icon: '⊞' },
  { id: 'list',     icon: '≡' },
  { id: 'settings', icon: '⊙' },
  { id: 'debug',    icon: '◉' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const location = useLocation();
  const store    = useFuelStore();

  const handleSearch = () => {
    if (location.latitude && location.longitude) {
      store.search(location.latitude, location.longitude);
    }
  };

  const showPermission = !location.permissionGranted && !location.loading && location.error;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        {showPermission ? (
          <LocationPermissionScreen onRequest={location.refresh} />
        ) : (
          <>
            <View style={[styles.screen, activeTab === 'map'      ? styles.visible : styles.hidden]}>
              <HomeMapScreen
                stations={store.stations} cheapest={store.cheapest}
                fuelType={store.fuelType} loading={store.loading}
                userLat={location.latitude} userLng={location.longitude}
                onSearch={handleSearch}
              />
            </View>

            <View style={[styles.screen, activeTab === 'list'     ? styles.visible : styles.hidden]}>
              <StationsListScreen
                stations={store.stations} cheapest={store.cheapest}
                fuelType={store.fuelType} setFuelType={store.setFuelType}
                loading={store.loading} lastRefreshed={store.lastRefreshed}
                radiusKm={store.radiusKm} setRadiusKm={store.setRadiusKm}
              />
            </View>

            <View style={[styles.screen, activeTab === 'settings' ? styles.visible : styles.hidden]}>
              <SettingsScreen
                fuelType={store.fuelType} setFuelType={store.setFuelType}
                radiusKm={store.radiusKm} setRadiusKm={store.setRadiusKm}
              />
            </View>

            <View style={[styles.screen, activeTab === 'debug'    ? styles.visible : styles.hidden]}>
              <DebugScreen />
            </View>

            {/* Floating pill tab bar */}
            <View style={styles.tabBarWrap}>
              <View style={styles.tabBar}>
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={styles.tabItem}
                      onPress={() => setActiveTab(tab.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.tabInner, isActive && styles.tabInnerActive]}>
                        <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                          {tab.icon}
                        </Text>
                        {tab.id === 'debug' && (
                          <View style={styles.debugDot} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  screen:  { flex: 1 },
  visible: { display: 'flex' },
  hidden:  { display: 'none' },

  tabBarWrap: {
    position: 'absolute', bottom: 28,
    left: 0, right: 0, alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111318',
    borderRadius: radii.pill,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 8, paddingVertical: 8, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  tabItem:  { width: 56, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabInner: { width: 52, height: 38, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tabInnerActive: { backgroundColor: 'rgba(232,244,240,0.1)' },
  tabIcon:        { fontSize: 20, color: '#3D4451' },
  tabIconActive:  { color: colors.green },
  debugDot: {
    position: 'absolute', top: 6, right: 10,
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#e05252',
  },
});
