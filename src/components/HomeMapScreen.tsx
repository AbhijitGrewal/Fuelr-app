import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Platform, Linking, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme';
import {
  GasStation, FuelType, getPrice, formatPrice, formatDistance,
} from '../services/fuelService';

interface Props {
  stations: GasStation[];
  cheapest: GasStation | null;
  fuelType: FuelType;
  loading: boolean;
  userLat: number | null;
  userLng: number | null;
  onSearch: () => void;
}

// ─── Single big ripple — plays once then disappears ───────────────────────────
function RippleBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale,   { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(opacity, { toValue: 0, duration: 2200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start(() => onDone());
  }, []);

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { alignItems: 'flex-start', justifyContent: 'flex-start' }]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: x - 150, top: y - 150,
          width: 300, height: 300, borderRadius: 150,
          borderWidth: 1.5,
          borderColor: colors.green,
          transform: [{ scale }],
          opacity,
        }}
      />
    </View>
  );
}

// Stable pin component - rendered outside of state that changes on tap
// This prevents all pins from unmounting/remounting when selection changes
const StationPin = React.memo(({
  station, isCheapest, isSelected, fuelType, onPress,
}: {
  station: GasStation;
  isCheapest: boolean;
  isSelected: boolean;
  fuelType: FuelType;
  onPress: (s: GasStation) => void;
}) => {
  return (
    <Marker
      key={station.id}
      identifier={station.id}
      coordinate={{ latitude: station.latitude, longitude: station.longitude }}
      onPress={() => onPress(station)}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={isCheapest ? 999 : isSelected ? 100 : 1}
      tracksViewChanges={false}
    >
      <View style={pinStyles.wrap}>
        {isCheapest ? (
          // Cheapest pin — larger, green, with label
          <View style={pinStyles.bestOuter}>
            <View style={pinStyles.bestPill}>
              <Text style={pinStyles.bestLabel}>✦ BEST</Text>
              <Text style={pinStyles.bestPrice}>
                {formatPrice(getPrice(station, fuelType))}
              </Text>
            </View>
            <View style={pinStyles.bestDot} />
          </View>
        ) : (
          // Normal pin
          <View style={[pinStyles.pill, isSelected && pinStyles.pillSelected]}>
            <Text style={[pinStyles.price, isSelected && pinStyles.priceSelected]}>
              {formatPrice(getPrice(station, fuelType))}
            </Text>
          </View>
        )}
        {!isCheapest && (
          <View style={[pinStyles.dot, isSelected && pinStyles.dotSelected]} />
        )}
      </View>
    </Marker>
  );
}, (prev, next) => {
  // Only re-render if these specific props change
  return (
    prev.isCheapest === next.isCheapest &&
    prev.isSelected === next.isSelected &&
    prev.fuelType   === next.fuelType &&
    prev.station.id === next.station.id
  );
});

const pinStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },

  // Normal pin
  pill: {
    backgroundColor: '#0e1218',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5,
  },
  pillSelected: {
    backgroundColor: '#161d2a',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  price: {
    fontSize: 11, fontWeight: '600', color: '#6b7585',
    fontVariant: ['tabular-nums'],
  },
  priceSelected: { color: colors.white },
  dot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: '#2a3040' },
  dotSelected: { backgroundColor: colors.white },

  // Best/cheapest pin
  bestOuter: { alignItems: 'center', gap: 3 },
  bestPill: {
    backgroundColor: colors.bgGreenDark,
    borderWidth: 1.5, borderColor: colors.green,
    borderRadius: 24,
    paddingHorizontal: 12, paddingVertical: 7,
    alignItems: 'center', gap: 1,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  bestLabel: {
    fontSize: 8, fontWeight: '800', color: colors.green,
    letterSpacing: 1.5,
  },
  bestPrice: {
    fontSize: 14, fontWeight: '800', color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  bestDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.green,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

export default function HomeMapScreen({
  stations, cheapest, fuelType, loading, userLat, userLng, onSearch,
}: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  // Selected station id only — not the full object — to minimise re-renders
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [displayStation, setDisplayStation] = useState<GasStation | null>(null);
  const [cardVisible, setCardVisible]   = useState(false);
  const [ripplePos, setRipplePos] = useState<{ x: number; y: number } | null>(null);

  // Animations
  const btnScale    = useRef(new Animated.Value(1)).current;
  const cardY       = useRef(new Animated.Value(80)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const swipeX      = useRef(new Animated.Value(0)).current;
  const swipeFade   = useRef(new Animated.Value(1)).current;

  // Centre map on user location
  useEffect(() => {
    if (userLat && userLng) {
      mapRef.current?.animateToRegion({
        latitude: userLat, longitude: userLng,
        latitudeDelta: 0.08, longitudeDelta: 0.08,
      }, 800);
    }
  }, [userLat, userLng]);

  // Auto-show cheapest when results arrive
  useEffect(() => {
    if (cheapest) {
      setSelectedId(cheapest.id);
      openCard(cheapest, false);
      setRipplePos(null); // hide ripple once results are in
    }
  }, [cheapest?.id]);

  const openCard = (station: GasStation, withSwipe: boolean) => {
    if (!cardVisible) {
      setDisplayStation(station);
      setCardVisible(true);
      cardY.setValue(80);
      cardOpacity.setValue(0);
      swipeX.setValue(0);
      swipeFade.setValue(1);
      Animated.parallel([
        Animated.spring(cardY,      { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
        Animated.timing(cardOpacity,{ toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (withSwipe) {
      const currentIndex = stations.findIndex(s => s.id === displayStation?.id);
      const newIndex     = stations.findIndex(s => s.id === station.id);
      const outDir = newIndex > currentIndex ? -55 : 55;
      const inDir  = newIndex > currentIndex ?  55 : -55;

      Animated.parallel([
        Animated.timing(swipeX,    { toValue: outDir, duration: 170, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
        Animated.timing(swipeFade, { toValue: 0,      duration: 140, useNativeDriver: true }),
      ]).start(() => {
        setDisplayStation(station);
        swipeX.setValue(inDir);
        swipeFade.setValue(0);
        Animated.parallel([
          Animated.spring(swipeX,    { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 280 }),
          Animated.timing(swipeFade, { toValue: 1, duration: 170, useNativeDriver: true }),
        ]).start();
      });
    } else {
      setDisplayStation(station);
    }
  };

  const dismissCard = () => {
    Animated.parallel([
      Animated.timing(cardY,      { toValue: 80, duration: 200, useNativeDriver: true }),
      Animated.timing(cardOpacity,{ toValue: 0,  duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setCardVisible(false);
      setSelectedId(null);
    });
  };

  const handlePinPress = useCallback((station: GasStation) => {
    if (selectedId === station.id && cardVisible) {
      dismissCard();
    } else {
      setSelectedId(station.id);
      openCard(station, cardVisible);
    }
  }, [selectedId, cardVisible, stations, displayStation]);

  const handleSearchPress = async () => {
    // Haptic feedback — medium impact tap
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) { /* silent fail on devices without haptics */ }

    // Button spring
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.93, useNativeDriver: true, damping: 10 }),
      Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, damping: 8, stiffness: 300 }),
    ]).start();

    // Convert user lat/lng to screen pixel position for ripple
    if (userLat && userLng && mapRef.current) {
      try {
        const point = await (mapRef.current as any).pointForCoordinate({
          latitude: userLat,
          longitude: userLng,
        });
        setRipplePos({ x: point.x, y: point.y });
      } catch (_) {
        setRipplePos(null);
      }
    }

    onSearch();
  };

  const openDirections = (station: GasStation) => {
    const url = Platform.select({
      ios:     `maps://app?daddr=${station.latitude},${station.longitude}`,
      android: `google.navigation:q=${station.latitude},${station.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const isBest = displayStation?.id === cheapest?.id;
  const price  = displayStation ? getPrice(displayStation, fuelType) : 0;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: userLat ?? -33.8688,
          longitude: userLng ?? 151.2093,
          latitudeDelta: 0.09, longitudeDelta: 0.09,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle="dark"
      >
        {stations.map((station) => (
          <StationPin
            key={station.id}
            station={station}
            isCheapest={station.id === cheapest?.id}
            isSelected={station.id === selectedId}
            fuelType={fuelType}
            onPress={handlePinPress}
          />
        ))}
      </MapView>

      {/* Ripple from user location on search — plays once */}
      {ripplePos && <RippleBurst x={ripplePos.x} y={ripplePos.y} onDone={() => setRipplePos(null)} />}

      {/* Top status badge */}
      <View style={[styles.topBadge, { top: insets.top + 12 }]}>
        <View style={[styles.liveDot, loading && { backgroundColor: '#444' }]} />
        <Text style={styles.topBadgeText}>
          {loading
            ? 'Searching…'
            : stations.length > 0
              ? `${stations.length} stations · ${fuelType}`
              : 'Tap Search Fuel to begin'}
        </Text>
      </View>

      {/* Station card */}
      {cardVisible && displayStation && (
        <Animated.View style={[
          styles.cardWrap,
          {
            bottom: insets.bottom + 136,
            transform: [{ translateY: cardY }, { translateX: swipeX }],
            opacity: Animated.multiply(cardOpacity, swipeFade),
          },
        ]}>
          {isBest && (
            <View style={styles.cheapestBadge}>
              <Text style={styles.cheapestText}>✦ CHEAPEST NEARBY</Text>
            </View>
          )}
          <View style={[styles.card, isBest && styles.cardBest]}>
            <View style={styles.cardIcon}>
              <Text style={{ fontSize: 20 }}>⛽</Text>
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.brandRow}>
              <Text style={styles.cardBrand} numberOfLines={1}>{displayStation.brand}</Text>
              {displayStation.isLivePrice && (
                <View style={styles.livePriceBadge}><Text style={styles.livePriceText}>LIVE</Text></View>
              )}
            </View>
              <Text style={styles.cardAddr}  numberOfLines={1}>{displayStation.address}</Text>
              <Text style={styles.cardDist}>{formatDistance(displayStation.distanceKm)} away</Text>
            </View>
            <View style={styles.cardRight}>
              <View style={styles.priceRow}>
                <Text style={[styles.cardPrice, isBest && styles.cardPriceBest]}>
                  {formatPrice(price)}
                </Text>
                <Text style={styles.cardPriceUnit}>c/L</Text>
              </View>
              <TouchableOpacity
                style={styles.goBtn}
                onPress={() => openDirections(displayStation)}
                activeOpacity={0.8}
              >
                <Text style={styles.goBtnText}>Go ↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Search button */}
      <Animated.View style={[
        styles.searchWrap,
        { bottom: insets.bottom + 72, transform: [{ scale: btnScale }] }
      ]}>
        <TouchableOpacity
          style={[styles.searchBtn, loading && styles.searchBtnLoading]}
          onPress={handleSearchPress}
          activeOpacity={0.9}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color={colors.green} size="small" style={{ marginRight: 8 }} />
              <Text style={[styles.searchBtnText, { color: colors.green }]}>Searching…</Text>
            </>
          ) : (
            <Text style={styles.searchBtnText}>⛽  Search Fuel</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  topBadge: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(8,8,8,0.85)',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 9,
  },
  liveDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  topBadgeText:{ fontSize: 12, fontWeight: '500', color: colors.textSecondary },

  cardWrap: { position: 'absolute', left: 20, right: 20 },
  cheapestBadge: {
    alignSelf: 'center', marginBottom: 7,
    backgroundColor: colors.greenFaint,
    borderWidth: 1, borderColor: colors.greenBorder,
    borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 4,
  },
  cheapestText: { fontSize: 9, fontWeight: '700', color: colors.green, letterSpacing: 2 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(10,12,18,0.97)',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.xl, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  cardBest: { borderColor: colors.greenBorder },

  cardIcon: {
    width: 44, height: 44,
    backgroundColor: colors.greenFaint, borderWidth: 1, borderColor: colors.greenBorder,
    borderRadius: radii.md, alignItems: 'center', justifyContent: 'center',
  },
  cardInfo:  { flex: 1 },
  cardBrand: { fontSize: 15, fontWeight: '700', color: colors.white, marginBottom: 2 },
  cardAddr:  { fontSize: 11, color: '#3d4556', marginBottom: 2 },
  cardDist:  { fontSize: 11, color: '#2a3040' },

  cardRight:     { alignItems: 'flex-end', gap: 4 },
  priceRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  cardPrice:     { fontSize: 22, fontWeight: '800', color: colors.white, fontVariant: ['tabular-nums'] },
  cardPriceBest: { color: colors.green },
  cardPriceUnit: { fontSize: 10, color: colors.textMuted, marginBottom: 3 },

  goBtn:     { backgroundColor: colors.green, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 7, marginTop: 2 },
  goBtnText: { fontSize: 12, fontWeight: '700', color: '#071409' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  livePriceBadge: { backgroundColor: 'rgba(111,207,151,0.15)', borderWidth: 1, borderColor: colors.greenBorder, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  livePriceText: { fontSize: 8, fontWeight: '800', color: colors.green, letterSpacing: 1.5 },

  searchWrap: { position: 'absolute', alignSelf: 'center' },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.green, borderRadius: radii.pill,
    paddingHorizontal: 40, paddingVertical: 16, minWidth: 200,
    shadowColor: colors.green, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  searchBtnLoading: {
    backgroundColor: colors.bgGreenTint, borderWidth: 1,
    borderColor: colors.greenBorder, shadowOpacity: 0, elevation: 0,
  },
  searchBtnText: { fontSize: 15, fontWeight: '700', color: '#071409', letterSpacing: 0.3 },
});
