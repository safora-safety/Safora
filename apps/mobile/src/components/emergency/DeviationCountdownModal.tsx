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
  Linking,
} from 'react-native';
import { typography } from '../../theme/typography';
import Feather from 'react-native-vector-icons/Feather';

export interface DeviationCountdownModalProps {
  visible: boolean;
  countdownSeconds: number; // e.g. 60 down to 0
  totalSeconds?: number; // default 60
  guardianName?: string;
  onDisarmSafe: () => void;
  onEscalateSos: () => void;
  onCall112?: () => void;
}

export const DeviationCountdownModal: React.FC<
  DeviationCountdownModalProps
> = ({
  visible,
  countdownSeconds,
  totalSeconds = 60,
  guardianName,
  onDisarmSafe,
  onEscalateSos,
  onCall112,
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
            </Animated.View>
          </View>

          <Text style={styles.titleText}>Are you okay?</Text>
          <Text style={styles.descriptionText}>
            You moved away from your route. {guardianName || 'Your circle'} is
            alerted in {countdownSeconds}s if you do not answer.
          </Text>

          {/* Screen 34 Action Buttons */}
          <View style={styles.buttonStack}>
            {/* Primary: I am safe */}
            <TouchableOpacity
              style={styles.safeButton}
              activeOpacity={0.85}
              onPress={onDisarmSafe}
              accessibilityRole="button"
              accessibilityLabel="I Am Safe. Cancel emergency countdown"
            >
              <Text style={styles.safeButtonText}>I am safe</Text>
            </TouchableOpacity>

            {/* Secondary: SOS - I need help */}
            <TouchableOpacity
              style={styles.sosButton}
              activeOpacity={0.85}
              onPress={onEscalateSos}
              accessibilityRole="button"
              accessibilityLabel="Need Help Now. Immediately send Emergency SOS"
            >
              <Text style={styles.sosButtonText}>SOS · I need help</Text>
            </TouchableOpacity>

            {/* Tertiary: Call 112 */}
            <TouchableOpacity
              style={styles.call112Button}
              activeOpacity={0.85}
              onPress={onCall112 || (() => Linking.openURL('tel:112'))}
              accessibilityRole="button"
              accessibilityLabel="Call 112"
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather
                  name="phone"
                  size={14}
                  color="#EF4444"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.call112ButtonText}>Call 112</Text>
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
    gap: 10,
  },
  safeButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#6366F1',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  safeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sosButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  call112Button: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  call112ButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
