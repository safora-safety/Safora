import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface MedicalNotesCardProps {
  bloodGroup?: string | null;
  emergencyNotes?: string | null;
  onPressUpdate: () => void;
}

export const MedicalNotesCard: React.FC<MedicalNotesCardProps> = ({
  bloodGroup,
  emergencyNotes,
  onPressUpdate,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.medicalCard,
        {
          backgroundColor: colors.backgroundCard,
          borderColor: colors.border,
        },
      ]}
      onPress={onPressUpdate}
      activeOpacity={0.8}
    >
      <View style={styles.medicalHeader}>
        <Text style={styles.medicalTitle}>🩸 Emergency Medical Info</Text>
        <Text style={[styles.medicalActionText, { color: colors.primary }]}>
          Update ›
        </Text>
      </View>
      <View style={styles.medicalContent}>
        <View style={styles.bloodChip}>
          <Text style={styles.bloodChipText}>
            {bloodGroup ? `Blood: ${bloodGroup}` : 'Blood Group: Not Set'}
          </Text>
        </View>
        <Text
          style={[styles.medicalNotes, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {emergencyNotes ||
            'Tap to add allergy or critical medical notes for first responders'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  medicalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  medicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  medicalActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  medicalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bloodChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  bloodChipText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },
  medicalNotes: {
    flex: 1,
    fontSize: 11,
  },
});

export default MedicalNotesCard;
