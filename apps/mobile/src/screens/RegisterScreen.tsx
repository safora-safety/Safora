import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { register, isLoading, error, clearError } = useAuthStore();

  const isEmailValid = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const getPasswordStrength = (
    pass: string,
  ): { label: string; color: string; score: number } => {
    if (!pass) return { label: '', color: colors.border, score: 0 };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { label: 'Weak', color: colors.danger, score: 1 };
    if (score <= 3)
      return { label: 'Moderate', color: colors.warning, score: 2 };
    return { label: 'Strong', color: colors.success, score: 3 };
  };

  const strength = getPasswordStrength(password);
  const isMatch = password.length > 0 && password === confirmPassword;

  const handleRegister = async () => {
    setLocalError(null);
    clearError();

    if (!name.trim() || !email.trim() || !password) {
      setLocalError('Please fill in your name, email, and password.');
      return;
    }
    if (name.trim().length < 2) {
      setLocalError('Name must be at least 2 characters long.');
      return;
    }
    if (!isEmailValid(email)) {
      setLocalError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Confirm password does not match.');
      return;
    }

    await register(name.trim(), email.trim(), phone.trim(), password);
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Join SAFORA
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Protect yourself & your campus community
          </Text>
        </View>

        {/* Error Notification */}
        {displayError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{displayError}</Text>
            <TouchableOpacity
              onPress={() => {
                setLocalError(null);
                clearError();
              }}
              style={styles.errorDismiss}
            >
              <Text style={styles.errorDismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Full Name <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. Aditi Verma"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Email Address <Text style={styles.req}>*</Text>
              </Text>
              {email.length > 0 && (
                <Text
                  style={[
                    styles.validationIndicator,
                    isEmailValid(email) ? styles.validText : styles.invalidText,
                  ]}
                >
                  {isEmailValid(email) ? '✓ Valid' : '✕ Invalid format'}
                </Text>
              )}
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
                email.length > 0 && !isEmailValid(email) && styles.inputInvalid,
              ]}
              placeholder="e.g. aditi@dbuu.ac.in"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Emergency Phone Number <Text style={styles.opt}>(Optional)</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Password with Strength Indicator */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Password <Text style={styles.req}>*</Text>
              </Text>
              {password.length > 0 && (
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              )}
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(p => !p)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {/* Strength Bar */}
            {password.length > 0 && (
              <View
                style={[
                  styles.strengthBarContainer,
                  { backgroundColor: colors.backgroundInput },
                ]}
              >
                <View
                  style={[
                    styles.strengthBarFill,
                    {
                      width: `${(strength.score / 3) * 100}%`,
                      backgroundColor: strength.color,
                    },
                  ]}
                />
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Confirm Password <Text style={styles.req}>*</Text>
              </Text>
              {confirmPassword.length > 0 && (
                <Text
                  style={[
                    styles.validationIndicator,
                    isMatch ? styles.validText : styles.invalidText,
                  ]}
                >
                  {isMatch ? '✓ Matches' : '✕ Passwords differ'}
                </Text>
              )}
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                  confirmPassword.length > 0 && !isMatch && styles.inputInvalid,
                ]}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPassword(p => !p)}
              >
                <Text style={styles.eyeIcon}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (!name || !email || !password || !confirmPassword || isLoading) &&
                styles.submitButtonDisabled,
            ]}
            disabled={
              isLoading || !name || !email || !password || !confirmPassword
            }
            onPress={handleRegister}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 50,
      paddingBottom: 40,
    },
    backButton: {
      paddingVertical: 8,
      marginBottom: 12,
      alignSelf: 'flex-start',
    },
    backText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '600',
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 1,
      borderColor: colors.danger,
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
      gap: 8,
    },
    errorIcon: { fontSize: 16 },
    errorText: {
      flex: 1,
      color: colors.danger,
      fontSize: 12,
      fontWeight: '600',
    },
    errorDismiss: { padding: 4 },
    errorDismissText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
    form: {
      gap: 14,
      marginBottom: 20,
    },
    inputGroup: {
      gap: 5,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    req: { color: colors.danger },
    opt: { color: colors.textMuted, fontSize: 11, fontWeight: '400' },
    validationIndicator: { fontSize: 11, fontWeight: '700' },
    strengthLabel: { fontSize: 11, fontWeight: '800' },
    validText: { color: colors.success },
    invalidText: { color: colors.danger },
    passwordContainer: {
      position: 'relative',
      justifyContent: 'center',
    },
    input: {
      backgroundColor: colors.backgroundInput,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 15,
    },
    inputInvalid: {
      borderColor: 'rgba(239, 68, 68, 0.6)',
    },
    passwordInput: {
      paddingRight: 48,
    },
    eyeBtn: {
      position: 'absolute',
      right: 14,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    eyeIcon: {
      fontSize: 18,
    },
    strengthBarContainer: {
      height: 4,
      backgroundColor: colors.backgroundInput,
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 4,
    },
    strengthBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 18,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    footerLink: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '700',
    },
  });
