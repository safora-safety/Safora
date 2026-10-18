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
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
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
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
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
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    zIndex: 2,
    maxWidth: '100%',
  },
  buttonEmoji: {
    fontSize: 16,
  },
  buttonText: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});
