import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../theme/ThemeContext';
import { GlassCard } from '../common/GlassCard';
import { GlassButton } from '../common/GlassButton';

const { width } = Dimensions.get('window');

export interface LocationConsentModalProps {
  visible: boolean;
  onAllowWhileUsing: (accuracy: 'precise' | 'approximate') => void;
  onAllowOnce: (accuracy: 'precise' | 'approximate') => void;
  onDeny: () => void;
}

export const LocationConsentModal: React.FC<LocationConsentModalProps> = ({
  visible,
  onAllowWhileUsing,
  onAllowOnce,
  onDeny,
}) => {
  const { colors, isDark } = useTheme();
  const [accuracy, setAccuracy] = useState<'precise' | 'approximate'>(
    'precise',
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDeny}
    >
      <View style={styles.overlay}>
        {/* Dim backdrop */}
        <View style={styles.dimBackdrop} />

        {/* Frosted Liquid Glass Modal */}
        <GlassCard
          variant="sheet"
          style={styles.modalCard}
          contentStyle={styles.cardContent}
        >
          {/* Location Pin Icon */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark
                  ? 'rgba(139, 137, 255, 0.22)'
                  : '#ECE9FA',
              },
            ]}
          >
            <Feather
              name="map-pin"
              size={24}
              color={isDark ? '#C3C1FF' : colors.primaryDark}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Allow SAFORA to access this device’s location?
          </Text>

          {/* Precise vs Approximate Mode Selector */}
          <View style={styles.accuracyRow}>
            {/* Precise Option */}
            <TouchableOpacity
              style={[
                styles.accuracyOption,
                accuracy === 'precise'
                  ? [
                      styles.accuracyOptionActive,
                      { borderColor: isDark ? '#8F8DFF' : colors.primary },
                    ]
                  : [
                      styles.accuracyOptionInactive,
                      { borderColor: colors.border },
                    ],
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : '#FFFFFF',
                },
              ]}
              onPress={() => setAccuracy('precise')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.accuracyLabel,
                  {
                    color:
                      accuracy === 'precise'
                        ? isDark
                          ? '#C3C1FF'
                          : colors.primaryDark
                        : colors.textMuted,
                    fontWeight: accuracy === 'precise' ? '700' : '500',
                  },
                ]}
              >
                Precise
              </Text>
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(92, 90, 200, 0.25)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="crosshair"
                  size={20}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
            </TouchableOpacity>

            {/* Approximate Option */}
            <TouchableOpacity
              style={[
                styles.accuracyOption,
                accuracy === 'approximate'
                  ? [
                      styles.accuracyOptionActive,
                      { borderColor: isDark ? '#8F8DFF' : colors.primary },
                    ]
                  : [
                      styles.accuracyOptionInactive,
                      { borderColor: colors.border },
                    ],
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : '#FFFFFF',
                },
              ]}
              onPress={() => setAccuracy('approximate')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.accuracyLabel,
                  {
                    color:
                      accuracy === 'approximate'
                        ? isDark
                          ? '#C3C1FF'
                          : colors.primaryDark
                        : colors.textMuted,
                    fontWeight: accuracy === 'approximate' ? '700' : '500',
                  },
                ]}
              >
                Approximate
              </Text>
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(28, 34, 48, 0.8)'
                      : '#E8E5F7',
                  },
                ]}
              >
                <Feather
                  name="circle"
                  size={20}
                  color={isDark ? '#8387AB' : '#94A3B8'}
                />
              </View>
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.subNotice,
              { color: isDark ? '#A3A7C8' : colors.textSecondary },
            ]}
          >
            Used only during Safe Walk and SOS.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsCol}>
            <GlassButton
              title="While using the app"
              variant="secondary"
              size="md"
              onPress={() => onAllowWhileUsing(accuracy)}
              style={styles.actionBtn}
            />

            <GlassButton
              title="Only this time"
              variant="secondary"
              size="md"
              onPress={() => onAllowOnce(accuracy)}
              style={styles.actionBtn}
            />

            <GlassButton
              title="Don’t allow"
              variant="ghost"
              size="md"
              onPress={onDeny}
              style={styles.actionBtn}
            />
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  dimBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 9, 20, 0.72)',
  },
  modalCard: {
    width: Math.min(width - 40, 360),
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 28,
  },
  cardContent: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  accuracyRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 14,
  },
  accuracyOption: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
  },
  accuracyOptionActive: {
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  accuracyOptionInactive: {
    opacity: 0.85,
  },
  accuracyLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  previewBox: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subNotice: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  actionsCol: {
    width: '100%',
    gap: 8,
  },
  actionBtn: {
    width: '100%',
  },
});
