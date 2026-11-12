import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export type GlassButtonVariant =
  'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';

export type GlassButtonSize = 'sm' | 'md' | 'lg';

export interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  testID,
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 7,
    }).start();
  };

  const getSizeStyles = (): {
    container: ViewStyle;
    text: TextStyle;
    iconSpacing: number;
  } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            height: 38,
            paddingHorizontal: 16,
            borderRadius: 19,
          },
          text: {
            fontSize: 13,
            fontWeight: '600',
          },
          iconSpacing: 6,
        };
      case 'lg':
        return {
          container: {
            height: 56,
            paddingHorizontal: 28,
            borderRadius: 28,
          },
          text: {
            fontSize: 16,
            fontWeight: '700',
          },
          iconSpacing: 10,
        };
      case 'md':
      default:
        return {
          container: {
            height: 48,
            paddingHorizontal: 22,
            borderRadius: 24,
          },
          text: {
            fontSize: 15,
            fontWeight: '700',
          },
          iconSpacing: 8,
        };
    }
  };

  const getVariantStyles = (): {
    container: ViewStyle;
    text: TextStyle;
    loaderColor: string;
  } => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(255, 255, 255, 0.82)',
            borderColor: isDark
              ? 'rgba(160, 158, 255, 0.3)'
              : 'rgba(92, 90, 200, 0.25)',
            borderWidth: 1,
            shadowColor: isDark ? '#000000' : 'rgba(40, 36, 110, 0.1)',
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 2,
          },
          text: {
            color: isDark ? '#C3C1FF' : colors.primaryDark,
          },
          loaderColor: isDark ? '#C3C1FF' : colors.primaryDark,
        };
      case 'danger':
        return {
          container: {
            backgroundColor: colors.dangerCrimson,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            shadowColor: colors.dangerCrimson,
            shadowOpacity: 0.45,
            shadowRadius: 14,
            elevation: 6,
          },
          text: {
            color: '#FFFFFF',
          },
          loaderColor: '#FFFFFF',
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          text: {
            color: isDark ? colors.accent : colors.primaryDark,
          },
          loaderColor: isDark ? colors.accent : colors.primaryDark,
        };
      case 'accent':
        return {
          container: {
            backgroundColor: isDark
              ? 'rgba(139, 137, 255, 0.22)'
              : 'rgba(92, 90, 200, 0.12)',
            borderColor: isDark
              ? 'rgba(139, 137, 255, 0.4)'
              : 'rgba(92, 90, 200, 0.2)',
            borderWidth: 1,
            shadowColor: colors.primary,
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 3,
          },
          text: {
            color: isDark ? '#C3C1FF' : colors.primaryDark,
          },
          loaderColor: isDark ? '#C3C1FF' : colors.primaryDark,
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: colors.primary,
            borderColor: 'rgba(255, 255, 255, 0.32)',
            borderWidth: 1,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.38,
            shadowRadius: 14,
            elevation: 6,
          },
          text: {
            color: '#FFFFFF',
          },
          loaderColor: '#FFFFFF',
        };
    }
  };

  const sizeCfg = getSizeStyles();
  const variantCfg = getVariantStyles();

  return (
    <TouchableWithoutFeedback
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[
          styles.button,
          sizeCfg.container,
          variantCfg.container,
          (disabled || loading) && styles.disabled,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {/* Specular highlight rim for 3D liquid depth */}
        {variant !== 'ghost' && (
          <View
            pointerEvents="none"
            style={[
              styles.specularRim,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(255, 255, 255, 0.7)',
              },
            ]}
          />
        )}

        {loading ? (
          <ActivityIndicator color={variantCfg.loaderColor} size="small" />
        ) : (
          <View style={styles.contentRow}>
            {leftIcon && (
              <View style={{ marginRight: sizeCfg.iconSpacing }}>
                {leftIcon}
              </View>
            )}
            <Text
              style={[
                styles.text,
                sizeCfg.text,
                variantCfg.text,
                disabled && styles.disabledText,
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {rightIcon && (
              <View style={{ marginLeft: sizeCfg.iconSpacing }}>
                {rightIcon}
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    opacity: 0.7,
  },
  text: {
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.55,
  },
  disabledText: {
    opacity: 0.8,
  },
});
