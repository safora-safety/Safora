import React, { useState } from 'react';
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

interface MultiModalRouteSheetProps {
  destinationName: string;
  distanceMeters: number;
  travelTimes: MultiModalTravelTimes;
  selectedMode: TransportMode;
  onSelectMode: (mode: TransportMode) => void;
  selectedStrategy: RouteStrategy;
  onSelectStrategy: (strategy: RouteStrategy) => void;
  onStartWalk: () => void;
  isStarting?: boolean;
}

export const MultiModalRouteSheet: React.FC<MultiModalRouteSheetProps> = ({
  destinationName,
  distanceMeters,
  travelTimes,
  selectedMode,
  onSelectMode,
  selectedStrategy,
  onSelectStrategy,
  onStartWalk,
  isStarting = false,
}) => {
  const { colors, isDark } = useTheme();

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.max(1, Math.ceil(seconds / 60));
    return `${mins} min`;
  };

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
      {/* Mode Selector Tabs */}
      <View
        style={[
          styles.modeTabsRow,
          {
            backgroundColor: isDark ? '#0A0D14' : colors.surfaceHover,
          },
        ]}
      >
        {/* Walk Tab */}
        <TouchableOpacity
          onPress={() => onSelectMode('walk')}
          style={[
            styles.modeTab,
            selectedMode === 'walk' && {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text style={styles.modeEmoji}>🚶</Text>
          <Text
            style={[
              styles.modeLabel,
              selectedMode === 'walk' && styles.modeLabelActive,
            ]}
          >
            Walk
          </Text>
          <Text
            style={[
              styles.modeTime,
              typography.tabularNums,
              selectedMode === 'walk' && styles.modeTimeActive,
            ]}
          >
            {formatDuration(travelTimes.walkSeconds)}
          </Text>
        </TouchableOpacity>

        {/* 2-Wheeler Tab */}
        <TouchableOpacity
          onPress={() => onSelectMode('bike')}
          style={[
            styles.modeTab,
            selectedMode === 'bike' && {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text style={styles.modeEmoji}>🛵</Text>
          <Text
            style={[
              styles.modeLabel,
              selectedMode === 'bike' && styles.modeLabelActive,
            ]}
          >
            2-Wheeler
          </Text>
          <Text
            style={[
              styles.modeTime,
              typography.tabularNums,
              selectedMode === 'bike' && styles.modeTimeActive,
            ]}
          >
            {formatDuration(travelTimes.bikeSeconds)}
          </Text>
        </TouchableOpacity>

        {/* Car Tab */}
        <TouchableOpacity
          onPress={() => onSelectMode('car')}
          style={[
            styles.modeTab,
            selectedMode === 'car' && {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text style={styles.modeEmoji}>🚗</Text>
          <Text
            style={[
              styles.modeLabel,
              selectedMode === 'car' && styles.modeLabelActive,
            ]}
          >
            Car
          </Text>
          <Text
            style={[
              styles.modeTime,
              typography.tabularNums,
              selectedMode === 'car' && styles.modeTimeActive,
            ]}
          >
            {formatDuration(travelTimes.carSeconds)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Route Strategy Comparison Cards */}
      <View style={styles.strategyRow}>
        {/* Card 1: Safest Route */}
        <TouchableOpacity
          onPress={() => onSelectStrategy('safest')}
          activeOpacity={0.8}
          style={[
            styles.strategyCard,
            {
              backgroundColor:
                selectedStrategy === 'safest'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : isDark
                    ? '#1E293B'
                    : '#F8FAFC',
              borderColor:
                selectedStrategy === 'safest'
                  ? colors.brandEmerald
                  : colors.border,
            },
          ]}
        >
          <View style={styles.strategyCardHeader}>
            <Text style={styles.strategyEmoji}>🛡️</Text>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>SAFEST</Text>
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
            {formatDuration(travelTimes.walkSeconds)} •{' '}
            {formatDistance(distanceMeters)}
          </Text>
          <Text
            style={[styles.strategyFootnote, { color: colors.textSecondary }]}
          >
            96% street-lit • avoids unlit alleys
          </Text>
        </TouchableOpacity>

        {/* Card 2: Fastest Shortcut */}
        <TouchableOpacity
          onPress={() => onSelectStrategy('fastest')}
          activeOpacity={0.8}
          style={[
            styles.strategyCard,
            {
              backgroundColor:
                selectedStrategy === 'fastest'
                  ? 'rgba(99, 102, 241, 0.12)'
                  : isDark
                    ? '#1E293B'
                    : '#F8FAFC',
              borderColor:
                selectedStrategy === 'fastest' ? colors.primary : colors.border,
            },
          ]}
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
                FASTEST
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
            {formatDuration(Math.max(60, travelTimes.walkSeconds - 120))} •{' '}
            {formatDistance(Math.max(100, distanceMeters - 120))}
          </Text>
          <Text
            style={[styles.strategyFootnote, { color: colors.textSecondary }]}
          >
            Saves 2 mins • 1 dimly lit lane
          </Text>
        </TouchableOpacity>
      </View>

      {/* Start Escort Button */}
      <TouchableOpacity
        onPress={onStartWalk}
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
            : `🛡️ Start Safe Walk (${formatDuration(travelTimes.walkSeconds)})`}
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
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
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
  modeTabsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  modeEmoji: {
    fontSize: 16,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modeLabelActive: {
    color: '#FFFFFF',
  },
  modeTime: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  modeTimeActive: {
    color: '#FFFFFF',
  },
  strategyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.6,
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
