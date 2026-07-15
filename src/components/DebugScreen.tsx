import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme';
import { getNSWToken, fetchNSWNearby, NSW_FUEL_CODES } from '../services/nswFuelAPI';

const FUEL_TYPES = [
  { label: 'Unleaded 91', code: 'U91' },
  { label: 'E10',         code: 'E10' },
  { label: 'Diesel',      code: 'DL'  },
  { label: 'Unleaded 95', code: 'P95' },
  { label: 'Unleaded 98', code: 'P98' },
];

const TEST_LAT = -33.8688;
const TEST_LNG = 151.2093;

interface Result {
  label: string;
  status: 'idle'|'loading'|'success'|'error';
  stationCount: number;
  samplePrices: { name: string; price: string }[];
  raw: string;
  error?: string;
}

export default function DebugScreen() {
  const insets = useSafeAreaInsets();
  const [tokenStatus, setTokenStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [tokenSnippet, setTokenSnippet] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number|null>(null);
  const [results, setResults] = useState<Result[]>(
    FUEL_TYPES.map(f => ({ label: f.label, status: 'idle', stationCount: 0, samplePrices: [], raw: '' }))
  );

  const handleGetToken = async () => {
    setTokenStatus('loading');
    setTokenError('');
    try {
      const t = await getNSWToken();
      setTokenSnippet(t.slice(0, 40) + '…');
      setTokenStatus('success');
    } catch (e: any) {
      setTokenStatus('error');
      setTokenError(e.message ?? 'Failed');
    }
  };

  const handleRunTest = async () => {
    setLoading(true);
    setExpandedIndex(null);
    setResults(FUEL_TYPES.map(f => ({ label: f.label, status: 'loading', stationCount: 0, samplePrices: [], raw: '' })));

    const newResults: Result[] = [];

    for (let i = 0; i < FUEL_TYPES.length; i++) {
      const { label, code } = FUEL_TYPES[i];
      if (i > 0) await new Promise(r => setTimeout(r, 700));
      try {
        const data     = await fetchNSWNearby(TEST_LAT, TEST_LNG, 5, code, 10);
        const stations = data.stations ?? [];
        const prices   = data.prices   ?? [];
        const stMap: Record<string, string> = {};
        for (const st of stations) {
          stMap[String(st.stationid ?? st.code)] = st.name ?? st.brand ?? 'Unknown';
        }
        const samplePrices = prices.slice(0, 8).map((p: any) => ({
          name:  stMap[String(p.stationcode ?? p.stationid)] ?? 'Unknown',
          price: String(p.price ?? '?'),
        }));
        newResults.push({ label, status: 'success' as const, stationCount: stations.length, samplePrices, raw: JSON.stringify(data, null, 2).slice(0, 1000) });
      } catch (e: any) {
        newResults.push({ label, status: 'error' as const, stationCount: 0, samplePrices: [], raw: '', error: e.message ?? 'Error' });
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>API Debug</Text>
        <Text style={styles.subtitle}>NSW FuelCheck · Sydney CBD · 5km</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Token step */}
        <View style={styles.card}>
          <Text style={styles.label}>STEP 1 — GET OAUTH TOKEN</Text>
          <Text style={styles.hint}>Uses your stored API key + secret automatically</Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, tokenStatus === 'loading' && { opacity: 0.5 }]}
            onPress={handleGetToken}
            disabled={tokenStatus === 'loading'}
            activeOpacity={0.85}
          >
            {tokenStatus === 'loading'
              ? <ActivityIndicator color={colors.green} size="small" />
              : <Text style={[styles.btnText, tokenStatus === 'success' && { color: colors.green }]}>
                  {tokenStatus === 'success' ? '✓ Token obtained' : 'Get Token'}
                </Text>
            }
          </TouchableOpacity>
          {tokenStatus === 'success' && <Text style={styles.tokenSnippet}>{tokenSnippet}</Text>}
          {tokenError ? <Text style={styles.errorMsg}>{tokenError}</Text> : null}
        </View>

        {/* Test step */}
        <View style={styles.card}>
          <Text style={styles.label}>STEP 2 — FETCH PRICES</Text>
          <Text style={styles.hint}>POST /fuelpricecheck/v2/fuel/prices/nearby · Sydney CBD</Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, (tokenStatus !== 'success' || loading) && { opacity: 0.4 }]}
            onPress={handleRunTest}
            disabled={tokenStatus !== 'success' || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <><ActivityIndicator color="#071409" size="small" style={{ marginRight: 8 }} /><Text style={styles.btnTextDark}>Testing…</Text></>
              : <Text style={styles.btnTextDark}>Run Test</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Results */}
        {results.map((r, i) => (
          <View key={r.label} style={styles.resultCard}>
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => setExpandedIndex(expandedIndex === i ? null : i)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[
                  styles.dot,
                  r.status === 'success' && styles.dotGreen,
                  r.status === 'error'   && styles.dotRed,
                  r.status === 'loading' && styles.dotYellow,
                ]} />
                <Text style={styles.fuelName}>{r.label}</Text>
                <Text style={styles.fuelCode}>({FUEL_TYPES[i].code})</Text>
              </View>
              <View style={styles.rowRight}>
                {r.status === 'loading' && <ActivityIndicator size="small" color={colors.textMuted} />}
                {r.status === 'success' && <Text style={styles.countText}>{r.stationCount} stations</Text>}
                {r.status === 'error'   && <Text style={styles.errText}>{r.error}</Text>}
                {(r.status === 'success' || r.status === 'error') && (
                  <Text style={styles.chevron}>{expandedIndex === i ? '▲' : '▼'}</Text>
                )}
              </View>
            </TouchableOpacity>

            {expandedIndex === i && r.status === 'success' && (
              <View style={styles.expanded}>
                <Text style={styles.label}>PRICES (Sydney CBD)</Text>
                {r.samplePrices.map((p, pi) => (
                  <View key={pi} style={styles.priceRow}>
                    <Text style={styles.priceName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.priceVal}>{p.price}c/L</Text>
                  </View>
                ))}
                <Text style={[styles.label, { marginTop: 12 }]}>RAW JSON</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={styles.rawJson}>{r.raw}</Text>
                </ScrollView>
              </View>
            )}

            {expandedIndex === i && r.status === 'error' && (
              <View style={styles.expanded}>
                <Text style={styles.errText}>{r.error}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  header:     { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title:      { fontSize: 28, fontWeight: '700', color: colors.white, letterSpacing: -0.5 },
  subtitle:   { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  content:    { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: 12 },

  card: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: spacing.lg, gap: 10,
  },
  label:        { fontSize: 9, fontWeight: '700', color: '#4a5568', letterSpacing: 2, textTransform: 'uppercase' },
  hint:         { fontSize: 11, color: colors.textMuted },
  tokenSnippet: { fontSize: 10, color: colors.green, fontFamily: 'monospace' },
  errorMsg:     { fontSize: 12, color: '#e05252' },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.pill, paddingVertical: 13,
  },
  btnPrimary:   { backgroundColor: colors.green },
  btnSecondary: { backgroundColor: colors.bgGreenTint, borderWidth: 1, borderColor: colors.greenBorder },
  btnText:      { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  btnTextDark:  { fontSize: 14, fontWeight: '700', color: '#071409' },

  resultCard: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, overflow: 'hidden',
  },
  resultRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },

  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a3040' },
  dotGreen:   { backgroundColor: colors.green },
  dotRed:     { backgroundColor: '#e05252' },
  dotYellow:  { backgroundColor: '#f0c040' },

  fuelName:   { fontSize: 14, fontWeight: '600', color: colors.white },
  fuelCode:   { fontSize: 12, color: colors.textMuted },
  countText:  { fontSize: 12, color: colors.green, fontWeight: '600' },
  errText:    { fontSize: 11, color: '#e05252' },
  chevron:    { fontSize: 10, color: colors.textMuted },

  expanded:   { borderTopWidth: 1, borderTopColor: colors.border, padding: 14, gap: 6 },
  priceRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  priceName:  { fontSize: 13, color: colors.textPrimary, flex: 1, marginRight: 12 },
  priceVal:   { fontSize: 13, fontWeight: '700', color: colors.green, fontVariant: ['tabular-nums'] },
  rawJson:    { fontSize: 10, color: '#4a5a6a', fontFamily: 'monospace', lineHeight: 16 },
});
