import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { HazardCategory } from '@safora/shared-types';
import { useTheme } from '../../theme/ThemeContext';

export interface CategoryOption {
  id: HazardCategory;
  label: string;
  icon: string;
}

export const HAZARD_CATEGORIES: CategoryOption[] = [
  { id: 'lighting', label: 'Poor Lighting', icon: '💡' },
  { id: 'road_hazard', label: 'Road Trench / Hazard', icon: '🚧' },
  { id: 'waterlogging', label: 'Waterlogging', icon: '🌊' },
  { id: 'isolated_area', label: 'Isolated Trail', icon: '🌲' },
  { id: 'traffic', label: 'Traffic Danger', icon: '🚗' },
  { id: 'other', label: 'Other Hazard', icon: '⚠️' },
];

interface HazardCategoryChipsProps {
  category: HazardCategory;
  onSelectCategory: (category: HazardCategory) => void;
  customCategoryTitle: string;
  onChangeCustomCategoryTitle: (text: string) => void;
}

export const HazardCategoryChips: React.FC<HazardCategoryChipsProps> = ({
  category,
  onSelectCategory,
  customCategoryTitle,
  onChangeCustomCategoryTitle,
}) => {
  const { colors } = useTheme();

  return (
    <>
      <View style={styles.group}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Hazard Category
        </Text>
        <View style={styles.categoriesGrid}>
          {HAZARD_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor:
                    category === cat.id
                      ? 'rgba(56, 189, 248, 0.15)'
                      : colors.backgroundInput,
                  borderColor: category === cat.id ? '#38BDF8' : colors.border,
                },
              ]}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  {
                    color:
                      category === cat.id ? '#38BDF8' : colors.textSecondary,
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {category === 'other' && (
        <View style={styles.group}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Specify Hazard Name / Type{' '}
            <Text style={styles.opt}>(Optional)</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundInput,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholder="e.g., Broken Footbridge, Exposed Electrical Cable"
            placeholderTextColor={colors.textMuted}
            value={customCategoryTitle}
            onChangeText={onChangeCustomCategoryTitle}
          />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  opt: {
    fontWeight: '400',
    fontSize: 11,
    color: '#94A3B8',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '31%',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
});

export default HazardCategoryChips;
