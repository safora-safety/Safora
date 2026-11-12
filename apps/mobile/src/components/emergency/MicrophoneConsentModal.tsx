import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../theme/ThemeContext';
import { GlassCard } from '../common/GlassCard';
import { GlassButton } from '../common/GlassButton';

const { width } = Dimensions.get('window');

export interface MicrophoneConsentModalProps {
  visible: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export const MicrophoneConsentModal: React.FC<MicrophoneConsentModalProps> = ({
  visible,
  onConsent,
  onDecline,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
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
          {/* Top Bar Header */}
          <View style={styles.topHeader}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(139, 137, 255, 0.22)'
                    : '#ECE9FA',
                },
              ]}
            >
              <Feather
                name="mic"
                size={24}
                color={isDark ? '#C3C1FF' : colors.primaryDark}
              />
            </View>
            <View style={styles.headerTextCol}>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isDark ? '#A3A7C8' : colors.textSecondary },
                ]}
              >
                Your privacy, your choice
              </Text>
              <Text
                style={[
                  styles.headerTag,
                  { color: isDark ? '#B4B2FF' : colors.primary },
                ]}
              >
                Optional setup
              </Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Add emergency audio?
          </Text>
          <Text
            style={[
              styles.description,
              { color: isDark ? '#A3A7C8' : colors.textSecondary },
            ]}
          >
            If you trigger an SOS, SAFORA can capture 30 seconds of audio to
            help explain what is happening.
          </Text>

          {/* Privacy Rules Glass List */}
          <GlassCard variant="card" style={styles.rulesCard}>
            <View style={styles.ruleRow}>
              <View
                style={[
                  styles.ruleBullet,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="shield"
                  size={14}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.ruleTextWrap}>
                <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>
                  Only during an SOS
                </Text>
                <Text
                  style={[
                    styles.ruleSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  No microphone access on walks, maps or while idle.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(110, 100, 225, 0.1)',
                },
              ]}
            />

            <View style={styles.ruleRow}>
              <View
                style={[
                  styles.ruleBullet,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="lock"
                  size={14}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.ruleTextWrap}>
                <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>
                  Restricted sharing
                </Text>
                <Text
                  style={[
                    styles.ruleSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Only your chosen emergency contacts and authorized response
                  staff.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(110, 100, 225, 0.1)',
                },
              ]}
            />

            <View style={styles.ruleRow}>
              <View
                style={[
                  styles.ruleBullet,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.18)'
                      : '#ECE9FA',
                  },
                ]}
              >
                <Feather
                  name="settings"
                  size={14}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                />
              </View>
              <View style={styles.ruleTextWrap}>
                <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>
                  Change your mind anytime
                </Text>
                <Text
                  style={[
                    styles.ruleSub,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Turn it off in Settings. SOS still works without audio.
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Network Resilient Callout */}
          <GlassCard variant="subtle" style={styles.calloutCard}>
            <View style={styles.calloutRow}>
              <Feather
                name="wifi-off"
                size={16}
                color={isDark ? '#C3C1FF' : colors.primary}
              />
              <Text
                style={[
                  styles.calloutText,
                  { color: isDark ? '#C3C1FF' : colors.primaryDark },
                ]}
              >
                Audio uploads need internet. If offline, the clip stays on your
                device until a connection returns.
              </Text>
            </View>
          </GlassCard>

          {/* Action Buttons */}
          <View style={styles.actionsCol}>
            <GlassButton
              title="Enable emergency audio"
              variant="primary"
              size="md"
              onPress={onConsent}
              leftIcon={<Feather name="mic" size={16} color="#FFFFFF" />}
              style={styles.actionBtn}
            />

            <GlassButton
              title="Not now"
              variant="secondary"
              size="md"
              onPress={onDecline}
              style={styles.actionBtn}
            />

            <Text
              style={[
                styles.footnote,
                { color: isDark ? '#8387AB' : colors.textMuted },
              ]}
            >
              Your phone will ask for microphone permission next.
            </Text>
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
    paddingHorizontal: 20,
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
    width: Math.min(width - 32, 380),
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 28,
  },
  cardContent: {
    width: '100%',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerTag: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: '500',
  },
  rulesCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  ruleBullet: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  ruleTextWrap: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  ruleSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  calloutCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calloutText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
    fontWeight: '500',
  },
  actionsCol: {
    width: '100%',
    gap: 8,
  },
  actionBtn: {
    width: '100%',
  },
  footnote: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
