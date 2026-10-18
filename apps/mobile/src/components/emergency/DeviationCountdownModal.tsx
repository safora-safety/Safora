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
} from 'react-native';
import { typography } from '../../theme/typography';

export interface DeviationCountdownModalProps {
  visible: boolean;
  countdownSeconds: number; // e.g. 60 down to 0
  totalSeconds?: number; // default 60
  onDisarmSafe: () => void;
  onEscalateSos: () => void;
}

export const DeviationCountdownModal: React.FC<
  DeviationCountdownModalProps
> = ({
  visible,
  countdownSeconds,
  totalSeconds = 60,
  onDisarmSafe,
  onEscalateSos,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Haptic warning alert and pulsing animation
  useEffect(() => {
    if (visible) {
      if (countdownSeconds === totalSeconds || countdownSeconds % 10 === 0) {
        // Urgent 3-pulse vibration
        Vibration.vibrate([0, 250, 100, 250]);
      } else if (countdownSeconds <= 10) {
        // Fast countdown ticks in the final 10 seconds
        Vibration.vibrate(100);
      }

      pulseAnim.setValue(1.08);
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [countdownSeconds, visible, totalSeconds]);

  if (!visible) return null;

  const fractionRemaining = Math.max(
    0,
    Math.min(1, countdownSeconds / totalSeconds),
  );
  const isUrgent = countdownSeconds <= 15;
  const accentColor = isUrgent ? '#EF4444' : '#F59E0B'; // Transitions Amber -> Red

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDisarmSafe}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.modalOverlay}>
        <View style={styles.dialogCard}>
          {/* Warning Status Pill */}
          <View
            style={[
              styles.warningBadge,
              {
                backgroundColor: isUrgent
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                borderColor: accentColor,
              },
            ]}
          >
            <View
              style={[styles.warningDot, { backgroundColor: accentColor }]}
            />
            <Text style={[styles.warningBadgeText, { color: accentColor }]}>
              OFF SAFE ROUTE DETECTED
            </Text>
          </View>

          {/* Central Radial Countdown Ring */}
          <View style={styles.countdownContainer}>
            <View
              style={[
                styles.countdownRingOuter,
                { borderColor: `${accentColor}33` },
              ]}
            />
            <Animated.View
              style={[
                styles.countdownCircleInner,
                {
                  borderColor: accentColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Text
                style={[
                  styles.countdownNumber,
                  typography.tabularNums,
                  { color: accentColor },
                ]}
              >
                {countdownSeconds}
              </Text>
              <Text style={styles.countdownSecLabel}>SECS LEFT</Text>
            </Animated.View>
          </View>

          <Text style={styles.titleText}>Are you safe?</Text>
          <Text style={styles.descriptionText}>
            You moved away from your planned walking route. An emergency SOS
            alert with your live location will automatically be sent to your
            guardians when the timer ends.
          </Text>

          {/* High-Contrast Action Buttons */}
          <View style={styles.buttonStack}>
            {/* Primary: Disarm (I Am Safe) */}
            <TouchableOpacity
              style={styles.disarmButton}
              activeOpacity={0.85}
              onPress={onDisarmSafe}
              accessibilityRole="button"
              accessibilityLabel="I Am Safe. Cancel emergency countdown"
            >
              <Text style={styles.disarmButtonIcon}>✅</Text>
              <View style={styles.btnTextCol}>
                <Text style={styles.disarmButtonMainText}>
                  I AM SAFE (CANCEL ALERT)
                </Text>
                <Text style={styles.disarmButtonSubText}>
                  Cancel alert and resume walk
                </Text>
              </View>
            </TouchableOpacity>

            {/* Escalate Immediately */}
            <TouchableOpacity
              style={styles.escalateButton}
              activeOpacity={0.85}
              onPress={onEscalateSos}
              accessibilityRole="button"
              accessibilityLabel="Need Help Now. Immediately send Emergency SOS"
            >
              <Text style={styles.escalateButtonIcon}>🚨</Text>
              <View style={styles.btnTextCol}>
                <Text style={styles.escalateButtonMainText}>
                  NEED HELP NOW (SEND SOS)
                </Text>
                <Text style={styles.escalateButtonSubText}>
                  Immediately alert guardians & police (112)
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginBottom: 20,
  },
  warningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  warningBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  countdownContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  countdownRingOuter: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 4,
  },
  countdownCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0F172A',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  countdownSecLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: -2,
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  descriptionText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 26,
    paddingHorizontal: 6,
  },
  buttonStack: {
    width: '100%',
    gap: 12,
  },
  disarmButton: {
    width: '100%',
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  disarmButtonIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  btnTextCol: {
    justifyContent: 'center',
  },
  disarmButtonMainText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  disarmButtonSubText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  escalateButton: {
    width: '100%',
    height: 60,
    backgroundColor: '#EF4444',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  escalateButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  escalateButtonMainText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  escalateButtonSubText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
});
