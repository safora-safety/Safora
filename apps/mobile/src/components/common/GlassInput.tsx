import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../theme/ThemeContext';

export interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  clearable?: boolean;
  onClear?: () => void;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  clearable = false,
  onClear,
  secureTextEntry,
  value,
  onChangeText,
  ...restProps
}) => {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSecure = secureTextEntry && !isPasswordVisible;

  const handleClear = () => {
    if (onChangeText) onChangeText('');
    if (onClear) onClear();
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            { color: isDark ? '#C3C1FF' : colors.primaryDark },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? 'rgba(20, 24, 44, 0.72)' : '#ECE9FA',
            borderColor: error
              ? colors.dangerCrimson
              : isFocused
                ? isDark
                  ? 'rgba(139, 137, 255, 0.65)'
                  : colors.primary
                : isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(110, 100, 225, 0.16)',
            shadowColor: isFocused
              ? isDark
                ? 'rgba(139, 137, 255, 0.3)'
                : 'rgba(92, 90, 200, 0.25)'
              : 'transparent',
          },
        ]}
      >
        {/* Specular highlight rim */}
        <View
          pointerEvents="none"
          style={[
            styles.specularRim,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(255, 255, 255, 0.6)',
            },
          ]}
        />

        {leftIcon && <View style={styles.iconSlot}>{leftIcon}</View>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={isDark ? '#66647A' : '#94A3B8'}
          style={[
            styles.textInput,
            {
              color: colors.textPrimary,
            },
            inputStyle,
          ]}
          {...restProps}
        />

        {clearable && Boolean(value && value.length > 0) && (
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name="x-circle"
              size={16}
              color={isDark ? '#8387AB' : '#94A3B8'}
            />
          </TouchableOpacity>
        )}

        {secureTextEntry && (
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={18}
              color={isDark ? '#A3A7C8' : '#66647A'}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <View style={styles.iconSlot}>{rightIcon}</View>
        )}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.dangerCrimson }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.textMuted }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    opacity: 0.6,
  },
  iconSlot: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    marginLeft: 8,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 4,
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
});
