import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking } from 'react-native';
import { colors, radii } from '../theme';

interface Props {
  onRequest: () => void;
}

export default function LocationPermissionScreen({ onRequest }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180, delay: 100 }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>📍</Text>
        </View>
        <Text style={styles.title}>Location needed</Text>
        <Text style={styles.body}>
          Fuelr uses your location to find the cheapest fuel stations nearby.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={onRequest} activeOpacity={0.85}>
          <Text style={styles.btnText}>Enable Location</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.settingsLink}>
          <Text style={styles.settingsLinkText}>Open Settings instead</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 40, gap: 16 },
  iconWrap: {
    width: 90, height: 90,
    borderRadius: 45,
    backgroundColor: colors.greenFaint,
    borderWidth: 1, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  icon: { fontSize: 38 },
  title: { fontSize: 24, fontWeight: '700', color: colors.white, textAlign: 'center', letterSpacing: -0.5 },
  body: {
    fontSize: 15, fontWeight: '300', color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.green,
    borderRadius: radii.pill,
    paddingHorizontal: 40,
    paddingVertical: 15,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#071409' },
  settingsLink: { paddingVertical: 8 },
  settingsLinkText: { fontSize: 13, color: colors.textMuted },
});
