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
} from 'react-native';
import { typography } from '../../theme/typography';

export interface SosGracePeriodOverlayProps {
  visible: boolean;
  countdown: number;
  onCancel: () => void;
  onTriggerImmediately?: () => void;
}

export const SosGracePeriodOverlay: React.FC<SosGracePeriodOverlayProps> = ({
  visible,
  countdown,
  onCancel,
  onTriggerImmediately,
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
          {/* Header Badge */}
          <View style={styles.alertHeaderBadge}>
            <View style={styles.beaconDot} />
            <Text style={styles.alertHeaderBadgeText}>
              EMERGENCY SOS INITIATED
            </Text>
          </View>

          <Text style={styles.titleText}>Grace Period Active</Text>
          <Text style={styles.subtitleText}>
            Broadcasting live GPS coordinates, ambient microphone audio stream,
            and alerting your emergency contacts in...
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
              <Text style={styles.secondsLabel}>SECONDS</Text>
            </Animated.View>
          </View>

          <Text style={styles.cancelHintText}>
            Accidental trigger? Tap the massive button below immediately to
            safely abort.
          </Text>

          {/* Massive 80dp Gross-Motor Cancel Button (Adrenaline/Tremor Proof) */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.grossMotorCancelButton}
              activeOpacity={0.85}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel SOS, I am safe"
              accessibilityHint="Immediately aborts the emergency broadcast"
            >
              <Text style={styles.cancelButtonIcon}>🛡️</Text>
              <View style={styles.cancelButtonTextCol}>
                <Text style={styles.cancelButtonMainText}>
                  CANCEL SOS (I AM SAFE)
                </Text>
                <Text style={styles.cancelButtonSubText}>
                  Tap anywhere here to safely abort
                </Text>
              </View>
            </TouchableOpacity>

            {/* Instant Trigger Bypass Option */}
            {onTriggerImmediately && (
              <TouchableOpacity
                style={styles.instantTriggerButton}
                activeOpacity={0.7}
                onPress={onTriggerImmediately}
              >
                <Text style={styles.instantTriggerText}>
                  Need Help Now? Send Alert Immediately ⚡
                </Text>
              </TouchableOpacity>
            )}
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
  actionSection: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  // Massive 80dp Gross-Motor Cancel Button
  grossMotorCancelButton: {
    width: '100%',
    height: 80,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  cancelButtonIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  cancelButtonTextCol: {
    justifyContent: 'center',
  },
  cancelButtonMainText: {
    color: '#991B1B',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  cancelButtonSubText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  instantTriggerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  instantTriggerText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
