import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeContext';

export interface ArrivalCelebrationModalProps {
  visible: boolean;
  destinationName: string;
  distanceMeters?: number;
  durationSeconds?: number;
  onClose: () => void;
  primaryContactPhone?: string;
}

export const ArrivalCelebrationModal: React.FC<
  ArrivalCelebrationModalProps
> = ({
  visible,
  destinationName,
  distanceMeters = 850,
  durationSeconds = 480,
  onClose,
  primaryContactPhone,
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.max(1, Math.round(seconds / 60));
    return `${mins} min${mins > 1 ? 's' : ''}`;
  };

  const getShareText = () => {
    return encodeURIComponent(
      `✅ Hey! I have reached ${destinationName} safely.\nMy SAFORA Safe Walk escort session is completed.\nDistance: ${formatDistance(distanceMeters)} • Duration: ${formatDuration(durationSeconds)}`,
    );
  };

  const handleShareWhatsApp = () => {
    const text = getShareText();
    const url = `whatsapp://send?text=${text}`;
    Linking.openURL(url).catch(() => {
      // Fallback to standard SMS
      handleShareSms();
    });
  };

  const handleShareSms = () => {
    const text = getShareText();
    const phone = primaryContactPhone
      ? primaryContactPhone.replace(/\s+/g, '')
      : '';
    const url = phone ? `sms:${phone}?body=${text}` : `sms:?body=${text}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Could Not Open SMS',
        'Please verify an SMS app is installed on your device.',
      );
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
              borderColor: colors.border,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Emerald Shield / Celebration Badge */}
          <View style={styles.badgeRingOuter}>
            <View style={styles.badgeRingInner}>
              <Text style={styles.badgeEmoji}>🎉</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            You Arrived Safely!
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Safe Walk escort session completed at{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
              {destinationName}
            </Text>
            .
          </Text>

          {/* Journey Statistics Capsule */}
          <View
            style={[
              styles.statsRow,
              {
                backgroundColor: isDark
                  ? colors.backgroundInput
                  : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                DISTANCE
              </Text>
              <Text
                style={[
                  styles.statValue,
                  typography.tabularNums,
                  { color: colors.brandEmerald },
                ]}
              >
                {formatDistance(distanceMeters)}
              </Text>
            </View>

            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                DURATION
              </Text>
              <Text
                style={[
                  styles.statValue,
                  typography.tabularNums,
                  { color: colors.primaryLight },
                ]}
              >
                {formatDuration(durationSeconds)}
              </Text>
            </View>

            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                CORRIDOR
              </Text>
              <Text
                style={[
                  styles.statValue,
                  typography.tabularNums,
                  { color: colors.brandEmerald },
                ]}
              >
                100% Safe
              </Text>
            </View>
          </View>

          <Text style={[styles.sharePrompt, { color: colors.textSecondary }]}>
            Broadcast instant confirmation to your loved ones & guardians:
          </Text>

          {/* Action Buttons Column */}
          <View style={styles.actionCol}>
            {/* WhatsApp 1-Tap Share */}
            <TouchableOpacity
              style={styles.whatsAppButton}
              activeOpacity={0.85}
              onPress={handleShareWhatsApp}
              accessibilityRole="button"
              accessibilityLabel="Share arrival on WhatsApp"
            >
              <Text style={styles.btnIcon}>💬</Text>
              <Text style={styles.whatsAppButtonText}>Share via WhatsApp</Text>
            </TouchableOpacity>

            {/* Direct SMS Fallback */}
            <TouchableOpacity
              style={[
                styles.smsButton,
                {
                  backgroundColor: isDark
                    ? colors.surfaceHover
                    : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={handleShareSms}
              accessibilityRole="button"
              accessibilityLabel="Send SMS arrival confirmation"
            >
              <Text style={styles.btnIcon}>📱</Text>
              <Text
                style={[styles.smsButtonText, { color: colors.textPrimary }]}
              >
                Send SMS to Guardian
              </Text>
            </TouchableOpacity>

            {/* Done / Dismiss Button */}
            <TouchableOpacity
              style={styles.dismissButton}
              activeOpacity={0.7}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close arrival dialog"
            >
              <Text
                style={[styles.dismissButtonText, { color: colors.textMuted }]}
              >
                Done & Return to Map
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  badgeRingOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeRingInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  sharePrompt: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionCol: {
    width: '100%',
    gap: 10,
  },
  whatsAppButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#25D366', // Official WhatsApp green
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  whatsAppButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginLeft: 8,
  },
  smsButton: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  btnIcon: {
    fontSize: 18,
  },
  dismissButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
