import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';

export type FilterCategory =
  'all' | 'lighting' | 'crowd' | 'police' | 'hazard' | 'high_risk';

export interface FilterChipOption {
  key: FilterCategory;
  label: string;
  icon: string;
}

const FILTER_OPTIONS: FilterChipOption[] = [
  { key: 'all', label: 'All Hazards', icon: '✨' },
  { key: 'lighting', label: 'Well-Lit', icon: '💡' },
  { key: 'crowd', label: 'Crowded Areas', icon: '👥' },
  { key: 'police', label: 'Police & Desks', icon: '🛡️' },
  { key: 'hazard', label: 'Reported', icon: '⚠️' },
  { key: 'high_risk', label: 'High Risk (3+)', icon: '⚡' },
];

interface HazardFilterChipsProps {
  selectedCategory: FilterCategory;
  onSelectCategory: (category: FilterCategory) => void;
  categoryCounts?: Partial<Record<FilterCategory, number>>;
}

export const HazardFilterChips: React.FC<HazardFilterChipsProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_OPTIONS.map(item => {
          const isSelected = selectedCategory === item.key;
          const count = categoryCounts[item.key];

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onSelectCategory(item.key)}
              activeOpacity={0.75}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : isDark
                      ? colors.surfaceElevated
                      : '#FFFFFF',
                  borderColor: isSelected
                    ? colors.primary
                    : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.label} filter chip`}
            >
              <Text style={styles.chipIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.chipLabel,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textPrimary,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {item.label}
              </Text>

              {typeof count === 'number' && count > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.25)'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.12)'
                          : colors.surfaceHover,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      typography.tabularNums,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 13,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
