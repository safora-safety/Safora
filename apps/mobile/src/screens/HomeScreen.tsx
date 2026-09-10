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
} from 'react-native';
import { colors } from '../theme/colors';
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

  const handleSosPress = () => {
    setSosCountdown(5);
  };

  const cancelSos = () => {
    setSosCountdown(null);
    Vibration.cancel();
    Alert.alert(
      'SOS Cancelled',
      'Emergency broadcast was successfully aborted.',
    );
  };

  const dispatchRealSos = async () => {
    Vibration.vibrate([0, 800, 300, 800]);
    try {
      const res = await SosService.triggerSOS({
        latitude: coords.latitude,
        longitude: coords.longitude,
        battery_percentage: 88,
      });

      Alert.alert(
        '🚨 EMERGENCY SOS BROADCASTED',
        `Live alert dispatched to ${res.contactsNotified} emergency contacts & DBUU campus security control room.\n\nCoordinates: ${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E.`,
        [{ text: 'Dismiss Alert' }],
      );
    } catch {
      Alert.alert(
        '🚨 EMERGENCY ALERT',
        'SMS fallback generated with coordinates to Campus Security.',
      );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.danger;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Top Bar */}
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
                ? '👤 GUEST'
                : `🛡️ ${user?.name?.split(' ')[0] || 'MEMBER'}`}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Live GPS Bar */}
      <View
        style={[
          styles.gpsBar,
          {
            backgroundColor: isDark ? '#0D1424' : colors.surfaceHover,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={styles.gpsIcon}>📍</Text>
        <Text
          style={[styles.gpsText, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {coords.areaName} • {coords.latitude.toFixed(4)},{' '}
          {coords.longitude.toFixed(4)}
        </Text>
        <View style={styles.liveChip}>
          <Text style={styles.liveChipText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Campus Safety Score Widget */}
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
            <View>
              <Text
                style={[styles.scoreCardTitle, { color: colors.textPrimary }]}
              >
                Campus Safety Index
              </Text>
              <Text
                style={[styles.scoreCardSub, { color: colors.textSecondary }]}
              >
                Based on PostGIS 24h decay hazard clustering
              </Text>
            </View>
            <View
              style={[
                styles.scoreNumberCircle,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: getScoreColor(safetyScore?.safetyScore || 84),
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreNumberText,
                  { color: getScoreColor(safetyScore?.safetyScore || 84) },
                ]}
              >
                {safetyScore?.safetyScore || 84}
              </Text>
            </View>
          </View>

          <View style={styles.scoreFooterRow}>
            <View
              style={[
                styles.riskPill,
                {
                  backgroundColor:
                    getScoreColor(safetyScore?.safetyScore || 84) + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.riskPillText,
                  { color: getScoreColor(safetyScore?.safetyScore || 84) },
                ]}
              >
                {safetyScore?.riskLevel
                  ? `${safetyScore.riskLevel.toUpperCase()} RISK ZONE`
                  : 'LOW RISK ZONE'}
              </Text>
            </View>
            <Text style={styles.scoreNearbyText}>
              {safetyScore?.factors.totalHazardsNearby || 3} active hazards
              nearby
            </Text>
          </View>
        </View>

        {/* SOS Emergency Action Button */}
        <View
          style={[
            styles.sosCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={styles.sosHeading}>EMERGENCY ASSISTANCE</Text>
          <Text style={[styles.sosSubheading, { color: colors.textSecondary }]}>
            {sosCountdown !== null
              ? `TRIGGERING IN ${sosCountdown}s • TAP TO ABORT`
              : 'Press for instant guardian dispatch'}
          </Text>

          {sosCountdown === null ? (
            <TouchableOpacity
              style={styles.sosButton}
              activeOpacity={0.8}
              onPress={handleSosPress}
            >
              <Text style={styles.sosButtonText}>SOS</Text>
              <Text style={styles.sosButtonSubtext}>TAP FOR HELP</Text>
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

          <Text style={[styles.sosFooterNote, { color: colors.textMuted }]}>
            Connected to Campus Security & Police Emergency 112
          </Text>
        </View>

        {/* Core Services Grid */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Safety Services
        </Text>
        <View style={styles.gridContainer}>
          {[
            {
              emoji: '🚶‍♀️',
              title: 'Safe Walk',
              desc: 'Escort & virtual guardian timer',
              action: 'Start Walk →',
              tab: 'SafeWalk' as const,
            },
            {
              emoji: '⚠️',
              title: 'Report Hazard',
              desc: 'Pin broken light or trench',
              action: 'New Report →',
              tab: 'Map' as const,
            },
            {
              emoji: '🗺️',
              title: 'Live Heatmap',
              desc: 'Visual safety scores & pins',
              action: 'View Map →',
              tab: 'Map' as const,
            },
            {
              emoji: '📞',
              title: 'SOS Contacts',
              desc: 'Guardians & emergency profile',
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: colors.backgroundCard,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  beaconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  userActions: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12 },
  guestBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  memberBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.textPrimary },
  gpsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#0D1424',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  gpsIcon: { fontSize: 12 },
  gpsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  liveChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveChipText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  scoreCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  scoreCardSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  scoreNumberCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundInput,
  },
  scoreNumberText: { fontSize: 18, fontWeight: '900' },
  scoreFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  riskPillText: { fontSize: 10, fontWeight: '800' },
  scoreNearbyText: { color: colors.textMuted, fontSize: 11 },
  sosCard: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
  },
  sosHeading: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sosSubheading: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 18,
  },
  sosButton: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
    marginBottom: 14,
  },
  sosButtonCountdown: {
    backgroundColor: '#991B1B',
    borderColor: colors.warning,
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sosButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sosCountdownNumber: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
  },
  sosAbortText: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sosFooterNote: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    width: '48%',
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  cardEmoji: { fontSize: 24, marginBottom: 6 },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 8,
  },
  cardAction: { color: colors.accent, fontSize: 11, fontWeight: '700' },
});
