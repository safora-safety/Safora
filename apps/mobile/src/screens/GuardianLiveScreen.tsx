import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  OpenMapView,
  OpenMapViewRef,
  MapMarkerItem,
} from '../components/map/OpenMapView';
import {
  onJourneyLocation,
  onJourneyEnded,
  joinJourneyRoom,
  leaveJourneyRoom,
} from '../services/socketService';
import { JourneyService } from '../services/journeyService';
import { useTheme } from '../theme/ThemeContext';

interface GuardianLiveScreenProps {
  route?: {
    params?: {
      journeyId?: string | number;
      walkerName?: string;
      initialLocation?: { latitude: number; longitude: number };
    };
  };
  navigation: any;
}

export const GuardianLiveScreen: React.FC<GuardianLiveScreenProps> = ({
  route,
  navigation,
}) => {
  const mapRef = useRef<OpenMapViewRef | null>(null);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  );
  const bottomInset = Math.max(insets.bottom, 16) + 12;

  const initialJourneyId = route?.params?.journeyId;
  const initialName = route?.params?.walkerName || 'Companion Walker';
  const initialCoords = route?.params?.initialLocation || {
    latitude: 30.3165,
    longitude: 78.0322,
  };

  const [walkerName, setWalkerName] = useState(initialName);
  const [coords, setCoords] = useState(initialCoords);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isDeviated, setIsDeviated] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [plannedRoute, setPlannedRoute] = useState<
    Array<{ latitude: number; longitude: number }>
  >([]);
  const [originCoord, setOriginCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [destCoord, setDestCoord] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  // Fetch planned route and origin/destination on mount
  useEffect(() => {
    JourneyService.getActiveEscort()
      .then(escort => {
        if (escort) {
          if (escort.plannedRoute && Array.isArray(escort.plannedRoute)) {
            const mapped = escort.plannedRoute.map((p: any) =>
              Array.isArray(p)
                ? { latitude: Number(p[0]), longitude: Number(p[1]) }
                : {
                    latitude: Number(p.latitude),
                    longitude: Number(p.longitude),
                  },
            );
            setPlannedRoute(mapped);
          }
          if (escort.origin) {
            setOriginCoord(escort.origin);
          }
          if (escort.destination) {
            setDestCoord(escort.destination);
          }
        }
      })
      .catch(() => {});
  }, [initialJourneyId]);

  useEffect(() => {
    if (initialJourneyId) {
      joinJourneyRoom(initialJourneyId);
    }

    const unsub = onJourneyLocation((payload: any) => {
      if (!payload) return;
      if (
        initialJourneyId &&
        payload.journeyId &&
        String(payload.journeyId) !== String(initialJourneyId)
      ) {
        return;
      }

      if (payload.walkerName) {
        setWalkerName(payload.walkerName);
      }

      if (payload.latitude && payload.longitude) {
        const nextCoords = {
          latitude: Number(payload.latitude),
          longitude: Number(payload.longitude),
        };
        setCoords(nextCoords);
        setLastUpdated(new Date());

        if (mapRef.current) {
          mapRef.current.recenter(
            nextCoords.latitude,
            nextCoords.longitude,
            16,
          );
        }
      }

      if (payload.deviated !== undefined) {
        setIsDeviated(Boolean(payload.deviated));
      }
      if (payload.speed !== undefined) {
        setSpeed(payload.speed);
      }
      if (payload.battery !== undefined) {
        setBattery(payload.battery);
      }
    });

    const unsubEnded = onJourneyEnded((payload: any) => {
      if (!payload) return;
      if (
        !initialJourneyId ||
        String(payload.journeyId) === String(initialJourneyId)
      ) {
        const isCompleted = payload.status === 'completed';
        Alert.alert(
          isCompleted ? '🎉 Safe Arrival!' : '🛑 Safe Walk Ended',
          isCompleted
            ? `${walkerName} has reached their destination safely! Safe Walk escort session is complete.`
            : `${walkerName} has cancelled / ended their Safe Walk escort session.`,
          [{ text: 'Exit Live View', onPress: () => navigation.goBack() }],
        );
      }
    });

    return () => {
      if (initialJourneyId) {
        leaveJourneyRoom(initialJourneyId);
      }
      unsub();
      unsubEnded();
    };
  }, [initialJourneyId, walkerName, navigation]);

  const markers: MapMarkerItem[] = [
    {
      id: 'walker-marker',
      latitude: coords.latitude,
      longitude: coords.longitude,
      title: `${walkerName} (Live GPS)`,
      description: isDeviated ? 'Route Deviation Warning' : 'Safe Walk Active',
      color: isDeviated ? '#EF4444' : '#10B981',
      icon: '🚶‍♀️',
      isUser: true,
    },
    ...(originCoord
      ? [
          {
            id: 'origin-marker',
            latitude: originCoord.latitude,
            longitude: originCoord.longitude,
            title: 'Start Location',
            icon: '🟢',
            color: '#10B981',
          },
        ]
      : []),
    ...(destCoord
      ? [
          {
            id: 'dest-marker',
            latitude: destCoord.latitude,
            longitude: destCoord.longitude,
            title: destCoord.name || 'Destination',
            icon: '🏁',
            color: '#EF4444',
          },
        ]
      : []),
  ];

  const handleCallEmergency = () => {
    Alert.alert(
      '🚨 Dial Emergency 112',
      `Connect directly to national police and emergency response services for ${walkerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 112',
          style: 'destructive',
          onPress: () =>
            Linking.openURL('tel:112').catch(() => {
              Alert.alert('Call Failed', 'Unable to initiate dialer for 112.');
            }),
        },
      ],
    );
  };

  const handleCenter = () => {
    if (mapRef.current) {
      mapRef.current.recenter(coords.latitude, coords.longitude, 16);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Modern High-Aesthetic Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
            paddingTop: topInset + 10,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: colors.backgroundInput,
              borderColor: colors.border,
            },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back to Safety Network"
        >
          <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>
            ←
          </Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text
            style={[styles.headerTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {walkerName}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isDeviated ? '#EF4444' : '#10B981' },
              ]}
            />
            <Text
              style={[
                styles.headerSubtitle,
                { color: isDeviated ? '#EF4444' : colors.textSecondary },
              ]}
            >
              {isDeviated
                ? '⚠️ Off Route Corridor'
                : '🛡️ Live Guardian Escort Active'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.centerBtn,
            {
              backgroundColor: colors.backgroundInput,
              borderColor: colors.border,
            },
          ]}
          onPress={handleCenter}
          accessibilityLabel="Center on Walker"
        >
          <Text style={styles.centerBtnText}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* Warning banner if deviated */}
      {isDeviated && (
        <View style={styles.deviationBanner}>
          <Text style={styles.deviationBannerText}>
            🚨 ALERT: {walkerName} has deviated from their safe corridor route!
          </Text>
        </View>
      )}

      {/* Live Map with planned corridor polyline and markers */}
      <View style={styles.mapContainer}>
        <OpenMapView
          ref={mapRef}
          center={coords}
          zoom={16}
          isDark={isDark}
          markers={markers}
          polyline={plannedRoute.length >= 2 ? plannedRoute : undefined}
          polylineColor={isDeviated ? '#EF4444' : '#6366F1'}
          showLayerSwitcher={true}
          layerSwitcherTop={topInset + 64}
        />
      </View>

      {/* Telemetry HUD Bottom Card */}
      <View
        style={[
          styles.bottomCard,
          {
            backgroundColor: colors.backgroundCard,
            borderTopColor: colors.border,
            paddingBottom: bottomInset,
          },
        ]}
      >
        <View
          style={[
            styles.telemetryRow,
            {
              backgroundColor: isDark
                ? 'rgba(15, 23, 42, 0.7)'
                : colors.surfaceHover,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>
              Last Signal
            </Text>
            <Text
              style={[styles.telemetryValue, { color: colors.textPrimary }]}
            >
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>
              Corridor
            </Text>
            <Text
              style={[
                styles.telemetryValue,
                { color: isDeviated ? '#EF4444' : '#10B981' },
              ]}
            >
              {isDeviated ? 'Off Corridor' : 'Protected'}
            </Text>
          </View>

          {battery !== null && (
            <View style={styles.telemetryItem}>
              <Text
                style={[styles.telemetryLabel, { color: colors.textMuted }]}
              >
                Battery
              </Text>
              <Text
                style={[
                  styles.telemetryValue,
                  {
                    color:
                      battery <= 20
                        ? '#EF4444'
                        : battery <= 40
                          ? '#F59E0B'
                          : '#10B981',
                  },
                ]}
              >
                🔋 {battery}%
              </Text>
            </View>
          )}

          {speed !== null && (
            <View style={styles.telemetryItem}>
              <Text
                style={[styles.telemetryLabel, { color: colors.textMuted }]}
              >
                Speed
              </Text>
              <Text
                style={[styles.telemetryValue, { color: colors.textPrimary }]}
              >
                {(speed * 3.6).toFixed(1)} km/h
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.recenterButton,
              {
                backgroundColor: colors.backgroundInput,
                borderColor: colors.border,
              },
            ]}
            onPress={handleCenter}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.recenterButtonText, { color: colors.textPrimary }]}
            >
              🎯 Center Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleCallEmergency}
            activeOpacity={0.85}
          >
            <Text style={styles.emergencyButtonText}>🚨 Call 112</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  centerBtnText: {
    fontSize: 18,
  },
  deviationBanner: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  deviationBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  bottomCard: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  telemetryItem: {
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  recenterButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  emergencyButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default GuardianLiveScreen;
