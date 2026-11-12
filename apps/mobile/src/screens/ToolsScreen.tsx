import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../theme/ThemeContext';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { SirenService } from '../services/sirenService';
import { FakeCallModal } from '../components/decoy/FakeCallModal';
import { CalculatorDecoyModal } from '../components/decoy/CalculatorDecoyModal';
import { SosGracePeriodOverlay } from '../components/emergency/SosGracePeriodOverlay';
import { SosActiveCockpitModal } from '../components/emergency/SosActiveCockpitModal';
import { OfflineEmergencyModal } from '../components/emergency/OfflineEmergencyModal';
import { EmergencyDirectoryModal } from '../components/emergency/EmergencyDirectoryModal';
import { ReportHazardModal } from '../components/hazards/ReportHazardModal';
import { useAuthStore } from '../store/authStore';
import { SosService } from '../services/sosService';

interface ToolsScreenProps {
  onNavigateTab: (
    tab: 'Home' | 'Radar' | 'SafeWalk' | 'Tools' | 'Profile',
    params?: any,
  ) => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({ onNavigateTab }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, updateProfile } = useAuthStore();

  const [isSirenActive, setIsSirenActive] = useState(false);
  const [showFakeCallModal, setShowFakeCallModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showSosOverlay, setShowSosOverlay] = useState(false);
  const [showSosActiveCockpit, setShowSosActiveCockpit] = useState(false);
  const [showOfflineEmergency, setShowOfflineEmergency] = useState(false);
  const [showEmergencyDirectory, setShowEmergencyDirectory] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [coords, setCoords] = useState({
    latitude: 30.3165,
    longitude: 78.0322,
  });

  useEffect(() => {
    SosService.getContacts()
      .then(setContacts)
      .catch(() => {});
  }, []);

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

  // Pulse animation for active siren
  const sirenPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isSirenActive) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(sirenPulseAnim, {
            toValue: 1.08,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(sirenPulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
      animLoop.start();
    } else {
      sirenPulseAnim.setValue(1);
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isSirenActive, sirenPulseAnim]);

  const toggleSiren = async () => {
    if (isSirenActive) {
      await SirenService.stopSiren();
      setIsSirenActive(false);
    } else {
      const started = await SirenService.startSiren();
      if (started) {
        setIsSirenActive(true);
        Alert.alert(
          'Loud Siren Activated',
          'Emergency siren is blaring at maximum volume. Tap Siren again to silence.',
          [
            {
              text: 'Silence Siren',
              onPress: async () => {
                await SirenService.stopSiren();
                setIsSirenActive(false);
              },
            },
          ],
        );
      }
    }
  };

  const handleEmergencyCalls = () => {
    setShowEmergencyDirectory(true);
  };

  const handleOfflineSms = () => {
    setShowOfflineEmergency(true);
  };

  const handleTestDrill = async () => {
    Alert.alert(
      'Start SOS Test Drill?',
      'This will simulate an emergency alert sequence without dispatching live sirens or real 112 calls, verifying that your guardians can receive your coordinates.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Test Drill',
          onPress: async () => {
            setIsDrillRunning(true);
            try {
              const res = await SosService.testGuardianAlert();
              await updateProfile({
                hasCompletedTestDrill: true,
                has_completed_test_drill: true,
              });
              Alert.alert(
                'Test Drill Completed Successfully',
                res.message ||
                  'Your guardian notification channel was verified. Your safety profile has been updated!',
              );
            } catch (err: any) {
              Alert.alert(
                'Test Drill Notice',
                err?.message ||
                  'Drill simulation finished locally. Verify guardian phone numbers in your profile.',
              );
              await updateProfile({
                hasCompletedTestDrill: true,
                has_completed_test_drill: true,
              });
            } finally {
              setIsDrillRunning(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Top Header Bar */}
      <View
        style={[styles.topHeader, { paddingTop: Math.max(insets.top, 14) }]}
      >
        <View>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
            Safety tools
          </Text>
          <Text
            style={[
              styles.screenSubtitle,
              { color: isDark ? '#A3A7C8' : colors.textSecondary },
            ]}
          >
            Simple tools, always within reach
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bellButton,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ECE9FA',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(110, 100, 225, 0.18)',
            },
          ]}
          onPress={() => onNavigateTab('Profile', { section: 'notifications' })}
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

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Heading */}
        <View style={styles.headingSection}>
          <Text style={[styles.mainHeading, { color: colors.textPrimary }]}>
            Choose what helps.
          </Text>
          <Text
            style={[
              styles.headingSub,
              { color: isDark ? '#B4B2FF' : colors.primary },
            ]}
          >
            Most important first.
          </Text>
        </View>

        {/* 2-Column Safety Tools Grid */}
        <View style={styles.grid}>
          {/* 1. Emergency Calls (Span 2) */}
          <TouchableOpacity
            style={[styles.gridSpan2, styles.emergencyCallsCard]}
            onPress={handleEmergencyCalls}
            activeOpacity={0.85}
          >
            <View style={styles.cardSpecularRim} />
            <View style={styles.emergencyIconSlot}>
              <Feather name="phone-call" size={20} color="#FF8FA0" />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.emergencyTitle}>Emergency calls</Text>
              <Text style={styles.emergencySub}>112, 108, 1090</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#FF8FA0" />
          </TouchableOpacity>

          {/* 2. Offline SMS SOS */}
          <GlassCard
            variant="card"
            style={styles.gridItem}
            onPress={handleOfflineSms}
          >
            <View style={styles.cardInnerRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="message-square"
                  size={18}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.gridTextWrap}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  Offline SMS SOS
                </Text>
                <Text
                  style={[
                    styles.itemSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Alert without internet
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* 3. Safe Walk */}
          <GlassCard
            variant="card"
            style={styles.gridItem}
            onPress={() => onNavigateTab('SafeWalk')}
          >
            <View style={styles.cardInnerRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="navigation"
                  size={18}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.gridTextWrap}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  Safe Walk
                </Text>
                <Text
                  style={[
                    styles.itemSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Guardian escort
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* 4. Siren */}
          <Animated.View
            style={[
              styles.gridItemWrap,
              isSirenActive && { transform: [{ scale: sirenPulseAnim }] },
            ]}
          >
            <GlassCard
              variant="card"
              style={[
                styles.gridItem,
                isSirenActive && {
                  borderColor: colors.dangerCrimson,
                  backgroundColor: 'rgba(192, 52, 74, 0.25)',
                },
              ]}
              onPress={toggleSiren}
            >
              <View style={styles.cardInnerRow}>
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: isSirenActive
                        ? colors.dangerCrimson
                        : isDark
                          ? 'rgba(139, 137, 255, 0.18)'
                          : '#ECE9FA',
                    },
                  ]}
                >
                  <Feather
                    name={isSirenActive ? 'volume-x' : 'volume-2'}
                    size={18}
                    color={
                      isSirenActive
                        ? '#FFFFFF'
                        : isDark
                          ? '#C3C1FF'
                          : colors.primaryDark
                    }
                  />
                </View>
                <View style={styles.gridTextWrap}>
                  <Text
                    style={[
                      styles.itemTitle,
                      { color: isSirenActive ? '#FF8FA0' : colors.textPrimary },
                    ]}
                  >
                    {isSirenActive ? 'Silence Siren' : 'Siren'}
                  </Text>
                  <Text
                    style={[
                      styles.itemSub,
                      { color: isDark ? '#A3A7C8' : colors.textSecondary },
                    ]}
                  >
                    {isSirenActive ? 'Alarm Active!' : 'Loud alarm'}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* 5. Fake Call */}
          <GlassCard
            variant="card"
            style={styles.gridItem}
            onPress={() => setShowFakeCallModal(true)}
          >
            <View style={styles.cardInnerRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="phone-incoming"
                  size={18}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.gridTextWrap}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  Fake call
                </Text>
                <Text
                  style={[
                    styles.itemSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Escape call in 5 s
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* 6. Stealth Mode (Calculator) */}
          <GlassCard
            variant="card"
            style={styles.gridItem}
            onPress={() => setShowCalculatorModal(true)}
          >
            <View style={styles.cardInnerRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="grid"
                  size={18}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.gridTextWrap}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  Stealth mode
                </Text>
                <Text
                  style={[
                    styles.itemSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Calculator decoy
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* 7. Report Hazard */}
          <GlassCard
            variant="card"
            style={styles.gridItem}
            onPress={() => setShowReportModal(true)}
          >
            <View style={styles.cardInnerRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="alert-triangle"
                  size={18}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.gridTextWrap}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  Report hazard
                </Text>
                <Text
                  style={[
                    styles.itemSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Pin a street issue
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* 8. Heatmap */}
          <GlassCard
            variant="card"
            style={styles.gridItem}
            onPress={() => onNavigateTab('Radar', { showHeatmap: true })}
          >
            <View style={styles.cardInnerRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="layers"
                  size={18}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.gridTextWrap}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  Heatmap
                </Text>
                <Text
                  style={[
                    styles.itemSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  See risk areas
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* 9. Guardian Network */}
          <GlassCard
            variant="card"
            style={styles.gridItem}
            onPress={() => onNavigateTab('Profile', { section: 'guardians' })}
          >
            <View style={styles.cardInnerRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="shield"
                  size={18}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.gridTextWrap}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  Guardian network
                </Text>
                <Text
                  style={[
                    styles.itemSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Manage your circle
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* 10. Test Drill (Span 2) */}
          <GlassCard
            variant="card"
            style={styles.gridSpan2}
            onPress={handleTestDrill}
            disabled={isDrillRunning}
          >
            <View style={styles.cardInnerRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="check-circle"
                  size={18}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.gridTextWrap}>
                <View style={styles.drillHeaderRow}>
                  <Text
                    style={[styles.itemTitle, { color: colors.textPrimary }]}
                  >
                    Test drill
                  </Text>
                  {Boolean(user?.hasCompletedTestDrill) && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.itemSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Practice an SOS drill without calling 112
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* SOS Action Button */}
        <View style={styles.sosActionContainer}>
          <GlassButton
            title="Press SOS for help"
            variant="danger"
            size="lg"
            onPress={() => setShowSosOverlay(true)}
            leftIcon={
              <Feather name="alert-octagon" size={20} color="#FFFFFF" />
            }
          />
          <Text
            style={[
              styles.disclaimerText,
              { color: isDark ? '#8387AB' : colors.textMuted },
            ]}
          >
            SAFORA does not replace calling 112. Previews never send an SOS.
          </Text>
        </View>
      </ScrollView>

      {/* Decoy Modals */}
      <FakeCallModal
        visible={showFakeCallModal}
        onClose={() => setShowFakeCallModal(false)}
      />

      <CalculatorDecoyModal
        visible={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
      />

      {/* Hazard Report Modal */}
      <ReportHazardModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        coordinates={{ latitude: 28.6139, longitude: 77.209 }}
        onReportCreated={() => setShowReportModal(false)}
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

      {/* Screen 45: Emergency Directory Modal */}
      <EmergencyDirectoryModal
        visible={showEmergencyDirectory}
        onClose={() => setShowEmergencyDirectory(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  headingSection: {
    marginTop: 10,
    marginBottom: 16,
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headingSub: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItemWrap: {
    width: '48.5%',
    marginBottom: 10,
  },
  gridItem: {
    width: '48.5%',
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  gridSpan2: {
    width: '100%',
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  emergencyCallsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(240, 90, 110, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(240, 90, 110, 0.42)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardSpecularRim: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  emergencyIconSlot: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(24, 28, 50, 0.64)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF8FA0',
  },
  emergencySub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
    fontWeight: '500',
  },
  cardInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  gridTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  drillHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  completedBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  sosActionContainer: {
    marginTop: 18,
    paddingHorizontal: 4,
  },
  disclaimerText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 16,
    fontWeight: '500',
  },
});
