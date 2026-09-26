import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Alert,
  Vibration,
  Linking,
  Modal,
  ActivityIndicator,
  BackHandler,
  Platform,
  NativeModules,
} from 'react-native';
import {
  OpenMapView,
  OpenMapViewRef,
  MapMarkerItem,
} from '../components/OpenMapView';
import { useTheme } from '../theme/ThemeContext';
import {
  getCurrentCoordinates,
  watchUserLocation,
  LocationCoordinates,
  CAMPUS_COORDINATES,
} from '../services/locationService';
import { JourneyService } from '../services/journeyService';
import {
  fetchFootRoute,
  searchPlaces,
  PlaceSearchResult,
  RouteCoord,
} from '../services/routingService';
import { SosService } from '../services/sosService';
import { AudioRecorderService } from '../services/audioRecorderService';
import { SirenService } from '../services/sirenService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { joinJourneyRoom } from '../services/socketService';
import { useAuthStore } from '../store/authStore';
import { useJourneyStore } from '../store/journeyStore';
import { navigationRef } from '../navigation/RootNavigator';

export interface SafeWalkScreenProps {
  initialDestination?: {
    latitude: number;
    longitude: number;
    name: string;
  };
}

function downsampleRouteCoords(
  coords: RouteCoord[],
  maxPoints = 200,
): [number, number][] {
  if (!coords || coords.length === 0) return [];
  if (coords.length <= maxPoints) {
    return coords.map(c => [c.latitude, c.longitude]);
  }
  const step = (coords.length - 1) / (maxPoints - 1);
  const sampled: [number, number][] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    const idx = Math.round(i * step);
    sampled.push([coords[idx].latitude, coords[idx].longitude]);
  }
  sampled.push([
    coords[coords.length - 1].latitude,
    coords[coords.length - 1].longitude,
  ]);
  return sampled;
}

export const SafeWalkScreen: React.FC<SafeWalkScreenProps> = ({
  initialDestination,
}) => {
  const { colors, isDark } = useTheme();
  const { isGuest, token } = useAuthStore();
  const mapRef = useRef<OpenMapViewRef | null>(null);
  const [userPos, setUserPos] =
    useState<LocationCoordinates>(CAMPUS_COORDINATES);
  const [destPos, setDestPos] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  }>({
    latitude: 30.3165,
    longitude: 78.0322,
    name: 'Clock Tower / City Center',
  });

  useEffect(() => {
    if (initialDestination) {
      setDestPos(initialDestination);
      if (mapRef.current) {
        mapRef.current.recenter(
          initialDestination.latitude,
          initialDestination.longitude,
          15,
        );
      }
    }
  }, [initialDestination]);

  // Search & Routing state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [routeCoords, setRouteCoords] = useState<RouteCoord[]>([]);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState(850);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState(600);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Active Journey state synced with persistent Zustand store
  const {
    isActive,
    journeyId,
    secondsRemaining,
    isDeviated,
    deviationCountdown,
    startSession,
    updateSecondsRemaining,
    setDeviation,
    stopSession,
    hydrateSession,
  } = useJourneyStore();

  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [showPreWalkModal, setShowPreWalkModal] = useState(false);
  const [availableGuardians, setAvailableGuardians] = useState<any[]>([]);
  const [selectedGuardianIds, setSelectedGuardianIds] = useState<
    (string | number)[]
  >([]);
  const [isStartingWalk, setIsStartingWalk] = useState(false);

  // Hydrate persistent walk session on mount
  useEffect(() => {
    hydrateSession();
  }, []);

  // Initialize live position
  useEffect(() => {
    getCurrentCoordinates().then(c => {
      setUserPos(c);
      if (c.isLive && mapRef.current) {
        mapRef.current.recenter(c.latitude, c.longitude, 15);
      }
    });
  }, []);

  // Live GPS tracking when Safe Walk escort is active
  useEffect(() => {
    if (!isActive) return;
    const unsub = watchUserLocation(updatedCoords => {
      setUserPos(prev => ({
        ...prev,
        latitude: updatedCoords.latitude,
        longitude: updatedCoords.longitude,
        accuracy: updatedCoords.accuracy,
        isLive: true,
      }));

      // Stream live coordinates to backend during active walk
      if (journeyId) {
        if (Platform.OS === 'android' && NativeModules.SafeWalkService) {
          NativeModules.SafeWalkService.updateLocation(
            updatedCoords.latitude,
            updatedCoords.longitude,
          ).catch(() => {});
        }

        JourneyService.updateLocation(journeyId, {
          latitude: updatedCoords.latitude,
          longitude: updatedCoords.longitude,
        })
          .then(res => {
            if (res && res.isDeviated && !isDeviated) {
              triggerDeviationPrompt(
                'Corridor Deviation Detected',
                'You have moved away from the planned safe pedestrian route.',
              );
            }
          })
          .catch(() => {});
      }
    });
    return () => unsub();
  }, [isActive, journeyId, isDeviated]);

  // Handle hardware back press inside SafeWalkScreen
  useEffect(() => {
    const onBackPress = () => {
      if (searchResults.length > 0 || searchQuery.length > 0) {
        setSearchResults([]);
        setSearchQuery('');
        return true;
      }
      return false; // Bubble up to MainTabNavigator
    };

    const backSub = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    return () => backSub.remove();
  }, [searchResults, searchQuery]);

  const recenterMap = async () => {
    const c = await getCurrentCoordinates();
    setUserPos(c);
    if (mapRef.current) {
      mapRef.current.recenter(c.latitude, c.longitude, 16);
    }
  };

  // Update street route when destination changes (skip during active walk to prevent map jerking)
  useEffect(() => {
    if (userPos && destPos && !isActive) {
      updateStreetRoute();
    }
  }, [destPos.latitude, destPos.longitude, isActive]);

  const updateStreetRoute = async () => {
    setIsCalculatingRoute(true);
    try {
      const result = await fetchFootRoute(
        { latitude: userPos.latitude, longitude: userPos.longitude },
        { latitude: destPos.latitude, longitude: destPos.longitude },
      );
      setRouteCoords(result.coordinates);
      setRouteDistanceMeters(result.distanceMeters);
      setRouteDurationSeconds(result.durationSeconds);
    } catch {
      // Fallback handled in service
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Search input debouncer
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(searchQuery, {
        latitude: userPos.latitude,
        longitude: userPos.longitude,
      });
      setSearchResults(results);
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, userPos.latitude, userPos.longitude]);

  // Active Countdown Timer
  useEffect(() => {
    let timer: any;
    if (isActive && secondsRemaining > 0) {
      timer = setInterval(() => {
        updateSecondsRemaining(prev => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isActive) {
      triggerDeviationPrompt(
        'Safe Walk Timer Expired',
        'You have not arrived within the estimated time window.',
      );
    }
    return () => clearInterval(timer);
  }, [isActive, secondsRemaining]);

  // 60-second Auto-Escalation Timer on Corridor Deviation
  useEffect(() => {
    let interval: any;
    if (isDeviated && deviationCountdown !== null && deviationCountdown > 0) {
      interval = setInterval(() => {
        setDeviation(true, deviationCountdown - 1);
      }, 1000);
    } else if (isDeviated && deviationCountdown === 0) {
      // 60s expired without confirmation: Automatically escalate to Emergency SOS
      setDeviation(false, null);
      Vibration.vibrate([0, 1000, 500, 1000]);

      // Audio Recording (TRG-6-lite) — Prioritize lock-screen native recorder when foreground service is active
      if (Platform.OS === 'android' && NativeModules.SafeWalkService) {
        NativeModules.SafeWalkService.recordSosAudio(
          String(journeyId || 'auto_sos'),
        ).catch(() => {
          AudioRecorderService.startRecording().catch(() => {});
        });
      } else {
        AudioRecorderService.startRecording().catch(() => {});
      }

      SosService.triggerSOS({
        latitude: userPos.latitude,
        longitude: userPos.longitude,
        journey_id: journeyId,
      })
        .then(res => {
          Alert.alert(
            '🚨 Auto-Escalation: Emergency SOS Dispatched',
            `No response received within 60 seconds of route deviation. Emergency alerts transmitted to ${res.contactsNotified} emergency contacts with live GPS coordinates (${userPos.latitude.toFixed(4)}, ${userPos.longitude.toFixed(4)}).\n\n🎙️ 30s ambient audio evidence is recording.`,
          );

          if (res?.alert?.id) {
            setTimeout(() => {
              AudioRecorderService.stopAndUpload(res.alert.id).catch(() => {});
            }, 30000);
          }
        })
        .catch(() => {
          Alert.alert(
            '🚨 Emergency Dispatch Offline',
            `60s deviation window expired. Network unreachable.\n\nCoordinates: ${userPos.latitude.toFixed(4)}, ${userPos.longitude.toFixed(4)}\n\nLaunch emergency dialer or carrier SMS now?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: '📞 Call 112',
                style: 'destructive',
                onPress: () => Linking.openURL('tel:112'),
              },
              {
                text: '📱 Send SMS',
                onPress: () => {
                  const mapsLink = `https://maps.google.com/?q=${userPos.latitude.toFixed(5)},${userPos.longitude.toFixed(5)}`;
                  const body = encodeURIComponent(
                    `🚨 EMERGENCY SOS! I need immediate help. My live GPS coordinates: ${mapsLink} - Sent via SAFORA Safe Walk`,
                  );
                  Linking.openURL(`sms:?body=${body}`).catch(() => {});
                },
              },
            ],
          );
        });
    }
    return () => clearInterval(interval);
  }, [isDeviated, deviationCountdown, userPos, journeyId]);

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setDestPos({
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
    });
    setSearchQuery('');
    setSearchResults([]);
    if (mapRef.current) {
      mapRef.current.recenter(place.latitude, place.longitude, 15);
    }
  };

  const handleInitiateWalk = async () => {
    if (isGuest) {
      Alert.alert(
        'Account Required for Safe Walk',
        'Virtual escort and emergency guardian tracking require a registered account with emergency contacts. Would you like to sign in or register?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In / Register',
            onPress: () => {
              if (navigationRef.isReady()) {
                navigationRef.navigate('Auth');
              }
            },
          },
        ],
      );
      return;
    }

    try {
      const contacts = await SosService.getContacts();
      const valid = contacts.filter(
        c =>
          !String(c.id).startsWith('police-') &&
          !String(c.id).startsWith('ambulance-'),
      );
      setAvailableGuardians(valid);
      const initialIds = valid.map(c => c.guardianUserId || c.id);
      setSelectedGuardianIds(initialIds);
      setShowPreWalkModal(true);
    } catch {
      executeStartWalk([]);
    }
  };

  const toggleGuardianSelection = (id: string | number) => {
    setSelectedGuardianIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const executeStartWalk = async (guardianIds: (string | number)[]) => {
    setIsStartingWalk(true);
    const etaMins = Math.ceil(routeDurationSeconds / 60) || 10;
    try {
      const plannedRoute = downsampleRouteCoords(routeCoords);
      const journey = await JourneyService.startJourney({
        origin: { latitude: userPos.latitude, longitude: userPos.longitude },
        destination: {
          latitude: destPos.latitude,
          longitude: destPos.longitude,
        },
        planned_route: plannedRoute.length >= 2 ? plannedRoute : undefined,
        expected_duration_minutes: etaMins,
        trusted_contact_ids: guardianIds.length > 0 ? guardianIds : undefined,
      });

      joinJourneyRoom(journey.id);

      // Start native foreground service (TRG-2-lite / NAV-1 with Google Maps notification)
      if (Platform.OS === 'android' && NativeModules.SafeWalkService) {
        if (NativeModules.SafeWalkService.startWithDetails) {
          NativeModules.SafeWalkService.startWithDetails(
            String(journey.id),
            destPos.latitude,
            destPos.longitude,
            destPos.name,
            routeDistanceMeters || 0,
            token || '',
          ).catch(() => {});
        } else {
          NativeModules.SafeWalkService.start(
            String(journey.id),
            destPos.latitude,
            destPos.longitude,
          ).catch(() => {});
        }
      }

      startSession({
        journeyId: journey.id,
        destination: destPos,
        routeCoords,
        distanceMeters: routeDistanceMeters,
        durationSeconds: routeDurationSeconds || 600,
        selectedGuardianIds: guardianIds,
      });

      setShowPreWalkModal(false);

      Alert.alert(
        '🚶‍♀️ Safe Walk Activated',
        `Virtual guardian active along road route to ${destPos.name}.\nEstimated walk: ${formatDistance(routeDistanceMeters)} (${etaMins} mins).`,
      );
    } catch {
      Alert.alert(
        'Safe Walk Failed',
        "Couldn't start Safe Walk — no guardian monitoring. Check your connection and try again.",
      );
    } finally {
      setIsStartingWalk(false);
    }
  };

  const handleCompleteWalk = async () => {
    if (journeyId) {
      await JourneyService.completeJourney(journeyId).catch(() => {});
    }
    if (Platform.OS === 'android' && NativeModules.SafeWalkService) {
      NativeModules.SafeWalkService.stop().catch(() => {});
    }
    stopSession();
    setShowArrivalModal(true);
  };

  const handleCancelWalk = () => {
    Alert.alert(
      'Cancel Safe Walk?',
      'Are you sure you want to stop this walk session? Your guardians will be notified that the walk has ended.',
      [
        { text: 'Keep Walking', style: 'cancel' },
        {
          text: 'Yes, Stop Walk',
          style: 'destructive',
          onPress: async () => {
            const jId = journeyId;
            if (jId) {
              await JourneyService.cancelJourney(jId).catch(() => {});
            }
            if (Platform.OS === 'android' && NativeModules.SafeWalkService) {
              NativeModules.SafeWalkService.stop().catch(() => {});
            }
            stopSession();
            setShowPreWalkModal(false);
          },
        },
      ],
    );
  };

  const shareArrivalWhatsApp = () => {
    const text = encodeURIComponent(
      `✅ Hey! I have reached my destination (${destPos.name}) safely. My SAFORA Safe Walk escort session is completed.`,
    );
    Linking.openURL(`whatsapp://send?text=${text}`).catch(() => {
      Linking.openURL(`sms:?body=${text}`).catch(() => {
        Alert.alert('Arrival Shared', 'Emergency contacts notified.');
      });
    });
    setShowArrivalModal(false);
  };

  const triggerDeviationPrompt = (title: string, msg: string) => {
    setDeviation(true, 60);
    Vibration.vibrate([0, 500, 200, 500]);
    Alert.alert(
      `⚠️ ${title}`,
      `${msg}\n\nEmergency contacts will be auto-dispatched in 60s if not confirmed.`,
      [
        {
          text: 'I AM SAFE',
          onPress: () => {
            setDeviation(false, null);
            SirenService.stopSiren().catch(() => {});
            if (journeyId) {
              JourneyService.confirmSafe(journeyId);
            }
          },
        },
        {
          text: 'DISPATCH SOS',
          style: 'destructive',
          onPress: async () => {
            setDeviation(false, null);
            Vibration.vibrate([0, 800, 300, 800]);

            AsyncStorage.getItem('@safora_pref_loud_siren').then(pref => {
              if (pref === 'true') {
                SirenService.startSiren().catch(() => {});
              }
            });

            // Audio Recording (TRG-6-lite) — Prioritize lock-screen native recorder when foreground service is active
            if (Platform.OS === 'android' && NativeModules.SafeWalkService) {
              NativeModules.SafeWalkService.recordSosAudio(
                String(journeyId || 'manual_sos'),
              ).catch(() => {
                AudioRecorderService.startRecording().catch(() => {});
              });
            } else {
              AudioRecorderService.startRecording().catch(() => {});
            }

            try {
              const res = await SosService.triggerSOS({
                latitude: userPos.latitude,
                longitude: userPos.longitude,
                journey_id: journeyId,
              });
              Alert.alert(
                '🚨 Emergency SOS Dispatched',
                `Alert transmitted to ${res.contactsNotified} emergency contacts with live GPS coordinates (${userPos.latitude.toFixed(4)}, ${userPos.longitude.toFixed(4)}).\n\n🎙️ 30s ambient audio evidence is recording.`,
              );

              if (res?.alert?.id) {
                setTimeout(() => {
                  AudioRecorderService.stopAndUpload(res.alert.id).catch(
                    () => {},
                  );
                }, 30000);
              }
            } catch {
              Alert.alert(
                '🚨 Emergency Dispatch Offline',
                `Network unavailable to transmit online alert.\n\nCoordinates: ${userPos.latitude.toFixed(4)}, ${userPos.longitude.toFixed(4)}\n\nLaunch emergency dialer or carrier SMS now?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: '📞 Call 112',
                    style: 'destructive',
                    onPress: () => Linking.openURL('tel:112'),
                  },
                  {
                    text: '📱 Send SMS',
                    onPress: () => {
                      const mapsLink = `https://maps.google.com/?q=${userPos.latitude.toFixed(5)},${userPos.longitude.toFixed(5)}`;
                      const body = encodeURIComponent(
                        `🚨 EMERGENCY SOS! I need immediate help. My live GPS coordinates: ${mapsLink} - Sent via SAFORA Safe Walk`,
                      );
                      Linking.openURL(`sms:?body=${body}`).catch(() => {});
                    },
                  },
                ],
              );
            }
          },
        },
      ],
    );
  };

  const handleMapPress = (coords: { latitude: number; longitude: number }) => {
    if (isActive) return;
    setDestPos({
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: `Selected Street Point (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
    });
  };

  const formatCountdown = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const formatWalkDuration = (seconds: number) => {
    const mins = Math.ceil(seconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return rem > 0 ? `${hrs}h ${rem}m walk` : `${hrs}h walk`;
    }
    return `${mins} min walk`;
  };

  const mapMarkers: MapMarkerItem[] = [
    {
      id: 'walker',
      latitude: userPos.latitude,
      longitude: userPos.longitude,
      title: 'Your Location',
      icon: '🚶‍♀️',
      color: colors.primary,
    },
    {
      id: 'destination',
      latitude: destPos.latitude,
      longitude: destPos.longitude,
      title: destPos.name,
      icon: '📍',
      color: '#EF4444',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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
              ? '🛡️ Active street tracking & corridor monitor'
              : 'Search or tap map to set road destination'}
          </Text>
        </View>
        {isActive && (
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>ESCORT ON</Text>
          </View>
        )}
      </View>

      {/* Floating Google Maps-Style Destination Search Bar */}
      {!isActive && (
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search destination (e.g. Clock Tower, Metro...)"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Search Results Dropdown */}
          {searchResults.length > 0 && (
            <View
              style={[
                styles.searchResultsBox,
                {
                  backgroundColor: colors.backgroundCard,
                  borderColor: colors.border,
                },
              ]}
            >
              {searchResults.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.searchResultItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleSelectPlace(item)}
                >
                  <Text style={styles.resultIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.resultName, { color: colors.textPrimary }]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.resultSub,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.placeName}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Real Interactive Map View with Real Street Route */}
      <View style={styles.mapContainer}>
        <OpenMapView
          ref={mapRef}
          center={{ latitude: userPos.latitude, longitude: userPos.longitude }}
          zoom={15}
          isDark={isDark}
          markers={mapMarkers}
          polyline={routeCoords}
          polylineColor={isDeviated ? '#EF4444' : '#4F46E5'}
          polylineDash={!isActive}
          layerSwitcherTop={isActive ? 16 : 74}
          onMapPress={handleMapPress}
          style={styles.map}
        />

        {/* Route Info Badge Floating on Map */}
        <View
          style={[
            styles.routeBadge,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          {isCalculatingRoute ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Text style={styles.routeBadgeIcon}>🚶</Text>
              <Text
                style={[styles.routeBadgeText, { color: colors.textPrimary }]}
              >
                {formatDistance(routeDistanceMeters)} •{' '}
                {formatWalkDuration(routeDurationSeconds)}
              </Text>
            </>
          )}
        </View>

        {/* Recenter Live GPS Button */}
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
        {/* Destination Summary Card */}
        <View
          style={[
            styles.destCard,
            {
              backgroundColor: colors.backgroundInput,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={styles.destPinIcon}>🏁</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.destName, { color: colors.textPrimary }]}>
              {destPos.name}
            </Text>
            <Text style={[styles.destMeta, { color: colors.textSecondary }]}>
              Real pedestrian road corridor •{' '}
              {formatDistance(routeDistanceMeters)}
            </Text>
          </View>
        </View>

        {/* Action Controls: Start or Active In-Journey Monitor */}
        {!isActive ? (
          <TouchableOpacity
            style={[styles.startWalkBtn, { backgroundColor: colors.primary }]}
            onPress={handleInitiateWalk}
            activeOpacity={0.85}
          >
            <Text style={styles.startWalkBtnText}>
              🛡️ Start Safe Walk Escort ({Math.ceil(routeDurationSeconds / 60)}
              m)
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControls}>
            <View style={styles.countdownRow}>
              <View>
                <Text style={styles.countdownLabel}>REMAINING WINDOW</Text>
                <Text
                  style={[
                    styles.countdownText,
                    {
                      color:
                        secondsRemaining < 120 ? '#EF4444' : colors.primary,
                    },
                  ]}
                >
                  {formatCountdown(secondsRemaining)}
                </Text>
              </View>

              <View style={styles.walkButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelWalkBtn}
                  onPress={handleCancelWalk}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cancelWalkBtnText}>🛑 Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reachedSafelyBtn}
                  onPress={handleCompleteWalk}
                  activeOpacity={0.85}
                >
                  <Text style={styles.reachedSafelyBtnText}>
                    ✅ Reached Safely
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.activeNoticeRow}>
              <Text
                style={[styles.activeNoticeText, { color: colors.textMuted }]}
              >
                GPS corridor active. Guardians will be alerted if deviation
                occurs.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Pre-Walk Guardian Confirmation Modal */}
      <Modal
        visible={showPreWalkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreWalkModal(false)}
      >
        <View style={styles.preWalkOverlay}>
          <View
            style={[
              styles.preWalkCard,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.preWalkDragHandle} />

            <View style={styles.preWalkHeader}>
              <Text
                style={[styles.preWalkTitle, { color: colors.textPrimary }]}
              >
                🛡️ Confirm Safe Walk Escort
              </Text>
              <Text
                style={[
                  styles.preWalkSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Virtual companion will monitor your route to {destPos.name} (
                {Math.ceil(routeDurationSeconds / 60)} mins).
              </Text>
            </View>

            <View style={styles.preWalkSectionHeader}>
              <Text
                style={[
                  styles.preWalkSectionTitle,
                  { color: colors.textPrimary },
                ]}
              >
                Alerted Safety Guardians ({selectedGuardianIds.length})
              </Text>
              <Text
                style={[styles.preWalkSectionSub, { color: colors.textMuted }]}
              >
                Selected guardians receive your live GPS tracking & deviation
                alerts
              </Text>
            </View>

            <ScrollView
              style={styles.guardiansListScroll}
              showsVerticalScrollIndicator={false}
            >
              {availableGuardians.length === 0 ? (
                <View
                  style={[
                    styles.noGuardiansBox,
                    { backgroundColor: colors.backgroundInput },
                  ]}
                >
                  <Text style={styles.noGuardiansText}>
                    No registered personal guardians found. Add trusted contacts
                    in your Profile to alert them automatically during Safe
                    Walk.
                  </Text>
                </View>
              ) : (
                availableGuardians.map(g => {
                  const gId = g.guardianUserId || g.id;
                  const isSelected = selectedGuardianIds.includes(gId);
                  return (
                    <TouchableOpacity
                      key={String(g.id)}
                      style={[
                        styles.guardianCheckItem,
                        {
                          backgroundColor: isSelected
                            ? 'rgba(16, 185, 129, 0.1)'
                            : colors.backgroundInput,
                          borderColor: isSelected ? '#10B981' : colors.border,
                        },
                      ]}
                      onPress={() => toggleGuardianSelection(gId)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.guardianNameText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {g.name} ({g.relationship || 'Guardian'})
                        </Text>
                        <Text
                          style={[
                            styles.guardianPhoneText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {g.phone || g.email}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.checkboxCircle,
                          isSelected && styles.checkboxCircleActive,
                        ]}
                      >
                        {isSelected && (
                          <Text style={styles.checkmarkIcon}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.preWalkFooter}>
              <TouchableOpacity
                style={[
                  styles.preWalkCancelBtn,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowPreWalkModal(false)}
              >
                <Text
                  style={[
                    styles.preWalkCancelBtnText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.preWalkStartBtn,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => executeStartWalk(selectedGuardianIds)}
                disabled={isStartingWalk}
                activeOpacity={0.85}
              >
                {isStartingWalk ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.preWalkStartBtnText}>
                    🚀 Start Walk{' '}
                    {selectedGuardianIds.length > 0
                      ? `(${selectedGuardianIds.length} Alerted)`
                      : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* "I Reached Safely" Broadcast Modal */}
      <Modal
        visible={showArrivalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowArrivalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.arrivalCard,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.arrivalCheckCircle}>
              <Text style={styles.arrivalCheckEmoji}>🎉</Text>
            </View>

            <Text style={[styles.arrivalTitle, { color: colors.textPrimary }]}>
              You Arrived Safely!
            </Text>

            <Text
              style={[styles.arrivalSubtitle, { color: colors.textSecondary }]}
            >
              Safe Walk escort session completed at {destPos.name}. Would you
              like to broadcast an instant arrival confirmation to your
              guardians?
            </Text>

            <View style={styles.arrivalBtnCol}>
              <TouchableOpacity
                style={styles.whatsAppBtn}
                onPress={shareArrivalWhatsApp}
                activeOpacity={0.85}
              >
                <Text style={styles.whatsAppBtnText}>
                  💬 Share "I Reached Safely" (WhatsApp/SMS)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.arrivalDismissBtn}
                onPress={() => setShowArrivalModal(false)}
              >
                <Text
                  style={[
                    styles.arrivalDismissText,
                    { color: colors.textMuted },
                  ]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // Floating Search Bar
  searchContainer: {
    position: 'absolute',
    top: 115,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    gap: 10,
  },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  searchResultsBox: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 10,
    maxHeight: 220,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  resultIcon: { fontSize: 16 },
  resultName: { fontSize: 13, fontWeight: '700' },
  resultSub: { fontSize: 11, marginTop: 1 },

  // Map
  mapContainer: { flex: 1, position: 'relative' },
  map: { ...(StyleSheet.absoluteFill as object) },
  routeBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 6,
    gap: 6,
  },
  routeBadgeIcon: { fontSize: 14 },
  routeBadgeText: { fontSize: 12, fontWeight: '700' },

  // Bottom Panel
  bottomPanel: {
    borderTopWidth: 1,
    padding: 20,
    gap: 14,
  },
  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  destPinIcon: { fontSize: 22 },
  destName: { fontSize: 14, fontWeight: '800' },
  destMeta: { fontSize: 11, marginTop: 2 },
  startWalkBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  startWalkBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Active Journey controls
  activeControls: { gap: 12 },
  countdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countdownLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  countdownText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  walkButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelWalkBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  cancelWalkBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 12,
  },
  reachedSafelyBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  reachedSafelyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  activeNoticeRow: { alignItems: 'center' },
  activeNoticeText: { fontSize: 11, textAlign: 'center' },

  // Pre-Walk Modal Styles
  preWalkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  preWalkCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  preWalkDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  preWalkHeader: {
    marginBottom: 16,
  },
  preWalkTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  preWalkSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  preWalkSectionHeader: {
    marginBottom: 10,
  },
  preWalkSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  preWalkSectionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  guardiansListScroll: {
    maxHeight: 220,
    marginBottom: 16,
  },
  noGuardiansBox: {
    padding: 14,
    borderRadius: 12,
  },
  noGuardiansText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  guardianCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  guardianNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  guardianPhoneText: {
    fontSize: 11,
    marginTop: 2,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  preWalkFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  preWalkCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  preWalkCancelBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  preWalkStartBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preWalkStartBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // Arrival Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  arrivalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 12,
  },
  arrivalCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  arrivalCheckEmoji: { fontSize: 32 },
  arrivalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  arrivalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  arrivalBtnCol: { width: '100%', gap: 10 },
  whatsAppBtn: {
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  arrivalDismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  arrivalDismissText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recenterFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 10,
  },
  recenterIcon: { fontSize: 20 },
});
