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
  Linking,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
  Image,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { SirenService } from '../services/sirenService';
import {
  getCurrentCoordinates,
  LocationCoordinates,
  CAMPUS_COORDINATES,
  reverseGeocode,
} from '../services/locationService';
import { ReportService } from '../services/reportService';
import { SosService } from '../services/sosService';
import { SafetyScoreResponse, TrustedContact } from '@safora/shared-types';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { ReportHazardModal } from '../components/hazards/ReportHazardModal';
import { SosGracePeriodOverlay } from '../components/emergency/SosGracePeriodOverlay';
import { SosActiveCockpitModal } from '../components/emergency/SosActiveCockpitModal';
import { OfflineEmergencyModal } from '../components/emergency/OfflineEmergencyModal';
import { AudioWaveformBars } from '../components/emergency/AudioWaveformBars';
import { JourneyService } from '../services/journeyService';
import {
  onJourneyLocation,
  onJourneyStart,
  onJourneyEnded,
} from '../services/socketService';
import { navigationRef } from '../navigation/RootNavigator';

interface HomeScreenProps {
  onNavigateTab?: (
    tab: 'Home' | 'Map' | 'Radar' | 'SafeWalk' | 'Tools' | 'Profile',
    params?: any,
  ) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab }) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  );
  const { user, isGuest } = useAuthStore();
  const { colors, isDark } = useTheme();

  const [coords, setCoords] = useState<LocationCoordinates>(CAMPUS_COORDINATES);
  const [locationName, setLocationName] = useState('Dehradun');
  const [safetyScore, setSafetyScore] = useState<SafetyScoreResponse | null>(
    null,
  );
  const [scoreStatus, setScoreStatus] = useState<
    'loading' | 'success' | 'error'
  >('loading');
  const [hazardsCount, setHazardsCount] = useState(0);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSosOverlay, setShowSosOverlay] = useState(false);
  const [showSosActiveCockpit, setShowSosActiveCockpit] = useState(false);
  const [showOfflineEmergency, setShowOfflineEmergency] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);

  // Active tracked companion (SYN-4)
  const [activeTrackedWalker, setActiveTrackedWalker] = useState<{
    journeyId: string | number;
    walkerName: string;
    latitude: number;
    longitude: number;
    deviated?: boolean;
    lastSeen: Date;
  } | null>(null);

  const lastAlertedJourneyIdRef = useRef<string | number | null>(null);

  // Pulsing SOS liquid ripple animation
  const rippleScale = useRef(new Animated.Value(1)).current;
  const rippleOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue: 1.45,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnim.start();
    return () => pulseAnim.stop();
  }, [rippleScale, rippleOpacity]);

  // Load live safety score
  const loadSafetyScore = (lat: number, lng: number) => {
    setScoreStatus('loading');
    ReportService.getSafetyScore(lat, lng)
      .then(res => {
        if (res && typeof res.safetyScore === 'number') {
          setSafetyScore(res);
          setHazardsCount(res.factors?.totalHazardsNearby || 0);
          setScoreStatus('success');
        } else {
          setScoreStatus('error');
        }
      })
      .catch(() => {
        setScoreStatus('error');
      });
  };

  // Initial load
  useEffect(() => {
    getCurrentCoordinates()
      .then(c => {
        setCoords(c);
        loadSafetyScore(c.latitude, c.longitude);
        reverseGeocode(c.latitude, c.longitude)
          .then(addr => {
            if (addr) {
              const part = addr.split(',')[0]?.trim();
              if (part) setLocationName(part);
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        loadSafetyScore(
          CAMPUS_COORDINATES.latitude,
          CAMPUS_COORDINATES.longitude,
        );
      });

    SosService.getContacts()
      .then(setContacts)
      .catch(() => {});
  }, []);

  // Guardian escort tracking polling and sockets
  const checkActiveEscort = async () => {
    if (isGuest || !user) return;
    try {
      const escort = await JourneyService.getActiveEscort();
      if (escort && escort.id) {
        const isNewWalk =
          String(escort.id) !== String(lastAlertedJourneyIdRef.current);
        if (isNewWalk) {
          lastAlertedJourneyIdRef.current = escort.id;
          Vibration.vibrate([0, 400, 200, 400]);
          const walker = escort.walkerName || `Walker #${escort.userId}`;
          Alert.alert(
            '🚶‍♀️ Live Safe Walk Detected',
            `${walker} is currently on an active Safe Walk escort session. Live GPS tracking is active!`,
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Watch Live Escort',
                onPress: () => {
                  if (navigationRef.isReady()) {
                    (navigationRef as any).navigate('GuardianLive', {
                      journeyId: escort.id,
                      walkerName: walker,
                      initialLocation: escort.currentLocation,
                    });
                  }
                },
              },
            ],
          );
        }

        setActiveTrackedWalker({
          journeyId: escort.id,
          walkerName: escort.walkerName || `Walker #${escort.userId}`,
          latitude: Number(escort.currentLocation.latitude),
          longitude: Number(escort.currentLocation.longitude),
          deviated: escort.status === 'deviated',
          lastSeen: new Date(escort.lastSeenAt || escort.startedAt),
        });
      } else {
        lastAlertedJourneyIdRef.current = null;
        setActiveTrackedWalker(null);
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    checkActiveEscort();
    const pollTimer = setInterval(() => checkActiveEscort(), 8000);

    const unsubLoc = onJourneyLocation((payload: any) => {
      if (!payload || !payload.latitude || !payload.longitude) return;
      if (payload.walkerName) {
        setActiveTrackedWalker({
          journeyId: payload.journeyId,
          walkerName: payload.walkerName,
          latitude: Number(payload.latitude),
          longitude: Number(payload.longitude),
          deviated: payload.deviated,
          lastSeen: new Date(),
        });
      }
    });

    const unsubStart = onJourneyStart((payload: any) => {
      checkActiveEscort();
      Vibration.vibrate([0, 300, 100, 300]);
    });

    const unsubEnd = onJourneyEnded(() => {
      setActiveTrackedWalker(null);
    });

    return () => {
      clearInterval(pollTimer);
      unsubLoc();
      unsubStart();
      unsubEnd();
    };
  }, [user, isGuest]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const c = await getCurrentCoordinates();
      setCoords(c);
      loadSafetyScore(c.latitude, c.longitude);
      const contactsList = await SosService.getContacts();
      setContacts(contactsList);
      await checkActiveEscort();
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  const handleStopSiren = async () => {
    await SirenService.stopSiren();
    setIsSirenActive(false);
  };

  const handleOfflineSms = () => {
    setShowOfflineEmergency(true);
  };

  // SOS Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (showSosOverlay) {
      setSosCountdown(5);
      timer = setInterval(() => {
        setSosCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer!);
            setShowSosOverlay(false);
            setShowSosActiveCockpit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showSosOverlay]);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name
    ? user.name.split(' ')[0]
    : isGuest
      ? 'Explorer'
      : 'Citizen';

  const guardianSubtitle =
    contacts.length > 0
      ? `${contacts
          .slice(0, 2)
          .map(c => c.name)
          .join(' and ')} can receive your SOS.`
      : 'Add emergency contacts to receive your SOS.';

  const scoreValue = safetyScore ? safetyScore.safetyScore : 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topInset + 10,
            paddingBottom: Math.max(insets.bottom, 20) + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Top Header Row (Screen 15) */}
        <View style={styles.topHeader}>
          <View style={styles.greetingCol}>
            <Text style={[styles.greetingText, { color: colors.textPrimary }]}>
              {getGreeting()}, {displayName}
            </Text>
            <Text
              style={[
                styles.locationSubText,
                { color: isDark ? '#A3A7C8' : colors.textSecondary },
              ]}
            >
              {locationName} · Location updated just now
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.bellButton,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#ECE9FA',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(110, 100, 225, 0.18)',
              },
            ]}
            onPress={() =>
              onNavigateTab?.('Profile', { section: 'notifications' })
            }
            activeOpacity={0.8}
          >
            <Feather
              name="bell"
              size={18}
              color={isDark ? '#C3C1FF' : colors.primaryDark}
            />
            <View
              style={[
                styles.badgePill,
                { backgroundColor: colors.badgeBackground },
              ]}
            >
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Screen 16: Siren Active Banner */}
        {isSirenActive && (
          <View style={styles.sirenPlayingCard}>
            <View style={styles.sirenIconSlot}>
              <Feather name="volume-2" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.sirenTextCol}>
              <Text style={styles.sirenPlayingTitle}>Siren is playing</Text>
              <Text style={styles.sirenPlayingSub}>Loud alarm is on</Text>
            </View>
            <TouchableOpacity
              style={styles.sirenStopChip}
              onPress={handleStopSiren}
              activeOpacity={0.8}
            >
              <Text style={styles.sirenStopText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Guardian Companion Live Escort Banner (SYN-4) */}
        {activeTrackedWalker && (
          <TouchableOpacity
            style={[
              styles.companionBanner,
              {
                backgroundColor: activeTrackedWalker.deviated
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
                borderColor: activeTrackedWalker.deviated
                  ? '#EF4444'
                  : '#10B981',
              },
            ]}
            activeOpacity={0.85}
            onPress={() => {
              if (navigationRef.isReady()) {
                (navigationRef as any).navigate('GuardianLive', {
                  journeyId: activeTrackedWalker.journeyId,
                  walkerName: activeTrackedWalker.walkerName,
                  initialLocation: {
                    latitude: activeTrackedWalker.latitude,
                    longitude: activeTrackedWalker.longitude,
                  },
                });
              }
            }}
          >
            <Feather name="navigation" size={18} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[styles.companionTitle, { color: colors.textPrimary }]}
              >
                {activeTrackedWalker.walkerName} is on a Safe Walk
              </Text>
              <Text
                style={[styles.companionSub, { color: colors.textSecondary }]}
              >
                {activeTrackedWalker.deviated
                  ? '⚠️ Off safe route — Tap to track live'
                  : 'Live GPS escort active — Tap to track'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#10B981" />
          </TouchableOpacity>
        )}

        {/* Search Capsule (Screen 15) */}
        <TouchableOpacity
          style={[
            styles.searchCapsule,
            {
              backgroundColor: isDark
                ? 'rgba(20, 24, 44, 0.75)'
                : 'rgba(236, 233, 250, 0.85)',
              borderColor: colors.border,
            },
          ]}
          onPress={() => onNavigateTab?.('Radar')}
          activeOpacity={0.85}
        >
          <Feather
            name="search"
            size={18}
            color={isDark ? '#8387AB' : '#94A3B8'}
          />
          <Text
            style={[
              styles.searchPlaceholder,
              { color: isDark ? '#E1E4F5' : colors.textPrimary },
            ]}
          >
            Where are you walking to?
          </Text>
          <View
            style={[
              styles.scoreRingSmall,
              {
                borderColor:
                  scoreStatus === 'error'
                    ? '#F0A93B'
                    : scoreValue >= 80
                      ? '#6FE3B5'
                      : '#F59E0B',
              },
            ]}
          >
            <Text
              style={[
                styles.scoreRingSmallText,
                {
                  color:
                    scoreStatus === 'error'
                      ? '#F0A93B'
                      : scoreValue >= 80
                        ? '#6FE3B5'
                        : '#F59E0B',
                },
              ]}
            >
              {scoreStatus === 'error' ? '!' : scoreValue}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Place Shortcut Chips */}
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: isDark
                  ? 'rgba(139, 137, 255, 0.17)'
                  : '#ECE9FA',
              },
            ]}
            onPress={() =>
              onNavigateTab?.('SafeWalk', {
                destination: {
                  name: 'Home',
                  latitude: 30.3243,
                  longitude: 78.0418,
                },
              })
            }
            activeOpacity={0.8}
          >
            <Feather
              name="home"
              size={13}
              color={isDark ? '#C3C1FF' : colors.primaryDark}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.chipText,
                { color: isDark ? '#C3C1FF' : colors.primaryDark },
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#ECE9FA',
              },
            ]}
            onPress={() =>
              onNavigateTab?.('SafeWalk', {
                destination: {
                  name: 'Ghanta Ghar',
                  latitude: 30.3244,
                  longitude: 78.0425,
                },
              })
            }
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.chipText,
                { color: isDark ? '#A3A7C8' : colors.textSecondary },
              ]}
            >
              Ghanta Ghar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#ECE9FA',
              },
            ]}
            onPress={() => onNavigateTab?.('SafeWalk')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.chipText,
                { color: isDark ? '#A3A7C8' : colors.textSecondary },
              ]}
            >
              + Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Screen 15 / 17: Dynamic Area Safety Score Preview Map Card */}
        <View style={styles.mapCardContainer}>
          {/* Map Preview Background */}
          <View
            style={[
              styles.mapPlaceholder,
              { backgroundColor: isDark ? '#14182C' : '#E8E5F7' },
            ]}
          >
            <View style={styles.mapGridPattern}>
              <Feather
                name="map"
                size={54}
                color={
                  isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
              />
            </View>
          </View>

          {/* Floating Top-Left Area Safety Score Pill */}
          <TouchableOpacity
            style={[
              styles.floatingScoreBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(24, 28, 50, 0.82)'
                  : 'rgba(255, 255, 255, 0.92)',
                borderColor: colors.border,
              },
            ]}
            onPress={() => loadSafetyScore(coords.latitude, coords.longitude)}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.scoreRingLarge,
                {
                  borderColor:
                    scoreStatus === 'error'
                      ? '#F0A93B'
                      : scoreValue >= 80
                        ? '#6FE3B5'
                        : '#F59E0B',
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreRingLargeText,
                  {
                    color:
                      scoreStatus === 'error'
                        ? '#F0A93B'
                        : scoreValue >= 80
                          ? '#6FE3B5'
                          : '#F59E0B',
                  },
                ]}
              >
                {scoreStatus === 'error' ? '!' : scoreValue}
              </Text>
            </View>
            <View>
              <Text
                style={[styles.areaScoreTitle, { color: colors.textPrimary }]}
              >
                Area safety score
              </Text>
              <Text
                style={[
                  styles.areaScoreSub,
                  {
                    color:
                      scoreStatus === 'error'
                        ? '#F5C56B'
                        : scoreValue >= 80
                          ? '#6FE3B5'
                          : '#F59E0B',
                  },
                ]}
              >
                {scoreStatus === 'error'
                  ? 'Could not load · Retry'
                  : scoreValue >= 80
                    ? `Calm and well-lit · ${hazardsCount} hazards`
                    : `Caution advised · ${hazardsCount} hazards`}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Floating Bottom-Right Explore Radar Pill */}
          <TouchableOpacity
            style={[
              styles.floatingExplorePill,
              {
                backgroundColor: isDark
                  ? 'rgba(24, 28, 50, 0.82)'
                  : 'rgba(255, 255, 255, 0.92)',
                borderColor: colors.border,
              },
            ]}
            onPress={() => onNavigateTab?.('Radar')}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.exploreRadarText, { color: colors.textPrimary }]}
            >
              Explore radar ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* "Your circle is ready" Card */}
        <GlassCard
          variant="card"
          style={styles.circleReadyCard}
          onPress={() => onNavigateTab?.('Profile', { section: 'guardians' })}
        >
          <View style={styles.circleReadyRow}>
            <View style={styles.circleIconBox}>
              <Feather name="shield" size={18} color="#6FE3B5" />
            </View>
            <View style={styles.circleTextCol}>
              <Text style={[styles.circleTitle, { color: colors.textPrimary }]}>
                Your circle is ready
              </Text>
              <Text
                style={[
                  styles.circleSub,
                  { color: isDark ? '#A3A7C8' : colors.textSecondary },
                ]}
              >
                {guardianSubtitle}
              </Text>
            </View>
            <Text
              style={[
                styles.manageLink,
                { color: isDark ? '#B4B2FF' : colors.primary },
              ]}
            >
              Manage
            </Text>
          </View>
        </GlassCard>

        {/* Instant Emergency SOS Card */}
        <GlassCard variant="card" style={styles.sosCard}>
          <Text style={styles.sosSectionHeader}>INSTANT EMERGENCY SOS</Text>

          {/* Center Circular SOS Button with Liquid Ripple */}
          <View style={styles.sosButtonContainer}>
            <Animated.View
              style={[
                styles.rippleRing,
                {
                  transform: [{ scale: rippleScale }],
                  opacity: rippleOpacity,
                },
              ]}
            />
            <TouchableOpacity
              style={styles.circularSosButton}
              onPress={() => setShowSosOverlay(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.sosButtonLabel}>SOS</Text>
              <Text style={styles.sosButtonSubLabel}>PRESS FOR HELP</Text>
            </TouchableOpacity>
          </View>

          {/* Offline SMS SOS Pill */}
          <TouchableOpacity
            style={styles.offlineSmsPill}
            onPress={handleOfflineSms}
            activeOpacity={0.8}
          >
            <Feather
              name="radio"
              size={14}
              color="#9CC2FF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.offlineSmsText}>
              Offline SMS SOS · no internet
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Bottom Actions Row */}
        <View style={styles.bottomButtonsRow}>
          <GlassButton
            title="Safe Walk"
            variant="primary"
            size="md"
            onPress={() => onNavigateTab?.('SafeWalk')}
            leftIcon={<Feather name="navigation" size={16} color="#FFFFFF" />}
            style={styles.actionHalfBtn}
          />

          <GlassButton
            title="Report hazard"
            variant="secondary"
            size="md"
            onPress={() => setShowReportModal(true)}
            leftIcon={
              <Feather
                name="alert-triangle"
                size={16}
                color={isDark ? '#C3C1FF' : colors.primaryDark}
              />
            }
            style={styles.actionHalfBtn}
          />
        </View>

        {/* Footnote Notice */}
        <Text
          style={[
            styles.footnoteText,
            { color: isDark ? '#8387AB' : colors.textMuted },
          ]}
        >
          SAFORA does not replace calling 112. In danger, call 112.
        </Text>
      </ScrollView>

      {/* Hazard Report Modal */}
      <ReportHazardModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        coordinates={coords}
        onReportCreated={() =>
          loadSafetyScore(coords.latitude, coords.longitude)
        }
      />

      {/* SOS Grace Period Overlay (Screen 36) */}
      <SosGracePeriodOverlay
        visible={showSosOverlay}
        countdown={sosCountdown}
        guardianNames={
          contacts.map(c => c.name).join(' and ') || 'Reena and Seema'
        }
        onCancel={() => setShowSosOverlay(false)}
        onTriggerImmediately={() => {
          setShowSosOverlay(false);
          setShowSosActiveCockpit(true);
        }}
      />

      {/* Screen 37: Active SOS Cockpit Modal */}
      <SosActiveCockpitModal
        visible={showSosActiveCockpit}
        coordinates={coords}
        guardians={contacts}
        onDisarm={() => setShowSosActiveCockpit(false)}
      />

      {/* Screen 38: Offline Emergency Screen Modal */}
      <OfflineEmergencyModal
        visible={showOfflineEmergency}
        coordinates={coords}
        guardianNames={
          contacts.map(c => c.name).join(' and ') || 'Reena and Seema'
        }
        onClose={() => setShowOfflineEmergency(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greetingCol: {
    flex: 1,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  locationSubText: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#10132A',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sirenPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 90, 110, 0.16)',
    borderColor: 'rgba(240, 90, 110, 0.38)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  sirenIconSlot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#C0344A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sirenTextCol: {
    flex: 1,
  },
  sirenPlayingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF8FA0',
  },
  sirenPlayingSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  sirenStopChip: {
    backgroundColor: '#C0344A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  sirenStopText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  companionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  companionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  companionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  scoreRingSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingSmallText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mapCardContainer: {
    height: 176,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  mapPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGridPattern: {
    opacity: 0.6,
  },
  floatingScoreBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  scoreRingLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingLargeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  areaScoreTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  areaScoreSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  floatingExplorePill: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  exploreRadarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  circleReadyCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  circleReadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(24, 28, 50, 0.64)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleTextCol: {
    flex: 1,
  },
  circleTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  circleSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  manageLink: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  sosCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  sosSectionHeader: {
    color: '#FF7B8E',
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 11,
    marginBottom: 12,
  },
  sosButtonContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  rippleRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(192, 52, 74, 0.35)',
  },
  circularSosButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#C0344A',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C0344A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 10,
  },
  sosButtonLabel: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sosButtonSubLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  offlineSmsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(80, 140, 255, 0.16)',
    marginTop: 10,
  },
  offlineSmsText: {
    color: '#9CC2FF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  actionHalfBtn: {
    flex: 1,
    borderRadius: 14,
    height: 46,
  },
  footnoteText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 4,
  },
});
