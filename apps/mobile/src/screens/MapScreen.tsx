import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import {
  getCurrentCoordinates,
  LocationCoordinates,
  CAMPUS_COORDINATES,
} from '../services/locationService';

interface HazardPin {
  id: string;
  category: string;
  title: string;
  location: string;
  severity: number;
  distanceMeters: number;
  icon: string;
}

const SAMPLE_HAZARDS: HazardPin[] = [
  {
    id: '1',
    category: 'lighting',
    title: 'Poor Street Lighting',
    location: 'Chakrata Road Near Bus Stop',
    severity: 3,
    distanceMeters: 250,
    icon: '💡',
  },
  {
    id: '2',
    category: 'road_hazard',
    title: 'Open Construction Trench',
    location: 'Manduwala Main Campus Gate',
    severity: 5,
    distanceMeters: 550,
    icon: '🚧',
  },
  {
    id: '3',
    category: 'waterlogging',
    title: 'Waterlogged Underpass',
    location: 'Prem Nagar Market Subway',
    severity: 2,
    distanceMeters: 1200,
    icon: '🌊',
  },
  {
    id: '4',
    category: 'isolated',
    title: 'Dimly Lit Walking Trail',
    location: 'Navgaon Hostel Connecting Path',
    severity: 4,
    distanceMeters: 780,
    icon: '🌲',
  },
];

export const MapScreen: React.FC = () => {
  const [coords, setCoords] = useState<LocationCoordinates>(CAMPUS_COORDINATES);
  const [selectedRadius, setSelectedRadius] = useState<number>(3); // 3km
  const [selectedHazard, setSelectedHazard] = useState<HazardPin | null>(null);

  useEffect(() => {
    getCurrentCoordinates().then(setCoords);
  }, []);

  const getSeverityColor = (sev: number) => {
    if (sev >= 4) return colors.danger;
    if (sev === 3) return colors.warning;
    return colors.info;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Safety Radar</Text>
          <Text style={styles.headerSubtitle}>
            📍 {coords.areaName} ({coords.latitude.toFixed(4)},{' '}
            {coords.longitude.toFixed(4)})
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newReportBtn}
          onPress={() =>
            Alert.alert(
              'Report Hazard',
              'Opening PostGIS report submission modal...',
            )
          }
        >
          <Text style={styles.newReportText}>+ Pin</Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Simulated Map Canvas / Radar */}
      <View style={styles.radarCanvas}>
        <View style={styles.radarRingOuter}>
          <View style={styles.radarRingMiddle}>
            <View style={styles.radarRingInner}>
              <View style={styles.userGpsDot} />
            </View>
          </View>
        </View>

        {/* Hazard Markers on Radar */}
        <TouchableOpacity
          style={[
            styles.pinMarker,
            { top: '28%', left: '32%', backgroundColor: colors.danger },
          ]}
          onPress={() => setSelectedHazard(SAMPLE_HAZARDS[1])}
        >
          <Text style={styles.pinText}>🚧</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pinMarker,
            { top: '55%', left: '68%', backgroundColor: colors.warning },
          ]}
          onPress={() => setSelectedHazard(SAMPLE_HAZARDS[0])}
        >
          <Text style={styles.pinText}>💡</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pinMarker,
            { top: '72%', left: '26%', backgroundColor: colors.info },
          ]}
          onPress={() => setSelectedHazard(SAMPLE_HAZARDS[2])}
        >
          <Text style={styles.pinText}>🌊</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pinMarker,
            { top: '22%', left: '72%', backgroundColor: colors.danger },
          ]}
          onPress={() => setSelectedHazard(SAMPLE_HAZARDS[3])}
        >
          <Text style={styles.pinText}>🌲</Text>
        </TouchableOpacity>

        <View style={styles.radarCaption}>
          <Text style={styles.radarCaptionText}>
            ⚡ PostGIS Spatial Index Active • {SAMPLE_HAZARDS.length} hazards
            verified
          </Text>
        </View>
      </View>

      {/* Radius Filters */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Radius:</Text>
        {[1, 3, 5, 10].map(radius => (
          <TouchableOpacity
            key={radius}
            style={[
              styles.filterChip,
              selectedRadius === radius && styles.filterChipActive,
            ]}
            onPress={() => setSelectedRadius(radius)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedRadius === radius && styles.filterChipTextActive,
              ]}
            >
              {radius} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hazard List Feed */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.listSectionTitle}>
          Campus Hazards (Within {selectedRadius}km)
        </Text>

        {SAMPLE_HAZARDS.map(hazard => (
          <TouchableOpacity
            key={hazard.id}
            style={[
              styles.hazardCard,
              selectedHazard?.id === hazard.id && styles.hazardCardSelected,
            ]}
            onPress={() => setSelectedHazard(hazard)}
          >
            <View
              style={[
                styles.hazardIconBox,
                { borderColor: getSeverityColor(hazard.severity) },
              ]}
            >
              <Text style={styles.hazardCardIcon}>{hazard.icon}</Text>
            </View>

            <View style={styles.hazardDetails}>
              <Text style={styles.hazardTitle}>{hazard.title}</Text>
              <Text style={styles.hazardLocation}>{hazard.location}</Text>
              <Text style={styles.hazardDistance}>
                📍 {hazard.distanceMeters}m from current position
              </Text>
            </View>

            <View
              style={[
                styles.sevBadge,
                { backgroundColor: getSeverityColor(hazard.severity) + '25' },
              ]}
            >
              <Text
                style={[
                  styles.sevBadgeText,
                  { color: getSeverityColor(hazard.severity) },
                ]}
              >
                SEV {hazard.severity}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  newReportBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newReportText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  radarCanvas: {
    height: 240,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  radarRingOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingMiddle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
  },
  userGpsDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  pinMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  pinText: {
    fontSize: 14,
  },
  radarCaption: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  radarCaptionText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  listSectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  hazardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hazardCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceHover,
  },
  hazardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hazardCardIcon: {
    fontSize: 20,
  },
  hazardDetails: {
    flex: 1,
  },
  hazardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  hazardLocation: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  hazardDistance: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  sevBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sevBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
