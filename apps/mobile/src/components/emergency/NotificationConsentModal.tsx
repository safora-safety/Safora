import React from 'react';
import { View, Text, StyleSheet, Modal, Dimensions } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../theme/ThemeContext';
import { GlassCard } from '../common/GlassCard';
import { GlassButton } from '../common/GlassButton';

const { width } = Dimensions.get('window');

export interface NotificationConsentModalProps {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export const NotificationConsentModal: React.FC<
  NotificationConsentModalProps
> = ({ visible, onAllow, onDeny }) => {
  const { colors, isDark } = useTheme();

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
          {/* Bell Icon in Frosted Circle */}
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
              name="bell"
              size={26}
              color={isDark ? '#C3C1FF' : colors.primaryDark}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Allow SAFORA to send you notifications?
          </Text>

          <Text
            style={[
              styles.subNotice,
              { color: isDark ? '#A3A7C8' : colors.textSecondary },
            ]}
          >
            Get SOS alerts from your circle, walk updates and nearby hazard
            reports.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsCol}>
            <GlassButton
              title="Allow"
              variant="primary"
              size="md"
              onPress={onAllow}
              style={styles.actionBtn}
            />

            <GlassButton
              title="Don’t allow"
              variant="secondary"
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
    paddingVertical: 26,
    paddingHorizontal: 22,
    borderRadius: 28,
  },
  cardContent: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  subNotice: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    fontWeight: '500',
    paddingHorizontal: 6,
  },
  actionsCol: {
    width: '100%',
    gap: 8,
  },
  actionBtn: {
    width: '100%',
  },
});
