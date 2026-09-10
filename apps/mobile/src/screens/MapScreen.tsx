import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useTheme } from '../theme/ThemeContext';
import {
  getCurrentCoordinates,
  LocationCoordinates,
  CAMPUS_COORDINATES,
} from '../services/locationService';
import { ReportService } from '../services/reportService';
import { HazardReport } from '@safora/shared-types';
import { ReportHazardModal } from '../components/ReportHazardModal';

export const MapScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const [coords, setCoords] = useState<LocationCoordinates>(CAMPUS_COORDINATES);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [selectedHazard, setSelectedHazard] = useState<HazardReport | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const userPos = await getCurrentCoordinates();
      setCoords(userPos);
      const data = await ReportService.getNearby(
        userPos.latitude,
        userPos.longitude,
        5000,
      );
      setHazards(data);
    } catch {
      // Fallback handled inside services
    } finally {
      setLoading(false);
    }
  };

  const recenterMap = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        600,
      );
    }
  };

  const handleConfirmHazard = async (reportId: string | number) => {
    try {
      const res = await ReportService.confirm(reportId);
      setHazards(prev =>
        prev.map(h =>
          h.id === reportId
            ? { ...h, confirmationsCount: res.confirmationsCount }
            : h,
        ),
      );
      if (selectedHazard?.id === reportId) {
        setSelectedHazard(prev =>
          prev ? { ...prev, confirmationsCount: res.confirmationsCount } : null,
        );
      }
      Alert.alert(
        'Hazard Verified',
        'Thank you! Your verification increases community safety confidence.',
      );
    } catch {
      Alert.alert('Error', 'Unable to confirm hazard at this time.');
    }
  };

  const getPinColor = (sev: number) => {
    if (sev >= 4) return colors.danger;
    if (sev === 3) return colors.warning;
    return colors.info;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lighting':
        return '💡';
      case 'road_hazard':
        return '🚧';
      case 'waterlogging':
        return '🌊';
      case 'isolated_area':
        return '🌲';
      case 'traffic':
        return '🚗';
      default:
        return '⚠️';
    }
  };

  const tileUrl = isDark
    ? 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
    : 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.backgroundCard}
      />

      {/* Header Overlay */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Safety Radar
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            📍 {coords.areaName} • {hazards.length} hazards active
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.pinBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowReportModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.pinBtnText}>+ Pin Hazard</Text>
        </TouchableOpacity>
      </View>

      {/* Real Full-Screen MapView */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          mapType="none"
          initialRegion={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
        >
          {/* CartoDB High-Performance Vector Raster Tiles */}
          <UrlTile
            urlTemplate={tileUrl}
            maximumZ={19}
            flipY={false}
            tileSize={256}
          />

          {/* User Current Location Marker */}
          <Marker
            coordinate={{
              latitude: coords.latitude,
              longitude: coords.longitude,
            }}
            title="Your Location"
            description={coords.areaName}
          >
            <View
              style={[
                styles.userMarkerPulse,
                {
                  backgroundColor: isDark
                    ? 'rgba(79, 70, 229, 0.25)'
                    : 'rgba(79, 70, 229, 0.15)',
                  borderColor: colors.primary,
                },
              ]}
            >
              <View
                style={[
                  styles.userMarkerDot,
                  { backgroundColor: colors.primary },
                ]}
              />
            </View>
          </Marker>

          {/* Hazard Report Pins */}
          {hazards.map(item => (
            <Marker
              key={String(item.id)}
              coordinate={{
                latitude: item.latitude,
                longitude: item.longitude,
              }}
              title={item.title}
              description={`Severity: ${item.severity}/5`}
              onPress={() => setSelectedHazard(item)}
            >
              <View
                style={[
                  styles.hazardPin,
                  { backgroundColor: getPinColor(item.severity) },
                ]}
              >
                <Text style={styles.hazardPinIcon}>
                  {getCategoryIcon(item.category)}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Recenter GPS Floating Button */}
        <TouchableOpacity
          style={[
            styles.recenterFab,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
          onPress={recenterMap}
          activeOpacity={0.85}
        >
          <Text style={styles.recenterIcon}>🎯</Text>
        </TouchableOpacity>

        {/* Loading Pill */}
        {loading && (
          <View
            style={[
              styles.loadingPill,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
              Syncing PostGIS Radar...
            </Text>
          </View>
        )}
      </View>

      {/* Selected Hazard Card Sheet */}
      {selectedHazard && (
        <View
          style={[
            styles.bottomCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.bottomCardHeader}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.sevBadge,
                  {
                    backgroundColor:
                      getPinColor(selectedHazard.severity) + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sevBadgeText,
                    { color: getPinColor(selectedHazard.severity) },
                  ]}
                >
                  SEVERITY {selectedHazard.severity}/5
                </Text>
              </View>
              <Text
                style={[
                  styles.confirmationsText,
                  { color: colors.textSecondary },
                ]}
              >
                👍 {selectedHazard.confirmationsCount || 0} verifications
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedHazard(null)}
              style={styles.cardCloseBtn}
            >
              <Text style={[styles.cardCloseText, { color: colors.textMuted }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {selectedHazard.title}
          </Text>
          {selectedHazard.description ? (
            <Text
              style={[styles.cardDesc, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {selectedHazard.description}
            </Text>
          ) : null}

          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleConfirmHazard(selectedHazard.id)}
            >
              <Text style={styles.confirmBtnText}>✓ Confirm Hazard (+1)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Report Hazard Modal */}
      <ReportHazardModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        coordinates={{
          latitude: coords.latitude,
          longitude: coords.longitude,
        }}
        onReportCreated={newRep => {
          setHazards(prev => [newRep, ...prev]);
          setSelectedHazard(newRep);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerInfo: { flex: 1, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  pinBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  pinBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  mapWrapper: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  userMarkerPulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  userMarkerDot: { width: 12, height: 12, borderRadius: 6 },
  hazardPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  hazardPinIcon: { fontSize: 14 },
  recenterFab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  recenterIcon: { fontSize: 20 },
  loadingPill: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  loadingText: { fontSize: 11, fontWeight: '700' },
  bottomCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    elevation: 8,
  },
  bottomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sevBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  sevBadgeText: { fontSize: 10, fontWeight: '800' },
  confirmationsText: { fontSize: 11, fontWeight: '600' },
  cardCloseBtn: { padding: 4 },
  cardCloseText: { fontSize: 14, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardDesc: { fontSize: 12, lineHeight: 16 },
  cardActionRow: { flexDirection: 'row', marginTop: 4 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
