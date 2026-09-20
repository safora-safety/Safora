import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface MicrophoneConsentModalProps {
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
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            },
          ]}
        >
          {/* Icon & Badge */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(99,102,241,0.15)'
                    : 'rgba(99,102,241,0.1)',
                },
              ]}
            >
              <Text style={styles.iconEmoji}>🎙️</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>EMERGENCY AUDIO CONSENT</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Ambient Audio Evidence
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            SAFORA can capture 30 seconds of ambient audio when you trigger an
            Emergency SOS to assist responders and provide forensic protection.
          </Text>

          {/* Key Privacy Highlights */}
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Text style={styles.featureBullet}>🚨</Text>
              <View style={styles.featureTextCol}>
                <Text
                  style={[styles.featureTitle, { color: colors.textPrimary }]}
                >
                  Emergency-Only Activation
                </Text>
                <Text
                  style={[styles.featureDesc, { color: colors.textSecondary }]}
                >
                  Microphone is never accessed during normal map navigation or
                  idle app state.
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <Text style={styles.featureBullet}>🔐</Text>
              <View style={styles.featureTextCol}>
                <Text
                  style={[styles.featureTitle, { color: colors.textPrimary }]}
                >
                  Scoped Access
                </Text>
                <Text
                  style={[styles.featureDesc, { color: colors.textSecondary }]}
                >
                  Shared only with your designated emergency contacts and
                  verified dispatch staff.
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <Text style={styles.featureBullet}>⚙️</Text>
              <View style={styles.featureTextCol}>
                <Text
                  style={[styles.featureTitle, { color: colors.textPrimary }]}
                >
                  Revocable Anytime
                </Text>
                <Text
                  style={[styles.featureDesc, { color: colors.textSecondary }]}
                >
                  You can disable this permission at any time from the app
                  Settings or Profile.
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={onConsent}
            >
              <Text style={styles.primaryBtnText}>Enable & Consent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.secondaryBtn}
              onPress={onDecline}
            >
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: colors.textSecondary },
                ]}
              >
                Not Now (Skip Audio)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 26,
  },
  badge: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  features: {
    gap: 14,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureBullet: {
    fontSize: 16,
    marginTop: 2,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
