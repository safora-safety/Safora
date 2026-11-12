import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { MultiModalTravelTimes } from '../../services/routingService';
import Feather from 'react-native-vector-icons/Feather';

export type TransportMode = 'walk' | 'bike' | 'car';
export type RouteStrategy = 'safest' | 'fastest';

export interface MultiModalRouteSheetProps {
  destinationName: string;
  distanceMeters?: number;
  travelTimes?: MultiModalTravelTimes | any;
  selectedMode?: TransportMode;
  onSelectMode?: (mode: TransportMode) => void;
  selectedStrategy: RouteStrategy;
  onSelectStrategy: (strategy: RouteStrategy) => void;
  onStartWalk?: () => void;
  onStartSafeWalk?: () => void;
  onClearRoute?: () => void;
  onClose?: () => void;
  isStarting?: boolean;
  visible?: boolean;
  // Specific path details for the 2 walking routes
  safestDistanceMeters?: number;
  safestDurationSeconds?: number;
  shortcutDistanceMeters?: number;
  shortcutDurationSeconds?: number;
  safestSafetyScore?: number;
  shortcutSafetyScore?: number;
  safestRouteName?: string;
  shortcutRouteName?: string;
  safestReportsCount?: number;
  shortcutReportsCount?: number;
  guardianSummary?: string;
}

export const MultiModalRouteSheet: React.FC<MultiModalRouteSheetProps> = ({
  destinationName,
  distanceMeters = 800,
  travelTimes,
  selectedStrategy,
  onSelectStrategy,
  onStartWalk,
  onStartSafeWalk,
  onClearRoute,
  onClose,
  isStarting = false,
  visible = true,
  safestDistanceMeters,
  safestDurationSeconds,
  shortcutDistanceMeters,
  shortcutDurationSeconds,
  safestSafetyScore = 95,
  shortcutSafetyScore = 71,
  safestRouteName = 'Via Gandhi Road',
  shortcutRouteName = 'Via Paltan Bazaar',
  safestReportsCount = 0,
  shortcutReportsCount = 3,
  guardianSummary,
}) => {
  const { colors, isDark } = useTheme();

  if (visible === false) return null;

  const handleStart = onStartWalk || onStartSafeWalk || (() => {});
  const handleClear = onClearRoute || onClose;

  const getBaseWalkSeconds = (): number => {
    if (safestDurationSeconds !== undefined && safestDurationSeconds > 0)
      return safestDurationSeconds;
    if (travelTimes?.walkSeconds !== undefined) return travelTimes.walkSeconds;
    if (travelTimes?.walk?.durationSec !== undefined)
      return travelTimes.walk.durationSec;
    return 600;
  };

  const getBaseDistanceMeters = (): number => {
    if (safestDistanceMeters !== undefined && safestDistanceMeters > 0)
      return safestDistanceMeters;
    if (distanceMeters !== undefined && distanceMeters > 0)
      return distanceMeters;
    if (travelTimes?.walk?.distanceMeters !== undefined)
      return travelTimes.walk.distanceMeters;
    return 800;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.max(1, Math.ceil(seconds / 60));
    return `${mins} min walk`;
  };

  const mainRoadSecs = getBaseWalkSeconds();
  const mainRoadMeters = getBaseDistanceMeters();

  const shortcutSecs =
    shortcutDurationSeconds !== undefined && shortcutDurationSeconds > 0
      ? shortcutDurationSeconds
      : Math.max(60, Math.round(mainRoadSecs * 0.92));

  const shortcutMeters =
    shortcutDistanceMeters !== undefined && shortcutDistanceMeters > 0
      ? shortcutDistanceMeters
      : Math.max(80, Math.round(mainRoadMeters * 0.92));

  const savedMins = Math.max(1, Math.round((mainRoadSecs - shortcutSecs) / 60));

  return (
    <View
      style={[
        styles.sheetContainer,
        {
          backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
          shadowColor: colors.cardShadowColor,
        },
      ]}
    >
      {/* Destination Header Row with Clear Route Option */}
      <View
        style={[
          styles.sheetHeaderRow,
          {
            borderBottomColor: isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        <View style={styles.sheetHeaderLeft}>
          <Text
            style={[styles.sheetHeaderSub, { color: colors.textSecondary }]}
          >
            SELECTED DESTINATION
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
              marginTop: 2,
            }}
          >
            <Feather
              name="map-pin"
              size={14}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.sheetHeaderDest,
                { color: colors.textPrimary, flex: 1 },
              ]}
              numberOfLines={1}
            >
              {destinationName}
            </Text>
          </View>
        </View>
        {handleClear && (
          <TouchableOpacity
            style={[
              styles.clearRouteBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEE2E2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FCA5A5',
              },
            ]}
            onPress={handleClear}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear Route"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather
                name="x"
                size={11}
                color="#EF4444"
                style={{ marginRight: 3 }}
              />
              <Text style={styles.clearRouteText}>Clear Route</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Choose your walk header (Screen 30) */}
      <View style={styles.walkHeaderBadgeRow}>
        <Text style={[styles.walkHeaderTitle, { color: colors.textPrimary }]}>
          Choose your walk
        </Text>
        <View style={styles.optionsCountPill}>
          <Text style={styles.optionsCountText}>3 options</Text>
        </View>
      </View>

      {/* Screen 30: Safest vs Fastest Route Cards */}
      <View style={styles.routesStack}>
        {/* Route 1: Safest Route (Main Road) */}
        <TouchableOpacity
          onPress={() => onSelectStrategy('safest')}
          activeOpacity={0.8}
          style={[
            styles.routeOptionCard,
            {
              backgroundColor:
                selectedStrategy === 'safest'
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.12)'
                    : '#F0FDF4'
                  : isDark
                    ? '#1E293B'
                    : '#F8FAFC',
              borderColor:
                selectedStrategy === 'safest'
                  ? colors.brandEmerald
                  : isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Safest route ${safestRouteName}, safety score ${safestSafetyScore}`}
        >
          {/* Circular Safety Score Ring */}
          <View style={[styles.scoreRing, { borderColor: '#10B981' }]}>
            <Text style={[styles.scoreRingNumber, { color: '#10B981' }]}>
              {safestSafetyScore}
            </Text>
            <Text style={[styles.scoreRingLabel, { color: '#10B981' }]}>
              Safest
            </Text>
          </View>

          {/* Route Details */}
          <View style={styles.routeDetailsCol}>
            <Text style={[styles.routeNameText, { color: colors.textPrimary }]}>
              {safestRouteName}
            </Text>
            <Text
              style={[styles.routeMetricsText, { color: colors.textSecondary }]}
            >
              {formatDistance(mainRoadMeters)} · {safestReportsCount} reports
            </Text>
          </View>

          {/* Duration */}
          <View style={styles.routeDurationCol}>
            <Text
              style={[styles.routeDurationText, { color: colors.textPrimary }]}
            >
              {Math.ceil(mainRoadSecs / 60)} min
            </Text>
          </View>
        </TouchableOpacity>

        {/* Route 2: Direct Shortcut (Fastest) */}
        <TouchableOpacity
          onPress={() => onSelectStrategy('fastest')}
          activeOpacity={0.8}
          style={[
            styles.routeOptionCard,
            {
              backgroundColor:
                selectedStrategy === 'fastest'
                  ? isDark
                    ? 'rgba(245, 158, 11, 0.12)'
                    : '#FFFBEB'
                  : isDark
                    ? '#1E293B'
                    : '#F8FAFC',
              borderColor:
                selectedStrategy === 'fastest'
                  ? '#F59E0B'
                  : isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Fastest route ${shortcutRouteName}, safety score ${shortcutSafetyScore}`}
        >
          {/* Circular Safety Score Ring */}
          <View style={[styles.scoreRing, { borderColor: '#F59E0B' }]}>
            <Text style={[styles.scoreRingNumber, { color: '#F59E0B' }]}>
              {shortcutSafetyScore}
            </Text>
            <Text style={[styles.scoreRingLabel, { color: '#F59E0B' }]}>
              Fastest
            </Text>
          </View>

          {/* Route Details */}
          <View style={styles.routeDetailsCol}>
            <Text style={[styles.routeNameText, { color: colors.textPrimary }]}>
              {shortcutRouteName}
            </Text>
            <Text
              style={[styles.routeMetricsText, { color: colors.textSecondary }]}
            >
              {formatDistance(shortcutMeters)} · {shortcutReportsCount} reports
            </Text>
          </View>

          {/* Duration */}
          <View style={styles.routeDurationCol}>
            <Text
              style={[styles.routeDurationText, { color: colors.textPrimary }]}
            >
              {Math.ceil(shortcutSecs / 60)} min
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Screen 30 CTA Button */}
      <TouchableOpacity
        onPress={handleStart}
        disabled={isStarting}
        activeOpacity={0.85}
        style={[
          styles.startBtn,
          {
            backgroundColor: colors.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Start Safe Walk escort to ${destinationName}`}
      >
        <Text style={styles.startBtnText}>
          {isStarting
            ? 'Starting Safe Walk...'
            : `Start Safe Walk · ${Math.ceil((selectedStrategy === 'safest' ? mainRoadSecs : shortcutSecs) / 60)} min`}
        </Text>
      </TouchableOpacity>

      {/* Screen 30 Bottom Footer Caption */}
      <Text style={[styles.walkFooterCaption, { color: colors.textMuted }]}>
        {guardianSummary ||
          'Sharing with guardians (SMS & app). Safe corridor: up to 150 m range.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 18,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  sheetHeaderLeft: {
    flex: 1,
  },
  sheetHeaderSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sheetHeaderDest: {
    fontSize: 14,
    fontWeight: '800',
  },
  clearRouteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearRouteText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  walkHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  walkHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  optionsCountPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  optionsCountText: {
    color: '#6366F1',
    fontSize: 10,
    fontWeight: '800',
  },
  routesStack: {
    gap: 10,
    marginBottom: 14,
  },
  routeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  scoreRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingNumber: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 17,
  },
  scoreRingLabel: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  routeDetailsCol: {
    flex: 1,
  },
  routeNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  routeMetricsText: {
    fontSize: 12,
    marginTop: 2,
  },
  routeDurationCol: {
    alignItems: 'flex-end',
  },
  routeDurationText: {
    fontSize: 14,
    fontWeight: '800',
  },
  startBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  walkFooterCaption: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },
});
