import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme';
import {
  GasStation, FuelType, FUEL_TYPES, getPrice, formatPrice, formatDistance,
} from '../services/fuelService';

const RADIUS_OPTIONS = [5, 10, 15, 25];

function StationRow({ station, rank, fuelType, cheapest }: {
  station: GasStation; rank: number; fuelType: FuelType; cheapest: GasStation | null;
}) {
  const isBest = station.id === cheapest?.id;
  const scale   = useRef(new Animated.Value(0.97)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 200, delay: rank * 45 }),
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true, delay: rank * 45 }),
    ]).start();
  }, []);

  const openDirections = () => {
    const url = Platform.select({
      ios:     `maps://app?daddr=${station.latitude},${station.longitude}`,
      android: `google.navigation:q=${station.latitude},${station.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const rankColor = rank === 1 ? colors.green : rank === 2 ? colors.rank2 : rank === 3 ? colors.rank3 : '#2a3040';

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <View style={[styles.row, isBest && styles.rowBest]}>
        <View style={[styles.rankBadge, { backgroundColor: rankColor + '22', borderColor: rankColor + '44' }]}>
          <Text style={[styles.rankText, { color: rank <= 3 ? rankColor : '#3a4050' }]}>{rank}</Text>
        </View>
        <View style={styles.rowInfo}>
          <View style={styles.brandRow}>
          <Text style={styles.rowBrand} numberOfLines={1}>{station.brand}</Text>
          {station.isLivePrice && (
            <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
          )}
        </View>
          <Text style={styles.rowAddress} numberOfLines={1}>{station.address}</Text>
          <Text style={styles.rowDist}>{formatDistance(station.distanceKm)}</Text>
        </View>
        <View style={styles.rowRight}>
          <View style={styles.priceRow}>
            <Text style={[styles.rowPrice, isBest && styles.rowPriceBest]}>
              {formatPrice(getPrice(station, fuelType))}
            </Text>
            <Text style={styles.priceUnit}>c/L</Text>
          </View>
          <TouchableOpacity
            style={[styles.goBtn, isBest && styles.goBtnBest]}
            onPress={openDirections} activeOpacity={0.8}
          >
            <Text style={[styles.goBtnText, isBest && styles.goBtnTextBest]}>
              {formatDistance(station.distanceKm)} ↗
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

interface Props {
  stations: GasStation[];
  cheapest: GasStation | null;
  fuelType: FuelType;
  setFuelType: (f: FuelType) => void;
  loading: boolean;
  lastRefreshed: Date | null;
  radiusKm: number;
  setRadiusKm: (r: number) => void;
}

export default function StationsListScreen({
  stations, cheapest, fuelType, setFuelType, loading, lastRefreshed, radiusKm, setRadiusKm,
}: Props) {
  const insets = useSafeAreaInsets();

  const formatTime = (d: Date) => {
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nearby</Text>
          <Text style={styles.subtitle}>
            {lastRefreshed ? `Updated ${formatTime(lastRefreshed)}` : 'Search the map to see results'}
          </Text>
        </View>
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusPill, radiusKm === r && styles.radiusPillActive]}
              onPress={() => setRadiusKm(r)}
            >
              <Text style={[styles.radiusPillText, radiusKm === r && styles.radiusPillTextActive]}>
                {r}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Australian fuel type selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.fuelScroll} contentContainerStyle={styles.fuelContent}>
        {FUEL_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.fuelPill, fuelType === type && styles.fuelPillActive]}
            onPress={() => setFuelType(type)} activeOpacity={0.75}
          >
            <Text style={[styles.fuelPillText, fuelType === type && styles.fuelPillTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={{ gap: 10 }}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[styles.skeleton, { opacity: 0.5 - i * 0.06 }]} />
            ))}
          </View>
        )}

        {!loading && stations.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⛽</Text>
            <Text style={styles.emptyTitle}>No results yet</Text>
            <Text style={styles.emptySub}>Go to the map and tap Search Fuel</Text>
          </View>
        )}

        {!loading && stations.map((station, i) => (
          <StationRow key={station.id} station={station} rank={i + 1} fuelType={fuelType} cheapest={cheapest} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 12 },
  title:    { fontSize: 28, fontWeight: '700', color: colors.white, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3 },

  radiusRow: { flexDirection: 'row', gap: 6 },
  radiusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  radiusPillActive: { backgroundColor: colors.bgGreenTint, borderColor: colors.greenBorder },
  radiusPillText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  radiusPillTextActive: { color: colors.green },

  fuelScroll: { maxHeight: 48 },
  fuelContent: { paddingHorizontal: spacing.xl, gap: 8, alignItems: 'center' },
  fuelPill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: colors.bgCard },
  fuelPillActive: { backgroundColor: colors.green },
  fuelPillText: { fontSize: 13, fontWeight: '500', color: '#4a5568' },
  fuelPillTextActive: { color: '#071409', fontWeight: '700' },

  list: { flex: 1 },
  listContent: { padding: spacing.xl, gap: 10 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCardDeep, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: 14,
  },
  rowBest: { backgroundColor: 'rgba(12,24,16,0.9)', borderColor: colors.greenBorder },

  rankBadge: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankText:  { fontSize: 12, fontWeight: '800' },

  rowInfo:    { flex: 1 },
  rowBrand:   { fontSize: 15, fontWeight: '700', color: colors.white },
  rowAddress: { fontSize: 11, color: '#3a4155', marginTop: 2 },
  rowDist:    { fontSize: 11, color: '#2a3040', marginTop: 1 },

  rowRight:  { alignItems: 'flex-end', gap: 6 },
  priceRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  rowPrice:  { fontSize: 20, fontWeight: '800', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowPriceBest: { color: colors.green },
  priceUnit: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },

  goBtn: { backgroundColor: 'rgba(111,207,151,0.1)', borderWidth: 1, borderColor: colors.greenBorder, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 5 },
  goBtnBest: { backgroundColor: colors.green, borderColor: colors.green },
  goBtnText: { fontSize: 11, fontWeight: '600', color: colors.green },
  goBtnTextBest: { color: '#071409' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveBadge: { backgroundColor: 'rgba(111,207,151,0.12)', borderWidth: 1, borderColor: 'rgba(111,207,151,0.25)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  liveBadgeText: { fontSize: 8, fontWeight: '800', color: '#6FCF97', letterSpacing: 1.5 },

  skeleton: { height: 80, backgroundColor: colors.bgCard, borderRadius: radii.lg },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  emptySub:   { fontSize: 13, color: '#2a2f3d', textAlign: 'center' },
});
