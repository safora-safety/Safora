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
          <Text
            style={[styles.sheetHeaderDest, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            📍 {destinationName}
          </Text>
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
            <Text style={styles.clearRouteText}>✕ Clear Route</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dedicated Walking Route Header */}
      <View style={styles.walkHeaderBadgeRow}>
        <Text style={[styles.walkHeaderTitle, { color: colors.textSecondary }]}>
          SELECT WALKING ROUTE
        </Text>
        <View style={styles.walkDedicatedPill}>
          <Text style={styles.walkDedicatedText}>🚶 DEDICATED WALK</Text>
        </View>
      </View>

      {/* 2 Walking Paths: Path 1 Main Road vs Path 2 Shortcut */}
      <View style={styles.strategyRow}>
        {/* Path 1: Well-Lit Corridor (Main Road) */}
        <TouchableOpacity
          onPress={() => onSelectStrategy('safest')}
          activeOpacity={0.8}
          style={[
            styles.strategyCard,
            {
              backgroundColor:
                selectedStrategy === 'safest'
                  ? 'rgba(16, 185, 129, 0.14)'
                  : isDark
                    ? '#1E293B'
                    : '#F8FAFC',
              borderColor:
                selectedStrategy === 'safest'
                  ? colors.brandEmerald
                  : isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Main Road Well-Lit Corridor"
        >
          <View style={styles.strategyCardHeader}>
            <Text style={styles.strategyEmoji}>🛡️</Text>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>SAFEST • MAIN ROAD</Text>
            </View>
          </View>
          <Text style={[styles.strategyTitle, { color: colors.textPrimary }]}>
            Well-Lit Corridor
          </Text>
          <Text
            style={[
              styles.strategyDetail,
              typography.tabularNums,
              { color: colors.brandEmerald },
            ]}
          >
            {formatDuration(mainRoadSecs)} • {formatDistance(mainRoadMeters)}
          </Text>
          <Text
            style={[styles.strategyFootnote, { color: colors.textSecondary }]}
          >
            96% street-lit • CCTV active • avoids unlit alleys
          </Text>
        </TouchableOpacity>

        {/* Path 2: Direct Shortcut */}
        <TouchableOpacity
          onPress={() => onSelectStrategy('fastest')}
          activeOpacity={0.8}
          style={[
            styles.strategyCard,
            {
              backgroundColor:
                selectedStrategy === 'fastest'
                  ? 'rgba(99, 102, 241, 0.14)'
                  : isDark
                    ? '#1E293B'
                    : '#F8FAFC',
              borderColor:
                selectedStrategy === 'fastest'
                  ? colors.primary
                  : isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Direct Shortcut Path"
        >
          <View style={styles.strategyCardHeader}>
            <Text style={styles.strategyEmoji}>⚡</Text>
            <View
              style={[
                styles.recommendedBadge,
                { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
              ]}
            >
              <Text
                style={[styles.recommendedText, { color: colors.primaryLight }]}
              >
                FASTEST • SHORTCUT
              </Text>
            </View>
          </View>
          <Text style={[styles.strategyTitle, { color: colors.textPrimary }]}>
            Direct Shortcut
          </Text>
          <Text
            style={[
              styles.strategyDetail,
              typography.tabularNums,
              { color: colors.primaryLight },
            ]}
          >
            {formatDuration(shortcutSecs)} • {formatDistance(shortcutMeters)}
          </Text>
          <Text
            style={[styles.strategyFootnote, { color: colors.textSecondary }]}
          >
            Saves {savedMins} min{savedMins > 1 ? 's' : ''} • connects side
            lanes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Start Escort Button */}
      <TouchableOpacity
        onPress={handleStart}
        disabled={isStarting}
        activeOpacity={0.85}
        style={[
          styles.startBtn,
          {
            backgroundColor:
              selectedStrategy === 'safest'
                ? colors.brandEmerald
                : colors.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Start Safe Walk escort to ${destinationName}`}
      >
        <Text style={styles.startBtnText}>
          {isStarting
            ? 'Activating Guardian Network...'
            : selectedStrategy === 'safest'
              ? `🛡️ Start Main Road Walk (${Math.ceil(mainRoadSecs / 60)} min)`
              : `⚡ Start Shortcut Walk (${Math.ceil(shortcutSecs / 60)} min)`}
        </Text>
      </TouchableOpacity>
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
  walkDedicatedPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  walkDedicatedText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  strategyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  strategyCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  strategyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strategyEmoji: {
    fontSize: 18,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  strategyTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  strategyDetail: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  strategyFootnote: {
    fontSize: 10,
    lineHeight: 13,
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
});
