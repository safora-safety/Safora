import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { typography } from '../../theme/typography';
import Feather from 'react-native-vector-icons/Feather';

export interface SosGracePeriodOverlayProps {
  visible: boolean;
  countdown: number;
  guardianNames?: string;
  onCancel: () => void;
  onTriggerImmediately?: () => void;
  onCall112?: () => void;
}

export const SosGracePeriodOverlay: React.FC<SosGracePeriodOverlayProps> = ({
  visible,
  countdown,
  guardianNames,
  onCancel,
  onTriggerImmediately,
  onCall112,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  // Rhythmic heartbeat haptics and pulsating visual effect on each countdown tick
  useEffect(() => {
    if (visible && countdown > 0) {
      // Haptic pulse for each second
      Vibration.vibrate(countdown <= 2 ? [0, 150, 80, 150] : 180);

      // Animate scale bounce
      pulseAnim.setValue(1.15);
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // Ripple ring animation
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }).start();
    }
  }, [countdown, visible]);

  if (!visible) return null;

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.8, 0.4, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlayContainer}>
        {/* Ambient Dark Crimson Vignette Backdrop */}
        <View style={styles.vignetteOverlay} />

        <View style={styles.contentContainer}>
          {/* Header Badge (Screen 36) */}
          <View style={styles.alertHeaderBadge}>
            <View style={styles.beaconDot} />
            <Text style={styles.alertHeaderBadgeText}>
              Emergency SOS · SOS triggered · Ready to send
            </Text>
          </View>

          <Text style={styles.titleText}>
            Sending an SOS in {countdown} seconds.
          </Text>
          <Text style={styles.subtitleText}>
            Your emergency contacts will be alerted when this countdown ends.
          </Text>

          {/* Central Pulsating Radar Ring with Tabular Countdown */}
          <View style={styles.countdownCenterWrapper}>
            {/* Animated Expanding Ripple Rings */}
            <Animated.View
              style={[
                styles.rippleRing,
                {
                  transform: [{ scale: rippleScale }],
                  opacity: rippleOpacity,
                },
              ]}
            />
            <View style={styles.outerGlowRing} />

            {/* Inner Core Pulsing Countdown Circle */}
            <Animated.View
              style={[
                styles.coreCountdownCircle,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Text style={[styles.countdownNumber, typography.tabularNums]}>
                {countdown}
              </Text>
              <Text style={styles.secondsLabel}>Cancel to abort</Text>
            </Animated.View>
          </View>

          {/* Screen 36 Information Badges */}
          <View style={styles.infoCapsulesBox}>
            <View style={styles.infoCapsuleRow}>
              <Feather
                name="map-pin"
                size={14}
                color="#10B981"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.infoCapsuleText}>
                Location to {guardianNames || 'your trusted guardians'}
              </Text>
            </View>

            <View style={styles.infoCapsuleRow}>
              <Feather
                name="mic"
                size={14}
                color="#38BDF8"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.infoCapsuleText}>
                30-second emergency audio recording
              </Text>
            </View>
          </View>

          {/* Bottom Action Section (Screen 36) */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.8}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel SOS, I am safe"
            >
              <Text style={styles.cancelButtonText}>
                Cancel SOS · I do not need help
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.call112Btn}
              activeOpacity={0.85}
              onPress={onCall112 || (() => Linking.openURL('tel:112'))}
              accessibilityRole="button"
              accessibilityLabel="Call 112 now"
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather
                  name="phone-call"
                  size={16}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.call112BtnText}>Call 112 now</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: '#450A0A', // Deep blood crimson vignette
    justifyContent: 'center',
    alignItems: 'center',
  },
  vignetteOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  contentContainer: {
    width: '92%',
    maxWidth: 420,
    alignItems: 'center',
    paddingVertical: 24,
    zIndex: 10,
  },
  alertHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  beaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  alertHeaderBadgeText: {
    color: '#FEE2E2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 36,
  },
  countdownCenterWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  outerGlowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.3)',
    backgroundColor: 'rgba(127, 29, 29, 0.5)',
  },
  coreCountdownCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#B91C1C',
    borderWidth: 4,
    borderColor: '#F87171',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
  },
  countdownNumber: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 70,
  },
  secondsLabel: {
    color: '#FEE2E2',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: -4,
  },
  cancelHintText: {
    color: '#FECACA',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  infoCapsulesBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  infoCapsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCapsuleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  call112Btn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  call112BtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
