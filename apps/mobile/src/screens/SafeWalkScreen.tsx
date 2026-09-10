import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import {
  OpenMapView,
  OpenMapViewRef,
  MapMarkerItem,
} from '../components/OpenMapView';
import { useTheme } from '../theme/ThemeContext';
import {
  getCurrentCoordinates,
  LocationCoordinates,
  CAMPUS_COORDINATES,
} from '../services/locationService';
import { JourneyService } from '../services/journeyService';
import {
  calculateDistanceMeters,
  estimateWalkMinutes,
} from '../utils/distance';

interface DestinationPreset {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

const PRESETS: DestinationPreset[] = [
  {
    id: '1',
    name: 'Girls Hostel Block B',
    latitude: 30.3195,
    longitude: 78.0345,
  },
  { id: '2', name: 'Main Campus Gate', latitude: 30.3182, longitude: 78.0354 },
  { id: '3', name: 'Central Library', latitude: 30.3155, longitude: 78.0315 },
  { id: '4', name: 'Prem Nagar Bus Bay', latitude: 30.3125, longitude: 78.026 },
];

export const SafeWalkScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<OpenMapViewRef | null>(null);
  const [userPos, setUserPos] =
    useState<LocationCoordinates>(CAMPUS_COORDINATES);
  const [destPos, setDestPos] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  }>({
    latitude: PRESETS[0].latitude,
    longitude: PRESETS[0].longitude,
    name: PRESETS[0].name,
  });

  const [isActive, setIsActive] = useState(false);
  const [journeyId, setJourneyId] = useState<string | number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(600);
  const [isDeviated, setIsDeviated] = useState(false);
  const [showDeviationAlert, setShowDeviationAlert] = useState(false);

  useEffect(() => {
    getCurrentCoordinates().then(setUserPos);
  }, []);

  const distanceMeters = calculateDistanceMeters(
    userPos.latitude,
    userPos.longitude,
    destPos.latitude,
    destPos.longitude,
  );
  const etaMins = estimateWalkMinutes(distanceMeters);

  // Active Journey Countdown Timer
  useEffect(() => {
    let timer: any;
    if (isActive && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining(prev => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isActive) {
      triggerDeviationPrompt(
        'Safe Walk Timer Expired',
        'You have not checked in within the expected walking window.',
      );
    }
    return () => clearInterval(timer);
  }, [isActive, secondsRemaining]);

  const handleStartWalk = async () => {
    try {
      const journey = await JourneyService.startJourney({
        origin: { latitude: userPos.latitude, longitude: userPos.longitude },
        destination: {
          latitude: destPos.latitude,
          longitude: destPos.longitude,
        },
        expected_duration_minutes: etaMins,
      });
      setJourneyId(journey.id);
      setSecondsRemaining(etaMins * 60);
      setIsActive(true);
      setIsDeviated(false);
      Alert.alert(
        '🚶‍♀️ Safe Walk Activated',
        `Virtual guardian escort active to ${destPos.name}. Estimated travel time: ${etaMins} mins.`,
      );
    } catch {
      Alert.alert('Error', 'Unable to initialize Safe Walk session.');
    }
  };

  const handleCompleteWalk = async () => {
    if (journeyId) {
      await JourneyService.completeJourney(journeyId);
    }
    setIsActive(false);
    setIsDeviated(false);
    setShowDeviationAlert(false);
    Alert.alert(
      'Safe Walk Completed',
      'You marked yourself as arrived safely.',
    );
  };

  const triggerDeviationPrompt = (title: string, msg: string) => {
    setIsDeviated(true);
    setShowDeviationAlert(true);
    Vibration.vibrate([0, 500, 200, 500]);
    Alert.alert(
      `⚠️ ${title}`,
      `${msg}\n\nEmergency contacts will be dispatched in 60s if not confirmed.`,
      [
        {
          text: 'I AM SAFE',
          onPress: () => {
            setIsDeviated(false);
            setShowDeviationAlert(false);
          },
        },
        {
          text: 'DISPATCH SOS',
          style: 'destructive',
          onPress: () =>
            Alert.alert('🚨 Emergency SOS dispatched to campus security!'),
        },
      ],
    );
  };

  const simulateDeviation = () => {
    const offLat = userPos.latitude + 0.002;
    const offLng = userPos.longitude + 0.002;
    setUserPos(prev => ({ ...prev, latitude: offLat, longitude: offLng }));
    if (journeyId) {
      JourneyService.updateLocation(journeyId, {
        latitude: offLat,
        longitude: offLng,
      }).then(res => {
        if (res.isDeviated) {
          triggerDeviationPrompt(
            'Route Deviation Detected',
            `You moved ${Math.round(res.deviationMeters || 180)}m away from your corridor.`,
          );
        }
      });
    } else {
      triggerDeviationPrompt(
        'Route Deviation Test',
        'Simulated 180m off-corridor movement detected.',
      );
    }
  };

  const handleMapPress = (coords: { latitude: number; longitude: number }) => {
    if (isActive) return;
    setDestPos({
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: `Custom Pin (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
    });
  };

  const formatCountdown = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const mapMarkers: MapMarkerItem[] = [
    {
      id: 'walker',
      latitude: userPos.latitude,
      longitude: userPos.longitude,
      title: 'Start / Walker',
      icon: '🚶‍♀️',
      color: colors.primary,
    },
    {
      id: 'destination',
      latitude: destPos.latitude,
      longitude: destPos.longitude,
      title: destPos.name,
      icon: '📍',
      color: colors.danger,
    },
  ];

  const polylinePoints = [
    { latitude: userPos.latitude, longitude: userPos.longitude },
    { latitude: destPos.latitude, longitude: destPos.longitude },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.backgroundCard}
      />

      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Safe Walk Escort
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {isActive
              ? '🛡️ Active corridor tracking & live ETA'
              : 'Tap map or pick preset to set destination'}
          </Text>
        </View>
        {isActive && (
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>ESCORT ON</Text>
          </View>
        )}
      </View>

      {/* Real Interactive Map View */}
      <View style={styles.mapContainer}>
        <OpenMapView
          ref={mapRef}
          center={{ latitude: userPos.latitude, longitude: userPos.longitude }}
          zoom={15}
          isDark={isDark}
          markers={mapMarkers}
          polyline={polylinePoints}
          polylineColor={isDeviated ? colors.danger : colors.primary}
          polylineDash={!isActive}
          onMapPress={handleMapPress}
          style={styles.map}
        />
      </View>

      {/* Bottom Panel */}
      <View
        style={[
          styles.bottomPanel,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Preset Chips (When Idle) */}
        {!isActive && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetScroll}
          >
            {PRESETS.map(preset => {
              const isSelected = destPos.name === preset.name;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.backgroundInput,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setDestPos({
                      latitude: preset.latitude,
                      longitude: preset.longitude,
                      name: preset.name,
                    });
                    mapRef.current?.recenter(preset.latitude, preset.longitude);
                  }}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Stats Row */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: colors.backgroundInput,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Distance
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {distanceMeters >= 1000
                ? `${(distanceMeters / 1000).toFixed(1)} km`
                : `${distanceMeters} m`}
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {isActive ? 'Remaining' : 'Est. Walking'}
            </Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: isActive ? colors.warning : colors.textPrimary,
                },
              ]}
            >
              {isActive ? formatCountdown(secondsRemaining) : `${etaMins} mins`}
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Corridor
            </Text>
            <Text
              style={[
                styles.statValue,
                { color: isDeviated ? colors.danger : colors.success },
              ]}
            >
              {isDeviated ? 'DEVIATED' : '150m OK'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {!isActive ? (
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
              onPress={handleStartWalk}
              activeOpacity={0.85}
            >
              <Text style={styles.startBtnText}>
                ▶ Start Safe Walk Escort ({etaMins} mins)
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeBtnRow}>
              <TouchableOpacity
                style={[
                  styles.deviateBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(245, 158, 11, 0.15)'
                      : '#FEF3C7',
                    borderColor: colors.warning,
                  },
                ]}
                onPress={simulateDeviation}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.deviateBtnText, { color: colors.warning }]}
                >
                  ⚡ Test 150m Deviation
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.arriveBtn, { backgroundColor: colors.success }]}
                onPress={handleCompleteWalk}
                activeOpacity={0.85}
              >
                <Text style={styles.arriveBtnText}>✓ I Have Arrived</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  walkerMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkerEmoji: { fontSize: 18 },
  destMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destEmoji: { fontSize: 18 },
  bottomPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
  },
  presetScroll: { gap: 8, paddingBottom: 4 },
  presetChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: { fontSize: 12 },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  statDivider: { width: 1, height: 24 },
  actionRow: { marginTop: 4 },
  startBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  startBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  activeBtnRow: { flexDirection: 'row', gap: 10 },
  deviateBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deviateBtnText: { fontSize: 12, fontWeight: '800' },
  arriveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  arriveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
