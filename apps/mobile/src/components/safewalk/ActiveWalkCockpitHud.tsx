import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';

interface ActiveWalkCockpitHudProps {
  distanceMeters: number;
  secondsRemaining: number;
  walkingSpeedMs?: number;
  isDeviated?: boolean;
  deviationCountdown?: number;
  destinationName: string;
}

export const ActiveWalkCockpitHud: React.FC<ActiveWalkCockpitHudProps> = ({
  distanceMeters,
  secondsRemaining,
  walkingSpeedMs = 1.4,
  isDeviated = false,
  deviationCountdown = 60,
  destinationName,
}) => {
  const { colors, isDark } = useTheme();

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const calculateEtaTime = (remainingSecs: number) => {
    const target = new Date(Date.now() + remainingSecs * 1000);
    const hours = target.getHours();
    const minutes = target.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMins = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMins} ${ampm}`;
  };

  const formatSpeed = (ms: number) => {
    const kmh = (ms * 3.6).toFixed(1);
    return `${kmh} km/h`;
  };

  return (
    <View
      style={[
        styles.hudContainer,
        {
          backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
          borderColor: isDeviated ? colors.danger : colors.border,
          shadowColor: colors.cardShadowColor,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Active Safe Walk HUD: ${formatDistance(distanceMeters)} remaining, ETA ${calculateEtaTime(secondsRemaining)}`}
    >
      {/* Top Status & Corridor Indicator Bar */}
      <View style={styles.statusBar}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isDeviated
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(16, 185, 129, 0.15)',
              borderColor: isDeviated ? colors.danger : colors.brandEmerald,
            },
          ]}
        >
          <View
            style={[
              styles.pulseDot,
              {
                backgroundColor: isDeviated
                  ? colors.danger
                  : colors.brandEmerald,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: isDeviated ? colors.danger : colors.brandEmerald,
              },
            ]}
          >
            {isDeviated
              ? `⚠️ DEVIATION: ${deviationCountdown}s TO DISPATCH`
              : '🛡️ 150m SAFE CORRIDOR ACTIVE'}
          </Text>
        </View>

        <Text
          style={[styles.destinationLabel, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          To: {destinationName}
        </Text>
      </View>

      {/* Metrics Row: Distance, ETA, Velocity */}
      <View style={styles.metricsRow}>
        {/* Metric 1: Distance */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            DISTANCE
          </Text>
          <Text
            style={[
              styles.metricValue,
              typography.tabularNums,
              { color: colors.textPrimary },
            ]}
          >
            {formatDistance(distanceMeters)}
          </Text>
        </View>

        <View
          style={[styles.metricDivider, { backgroundColor: colors.border }]}
        />

        {/* Metric 2: Estimated Arrival Clock */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            EST. ARRIVAL
          </Text>
          <Text
            style={[
              styles.metricValue,
              typography.tabularNums,
              { color: colors.primaryLight },
            ]}
          >
            {calculateEtaTime(secondsRemaining)}
          </Text>
        </View>

        <View
          style={[styles.metricDivider, { backgroundColor: colors.border }]}
        />

        {/* Metric 3: Pace / Speed */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            WALK SPEED
          </Text>
          <Text
            style={[
              styles.metricValue,
              typography.tabularNums,
              { color: colors.brandEmerald },
            ]}
          >
            {formatSpeed(walkingSpeedMs)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hudContainer: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 40,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  destinationLabel: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
});
