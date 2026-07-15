import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme';
import { FuelType } from '../services/fuelService';

const FUEL_TYPES: FuelType[] = ['Unleaded 91', 'E10', 'Diesel'];
const RADII = [5, 10, 15, 25];

interface Props {
  fuelType: FuelType;
  setFuelType: (f: FuelType) => void;
  radiusKm: number;
  setRadiusKm: (r: number) => void;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function CardLabel({ label }: { label: string }) {
  return <Text style={styles.cardLabel}>{label}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen({ fuelType, setFuelType, radiusKm, setRadiusKm }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Preferences</Text>
        </View>

        {/* Fuel type */}
        <Card>
          <CardLabel label="Default Fuel Type" />
          <View style={styles.pillGroup}>
            {FUEL_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.pill, fuelType === type && styles.pillActive]}
                onPress={() => setFuelType(type)}
                activeOpacity={0.75}
              >
                <Text style={[styles.pillText, fuelType === type && styles.pillTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Search radius */}
        <Card>
          <CardLabel label="Search Radius" />
          <View style={styles.pillGroup}>
            {RADII.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.pill, radiusKm === r && styles.pillActive]}
                onPress={() => setRadiusKm(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.pillText, radiusKm === r && styles.pillTextActive]}>
                  {r} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* About */}
        <Card>
          <CardLabel label="About" />
          <InfoRow label="App" value="Fuelr" />
          <Divider />
          <InfoRow label="Version" value="1.0.0" />
          <Divider />
          <InfoRow label="Data source" value="OpenStreetMap" />
          <Divider />
          <InfoRow label="Directions" value="Apple Maps / Google Maps" />
        </Card>

        {/* Brand footer */}
        <View style={styles.brandFooter}>
          <Text style={styles.brandName}>fuelr</Text>
          <Text style={styles.brandTagline}>Find cheap fuel nearby</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, gap: 14 },

  header: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: colors.white, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3 },

  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: 14,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4a5568',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  pillGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.bgCardDeep,
    borderWidth: 1, borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.green, borderColor: colors.green },
  pillText: { fontSize: 13, fontWeight: '500', color: '#4a5568' },
  pillTextActive: { color: '#071409', fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: colors.textPrimary },
  infoValue: { fontSize: 13, color: colors.textMuted },

  brandFooter: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  brandName: { fontSize: 24, fontWeight: '100', color: 'rgba(255,255,255,0.15)', letterSpacing: 8 },
  brandTagline: { fontSize: 11, color: 'rgba(255,255,255,0.1)', letterSpacing: 2, textTransform: 'uppercase' },
});
