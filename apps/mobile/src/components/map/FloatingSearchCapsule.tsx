import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';

interface FloatingSearchCapsuleProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  placeholder?: string;
  safetyScore?: number | null;
  onScorePress?: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
}

export const FloatingSearchCapsule: React.FC<FloatingSearchCapsuleProps> = ({
  searchQuery,
  onSearchChange,
  onClear,
  isLoading = false,
  placeholder = 'Where are you walking to?',
  safetyScore = null,
  onScorePress,
  onFocus,
  autoFocus = false,
}) => {
  const { colors, isDark } = useTheme();

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.brandEmerald;
    if (score >= 50) return colors.warning;
    return colors.danger;
  };

  return (
    <View
      style={[
        styles.capsuleContainer,
        {
          backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border,
          shadowColor: colors.cardShadowColor,
        },
      ]}
    >
      {/* Search Pin / Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconEmoji}>📍</Text>
      </View>

      {/* Input Field */}
      <TextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={onSearchChange}
        onFocus={onFocus}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel="Destination search bar"
      />

      {/* Trailing Activity Indicator or Clear Button */}
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.trailingAction}
        />
      ) : searchQuery.length > 0 ? (
        <TouchableOpacity
          onPress={onClear}
          style={styles.clearButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Clear search text"
        >
          <Text style={[styles.clearIcon, { color: colors.textSecondary }]}>
            ✕
          </Text>
        </TouchableOpacity>
      ) : safetyScore !== null ? (
        /* Integrated Safety Score Ring Meter */
        <TouchableOpacity
          onPress={onScorePress}
          activeOpacity={0.8}
          style={[
            styles.scoreMeter,
            {
              backgroundColor: isDark ? '#0A0D14' : '#F1F5F9',
              borderColor: getScoreColor(safetyScore),
            },
          ]}
          accessibilityLabel={`Neighborhood safety score: ${safetyScore} out of 100`}
        >
          <Text
            style={[
              styles.scoreText,
              typography.tabularNums,
              { color: getScoreColor(safetyScore) },
            ]}
          >
            {safetyScore}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  capsuleContainer: {
    height: 52,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconEmoji: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
    height: '100%',
  },
  trailingAction: {
    marginLeft: 8,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearIcon: {
    fontSize: 15,
    fontWeight: '700',
  },
  scoreMeter: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
