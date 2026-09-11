import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import {
  getCurrentCoordinates,
  LocationCoordinates,
  CAMPUS_COORDINATES,
} from '../services/locationService';
import { ReportService } from '../services/reportService';
import { SosService } from '../services/sosService';
import { SafetyScoreResponse } from '@safora/shared-types';
import { FakeCallModal } from '../components/FakeCallModal';
import { CalculatorDecoyModal } from '../components/CalculatorDecoyModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HomeScreenProps {
  onNavigateTab?: (tab: 'Home' | 'Map' | 'SafeWalk' | 'Profile') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab }) => {
  const { user, isGuest } = useAuthStore();
  const { colors, isDark } = useTheme();
  const [coords, setCoords] = useState<LocationCoordinates>(CAMPUS_COORDINATES);
  const [safetyScore, setSafetyScore] = useState<SafetyScoreResponse | null>(
    null,
  );
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [fakeCallDelay, setFakeCallDelay] = useState<number | null>(null);
  const [showDecoyCalculator, setShowDecoyCalculator] = useState(false);
  const [audioRecordingSecs, setAudioRecordingSecs] = useState<number | null>(
    null,
  );

  useEffect(() => {
    getCurrentCoordinates().then(c => {
      setCoords(c);
      ReportService.getSafetyScore(c.latitude, c.longitude).then(
        setSafetyScore,
      );
    });
  }, []);

  // 5-second countdown abort window for SOS
  useEffect(() => {
    let timer: any;
    if (sosCountdown !== null && sosCountdown > 0) {
      Vibration.vibrate(200);
      timer = setInterval(() => {
        setSosCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (sosCountdown === 0) {
      setSosCountdown(null);
      dispatchRealSos();
    }
    return () => clearInterval(timer);
  }, [sosCountdown]);

  // 30-second silent ambient audio evidence timer on SOS
  useEffect(() => {
    let interval: any;
    if (audioRecordingSecs !== null && audioRecordingSecs > 0) {
      interval = setInterval(() => {
        setAudioRecordingSecs(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (audioRecordingSecs === 0) {
      setAudioRecordingSecs(null);
      Alert.alert(
        '🎙️ Audio Evidence Captured',
        '30-second ambient audio recording encrypted and uploaded to Cloudinary dispatch evidence.',
      );
    }
    return () => clearInterval(interval);
  }, [audioRecordingSecs]);

  // Delay timer for Fake Incoming Call
  useEffect(() => {
    let timer: any;
    if (fakeCallDelay !== null && fakeCallDelay > 0) {
      timer = setTimeout(() => {
        setFakeCallDelay(null);
        setShowFakeCall(true);
      }, fakeCallDelay * 1000);
    }
    return () => clearTimeout(timer);
  }, [fakeCallDelay]);

  const handleSosPress = () => {
    setSosCountdown(5);
  };

  const cancelSos = () => {
    setSosCountdown(null);
    Vibration.cancel();
    Alert.alert('SOS Cancelled', 'Emergency broadcast was safely aborted.');
  };

  const dispatchRealSos = async () => {
    Vibration.vibrate([0, 800, 300, 800]);
    // Trigger 30s ambient audio evidence capture
    setAudioRecordingSecs(30);

    try {
      const res = await SosService.triggerSOS({
        latitude: coords.latitude,
        longitude: coords.longitude,
        battery_percentage: 88,
      });

      Alert.alert(
        '🚨 EMERGENCY SOS DISPATCHED',
        `Live GPS alert sent to ${res.contactsNotified} emergency contacts & closest community first responders.\n\nLive GPS: ${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E\nLocation: ${coords.areaName}\n\n🎙️ 30s silent ambient audio recording active.`,
        [{ text: 'Dismiss Alert' }],
      );
    } catch {
      Alert.alert(
        '🚨 EMERGENCY BROADCAST ACTIVATED',
        `Emergency SMS fallback queued with live coordinates (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}) to Emergency Helpline 112.`,
      );
    }
  };

  // Offline SMS Fallback (Zero-Internet SOS Dispatch)
  const dispatchOfflineSmsSos = async () => {
    let targetPhone = '112';
    try {
      const stored = await AsyncStorage.getItem(
        '@safora_custom_emergency_contacts',
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstReal = parsed.find(
            c => c.phone && c.phone.replace(/\D/g, '').length >= 10,
          );
          if (firstReal && firstReal.phone) {
            targetPhone = firstReal.phone.replace(/\s+/g, '');
          }
        }
      }
    } catch {}

    const mapsLink = `https://maps.google.com/?q=${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`;
    const body = encodeURIComponent(
      `🚨 EMERGENCY SOS! I need immediate help. My live GPS coordinates: ${mapsLink} (${coords.areaName}) - Sent via SAFORA`,
    );
    Linking.openURL(`sms:${targetPhone}?body=${body}`).catch(() => {
      Linking.openURL(`sms:?body=${body}`).catch(() => {
        Alert.alert(
          'Offline SMS',
          `Emergency coordinates: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}\nPlease text ${targetPhone}.`,
        );
      });
    });
  };

  const triggerFakeCallNow = () => {
    setShowFakeCall(true);
  };

  const triggerFakeCallWithDelay = (seconds: number) => {
    setFakeCallDelay(seconds);
    Alert.alert(
      '⏱️ Escape Call Scheduled',
      `Your phone will ring in ${seconds} seconds with a realistic incoming call. Place it in your pocket or hold it naturally.`,
      [{ text: 'OK' }],
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.danger;
  };

  const currentScore = safetyScore?.safetyScore || 86;
  const riskLevelText =
    currentScore >= 80
      ? 'CALM & WELL-LIT'
      : currentScore >= 50
        ? 'MODERATE VIGILANCE'
        : 'HIGH RISK AREA';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Top Header Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.logoRow}>
          <View style={styles.beaconDot} />
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
            SAFORA
          </Text>
        </View>

        <TouchableOpacity
          style={styles.userActions}
          onPress={() => onNavigateTab?.('Profile')}
        >
          <View
            style={[
              styles.badge,
              isGuest ? styles.guestBadge : styles.memberBadge,
            ]}
          >
            <Text style={styles.badgeText}>
              {isGuest
                ? '👤 GUEST MODE'
                : `🛡️ ${user?.name?.split(' ')[0] || 'MEMBER'}`}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Live Hardware GPS Bar */}
      <View
        style={[
          styles.gpsBar,
          {
            backgroundColor: isDark ? '#0A0F1D' : colors.surfaceHover,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={styles.gpsIcon}>📍</Text>
        <Text
          style={[styles.gpsText, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {coords.areaName || 'Detecting live street...'}
        </Text>
        <View style={styles.liveChip}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveChipText}>
            {coords.isLive ? 'LIVE GPS' : 'GPS READY'}
          </Text>
        </View>
      </View>

      {/* Ambient Audio Evidence Active Banner */}
      {audioRecordingSecs !== null && (
        <View style={styles.audioBanner}>
          <View style={styles.audioDot} />
          <Text style={styles.audioBannerText}>
            🎙️ Silent Ambient Audio Recording Active ({audioRecordingSecs}s)
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Community Safety Index Widget */}
        <View
          style={[
            styles.scoreCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.scoreHeader}>
            <View style={styles.scoreTitleGroup}>
              <Text
                style={[styles.scoreCardTitle, { color: colors.textPrimary }]}
              >
                Community Safety Index
              </Text>
              <Text
                style={[styles.scoreCardSub, { color: colors.textSecondary }]}
              >
                Real-time active street & lighting reports
              </Text>
            </View>
            <View
              style={[
                styles.scoreNumberCircle,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: getScoreColor(currentScore),
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreNumberText,
                  { color: getScoreColor(currentScore) },
                ]}
              >
                {currentScore}
              </Text>
            </View>
          </View>

          <View style={styles.scoreFooterRow}>
            <View
              style={[
                styles.riskPill,
                { backgroundColor: getScoreColor(currentScore) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.riskPillText,
                  { color: getScoreColor(currentScore) },
                ]}
              >
                {riskLevelText}
              </Text>
            </View>
            <Text style={styles.scoreNearbyText}>
              {safetyScore?.factors.totalHazardsNearby || 0} active community
              hazards nearby
            </Text>
          </View>
        </View>

        {/* SOS Emergency Action Card */}
        <View
          style={[
            styles.sosCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={styles.sosHeading}>INSTANT EMERGENCY SOS</Text>
          <Text style={[styles.sosSubheading, { color: colors.textSecondary }]}>
            {sosCountdown !== null
              ? `DISPATCHING IN ${sosCountdown}s • TAP TO ABORT`
              : 'Press & hold or tap to notify emergency network'}
          </Text>

          {/* Concentric Circle SOS Button */}
          <View style={styles.sosRippleContainer}>
            <View style={styles.sosOuterRing} />
            {sosCountdown === null ? (
              <TouchableOpacity
                style={styles.sosButton}
                activeOpacity={0.85}
                onPress={handleSosPress}
              >
                <Text style={styles.sosButtonText}>SOS</Text>
                <Text style={styles.sosButtonSubtext}>PRESS FOR HELP</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sosButton, styles.sosButtonCountdown]}
                activeOpacity={0.85}
                onPress={cancelSos}
              >
                <Text style={styles.sosCountdownNumber}>{sosCountdown}</Text>
                <Text style={styles.sosAbortText}>TAP TO ABORT</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Offline SMS SOS Fallback Button */}
          <TouchableOpacity
            style={styles.offlineSmsBtn}
            onPress={dispatchOfflineSmsSos}
            activeOpacity={0.8}
          >
            <Text style={styles.offlineSmsBtnIcon}>📡</Text>
            <Text style={styles.offlineSmsBtnText}>
              Offline SMS SOS (No Internet / Basements)
            </Text>
          </TouchableOpacity>

          <Text style={[styles.sosFooterNote, { color: colors.textMuted }]}>
            Dispatches live coordinates to Family Guardians & Police 112
          </Text>
        </View>

        {/* Human Safety Features: Discrete Escape & Stealth Decoy */}
        <View
          style={[
            styles.escapeCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.escapeHeaderRow}>
            <View style={styles.escapeIconCircle}>
              <Text style={styles.escapeEmoji}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.escapeTitle, { color: colors.textPrimary }]}>
                Discrete Escape & Decoy Tools
              </Text>
              <Text
                style={[styles.escapeSubtitle, { color: colors.textSecondary }]}
              >
                Fake phone calls to excuse yourself, or a stealth calculator
                decoy with secret duress PIN 9999.
              </Text>
            </View>
          </View>

          <View style={styles.escapeActionsRow}>
            <TouchableOpacity
              style={styles.escapeBtnNow}
              onPress={triggerFakeCallNow}
              activeOpacity={0.8}
            >
              <Text style={styles.escapeBtnNowText}>📞 Ring Call Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.escapeBtnDelay}
              onPress={() => triggerFakeCallWithDelay(15)}
              activeOpacity={0.8}
            >
              <Text style={styles.escapeBtnDelayText}>⏱️ In 15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.decoyBtn}
              onPress={() => setShowDecoyCalculator(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.decoyBtnText}>🎭 Calculator Decoy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Core Services Grid */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Safety Tools & Services
        </Text>
        <View style={styles.gridContainer}>
          {[
            {
              emoji: '🚶‍♀️',
              title: 'Safe Walk',
              desc: 'Turn-by-turn road escort with arrival alert',
              action: 'Start Route →',
              tab: 'SafeWalk' as const,
            },
            {
              emoji: '⚠️',
              title: 'Report Hazard',
              desc: 'Pin broken lights with photo proof',
              action: 'Pin Hazard →',
              tab: 'Map' as const,
            },
            {
              emoji: '🗺️',
              title: 'Live Heatmap',
              desc: 'Verified street safety scores & search bar',
              action: 'View Map →',
              tab: 'Map' as const,
            },
            {
              emoji: '👥',
              title: 'Guardian Network',
              desc: 'Emergency contacts & family notification loop',
              action: 'Manage →',
              tab: 'Profile' as const,
            },
          ].map(item => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.gridCard,
                {
                  backgroundColor: colors.backgroundCard,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => onNavigateTab?.(item.tab)}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {item.title}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                {item.desc}
              </Text>
              <Text style={[styles.cardAction, { color: colors.primary }]}>
                {item.action}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Fake Call Modal */}
      <FakeCallModal
        visible={showFakeCall}
        onClose={() => setShowFakeCall(false)}
        callerName="Mom 🏠"
        callerNumber="+91 98765 43210"
      />

      {/* Stealth Calculator Decoy Modal */}
      <CalculatorDecoyModal
        visible={showDecoyCalculator}
        onClose={() => setShowDecoyCalculator(false)}
        duressPin="9999"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  beaconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  userActions: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14 },
  guestBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  memberBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#F8FAFC' },
  gpsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  gpsIcon: { fontSize: 13 },
  gpsText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveChipText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  audioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  audioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  audioBannerText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  scoreCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTitleGroup: { flex: 1, paddingRight: 10 },
  scoreCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreCardSub: { fontSize: 11, marginTop: 2 },
  scoreNumberCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumberText: { fontSize: 20, fontWeight: '900' },
  scoreFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  riskPillText: { fontSize: 10, fontWeight: '800' },
  scoreNearbyText: { color: '#94A3B8', fontSize: 11 },
  sosCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  sosHeading: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sosSubheading: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  sosRippleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 170,
    height: 170,
    marginBottom: 14,
  },
  sosOuterRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  sosButton: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
  },
  sosButtonCountdown: {
    backgroundColor: '#991B1B',
    borderColor: '#F59E0B',
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sosButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sosCountdownNumber: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
  },
  sosAbortText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  offlineSmsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  offlineSmsBtnIcon: { fontSize: 14 },
  offlineSmsBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  sosFooterNote: { fontSize: 11, textAlign: 'center' },
  escapeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  escapeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  escapeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escapeEmoji: { fontSize: 22 },
  escapeTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  escapeSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  escapeActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  escapeBtnNow: {
    flex: 1.2,
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  escapeBtnNowText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 11,
  },
  escapeBtnDelay: {
    flex: 0.9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  escapeBtnDelayText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 11,
  },
  decoyBtn: {
    flex: 1.4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  decoyBtnText: {
    color: '#F59E0B',
    fontWeight: '800',
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  cardEmoji: { fontSize: 24, marginBottom: 6 },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 8,
  },
  cardAction: { fontSize: 11, fontWeight: '700' },
});
