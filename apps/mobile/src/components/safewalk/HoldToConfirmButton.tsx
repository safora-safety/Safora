import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface HoldToConfirmButtonProps {
  onConfirmed: () => void;
  holdDurationMs?: number;
  label?: string;
  confirmedLabel?: string;
}

export const HoldToConfirmButton: React.FC<HoldToConfirmButtonProps> = ({
  onConfirmed,
  holdDurationMs = 1500,
  label = 'Hold 1.5s to End Walk',
  confirmedLabel = 'Walk Completed! ✅',
}) => {
  const { colors } = useTheme();
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressIn = () => {
    if (isCompleted) return;
    setIsHolding(true);
    Vibration.vibrate(40);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: holdDurationMs,
      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(() => {
      setIsCompleted(true);
      Vibration.vibrate([0, 80, 50, 120]);
      onConfirmed();
    }, holdDurationMs);
  };

  const handlePressOut = () => {
    if (isCompleted) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const fillWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.buttonContainer,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: isHolding ? colors.brandEmerald : colors.border,
          },
        ]}
      >
        {/* Animated Progress Fill Bar */}
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: fillWidth,
              backgroundColor: isCompleted
                ? colors.brandEmerald
                : isHolding
                  ? 'rgba(16, 185, 129, 0.45)'
                  : 'transparent',
            },
          ]}
        />

        <View style={styles.contentRow}>
          <Text style={styles.buttonEmoji}>
            {isCompleted ? '✅' : isHolding ? '⏳' : '🛡️'}
          </Text>
          <Text
            style={[
              styles.buttonText,
              {
                color: isCompleted
                  ? '#FFFFFF'
                  : isHolding
                    ? colors.brandEmerald
                    : colors.textPrimary,
              },
            ]}
          >
            {isCompleted
              ? confirmedLabel
              : isHolding
                ? 'Keep holding...'
                : label}
          </Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  buttonEmoji: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
