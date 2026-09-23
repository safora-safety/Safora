import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import {
  OpenMapView,
  OpenMapViewRef,
  MapMarkerItem,
} from '../components/OpenMapView';
import { onJourneyLocation } from '../services/socketService';
import { colors } from '../theme/colors';

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

  useEffect(() => {
    const unsub = onJourneyLocation((payload: any) => {
      if (!payload) return;
      // If we filtered by journeyId or if we accept active location
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

    return () => {
      unsub();
    };
  }, [initialJourneyId]);

  const markers: MapMarkerItem[] = [
    {
      id: 'walker-marker',
      latitude: coords.latitude,
      longitude: coords.longitude,
      title: `${walkerName} (Live)`,
      description: isDeviated ? 'Route Deviation Warning' : 'Safe Walk Active',
      color: isDeviated ? '#EF4444' : '#10B981',
      isUser: true,
    },
  ];

  const handleCallEmergency = () => {
    Linking.openURL('tel:112').catch(() => {
      Alert.alert('Call Failed', 'Unable to initiate dialer for 112.');
    });
  };

  const handleCenter = () => {
    if (mapRef.current) {
      mapRef.current.recenter(coords.latitude, coords.longitude, 16);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {walkerName}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isDeviated ? '#EF4444' : '#10B981' },
              ]}
            />
            <Text style={styles.headerSubtitle}>
              {isDeviated ? 'Route Deviated' : 'Safe Walk Escort Active'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.centerBtn} onPress={handleCenter}>
          <Text style={styles.centerBtnText}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* Warning banner if deviated */}
      {isDeviated && (
        <View style={styles.deviationBanner}>
          <Text style={styles.deviationBannerText}>
            ⚠️ Walker has deviated from their safe corridor route!
          </Text>
        </View>
      )}

      {/* Live Map */}
      <View style={styles.mapContainer}>
        <OpenMapView
          ref={mapRef}
          center={coords}
          zoom={16}
          isDark={true}
          markers={markers}
          showLayerSwitcher={true}
        />
      </View>

      {/* Telemetry / Status Bottom Card */}
      <View style={styles.bottomCard}>
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>Last Update</Text>
            <Text style={styles.telemetryValue}>
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>Status</Text>
            <Text
              style={[
                styles.telemetryValue,
                { color: isDeviated ? '#EF4444' : '#10B981' },
              ]}
            >
              {isDeviated ? 'Off Route' : 'On Route'}
            </Text>
          </View>

          {battery !== null && (
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Battery</Text>
              <Text style={styles.telemetryValue}>{battery}%</Text>
            </View>
          )}

          {speed !== null && (
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Speed</Text>
              <Text style={styles.telemetryValue}>
                {(speed * 3.6).toFixed(1)} km/h
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={handleCenter}
          >
            <Text style={styles.recenterButtonText}>Center on Walker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleCallEmergency}
          >
            <Text style={styles.emergencyButtonText}>🚨 Call 112</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0D111D',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  centerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  centerBtnText: {
    fontSize: 18,
  },
  deviationBanner: {
    backgroundColor: '#7F1D1D',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deviationBannerText: {
    color: '#FEF2F2',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  bottomCard: {
    backgroundColor: '#0D111D',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#131A2A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  telemetryItem: {
    alignItems: 'center',
  },
  telemetryLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  telemetryValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  recenterButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  emergencyButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
