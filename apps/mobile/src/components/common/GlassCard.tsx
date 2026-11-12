import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Animated,
  TouchableWithoutFeedback,
  GestureResponderEvent,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export type GlassVariant = 'card' | 'sheet' | 'pill' | 'subtle' | 'elevated';

export interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  glowColor?: string;
  testID?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  contentStyle,
  variant = 'card',
  onPress,
  onLongPress,
  disabled = false,
  glowColor,
  testID,
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || !onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 28,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || !onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  };

  // Base background and border based on variant
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'sheet':
        return {
          backgroundColor: isDark
            ? colors.glassBackgroundDeep
            : 'rgba(255, 255, 255, 0.94)',
          borderRadius: 24,
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.16)'
            : 'rgba(110, 100, 225, 0.18)',
        };
      case 'pill':
        return {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(255, 255, 255, 0.85)',
          borderRadius: 20,
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.14)'
            : 'rgba(110, 100, 225, 0.15)',
        };
      case 'subtle':
        return {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.04)'
            : 'rgba(255, 255, 255, 0.55)',
          borderRadius: 14,
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(110, 100, 225, 0.10)',
        };
      case 'elevated':
        return {
          backgroundColor: isDark
            ? 'rgba(26, 31, 58, 0.88)'
            : 'rgba(255, 255, 255, 0.92)',
          borderRadius: 18,
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.20)'
            : 'rgba(110, 100, 225, 0.22)',
        };
      case 'card':
      default:
        return {
          backgroundColor: isDark
            ? colors.glassBackground
            : colors.glassBackground,
          borderRadius: 16,
          borderColor: colors.glassBorder,
        };
    }
  };

  const containerContent = (
    <Animated.View
      testID={testID}
      style={[
        styles.base,
        getVariantStyles(),
        {
          shadowColor:
            glowColor || (isDark ? '#000000' : 'rgba(40, 36, 110, 0.16)'),
          borderColor: glowColor ? glowColor : getVariantStyles().borderColor,
        },
        onPress && !disabled && { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {/* Specular highlight top rim */}
      <View
        pointerEvents="none"
        style={[
          styles.specularTopRim,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.22)'
              : 'rgba(255, 255, 255, 0.85)',
          },
        ]}
      />

      <View style={[styles.innerContent, contentStyle]}>{children}</View>
    </Animated.View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {containerContent}
      </TouchableWithoutFeedback>
    );
  }

  return containerContent;
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  specularTopRim: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    opacity: 0.6,
  },
  innerContent: {
    width: '100%',
  },
});
